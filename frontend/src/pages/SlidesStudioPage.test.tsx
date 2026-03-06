import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SlidesStudioPage } from './SlidesStudioPage';
import { useOutputGeneratorStore } from '../stores/useOutputGeneratorStore';
import { useWorkspaceStore } from '../stores/useWorkspaceStore';

describe('SlidesStudioPage', () => {
  beforeEach(() => {
    useWorkspaceStore.setState({
      workspacePath: 'C:\\Users\\25336\\Desktop\\UniHelper\\workspace',
    });
    useOutputGeneratorStore.setState({
      slidesConfig: {
        defaultProviderId: 'generic-webhook-default',
        providers: [
          {
            id: 'generic-webhook-default',
            label: 'Generic Webhook',
            kind: 'generic-webhook',
            webhookUrl: 'https://example.com/webhook',
            authToken: '',
            timeoutMs: 45000,
            headers: {},
          },
        ],
        marp: {
          command: 'marp',
          baseArgs: ['--allow-local-files', '--no-stdin'],
          timeoutMs: 120000,
        },
      },
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('creates slide job with external prompt and shows final status', async () => {
    const user = userEvent.setup();
    let pollCount = 0;

    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = String(input);
      if (url.includes('/api/docs-maker/slides/jobs?')) {
        return new Response(JSON.stringify([]), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      if (url.endsWith('/api/docs-maker/slides/jobs')) {
        return new Response(
          JSON.stringify({
            jobId: 'slide-001',
            workspacePath: 'C:/ws',
            status: 'queued',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            sourceType: 'external_prompt',
            providerId: 'generic-webhook-default',
            outputPath: 'C:/ws/docs-maker/slides/output/demo.pptx',
            externalPrompt: 'make slides',
          }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          },
        );
      }
      if (url.includes('/api/docs-maker/slides/jobs/slide-001')) {
        pollCount += 1;
        return new Response(
          JSON.stringify({
            jobId: 'slide-001',
            workspacePath: 'C:/ws',
            status: pollCount >= 1 ? 'succeeded' : 'running',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            sourceType: 'external_prompt',
            providerId: 'generic-webhook-default',
            outputPath: 'C:/ws/docs-maker/slides/output/demo.pptx',
            downloadUrl:
              '/api/docs-maker/download?path=C%3A%2Fws%2Fdocs-maker%2Fslides%2Foutput%2Fdemo.pptx&workspacePath=C%3A%2Fws',
          }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          },
        );
      }

      throw new Error(`Unexpected request: ${url}`);
    });

    render(
      <MemoryRouter>
        <SlidesStudioPage />
      </MemoryRouter>,
    );

    await user.click(screen.getByLabelText('外部工具生成 markdown'));
    await user.type(screen.getByLabelText('external prompt'), '请生成网络安全课程答辩PPT');
    await user.click(screen.getByRole('button', { name: '创建 PPTX 任务' }));

    await waitFor(() => {
      expect(screen.getByText(/当前任务：/)).toBeInTheDocument();
      expect(screen.getByText(/状态：\s*succeeded/)).toBeInTheDocument();
    }, { timeout: 5000 });
  });
});

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { OutputGeneratorPanel } from './OutputGeneratorPanel';
import { useWorkspaceStore } from '../../stores/useWorkspaceStore';

describe('OutputGeneratorPanel', () => {
  beforeEach(() => {
    useWorkspaceStore.setState({ workspacePath: 'C:\\Users\\25336\\Desktop\\UniHelper\\workspace' });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('runs upload -> parse -> render and shows download link', async () => {
    const user = userEvent.setup();

    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = String(input);

      if (url.endsWith('/api/docs-maker/upload-draft')) {
        return new Response(
          JSON.stringify({
            savedFilePath: 'C:/ws/docs-maker/drafts/123-draft.docx',
            relativePath: 'docs-maker/drafts/123-draft.docx',
            size: 120,
            uploadedAt: new Date().toISOString(),
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      }

      if (url.endsWith('/api/docs-maker/parse-word-draft')) {
        return new Response(
          JSON.stringify({
            markdownContent: '# Report\n\n![img](./docs-maker/assets/1/img-1.png)',
            assetFiles: ['C:/ws/docs-maker/assets/1/img-1.png'],
            outputAssetDir: 'C:/ws/docs-maker/assets/1',
            sourceFilePath: 'C:/ws/docs-maker/drafts/123-draft.docx',
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      }

      if (url.endsWith('/api/docs-maker/render-academic-report')) {
        return new Response(
          JSON.stringify({
            outputPath: 'C:/ws/docs-maker/output/report-1.pdf',
            relativePath: 'docs-maker/output/report-1.pdf',
            format: 'pdf',
            engineUsed: 'pandoc-xelatex',
            downloadUrl:
              '/api/docs-maker/download?path=C%3A%2Fws%2Fdocs-maker%2Foutput%2Freport-1.pdf&workspacePath=C%3A%2Fws',
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      }

      throw new Error(`Unexpected request: ${url}`);
    });

    render(<OutputGeneratorPanel />);

    const fileInput = screen.getByLabelText('草稿文件 (.docx)');
    const file = new File(['fake-content'], 'draft.docx', {
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    });

    await user.upload(fileInput, file);
    await user.click(screen.getByRole('button', { name: '上传并落盘' }));

    await waitFor(() => {
      expect(screen.getByText(/已上传：/)).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: '解析草稿' }));

    await waitFor(() => {
      expect(screen.getByText(/解析成功：提取图片/)).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: '渲染报告' }));

    await waitFor(() => {
      expect(screen.getByText(/渲染成功：/)).toBeInTheDocument();
    });
    expect(screen.getByText('引擎：pandoc-xelatex')).toBeInTheDocument();

    const downloadLink = screen.getByRole('link', { name: '下载文件' });
    expect(downloadLink).toHaveAttribute('href', expect.stringContaining('/api/docs-maker/download'));
  });

  it('shows backend hint when parse fails', async () => {
    const user = userEvent.setup();

    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          error_code: 'WORKSPACE_PATH_VIOLATION',
          message: '路径不在 workspace 内',
          hint: '请将输入/输出路径设置在 workspacePath 目录及其子目录中。',
        }),
        { status: 403, headers: { 'Content-Type': 'application/json' } },
      ),
    );

    render(<OutputGeneratorPanel />);

    const draftPathInput = screen.getByLabelText('草稿路径（支持手动路径模式）');
    const assetDirInput = screen.getByLabelText('图片输出目录');
    await user.clear(draftPathInput);
    await user.clear(assetDirInput);
    await user.type(draftPathInput, 'D:/outside/draft.docx');
    await user.type(assetDirInput, 'D:/outside/assets');
    await user.click(screen.getByRole('button', { name: '解析草稿' }));

    await waitFor(() => {
      expect(screen.getByTestId('output-error')).toHaveTextContent('路径不在 workspace 内');
    });

    expect(screen.getByTestId('output-error')).toHaveTextContent('提示：请将输入/输出路径设置在 workspacePath 目录及其子目录中。');
  });
});

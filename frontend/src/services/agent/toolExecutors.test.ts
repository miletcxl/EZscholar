import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { executeTool } from './toolExecutors';
import { useWorkspaceStore } from '../../stores/useWorkspaceStore';

describe('executeTool docs maker', () => {
  beforeEach(() => {
    useWorkspaceStore.setState({ workspacePath: 'C:\\Users\\25336\\Desktop\\UniHelper\\workspace' });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('executes parse_word_draft success path', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          markdownContent: '# title',
          assetFiles: ['C:/ws/docs-maker/assets/1/img-1.png'],
          outputAssetDir: 'C:/ws/docs-maker/assets/1',
          sourceFilePath: 'C:/ws/docs-maker/drafts/draft.docx',
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    );

    const result = await executeTool({
      id: 'call-1',
      type: 'function',
      function: {
        name: 'parse_word_draft',
        arguments: JSON.stringify({
          input_file_path: 'C:/ws/docs-maker/drafts/draft.docx',
          output_asset_dir: 'C:/ws/docs-maker/assets/1',
          workspace_path: 'C:/ws',
        }),
      },
    });

    expect(result.ok).toBe(true);
    expect(result.summary).toContain('草稿解析成功');
    expect(result.content).toContain('markdown_preview');
    expect(result.content).toContain('markdown_cache_ready');
  });

  it('reuses cached markdown when render_academic_report omits markdown_content', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const url = String(input);

      if (url.endsWith('/api/docs-maker/parse-word-draft')) {
        return new Response(
          JSON.stringify({
            markdownContent: '# Cached markdown\\n\\nBody',
            assetFiles: ['C:/ws/docs-maker/assets/1/img-1.png'],
            outputAssetDir: 'C:/ws/docs-maker/assets/1',
            sourceFilePath: 'C:/ws/docs-maker/drafts/draft.docx',
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      }

      if (url.endsWith('/api/docs-maker/render-academic-report')) {
        const payload = JSON.parse(String(init?.body ?? '{}')) as { markdownContent: string };
        expect(payload.markdownContent).toContain('Cached markdown');

        return new Response(
          JSON.stringify({
            outputPath: 'C:/ws/docs-maker/output/report.pdf',
            relativePath: 'docs-maker/output/report.pdf',
            format: 'pdf',
            engineUsed: 'pandoc-xelatex',
            downloadUrl: '/api/docs-maker/download?path=C%3A%2Fws%2Fdocs-maker%2Foutput%2Freport.pdf&workspacePath=C%3A%2Fws',
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      }

      throw new Error(`Unexpected request: ${url}`);
    });

    const parseResult = await executeTool({
      id: 'call-parse',
      type: 'function',
      function: {
        name: 'parse_word_draft',
        arguments: JSON.stringify({
          input_file_path: 'C:/ws/docs-maker/drafts/draft.docx',
          output_asset_dir: 'C:/ws/docs-maker/assets/1',
          workspace_path: 'C:/ws',
        }),
      },
    });
    expect(parseResult.ok).toBe(true);

    const renderResult = await executeTool({
      id: 'call-render',
      type: 'function',
      function: {
        name: 'render_academic_report',
        arguments: JSON.stringify({
          format: 'pdf',
          output_path: 'C:/ws/docs-maker/output/report.pdf',
          use_last_parsed_markdown: true,
          workspace_path: 'C:/ws',
        }),
      },
    });

    expect(renderResult.ok).toBe(true);
    expect(renderResult.summary).toContain('报告渲染成功');
    expect(renderResult.content).toContain('cache_last_parsed');
  });

  it('returns readable error content on render failure', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          error_code: 'PANDOC_NOT_FOUND',
          message: '渲染失败：未检测到 pandoc。spawn pandoc ENOENT',
          hint: '请先安装 pandoc',
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } },
      ),
    );

    const result = await executeTool({
      id: 'call-2',
      type: 'function',
      function: {
        name: 'render_academic_report',
        arguments: JSON.stringify({
          markdown_content: '# report',
          format: 'pdf',
          output_path: 'C:/ws/docs-maker/output/report.pdf',
          workspace_path: 'C:/ws',
        }),
      },
    });

    expect(result.ok).toBe(false);
    expect(result.summary).toContain('render_academic_report 执行失败');

    const content = JSON.parse(result.content) as {
      error_code: string;
      hint?: string;
    };
    expect(content.error_code).toBe('PANDOC_NOT_FOUND');
    expect(content.hint).toContain('pandoc');
  });

  it('maps LATEX_CJK_PACKAGE_MISSING to concise render summary', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          error_code: 'LATEX_CJK_PACKAGE_MISSING',
          message: "渲染失败：LaTeX 缺少 xeCJK 宏包（xeCJK.sty not found）。",
          hint: '请安装 texlive-lang-chinese',
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } },
      ),
    );

    const result = await executeTool({
      id: 'call-3',
      type: 'function',
      function: {
        name: 'render_academic_report',
        arguments: JSON.stringify({
          format: 'pdf',
          output_path: 'C:/ws/docs-maker/output/report.pdf',
          use_last_parsed_markdown: true,
          workspace_path: 'C:/ws',
        }),
      },
    });

    expect(result.ok).toBe(false);
    expect(result.summary).toBe('渲染失败：缺少 LaTeX 中文宏包（xeCJK）');
    expect(result.content).toContain('LATEX_CJK_PACKAGE_MISSING');
  });
});

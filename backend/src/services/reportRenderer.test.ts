import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { renderAcademicReport } from './reportRenderer.js';

describe('renderAcademicReport', () => {
  it('uses typst engine first for pdf', async () => {
    const workspace = await fs.mkdtemp(path.join(os.tmpdir(), 'docs-maker-render-'));
    const output = path.join(workspace, 'docs-maker', 'reports', 'a.pdf');

    const calls: Array<{ cmd: string; args: string[]; cwd?: string }> = [];
    const result = await renderAcademicReport(
      {
        markdownContent: '# hello',
        format: 'pdf',
        outputPath: output,
        workspacePath: workspace,
      },
      async (cmd, args, cwd) => {
        calls.push({ cmd, args, cwd });
      },
    );

    expect(calls).toHaveLength(1);
    expect(calls[0]?.args.includes('--pdf-engine=typst')).toBe(true);
    expect(result.engineUsed).toBe('typst');
  });

  it('falls back to xelatex with CJK fonts if typst rendering fails', async () => {
    const workspace = await fs.mkdtemp(path.join(os.tmpdir(), 'docs-maker-render-'));
    const output = path.join(workspace, 'docs-maker', 'reports', 'b.pdf');

    const calls: Array<{ cmd: string; args: string[] }> = [];
    const result = await renderAcademicReport(
      {
        markdownContent: '# hello',
        format: 'pdf',
        outputPath: output,
        workspacePath: workspace,
      },
      async (cmd, args) => {
        calls.push({ cmd, args });
        if (calls.length === 1 && args.includes('--pdf-engine=typst')) {
          throw new Error('typst failed');
        }
      },
    );

    expect(calls).toHaveLength(3);
    expect(calls[1]?.cmd).toBe('kpsewhich');
    expect(calls[1]?.args).toContain('xeCJK.sty');
    expect(calls[2]?.args).toContain('--pdf-engine=xelatex');
    expect(calls[2]?.args).toContain('mainfont=Noto Serif CJK SC');
    expect(calls[2]?.args).toContain('CJKmainfont=Noto Serif CJK SC');
    expect(result.engineUsed).toBe('pandoc-xelatex');
  });

  it('returns clear hint when pandoc is missing', async () => {
    const workspace = await fs.mkdtemp(path.join(os.tmpdir(), 'docs-maker-render-'));
    const output = path.join(workspace, 'docs-maker', 'reports', 'c.docx');

    await expect(
      renderAcademicReport(
        {
          markdownContent: '# hello',
          format: 'docx',
          outputPath: output,
          workspacePath: workspace,
        },
        async () => {
          const err = Object.assign(new Error('spawn pandoc ENOENT'), { code: 'ENOENT' });
          throw err;
        },
      ),
    ).rejects.toMatchObject({
      code: 'PANDOC_NOT_FOUND',
    });
  });

  it('returns clear hint when xelatex is missing during fallback', async () => {
    const workspace = await fs.mkdtemp(path.join(os.tmpdir(), 'docs-maker-render-'));
    const output = path.join(workspace, 'docs-maker', 'reports', 'd.pdf');

    let invoke = 0;
    await expect(
      renderAcademicReport(
        {
          markdownContent: '# 你好',
          format: 'pdf',
          outputPath: output,
          workspacePath: workspace,
        },
        async (cmd, args) => {
          invoke += 1;
          if (invoke === 1 && args.includes('--pdf-engine=typst')) {
            throw new Error('typst failed');
          }
          if (cmd === 'kpsewhich') {
            return;
          }
          if (invoke === 3 && args.includes('--pdf-engine=xelatex')) {
            throw new Error('xelatex not found');
          }
        },
      ),
    ).rejects.toMatchObject({
      code: 'XELATEX_NOT_FOUND',
      hint: expect.stringContaining('texlive-xetex'),
    });
  });

  it('returns LATEX_CJK_PACKAGE_MISSING when xeCJK.sty is missing during fallback precheck', async () => {
    const workspace = await fs.mkdtemp(path.join(os.tmpdir(), 'docs-maker-render-'));
    const output = path.join(workspace, 'docs-maker', 'reports', 'e.pdf');

    await expect(
      renderAcademicReport(
        {
          markdownContent: '# 你好',
          format: 'pdf',
          outputPath: output,
          workspacePath: workspace,
        },
        async (cmd, args) => {
          if (args.includes('--pdf-engine=typst')) {
            throw new Error('typst failed');
          }
          if (cmd === 'kpsewhich') {
            throw new Error("kpathsea: Running mktexmf xeCJK.sty ... not found");
          }
        },
      ),
    ).rejects.toMatchObject({
      code: 'LATEX_CJK_PACKAGE_MISSING',
      hint: expect.stringContaining('texlive-lang-chinese'),
    });
  });

  it('returns LATEX_CJK_PACKAGE_MISSING when xelatex stderr indicates xeCJK.sty missing', async () => {
    const workspace = await fs.mkdtemp(path.join(os.tmpdir(), 'docs-maker-render-'));
    const output = path.join(workspace, 'docs-maker', 'reports', 'f.pdf');

    await expect(
      renderAcademicReport(
        {
          markdownContent: '# 你好',
          format: 'pdf',
          outputPath: output,
          workspacePath: workspace,
        },
        async (cmd, args) => {
          if (args.includes('--pdf-engine=typst')) {
            throw new Error('typst failed');
          }
          if (cmd === 'kpsewhich') {
            return;
          }
          if (args.includes('--pdf-engine=xelatex')) {
            throw new Error("LaTeX Error: File `xeCJK.sty' not found");
          }
        },
      ),
    ).rejects.toMatchObject({
      code: 'LATEX_CJK_PACKAGE_MISSING',
      hint: expect.stringContaining('texlive-lang-chinese'),
    });
  });
});

import fs from 'node:fs/promises';
import path from 'node:path';
import { execFile as execFileCb } from 'node:child_process';
import { promisify } from 'node:util';
import type { RenderAcademicReportRequest, RenderAcademicReportResponse } from '../types.js';
import { DocsMakerError } from '../types.js';
import { ensureDir, ensureWithinWorkspace } from './pathGuard.js';

const execFile = promisify(execFileCb);

export type CommandRunner = (cmd: string, args: string[], cwd?: string) => Promise<void>;

const defaultRunner: CommandRunner = async (cmd, args, cwd) => {
  await execFile(cmd, args, { cwd });
};

const PDF_XELATEX_FONT_ARGS = [
  '-V', 'mainfont=Noto Serif CJK SC',
  '-V', 'CJKmainfont=Noto Serif CJK SC',
  '-V', 'sansfont=Noto Sans CJK SC',
  '-V', 'CJKsansfont=Noto Sans CJK SC',
  '-V', 'monofont=DejaVu Sans Mono',
];
const PDF_CJK_INSTALL_HINT =
  '请安装依赖（WSL）：sudo apt update && sudo apt install -y texlive-xetex texlive-lang-chinese fonts-noto-cjk fonts-noto-core && fc-cache -f -v。';

function formatMissingPandocError(err: unknown): DocsMakerError {
  const message = err instanceof Error ? err.message : String(err);
  return new DocsMakerError(
    'PANDOC_NOT_FOUND',
    `渲染失败：未检测到 pandoc。${message}`,
    500,
    '请先安装 pandoc，并确保命令行可直接执行 pandoc。Windows 可用 winget/choco；WSL 可用 apt install pandoc。',
  );
}

function isCommandMissing(err: unknown): boolean {
  return Boolean(err && typeof err === 'object' && 'code' in err && (err as { code?: string }).code === 'ENOENT');
}

function errorText(err: unknown): string {
  return String(err instanceof Error ? err.message : err).toLowerCase();
}

function isXelatexMissing(err: unknown): boolean {
  const text = errorText(err);
  return text.includes('xelatex not found') || text.includes('xelatex: not found');
}

function isFontConfigError(err: unknown): boolean {
  const text = errorText(err);
  return text.includes('fontspec') || text.includes('font fallback list must not be empty');
}

function isXeCjkMissing(err: unknown): boolean {
  const text = errorText(err);
  return text.includes('xecjk.sty') && text.includes('not found');
}

function formatXeCjkMissingError(): DocsMakerError {
  return new DocsMakerError(
    'LATEX_CJK_PACKAGE_MISSING',
    '渲染失败：LaTeX 缺少 xeCJK 宏包（xeCJK.sty not found）。',
    500,
    PDF_CJK_INSTALL_HINT,
  );
}

async function ensureXeCjkInstalled(runner: CommandRunner, workspaceRoot: string): Promise<void> {
  try {
    await runner('kpsewhich', ['xeCJK.sty'], workspaceRoot);
  } catch (err) {
    if (isCommandMissing(err)) {
      // kpsewhich 命令不存在时，说明 TeX 环境本身不完整，按缺少 xeCJK 指引处理。
      throw formatXeCjkMissingError();
    }
    throw formatXeCjkMissingError();
  }
}

export async function renderAcademicReport(
  req: RenderAcademicReportRequest,
  runner: CommandRunner = defaultRunner,
): Promise<RenderAcademicReportResponse> {
  const { workspaceRoot } = ensureWithinWorkspace(req.outputPath, req.workspacePath);
  const { absoluteTarget: outputPath, relativePath } = ensureWithinWorkspace(req.outputPath, req.workspacePath);

  const tmpDir = path.join(workspaceRoot, '.docs-maker', 'tmp');
  await ensureDir(tmpDir);
  await ensureDir(path.dirname(outputPath));

  const tempMdPath = path.join(tmpDir, `render-${Date.now()}.md`);
  await fs.writeFile(tempMdPath, req.markdownContent, 'utf-8');

  let engineUsed: 'typst' | 'pandoc-xelatex' = 'pandoc-xelatex';

  try {
    if (req.format === 'pdf') {
      try {
        await runner('pandoc', [tempMdPath, '-o', outputPath, '--pdf-engine=typst'], workspaceRoot);
        engineUsed = 'typst';
      } catch (err) {
        if (isCommandMissing(err)) {
          throw formatMissingPandocError(err);
        }
        try {
          await ensureXeCjkInstalled(runner, workspaceRoot);
          await runner(
            'pandoc',
            [tempMdPath, '-o', outputPath, '--pdf-engine=xelatex', ...PDF_XELATEX_FONT_ARGS],
            workspaceRoot,
          );
          engineUsed = 'pandoc-xelatex';
        } catch (fallbackErr) {
          if (isCommandMissing(fallbackErr)) {
            throw formatMissingPandocError(fallbackErr);
          }
          if (isXelatexMissing(fallbackErr)) {
            throw new DocsMakerError(
              'XELATEX_NOT_FOUND',
              '渲染失败：未检测到 xelatex。',
              500,
              '请安装 xelatex（WSL: sudo apt install texlive-xetex），或确保 xelatex 在 PATH 中。',
            );
          }
          if (isXeCjkMissing(fallbackErr)) {
            throw formatXeCjkMissingError();
          }
          if (isFontConfigError(fallbackErr)) {
            throw new DocsMakerError(
              'CJK_FONT_NOT_FOUND',
              '渲染失败：LaTeX 字体配置异常。',
              500,
              '请安装中文字体（WSL: sudo apt install fonts-noto-cjk fonts-noto-core）并执行 fc-cache -f -v。',
            );
          }
          throw fallbackErr;
        }
      }
    } else {
      await runner('pandoc', [tempMdPath, '-o', outputPath], workspaceRoot);
      engineUsed = 'pandoc-xelatex';
    }
  } catch (err) {
    if (err instanceof DocsMakerError) {
      throw err;
    }
    if (isCommandMissing(err)) {
      throw formatMissingPandocError(err);
    }

    const message = err instanceof Error ? err.message : String(err);
    throw new DocsMakerError(
      'RENDER_FAILED',
      `渲染失败：${message}`,
      500,
      '请检查 Markdown 内容中的图片路径是否存在，并确认 Typst/Pandoc 环境可用。',
    );
  } finally {
    await fs.rm(tempMdPath, { force: true }).catch(() => undefined);
  }

  return {
    outputPath,
    relativePath,
    format: req.format,
    engineUsed,
    downloadUrl: `/api/docs-maker/download?path=${encodeURIComponent(outputPath)}&workspacePath=${encodeURIComponent(req.workspacePath)}`,
  };
}

import fs from 'node:fs/promises';
import path from 'node:path';
import { DocsMakerError } from '../types.js';

const WINDOWS_ABS_RE = /^[a-zA-Z]:[\\/]/;

function toPosixLike(input: string): string {
  if (!WINDOWS_ABS_RE.test(input)) {
    return input;
  }
  const drive = input[0].toLowerCase();
  const rest = input.slice(2).replace(/\\/g, '/').replace(/^\/+/, '');
  return `/mnt/${drive}/${rest}`;
}

export function normalizeFsPath(input: string): string {
  const maybePosix = process.platform === 'win32' ? input : toPosixLike(input);
  return path.resolve(maybePosix);
}

export function sanitizeSubDir(subDir: string): string {
  const normalized = subDir.replace(/\\/g, '/').trim();
  if (!normalized) {
    throw new DocsMakerError('INVALID_SUBDIR', 'subDir 不能为空', 400);
  }
  if (path.isAbsolute(normalized) || normalized.includes('..')) {
    throw new DocsMakerError('INVALID_SUBDIR', 'subDir 不能是绝对路径或包含 ..', 400);
  }
  return normalized;
}

export function ensureWithinWorkspace(targetPath: string, workspacePath: string) {
  const workspaceRoot = normalizeFsPath(workspacePath);
  const absoluteTarget = normalizeFsPath(targetPath);

  if (
    absoluteTarget !== workspaceRoot &&
    !absoluteTarget.startsWith(`${workspaceRoot}${path.sep}`)
  ) {
    throw new DocsMakerError(
      'WORKSPACE_PATH_VIOLATION',
      `路径不在 workspace 内: ${absoluteTarget}`,
      403,
      '请将输入/输出路径设置在 workspacePath 目录及其子目录中。',
    );
  }

  return {
    workspaceRoot,
    absoluteTarget,
    relativePath: path.relative(workspaceRoot, absoluteTarget).replace(/\\/g, '/'),
  };
}

export async function ensureDir(dirPath: string) {
  await fs.mkdir(dirPath, { recursive: true });
}

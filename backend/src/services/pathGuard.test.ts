import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { ensureWithinWorkspace, normalizeFsPath, sanitizeSubDir } from './pathGuard.js';

describe('pathGuard', () => {
  it('normalizes windows style path on non-win platform', () => {
    const normalized = normalizeFsPath('C:\\Users\\alice\\workspace');
    const lower = normalized.toLowerCase();
    expect(lower.includes('/users/alice/workspace') || lower.includes('\\users\\alice\\workspace')).toBe(
      true,
    );
  });

  it('rejects path outside workspace', () => {
    const workspace = '/tmp/ws';
    expect(() => ensureWithinWorkspace('/tmp/other/file.docx', workspace)).toThrow(
      /workspace 内/,
    );
  });

  it('accepts nested path inside workspace', () => {
    const workspace = '/tmp/ws';
    const nested = path.join(workspace, 'docs-maker', 'drafts', 'a.docx');
    const result = ensureWithinWorkspace(nested, workspace);
    expect(result.relativePath).toBe('docs-maker/drafts/a.docx');
  });

  it('sanitizes subdir and rejects traversal', () => {
    expect(sanitizeSubDir('docs-maker/drafts')).toBe('docs-maker/drafts');
    expect(() => sanitizeSubDir('../escape')).toThrow(/不能是绝对路径或包含/);
  });
});

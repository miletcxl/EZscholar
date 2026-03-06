import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../app.js';

describe('docs-maker routes', () => {
  it('uploads draft and persists in workspace', async () => {
    const app = createApp();
    const workspace = await fs.mkdtemp(path.join(os.tmpdir(), 'docs-maker-upload-'));

    const resp = await request(app)
      .post('/api/docs-maker/upload-draft')
      .field('workspacePath', workspace)
      .attach('file', Buffer.from('fake-docx-content'), 'draft.docx');

    expect(resp.status).toBe(200);
    expect(resp.body.savedFilePath).toContain(workspace);
    await expect(fs.access(resp.body.savedFilePath)).resolves.toBeUndefined();
  });

  it('rejects traversal subdir', async () => {
    const app = createApp();
    const workspace = await fs.mkdtemp(path.join(os.tmpdir(), 'docs-maker-upload-'));

    const resp = await request(app)
      .post('/api/docs-maker/upload-draft')
      .field('workspacePath', workspace)
      .field('subDir', '../escape')
      .attach('file', Buffer.from('fake-docx-content'), 'draft.docx');

    expect(resp.status).toBe(400);
    expect(resp.body.error_code).toBe('INVALID_SUBDIR');
  });

  it('returns slides stub message', async () => {
    const app = createApp();
    const resp = await request(app).post('/api/docs-maker/generate-presentation-slides').send({
      slideOutlineMarkdown: '# title',
      outputPath: '/tmp/ws/slides.pptx',
      workspacePath: '/tmp/ws',
    });

    expect(resp.status).toBe(200);
    expect(String(resp.body.message)).toContain('stub/placeholder');
  });
});

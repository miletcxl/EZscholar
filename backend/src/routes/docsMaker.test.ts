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

  it('uploads markdown and persists in workspace', async () => {
    const app = createApp();
    const workspace = await fs.mkdtemp(path.join(os.tmpdir(), 'docs-maker-upload-md-'));

    const resp = await request(app)
      .post('/api/docs-maker/upload-markdown')
      .field('workspacePath', workspace)
      .attach('file', Buffer.from('# title\n\n- a\n- b\n'), 'slides.md');

    expect(resp.status).toBe(200);
    expect(resp.body.savedFilePath).toContain(workspace);
    await expect(fs.access(resp.body.savedFilePath)).resolves.toBeUndefined();
  });

  it('creates async slide jobs via compatibility endpoint', async () => {
    const app = createApp();
    const workspace = await fs.mkdtemp(path.join(os.tmpdir(), 'docs-maker-slides-compat-'));
    const outputPath = path.join(workspace, 'docs-maker', 'slides', 'output', 'compat.pptx');

    const resp = await request(app).post('/api/docs-maker/generate-presentation-slides').send({
      slideOutlineMarkdown: '# title',
      outputPath,
      workspacePath: workspace,
    });

    expect(resp.status).toBe(200);
    expect(typeof resp.body.jobId).toBe('string');
    expect(resp.body.status).toBe('queued');
    expect(String(resp.body.message)).toContain('异步生成');
  });

  it('creates and fetches slide jobs', async () => {
    const app = createApp();
    const workspace = await fs.mkdtemp(path.join(os.tmpdir(), 'docs-maker-slides-job-'));

    const createResp = await request(app).post('/api/docs-maker/slides/jobs').send({
      workspacePath: workspace,
      markdownContent: '# title\n\n---\n\n# page 2',
    });

    expect(createResp.status).toBe(200);
    expect(createResp.body.jobId).toBeTruthy();

    const getResp = await request(app).get(`/api/docs-maker/slides/jobs/${createResp.body.jobId}`).query({
      workspacePath: workspace,
    });
    expect(getResp.status).toBe(200);
    expect(getResp.body.jobId).toBe(createResp.body.jobId);

    const listResp = await request(app).get('/api/docs-maker/slides/jobs').query({
      workspacePath: workspace,
      limit: 20,
    });
    expect(listResp.status).toBe(200);
    expect(Array.isArray(listResp.body)).toBe(true);
    expect(listResp.body.length).toBeGreaterThanOrEqual(1);
  });
});

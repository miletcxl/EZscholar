import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../app.js';

describe('workspace-state routes', () => {
  it('bootstraps default state files under workspace/.ezscholar', async () => {
    const app = createApp();
    const workspace = await fs.mkdtemp(path.join(os.tmpdir(), 'ezscholar-workspace-state-'));

    const resp = await request(app).get('/api/workspace-state/bootstrap').query({
      workspacePath: workspace,
    });

    expect(resp.status).toBe(200);
    expect(resp.body.config.workspacePath).toBe(path.resolve(workspace));
    expect(Array.isArray(resp.body.recentEvents)).toBe(true);

    await expect(fs.access(path.join(workspace, '.ezscholar', 'config.json'))).resolves.toBeUndefined();
    await expect(
      fs.access(path.join(workspace, '.ezscholar', 'state', 'module-snapshots.json')),
    ).resolves.toBeUndefined();
  });

  it('writes config and reads it back via bootstrap', async () => {
    const app = createApp();
    const workspace = await fs.mkdtemp(path.join(os.tmpdir(), 'ezscholar-workspace-state-'));

    const initial = await request(app).get('/api/workspace-state/bootstrap').query({
      workspacePath: workspace,
    });
    expect(initial.status).toBe(200);

    const nextConfig = {
      ...initial.body.config,
      ui: {
        theme: 'light',
      },
      llm: {
        ...initial.body.config.llm,
        activeProviderId: 'qwen',
      },
    };

    const putResp = await request(app).put('/api/workspace-state/config').send({
      workspacePath: workspace,
      config: nextConfig,
    });
    expect(putResp.status).toBe(200);
    expect(putResp.body.ui.theme).toBe('light');

    const reloaded = await request(app).get('/api/workspace-state/bootstrap').query({
      workspacePath: workspace,
    });
    expect(reloaded.status).toBe(200);
    expect(reloaded.body.config.ui.theme).toBe('light');
    expect(reloaded.body.config.llm.activeProviderId).toBe('qwen');
  });

  it('appends reminder event and updates deadline snapshot', async () => {
    const app = createApp();
    const workspace = await fs.mkdtemp(path.join(os.tmpdir(), 'ezscholar-workspace-state-'));
    const now = new Date().toISOString();

    const eventResp = await request(app).post('/api/workspace-state/events').send({
      workspacePath: workspace,
      event: {
        moduleId: 'deadline-engine',
        type: 'reminder.created',
        level: 'info',
        message: '创建提醒',
        payload: {
          reminder: {
            id: 'rem-1',
            taskName: '喝水',
            message: '补充水分',
            delayMs: 60000,
            createdAt: now,
            fireAt: now,
            status: 'pending',
          },
        },
      },
    });

    expect(eventResp.status).toBe(200);
    expect(eventResp.body.moduleSnapshots.modules['deadline-engine'].reminders).toHaveLength(1);

    const listResp = await request(app).get('/api/workspace-state/events').query({
      workspacePath: workspace,
      moduleId: 'deadline-engine',
      limit: 10,
    });

    expect(listResp.status).toBe(200);
    expect(Array.isArray(listResp.body)).toBe(true);
    expect(listResp.body).toHaveLength(1);
    expect(listResp.body[0].type).toBe('reminder.created');
  });

  it('rejects config write when config.workspacePath is outside request workspacePath', async () => {
    const app = createApp();
    const workspace = await fs.mkdtemp(path.join(os.tmpdir(), 'ezscholar-workspace-state-'));
    const outside = await fs.mkdtemp(path.join(os.tmpdir(), 'ezscholar-outside-'));

    const initial = await request(app).get('/api/workspace-state/bootstrap').query({
      workspacePath: workspace,
    });
    expect(initial.status).toBe(200);

    const badResp = await request(app).put('/api/workspace-state/config').send({
      workspacePath: workspace,
      config: {
        ...initial.body.config,
        workspacePath: outside,
      },
    });

    expect(badResp.status).toBe(403);
    expect(badResp.body.error_code).toBe('WORKSPACE_PATH_VIOLATION');
  });
});

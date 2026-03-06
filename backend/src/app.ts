import cors from 'cors';
import express from 'express';
import { ZodError } from 'zod';
import { createDocsMakerRouter } from './routes/docsMaker.js';
import { createWorkspaceStateRouter } from './routes/workspaceState.js';
import { DocsMakerError } from './types.js';

export function createApp() {
  const app = express();

  app.use(cors({ origin: true, credentials: true }));
  app.use(express.json({ limit: '10mb' }));

  app.get('/health', (_req, res) => {
    res.json({ ok: true });
  });

  app.use('/api/docs-maker', createDocsMakerRouter());
  app.use('/api/workspace-state', createWorkspaceStateRouter());

  app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    if (error instanceof ZodError) {
      res.status(400).json({
        error_code: 'INVALID_REQUEST',
        message: '请求参数校验失败',
        details: error.flatten(),
      });
      return;
    }

    if (error instanceof DocsMakerError) {
      res.status(error.status).json({
        error_code: error.code,
        message: error.message,
        hint: error.hint,
      });
      return;
    }

    const message = error instanceof Error ? error.message : String(error);
    res.status(500).json({
      error_code: 'INTERNAL_ERROR',
      message,
    });
  });

  return app;
}

import { Router } from 'express';
import {
  WorkspaceBootstrapQuerySchema,
  WorkspaceGetEventsQuerySchema,
  WorkspaceMigrateFromLocalStorageSchema,
  WorkspacePostEventSchema,
  WorkspacePutConfigSchema,
} from '../types.js';
import {
  bootstrapWorkspaceState,
  getWorkspaceEvents,
  migrateFromLocalStorage,
  postWorkspaceEvent,
  saveWorkspaceConfig,
} from '../services/workspaceState.js';

export function createWorkspaceStateRouter() {
  const router = Router();

  router.get('/bootstrap', async (req, res, next) => {
    try {
      const parsed = WorkspaceBootstrapQuerySchema.parse(req.query);
      const payload = await bootstrapWorkspaceState(parsed.workspacePath);
      res.json(payload);
    } catch (error) {
      next(error);
    }
  });

  router.put('/config', async (req, res, next) => {
    try {
      const parsed = WorkspacePutConfigSchema.parse(req.body);
      const payload = await saveWorkspaceConfig(parsed);
      res.json(payload);
    } catch (error) {
      next(error);
    }
  });

  router.post('/events', async (req, res, next) => {
    try {
      const parsed = WorkspacePostEventSchema.parse(req.body);
      const payload = await postWorkspaceEvent(parsed);
      res.json(payload);
    } catch (error) {
      next(error);
    }
  });

  router.get('/events', async (req, res, next) => {
    try {
      const parsed = WorkspaceGetEventsQuerySchema.parse(req.query);
      const payload = await getWorkspaceEvents(parsed);
      res.json(payload);
    } catch (error) {
      next(error);
    }
  });

  router.post('/migrate-from-localstorage', async (req, res, next) => {
    try {
      const parsed = WorkspaceMigrateFromLocalStorageSchema.parse(req.body);
      const payload = await migrateFromLocalStorage(parsed);
      res.json(payload);
    } catch (error) {
      next(error);
    }
  });

  return router;
}

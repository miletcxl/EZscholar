import type { ModuleId } from './types';

export const queryKeys = {
  dashboard: ['dashboard'] as const,
  activities: ['activities'] as const,
  moduleDetail: (moduleId: ModuleId) => ['module-detail', moduleId] as const,
  commandActions: ['command-actions'] as const,
};

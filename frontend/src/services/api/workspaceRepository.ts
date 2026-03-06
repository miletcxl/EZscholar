import { getWorkspaceEvents, postWorkspaceEvent } from '../workspace-state/client';
import type { WorkspaceEvent } from '../workspace-state/types';
import { mockRepository } from '../mock/mockRepository';
import { useWorkspaceStore } from '../../stores/useWorkspaceStore';
import type {
  ActivityEventDTO,
  CommandActionDTO,
  CommandResultDTO,
  DashboardDTO,
  ModuleDetailDTO,
  ModuleId,
} from './types';
import type { EZScholarRepository } from './repository';

const KNOWN_MODULE_IDS = new Set<ModuleId>([
  'deadline-engine',
  'remote-dispatcher',
  'flow-guardian',
  'output-generator',
  'research-brain',
  'socratic-interceptor',
]);

function mapWorkspaceEventToActivityEvent(event: WorkspaceEvent): ActivityEventDTO {
  const source: ActivityEventDTO['source'] = KNOWN_MODULE_IDS.has(event.moduleId as ModuleId)
    ? (event.moduleId as ModuleId)
    : 'system';

  return {
    id: event.eventId ?? `evt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    at: event.at ?? new Date().toISOString(),
    level: event.level ?? 'info',
    source,
    message: event.message?.trim() || `事件：${event.type}`,
  };
}

async function getWorkspaceActivities(limit = 100): Promise<ActivityEventDTO[]> {
  const workspacePath = useWorkspaceStore.getState().workspacePath;
  if (!workspacePath.trim()) {
    return [];
  }

  const events = await getWorkspaceEvents({
    workspacePath,
    limit,
  });

  return events
    .map(mapWorkspaceEventToActivityEvent)
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
}

export const workspaceRepository: EZScholarRepository = {
  async getDashboard(): Promise<DashboardDTO> {
    const fallback = await mockRepository.getDashboard();
    try {
      const activities = await getWorkspaceActivities(50);
      if (activities.length === 0) {
        return fallback;
      }
      return {
        ...fallback,
        activities: activities.slice(0, 6),
      };
    } catch {
      return fallback;
    }
  },

  async getModuleDetail(moduleId: ModuleId): Promise<ModuleDetailDTO> {
    return mockRepository.getModuleDetail(moduleId);
  },

  async getActivityEvents(): Promise<ActivityEventDTO[]> {
    try {
      const activities = await getWorkspaceActivities(500);
      if (activities.length > 0) {
        return activities;
      }
    } catch {
      // Fallback to mock below.
    }
    return mockRepository.getActivityEvents();
  },

  async getCommandActions(): Promise<CommandActionDTO[]> {
    return mockRepository.getCommandActions();
  },

  async executeCommand(actionId: string): Promise<CommandResultDTO> {
    const result = await mockRepository.executeCommand(actionId);

    if (result.generatedEvent) {
      const workspacePath = useWorkspaceStore.getState().workspacePath;
      if (workspacePath.trim()) {
        void postWorkspaceEvent({
          workspacePath,
          event: {
            eventId: result.generatedEvent.id,
            at: result.generatedEvent.at,
            moduleId: result.generatedEvent.source,
            type: 'command.executed',
            level: result.generatedEvent.level,
            message: result.generatedEvent.message,
            payload: {
              actionId,
            },
          },
        }).catch(() => {
          // Keep command simulation resilient even when persistence fails.
        });
      }
    }

    return result;
  },
};

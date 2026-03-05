import type { EZScholarRepository } from '../api/repository';
import type {
  ActivityEventDTO,
  CommandActionDTO,
  CommandResultDTO,
  DashboardDTO,
  ModuleDetailDTO,
  ModuleId,
  ModuleSummaryDTO,
  RecentVisitDTO,
} from '../api/types';
import {
  mockActivityEvents,
  mockCommandActions,
  mockModuleDetails,
  mockModuleSummaries,
  mockRecentVisits,
} from './data';

const latencyMs = 240;

function delay<T>(value: T): Promise<T> {
  return new Promise((resolve) => {
    setTimeout(() => resolve(value), latencyMs);
  });
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

const state: {
  moduleSummaries: ModuleSummaryDTO[];
  moduleDetails: ModuleDetailDTO[];
  activityEvents: ActivityEventDTO[];
  recentVisits: RecentVisitDTO[];
  commandActions: CommandActionDTO[];
} = {
  moduleSummaries: clone(mockModuleSummaries),
  moduleDetails: clone(mockModuleDetails),
  activityEvents: clone(mockActivityEvents),
  recentVisits: clone(mockRecentVisits),
  commandActions: clone(mockCommandActions),
};

function sortByTimeDesc<T extends { at: string }>(events: T[]): T[] {
  return [...events].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
}

function shouldFail(key: string): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  return window.localStorage.getItem(`mock:error:${key}`) === '1';
}

export const mockRepository: EZScholarRepository = {
  async getDashboard(): Promise<DashboardDTO> {
    if (shouldFail('dashboard')) {
      throw new Error('Dashboard mock error');
    }

    return delay({
      modules: clone(state.moduleSummaries),
      recentVisits: clone(state.recentVisits).sort(
        (a, b) => new Date(b.visitedAt).getTime() - new Date(a.visitedAt).getTime(),
      ),
      activities: sortByTimeDesc(clone(state.activityEvents)).slice(0, 6),
    });
  },

  async getModuleDetail(moduleId: ModuleId): Promise<ModuleDetailDTO> {
    const detail = state.moduleDetails.find((item) => item.id === moduleId);
    if (!detail) {
      throw new Error(`模块不存在: ${moduleId}`);
    }

    return delay(clone(detail));
  },

  async getActivityEvents(): Promise<ActivityEventDTO[]> {
    return delay(sortByTimeDesc(clone(state.activityEvents)));
  },

  async getCommandActions(): Promise<CommandActionDTO[]> {
    return delay(clone(state.commandActions));
  },

  async executeCommand(actionId: string): Promise<CommandResultDTO> {
    const action = state.commandActions.find((item) => item.id === actionId);
    if (!action) {
      throw new Error(`命令不存在: ${actionId}`);
    }

    if (action.category === 'navigate') {
      return delay({
        ok: true,
        actionId,
        message: `已跳转到 ${action.title}`,
      });
    }

    const event: ActivityEventDTO = {
      id: `evt-sim-${Date.now()}`,
      at: new Date().toISOString(),
      level: 'success',
      source: action.source ?? 'system',
      message: action.message ?? `${action.title} 已执行`,
    };

    state.activityEvents = [event, ...state.activityEvents];

    const matchingVisit = state.recentVisits.find((item) => item.path === '/activity');
    if (matchingVisit) {
      matchingVisit.visitedAt = new Date().toISOString();
    }

    return delay({
      ok: true,
      actionId,
      message: event.message,
      generatedEvent: event,
    });
  },
};

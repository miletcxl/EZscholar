import type { LLMProviderConfig } from '../llm/types';
import type { ReminderDTO } from '../notifier/types';

export type WorkspaceEventLevel = 'info' | 'success' | 'warning' | 'error';

export interface WorkspaceConfig {
  version: number;
  updatedAt: string;
  workspacePath: string;
  llm: {
    activeProviderId: string;
    providers: LLMProviderConfig[];
  };
  ui: {
    theme: 'dark' | 'light';
  };
  modules: {
    'deadline-engine'?: {
      defaultDelayMinutes?: number;
    };
    [key: string]: unknown;
  };
}

export interface ModuleSnapshots {
  version: number;
  updatedAt: string;
  modules: {
    'deadline-engine': {
      reminders: ReminderDTO[];
    };
    'output-generator': {
      lastReports: string[];
    };
    [key: string]: unknown;
  };
}

export interface WorkspaceEvent {
  eventId?: string;
  at?: string;
  moduleId: string;
  type: string;
  level?: WorkspaceEventLevel;
  message?: string;
  payload?: Record<string, unknown>;
}

export interface WorkspaceMigrationMeta {
  migrated: boolean;
  source: string | null;
  migratedAt: string | null;
}

export interface WorkspaceBootstrapResponse {
  config: WorkspaceConfig;
  moduleSnapshots: ModuleSnapshots;
  recentEvents: WorkspaceEvent[];
  migration: WorkspaceMigrationMeta;
}

export interface WorkspaceGetEventsRequest {
  workspacePath: string;
  limit?: number;
  moduleId?: string;
  from?: string;
  to?: string;
}

export interface WorkspacePutConfigRequest {
  workspacePath: string;
  config: WorkspaceConfig;
}

export interface WorkspacePostEventRequest {
  workspacePath: string;
  event: WorkspaceEvent;
}

export interface WorkspaceMigrateFromLocalStorageRequest {
  workspacePath: string;
  localState?: {
    workspacePath?: string;
    llm?: {
      activeProviderId?: string;
      providers?: LLMProviderConfig[];
    };
    ui?: {
      theme?: 'dark' | 'light';
    };
  };
}

export interface WorkspacePostEventResponse {
  event: WorkspaceEvent;
  moduleSnapshots: ModuleSnapshots;
}

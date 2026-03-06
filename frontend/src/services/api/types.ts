export type ModuleId =
  | 'deadline-engine'
  | 'remote-dispatcher'
  | 'flow-guardian'
  | 'output-generator'
  | 'slides-studio'
  | 'research-brain'
  | 'socratic-interceptor';

export type ModuleStatus = 'healthy' | 'busy' | 'warning' | 'offline';

export interface ModuleSummaryDTO {
  id: ModuleId;
  title: string;
  status: ModuleStatus;
  lastUpdatedAt: string;
  kpi: { label: string; value: string };
}

export interface ModuleRunDTO {
  id: string;
  name: string;
  state: string;
  startedAt: string;
}

export interface ModuleMetricDTO {
  label: string;
  value: string;
  trend?: 'up' | 'down' | 'flat';
}

export interface ModuleDetailDTO {
  id: ModuleId;
  description: string;
  capabilities: string[];
  recentRuns: ModuleRunDTO[];
  metrics: ModuleMetricDTO[];
}

export interface ActivityEventDTO {
  id: string;
  at: string;
  level: 'info' | 'success' | 'warning' | 'error';
  source: ModuleId | 'system';
  message: string;
}

export interface RecentVisitDTO {
  id: string;
  title: string;
  path: string;
  visitedAt: string;
  category: 'module' | 'activity' | 'settings';
}

export interface CommandActionDTO {
  id: string;
  title: string;
  category: 'navigate' | 'simulate';
  shortcut?: string;
  targetRoute?: string;
  source?: ModuleId | 'system';
  message?: string;
}

export interface CommandResultDTO {
  ok: boolean;
  actionId: string;
  message: string;
  generatedEvent?: ActivityEventDTO;
}

export interface DashboardDTO {
  recentVisits: RecentVisitDTO[];
  modules: ModuleSummaryDTO[];
  activities: ActivityEventDTO[];
}

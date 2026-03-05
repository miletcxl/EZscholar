import type {
  ActivityEventDTO,
  CommandActionDTO,
  CommandResultDTO,
  DashboardDTO,
  ModuleDetailDTO,
  ModuleId,
} from './types';

export interface EZScholarRepository {
  getDashboard(): Promise<DashboardDTO>;
  getModuleDetail(moduleId: ModuleId): Promise<ModuleDetailDTO>;
  getActivityEvents(): Promise<ActivityEventDTO[]>;
  getCommandActions(): Promise<CommandActionDTO[]>;
  executeCommand(actionId: string): Promise<CommandResultDTO>;
}

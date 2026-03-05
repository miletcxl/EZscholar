import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ezScholarRepository } from './client';
import { queryKeys } from './queryKeys';
import type { ModuleId } from './types';

export function useDashboardQuery() {
  return useQuery({
    queryKey: queryKeys.dashboard,
    queryFn: () => ezScholarRepository.getDashboard(),
  });
}

export function useModuleDetailQuery(moduleId: ModuleId) {
  return useQuery({
    queryKey: queryKeys.moduleDetail(moduleId),
    queryFn: () => ezScholarRepository.getModuleDetail(moduleId),
  });
}

export function useActivitiesQuery() {
  return useQuery({
    queryKey: queryKeys.activities,
    queryFn: () => ezScholarRepository.getActivityEvents(),
  });
}

export function useCommandActionsQuery() {
  return useQuery({
    queryKey: queryKeys.commandActions,
    queryFn: () => ezScholarRepository.getCommandActions(),
  });
}

export function useExecuteCommandMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (actionId: string) => ezScholarRepository.executeCommand(actionId),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.dashboard }),
        queryClient.invalidateQueries({ queryKey: queryKeys.activities }),
      ]);
    },
  });
}

import clsx from 'clsx';
import type { ModuleStatus } from '../services/api/types';

interface SystemStatusBadgeProps {
  status: ModuleStatus;
}

const labelMap: Record<ModuleStatus, string> = {
  healthy: '健康',
  busy: '繁忙',
  warning: '预警',
  offline: '离线',
};

export function SystemStatusBadge({ status }: SystemStatusBadgeProps) {
  return <span className={clsx('status-badge', `status-${status}`)}>{labelMap[status]}</span>;
}

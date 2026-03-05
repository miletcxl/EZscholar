import type { LucideIcon } from 'lucide-react';
import {
  Activity,
  BookOpen,
  CalendarClock,
  Cog,
  Database,
  HeartPulse,
  House,
  ShieldQuestion,
  TerminalSquare,
} from 'lucide-react';
import type { ModuleId } from '../services/api/types';

export interface NavItem {
  id: string;
  label: string;
  path: string;
  icon: LucideIcon;
}

export interface ModuleNavItem {
  id: ModuleId;
  label: string;
  path: string;
  icon: LucideIcon;
}

export const mainNavItems: NavItem[] = [
  { id: 'home', label: '首页总览', path: '/', icon: House },
  { id: 'activity', label: '活动时间线', path: '/activity', icon: Activity },
  { id: 'settings', label: '设置', path: '/settings', icon: Cog },
];

export const moduleNavItems: ModuleNavItem[] = [
  {
    id: 'deadline-engine',
    label: 'Deadline Engine',
    path: '/modules/deadline-engine',
    icon: CalendarClock,
  },
  {
    id: 'remote-dispatcher',
    label: 'Remote Dispatcher',
    path: '/modules/remote-dispatcher',
    icon: TerminalSquare,
  },
  {
    id: 'flow-guardian',
    label: 'Flow Guardian',
    path: '/modules/flow-guardian',
    icon: HeartPulse,
  },
  {
    id: 'output-generator',
    label: 'Output Generator',
    path: '/modules/output-generator',
    icon: Database,
  },
  {
    id: 'research-brain',
    label: 'Research Brain',
    path: '/modules/research-brain',
    icon: BookOpen,
  },
  {
    id: 'socratic-interceptor',
    label: 'Socratic Interceptor',
    path: '/modules/socratic-interceptor',
    icon: ShieldQuestion,
  },
];

export const moduleTitleMap: Record<ModuleId, string> = moduleNavItems.reduce(
  (acc, item) => ({ ...acc, [item.id]: item.label }),
  {} as Record<ModuleId, string>,
);

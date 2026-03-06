import type { LucideIcon } from 'lucide-react';
import {
  Activity,
  BookOpen,
  CalendarClock,
  Cog,
  Database,
  HeartPulse,
  LayoutDashboard,
  MessageSquare,
  MonitorPlay,
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
  { id: 'chat', label: 'AI 对话', path: '/', icon: MessageSquare },
  { id: 'overview', label: '总览', path: '/overview', icon: LayoutDashboard },
  { id: 'activity', label: '活动时间线', path: '/activity', icon: Activity },
  { id: 'settings', label: '设置', path: '/settings', icon: Cog },
];


export const moduleNavItems: ModuleNavItem[] = [
  {
    id: 'deadline-engine',
    label: '日程引擎',
    path: '/modules/deadline-engine',
    icon: CalendarClock,
  },
  {
    id: 'remote-dispatcher',
    label: '算力调度',
    path: '/modules/remote-dispatcher',
    icon: TerminalSquare,
  },
  {
    id: 'flow-guardian',
    label: '心流守护',
    path: '/modules/flow-guardian',
    icon: HeartPulse,
  },
  {
    id: 'output-generator',
    label: '文档生成',
    path: '/modules/output-generator',
    icon: Database,
  },
  {
    id: 'slides-studio',
    label: '幻灯片工坊',
    path: '/modules/slides-studio',
    icon: MonitorPlay,
  },
  {
    id: 'research-brain',
    label: '科研大脑',
    path: '/modules/research-brain',
    icon: BookOpen,
  },
  {
    id: 'socratic-interceptor',
    label: '逻辑思辨',
    path: '/modules/socratic-interceptor',
    icon: ShieldQuestion,
  },
];

export const moduleTitleMap: Record<ModuleId, string> = moduleNavItems.reduce(
  (acc, item) => ({ ...acc, [item.id]: item.label }),
  {} as Record<ModuleId, string>,
);

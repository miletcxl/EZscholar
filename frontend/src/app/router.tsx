import { createBrowserRouter } from 'react-router-dom';
import { AppShell } from '../layouts/AppShell';
import { ActivityPage } from '../pages/ActivityPage';
import { DashboardPage } from '../pages/DashboardPage';
import { ModuleDetailPage } from '../pages/ModuleDetailPage';
import { SettingsPage } from '../pages/SettingsPage';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppShell />,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: 'activity', element: <ActivityPage /> },
      { path: 'settings', element: <SettingsPage /> },
      { path: 'modules/deadline-engine', element: <ModuleDetailPage moduleId="deadline-engine" /> },
      { path: 'modules/remote-dispatcher', element: <ModuleDetailPage moduleId="remote-dispatcher" /> },
      { path: 'modules/flow-guardian', element: <ModuleDetailPage moduleId="flow-guardian" /> },
      { path: 'modules/output-generator', element: <ModuleDetailPage moduleId="output-generator" /> },
      { path: 'modules/research-brain', element: <ModuleDetailPage moduleId="research-brain" /> },
      {
        path: 'modules/socratic-interceptor',
        element: <ModuleDetailPage moduleId="socratic-interceptor" />,
      },
    ],
  },
]);

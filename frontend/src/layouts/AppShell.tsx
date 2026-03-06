import { useEffect, useRef, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { CommandPalette } from '../features/command-palette/CommandPalette';
import { Sidebar } from './Sidebar';
import { TopHeader } from './TopHeader';
import { ToastCenter } from '../components/ToastCenter';
import { useUiStore } from '../stores/useUiStore';
import { useLlmStore } from '../stores/useLlmStore';
import { useWorkspaceStore } from '../stores/useWorkspaceStore';
import { useNotifierStore } from '../stores/useNotifierStore';
import {
  bootstrapWorkspaceState,
  migrateFromLocalStorage,
  putWorkspaceConfig,
} from '../services/workspace-state/client';
import type { WorkspaceConfig } from '../services/workspace-state/types';
import type { LLMProviderConfig } from '../services/llm/types';

interface PersistEnvelope<T> {
  state?: T;
}

function parsePersistedState<T>(key: string): T | null {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as PersistEnvelope<T>;
    if (parsed && typeof parsed === 'object' && parsed.state && typeof parsed.state === 'object') {
      return parsed.state;
    }
    return null;
  } catch {
    return null;
  }
}

function loadLocalStateForMigration() {
  const llm = parsePersistedState<{
    activeProviderId?: string;
    providers?: LLMProviderConfig[];
  }>('cyber-scholar-llm');
  const ui = parsePersistedState<{ theme?: 'dark' | 'light' }>('cyber-scholar-ui');
  const workspace = parsePersistedState<{ workspacePath?: string }>('cyber-scholar-workspace');

  const hasLocalData = Boolean(
    llm?.activeProviderId ||
      (Array.isArray(llm?.providers) && llm.providers.length > 0) ||
      ui?.theme ||
      workspace?.workspacePath,
  );
  if (!hasLocalData) {
    return null;
  }

  return {
    llm: llm
      ? {
          activeProviderId: llm.activeProviderId,
          providers: llm.providers,
        }
      : undefined,
    ui: ui
      ? {
          theme: ui.theme,
        }
      : undefined,
    workspacePath: workspace?.workspacePath,
  };
}

export function AppShell() {
  const toggleCommandPalette = useUiStore((state) => state.toggleCommandPalette);
  const setTheme = useUiStore((state) => state.setTheme);
  const theme = useUiStore((state) => state.theme);

  const workspacePath = useWorkspaceStore((state) => state.workspacePath);
  const setWorkspacePath = useWorkspaceStore((state) => state.setWorkspacePath);

  const activeProviderId = useLlmStore((state) => state.activeProviderId);
  const providers = useLlmStore((state) => state.providers);
  const hydrateLlm = useLlmStore((state) => state.hydrateFromWorkspace);

  const hydrateFromWorkspace = useNotifierStore((state) => state.hydrateFromWorkspace);
  const [workspaceStateReady, setWorkspaceStateReady] = useState(false);
  const persistTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        toggleCommandPalette();
      }
    }

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [toggleCommandPalette]);

  useEffect(() => {
    let isDisposed = false;

    async function bootstrap() {
      try {
        const currentWorkspacePath = useWorkspaceStore.getState().workspacePath;
        let payload = await bootstrapWorkspaceState(currentWorkspacePath);
        const localState = loadLocalStateForMigration();

        if (!payload.migration.migrated && localState) {
          payload = await migrateFromLocalStorage({
            workspacePath: currentWorkspacePath,
            localState,
          });
        }

        if (isDisposed) {
          return;
        }

        setWorkspacePath(payload.config.workspacePath);
        hydrateLlm(payload.config.llm);
        setTheme(payload.config.ui.theme);
        hydrateFromWorkspace(payload.moduleSnapshots.modules['deadline-engine']?.reminders ?? []);
      } catch (error) {
        console.warn('workspace-state bootstrap failed, fallback to local persisted state', error);
      } finally {
        if (!isDisposed) {
          setWorkspaceStateReady(true);
        }
      }
    }

    void bootstrap();
    return () => {
      isDisposed = true;
    };
  }, [hydrateFromWorkspace, hydrateLlm, setTheme, setWorkspacePath]);

  useEffect(() => {
    if (!workspaceStateReady || !workspacePath.trim()) {
      return;
    }

    if (persistTimerRef.current) {
      clearTimeout(persistTimerRef.current);
    }

    const config: WorkspaceConfig = {
      version: 1,
      updatedAt: new Date().toISOString(),
      workspacePath,
      llm: {
        activeProviderId,
        providers,
      },
      ui: {
        theme,
      },
      modules: {
        'deadline-engine': {
          defaultDelayMinutes: 30,
        },
      },
    };

    persistTimerRef.current = setTimeout(() => {
      void putWorkspaceConfig({
        workspacePath,
        config,
      }).catch((error) => {
        console.warn('workspace-state config write failed', error);
      });
    }, 500);

    return () => {
      if (persistTimerRef.current) {
        clearTimeout(persistTimerRef.current);
      }
    };
  }, [activeProviderId, providers, theme, workspacePath, workspaceStateReady]);

  return (
    <div className="app-shell">
      <Sidebar />
      <div className="main-shell">
        <TopHeader />
        <main className="page-wrap">
          <Outlet />
        </main>
      </div>
      <CommandPalette />
      <ToastCenter />
    </div>
  );
}

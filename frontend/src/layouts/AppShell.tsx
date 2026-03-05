import { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { CommandPalette } from '../features/command-palette/CommandPalette';
import { Sidebar } from './Sidebar';
import { TopHeader } from './TopHeader';
import { ToastCenter } from '../components/ToastCenter';
import { useUiStore } from '../stores/useUiStore';

export function AppShell() {
  const toggleCommandPalette = useUiStore((state) => state.toggleCommandPalette);

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

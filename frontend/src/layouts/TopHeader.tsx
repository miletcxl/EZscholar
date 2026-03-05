import { Command } from 'lucide-react';
import { PageBreadcrumb } from '../components/PageBreadcrumb';
import { useUiStore } from '../stores/useUiStore';

export function TopHeader() {
  const openCommandPalette = useUiStore((state) => state.openCommandPalette);

  return (
    <header className="top-header">
      <PageBreadcrumb />
      <button type="button" className="button-secondary" onClick={openCommandPalette}>
        <Command size={14} />
        命令面板
      </button>
    </header>
  );
}

import { Moon, Sun } from 'lucide-react';
import { LlmProviderPanel } from '../features/settings/LlmProviderPanel';
import { WorkspacePanel } from '../features/settings/WorkspacePanel';
import { useUiStore } from '../stores/useUiStore';

export function SettingsPage() {
  const { theme, toggleTheme } = useUiStore();

  return (
    <div className="page-grid">
      {/* ── LLM Provider Config ── */}
      <section className="panel">
        <header className="panel-header">
          <h2>系统核心配置</h2>
        </header>
        <LlmProviderPanel />
        <WorkspacePanel />
      </section>

      {/* ── General Settings ── */}
      <section className="panel settings-panel">
        <header className="panel-header">
          <h2>通用设置</h2>
        </header>
        <div className="settings-grid">
          <article className="settings-item">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h3>系统主题</h3>
              <button
                onClick={toggleTheme}
                className="theme-toggle-btn"
                style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  background: 'var(--surface-elevated)', border: '1px solid var(--border)',
                  padding: '6px 12px', borderRadius: '6px', color: 'var(--text)', cursor: 'pointer'
                }}
              >
                {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
                <span>{theme === 'dark' ? '切换为浅色' : '切换为深色'}</span>
              </button>
            </div>
            <p>基于全新的全局 CSS Variables 主题系统，支持随心无缝切换。</p>
          </article>
          <article className="settings-item">
            <h3>语言</h3>
            <p>当前版本仅提供中文文案。</p>
          </article>
          <article className="settings-item">
            <h3>命令面板</h3>
            <p>快捷键：Ctrl/Cmd + K，可执行导航与模拟动作。</p>
          </article>
        </div>
      </section>
    </div>
  );
}

export function SettingsPage() {
  return (
    <section className="panel settings-panel">
      <header className="panel-header">
        <h2>设置</h2>
      </header>
      <div className="settings-grid">
        <article className="settings-item">
          <h3>主题</h3>
          <p>当前为深色模式，样式 token 已预留亮色变量。</p>
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
  );
}

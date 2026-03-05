import { NavLink } from 'react-router-dom';
import clsx from 'clsx';
import { mainNavItems, moduleNavItems } from '../app/navigation';

function SidebarNavLink({ label, path, icon: Icon }: { label: string; path: string; icon: React.ComponentType<{ size?: number }> }) {
  return (
    <NavLink
      to={path}
      end={path === '/'}
      className={({ isActive }) => clsx('sidebar-link', isActive && 'active')}
      data-testid={`nav-${path}`}
    >
      <Icon size={16} />
      <span>{label}</span>
    </NavLink>
  );
}

export function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="workspace-head">
        <div className="workspace-avatar">
          <img src="/EZscholar.png" alt="EZscholar Logo" className="workspace-avatar-image" />
        </div>
        <div>
          <p className="workspace-label">EZscholar</p>
          <p className="workspace-sub">学术控制台</p>
        </div>
      </div>

      <nav className="sidebar-group" aria-label="主导航">
        <p className="sidebar-title">主导航</p>
        {mainNavItems.map((item) => (
          <SidebarNavLink key={item.id} label={item.label} path={item.path} icon={item.icon} />
        ))}
      </nav>

      <nav className="sidebar-group" aria-label="模块导航">
        <p className="sidebar-title">模块</p>
        {moduleNavItems.map((item) => (
          <SidebarNavLink key={item.id} label={item.label} path={item.path} icon={item.icon} />
        ))}
      </nav>
    </aside>
  );
}

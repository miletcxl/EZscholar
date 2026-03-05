import { ChevronRight } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { moduleTitleMap } from '../app/navigation';
import type { ModuleId } from '../services/api/types';

function toLabel(segment: string): string {
  if (segment === 'activity') return '活动时间线';
  if (segment === 'settings') return '设置';
  if (segment === 'modules') return '模块';
  return segment;
}

export function PageBreadcrumb() {
  const location = useLocation();
  const parts = location.pathname.split('/').filter(Boolean);

  if (parts.length === 0) {
    return (
      <nav aria-label="breadcrumb" className="breadcrumb">
        <span>首页总览</span>
      </nav>
    );
  }

  return (
    <nav aria-label="breadcrumb" className="breadcrumb">
      <Link to="/">首页总览</Link>
      {parts.map((segment, index) => {
        const href = `/${parts.slice(0, index + 1).join('/')}`;
        const isLast = index === parts.length - 1;
        const label =
          parts[index - 1] === 'modules'
            ? moduleTitleMap[segment as ModuleId] ?? segment
            : toLabel(segment);

        return (
          <span className="breadcrumb-item" key={href}>
            <ChevronRight size={14} />
            {isLast ? <span>{label}</span> : <Link to={href}>{label}</Link>}
          </span>
        );
      })}
    </nav>
  );
}

import { Link } from 'react-router-dom';
import { moduleNavItems } from '../../app/navigation';
import { formatDateTime } from '../../app/format';
import { SystemStatusBadge } from '../../components/SystemStatusBadge';
import type { ModuleSummaryDTO } from '../../services/api/types';

interface FeatureCardGridProps {
  modules: ModuleSummaryDTO[];
}

export function FeatureCardGrid({ modules }: FeatureCardGridProps) {
  return (
    <section className="panel">
      <header className="panel-header">
        <h2>核心能力</h2>
      </header>
      <div className="feature-grid">
        {modules.map((module) => {
          const navItem = moduleNavItems.find((item) => item.id === module.id);
          const Icon = navItem?.icon;

          return (
            <Link key={module.id} to={`/modules/${module.id}`} className="feature-card">
              <div className="feature-card-title-row">
                <h3>{module.title}</h3>
                {Icon ? <Icon size={16} /> : null}
              </div>
              <SystemStatusBadge status={module.status} />
              <p className="feature-kpi">
                {module.kpi.label}: <strong>{module.kpi.value}</strong>
              </p>
              <p className="feature-meta">更新于 {formatDateTime(module.lastUpdatedAt)}</p>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

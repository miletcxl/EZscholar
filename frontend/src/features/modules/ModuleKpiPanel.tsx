import clsx from 'clsx';
import type { ModuleMetricDTO } from '../../services/api/types';

interface ModuleKpiPanelProps {
  metrics: ModuleMetricDTO[];
}

export function ModuleKpiPanel({ metrics }: ModuleKpiPanelProps) {
  return (
    <section className="panel">
      <header className="panel-header">
        <h2>关键指标</h2>
      </header>
      <div className="metric-grid">
        {metrics.map((metric) => (
          <article className="metric-card" key={metric.label}>
            <p className="metric-label">{metric.label}</p>
            <p className="metric-value">{metric.value}</p>
            {metric.trend ? <p className={clsx('metric-trend', `trend-${metric.trend}`)}>{metric.trend}</p> : null}
          </article>
        ))}
      </div>
    </section>
  );
}

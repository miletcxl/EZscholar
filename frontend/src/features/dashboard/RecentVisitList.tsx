import { Link } from 'react-router-dom';
import type { RecentVisitDTO } from '../../services/api/types';
import { formatDateTime } from '../../app/format';

interface RecentVisitListProps {
  visits: RecentVisitDTO[];
}

export function RecentVisitList({ visits }: RecentVisitListProps) {
  return (
    <section className="panel">
      <header className="panel-header">
        <h2>最近访问</h2>
      </header>
      <div className="visit-list">
        {visits.map((visit) => (
          <Link key={visit.id} to={visit.path} className="visit-item">
            <div>
              <p className="visit-title">{visit.title}</p>
              <p className="visit-meta">{visit.category}</p>
            </div>
            <time dateTime={visit.visitedAt}>{formatDateTime(visit.visitedAt)}</time>
          </Link>
        ))}
      </div>
    </section>
  );
}

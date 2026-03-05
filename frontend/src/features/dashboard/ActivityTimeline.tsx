import clsx from 'clsx';
import type { ActivityEventDTO } from '../../services/api/types';
import { formatDateTime } from '../../app/format';

interface ActivityTimelineProps {
  events: ActivityEventDTO[];
  title?: string;
}

export function ActivityTimeline({ events, title = '活动时间线' }: ActivityTimelineProps) {
  const sortedEvents = [...events].sort(
    (a, b) => new Date(b.at).getTime() - new Date(a.at).getTime(),
  );

  return (
    <section className="panel">
      <header className="panel-header">
        <h2>{title}</h2>
      </header>
      <div className="timeline-list">
        {sortedEvents.map((event) => (
          <article key={event.id} className="timeline-item" data-testid="timeline-item">
            <span className={clsx('timeline-dot', `dot-${event.level}`)} aria-hidden="true" />
            <div className="timeline-content">
              <p className="timeline-message">{event.message}</p>
              <p className="timeline-meta">
                {event.source} · {formatDateTime(event.at)}
              </p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

import { ErrorState } from '../components/ErrorState';
import { Skeleton } from '../components/Skeleton';
import { ActivityTimeline } from '../features/dashboard/ActivityTimeline';
import { useActivitiesQuery } from '../services/api/hooks';

export function ActivityPage() {
  const { data, isLoading, isError, refetch } = useActivitiesQuery();

  if (isLoading) {
    return (
      <section className="panel">
        <Skeleton height="24px" width="140px" />
        <Skeleton height="72px" />
        <Skeleton height="72px" />
      </section>
    );
  }

  if (isError || !data) {
    return <ErrorState onRetry={() => refetch()} />;
  }

  return <ActivityTimeline events={data} title="完整活动时间线" />;
}

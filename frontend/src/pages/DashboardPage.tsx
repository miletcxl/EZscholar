import { ErrorState } from '../components/ErrorState';
import { Skeleton } from '../components/Skeleton';
import { ActivityTimeline } from '../features/dashboard/ActivityTimeline';
import { FeatureCardGrid } from '../features/dashboard/FeatureCardGrid';
import { RecentVisitList } from '../features/dashboard/RecentVisitList';
import { useDashboardQuery } from '../services/api/hooks';

export function DashboardPage() {
  const { data, isLoading, isError, refetch } = useDashboardQuery();

  if (isLoading) {
    return (
      <div className="page-grid">
        <section className="panel">
          <Skeleton height="24px" width="120px" />
          <Skeleton height="56px" />
          <Skeleton height="56px" />
        </section>
        <section className="panel">
          <Skeleton height="24px" width="120px" />
          <Skeleton height="200px" />
        </section>
      </div>
    );
  }

  if (isError || !data) {
    return <ErrorState onRetry={() => refetch()} />;
  }

  return (
    <div className="page-grid">
      <div className="left-column">
        <RecentVisitList visits={data.recentVisits} />
        <FeatureCardGrid modules={data.modules} />
      </div>
      <ActivityTimeline events={data.activities} title="今日活动" />
    </div>
  );
}

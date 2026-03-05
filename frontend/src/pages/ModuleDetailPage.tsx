import { moduleTitleMap } from '../app/navigation';
import { EmptyState } from '../components/EmptyState';
import { ErrorState } from '../components/ErrorState';
import { Skeleton } from '../components/Skeleton';
import { ReminderPanel } from '../features/dashboard/ReminderPanel';
import { ModuleKpiPanel } from '../features/modules/ModuleKpiPanel';
import { ModuleRunTable } from '../features/modules/ModuleRunTable';
import { useModuleDetailQuery } from '../services/api/hooks';
import type { ModuleId } from '../services/api/types';


interface ModuleDetailPageProps {
  moduleId: ModuleId;
}

export function ModuleDetailPage({ moduleId }: ModuleDetailPageProps) {
  const { data, isLoading, isError, refetch } = useModuleDetailQuery(moduleId);

  if (isLoading) {
    return (
      <section className="panel">
        <Skeleton height="30px" width="220px" />
        <Skeleton height="18px" />
        <Skeleton height="120px" />
      </section>
    );
  }

  if (isError || !data) {
    return <ErrorState onRetry={() => refetch()} />;
  }

  return (
    <div className="module-page">
      <section className="panel">
        <header className="panel-header">
          <h2>{moduleTitleMap[moduleId]}</h2>
        </header>
        <p className="module-description">{data.description}</p>
        <div className="capability-list">
          {data.capabilities.length === 0 ? (
            <EmptyState title="暂无能力项" message="当前模块尚未配置能力标签。" />
          ) : (
            data.capabilities.map((capability) => (
              <span className="capability-pill" key={capability}>
                {capability}
              </span>
            ))
          )}
        </div>
      </section>

      <ModuleKpiPanel metrics={data.metrics} />
      <ModuleRunTable runs={data.recentRuns} />

      {/* Phase 1: local timer reminders — shown only for Deadline Engine */}
      {moduleId === 'deadline-engine' && <ReminderPanel />}
    </div>
  );

}

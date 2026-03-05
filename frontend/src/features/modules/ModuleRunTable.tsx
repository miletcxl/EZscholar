import type { ModuleRunDTO } from '../../services/api/types';
import { formatDateTime } from '../../app/format';

interface ModuleRunTableProps {
  runs: ModuleRunDTO[];
}

export function ModuleRunTable({ runs }: ModuleRunTableProps) {
  return (
    <section className="panel">
      <header className="panel-header">
        <h2>最近执行</h2>
      </header>
      <table className="run-table">
        <thead>
          <tr>
            <th>任务</th>
            <th>状态</th>
            <th>开始时间</th>
          </tr>
        </thead>
        <tbody>
          {runs.map((run) => (
            <tr key={run.id}>
              <td>{run.name}</td>
              <td>{run.state}</td>
              <td>{formatDateTime(run.startedAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

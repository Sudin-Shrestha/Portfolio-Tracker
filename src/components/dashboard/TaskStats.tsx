import { memo, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { subscribeAllTasks } from '../../firebase/tasksService';
import { Task } from '../../types/tasks';

interface TaskStatsData {
  total: number;
  completed: number;
  pending: number;
  overdue: number;
  completedThisWeek: number;
  productivity: number;
}

const TaskStatsInner = () => {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);

  useEffect(() => {
    if (!user) return;
    const unsub = subscribeAllTasks(
      user.uid,
      (data) => setTasks(data),
      () => {},
    );
    return unsub;
  }, [user]);

  const stats = useMemo((): TaskStatsData => {
    const now = Date.now();
    const weekAgo = now - 7 * 86400000;

    const total = tasks.length;
    const overdue = tasks.filter(
      (t) => t.dueDate && t.dueDate < now,
    ).length;
    const completedThisWeek = tasks.filter(
      (t) => t.updatedAt >= weekAgo && !t.isArchived,
    ).length;

    const productivity =
      total > 0
        ? Math.round(((total - overdue) / total) * 100)
        : 0;

    return {
      total,
      completed: 0,
      pending: total,
      overdue,
      completedThisWeek,
      productivity,
    };
  }, [tasks]);

  if (tasks.length === 0) return null;

  return (
    <div className="dashboard-widget">
      <div className="widget-header">
        <h3>Task Productivity</h3>
      </div>
      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
        <div className="card metric">
          <span className="metric-label">Total Tasks</span>
          <span className="metric-value">{stats.total}</span>
        </div>
        <div className="card metric">
          <span className="metric-label">This Week</span>
          <span className="metric-value">{stats.completedThisWeek}</span>
          <span className="metric-change muted small">updated this week</span>
        </div>
        <div className="card metric metric--negative">
          <span className="metric-label">Overdue</span>
          <span className="metric-value">{stats.overdue}</span>
        </div>
        <div
          className={`card metric ${stats.productivity >= 70 ? 'metric--positive' : 'metric--negative'}`}
        >
          <span className="metric-label">On Track</span>
          <span className="metric-value">{stats.productivity}%</span>
        </div>
      </div>
    </div>
  );
};

export const TaskStats = memo(TaskStatsInner);

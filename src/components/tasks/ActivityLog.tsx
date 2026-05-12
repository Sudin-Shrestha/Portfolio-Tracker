import { memo, useEffect } from 'react';
import { useBoardStore } from '../../store/boardStore';

interface ActivityLogProps {
  boardId: string;
}

const ActivityLogInner = ({ boardId }: ActivityLogProps) => {
  const { activityLogs, subscribeActivityLog } = useBoardStore();

  useEffect(() => {
    const unsub = subscribeActivityLog(boardId);
    return () => unsub();
  }, [boardId, subscribeActivityLog]);

  const formatDate = (ts: number) => {
    const d = new Date(ts);
    const now = Date.now();
    const diff = now - ts;
    if (diff < 60000) return 'just now';
    if (diff < 3600000) return `${Math.round(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.round(diff / 3600000)}h ago`;
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  const getActionText = (log: typeof activityLogs[number]) => {
    switch (log.action) {
      case 'task_created':
        return `Created task "${log.details.title}"`;
      case 'task_moved':
        return `Moved task to another column`;
      case 'task_updated':
        return `Updated task`;
      case 'task_archived':
        return `Archived task`;
      case 'task_restored':
        return `Restored task from archive`;
      case 'task_deleted':
        return `Deleted task`;
      case 'tasks_bulk_archived':
        return `Archived ${log.details.count} completed tasks`;
      case 'column_created':
        return `Added column "${log.details.name}"`;
      case 'column_renamed':
        return `Renamed column to "${log.details.name}"`;
      case 'column_deleted':
        return `Deleted a column`;
      case 'board_created':
        return `Created this board`;
      case 'board_renamed':
        return `Renamed board to "${log.details.name}"`;
      case 'comment_added':
        return `Added a comment`;
      default:
        return log.action.replace(/_/g, ' ');
    }
  };

  if (activityLogs.length === 0) {
    return (
      <div className="activity-log">
        <div className="task-section-header">
          <h4>Activity</h4>
        </div>
        <p className="muted small">No activity yet.</p>
      </div>
    );
  }

  return (
    <div className="activity-log">
      <div className="task-section-header">
        <h4>Activity</h4>
      </div>
      <div className="activity-log-list">
        {activityLogs.slice(0, 20).map((log) => (
          <div key={log.id} className="activity-log-item">
            <div className="activity-log-dot" />
            <div className="activity-log-content">
              <p className="activity-log-text">{getActionText(log)}</p>
              <span className="activity-log-time">{formatDate(log.createdAt)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export const ActivityLog = memo(ActivityLogInner);

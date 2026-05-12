import { memo, useMemo } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Task, PRIORITY_COLORS, LABEL_COLORS } from '../../types/tasks';

interface TaskCardProps {
  task: Task;
  onClick: (task: Task) => void;
}

const formatDate = (ts: number | null) => {
  if (!ts) return null;
  const d = new Date(ts);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

const isOverdue = (dueDate: number | null) => {
  if (!dueDate) return false;
  return dueDate < Date.now();
};

const TaskCardInner = ({ task, onClick }: TaskCardProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id, data: { type: 'task', task } });

  const style = useMemo(
    () => ({
      transform: CSS.Transform.toString(transform),
      transition,
      opacity: isDragging ? 0.4 : 1,
    }),
    [transform, transition, isDragging],
  );

  const overdue = useMemo(() => isOverdue(task.dueDate), [task.dueDate]);
  const hasDue = task.dueDate !== null;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="task-card"
      onClick={(e) => {
        e.stopPropagation();
        onClick(task);
      }}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter') onClick(task); }}
    >
      {task.labels.length > 0 && (
        <div className="task-card-labels">
          {task.labels.slice(0, 3).map((label) => (
            <span
              key={label}
              className="task-label-dot"
              style={{ background: LABEL_COLORS[label] ?? '#6366f1' }}
              title={label}
            />
          ))}
          {task.labels.length > 3 && (
            <span className="task-label-more">+{task.labels.length - 3}</span>
          )}
        </div>
      )}

      <div className="task-card-title">{task.title}</div>

      {task.description && (
        <div className="task-card-desc">{task.description}</div>
      )}

      <div className="task-card-footer">
        <span
          className="task-priority"
          style={{
            background: `${PRIORITY_COLORS[task.priority]}20`,
            color: PRIORITY_COLORS[task.priority],
          }}
        >
          {task.priority}
        </span>

        {hasDue && (
          <span className={`task-due ${overdue ? 'task-due--overdue' : ''}`}>
            {overdue ? '⚠ ' : ''}{formatDate(task.dueDate)}
          </span>
        )}
      </div>
    </div>
  );
};

export const TaskCard = memo(TaskCardInner);

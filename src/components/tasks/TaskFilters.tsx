import { memo, useCallback } from 'react';
import { Priority, PRIORITY_LABELS } from '../../types/tasks';

interface FilterState {
  search: string;
  priority: Priority | 'all';
  labels: string[];
  dueDate: 'all' | 'today' | 'week' | 'overdue' | 'none';
}

interface TaskFiltersProps {
  filters: FilterState;
  onChange: (filters: FilterState) => void;
  onAddTask: () => void;
  hasColumns: boolean;
}

const TaskFiltersInner = ({ filters, onChange, onAddTask, hasColumns }: TaskFiltersProps) => {
  const set = useCallback(
    (patch: Partial<FilterState>) => onChange({ ...filters, ...patch }),
    [filters, onChange],
  );

  return (
    <div className="task-filters">
      <div className="task-filters-search">
        <input
          type="search"
          placeholder="Search tasks..."
          value={filters.search}
          onChange={(e) => set({ search: e.target.value })}
        />
      </div>

      <div className="task-filters-group">
        <select
          value={filters.priority}
          onChange={(e) =>
            set({ priority: e.target.value as Priority | 'all' })
          }
        >
          <option value="all">All priorities</option>
          {(Object.entries(PRIORITY_LABELS) as [Priority, string][]).map(
            ([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ),
          )}
        </select>

        <select
          value={filters.dueDate}
          onChange={(e) =>
            set({ dueDate: e.target.value as FilterState['dueDate'] })
          }
        >
          <option value="all">All dates</option>
          <option value="today">Due today</option>
          <option value="week">Due this week</option>
          <option value="overdue">Overdue</option>
          <option value="none">No due date</option>
        </select>
      </div>

      {(filters.search || filters.priority !== 'all' || filters.dueDate !== 'all') && (
        <button
          type="button"
          className="button button--ghost"
          onClick={() =>
            onChange({
              search: '',
              priority: 'all',
              labels: [],
              dueDate: 'all',
            })
          }
        >
          Clear
        </button>
      )}

      {hasColumns && (
        <button type="button" className="button" onClick={onAddTask}>
          + New Task
        </button>
      )}
    </div>
  );
};

export const TaskFilters = memo(TaskFiltersInner);

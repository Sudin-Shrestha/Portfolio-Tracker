import { memo, useMemo, useState, useCallback } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Column, Task } from '../../types/tasks';
import { TaskCard } from './TaskCard';

interface KanbanColumnProps {
  column: Column;
  tasks: Task[];
  onTaskClick: (task: Task) => void;
  onRenameColumn: (columnId: string, name: string) => void;
  onDeleteColumn: (columnId: string) => void;
}

const KanbanColumnInner = ({
  column,
  tasks,
  onTaskClick,
  onRenameColumn,
  onDeleteColumn,
}: KanbanColumnProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(column.name);
  const [showMenu, setShowMenu] = useState(false);

  const { setNodeRef, isOver } = useDroppable({
    id: column.id,
    data: { type: 'column', column },
  });

  const taskIds = useMemo(() => tasks.map((t) => t.id), [tasks]);

  const handleRename = useCallback(() => {
    const trimmed = editName.trim();
    if (trimmed && trimmed !== column.name) {
      onRenameColumn(column.id, trimmed);
    } else {
      setEditName(column.name);
    }
    setIsEditing(false);
    setShowMenu(false);
  }, [editName, column.id, column.name, onRenameColumn]);

  const handleDelete = useCallback(() => {
    if (confirm(`Delete column "${column.name}" and all its tasks?`)) {
      onDeleteColumn(column.id);
    }
    setShowMenu(false);
  }, [column.id, column.name, onDeleteColumn]);

  return (
    <div className={`kanban-column ${isOver ? 'kanban-column--over' : ''}`}>
      <div className="kanban-column-header">
        {isEditing ? (
          <input
            type="text"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            onBlur={handleRename}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleRename();
              if (e.key === 'Escape') {
                setEditName(column.name);
                setIsEditing(false);
              }
            }}
            className="kanban-column-title-input"
            autoFocus
          />
        ) : (
          <>
            <div className="kanban-column-title-wrap">
              <h3
                className="kanban-column-title"
                onDoubleClick={() => {
                  setEditName(column.name);
                  setIsEditing(true);
                }}
              >
                {column.name}
              </h3>
              <span className="kanban-column-count">{tasks.length}</span>
            </div>
            <div className="kanban-column-menu-wrapper">
              <button
                type="button"
                className="kanban-column-menu-btn"
                onClick={() => setShowMenu((v) => !v)}
                aria-label="Column menu"
              >
                ⋯
              </button>
              {showMenu && (
                <>
                  <div className="kanban-menu-overlay" onClick={() => setShowMenu(false)} />
                  <div className="kanban-column-menu">
                    <button
                      type="button"
                      className="kanban-menu-item"
                      onClick={() => {
                        setEditName(column.name);
                        setIsEditing(true);
                        setShowMenu(false);
                      }}
                    >
                      Rename
                    </button>
                    <button
                      type="button"
                      className="kanban-menu-item kanban-menu-item--danger"
                      onClick={handleDelete}
                    >
                      Delete
                    </button>
                  </div>
                </>
              )}
            </div>
          </>
        )}
      </div>

      <div
        ref={setNodeRef}
        className={`kanban-column-body ${tasks.length === 0 ? 'kanban-column-body--empty' : ''}`}
      >
        <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
          {tasks.map((task) => (
            <TaskCard key={task.id} task={task} onClick={onTaskClick} />
          ))}
        </SortableContext>

        {tasks.length === 0 && (
          <div className="kanban-column-placeholder">
            Drop tasks here
          </div>
        )}
      </div>
    </div>
  );
};

export const KanbanColumn = memo(KanbanColumnInner);

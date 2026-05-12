import { useCallback, useMemo, useRef, useEffect, useState } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  DragOverEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  horizontalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { useBoardStore } from '../../store/boardStore';
import { Column, Task, Priority } from '../../types/tasks';
import { KanbanColumn } from './KanbanColumn';
import { TaskCard } from './TaskCard';
import { TaskDetailModal } from './TaskDetailModal';
import { TaskFilters } from './TaskFilters';
import { useAuth } from '../../hooks/useAuth';

interface ActiveDrag {
  type: 'column' | 'task';
  id: string;
  data: Column | Task;
}

export const KanbanBoard = ({ boardId }: { boardId: string }) => {
  const { user } = useAuth();
  const {
    columns,
    tasks,
    createColumn,
    updateColumn,
    deleteColumn,
    reorderColumns,
    moveTask,
    reorderTasks,
    createTask,
  } = useBoardStore();

  const [activeDrag, setActiveDrag] = useState<ActiveDrag | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [filters, setFilters] = useState({
    search: '',
    priority: 'all' as Priority | 'all',
    labels: [] as string[],
    dueDate: 'all' as 'all' | 'today' | 'week' | 'overdue' | 'none',
  });
  const [showAddColumn, setShowAddColumn] = useState(false);
  const [newColumnName, setNewColumnName] = useState('');

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 8 } }),
    useSensor(KeyboardSensor),
  );

  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      if (filters.search) {
        const q = filters.search.toLowerCase();
        if (
          !t.title.toLowerCase().includes(q) &&
          !t.description.toLowerCase().includes(q)
        )
          return false;
      }
      if (filters.priority !== 'all' && t.priority !== filters.priority) return false;
      if (filters.labels.length > 0) {
        if (!filters.labels.some((l) => t.labels.includes(l))) return false;
      }
      if (filters.dueDate === 'overdue') {
        if (!t.dueDate || t.dueDate > Date.now()) return false;
      } else if (filters.dueDate === 'today') {
        const today = new Date();
        const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
        const todayEnd = todayStart + 86400000;
        if (!t.dueDate || t.dueDate < todayStart || t.dueDate > todayEnd) return false;
      } else if (filters.dueDate === 'week') {
        const weekEnd = Date.now() + 7 * 86400000;
        if (!t.dueDate || t.dueDate > weekEnd) return false;
      } else if (filters.dueDate === 'none') {
        if (t.dueDate !== null) return false;
      }
      return true;
    });
  }, [tasks, filters]);

  const tasksByColumn = useMemo(() => {
    const map: Record<string, Task[]> = {};
    columns.forEach((col) => {
      map[col.id] = filteredTasks
        .filter((t) => t.columnId === col.id)
        .sort((a, b) => a.order - b.order);
    });
    return map;
  }, [columns, filteredTasks]);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const { active } = event;
    const data = active.data.current;
    setActiveDrag({
      type: data?.type ?? 'task',
      id: active.id as string,
      data: data?.task ?? data?.column,
    });
  }, []);

  const handleDragOver = useCallback(
    (event: DragOverEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const activeData = active.data.current;
      const overData = over.data.current;
      if (!activeData || activeData.type !== 'task') return;
      if (overData?.type !== 'column' && activeData.type !== 'task') return;

      const activeColId = tasks.find((t) => t.id === String(active.id))?.columnId;
      const overColId = overData?.type === 'column' ? String(over.id) : tasks.find((t) => t.id === String(over.id))?.columnId;

      if (activeColId && overColId && activeColId !== overColId && user) {
        const overTasks = tasksByColumn[overColId] ?? [];
        const overIdx = overTasks.length;

        moveTask(
          String(active.id),
          activeColId,
          overColId,
          Math.min(overIdx, overTasks.length),
          boardId,
          user.uid,
        );
      }
    },
    [tasks, tasksByColumn, moveTask, boardId, user],
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      setActiveDrag(null);

      if (!over || active.id === over.id) return;

      const activeData = active.data.current;
      const overData = over.data.current;

      if (activeData?.type === 'task' && overData?.type === 'task' && user) {
        const activeColId = tasks.find((t) => t.id === String(active.id))?.columnId;
        const overColId = tasks.find((t) => t.id === String(over.id))?.columnId;

        if (activeColId && overColId && activeColId === overColId) {
          const colTasks = tasksByColumn[activeColId] ?? [];
          const oldIdx = colTasks.findIndex((t) => t.id === String(active.id));
          const newIdx = colTasks.findIndex((t) => t.id === String(over.id));
          if (oldIdx !== -1 && newIdx !== -1) {
            const reordered = arrayMove(colTasks, oldIdx, newIdx);
            reorderTasks(
              boardId,
              activeColId,
              reordered.map((t) => t.id),
              user.uid,
            );
          }
        } else if (activeColId && overColId && activeColId !== overColId) {
          const overTasks = tasksByColumn[overColId] ?? [];
          const overIdx = overTasks.findIndex((t) => t.id === String(over.id));
          const newOrder = Math.min(overIdx, overTasks.length);
          moveTask(
            String(active.id),
            activeColId,
            overColId,
            newOrder,
            boardId,
            user.uid,
          );
        }
      }

      if (activeData?.type === 'column' && overData?.type === 'column' && user) {
        const oldIdx = columns.findIndex((c) => c.id === String(active.id));
        const newIdx = columns.findIndex((c) => c.id === String(over.id));
        if (oldIdx !== -1 && newIdx !== -1) {
          const reordered = arrayMove(columns, oldIdx, newIdx);
          reorderColumns(
            boardId,
            reordered.map((c) => c.id),
            user.uid,
          );
        }
      }
    },
    [tasks, tasksByColumn, columns, reorderTasks, reorderColumns, moveTask, boardId, user],
  );

  const handleAddColumn = useCallback(() => {
    const name = newColumnName.trim();
    if (!name || !user) return;
    createColumn(boardId, name, user.uid);
    setNewColumnName('');
    setShowAddColumn(false);
  }, [newColumnName, createColumn, boardId, user]);

  return (
    <div className="kanban-wrapper">
      <TaskFilters
        filters={filters}
        onChange={setFilters}
        onAddTask={() =>
          setSelectedTask({
            id: 'new',
            boardId,
            columnId: columns[0]?.id ?? '',
            title: '',
            description: '',
            priority: 'medium',
            dueDate: null,
            labels: [],
            assignee: null,
            createdBy: user?.uid ?? '',
            createdAt: Date.now(),
            updatedAt: Date.now(),
            order: 0,
            isArchived: false,
          } as Task)
        }
        hasColumns={columns.length > 0}
      />

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="kanban-board">
          <SortableContext
            items={columns.map((c) => c.id)}
            strategy={horizontalListSortingStrategy}
          >
            {columns.map((column) => (
              <KanbanColumn
                key={column.id}
                column={column}
                tasks={tasksByColumn[column.id] ?? []}
                onTaskClick={(task) => setSelectedTask(task)}
                onRenameColumn={(colId, name) => {
                  if (user) updateColumn(boardId, colId, { name }, user.uid);
                }}
                onDeleteColumn={(colId) => {
                  if (user) deleteColumn(boardId, colId, user.uid);
                }}
              />
            ))}
          </SortableContext>

          <div className="kanban-column kanban-column--add">
            {showAddColumn ? (
              <div className="kanban-add-column-form">
                <input
                  type="text"
                  placeholder="Column name..."
                  value={newColumnName}
                  onChange={(e) => setNewColumnName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleAddColumn();
                    if (e.key === 'Escape') {
                      setShowAddColumn(false);
                      setNewColumnName('');
                    }
                  }}
                  autoFocus
                />
                <div className="kanban-add-column-actions">
                  <button type="button" className="button" onClick={handleAddColumn}>
                    Add
                  </button>
                  <button
                    type="button"
                    className="button button--ghost"
                    onClick={() => {
                      setShowAddColumn(false);
                      setNewColumnName('');
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                className="kanban-add-column-btn"
                onClick={() => setShowAddColumn(true)}
              >
                + Add Column
              </button>
            )}
          </div>
        </div>

        <DragOverlay>
          {activeDrag?.type === 'task' && activeDrag.data && (
            <div className="task-card task-card--dragging">
              <div className="task-card-title">
                {(activeDrag.data as Task).title}
              </div>
            </div>
          )}
          {activeDrag?.type === 'column' && activeDrag.data && (
            <div className="kanban-column kanban-column--dragging">
              <div className="kanban-column-header">
                <h3 className="kanban-column-title">
                  {(activeDrag.data as Column).name}
                </h3>
              </div>
            </div>
          )}
        </DragOverlay>
      </DndContext>

      {selectedTask && (
        <TaskDetailModal
          task={selectedTask}
          boardId={boardId}
          columns={columns}
          onClose={() => setSelectedTask(null)}
        />
      )}
    </div>
  );
};

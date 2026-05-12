import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Task, Column, Priority, PRIORITY_COLORS, PRIORITY_LABELS, LABEL_COLORS } from '../../types/tasks';
import { useBoardStore } from '../../store/boardStore';
import { useAuth } from '../../hooks/useAuth';
import { Checklist } from './Checklist';
import { CommentSection } from './CommentSection';

const ALL_LABELS = Object.keys(LABEL_COLORS);

interface TaskDetailModalProps {
  task: Task;
  boardId: string;
  columns: Column[];
  onClose: () => void;
}

const TaskDetailModalInner = ({ task, boardId, columns, onClose }: TaskDetailModalProps) => {
  const { user } = useAuth();
  const {
    createTask,
    updateTask,
    deleteTask,
    archiveTask,
    subscribeComments,
    subscribeChecklist,
  } = useBoardStore();

  const isNew = task.id === 'new';
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description);
  const [priority, setPriority] = useState<Priority>(task.priority);
  const [dueDate, setDueDate] = useState(
    task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : '',
  );
  const [labels, setLabels] = useState<string[]>(task.labels);
  const [columnId, setColumnId] = useState(task.columnId);
  const [saving, setSaving] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleEsc);
    };
  }, [onClose]);

  useEffect(() => {
    if (!isNew && task.id) {
      const unsub1 = subscribeComments(task.id);
      const unsub2 = subscribeChecklist(task.id);
      return () => {
        unsub1();
        unsub2();
      };
    }
  }, [isNew, task.id, subscribeComments, subscribeChecklist]);

  const handleOverlayClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) onClose();
    },
    [onClose],
  );

  const handleSave = useCallback(async () => {
    if (!user || !title.trim()) return;
    setSaving(true);

    try {
      const dueTs = dueDate ? new Date(dueDate + 'T23:59:59').getTime() : null;

      if (isNew) {
        await createTask(boardId, columnId, {
          title: title.trim(),
          description,
          priority,
          dueDate: dueTs,
          labels,
        }, user.uid);
      } else {
        await updateTask(task.id, {
          title: title.trim(),
          description,
          priority,
          dueDate: dueTs,
          labels,
          columnId,
        }, boardId, user.uid);
      }
      onClose();
    } catch (err) {
      console.error('Failed to save task:', err);
      alert('Failed to save task. Please try again.');
    } finally {
      setSaving(false);
    }
  }, [user, title, description, priority, dueDate, labels, columnId, isNew, boardId, task.id, createTask, updateTask, onClose]);

  const handleArchive = useCallback(async () => {
    if (!user) return;
    await archiveTask(task.id, boardId, task.columnId, user.uid);
    onClose();
  }, [task.id, boardId, task.columnId, user, archiveTask, onClose]);

  const handleDelete = useCallback(async () => {
    if (!user || !confirm('Delete this task permanently?')) return;
    await deleteTask(task.id, boardId, task.columnId, user.uid);
    onClose();
  }, [task.id, boardId, task.columnId, user, deleteTask, onClose]);

  const toggleLabel = useCallback((label: string) => {
    setLabels((prev) =>
      prev.includes(label) ? prev.filter((l) => l !== label) : [...prev, label],
    );
  }, []);

  const formatDate = useCallback((ts: number) => {
    if (!ts) return '—';
    return new Date(ts).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }, []);

  return (
    <div className="modal-overlay" onClick={handleOverlayClick} role="dialog" aria-modal="true">
      <div className="modal task-modal" ref={modalRef}>
        <div className="modal-header">
          <h2>{isNew ? 'Create Task' : 'Task Details'}</h2>
          <div className="modal-header-actions">
            {!isNew && (
              <>
                <button type="button" className="button button--ghost" onClick={handleArchive}>
                  Archive
                </button>
                <button type="button" className="button button--ghost" onClick={handleDelete}>
                  Delete
                </button>
              </>
            )}
            <button type="button" className="modal-close" onClick={onClose}>
              ×
            </button>
          </div>
        </div>

        <div className="task-modal-body">
          <div className="task-modal-main">
            <div className="task-field">
              <label>Title *</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="What needs to be done?"
                autoFocus
              />
            </div>

            <div className="task-field">
              <label>Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Add details, links, notes..."
                rows={4}
              />
            </div>

            <div className="task-field">
              <label>Column</label>
              <select value={columnId} onChange={(e) => setColumnId(e.target.value)}>
                {columns.map((col) => (
                  <option key={col.id} value={col.id}>
                    {col.name}
                  </option>
                ))}
              </select>
            </div>

            {!isNew && (
              <>
                <CommentSection taskId={task.id} />
                <Checklist taskId={task.id} />
              </>
            )}
          </div>

          <div className="task-modal-sidebar">
            <div className="task-field">
              <label>Priority</label>
              <div className="task-priority-options">
                {(Object.entries(PRIORITY_LABELS) as [Priority, string][]).map(
                  ([key, label]) => (
                    <button
                      key={key}
                      type="button"
                      className={`task-priority-option ${priority === key ? 'is-active' : ''}`}
                      style={{
                        borderColor: priority === key ? PRIORITY_COLORS[key] : undefined,
                        background:
                          priority === key ? `${PRIORITY_COLORS[key]}15` : undefined,
                      }}
                      onClick={() => setPriority(key)}
                    >
                      {label}
                    </button>
                  ),
                )}
              </div>
            </div>

            <div className="task-field">
              <label>Due Date</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
              />
            </div>

            <div className="task-field">
              <label>Labels</label>
              <div className="task-labels-grid">
                {ALL_LABELS.map((label) => (
                  <button
                    key={label}
                    type="button"
                    className={`task-label-btn ${labels.includes(label) ? 'is-active' : ''}`}
                    style={{
                      borderColor: LABEL_COLORS[label],
                      background: labels.includes(label)
                        ? `${LABEL_COLORS[label]}20`
                        : undefined,
                    }}
                    onClick={() => toggleLabel(label)}
                  >
                    <span
                      className="task-label-indicator"
                      style={{ background: LABEL_COLORS[label] }}
                    />
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {!isNew && (
              <div className="task-meta">
                <div className="task-meta-item">
                  <span className="task-meta-label">Created</span>
                  <span className="task-meta-value">
                    {formatDate(task.createdAt)}
                  </span>
                </div>
                <div className="task-meta-item">
                  <span className="task-meta-label">Updated</span>
                  <span className="task-meta-value">
                    {formatDate(task.updatedAt)}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="modal-footer">
          <button type="button" className="button button--ghost" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="button"
            onClick={handleSave}
            disabled={!title.trim() || saving}
          >
            {saving ? 'Saving...' : isNew ? 'Create Task' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
};

export const TaskDetailModal = memo(TaskDetailModalInner);

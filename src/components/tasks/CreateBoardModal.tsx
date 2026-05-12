import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { useBoardStore } from '../../store/boardStore';
import { useAuth } from '../../hooks/useAuth';
import { DEFAULT_COLUMNS } from '../../types/tasks';

interface CreateBoardModalProps {
  onClose: () => void;
}

const CreateBoardModalInner = ({ onClose }: CreateBoardModalProps) => {
  const { user } = useAuth();
  const { createBoard } = useBoardStore();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [columns, setColumns] = useState<string[]>([...DEFAULT_COLUMNS]);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  const handleColumnChange = useCallback((idx: number, value: string) => {
    setColumns((prev) => {
      const next = [...prev];
      next[idx] = value;
      return next;
    });
  }, []);

  const handleAddColumn = useCallback(() => {
    setColumns((prev) => [...prev, '']);
  }, []);

  const handleRemoveColumn = useCallback((idx: number) => {
    setColumns((prev) => prev.filter((_, i) => i !== idx));
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!user || !name.trim()) return;
    setSaving(true);
    try {
      const validColumns = columns.map((c) => c.trim()).filter(Boolean);
      await createBoard(
        user.uid,
        name.trim(),
        description.trim(),
        validColumns.length > 0 ? validColumns : DEFAULT_COLUMNS,
      );
      onClose();
    } catch (err) {
      console.error('Failed to create board:', err);
    } finally {
      setSaving(false);
    }
  }, [user, name, description, columns, createBoard, onClose]);

  const handleOverlayClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) onClose();
    },
    [onClose],
  );

  return (
    <div className="modal-overlay" onClick={handleOverlayClick} role="dialog" aria-modal="true">
      <div className="modal create-board-modal">
        <div className="modal-header">
          <h2>Create Board</h2>
          <button type="button" className="modal-close" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="modal-body">
          <div className="task-field">
            <label>Board Name *</label>
            <input
              ref={inputRef}
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Sprint 24, Roadmap, Bugs..."
            />
          </div>

          <div className="task-field">
            <label>Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What is this board for?"
              rows={2}
            />
          </div>

          <div className="task-field">
            <label>Columns</label>
            <p className="muted small" style={{ marginBottom: 8 }}>
              Customize your board columns. At least one column is required.
            </p>
            {columns.map((col, idx) => (
              <div key={idx} className="create-board-column-row">
                <input
                  type="text"
                  value={col}
                  onChange={(e) => handleColumnChange(idx, e.target.value)}
                  placeholder={`Column ${idx + 1}`}
                />
                <button
                  type="button"
                  className="icon-button danger"
                  onClick={() => handleRemoveColumn(idx)}
                  disabled={columns.length <= 1}
                  aria-label="Remove column"
                >
                  ×
                </button>
              </div>
            ))}
            <button
              type="button"
              className="button button--ghost"
              style={{ marginTop: 8 }}
              onClick={handleAddColumn}
            >
              + Add column
            </button>
          </div>
        </div>

        <div className="modal-footer">
          <button type="button" className="button button--ghost" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="button"
            onClick={handleSubmit}
            disabled={!name.trim() || saving}
          >
            {saving ? 'Creating...' : 'Create Board'}
          </button>
        </div>
      </div>
    </div>
  );
};

export const CreateBoardModal = memo(CreateBoardModalInner);

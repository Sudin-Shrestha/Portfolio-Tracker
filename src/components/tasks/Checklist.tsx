import { memo, useCallback, useEffect, useState } from 'react';
import { useBoardStore } from '../../store/boardStore';
import { ChecklistItem } from '../../types/tasks';

interface ChecklistProps {
  taskId: string;
}

const ChecklistInner = ({ taskId }: ChecklistProps) => {
  const { checklist, addChecklistItem, updateChecklistItem, deleteChecklistItem } =
    useBoardStore();
  const [newItem, setNewItem] = useState('');

  const items = checklist[taskId] ?? [];

  const handleAdd = useCallback(() => {
    const text = newItem.trim();
    if (!text) return;
    addChecklistItem(taskId, text);
    setNewItem('');
  }, [newItem, taskId, addChecklistItem]);

  const completed = items.filter((i) => i.isChecked).length;
  const total = items.length;

  return (
    <div className="task-checklist">
      <div className="task-section-header">
        <h4>Checklist</h4>
        {total > 0 && (
          <span className="task-checklist-progress">
            {completed}/{total}
          </span>
        )}
      </div>

      {total > 0 && (
        <div className="task-checklist-bar">
          <div
            className="task-checklist-bar-fill"
            style={{ width: `${total > 0 ? (completed / total) * 100 : 0}%` }}
          />
        </div>
      )}

      <div className="task-checklist-items">
        {items
          .sort((a, b) => a.order - b.order)
          .map((item) => (
            <ChecklistRow
              key={item.id}
              item={item}
              onToggle={(checked) =>
                updateChecklistItem(taskId, item.id, {
                  isChecked: checked,
                })
              }
              onDelete={() => deleteChecklistItem(taskId, item.id)}
            />
          ))}
      </div>

      <div className="task-checklist-add">
        <input
          type="text"
          placeholder="Add checklist item..."
          value={newItem}
          onChange={(e) => setNewItem(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleAdd();
          }}
        />
        <button
          type="button"
          className="button button--ghost"
          onClick={handleAdd}
          disabled={!newItem.trim()}
        >
          Add
        </button>
      </div>
    </div>
  );
};

interface ChecklistRowProps {
  item: ChecklistItem;
  onToggle: (checked: boolean) => void;
  onDelete: () => void;
}

const ChecklistRow = memo(({ item, onToggle, onDelete }: ChecklistRowProps) => (
  <div className={`task-checklist-row ${item.isChecked ? 'is-done' : ''}`}>
    <label className="task-checklist-label">
      <input
        type="checkbox"
        checked={item.isChecked}
        onChange={(e) => onToggle(e.target.checked)}
      />
      <span>{item.text}</span>
    </label>
    <button
      type="button"
      className="icon-button danger"
      onClick={onDelete}
      aria-label="Delete checklist item"
    >
      ×
    </button>
  </div>
));

export const Checklist = memo(ChecklistInner);

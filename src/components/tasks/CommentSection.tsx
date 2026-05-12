import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { useBoardStore } from '../../store/boardStore';
import { useAuth } from '../../hooks/useAuth';

interface CommentSectionProps {
  taskId: string;
}

const CommentSectionInner = ({ taskId }: CommentSectionProps) => {
  const { user } = useAuth();
  const { comments, addComment, deleteComment } = useBoardStore();
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  const items = comments[taskId] ?? [];

  const handleSubmit = useCallback(async () => {
    const trimmed = text.trim();
    if (!trimmed || !user) return;
    setSending(true);
    try {
      await addComment(taskId, trimmed, user.uid, '');
      setText('');
    } catch (err) {
      console.error('Failed to add comment:', err);
    } finally {
      setSending(false);
    }
  }, [text, user, taskId, addComment]);

  const formatDate = (ts: number) => {
    const d = new Date(ts);
    const now = Date.now();
    const diff = now - ts;
    if (diff < 60000) return 'just now';
    if (diff < 3600000) return `${Math.round(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.round(diff / 3600000)}h ago`;
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  return (
    <div className="task-comments">
      <div className="task-section-header">
        <h4>Comments ({items.length})</h4>
      </div>

      <div className="task-comments-list">
        {items.length === 0 && (
          <p className="muted small">No comments yet.</p>
        )}
        {items.map((c) => (
          <div key={c.id} className="task-comment">
            <div className="task-comment-body">
              <p>{c.text}</p>
            </div>
            <div className="task-comment-footer">
              <span className="muted small">{formatDate(c.createdAt)}</span>
              {c.userId === user?.uid && (
                <button
                  type="button"
                  className="task-comment-delete"
                  onClick={() => deleteComment(c.id)}
                >
                  Delete
                </button>
              )}
            </div>
          </div>
        ))}
        <div ref={endRef} />
      </div>

      <div className="task-comment-form">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Write a comment..."
          rows={2}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              handleSubmit();
            }
          }}
        />
        <button
          type="button"
          className="button"
          onClick={handleSubmit}
          disabled={!text.trim() || sending}
        >
          {sending ? 'Sending...' : 'Comment'}
        </button>
      </div>
    </div>
  );
};

export const CommentSection = memo(CommentSectionInner);

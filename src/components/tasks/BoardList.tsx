import { memo, useCallback, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Board } from '../../types/tasks';
import { useBoardStore } from '../../store/boardStore';
import { useAuth } from '../../hooks/useAuth';
import { CreateBoardModal } from './CreateBoardModal';

interface BoardListProps {
  boards: Board[];
  loading: boolean;
  error: string | null;
}

const BoardCard = memo(({ board }: { board: Board }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { updateBoard, deleteBoard } = useBoardStore();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleToggleFavorite = useCallback(() => {
    if (user) updateBoard(board.id, { isFavorite: !board.isFavorite }, user.uid);
    setMenuOpen(false);
  }, [board.id, board.isFavorite, user, updateBoard]);

  const handleDelete = useCallback(() => {
    if (!user) return;
    if (confirm(`Delete board "${board.name}" and all its data?`)) {
      deleteBoard(board.id, user.uid);
    }
    setMenuOpen(false);
  }, [board.id, board.name, user, deleteBoard]);

  const formatDate = (ts: number) => {
    if (!ts) return '';
    return new Date(ts).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div
      className="board-card"
      onClick={() => navigate(`/tasks/${board.id}`)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter') navigate(`/tasks/${board.id}`);
      }}
    >
      <div className="board-card-top">
        <div className="board-card-icon">
          {board.isFavorite ? '★' : '📋'}
        </div>
        <div className="board-card-menu-wrapper">
          <button
            type="button"
            className="board-card-menu-btn"
            onClick={(e) => {
              e.stopPropagation();
              setMenuOpen((v) => !v);
            }}
            aria-label="Board menu"
          >
            ⋯
          </button>
          {menuOpen && (
            <>
              <div className="kanban-menu-overlay" onClick={() => setMenuOpen(false)} />
              <div className="board-card-menu" onClick={(e) => e.stopPropagation()}>
                <button
                  type="button"
                  className="kanban-menu-item"
                  onClick={handleToggleFavorite}
                >
                  {board.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                </button>
                <button
                  type="button"
                  className="kanban-menu-item kanban-menu-item--danger"
                  onClick={handleDelete}
                >
                  Delete board
                </button>
              </div>
            </>
          )}
        </div>
      </div>
      <h3 className="board-card-title">{board.name}</h3>
      {board.description && (
        <p className="board-card-desc">{board.description}</p>
      )}
      <div className="board-card-footer">
        <span className="muted small">
          Updated {formatDate(board.updatedAt)}
        </span>
      </div>
    </div>
  );
});

export const BoardList = memo(({ boards, loading, error }: BoardListProps) => {
  const [showCreate, setShowCreate] = useState(false);
  const [filter, setFilter] = useState<'all' | 'favorites'>('all');

  const filtered = useMemo(
    () =>
      filter === 'favorites'
        ? boards.filter((b) => b.isFavorite)
        : boards,
    [boards, filter],
  );

  return (
    <div className="board-list-page">
      <div className="board-list-header">
        <div>
          <h2 className="title">Task Boards</h2>
          <p className="subtitle">
            {boards.length} board{boards.length !== 1 ? 's' : ''} ·{' '}
            {filter === 'favorites'
              ? `${filtered.length} favorites`
              : 'Manage your projects'}
          </p>
        </div>
        <div className="board-list-actions">
          <div className="tabs" role="tablist">
            <button
              type="button"
              role="tab"
              className={`tab ${filter === 'all' ? 'tab--active' : ''}`}
              onClick={() => setFilter('all')}
            >
              All
            </button>
            <button
              type="button"
              role="tab"
              className={`tab ${filter === 'favorites' ? 'tab--active' : ''}`}
              onClick={() => setFilter('favorites')}
            >
              Favorites
            </button>
          </div>
          <button
            type="button"
            className="button"
            onClick={() => setShowCreate(true)}
          >
            + New Board
          </button>
        </div>
      </div>

      {error && (
        <div className="banner banner--error" role="alert">
          <span>Sync issue: {error}. Boards will appear once created.</span>
        </div>
      )}

      {loading ? (
        <div className="empty-state">
          <p className="muted">Loading boards...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <h3>No boards yet</h3>
          <p className="muted">
            {boards.length === 0
              ? 'Create your first board to start tracking tasks.'
              : 'No favorite boards. Click the star on a board to add it.'}
          </p>
          {boards.length === 0 && (
            <button
              type="button"
              className="button"
              style={{ marginTop: 16 }}
              onClick={() => setShowCreate(true)}
            >
              Create Board
            </button>
          )}
        </div>
      ) : (
        <div className="board-grid">
          {filtered.map((board) => (
            <BoardCard key={board.id} board={board} />
          ))}
        </div>
      )}

      {showCreate && <CreateBoardModal onClose={() => setShowCreate(false)} />}
    </div>
  );
});

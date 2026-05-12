import { useEffect, useMemo, useRef, useState } from 'react';
import { Routes, Route, useParams, useNavigate } from 'react-router-dom';
import { useBoardStore } from '../../store/boardStore';
import { useAuth } from '../../hooks/useAuth';
import { BoardList } from './BoardList';
import { KanbanBoard } from './KanbanBoard';
import { ActivityLog } from './ActivityLog';
import { archiveCompletedTasks, subscribeArchivedTasks } from '../../firebase/tasksService';
import { Task } from '../../types/tasks';

const BoardView = () => {
  const { boardId } = useParams<{ boardId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const {
    currentBoard,
    boards,
    columns,
    setCurrentBoard,
    subscribeColumns,
    subscribeTasks,
    updateBoard,
  } = useBoardStore();
  const [archivedCount, setArchivedCount] = useState(0);
  const [showActivity, setShowActivity] = useState(false);

  useEffect(() => {
    if (!boardId) return;
    const board = boards.find((b) => b.id === boardId);
    if (board) setCurrentBoard(board);
    return () => setCurrentBoard(null);
  }, [boardId, boards, setCurrentBoard]);

  useEffect(() => {
    if (!boardId) return;
    const unsub1 = subscribeColumns(boardId);
    const unsub2 = subscribeTasks(boardId);
    return () => {
      unsub1();
      unsub2();
    };
  }, [boardId, subscribeColumns, subscribeTasks]);

  useEffect(() => {
    if (!boardId || !user) return;
    const unsub = subscribeArchivedTasks(boardId, (tasks) => {
      setArchivedCount(tasks.length);
    }, () => {});
    return unsub;
  }, [boardId, user]);

  const doneColumn = useMemo(
    () => columns.find((c) => c.name.toLowerCase() === 'done'),
    [columns],
  );

  if (!boardId || !currentBoard) {
    return (
      <div className="empty-state">
        <p className="muted">Loading board...</p>
      </div>
    );
  }

  return (
    <div className="board-page">
      <div className="board-page-header">
        <div className="board-page-header-left">
          <button
            type="button"
            className="button button--ghost"
            onClick={() => navigate('/tasks')}
          >
            ← Boards
          </button>
          <div>
            <h2 className="title">{currentBoard.name}</h2>
            {currentBoard.description && (
              <p className="subtitle">{currentBoard.description}</p>
            )}
          </div>
        </div>
        <div className="board-page-header-actions">
          {currentBoard && user && (
            <button
              type="button"
              className="button button--ghost"
              onClick={() =>
                updateBoard(
                  currentBoard.id,
                  { isFavorite: !currentBoard.isFavorite },
                  user.uid,
                )
              }
              title={currentBoard.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
            >
              {currentBoard.isFavorite ? '★' : '☆'}
            </button>
          )}
          <button
            type="button"
            className="button button--ghost"
            onClick={() => setShowActivity((v) => !v)}
          >
            {showActivity ? 'Board' : 'Activity'}
          </button>
          {doneColumn && user && (
            <button
              type="button"
              className="button button--ghost"
              onClick={async () => {
                if (
                  confirm(
                    'Archive all tasks in the "Done" column?',
                  )
                ) {
                  const count = await archiveCompletedTasks(
                    boardId,
                    doneColumn.id,
                    user.uid,
                  );
                  if (count > 0) {
                    alert(`Archived ${count} completed task${count === 1 ? '' : 's'}.`);
                  } else {
                    alert('No tasks to archive in the Done column.');
                  }
                }
              }}
            >
              Archive done
              {archivedCount > 0 ? ` (${archivedCount})` : ''}
            </button>
          )}
        </div>
      </div>

      {showActivity ? (
        <ActivityLog boardId={boardId} />
      ) : (
        <KanbanBoard boardId={boardId} />
      )}
    </div>
  );
};

export const TasksPage = () => {
  const { user } = useAuth();
  const { boards, subscribeBoards, loading, error } = useBoardStore();
  const unsubRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!user) return;
    unsubRef.current = subscribeBoards(user.uid);
    return () => {
      unsubRef.current?.();
    };
  }, [user, subscribeBoards]);

  return (
    <Routes>
      <Route index element={<BoardList boards={boards} loading={loading} error={error} />} />
      <Route path=":boardId" element={<BoardView />} />
    </Routes>
  );
};

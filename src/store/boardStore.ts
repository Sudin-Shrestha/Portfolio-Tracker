import { create } from 'zustand';
import { Board, Column, Task, Comment, ChecklistItem, ActivityLog, Priority, DEFAULT_COLUMNS } from '../types/tasks';
import * as TasksService from '../firebase/tasksService';

interface BoardState {
  boards: Board[];
  currentBoard: Board | null;
  columns: Column[];
  tasks: Task[];
  archivedTasks: Task[];
  comments: Record<string, Comment[]>;
  checklist: Record<string, ChecklistItem[]>;
  activityLogs: ActivityLog[];
  loading: boolean;
  error: string | null;

  setBoards: (boards: Board[]) => void;
  setCurrentBoard: (board: Board | null) => void;
  setColumns: (columns: Column[]) => void;
  setTasks: (tasks: Task[]) => void;
  setArchivedTasks: (tasks: Task[]) => void;
  setComments: (taskId: string, comments: Comment[]) => void;
  setChecklist: (taskId: string, items: ChecklistItem[]) => void;
  setActivityLogs: (logs: ActivityLog[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;

  subscribeBoards: (userId: string) => () => void;
  createBoard: (userId: string, name: string, description: string, columns?: string[]) => Promise<Board>;
  updateBoard: (boardId: string, data: Partial<Pick<Board, 'name' | 'description' | 'isFavorite' | 'columnOrder'>>, userId: string) => Promise<void>;
  deleteBoard: (boardId: string, userId: string) => Promise<void>;

  subscribeColumns: (boardId: string) => () => void;
  createColumn: (boardId: string, name: string, userId: string) => Promise<Column>;
  updateColumn: (boardId: string, columnId: string, data: Partial<Pick<Column, 'name' | 'order' | 'taskOrder'>>, userId: string) => Promise<void>;
  deleteColumn: (boardId: string, columnId: string, userId: string) => Promise<void>;
  reorderColumns: (boardId: string, columnOrder: string[], userId: string) => Promise<void>;

  subscribeTasks: (boardId: string) => () => void;
  subscribeArchivedTasks: (boardId: string) => () => void;
  subscribeAllTasks: (userId: string) => () => void;
  createTask: (boardId: string, columnId: string, data: { title: string; description?: string; priority?: Priority; dueDate?: number | null; labels?: string[] }, userId: string) => Promise<Task>;
  updateTask: (taskId: string, data: Partial<Omit<Task, 'id' | 'boardId' | 'createdBy' | 'createdAt'>>, boardId: string, userId: string) => Promise<void>;
  deleteTask: (taskId: string, boardId: string, columnId: string, userId: string) => Promise<void>;
  moveTask: (taskId: string, fromColumnId: string, toColumnId: string, newOrder: number, boardId: string, userId: string) => Promise<void>;
  reorderTasks: (boardId: string, columnId: string, taskOrder: string[], userId: string) => Promise<void>;
  archiveTask: (taskId: string, boardId: string, columnId: string, userId: string) => Promise<void>;
  restoreTask: (taskId: string, boardId: string, columnId: string, userId: string) => Promise<void>;
  archiveCompletedTasks: (boardId: string, doneColumnId: string, userId: string) => Promise<number>;

  subscribeComments: (taskId: string) => () => void;
  addComment: (taskId: string, text: string, userId: string, boardId: string) => Promise<Comment>;
  deleteComment: (commentId: string) => Promise<void>;

  subscribeChecklist: (taskId: string) => () => void;
  addChecklistItem: (taskId: string, text: string) => Promise<ChecklistItem>;
  updateChecklistItem: (taskId: string, itemId: string, data: Partial<Pick<ChecklistItem, 'text' | 'isChecked' | 'order'>>) => Promise<void>;
  deleteChecklistItem: (taskId: string, itemId: string) => Promise<void>;

  subscribeActivityLog: (boardId: string) => () => void;
}

export const useBoardStore = create<BoardState>((set, get) => ({
  boards: [],
  currentBoard: null,
  columns: [],
  tasks: [],
  archivedTasks: [],
  comments: {},
  checklist: {},
  activityLogs: [],
  loading: false,
  error: null,

  setBoards: (boards) => set({ boards }),
  setCurrentBoard: (board) => set({ currentBoard: board }),
  setColumns: (columns) => set({ columns }),
  setTasks: (tasks) => set({ tasks }),
  setArchivedTasks: (tasks) => set({ archivedTasks: tasks }),
  setComments: (taskId, comments) =>
    set((state) => ({ comments: { ...state.comments, [taskId]: comments } })),
  setChecklist: (taskId, items) =>
    set((state) => ({ checklist: { ...state.checklist, [taskId]: items } })),
  setActivityLogs: (logs) => set({ activityLogs: logs }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),

  subscribeBoards: (userId) => {
    const unsub = TasksService.subscribeBoards(
      userId,
      (boards) => set({ boards, error: null, loading: false }),
      (error) => set({ error: error.message, loading: false }),
    );
    set({ loading: true });
    return unsub;
  },

  createBoard: async (userId, name, description, columns) => {
    const board = await TasksService.createBoard(userId, name, description, columns ?? DEFAULT_COLUMNS);
    return board;
  },

  updateBoard: async (boardId, data, userId) => {
    await TasksService.updateBoard(boardId, data, userId);
    set((state) => ({
      boards: state.boards.map((b) =>
        b.id === boardId ? { ...b, ...data, updatedAt: Date.now() } : b,
      ),
      currentBoard:
        state.currentBoard?.id === boardId
          ? { ...state.currentBoard, ...data, updatedAt: Date.now() }
          : state.currentBoard,
    }));
  },

  deleteBoard: async (boardId, userId) => {
    await TasksService.deleteBoard(boardId, userId);
    set((state) => ({ boards: state.boards.filter((b) => b.id !== boardId) }));
  },

  subscribeColumns: (boardId) => {
    const unsub = TasksService.subscribeColumns(
      boardId,
      (columns) => set({ columns }),
      (error) => set({ error: error.message }),
    );
    return unsub;
  },

  createColumn: async (boardId, name, userId) => {
    const column = await TasksService.createColumn(boardId, name, userId);
    return column;
  },

  updateColumn: async (boardId, columnId, data, userId) => {
    await TasksService.updateColumn(boardId, columnId, data, userId);
  },

  deleteColumn: async (boardId, columnId, userId) => {
    await TasksService.deleteColumn(boardId, columnId, userId);
  },

  reorderColumns: async (boardId, columnOrder, userId) => {
    await TasksService.reorderColumns(boardId, columnOrder, userId);
  },

  subscribeTasks: (boardId) => {
    const unsub = TasksService.subscribeTasks(
      boardId,
      (tasks) => set({ tasks }),
      (error) => set({ error: error.message }),
    );
    return unsub;
  },

  subscribeArchivedTasks: (boardId) => {
    const unsub = TasksService.subscribeArchivedTasks(
      boardId,
      (tasks) => set({ archivedTasks: tasks }),
      (error) => set({ error: error.message }),
    );
    return unsub;
  },

  subscribeAllTasks: (userId) => {
    const unsub = TasksService.subscribeAllTasks(
      userId,
      (tasks) => set({ tasks }),
      (error) => set({ error: error.message }),
    );
    return unsub;
  },

  createTask: async (boardId, columnId, data, userId) => {
    return await TasksService.createTask(boardId, columnId, data, userId);
  },

  updateTask: async (taskId, data, boardId, userId) => {
    await TasksService.updateTask(taskId, data, boardId, userId);
  },

  deleteTask: async (taskId, boardId, columnId, userId) => {
    await TasksService.deleteTask(taskId, boardId, columnId, userId);
  },

  moveTask: async (taskId, fromColumnId, toColumnId, newOrder, boardId, userId) => {
    await TasksService.moveTask(taskId, fromColumnId, toColumnId, newOrder, boardId, userId);
  },

  reorderTasks: async (boardId, columnId, taskOrder, userId) => {
    await TasksService.reorderTasks(boardId, columnId, taskOrder, userId);
  },

  archiveTask: async (taskId, boardId, columnId, userId) => {
    await TasksService.archiveTask(taskId, boardId, columnId, userId);
  },

  restoreTask: async (taskId, boardId, columnId, userId) => {
    await TasksService.restoreTask(taskId, boardId, columnId, userId);
  },

  archiveCompletedTasks: async (boardId, doneColumnId, userId) => {
    return await TasksService.archiveCompletedTasks(boardId, doneColumnId, userId);
  },

  subscribeComments: (taskId) => {
    const unsub = TasksService.subscribeComments(
      taskId,
      (comments) => get().setComments(taskId, comments),
      (error) => set({ error: error.message }),
    );
    return unsub;
  },

  addComment: async (taskId, text, userId, boardId) => {
    return await TasksService.addComment(taskId, text, userId, boardId);
  },

  deleteComment: async (commentId) => {
    await TasksService.deleteComment(commentId);
  },

  subscribeChecklist: (taskId) => {
    const unsub = TasksService.subscribeChecklist(
      taskId,
      (items) => get().setChecklist(taskId, items),
      (error) => set({ error: error.message }),
    );
    return unsub;
  },

  addChecklistItem: async (taskId, text) => {
    return await TasksService.addChecklistItem(taskId, text);
  },

  updateChecklistItem: async (taskId, itemId, data) => {
    await TasksService.updateChecklistItem(taskId, itemId, data);
  },

  deleteChecklistItem: async (taskId, itemId) => {
    await TasksService.deleteChecklistItem(taskId, itemId);
  },

  subscribeActivityLog: (boardId) => {
    const unsub = TasksService.subscribeActivityLog(
      boardId,
      (logs) => set({ activityLogs: logs }),
      (error) => set({ error: error.message }),
    );
    return unsub;
  },
}));

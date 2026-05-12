import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  Timestamp,
  Unsubscribe,
  addDoc,
  increment,
  writeBatch,
  serverTimestamp,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage } from '../firebase';
import { Board, Column, Task, ChecklistItem, Comment, ActivityLog, Attachment, Priority } from '../types/tasks';

const getBoardRef = (boardId: string) => doc(db, 'boards', boardId);
const getColumnRef = (boardId: string, columnId: string) =>
  doc(db, 'boards', boardId, 'columns', columnId);
const getColumnsCollRef = (boardId: string) =>
  collection(db, 'boards', boardId, 'columns');
const getTaskRef = (taskId: string) => doc(db, 'tasks', taskId);
const getTasksCollRef = () => collection(db, 'tasks');
const getChecklistCollRef = (taskId: string) =>
  collection(db, 'tasks', taskId, 'checklist');
const getCommentCollRef = () => collection(db, 'comments');
const getActivityCollRef = () => collection(db, 'activity_logs');
const getAttachmentCollRef = () => collection(db, 'attachments');

const now = () => Date.now();

const toDoc = <T>(data: Record<string, unknown>, id: string): T =>
  ({ id, ...data } as unknown as T);

const logActivity = async (
  boardId: string,
  userId: string,
  action: string,
  details: Record<string, unknown>,
  taskId: string | null = null,
) => {
  try {
    const ref = doc(getActivityCollRef());
    await setDoc(ref, {
      boardId,
      taskId,
      userId,
      action,
      details,
      createdAt: serverTimestamp(),
    });
  } catch (err) {
    console.error('Failed to log activity:', err);
  }
};

export const subscribeBoards = (
  userId: string,
  onData: (boards: Board[]) => void,
  onError: (err: Error) => void,
): Unsubscribe => {
  const trySubscribe = (retried: boolean): Unsubscribe => {
    const q = retried
      ? query(collection(db, 'boards'), where('userId', '==', userId))
      : query(
          collection(db, 'boards'),
          where('userId', '==', userId),
          orderBy('updatedAt', 'desc'),
        );

    return onSnapshot(
      q,
      (snapshot) => {
        const boards = snapshot.docs.map((d) => {
          const data = d.data();
          return toDoc<Board>(
            {
              ...data,
              createdAt: data.createdAt?.toMillis?.() ?? data.createdAt ?? 0,
              updatedAt: data.updatedAt?.toMillis?.() ?? data.updatedAt ?? 0,
            },
            d.id,
          );
        });
        onData(boards);
      },
      (err) => {
        if (!retried && err.message?.includes('index')) {
          onError(new Error(`${err.message}. Retrying without sort.`));
          trySubscribe(true);
        } else {
          onError(err);
        }
      },
    );
  };

  return trySubscribe(false);
};

export const createBoard = async (
  userId: string,
  name: string,
  description: string,
  columnNames: string[],
): Promise<Board> => {
  const boardRef = doc(collection(db, 'boards'));
  const boardId = boardRef.id;
  const t = now();

  await setDoc(boardRef, {
    userId,
    name,
    description,
    isFavorite: false,
    columnOrder: [],
    createdAt: Timestamp.fromMillis(t),
    updatedAt: Timestamp.fromMillis(t),
  });

  const batch = writeBatch(db);
  const createdColumns: Column[] = [];

  columnNames.forEach((colName, idx) => {
    const colRef = doc(getColumnsCollRef(boardId));
    createdColumns.push({
      id: colRef.id,
      boardId,
      name: colName,
      order: idx,
      taskOrder: [],
      createdAt: t,
      updatedAt: t,
    });
    batch.set(colRef, {
      name: colName,
      order: idx,
      taskOrder: [],
      createdAt: Timestamp.fromMillis(t),
      updatedAt: Timestamp.fromMillis(t),
    });
  });

  batch.update(boardRef, {
    columnOrder: createdColumns.map((c) => c.id),
  });

  await batch.commit();

  await logActivity(boardId, userId, 'board_created', { name }, null);

  return {
    id: boardId,
    userId,
    name,
    description,
    isFavorite: false,
    columnOrder: createdColumns.map((c) => c.id),
    createdAt: t,
    updatedAt: t,
  };
};

export const updateBoard = async (
  boardId: string,
  data: Partial<Pick<Board, 'name' | 'description' | 'isFavorite' | 'columnOrder'>>,
  userId: string,
): Promise<void> => {
  const payload: Record<string, unknown> = { ...data, updatedAt: Timestamp.fromMillis(now()) };
  await updateDoc(getBoardRef(boardId), payload);
  if (data.name) {
    await logActivity(boardId, userId, 'board_renamed', { name: data.name });
  }
};

export const deleteBoard = async (boardId: string, userId: string): Promise<void> => {
  const colsSnap = await getDocs(getColumnsCollRef(boardId));
  const batch = writeBatch(db);

  colsSnap.docs.forEach((d) => batch.delete(d.ref));

  const tasksSnap = await getDocs(
    query(getTasksCollRef(), where('boardId', '==', boardId)),
  );
  tasksSnap.docs.forEach((d) => batch.delete(d.ref));

  batch.delete(getBoardRef(boardId));
  await batch.commit();
};

export const subscribeColumns = (
  boardId: string,
  onData: (columns: Column[]) => void,
  onError: (err: Error) => void,
): Unsubscribe => {
  const q = query(getColumnsCollRef(boardId), orderBy('order', 'asc'));
  return onSnapshot(
    q,
    (snapshot) => {
      const columns = snapshot.docs.map((d) => {
        const data = d.data();
        return toDoc<Column>(
          {
            ...data,
            createdAt: data.createdAt?.toMillis?.() ?? data.createdAt ?? 0,
            updatedAt: data.updatedAt?.toMillis?.() ?? data.updatedAt ?? 0,
          },
          d.id,
        );
      });
      onData(columns);
    },
    onError,
  );
};

export const createColumn = async (
  boardId: string,
  name: string,
  userId: string,
): Promise<Column> => {
  const colRef = doc(getColumnsCollRef(boardId));
  const t = now();

  const boardSnap = await getDoc(getBoardRef(boardId));
  const boardData = boardSnap.data();
  const currentOrder = (boardData?.columnOrder as string[]) ?? [];
  const newOrder = currentOrder.length;

  await setDoc(colRef, {
    name,
    order: newOrder,
    taskOrder: [],
    createdAt: Timestamp.fromMillis(t),
    updatedAt: Timestamp.fromMillis(t),
  });

  await updateDoc(getBoardRef(boardId), {
    columnOrder: [...currentOrder, colRef.id],
    updatedAt: Timestamp.fromMillis(now()),
  });

  await logActivity(boardId, userId, 'column_created', { name, columnId: colRef.id });

  return {
    id: colRef.id,
    boardId,
    name,
    order: newOrder,
    taskOrder: [],
    createdAt: t,
    updatedAt: t,
  };
};

export const updateColumn = async (
  boardId: string,
  columnId: string,
  data: Partial<Pick<Column, 'name' | 'order' | 'taskOrder'>>,
  userId: string,
): Promise<void> => {
  const payload: Record<string, unknown> = { ...data, updatedAt: Timestamp.fromMillis(now()) };
  await updateDoc(getColumnRef(boardId, columnId), payload);
  if (data.name) {
    await logActivity(boardId, userId, 'column_renamed', { name: data.name, columnId });
  }
};

export const deleteColumn = async (
  boardId: string,
  columnId: string,
  userId: string,
): Promise<void> => {
  const batch = writeBatch(db);

  const tasksSnap = await getDocs(
    query(getTasksCollRef(), where('columnId', '==', columnId)),
  );
  tasksSnap.docs.forEach((d) => batch.delete(d.ref));

  batch.delete(getColumnRef(boardId, columnId));

  const boardSnap = await getDoc(getBoardRef(boardId));
  const boardData = boardSnap.data();
  const columnOrder = ((boardData?.columnOrder as string[]) ?? []).filter(
    (id) => id !== columnId,
  );

  batch.update(getBoardRef(boardId), {
    columnOrder,
    updatedAt: Timestamp.fromMillis(now()),
  });

  await batch.commit();
  await logActivity(boardId, userId, 'column_deleted', { columnId });
};

export const reorderColumns = async (
  boardId: string,
  columnOrder: string[],
  userId: string,
): Promise<void> => {
  const batch = writeBatch(db);
  batch.update(getBoardRef(boardId), {
    columnOrder,
    updatedAt: Timestamp.fromMillis(now()),
  });
  columnOrder.forEach((colId, idx) => {
    batch.update(getColumnRef(boardId, colId), { order: idx, updatedAt: Timestamp.fromMillis(now()) });
  });
  await batch.commit();
};

const subscribeTasksWithFallback = <T>(
  buildQuery: (simple: boolean) => ReturnType<typeof query>,
  mapDoc: (data: Record<string, any>, id: string) => T,
  onData: (items: T[]) => void,
  onError: (err: Error) => void,
): Unsubscribe => {
  const trySubscribe = (simple: boolean): Unsubscribe => {
    const q = buildQuery(simple);
    return onSnapshot(
      q,
      (snapshot) => {
        const items = snapshot.docs.map((d) => mapDoc(d.data() as Record<string, any>, d.id));
        onData(items);
      },
      (err) => {
        if (!simple && err.message?.includes('index')) {
          onError(new Error(`${err.message}. Retrying without sort.`));
          return trySubscribe(true);
        }
        onError(err);
      },
    );
  };
  return trySubscribe(false);
};

const mapTask = (data: Record<string, any>, id: string): Task =>
  toDoc<Task>(
    {
      ...data,
      dueDate: data.dueDate?.toMillis?.() ?? data.dueDate ?? null,
      createdAt: data.createdAt?.toMillis?.() ?? data.createdAt ?? 0,
      updatedAt: data.updatedAt?.toMillis?.() ?? data.updatedAt ?? 0,
    },
    id,
  );

const mapComment = (data: Record<string, any>, id: string): Comment =>
  toDoc<Comment>({ ...data, createdAt: data.createdAt?.toMillis?.() ?? data.createdAt ?? 0 }, id);

const mapLog = (data: Record<string, any>, id: string): ActivityLog =>
  toDoc<ActivityLog>({ ...data, createdAt: data.createdAt?.toMillis?.() ?? data.createdAt ?? 0 }, id);

const mapAttachment = (data: Record<string, any>, id: string): Attachment =>
  toDoc<Attachment>(
    { ...data, uploadedAt: data.uploadedAt?.toMillis?.() ?? data.uploadedAt ?? 0 },
    id,
  );

export const subscribeTasks = (
  boardId: string,
  onData: (tasks: Task[]) => void,
  onError: (err: Error) => void,
): Unsubscribe =>
  subscribeTasksWithFallback<Task>(
    (simple) =>
      simple
        ? query(getTasksCollRef(), where('boardId', '==', boardId), where('isArchived', '==', false))
        : query(getTasksCollRef(), where('boardId', '==', boardId), where('isArchived', '==', false), orderBy('order', 'asc')),
    mapTask,
    onData,
    onError,
  );

export const subscribeArchivedTasks = (
  boardId: string,
  onData: (tasks: Task[]) => void,
  onError: (err: Error) => void,
): Unsubscribe =>
  subscribeTasksWithFallback<Task>(
    (simple) =>
      simple
        ? query(getTasksCollRef(), where('boardId', '==', boardId), where('isArchived', '==', true))
        : query(getTasksCollRef(), where('boardId', '==', boardId), where('isArchived', '==', true), orderBy('updatedAt', 'desc')),
    mapTask,
    onData,
    onError,
  );

export const subscribeAllTasks = (
  userId: string,
  onData: (tasks: Task[]) => void,
  onError: (err: Error) => void,
): Unsubscribe =>
  subscribeTasksWithFallback<Task>(
    (simple) =>
      simple
        ? query(getTasksCollRef(), where('createdBy', '==', userId), where('isArchived', '==', false))
        : query(getTasksCollRef(), where('createdBy', '==', userId), where('isArchived', '==', false), orderBy('createdAt', 'desc')),
    mapTask,
    onData,
    onError,
  );

export const createTask = async (
  boardId: string,
  columnId: string,
  taskData: {
    title: string;
    description?: string;
    priority?: Priority;
    dueDate?: number | null;
    labels?: string[];
    assignee?: string | null;
  },
  userId: string,
): Promise<Task> => {
  const taskRef = doc(getTasksCollRef());
  const t = now();

  const colSnap = await getDoc(getColumnRef(boardId, columnId));
  const colData = colSnap.data();
  const taskOrder = (colData?.taskOrder as string[]) ?? [];
  const newOrder = taskOrder.length;

  const task: Task = {
    id: taskRef.id,
    boardId,
    columnId,
    title: taskData.title,
    description: taskData.description ?? '',
    priority: taskData.priority ?? 'medium',
    dueDate: taskData.dueDate ?? null,
    labels: taskData.labels ?? [],
    assignee: taskData.assignee ?? null,
    createdBy: userId,
    createdAt: t,
    updatedAt: t,
    order: newOrder,
    isArchived: false,
  };

  const batch = writeBatch(db);

  batch.set(taskRef, {
    boardId,
    columnId,
    title: task.title,
    description: task.description,
    priority: task.priority,
    dueDate: task.dueDate ? Timestamp.fromMillis(task.dueDate) : null,
    labels: task.labels,
    assignee: task.assignee,
    createdBy: userId,
    createdAt: Timestamp.fromMillis(t),
    updatedAt: Timestamp.fromMillis(t),
    order: newOrder,
    isArchived: false,
  });

  batch.update(getColumnRef(boardId, columnId), {
    taskOrder: [...taskOrder, taskRef.id],
    updatedAt: Timestamp.fromMillis(now()),
  });

  await batch.commit();
  await logActivity(boardId, userId, 'task_created', { title: task.title, columnId }, taskRef.id);

  return task;
};

export const updateTask = async (
  taskId: string,
  data: Partial<Omit<Task, 'id' | 'boardId' | 'createdBy' | 'createdAt'>>,
  boardId: string,
  userId: string,
): Promise<void> => {
  const payload: Record<string, unknown> = { ...data, updatedAt: Timestamp.fromMillis(now()) };
  if (data.dueDate !== undefined) {
    payload.dueDate = data.dueDate ? Timestamp.fromMillis(data.dueDate) : null;
  }
  await updateDoc(getTaskRef(taskId), payload);

  const changedFields = Object.keys(data).filter((k) => k !== 'updatedAt');
  if (changedFields.length > 0) {
    await logActivity(boardId, userId, 'task_updated', { taskId, changes: changedFields }, taskId);
  }
};

export const deleteTask = async (
  taskId: string,
  boardId: string,
  columnId: string,
  userId: string,
): Promise<void> => {
  const batch = writeBatch(db);
  batch.delete(getTaskRef(taskId));

  const colSnap = await getDoc(getColumnRef(boardId, columnId));
  const colData = colSnap.data();
  const taskOrder = ((colData?.taskOrder as string[]) ?? []).filter((id) => id !== taskId);
  batch.update(getColumnRef(boardId, columnId), {
    taskOrder,
    updatedAt: Timestamp.fromMillis(now()),
  });

  await batch.commit();
  await logActivity(boardId, userId, 'task_deleted', { taskId }, taskId);
};

export const moveTask = async (
  taskId: string,
  fromColumnId: string,
  toColumnId: string,
  newOrder: number,
  boardId: string,
  userId: string,
): Promise<void> => {
  const batch = writeBatch(db);

  const fromColSnap = await getDoc(getColumnRef(boardId, fromColumnId));
  const toColSnap = await getDoc(getColumnRef(boardId, toColumnId));

  let fromTaskOrder = ((fromColSnap.data()?.taskOrder as string[]) ?? []).filter(
    (id) => id !== taskId,
  );
  let toTaskOrder = (toColSnap.data()?.taskOrder as string[]) ?? [];

  if (fromColumnId === toColumnId) {
    fromTaskOrder = fromTaskOrder.filter((id) => id !== taskId);
    fromTaskOrder.splice(newOrder, 0, taskId);
    batch.update(getColumnRef(boardId, fromColumnId), {
      taskOrder: fromTaskOrder,
      updatedAt: Timestamp.fromMillis(now()),
    });
  } else {
    toTaskOrder.splice(newOrder, 0, taskId);
    batch.update(getColumnRef(boardId, fromColumnId), {
      taskOrder: fromTaskOrder,
      updatedAt: Timestamp.fromMillis(now()),
    });
    batch.update(getColumnRef(boardId, toColumnId), {
      taskOrder: toTaskOrder,
      updatedAt: Timestamp.fromMillis(now()),
    });
    batch.update(getTaskRef(taskId), {
      columnId: toColumnId,
      order: newOrder,
      updatedAt: Timestamp.fromMillis(now()),
    });
  }

  await batch.commit();
  await logActivity(boardId, userId, 'task_moved', { taskId, fromColumnId, toColumnId }, taskId);
};

export const reorderTasks = async (
  boardId: string,
  columnId: string,
  taskOrder: string[],
  userId: string,
): Promise<void> => {
  const batch = writeBatch(db);
  batch.update(getColumnRef(boardId, columnId), {
    taskOrder,
    updatedAt: Timestamp.fromMillis(now()),
  });
  taskOrder.forEach((taskId, idx) => {
    batch.update(getTaskRef(taskId), { order: idx, updatedAt: Timestamp.fromMillis(now()) });
  });
  await batch.commit();
};

export const archiveTask = async (
  taskId: string,
  boardId: string,
  columnId: string,
  userId: string,
): Promise<void> => {
  const batch = writeBatch(db);

  batch.update(getTaskRef(taskId), {
    isArchived: true,
    updatedAt: Timestamp.fromMillis(now()),
  });

  const colSnap = await getDoc(getColumnRef(boardId, columnId));
  const colData = colSnap.data();
  const taskOrder = ((colData?.taskOrder as string[]) ?? []).filter((id) => id !== taskId);
  batch.update(getColumnRef(boardId, columnId), {
    taskOrder,
    updatedAt: Timestamp.fromMillis(now()),
  });

  await batch.commit();
  await logActivity(boardId, userId, 'task_archived', { taskId }, taskId);
};

export const restoreTask = async (
  taskId: string,
  boardId: string,
  columnId: string,
  userId: string,
): Promise<void> => {
  const batch = writeBatch(db);

  batch.update(getTaskRef(taskId), {
    isArchived: false,
    updatedAt: Timestamp.fromMillis(now()),
  });

  const colSnap = await getDoc(getColumnRef(boardId, columnId));
  const colData = colSnap.data();
  const taskOrder = (colData?.taskOrder as string[]) ?? [];
  batch.update(getColumnRef(boardId, columnId), {
    taskOrder: [...taskOrder, taskId],
    updatedAt: Timestamp.fromMillis(now()),
  });

  await batch.commit();
  await logActivity(boardId, userId, 'task_restored', { taskId }, taskId);
};

export const subscribeComments = (
  taskId: string,
  onData: (comments: Comment[]) => void,
  onError: (err: Error) => void,
): Unsubscribe =>
  subscribeTasksWithFallback<Comment>(
    (simple) =>
      simple
        ? query(getCommentCollRef(), where('taskId', '==', taskId))
        : query(getCommentCollRef(), where('taskId', '==', taskId), orderBy('createdAt', 'asc')),
    mapComment,
    onData,
    onError,
  );

export const addComment = async (
  taskId: string,
  text: string,
  userId: string,
  boardId: string,
): Promise<Comment> => {
  const ref = doc(getCommentCollRef());
  const t = now();
  const comment: Comment = { id: ref.id, taskId, userId, text, createdAt: t };

  await setDoc(ref, {
    taskId,
    userId,
    text,
    createdAt: Timestamp.fromMillis(t),
  });

  await logActivity(boardId, userId, 'comment_added', { taskId }, taskId);

  return comment;
};

export const deleteComment = async (commentId: string): Promise<void> => {
  await deleteDoc(doc(getCommentCollRef(), commentId));
};

export const subscribeChecklist = (
  taskId: string,
  onData: (items: ChecklistItem[]) => void,
  onError: (err: Error) => void,
): Unsubscribe => {
  const q = query(getChecklistCollRef(taskId), orderBy('order', 'asc'));
  return onSnapshot(
    q,
    (snapshot) => {
      const items = snapshot.docs.map((d) => {
        const data = d.data();
        return toDoc<ChecklistItem>(
          {
            ...data,
            createdAt: data.createdAt?.toMillis?.() ?? data.createdAt ?? 0,
          },
          d.id,
        );
      });
      onData(items);
    },
    onError,
  );
};

export const addChecklistItem = async (
  taskId: string,
  text: string,
): Promise<ChecklistItem> => {
  const ref = doc(getChecklistCollRef(taskId));
  const t = now();

  const snap = await getDocs(getChecklistCollRef(taskId));
  const newOrder = snap.size;

  const item: ChecklistItem = {
    id: ref.id,
    taskId,
    text,
    isChecked: false,
    order: newOrder,
    createdAt: t,
  };

  await setDoc(ref, {
    text,
    isChecked: false,
    order: newOrder,
    createdAt: Timestamp.fromMillis(t),
  });

  return item;
};

export const updateChecklistItem = async (
  taskId: string,
  itemId: string,
  data: Partial<Pick<ChecklistItem, 'text' | 'isChecked' | 'order'>>,
): Promise<void> => {
  const payload: Record<string, unknown> = { ...data };
  await updateDoc(doc(getChecklistCollRef(taskId), itemId), payload);
};

export const deleteChecklistItem = async (
  taskId: string,
  itemId: string,
): Promise<void> => {
  await deleteDoc(doc(getChecklistCollRef(taskId), itemId));
};

export const subscribeActivityLog = (
  boardId: string,
  onData: (logs: ActivityLog[]) => void,
  onError: (err: Error) => void,
): Unsubscribe =>
  subscribeTasksWithFallback<ActivityLog>(
    (simple) =>
      simple
        ? query(getActivityCollRef(), where('boardId', '==', boardId))
        : query(getActivityCollRef(), where('boardId', '==', boardId), orderBy('createdAt', 'desc')),
    (data, id) => mapLog(data, id),
    (items) => onData(items.slice(0, 50)),
    onError,
  );

export const uploadAttachment = async (
  taskId: string,
  file: File,
  userId: string,
): Promise<Attachment> => {
    const storageRef = ref(
    storage,
    `attachments/${taskId}/${file.name}`,
  );
  const snapshot = await uploadBytes(storageRef, file);
  const url = await getDownloadURL(snapshot.ref);

  const attRef = doc(getAttachmentCollRef());
  const att: Attachment = {
    id: attRef.id,
    taskId,
    name: file.name,
    url,
    type: file.type,
    size: file.size,
    uploadedAt: Date.now(),
    uploadedBy: userId,
  };

  await setDoc(attRef, {
    taskId,
    name: file.name,
    url,
    type: file.type,
    size: file.size,
    uploadedAt: Timestamp.fromMillis(att.uploadedAt),
    uploadedBy: userId,
  });

  return att;
};

export const subscribeAttachments = (
  taskId: string,
  onData: (attachments: Attachment[]) => void,
  onError: (err: Error) => void,
): Unsubscribe =>
  subscribeTasksWithFallback<Attachment>(
    (simple) =>
      simple
        ? query(getAttachmentCollRef(), where('taskId', '==', taskId))
        : query(getAttachmentCollRef(), where('taskId', '==', taskId), orderBy('uploadedAt', 'asc')),
    mapAttachment,
    onData,
    onError,
  );

export const deleteAttachment = async (attachmentId: string, url: string): Promise<void> => {
  const storageRef = ref(storage, url);
  await deleteObject(storageRef).catch(() => {});
  await deleteDoc(doc(getAttachmentCollRef(), attachmentId));
};

export const archiveCompletedTasks = async (
  boardId: string,
  doneColumnId: string,
  userId: string,
): Promise<number> => {
  const q = query(
    getTasksCollRef(),
    where('boardId', '==', boardId),
    where('columnId', '==', doneColumnId),
    where('isArchived', '==', false),
  );
  const snap = await getDocs(q);
  const batch = writeBatch(db);

  snap.docs.forEach((d) => {
    batch.update(d.ref, { isArchived: true, updatedAt: Timestamp.fromMillis(now()) });
  });

  await batch.commit();
  await logActivity(boardId, userId, 'tasks_bulk_archived', { count: snap.size });

  return snap.size;
};

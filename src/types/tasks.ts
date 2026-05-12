export type Priority = 'low' | 'medium' | 'high' | 'critical';

export interface Board {
  id: string;
  userId: string;
  name: string;
  description: string;
  isFavorite: boolean;
  columnOrder: string[];
  createdAt: number;
  updatedAt: number;
}

export interface Column {
  id: string;
  boardId: string;
  name: string;
  order: number;
  taskOrder: string[];
  createdAt: number;
  updatedAt: number;
}

export interface Task {
  id: string;
  boardId: string;
  columnId: string;
  title: string;
  description: string;
  priority: Priority;
  dueDate: number | null;
  labels: string[];
  assignee: string | null;
  createdBy: string;
  createdAt: number;
  updatedAt: number;
  order: number;
  isArchived: boolean;
}

export interface ChecklistItem {
  id: string;
  taskId: string;
  text: string;
  isChecked: boolean;
  order: number;
  createdAt: number;
}

export interface Comment {
  id: string;
  taskId: string;
  userId: string;
  text: string;
  createdAt: number;
}

export interface ActivityLog {
  id: string;
  boardId: string;
  taskId: string | null;
  userId: string;
  action: string;
  details: Record<string, unknown>;
  createdAt: number;
}

export interface Attachment {
  id: string;
  taskId: string;
  name: string;
  url: string;
  type: string;
  size: number;
  uploadedAt: number;
  uploadedBy: string;
}

export type BoardFilter = 'all' | 'favorites';

export interface TaskFilters {
  search: string;
  priority: Priority | 'all';
  labels: string[];
  dueDate: 'all' | 'today' | 'week' | 'overdue' | 'none';
  showArchived: boolean;
}

export const PRIORITY_LABELS: Record<Priority, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  critical: 'Critical',
};

export const PRIORITY_COLORS: Record<Priority, string> = {
  low: '#22c55e',
  medium: '#f59e0b',
  high: '#f97316',
  critical: '#ef4444',
};

export const DEFAULT_COLUMNS = ['Todo', 'Doing', 'Done'];

export const LABEL_COLORS: Record<string, string> = {
  bug: '#ef4444',
  feature: '#6366f1',
  enhancement: '#22c55e',
  documentation: '#3b82f6',
  design: '#ec4899',
  frontend: '#f59e0b',
  backend: '#14b8a6',
  urgent: '#dc2626',
};

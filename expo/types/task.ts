import { User } from './user';

export type TaskPriority = 'high' | 'medium' | 'low';
export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'validated';

export interface Task {
  id: string;
  title: string;
  description: string;
  categoryId: string;
  assignedTo: string[]; // User IDs
  assignedBy: string; // User ID of the creator
  deadline?: string; // ISO date string
  dueDate?: string; // ISO date string (alternative to deadline)
  priority: TaskPriority;
  status: TaskStatus;
  needsValidation?: boolean;
  validatedBy?: string; // User ID of the validator
  comments?: TaskComment[];
  createdAt: string;
  updatedAt: string;
}

export interface TaskComment {
  id: string;
  taskId: string;
  userId: string;
  content: string;
  createdAt: string;
}

export interface TasksState {
  tasks: Task[];
  isLoading: boolean;
  error: string | null;
}
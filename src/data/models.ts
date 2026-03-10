export type TicketStatus = 'todo' | 'in-progress' | 'in-review' | 'done';
export type TicketPriority = 'low' | 'medium' | 'high' | 'critical';
export type TicketType = 'bug' | 'task' | 'story' | 'improvement';
export type Department = 'Website' | 'Mobile' | 'Backend' | 'DevOps';

export interface User {
  id: string;
  name: string;
  username?: string;
  email: string;
  avatar: string;
  role?: 'USER' | 'SUPER_ADMIN';
}

export interface Comment {
  id: string;
  user: User;
  text: string;
  createdAt: string;
}

export interface ActivityEvent {
  id: string;
  user: User;
  action: string;
  field?: string | null;
  oldValue?: string | null;
  newValue?: string | null;
  createdAt: string;
  ticketId?: string | null;
  ticketTitle?: string | null;
}

export interface Ticket {
  id: string;
  title: string;
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
  department: Department;
  type: TicketType;
  assignee: User | null;
  assignees: User[];
  reporter: User;
  dueDate: string | null;
  starred: boolean;
  createdAt: string;
  updatedAt: string;
  attachments: string[];
  comments: Comment[];
  activity: ActivityEvent[];
}

export const statusLabels: Record<TicketStatus, string> = {
  'todo': 'To Do',
  'in-progress': 'In Progress',
  'in-review': 'In Review',
  'done': 'Done',
};

export const priorityLabels: Record<TicketPriority, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  critical: 'Critical',
};

export const typeLabels: Record<TicketType, string> = {
  bug: 'Bug',
  task: 'Task',
  story: 'Story',
  improvement: 'Improvement',
};

export const departments: Department[] = ['Website', 'Mobile', 'Backend', 'DevOps'];

export type TicketStatus = 'todo' | 'in-progress' | 'in-review' | 'done';
export type TicketPriority = 'low' | 'medium' | 'high' | 'critical';
export type TicketType = 'bug' | 'task' | 'story' | 'improvement';
export type Department = 'Website' | 'Mobile' | 'Backend' | 'DevOps';

export interface User {
  id: string;
  name: string;
  avatar: string;
  email: string;
}

export interface Ticket {
  id: string;
  title: string;
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
  type: TicketType;
  department: Department;
  assignee: User | null;
  reporter: User;
  createdAt: string;
  updatedAt: string;
  dueDate: string | null;
  starred: boolean;
  comments: Comment[];
  activity: ActivityEvent[];
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
  field?: string;
  oldValue?: string;
  newValue?: string;
  createdAt: string;
  ticketId?: string;
  ticketTitle?: string;
}

export const statusLabels: Record<TicketStatus, string> = {
  'todo': 'To Do',
  'in-progress': 'In Progress',
  'in-review': 'In Review',
  'done': 'Done',
};

export const priorityLabels: Record<TicketPriority, string> = {
  'low': 'Low',
  'medium': 'Medium',
  'high': 'High',
  'critical': 'Critical',
};

export const typeLabels: Record<TicketType, string> = {
  'bug': 'Bug',
  'task': 'Task',
  'story': 'Story',
  'improvement': 'Improvement',
};

export const departments: Department[] = ['Website', 'Mobile', 'Backend', 'DevOps'];

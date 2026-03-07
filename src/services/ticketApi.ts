import api from '@/services/api';
import { ActivityEvent, Ticket, User } from '@/data/models';
import { API_ENDPOINTS } from '@/services/controlapi';

interface ApiUser {
  id: number;
  name: string;
  email: string;
  avatar: string;
  role?: 'USER' | 'SUPER_ADMIN';
}

interface ApiComment {
  id: string;
  user: ApiUser;
  text: string;
  createdAt: string;
}

interface ApiActivity {
  id: string;
  user: ApiUser;
  action: string;
  field: string | null;
  oldValue: string | null;
  newValue: string | null;
  createdAt: string;
  ticketId: string | null;
  ticketTitle: string | null;
}

interface ApiTicket {
  id: string;
  title: string;
  description: string;
  status: Ticket['status'];
  priority: Ticket['priority'];
  department: Ticket['department'];
  type: Ticket['type'];
  assignee: ApiUser | null;
  assignees?: ApiUser[];
  reporter: ApiUser | null;
  dueDate: string | null;
  starred: boolean;
  createdAt: string;
  updatedAt: string;
  attachments?: string[];
  comments: ApiComment[];
  activity: ApiActivity[];
}

interface ApiPage<T> {
  items: T[];
  page: number;
  size: number;
  totalItems: number;
  totalPages: number;
}

function mapUser(user: ApiUser | null): User | null {
  if (!user) return null;
  return {
    id: String(user.id),
    name: user.name,
    email: user.email,
    avatar: user.avatar,
    role: user.role || 'USER',
  };
}

function mapActivity(event: ApiActivity): ActivityEvent {
  return {
    id: event.id,
    user: (mapUser(event.user) as User),
    action: event.action,
    field: event.field,
    oldValue: event.oldValue,
    newValue: event.newValue,
    createdAt: event.createdAt,
    ticketId: event.ticketId,
    ticketTitle: event.ticketTitle,
  };
}

function mapTicket(ticket: ApiTicket): Ticket {
  const fallbackReporter: User = {
    id: '0',
    name: 'Hidden',
    email: 'hidden@local',
    avatar: 'NA',
    role: 'USER',
  };

  const mappedAssignees = (ticket.assignees || []).map((assignee) => mapUser(assignee) as User);
  const mappedPrimaryAssignee = mapUser(ticket.assignee) || (mappedAssignees[0] || null);

  return {
    id: ticket.id,
    title: ticket.title,
    description: ticket.description || '',
    status: ticket.status,
    priority: ticket.priority,
    department: ticket.department,
    type: ticket.type,
    assignee: mappedPrimaryAssignee,
    assignees: mappedAssignees,
    reporter: mapUser(ticket.reporter) || fallbackReporter,
    dueDate: ticket.dueDate,
    starred: ticket.starred,
    createdAt: ticket.createdAt,
    updatedAt: ticket.updatedAt,
    attachments: ticket.attachments || [],
    comments: (ticket.comments || []).map((comment) => ({
      id: comment.id,
      user: (mapUser(comment.user) as User),
      text: comment.text,
      createdAt: comment.createdAt,
    })),
    activity: (ticket.activity || []).map(mapActivity),
  };
}

export const ticketApi = {
  async createUser(payload: { name: string; email: string; avatar: string }): Promise<User> {
    const response = await api.post<ApiUser>(`${API_ENDPOINTS.users}/google-onboard`, payload);
    return mapUser(response.data) as User;
  },

  async deleteUser(userId: string): Promise<void> {
    await api.delete(API_ENDPOINTS.userById.replace('{userId}', userId));
  },

  async getUsers(projectId?: string): Promise<User[]> {
    const response = await api.get<ApiUser[]>(API_ENDPOINTS.users, { params: projectId ? { projectId } : undefined });
    return response.data.map((user) => mapUser(user) as User);
  },

  async getTickets(projectId: string): Promise<Ticket[]> {
    const response = await api.get<ApiTicket[] | ApiPage<ApiTicket>>(API_ENDPOINTS.tickets, { params: { projectId } });
    const rows = Array.isArray(response.data) ? response.data : (response.data.items || []);
    return rows.map(mapTicket);
  },

  async getSummary(projectId: string): Promise<Ticket[]> {
    const response = await api.get<ApiTicket[]>(API_ENDPOINTS.summary, { params: { projectId } });
    return response.data.map(mapTicket);
  },

  async getActivity(projectId: string): Promise<ActivityEvent[]> {
    const response = await api.get<ApiActivity[]>(API_ENDPOINTS.activity, { params: { projectId } });
    return response.data.map(mapActivity);
  },

  async createTicket(payload: {
    projectId: string;
    title: string;
    description: string;
    status: Ticket['status'];
    priority: Ticket['priority'];
    department: Ticket['department'];
    type: Ticket['type'];
    assigneeIds: number[];
    reporterId: number;
    dueDate: string | null;
    attachments: string[];
  }): Promise<Ticket> {
    const response = await api.post<ApiTicket>(API_ENDPOINTS.tickets, payload);
    return mapTicket(response.data);
  },

  async updateStatus(projectId: string, ticketId: string, status: Ticket['status'], changedByUserId: number): Promise<Ticket> {
    const response = await api.patch<ApiTicket>(
      API_ENDPOINTS.ticketStatus.replace('{ticketId}', ticketId),
      { status },
      { params: { projectId } },
    );
    return mapTicket(response.data);
  },

  async updateStar(projectId: string, ticketId: string, starred: boolean, changedByUserId: number): Promise<Ticket> {
    const response = await api.patch<ApiTicket>(
      API_ENDPOINTS.ticketStar.replace('{ticketId}', ticketId),
      { starred },
      { params: { projectId } },
    );
    return mapTicket(response.data);
  },

  async updateAssignees(projectId: string, ticketId: string, assigneeIds: number[]): Promise<Ticket> {
    const response = await api.patch<ApiTicket>(
      API_ENDPOINTS.ticketAssignees.replace('{ticketId}', ticketId),
      { assigneeIds },
      { params: { projectId } },
    );
    return mapTicket(response.data);
  },
};

import api from '@/services/api';
import { ActivityEvent, Ticket, User } from '@/data/models';
import { API_ENDPOINTS } from '@/services/controlApi';

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

export interface TicketQueryParams {
  q?: string;
  status?: Ticket['status'];
  priority?: Ticket['priority'];
  assigneeId?: number;
  createdFrom?: string;
  createdTo?: string;
  updatedFrom?: string;
  updatedTo?: string;
  dueFrom?: string;
  dueTo?: string;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
  page?: number;
  size?: number;
}

export interface TicketPage {
  items: Ticket[];
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
    user: mapUser(event.user) as User,
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
  const mappedPrimaryAssignee = mapUser(ticket.assignee) || mappedAssignees[0] || null;

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
      user: mapUser(comment.user) as User,
      text: comment.text,
      createdAt: comment.createdAt,
    })),
    activity: (ticket.activity || []).map(mapActivity),
  };
}

type CreateUserResponse = { user: ApiUser; emailSent: boolean; warning?: string | null };

export const ticketApi = {
  async createUser(payload: { name: string; email: string; password: string; avatar: string }): Promise<{ user: User; emailSent: boolean; warning?: string }> {
    const response = await api.post<CreateUserResponse>(API_ENDPOINTS.users, payload);
    return {
      user: mapUser(response.data.user) as User,
      emailSent: response.data.emailSent,
      warning: response.data.warning ?? undefined,
    };
  },

  async deleteUser(userId: string): Promise<void> {
    await api.delete(API_ENDPOINTS.userById.replace('{userId}', userId));
  },

  async getUsers(projectId?: string, assignable?: boolean): Promise<User[]> {
    const params: Record<string, any> = {};
    if (projectId) params.projectId = projectId;
    if (assignable) params.assignable = true;
    const response = await api.get<ApiUser[]>(API_ENDPOINTS.users, { params: Object.keys(params).length ? params : undefined });
    return response.data.map((user) => mapUser(user) as User);
  },

  async getTickets(projectId: string): Promise<Ticket[]> {
    const response = await api.get<ApiTicket[] | ApiPage<ApiTicket>>(API_ENDPOINTS.tickets, {
      params: { projectId, page: 0, size: 500 },
    });
    const rows = Array.isArray(response.data) ? response.data : response.data.items || [];
    return rows.map(mapTicket);
  },

  async queryTickets(projectId: string, params: TicketQueryParams = {}): Promise<TicketPage> {
    const response = await api.get<ApiPage<ApiTicket>>(API_ENDPOINTS.tickets, {
      params: { projectId, ...params },
    });
    return {
      items: (response.data.items || []).map(mapTicket),
      page: response.data.page,
      size: response.data.size,
      totalItems: response.data.totalItems,
      totalPages: response.data.totalPages,
    };
  },

  async getSummary(projectId: string): Promise<Ticket[]> {
    const response = await api.get<ApiTicket[]>(API_ENDPOINTS.summary, { params: { projectId } });
    return response.data.map(mapTicket);
  },

  async getSummaryFiltered(projectId: string, params: { department?: string; status?: string; sortBy?: string; sortDir?: string }): Promise<Ticket[]> {
    const response = await api.get<ApiTicket[]>(API_ENDPOINTS.summary, { params: { projectId, ...params } });
    return response.data.map(mapTicket);
  },

  async getRecent(projectId: string): Promise<Ticket[]> {
    const response = await api.get<ApiTicket[]>(`${API_ENDPOINTS.tickets}/recent`, { params: { projectId } });
    return response.data.map(mapTicket);
  },

  async getForYou(projectId: string): Promise<Ticket[]> {
    const response = await api.get<ApiTicket[]>(`${API_ENDPOINTS.tickets}/for-you`, { params: { projectId } });
    return response.data.map(mapTicket);
  },

  async getActivity(projectId: string): Promise<ActivityEvent[]> {
    const response = await api.get<ApiActivity[]>(API_ENDPOINTS.activity, { params: { projectId } });
    return response.data.map(mapActivity);
  },

  async getTicketById(projectId: string, ticketId: string): Promise<Ticket> {
    const response = await api.get<ApiTicket>(API_ENDPOINTS.ticketById.replace('{ticketId}', ticketId), {
      params: { projectId },
    });
    return mapTicket(response.data);
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

  async updateStatus(projectId: string, ticketId: string, status: Ticket['status']): Promise<Ticket> {
    const response = await api.patch<ApiTicket>(
      API_ENDPOINTS.ticketStatus.replace('{ticketId}', ticketId),
      { status },
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

  async addComment(projectId: string, ticketId: string, text: string) {
    const response = await api.post(
      API_ENDPOINTS.ticketComments.replace('{ticketId}', ticketId),
      { text },
      { params: { projectId } },
    );
    return response.data;
  },
};

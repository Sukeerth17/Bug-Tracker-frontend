import React, { createContext, ReactNode, useCallback, useContext, useMemo, useState } from 'react';
import { Department, Ticket, TicketPriority, TicketStatus, TicketType, User } from '@/data/models';
import { ticketApi } from '@/services/ticketApi';
import { useAuth } from '@/contexts/AuthContext';

interface TicketContextType {
  currentUser: User;
  selectedTicket: Ticket | null;
  setSelectedTicket: (ticket: Ticket | null) => void;
  updateTicketStatus: (projectId: string, id: string, status: TicketStatus) => Promise<void>;
  createTicket: (ticket: {
    projectId: string;
    featureId?: string | null;
    title: string;
    description: string;
    department: Department;
    type: TicketType;
    priority: TicketPriority;
    status: TicketStatus;
    assignees: User[];
    dueDate: string | null;
    attachments: string[];
  }) => Promise<void>;
  updateTicketAssignees: (projectId: string, id: string, assigneeIds: string[]) => Promise<void>;
  addTicketComment: (projectId: string, id: string, text: string) => Promise<void>;
}

const TicketContext = createContext<TicketContextType | null>(null);

export const useTickets = () => {
  const ctx = useContext(TicketContext);
  if (!ctx) throw new Error('useTickets must be used within TicketProvider');
  return ctx;
};

const fallbackCurrentUser: User = {
  id: '1',
  name: 'User',
  email: 'user@example.com',
  avatar: 'US',
  role: 'USER',
};

export const TicketProvider = ({ children }: { children: ReactNode }) => {
  const { user: authUser } = useAuth();
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);

  const currentUser = useMemo(() => {
    if (authUser) return authUser;
    return fallbackCurrentUser;
  }, [authUser]);

  const updateTicketStatus = useCallback(async (projectId: string, id: string, status: TicketStatus) => {
    const updated = await ticketApi.updateStatus(projectId, id, status);
    setSelectedTicket((prev) => (prev && prev.id === id ? updated : prev));
  }, []);

  const createTicket = useCallback(async (data: {
    projectId: string;
    featureId?: string | null;
    title: string;
    description: string;
    department: Department;
    type: TicketType;
    priority: TicketPriority;
    status: TicketStatus;
    assignees: User[];
    dueDate: string | null;
    attachments: string[];
  }) => {
    const assigneeIds = (data.assignees || []).map((assignee) => Number(assignee.id));
    const createdTicket = await ticketApi.createTicket({
      projectId: data.projectId,
      featureId: data.featureId ?? null,
      title: data.title,
      description: data.description,
      department: data.department,
      type: data.type,
      priority: data.priority,
      status: data.status,
      assigneeIds,
      reporterId: Number(currentUser.id),
      dueDate: data.dueDate,
      attachments: data.attachments,
    });
    setSelectedTicket(createdTicket);
    window.dispatchEvent(new CustomEvent('ticket:created', { detail: { projectId: data.projectId } }));
  }, [currentUser.id]);

  const updateTicketAssignees = useCallback(async (projectId: string, id: string, assigneeIds: string[]) => {
    const updated = await ticketApi.updateAssignees(projectId, id, assigneeIds.map(Number));
    setSelectedTicket((prev) => (prev && prev.id === id ? updated : prev));
  }, []);

  const addTicketComment = useCallback(async (projectId: string, id: string, text: string) => {
    if (!text.trim()) return;
    await ticketApi.addComment(projectId, id, text.trim());
  }, []);

  return (
    <TicketContext.Provider
      value={{
        currentUser,
        selectedTicket,
        setSelectedTicket,
        updateTicketStatus,
        createTicket,
        updateTicketAssignees,
        addTicketComment,
      }}
    >
      {children}
    </TicketContext.Provider>
  );
};

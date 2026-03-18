import React, { createContext, ReactNode, useCallback, useContext, useMemo, useState } from 'react';
import { Department, Ticket, TicketPriority, TicketStatus, TicketType, User } from '@/data/models';
import { ticketApi } from '@/services/ticketApi';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/components/ui/sonner';

interface TicketContextType {
  currentUser: User;
  selectedTicket: Ticket | null;
  setSelectedTicket: (ticket: Ticket | null) => void;
  updateTicketStatus: (projectId: string, id: string, status: TicketStatus) => Promise<void>;
  updateTicketDetails: (projectId: string, id: string, payload: { title: string; description: string; dueDate: string | null; priority?: TicketPriority; department?: Department; type?: TicketType; featureId?: string | number | null }) => Promise<void>;
  updateTicketAttachments: (projectId: string, id: string, attachments: string[]) => Promise<void>;
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
    window.dispatchEvent(new CustomEvent('ticket:updated', { detail: { projectId } }));
    toast('Status updated');
  }, []);

  const updateTicketDetails = useCallback(async (projectId: string, id: string, payload: { title: string; description: string; dueDate: string | null; priority?: TicketPriority; department?: Department; type?: TicketType; featureId?: string | number | null }) => {
    const updated = await ticketApi.updateDetails(projectId, id, payload);
    setSelectedTicket((prev) => (prev && prev.id === id ? updated : prev));
    window.dispatchEvent(new CustomEvent('ticket:updated', { detail: { projectId } }));
  }, []);

  const updateTicketAttachments = useCallback(async (projectId: string, id: string, attachments: string[]) => {
    const updated = await ticketApi.updateAttachments(projectId, id, attachments);
    setSelectedTicket((prev) => (prev && prev.id === id ? updated : prev));
    window.dispatchEvent(new CustomEvent('ticket:updated', { detail: { projectId } }));
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
    const stillVisible = currentUser.role === 'SUPER_ADMIN'
      || updated.reporter?.id === currentUser.id
      || updated.assignees.some((assignee) => assignee.id === currentUser.id);
    if (!stillVisible) {
      setSelectedTicket(null);
    }
    window.dispatchEvent(new CustomEvent('ticket:updated', { detail: { projectId } }));
  }, [currentUser]);

  const addTicketComment = useCallback(async (projectId: string, id: string, text: string) => {
    if (!text.trim()) return;
    await ticketApi.addComment(projectId, id, text.trim());
    const updated = await ticketApi.getTicketById(projectId, id);
    setSelectedTicket((prev) => (prev && prev.id === id ? updated : prev));
    window.dispatchEvent(new CustomEvent('ticket:updated', { detail: { projectId } }));
  }, []);

  return (
    <TicketContext.Provider
      value={{
        currentUser,
        selectedTicket,
        setSelectedTicket,
        updateTicketStatus,
        updateTicketDetails,
        updateTicketAttachments,
        createTicket,
        updateTicketAssignees,
        addTicketComment,
      }}
    >
      {children}
    </TicketContext.Provider>
  );
};

import React, { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { ActivityEvent, Department, Ticket, TicketPriority, TicketStatus, TicketType, User } from '@/data/models';
import { ticketApi } from '@/services/ticketApi';
import { resolveProjectId } from '@/services/projectControl';
import { useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

interface TicketContextType {
  tickets: Ticket[];
  summaryTickets: Ticket[];
  users: User[];
  currentUser: User;
  selectedTicket: Ticket | null;
  allActivity: ActivityEvent[];
  loading: boolean;
  setSelectedTicket: (ticket: Ticket | null) => void;
  refreshAll: () => Promise<void>;
  updateTicketStatus: (id: string, status: TicketStatus) => Promise<void>;
  createTicket: (ticket: {
    projectId: string;
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
  updateTicketAssignees: (id: string, assigneeIds: string[]) => Promise<void>;
  addTicketComment: (id: string, text: string) => Promise<void>;
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
  const location = useLocation();
  const { user: authUser } = useAuth();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [summaryTickets, setSummaryTickets] = useState<Ticket[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [allActivity, setAllActivity] = useState<ActivityEvent[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(true);

  const currentUser = useMemo(() => {
    if (authUser) {
      return users.find((user) => user.id === authUser.id) || authUser;
    }
    return fallbackCurrentUser;
  }, [authUser, users]);
  const currentProjectId = useMemo(() => resolveProjectId(location.pathname), [location.pathname]);

  const refreshAll = useCallback(async () => {
    if (!currentProjectId) {
      setUsers([]);
      setTickets([]);
      setSummaryTickets([]);
      setAllActivity([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [userData, ticketData, summaryData, activityData] = await Promise.all([
        ticketApi.getUsers(currentProjectId, true),
        ticketApi.getTickets(currentProjectId),
        ticketApi.getSummary(currentProjectId),
        ticketApi.getActivity(currentProjectId),
      ]);
      setUsers(userData);
      setTickets(ticketData);
      setSummaryTickets(summaryData);
      setAllActivity(activityData);
    } catch {
      setUsers([]);
      setTickets([]);
      setSummaryTickets([]);
      setAllActivity([]);
    } finally {
      setLoading(false);
    }
  }, [currentProjectId]);

  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  useEffect(() => {
    if (!currentProjectId || !selectedTicket?.id) {
      return;
    }

    let active = true;
    ticketApi.getTicketById(currentProjectId, selectedTicket.id)
      .then((fullTicket) => {
        if (!active) return;
        setSelectedTicket((prev) => (prev && prev.id === fullTicket.id ? fullTicket : prev));
      })
      .catch(() => {
        // ignore detail hydration failures to keep panel usable with list payload
      });

    return () => {
      active = false;
    };
  }, [currentProjectId, selectedTicket?.id]);

  const updateTicketStatus = useCallback(async (id: string, status: TicketStatus) => {
    await ticketApi.updateStatus(currentProjectId, id, status);
    await refreshAll();

    setSelectedTicket((prev) => {
      if (!prev || prev.id !== id) return prev;
      return { ...prev, status };
    });
  }, [currentProjectId, refreshAll]);

  const createTicket = useCallback(async (data: {
    projectId: string;
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
    setTickets((prev) => [createdTicket, ...prev]);
    setSummaryTickets((prev) => [createdTicket, ...prev]);
    setSelectedTicket(createdTicket);
    void refreshAll();
  }, [currentUser.id, refreshAll]);

  const updateTicketAssignees = useCallback(async (id: string, assigneeIds: string[]) => {
    const updated = await ticketApi.updateAssignees(currentProjectId, id, assigneeIds.map(Number));
    await refreshAll();
    setSelectedTicket((prev) => (prev && prev.id === id ? updated : prev));
  }, [currentProjectId, refreshAll]);

  const addTicketComment = useCallback(async (id: string, text: string) => {
    if (!text.trim()) return;
    await ticketApi.addComment(currentProjectId, id, text.trim());
    await refreshAll();
    const detailed = await ticketApi.getTicketById(currentProjectId, id);
    setSelectedTicket((prev) => (prev && prev.id === id ? detailed : prev));
  }, [currentProjectId, refreshAll]);

  return (
    <TicketContext.Provider
      value={{
        tickets,
        summaryTickets,
        users,
        currentUser,
        selectedTicket,
        allActivity,
        loading,
        setSelectedTicket,
        refreshAll,
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

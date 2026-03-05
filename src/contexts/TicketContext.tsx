import React, { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { ActivityEvent, Ticket, TicketStatus, User } from '@/data/models';
import { ticketApi } from '@/services/ticketApi';
import { getRequesterUserId } from '@/services/controlApi';

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
  createTicket: (ticket: Omit<Ticket, 'id' | 'createdAt' | 'updatedAt' | 'comments' | 'activity' | 'starred'>) => Promise<void>;
  toggleStar: (id: string) => Promise<void>;
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
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [summaryTickets, setSummaryTickets] = useState<Ticket[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [allActivity, setAllActivity] = useState<ActivityEvent[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(true);

  const currentUser = useMemo(() => {
    const requesterId = getRequesterUserId();
    return users.find((user) => user.id === requesterId) || fallbackCurrentUser;
  }, [users]);

  const refreshAll = useCallback(async () => {
    setLoading(true);
    try {
      const [userData, ticketData, summaryData, activityData] = await Promise.all([
        ticketApi.getUsers(),
        ticketApi.getTickets(),
        ticketApi.getSummary(),
        ticketApi.getActivity(),
      ]);
      setUsers(userData);
      setTickets(ticketData);
      setSummaryTickets(summaryData);
      setAllActivity(activityData);
    } catch (error) {
      setUsers([]);
      setTickets([]);
      setSummaryTickets([]);
      setAllActivity([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  const updateTicketStatus = useCallback(async (id: string, status: TicketStatus) => {
    await ticketApi.updateStatus(id, status, Number(currentUser.id));
    await refreshAll();

    setSelectedTicket((prev) => {
      if (!prev || prev.id !== id) return prev;
      return { ...prev, status };
    });
  }, [currentUser.id, refreshAll]);

  const createTicket = useCallback(async (data: Omit<Ticket, 'id' | 'createdAt' | 'updatedAt' | 'comments' | 'activity' | 'starred'>) => {
    await ticketApi.createTicket({
      title: data.title,
      description: data.description,
      department: data.department,
      type: data.type,
      priority: data.priority,
      status: data.status,
      assigneeId: data.assignee ? Number(data.assignee.id) : null,
      reporterId: Number(currentUser.id),
      dueDate: data.dueDate,
    });
    await refreshAll();
  }, [currentUser.id, refreshAll]);

  const toggleStar = useCallback(async (id: string) => {
    const ticket = tickets.find((t) => t.id === id);
    if (!ticket) return;

    await ticketApi.updateStar(id, !ticket.starred, Number(currentUser.id));
    await refreshAll();
  }, [currentUser.id, refreshAll, tickets]);

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
        toggleStar,
      }}
    >
      {children}
    </TicketContext.Provider>
  );
};

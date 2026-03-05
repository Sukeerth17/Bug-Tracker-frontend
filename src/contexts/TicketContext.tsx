import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { Ticket, TicketStatus, ActivityEvent } from '@/data/mockData';

interface TicketContextType {
  tickets: Ticket[];
  selectedTicket: Ticket | null;
  setSelectedTicket: (ticket: Ticket | null) => void;
  updateTicketStatus: (id: string, status: TicketStatus) => void;
  createTicket: (ticket: Omit<Ticket, 'id' | 'createdAt' | 'updatedAt' | 'comments' | 'activity' | 'starred'>) => void;
  toggleStar: (id: string) => void;
  allActivity: ActivityEvent[];
}

const TicketContext = createContext<TicketContextType | null>(null);

export const useTickets = () => {
  const ctx = useContext(TicketContext);
  if (!ctx) throw new Error('useTickets must be used within TicketProvider');
  return ctx;
};

let nextId = 13;

export const TicketProvider = ({ children }: { children: ReactNode }) => {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);

  const updateTicketStatus = useCallback((id: string, status: TicketStatus) => {
    setTickets(prev => prev.map(t => {
      if (t.id !== id) return t;
      const event: ActivityEvent = {
        id: `a-${Date.now()}`, user: t.assignee ?? t.reporter, action: 'changed status',
        field: 'status', oldValue: t.status, newValue: status,
        createdAt: new Date().toISOString(), ticketId: t.id, ticketTitle: t.title,
      };
      return { ...t, status, updatedAt: new Date().toISOString(), activity: [...t.activity, event] };
    }));
    if (selectedTicket?.id === id) {
      setSelectedTicket(prev => prev ? { ...prev, status } : null);
    }
  }, [selectedTicket]);

  const createTicket = useCallback((data: Omit<Ticket, 'id' | 'createdAt' | 'updatedAt' | 'comments' | 'activity' | 'starred'>) => {
    const id = `BT-${nextId++}`;
    const ticket: Ticket = {
      ...data, id, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
      starred: false, comments: [],
      activity: [{ id: `a-${Date.now()}`, user: data.reporter, action: 'created ticket', createdAt: new Date().toISOString(), ticketId: id, ticketTitle: data.title }],
    };
    setTickets(prev => [ticket, ...prev]);
  }, []);

  const toggleStar = useCallback((id: string) => {
    setTickets(prev => prev.map(t => t.id === id ? { ...t, starred: !t.starred } : t));
  }, []);

  const allActivity = tickets.flatMap(t => t.activity).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return (
    <TicketContext.Provider value={{ tickets, selectedTicket, setSelectedTicket, updateTicketStatus, createTicket, toggleStar, allActivity }}>
      {children}
    </TicketContext.Provider>
  );
};

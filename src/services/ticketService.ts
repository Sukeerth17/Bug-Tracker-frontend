// Service layer abstraction — all data access goes through here.
// Currently uses local state. Replace implementations with API calls later.

import { Ticket, TicketStatus, TicketPriority, TicketType, Department, User, initialTickets } from '@/data/mockData';

let tickets = [...initialTickets];
let nextId = 13;

export const ticketService = {
  getAll: (): Ticket[] => [...tickets],

  getById: (id: string): Ticket | undefined => tickets.find(t => t.id === id),

  create: (data: Omit<Ticket, 'id' | 'createdAt' | 'updatedAt' | 'comments' | 'activity' | 'starred'>): Ticket => {
    const ticket: Ticket = {
      ...data,
      id: `BT-${nextId++}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      starred: false,
      comments: [],
      activity: [{ id: `a-${Date.now()}`, user: data.reporter, action: 'created ticket', createdAt: new Date().toISOString(), ticketId: `BT-${nextId - 1}`, ticketTitle: data.title }],
    };
    tickets = [ticket, ...tickets];
    return ticket;
  },

  update: (id: string, updates: Partial<Ticket>): Ticket | undefined => {
    const idx = tickets.findIndex(t => t.id === id);
    if (idx === -1) return undefined;
    tickets[idx] = { ...tickets[idx], ...updates, updatedAt: new Date().toISOString() };
    return tickets[idx];
  },

  updateStatus: (id: string, status: TicketStatus, user: User): Ticket | undefined => {
    const ticket = tickets.find(t => t.id === id);
    if (!ticket) return undefined;
    const oldStatus = ticket.status;
    ticket.status = status;
    ticket.updatedAt = new Date().toISOString();
    ticket.activity.push({
      id: `a-${Date.now()}`, user, action: 'changed status', field: 'status',
      oldValue: oldStatus, newValue: status, createdAt: new Date().toISOString(),
      ticketId: id, ticketTitle: ticket.title,
    });
    return ticket;
  },

  toggleStar: (id: string): boolean => {
    const ticket = tickets.find(t => t.id === id);
    if (!ticket) return false;
    ticket.starred = !ticket.starred;
    return ticket.starred;
  },

  delete: (id: string): boolean => {
    const len = tickets.length;
    tickets = tickets.filter(t => t.id !== id);
    return tickets.length < len;
  },
};

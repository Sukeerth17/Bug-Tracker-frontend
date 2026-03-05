import React from 'react';
import { useTickets } from '@/contexts/TicketContext';
import { StatusBadge, PriorityIcon, TypeIcon, DeptBadge } from '@/components/TicketBadges';
import { formatDistanceToNow } from 'date-fns';

const RecentPage = () => {
  const { tickets, setSelectedTicket } = useTickets();
  const recent = [...tickets].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()).slice(0, 10);

  return (
    <div className="p-6 space-y-4 max-w-4xl mx-auto">
      <h1 className="text-xl font-semibold">Recent</h1>
      <div className="space-y-2">
        {recent.map(ticket => (
          <button
            key={ticket.id}
            onClick={() => setSelectedTicket(ticket)}
            className="w-full flex items-center gap-3 bg-card border rounded-lg p-3 hover:shadow-md transition-all text-left"
          >
            <TypeIcon type={ticket.type} />
            <span className="font-mono text-xs text-muted-foreground">{ticket.id}</span>
            <span className="text-sm font-medium flex-1 truncate">{ticket.title}</span>
            <span className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(ticket.updatedAt), { addSuffix: true })}</span>
            <StatusBadge status={ticket.status} />
          </button>
        ))}
      </div>
    </div>
  );
};

export default RecentPage;

import React from 'react';
import { useTickets } from '@/contexts/TicketContext';
import { StatusBadge, PriorityIcon, TypeIcon, DeptBadge } from '@/components/TicketBadges';
import { Star } from 'lucide-react';

const StarredPage = () => {
  const { tickets, setSelectedTicket, toggleStar } = useTickets();
  const starred = tickets.filter(t => t.starred);

  return (
    <div className="p-6 space-y-4 max-w-4xl mx-auto">
      <h1 className="text-xl font-semibold">Starred</h1>
      <div className="space-y-2">
        {starred.map(ticket => (
          <div key={ticket.id} className="flex items-center gap-3 bg-card border rounded-lg p-3 hover:shadow-md transition-all">
            <button onClick={() => toggleStar(ticket.id)} className="text-warning"><Star className="h-4 w-4 fill-current" /></button>
            <TypeIcon type={ticket.type} />
            <span className="font-mono text-xs text-muted-foreground">{ticket.id}</span>
            <button onClick={() => setSelectedTicket(ticket)} className="text-sm font-medium flex-1 truncate text-left hover:text-primary transition-colors">{ticket.title}</button>
            <DeptBadge department={ticket.department} />
            <PriorityIcon priority={ticket.priority} />
            <StatusBadge status={ticket.status} />
          </div>
        ))}
        {starred.length === 0 && <p className="text-sm text-muted-foreground py-8 text-center">No starred tickets.</p>}
      </div>
    </div>
  );
};

export default StarredPage;

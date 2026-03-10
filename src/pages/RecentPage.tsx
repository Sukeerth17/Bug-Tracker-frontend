import React, { useEffect, useMemo, useState } from 'react';
import { useTickets } from '@/contexts/TicketContext';
import { StatusBadge, TypeIcon } from '@/components/TicketBadges';
import { formatDistanceToNow } from 'date-fns';
import { Ticket } from '@/data/models';
import { useLocation } from 'react-router-dom';
import { resolveProjectId } from '@/services/projectControl';
import { ticketApi } from '@/services/ticketApi';

const RecentPage = () => {
  const { setSelectedTicket } = useTickets();
  const location = useLocation();
  const projectId = useMemo(() => resolveProjectId(location.pathname), [location.pathname]);
  const [recent, setRecent] = useState<Ticket[]>([]);

  useEffect(() => {
    if (!projectId) {
      setRecent([]);
      return;
    }

    ticketApi.getRecent(projectId)
      .then((res) => setRecent(res))
      .catch(() => setRecent([]));
  }, [projectId]);

  return (
    <div className="p-6 space-y-4 max-w-4xl mx-auto">
      <h1 className="text-xl font-semibold">Recent</h1>
      <div className="space-y-2">
        {recent.map((ticket) => (
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

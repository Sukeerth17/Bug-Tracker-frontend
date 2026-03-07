import React, { useEffect, useMemo, useState } from 'react';
import { useTickets } from '@/contexts/TicketContext';
import { StatusBadge, PriorityIcon, TypeIcon, DeptBadge } from '@/components/TicketBadges';
import { Ticket } from '@/data/models';
import { useLocation } from 'react-router-dom';
import { resolveProjectId } from '@/services/projectControl';
import { ticketApi } from '@/services/ticketApi';

const ForYouPage = () => {
  const { setSelectedTicket, currentUser } = useTickets();
  const location = useLocation();
  const projectId = useMemo(() => resolveProjectId(location.pathname), [location.pathname]);
  const [myTickets, setMyTickets] = useState<Ticket[]>([]);

  useEffect(() => {
    if (!projectId || !currentUser.id) {
      setMyTickets([]);
      return;
    }

    ticketApi.queryTickets(projectId, {
      assigneeId: Number(currentUser.id),
      sortBy: 'updatedAt',
      sortDir: 'desc',
      page: 0,
      size: 200,
    })
      .then((res) => setMyTickets(res.items))
      .catch(() => setMyTickets([]));
  }, [projectId, currentUser.id]);

  return (
    <div className="p-6 space-y-4 max-w-4xl mx-auto">
      <h1 className="text-xl font-semibold">For You</h1>
      <p className="text-sm text-muted-foreground">Tickets assigned to you ({myTickets.length})</p>
      <div className="space-y-2">
        {myTickets.map((ticket) => (
          <button
            key={ticket.id}
            onClick={() => setSelectedTicket(ticket)}
            className="w-full flex items-center gap-3 bg-card border rounded-lg p-3 hover:shadow-md transition-all text-left"
          >
            <TypeIcon type={ticket.type} />
            <span className="font-mono text-xs text-muted-foreground">{ticket.id}</span>
            <span className="text-sm font-medium flex-1 truncate">{ticket.title}</span>
            <DeptBadge department={ticket.department} />
            <PriorityIcon priority={ticket.priority} />
            <StatusBadge status={ticket.status} />
          </button>
        ))}
        {myTickets.length === 0 && <p className="text-sm text-muted-foreground py-8 text-center">No tickets assigned to you.</p>}
      </div>
    </div>
  );
};

export default ForYouPage;

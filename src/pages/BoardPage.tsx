import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, NavLink, useLocation } from 'react-router-dom';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { useTickets } from '@/contexts/TicketContext';
import { TypeIcon, PriorityIcon, DeptBadge, AssigneeStack } from '@/components/TicketBadges';
import TicketMenu from '@/components/TicketMenu';
import type { Ticket, TicketStatus } from '@/data/models';
import { statusLabels } from '@/data/models';
import { cn } from '@/lib/utils';
import { Plus, CheckCircle2, Paperclip } from 'lucide-react';
import { motion } from 'framer-motion';
import ConfirmationModal from '@/components/ConfirmationModal';
import { toast } from '@/components/ui/sonner';
import { resolveProjectId } from '@/services/projectControl';
import { ticketApi } from '@/services/ticketApi';

const columns: { id: TicketStatus; label: string; color: string }[] = [
  { id: 'todo', label: 'TO DO', color: '#94a3b8' },
  { id: 'in-progress', label: 'IN PROGRESS', color: '#3b82f6' },
  { id: 'in-review', label: 'IN REVIEW', color: '#f59e0b' },
  { id: 'done', label: 'DONE', color: '#22c55e' },
];

const BoardPage = () => {
  const { spaceId, featureId } = useParams();
  const location = useLocation();
  const projectId = useMemo(() => resolveProjectId(location.pathname), [location.pathname]);
  const { setSelectedTicket, updateTicketStatus } = useTickets();
  const isFeatureView = Boolean(featureId);
  const [boardTickets, setBoardTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(false);
  const [assigneeFilter, setAssigneeFilter] = useState<'all' | 'unassigned'>('all');
  const [settleTicketId, setSettleTicketId] = useState<string | null>(null);
  const [pendingMove, setPendingMove] = React.useState<{
    ticketId: string;
    title: string;
    fromStatus: TicketStatus;
    toStatus: TicketStatus;
  } | null>(null);

  const grouped = columns.map(col => ({
    ...col,
    tickets: boardTickets.filter(t => t.status === col.id),
  }));

  const loadBoard = useCallback(async () => {
    if (!projectId) {
      setBoardTickets([]);
      return;
    }
    setLoading(true);
    try {
      const response = await ticketApi.queryTickets(projectId, {
        featureId: featureId || undefined,
        assigneeId: assigneeFilter === 'unassigned' ? 0 : undefined,
        sortBy: 'updatedAt',
        sortDir: 'desc',
        page: 0,
        size: 500,
      });
      setBoardTickets(response.items);
    } catch {
      setBoardTickets([]);
    } finally {
      setLoading(false);
    }
  }, [projectId, featureId, assigneeFilter]);

  useEffect(() => {
    loadBoard();
  }, [loadBoard]);

  useEffect(() => {
    const handler = () => loadBoard();
    window.addEventListener('ticket:created', handler as EventListener);
    window.addEventListener('ticket:updated', handler as EventListener);
    return () => {
      window.removeEventListener('ticket:created', handler as EventListener);
      window.removeEventListener('ticket:updated', handler as EventListener);
    };
  }, [loadBoard]);

  const onDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    const fromStatus = result.source.droppableId as TicketStatus;
    const toStatus = result.destination.droppableId as TicketStatus;
    if (fromStatus === toStatus) return;
    const ticket = boardTickets.find(t => t.id === result.draggableId);
    if (!ticket) return;
    setPendingMove({
      ticketId: ticket.id,
      title: ticket.title,
      fromStatus,
      toStatus,
    });
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {spaceId && (
            <div className="inline-flex items-center rounded-lg border bg-muted/40 p-1 text-xs">
              <NavLink
                to={featureId ? `/space/${spaceId}/feature/${featureId}/board` : `/space/${spaceId}/board`}
                className={({ isActive }) => cn(
                  'px-3 py-1 rounded-md transition-colors',
                  isActive ? 'bg-card text-foreground shadow' : 'text-muted-foreground hover:text-foreground'
                )}
              >
                Board
              </NavLink>
              <NavLink
                to={featureId ? `/space/${spaceId}/feature/${featureId}/list` : `/space/${spaceId}/list`}
                className={({ isActive }) => cn(
                  'px-3 py-1 rounded-md transition-colors',
                  isActive ? 'bg-card text-foreground shadow' : 'text-muted-foreground hover:text-foreground'
                )}
              >
                List
              </NavLink>
            </div>
          )}
          <h1 className="text-xl font-semibold">Board</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setAssigneeFilter((prev) => (prev === 'unassigned' ? 'all' : 'unassigned'))}
            className={cn(
              'h-8 px-3 rounded-md border text-xs font-medium transition-colors',
              assigneeFilter === 'unassigned' ? 'bg-primary text-primary-foreground border-primary' : 'hover:bg-accent'
            )}
          >
            {assigneeFilter === 'unassigned' ? 'Showing Unassigned' : 'Filter Unassigned'}
          </button>
        </div>
      </div>
      {loading && <div className="text-xs text-muted-foreground">Loading board...</div>}
      <DragDropContext onDragEnd={onDragEnd}>
        <div className="flex gap-4 overflow-x-auto pb-4">
          {grouped.map(col => (
            <Droppable key={col.id} droppableId={col.id}>
              {(provided, snapshot) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className={cn(
                    'flex-shrink-0 w-72 rounded-xl bg-muted/40 border-2 border-muted-foreground/20 flex flex-col transition-colors',
                    snapshot.isDraggingOver && 'bg-primary/5 border-primary/30'
                  )}
                >
                  <div className="flex items-center gap-2 px-3 py-3 border-b">
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: col.color }} />
                    <span className="text-xs font-bold tracking-wide">{col.label}</span>
                    <span className="text-xs text-muted-foreground ml-auto bg-muted rounded-full px-2 py-0.5">{col.tickets.length}</span>
                    {col.id === 'done' && <CheckCircle2 className="h-3.5 w-3.5 text-success" />}
                  </div>

                  <div className="p-2 space-y-2 flex-1 min-h-[200px]">
                    {loading && col.tickets.length === 0 && (
                      <>
                        {Array.from({ length: 3 }).map((_, idx) => (
                          <div key={idx} className="h-20 rounded-lg bg-muted/60 animate-pulse" />
                        ))}
                      </>
                    )}
                    {col.tickets.map((ticket, index) => (
                      <Draggable key={ticket.id} draggableId={ticket.id} index={index}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            onClick={() => setSelectedTicket(ticket)}
                          >
                            <motion.div
                              layout
                              layoutId={`ticket-${ticket.id}`}
                              transition={{ duration: 0.35, ease: 'easeInOut' }}
                              animate={settleTicketId === ticket.id ? { scale: [1, 1.03, 1] } : { scale: 1 }}
                              className={cn(
                                'bg-card rounded-lg border p-3 cursor-pointer hover:shadow-md transition-all duration-150',
                                snapshot.isDragging && 'shadow-lg ring-2 ring-primary/20 rotate-1'
                              )}
                            >
                              <div className="flex items-start justify-between gap-2 mb-2">
                                <p className="text-sm font-medium leading-snug">{ticket.title}</p>
                                <TicketMenu ticket={ticket} projectId={projectId || ticket.projectId} className="shrink-0" />
                              </div>
                              <div className="flex items-center gap-1.5 mb-2 flex-wrap">
                                <span className="inline-flex items-center rounded-full border bg-muted/50 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                                  {ticket.projectId}
                                </span>
                                {ticket.featureName && (
                                  <span className="inline-flex items-center rounded-full border bg-muted/50 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                                    {ticket.featureName}
                                  </span>
                                )}
                                <DeptBadge department={ticket.department} />
                                <PriorityIcon priority={ticket.priority} />
                              </div>
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-1">
                                  <TypeIcon type={ticket.type} />
                                  <span className="font-mono text-[10px] text-muted-foreground">{ticket.id}</span>
                                  {ticket.attachments.length > 0 && (
                                    <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                                      <Paperclip className="h-3 w-3" />
                                      {ticket.attachments.length}
                                    </span>
                                  )}
                                </div>
                                <AssigneeStack assignees={ticket.assignees} />
                              </div>
                            </motion.div>
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>

                  <button
                    onClick={() => window.dispatchEvent(new CustomEvent('ticket:new', { detail: { status: col.id } }))}
                    className="flex items-center gap-1.5 px-3 py-2 text-xs text-muted-foreground hover:text-foreground transition-colors border-t"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Create
                  </button>
                </div>
              )}
            </Droppable>
          ))}
        </div>
      </DragDropContext>
      {!loading && boardTickets.length === 0 && (
        <div className="mt-6 rounded-xl border bg-card p-6 text-center">
          <p className="text-sm font-medium">No tickets yet</p>
          <p className="text-xs text-muted-foreground mt-1">Create your first ticket to start tracking work.</p>
          <button
            onClick={() => window.dispatchEvent(new CustomEvent('ticket:new', { detail: { status: 'todo' } }))}
            className="mt-3 inline-flex items-center gap-1.5 h-8 px-3 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            Create Ticket
          </button>
        </div>
      )}
      <ConfirmationModal
        isOpen={!!pendingMove}
        title="Move Ticket"
        message={pendingMove
          ? `Are you sure you want to move '${pendingMove.title}' from '${statusLabels[pendingMove.fromStatus]}' to '${statusLabels[pendingMove.toStatus]}'?`
          : ''}
        confirmLabel="Yes, Move It"
        cancelLabel="Cancel"
        variant="info"
        onConfirm={async () => {
          if (!pendingMove) return;
          const { ticketId, toStatus } = pendingMove;
          setPendingMove(null);
          if (projectId) {
            await updateTicketStatus(projectId, ticketId, toStatus);
          }
          await loadBoard();
          setSettleTicketId(ticketId);
          setTimeout(() => setSettleTicketId(null), 500);
          toast(`Ticket moved to ${statusLabels[toStatus]}`);
        }}
        onCancel={() => setPendingMove(null)}
      />
    </div>
  );
};

export default BoardPage;

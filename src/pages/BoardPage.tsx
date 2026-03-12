import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, NavLink, useLocation } from 'react-router-dom';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { useTickets } from '@/contexts/TicketContext';
import { TypeIcon, PriorityIcon, DeptBadge, UserAvatar, GhostAvatar } from '@/components/TicketBadges';
import type { Ticket, TicketStatus } from '@/data/models';
import { statusLabels } from '@/data/models';
import { cn } from '@/lib/utils';
import { Plus, CheckCircle2, Paperclip } from 'lucide-react';
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
  }, [projectId, featureId]);

  useEffect(() => {
    loadBoard();
  }, [loadBoard]);

  useEffect(() => {
    const handler = () => loadBoard();
    window.addEventListener('ticket:created', handler as EventListener);
    return () => window.removeEventListener('ticket:created', handler as EventListener);
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
                    {col.tickets.map((ticket, index) => (
                      <Draggable key={ticket.id} draggableId={ticket.id} index={index}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            onClick={() => setSelectedTicket(ticket)}
                            className={cn(
                              'bg-card rounded-lg border p-3 cursor-pointer hover:shadow-md transition-all duration-150',
                              snapshot.isDragging && 'shadow-lg ring-2 ring-primary/20 rotate-1'
                            )}
                          >
                            <p className="text-sm font-medium leading-snug mb-2">{ticket.title}</p>
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
                              {ticket.assignees.length > 0 ? (
                                <div className="inline-flex items-center gap-1">
                                  <UserAvatar name={ticket.assignees[0].name} avatar={ticket.assignees[0].avatar} />
                                  {ticket.assignees.length > 1 && (
                                    <span className="text-[10px] text-muted-foreground">+{ticket.assignees.length - 1}</span>
                                  )}
                                </div>
                              ) : (
                                <GhostAvatar />
                              )}
                            </div>
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
          toast(`Ticket moved to ${statusLabels[toStatus]}`);
        }}
        onCancel={() => setPendingMove(null)}
      />
    </div>
  );
};

export default BoardPage;

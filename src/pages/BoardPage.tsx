import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, NavLink, useLocation, useSearchParams } from 'react-router-dom';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { useTickets } from '@/contexts/TicketContext';
import { TypeIcon, PriorityIcon, DeptBadge, AssigneeStack } from '@/components/TicketBadges';
import TicketMenu from '@/components/TicketMenu';
import type { Ticket, TicketStatus } from '@/data/models';
import { statusLabels } from '@/data/models';
import { cn } from '@/lib/utils';
import { Plus, CheckCircle2, Paperclip } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import ConfirmationModal from '@/components/ConfirmationModal';
import { toast } from '@/components/ui/sonner';
import { resolveProjectId } from '@/services/projectControl';
import { ticketApi } from '@/services/ticketApi';
import TypeFilterPopover from '@/components/TypeFilterPopover';
import AssigneeFilterPopover from '@/components/AssigneeFilterPopover';
import type { TicketType, User } from '@/data/models';

const columns: { id: TicketStatus; label: string; color: string }[] = [
  { id: 'todo', label: 'TO DO', color: '#94a3b8' },
  { id: 'in-progress', label: 'IN PROGRESS', color: '#3b82f6' },
  { id: 'in-review', label: 'IN REVIEW', color: '#f59e0b' },
  { id: 'done', label: 'DONE', color: '#22c55e' },
];

const CARD_HEIGHT = 140;
const CARD_GAP = 8;

type FloatingTicketState = {
  ticket: Ticket;
  toStatus: TicketStatus;
  originRect: { top: number; left: number; width: number; height: number };
  destinationRect: { top: number; left: number; width: number; height: number };
  phase: 'lift' | 'travel';
};

const TicketCard = ({
  ticket,
  projectId,
  onClick,
  className,
  menuEnabled = true,
}: {
  ticket: Ticket;
  projectId?: string;
  onClick?: () => void;
  className?: string;
  menuEnabled?: boolean;
}) => (
  <div
    onClick={onClick}
    className={cn('bg-card rounded-lg border p-3 cursor-pointer', className)}
  >
    <div className="flex items-start justify-between gap-2 mb-2">
      <p className="text-sm font-medium leading-snug">{ticket.title}</p>
      {menuEnabled ? (
        <TicketMenu ticket={ticket} projectId={projectId || ticket.projectId} className="shrink-0" />
      ) : (
        <div className="h-7 w-7 shrink-0" />
      )}
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
  </div>
);

const BoardPage = () => {
  const { spaceId, featureId } = useParams();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const projectId = spaceId || resolveProjectId(location.pathname);
  const searchTerm = searchParams.get('search')?.trim() || '';
  const { setSelectedTicket, updateTicketStatus } = useTickets();
  const isFeatureView = Boolean(featureId);
  const [boardTickets, setBoardTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(false);
  const [assigneeFilter, setAssigneeFilter] = useState<{ assigneeIds: string[]; unassigned: boolean }>({
    assigneeIds: searchParams.get('assigneeIds')?.split(',').filter(Boolean) || [],
    unassigned: searchParams.get('unassigned') === 'true',
  });
  const [typeFilter, setTypeFilter] = useState<TicketType[]>(searchParams.get('types')?.split(',').filter(Boolean) as TicketType[] || []);
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [settleTicketId, setSettleTicketId] = useState<string | null>(null);
  const [movingTicketId, setMovingTicketId] = useState<string | null>(null);
  const [ghostColumn, setGhostColumn] = useState<TicketStatus | null>(null);
  const [floatingTicket, setFloatingTicket] = useState<FloatingTicketState | null>(null);
  const [pendingMove, setPendingMove] = React.useState<{
    ticketId: string;
    title: string;
    fromStatus: TicketStatus;
    toStatus: TicketStatus;
  } | null>(null);
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const columnRefs = useRef<Record<TicketStatus, HTMLDivElement | null>>({
    'todo': null,
    'in-progress': null,
    'in-review': null,
    'done': null,
  });
  const timeoutsRef = useRef<number[]>([]);

  const grouped = columns.map(col => ({
    ...col,
    tickets: boardTickets.filter(t => t.status === col.id && t.id !== movingTicketId),
  }));

  useEffect(() => {
    if (!projectId) {
      setAvailableUsers([]);
      return;
    }
    ticketApi.queryTickets(projectId, {
      featureId: featureId || undefined,
      search: searchTerm || undefined,
      types: typeFilter.length > 0 ? typeFilter : undefined,
      sortBy: 'updatedAt',
      sortDir: 'desc',
      page: 0,
      size: 50,
    })
      .then((response) => {
        const users = new Map<string, User>();
        response.items.forEach((ticket) => {
          ticket.assignees.forEach((assignee) => users.set(assignee.id, assignee));
        });
        setAvailableUsers(Array.from(users.values()).sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })));
      })
      .catch(() => setAvailableUsers([]));
  }, [projectId, featureId, searchTerm, typeFilter]);

  const clearAnimationTimers = () => {
    timeoutsRef.current.forEach((timeoutId) => window.clearTimeout(timeoutId));
    timeoutsRef.current = [];
  };

  useEffect(() => {
    return () => clearAnimationTimers();
  }, []);

  const loadBoard = useCallback(async () => {
    if (!projectId) {
      setBoardTickets([]);
      return;
    }
    setLoading(true);
    window.dispatchEvent(new CustomEvent('ticket:context-search-loading', { detail: { loading: true } }));
    try {
      const response = await ticketApi.queryTickets(projectId, {
        featureId: featureId || undefined,
        q: searchTerm || undefined,
        search: searchTerm || undefined,
        assigneeIds: assigneeFilter.assigneeIds.length > 0 ? assigneeFilter.assigneeIds.map(Number) : undefined,
        unassigned: assigneeFilter.unassigned,
        types: typeFilter.length > 0 ? typeFilter : undefined,
        sortBy: 'updatedAt',
        sortDir: 'desc',
        page: 0,
        size: 50,
      });
      setBoardTickets(response.items);
    } catch {
      setBoardTickets([]);
    } finally {
      setLoading(false);
      window.dispatchEvent(new CustomEvent('ticket:context-search-loading', { detail: { loading: false } }));
    }
  }, [projectId, featureId, searchTerm, assigneeFilter, typeFilter]);

  useEffect(() => {
    const next = new URLSearchParams(searchParams);
    if (typeFilter.length > 0) next.set('types', typeFilter.join(','));
    else next.delete('types');
    if (assigneeFilter.assigneeIds.length > 0) next.set('assigneeIds', assigneeFilter.assigneeIds.join(','));
    else next.delete('assigneeIds');
    if (assigneeFilter.unassigned) next.set('unassigned', 'true');
    else next.delete('unassigned');
    if (searchTerm) next.set('search', searchTerm);
    else next.delete('search');
    setSearchParams(next, { replace: true });
  }, [searchTerm, typeFilter, assigneeFilter, searchParams, setSearchParams]);

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
          <TypeFilterPopover value={typeFilter} onApply={setTypeFilter} />
          <AssigneeFilterPopover users={availableUsers} value={assigneeFilter} onApply={setAssigneeFilter} />
        </div>
      </div>
      {loading && <div className="text-xs text-muted-foreground">Loading board...</div>}
      <DragDropContext onDragEnd={onDragEnd}>
        <div className="flex gap-4 overflow-x-auto pb-4">
          {grouped.map(col => (
            <Droppable key={col.id} droppableId={col.id}>
              {(provided, snapshot) => (
                <div
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

                  <motion.div
                    ref={(node) => {
                      provided.innerRef(node);
                      columnRefs.current[col.id] = node;
                    }}
                    {...provided.droppableProps}
                    layout
                    transition={{ duration: 0.25, ease: 'easeInOut' }}
                    className="p-2 space-y-2 flex-1 min-h-[200px]"
                  >
                    {loading && col.tickets.length === 0 && (
                      <>
                        {Array.from({ length: 3 }).map((_, idx) => (
                          <div key={idx} className="h-20 rounded-lg bg-muted/60 animate-pulse" />
                        ))}
                      </>
                    )}
                    <AnimatePresence initial={false}>
                      {ghostColumn === col.id && (
                        <motion.div
                          key={`ghost-${col.id}`}
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: CARD_HEIGHT, opacity: 0.3 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2, ease: 'easeOut' }}
                          className="overflow-hidden rounded-lg border-2 border-dashed border-primary/50 bg-primary/5"
                        >
                          <div className="h-[140px] rounded-lg" />
                        </motion.div>
                      )}
                    </AnimatePresence>
                    {col.tickets.map((ticket, index) => (
                      <Draggable key={ticket.id} draggableId={ticket.id} index={index}>
                        {(provided, snapshot) => (
                          <div
                            ref={(node) => {
                              provided.innerRef(node);
                              cardRefs.current[ticket.id] = node;
                            }}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            onClick={() => setSelectedTicket(ticket)}
                          >
                            <motion.div
                              layout
                              transition={{ layout: { duration: 0.25, ease: 'easeInOut' } }}
                              animate={settleTicketId === ticket.id ? {
                                scale: [1, 1.045, 0.995, 1.02, 1],
                                y: [0, -8, 2, -2, 0],
                                rotate: [0, -0.6, 0.4, 0],
                                boxShadow: [
                                  '0 1px 2px rgba(15, 23, 42, 0.08)',
                                  '0 18px 36px rgba(34, 197, 94, 0.18)',
                                  '0 10px 20px rgba(59, 130, 246, 0.10)',
                                  '0 1px 2px rgba(15, 23, 42, 0.08)',
                                ],
                              } : {
                                scale: 1,
                                y: 0,
                                rotate: 0,
                                boxShadow: '0 1px 2px rgba(15, 23, 42, 0.08)',
                              }}
                              className={cn(
                                'hover:shadow-md transition-all duration-150',
                                snapshot.isDragging && 'shadow-lg ring-2 ring-primary/20 rotate-1'
                              )}
                            >
                              <TicketCard ticket={ticket} projectId={projectId || ticket.projectId} />
                            </motion.div>
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </motion.div>

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
      <AnimatePresence>
        {floatingTicket && (
          <motion.div
            key={`floating-${floatingTicket.ticket.id}`}
            initial={{
              top: floatingTicket.originRect.top,
              left: floatingTicket.originRect.left,
              width: floatingTicket.originRect.width,
              height: floatingTicket.originRect.height,
              scale: 1,
              rotate: 0,
              boxShadow: '0 4px 10px rgba(15, 23, 42, 0.08)',
            }}
            animate={floatingTicket.phase === 'lift'
              ? {
                  top: floatingTicket.originRect.top,
                  left: floatingTicket.originRect.left,
                  width: floatingTicket.originRect.width,
                  height: floatingTicket.originRect.height,
                  scale: 1.05,
                  rotate: 1.5,
                  boxShadow: '0 28px 65px rgba(15, 23, 42, 0.32)',
                }
              : {
                  top: floatingTicket.destinationRect.top,
                  left: floatingTicket.destinationRect.left,
                  width: floatingTicket.destinationRect.width,
                  height: floatingTicket.destinationRect.height,
                  scale: 1.05,
                  rotate: 1.5,
                  boxShadow: '0 28px 65px rgba(15, 23, 42, 0.32)',
                }}
            exit={{
              top: floatingTicket.destinationRect.top,
              left: floatingTicket.destinationRect.left,
              width: floatingTicket.destinationRect.width,
              height: floatingTicket.destinationRect.height,
              scale: [1.02, 1.04, 1],
              rotate: [0.6, 0],
              boxShadow: [
                '0 20px 40px rgba(15, 23, 42, 0.18)',
                '0 10px 20px rgba(34, 197, 94, 0.16)',
                '0 4px 10px rgba(15, 23, 42, 0.08)',
              ],
              opacity: [1, 1, 0],
            }}
            transition={floatingTicket.phase === 'lift'
              ? { duration: 0.2, ease: 'easeOut' }
              : { duration: 0.45, ease: [0.25, 0.46, 0.45, 0.94] }}
            style={{
              position: 'fixed',
              zIndex: 9999,
              pointerEvents: 'none',
            }}
            className="origin-center"
          >
            <TicketCard
              ticket={floatingTicket.ticket}
              projectId={projectId || floatingTicket.ticket.projectId}
              className="shadow-2xl"
              menuEnabled={false}
            />
          </motion.div>
        )}
      </AnimatePresence>
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
          clearAnimationTimers();
          const { ticketId, toStatus } = pendingMove;
          const ticket = boardTickets.find((item) => item.id === ticketId);
          const originNode = cardRefs.current[ticketId];
          const destinationColumn = columnRefs.current[toStatus];
          setPendingMove(null);
          if (!ticket || !originNode || !destinationColumn) {
            if (projectId) {
              try {
                await updateTicketStatus(projectId, ticketId, toStatus);
              } catch {
                toast('Failed to move ticket');
                return;
              }
            }
            await loadBoard();
            setSettleTicketId(ticketId);
            const settleTimeout = window.setTimeout(() => setSettleTicketId(null), 420);
            timeoutsRef.current.push(settleTimeout);
            toast(`Ticket moved to ${statusLabels[toStatus]}`);
            return;
          }

          const previousTickets = boardTickets;
          const originRect = originNode.getBoundingClientRect();
          const destinationRect = destinationColumn.getBoundingClientRect();
          const destinationTicketCount = boardTickets.filter((item) => item.status === toStatus && item.id !== ticketId).length;
          const targetTop = destinationRect.top + 8 + destinationTicketCount * (CARD_HEIGHT + CARD_GAP);
          const targetLeft = destinationRect.left + 8;
          const targetWidth = destinationRect.width - 16;

          setFloatingTicket({
            ticket,
            toStatus,
            originRect: {
              top: originRect.top,
              left: originRect.left,
              width: originRect.width,
              height: originRect.height,
            },
            destinationRect: {
              top: targetTop,
              left: targetLeft,
              width: targetWidth,
              height: originRect.height,
            },
            phase: 'lift',
          });

          const liftTimeout = window.setTimeout(() => {
            setMovingTicketId(ticketId);
            setFloatingTicket((prev) => prev ? { ...prev, phase: 'travel' } : prev);
          }, 200);
          timeoutsRef.current.push(liftTimeout);

          const slotTimeout = window.setTimeout(() => {
            setGhostColumn(toStatus);
          }, 470);
          timeoutsRef.current.push(slotTimeout);

          const landTimeout = window.setTimeout(async () => {
            setGhostColumn(null);
            setMovingTicketId(null);
            setBoardTickets((prev) =>
              prev.map((item) =>
                item.id === ticketId ? { ...item, status: toStatus } : item
              )
            );
            setFloatingTicket(null);
            const commitTimeout = window.setTimeout(async () => {
              if (projectId) {
                try {
                  await updateTicketStatus(projectId, ticketId, toStatus);
                } catch {
                  setBoardTickets(previousTickets);
                  toast('Failed to move ticket');
                  return;
                }
              }
              await loadBoard();
              setSettleTicketId(ticketId);
              const settleTimeout = window.setTimeout(() => setSettleTicketId(null), 420);
              timeoutsRef.current.push(settleTimeout);
              toast(`Ticket moved to ${statusLabels[toStatus]}`);
            }, 40);
            timeoutsRef.current.push(commitTimeout);
          }, 650);
          timeoutsRef.current.push(landTimeout);
        }}
        onCancel={() => setPendingMove(null)}
      />
    </div>
  );
};

export default BoardPage;

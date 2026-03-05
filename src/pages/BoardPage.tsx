import React, { useState } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { useTickets } from '@/contexts/TicketContext';
import { TypeIcon, PriorityIcon, DeptBadge, UserAvatar, GhostAvatar } from '@/components/TicketBadges';
import { statusLabels } from '@/data/mockData';
import type { TicketStatus, Ticket } from '@/data/mockData';
import { cn } from '@/lib/utils';
import { Plus, CheckCircle2 } from 'lucide-react';

const columns: { id: TicketStatus; label: string; color: string }[] = [
  { id: 'todo', label: 'TO DO', color: '#94a3b8' },
  { id: 'in-progress', label: 'IN PROGRESS', color: '#f59e0b' },
  { id: 'in-review', label: 'IN REVIEW', color: '#6366f1' },
  { id: 'done', label: 'DONE', color: '#22c55e' },
];

const BoardPage = () => {
  const { tickets, updateTicketStatus, setSelectedTicket } = useTickets();

  const grouped = columns.map(col => ({
    ...col,
    tickets: tickets.filter(t => t.status === col.id),
  }));

  const onDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    const ticketId = result.draggableId;
    const newStatus = result.destination.droppableId as TicketStatus;
    updateTicketStatus(ticketId, newStatus);
  };

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-xl font-semibold">Board</h1>
      <DragDropContext onDragEnd={onDragEnd}>
        <div className="flex gap-4 overflow-x-auto pb-4">
          {grouped.map(col => (
            <Droppable key={col.id} droppableId={col.id}>
              {(provided, snapshot) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className={cn(
                    'flex-shrink-0 w-72 rounded-xl bg-muted/40 border flex flex-col transition-colors',
                    snapshot.isDraggingOver && 'bg-primary/5 border-primary/30'
                  )}
                >
                  {/* Column header */}
                  <div className="flex items-center gap-2 px-3 py-3 border-b">
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: col.color }} />
                    <span className="text-xs font-bold tracking-wide">{col.label}</span>
                    <span className="text-xs text-muted-foreground ml-auto bg-muted rounded-full px-2 py-0.5">{col.tickets.length}</span>
                    {col.id === 'done' && <CheckCircle2 className="h-3.5 w-3.5 text-success" />}
                  </div>

                  {/* Cards */}
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
                            <div className="flex items-center gap-1.5 mb-2">
                              <DeptBadge department={ticket.department} />
                              <PriorityIcon priority={ticket.priority} />
                            </div>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1">
                                <TypeIcon type={ticket.type} />
                                <span className="font-mono text-[10px] text-muted-foreground">{ticket.id}</span>
                              </div>
                              {ticket.assignee ? (
                                <UserAvatar name={ticket.assignee.name} avatar={ticket.assignee.avatar} />
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

                  {/* Add button */}
                  <button className="flex items-center gap-1.5 px-3 py-2 text-xs text-muted-foreground hover:text-foreground transition-colors border-t">
                    <Plus className="h-3.5 w-3.5" />
                    Create
                  </button>
                </div>
              )}
            </Droppable>
          ))}
        </div>
      </DragDropContext>
    </div>
  );
};

export default BoardPage;

import React, { useState } from 'react';
import { X, MessageSquare, Activity, FileText } from 'lucide-react';
import { statusLabels } from '@/data/models';
import { StatusBadge, PriorityIcon, TypeIcon, DeptBadge, UserAvatar, GhostAvatar } from './TicketBadges';
import { useTickets } from '@/contexts/TicketContext';
import type { TicketStatus } from '@/data/models';
import { cn } from '@/lib/utils';
import { formatDistanceToNow, format } from 'date-fns';

const TicketDetailPanel = () => {
  const { selectedTicket, setSelectedTicket, updateTicketStatus } = useTickets();
  const [activeTab, setActiveTab] = useState<'details' | 'activity' | 'comments'>('details');

  if (!selectedTicket) return null;

  const ticket = selectedTicket;
  const tabs = [
    { id: 'details' as const, label: 'Details', icon: FileText },
    { id: 'activity' as const, label: 'Activity', icon: Activity },
    { id: 'comments' as const, label: 'Comments', icon: MessageSquare },
  ];

  return (
    <>
      <div className="fixed inset-0 z-40 bg-foreground/20" onClick={() => setSelectedTicket(null)} />
      <div className="fixed right-0 top-0 h-screen w-full max-w-[600px] bg-card border-l shadow-2xl z-50 flex flex-col animate-slide-in-right">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b shrink-0">
          <div className="flex items-center gap-2">
            <TypeIcon type={ticket.type} />
            <span className="font-mono text-xs text-muted-foreground">{ticket.id}</span>
          </div>
          <button onClick={() => setSelectedTicket(null)} className="p-1 rounded hover:bg-accent transition-colors text-muted-foreground"><X className="h-4 w-4" /></button>
        </div>

        {/* Title */}
        <div className="px-4 pt-4 pb-2 shrink-0">
          <h2 className="text-lg font-semibold leading-tight">{ticket.title}</h2>
        </div>

        {/* Status bar */}
        <div className="px-4 pb-3 flex items-center gap-2 shrink-0">
          <select
            value={ticket.status}
            onChange={e => updateTicketStatus(ticket.id, e.target.value as TicketStatus)}
            className="h-7 rounded-full text-xs font-medium border-0 bg-muted px-3 focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            {Object.entries(statusLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <PriorityIcon priority={ticket.priority} />
          <DeptBadge department={ticket.department} />
        </div>

        {/* Tabs */}
        <div className="flex border-b px-4 shrink-0">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-2 text-xs font-medium border-b-2 transition-colors',
                activeTab === tab.id ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
              )}
            >
              <tab.icon className="h-3.5 w-3.5" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {activeTab === 'details' && (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Description</label>
                <p className="text-sm mt-1">{ticket.description || 'No description'}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Assignee</label>
                  <div className="flex items-center gap-2 mt-1">
                    {ticket.assignee ? <><UserAvatar name={ticket.assignee.name} avatar={ticket.assignee.avatar} /><span className="text-sm">{ticket.assignee.name}</span></> : <><GhostAvatar /><span className="text-sm text-muted-foreground">Unassigned</span></>}
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Reporter</label>
                  <div className="flex items-center gap-2 mt-1">
                    <UserAvatar name={ticket.reporter.name} avatar={ticket.reporter.avatar} />
                    <span className="text-sm">{ticket.reporter.name}</span>
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Created</label>
                  <p className="text-sm mt-1">{format(new Date(ticket.createdAt), 'MMM d, yyyy, h:mm a')}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Updated</label>
                  <p className="text-sm mt-1">{format(new Date(ticket.updatedAt), 'MMM d, yyyy, h:mm a')}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Due Date</label>
                  <p className="text-sm mt-1">{ticket.dueDate ? format(new Date(ticket.dueDate), 'MMM d, yyyy') : '—'}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Type</label>
                  <div className="flex items-center gap-1.5 mt-1"><TypeIcon type={ticket.type} /><span className="text-sm capitalize">{ticket.type}</span></div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'activity' && (
            <div className="space-y-3">
              {ticket.activity.length === 0 && <p className="text-sm text-muted-foreground">No activity yet.</p>}
              {ticket.activity.map(event => (
                <div key={event.id} className="flex gap-3">
                  <UserAvatar name={event.user.name} avatar={event.user.avatar} />
                  <div>
                    <p className="text-sm">
                      <span className="font-medium">{event.user.name}</span>{' '}
                      {event.action}
                      {event.oldValue && event.newValue && <> from <StatusBadge status={event.oldValue as any} /> to <StatusBadge status={event.newValue as any} /></>}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">{formatDistanceToNow(new Date(event.createdAt), { addSuffix: true })}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'comments' && (
            <div className="space-y-3">
              {ticket.comments.length === 0 && <p className="text-sm text-muted-foreground">No comments yet.</p>}
              {ticket.comments.map(comment => (
                <div key={comment.id} className="flex gap-3">
                  <UserAvatar name={comment.user.name} avatar={comment.user.avatar} />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{comment.user.name}</span>
                      <span className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}</span>
                    </div>
                    <p className="text-sm mt-0.5">{comment.text}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default TicketDetailPanel;

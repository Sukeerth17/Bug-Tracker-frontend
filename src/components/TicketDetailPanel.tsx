import React, { useState } from 'react';
import { X, MessageSquare, Activity, FileText } from 'lucide-react';
import { statusLabels } from '@/data/models';
import { StatusBadge, PriorityIcon, TypeIcon, DeptBadge, UserAvatar, GhostAvatar } from './TicketBadges';
import { useTickets } from '@/contexts/TicketContext';
import type { TicketStatus } from '@/data/models';
import { cn } from '@/lib/utils';
import { formatDistanceToNow, format } from 'date-fns';

const TicketDetailPanel = () => {
  const { selectedTicket, setSelectedTicket, updateTicketStatus, updateTicketAssignees, addTicketComment, users } = useTickets();
  const [activeTab, setActiveTab] = useState<'details' | 'activity' | 'comments'>('details');
  const [previewAttachment, setPreviewAttachment] = useState<string | null>(null);
  const [editingAssignees, setEditingAssignees] = useState(false);
  const [assigneeIdsDraft, setAssigneeIdsDraft] = useState<string[]>([]);
  const [commentText, setCommentText] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);

  const ticket = selectedTicket;
  React.useEffect(() => {
    if (!ticket) return;
    setAssigneeIdsDraft(ticket.assignees.map((assignee) => assignee.id));
    setEditingAssignees(false);
  }, [ticket?.id, ticket?.assignees]);

  if (!ticket) return null;
  const tabs = [
    { id: 'details' as const, label: 'Details', icon: FileText },
    { id: 'activity' as const, label: 'Activity', icon: Activity },
    { id: 'comments' as const, label: 'Comments', icon: MessageSquare },
  ];

  return (
    <>
      <div className="fixed inset-0 z-40 bg-foreground/20" onClick={() => setSelectedTicket(null)} />
      <div className="fixed right-0 top-0 h-screen w-full max-w-[600px] bg-card border-l shadow-2xl z-50 flex flex-col animate-slide-in-right">
        <div className="flex items-center justify-between p-4 border-b shrink-0">
          <div className="flex items-center gap-2">
            <TypeIcon type={ticket.type} />
            <span className="font-mono text-xs text-muted-foreground">{ticket.id}</span>
          </div>
          <button onClick={() => setSelectedTicket(null)} className="p-1 rounded hover:bg-accent transition-colors text-muted-foreground"><X className="h-4 w-4" /></button>
        </div>

        <div className="px-4 pt-4 pb-2 shrink-0">
          <h2 className="text-lg font-semibold leading-tight">{ticket.title}</h2>
        </div>

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

        <div className="flex-1 overflow-y-auto p-4">
          {activeTab === 'details' && (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Description</label>
                <p className="text-sm mt-1">{ticket.description || 'No description'}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Assignees</label>
                  <div className="flex flex-wrap items-center gap-2 mt-1">
                    {ticket.assignees.length > 0 ? (
                      ticket.assignees.map((assignee) => (
                        <span key={assignee.id} className="inline-flex items-center gap-1.5 rounded-full border px-2 py-1">
                          <UserAvatar name={assignee.name} avatar={assignee.avatar} />
                          <span className="text-xs">{assignee.name}</span>
                        </span>
                      ))
                    ) : (
                      <><GhostAvatar /><span className="text-sm text-muted-foreground">Unassigned</span></>
                    )}
                  </div>
                  <div className="mt-2 space-y-2">
                    {editingAssignees ? (
                      <>
                        <select
                          value={assigneeIdsDraft}
                          onChange={(e) => setAssigneeIdsDraft(Array.from(e.target.selectedOptions, (option) => option.value))}
                          className="w-full min-h-24 rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                          multiple
                        >
                          {users.map((user) => (
                            <option key={user.id} value={user.id}>{user.name}</option>
                          ))}
                        </select>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            className="h-8 px-3 rounded-md bg-primary text-primary-foreground text-xs"
                            onClick={async () => {
                              await updateTicketAssignees(ticket.id, assigneeIdsDraft);
                              setEditingAssignees(false);
                            }}
                          >
                            Save
                          </button>
                          <button type="button" className="h-8 px-3 rounded-md border text-xs" onClick={() => setEditingAssignees(false)}>
                            Cancel
                          </button>
                        </div>
                      </>
                    ) : (
                      <button type="button" className="h-8 px-3 rounded-md border text-xs" onClick={() => setEditingAssignees(true)}>
                        Edit Assignees
                      </button>
                    )}
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
                  <p className="text-sm mt-1">{ticket.dueDate ? format(new Date(ticket.dueDate), 'MMM d, yyyy') : '-'}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Type</label>
                  <div className="flex items-center gap-1.5 mt-1"><TypeIcon type={ticket.type} /><span className="text-sm capitalize">{ticket.type}</span></div>
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Attachments</label>
                {ticket.attachments.length === 0 ? (
                  <p className="text-sm mt-1 text-muted-foreground">No attachments</p>
                ) : (
                  <div className="mt-2 grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {ticket.attachments.map((attachment, index) => (
                      <button
                        key={`${ticket.id}-attachment-${index}`}
                        type="button"
                        onClick={() => setPreviewAttachment(attachment)}
                        className="h-20 rounded-md overflow-hidden border"
                      >
                        <img src={attachment} alt={`Attachment ${index + 1}`} className="h-full w-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}
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
              <div className="space-y-2 border rounded-md p-3">
                <textarea
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  className="w-full min-h-20 rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  placeholder="Write a comment..."
                />
                <div className="flex justify-end">
                  <button
                    type="button"
                    className="h-8 px-3 rounded-md bg-primary text-primary-foreground text-xs disabled:opacity-60"
                    disabled={submittingComment || !commentText.trim()}
                    onClick={async () => {
                      if (!commentText.trim()) return;
                      setSubmittingComment(true);
                      try {
                        await addTicketComment(ticket.id, commentText);
                        setCommentText('');
                      } finally {
                        setSubmittingComment(false);
                      }
                    }}
                  >
                    {submittingComment ? 'Posting...' : 'Post Comment'}
                  </button>
                </div>
              </div>

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
      {previewAttachment && (
        <div className="fixed inset-0 z-[60] bg-black/70 flex items-center justify-center p-4" onClick={() => setPreviewAttachment(null)}>
          <div className="relative max-w-4xl max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
            <img src={previewAttachment} alt="Attachment preview" className="max-h-[90vh] max-w-full rounded-lg shadow-2xl" />
            <button
              type="button"
              onClick={() => setPreviewAttachment(null)}
              className="absolute -top-3 -right-3 h-8 w-8 rounded-full bg-card border text-foreground flex items-center justify-center"
            >
              x
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default TicketDetailPanel;

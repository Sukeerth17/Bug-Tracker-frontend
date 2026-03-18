import React, { useEffect, useMemo, useRef, useState } from 'react';
import { X, MessageSquare, Activity, FileText, Maximize2, Minimize2 } from 'lucide-react';
import { statusLabels } from '@/data/models';
import { StatusBadge, PriorityIcon, TypeIcon, DeptBadge, UserAvatar } from './TicketBadges';
import { useTickets } from '@/contexts/TicketContext';
import type { TicketStatus, User } from '@/data/models';
import { cn } from '@/lib/utils';
import { formatDistanceToNow, format } from 'date-fns';
import ConfirmationModal from '@/components/ConfirmationModal';
import { useLocation, useParams } from 'react-router-dom';
import { resolveProjectId } from '@/services/projectControl';
import { ticketApi } from '@/services/ticketApi';
import { mediaApi } from '@/services/mediaApi';
import { featureApi, FeatureItem } from '@/services/featureApi';
import { toast } from '@/components/ui/sonner';
import AssigneeMultiSelect from '@/components/AssigneeMultiSelect';
import AttachmentUploader from '@/components/AttachmentUploader';

const TicketDetailPanel = () => {
  const { currentUser, selectedTicket, setSelectedTicket, updateTicketStatus, updateTicketAssignees, updateTicketDetails, updateTicketAttachments, addTicketComment } = useTickets();
  const location = useLocation();
  const { spaceId } = useParams();
  const projectId = spaceId || resolveProjectId(location.pathname);
  const [activeTab, setActiveTab] = useState<'details' | 'activity' | 'comments'>('details');
  const [statusDraft, setStatusDraft] = useState<TicketStatus>('todo');
  const [assigneeIdsDraft, setAssigneeIdsDraft] = useState<string[]>([]);
  const [titleDraft, setTitleDraft] = useState('');
  const [descriptionDraft, setDescriptionDraft] = useState('');
  const [dueDateDraft, setDueDateDraft] = useState('');
  const [commentText, setCommentText] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [saving, setSaving] = useState(false);
  const [closeConfirmOpen, setCloseConfirmOpen] = useState(false);
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [availableFeatures, setAvailableFeatures] = useState<FeatureItem[]>([]);
  const [featureIdDraft, setFeatureIdDraft] = useState<string>('');
  const [attachmentDraft, setAttachmentDraft] = useState<string[]>([]);
  const originalAttachmentsRef = useRef<string[]>([]);
  const panelRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const ticket = selectedTicket;
  const effectiveProjectId = projectId || ticket?.projectId || '';

  useEffect(() => {
    if (!ticket) return;
    setStatusDraft(ticket.status);
    setAssigneeIdsDraft(ticket.assignees.map((assignee) => assignee.id));
    setTitleDraft(ticket.title);
    setDescriptionDraft(ticket.description || '');
    setDueDateDraft(ticket.dueDate ? format(new Date(ticket.dueDate), 'yyyy-MM-dd') : '');
    setFeatureIdDraft(ticket.featureId ? String(ticket.featureId) : '');
    const baseAttachments = ticket.attachments || [];
    setAttachmentDraft(baseAttachments);
    originalAttachmentsRef.current = baseAttachments;
  }, [ticket?.id, ticket?.status, ticket?.assignees, ticket?.featureId]);

  useEffect(() => {
    if (!ticket || !effectiveProjectId) {
      setAvailableUsers([]);
      return;
    }
    ticketApi.getUsers(effectiveProjectId, true)
      .then(setAvailableUsers)
      .catch(() => setAvailableUsers([]));
  }, [ticket?.id, effectiveProjectId]);

  useEffect(() => {
    if (!ticket || !effectiveProjectId) {
      setAvailableFeatures([]);
      return;
    }
    featureApi.getFeatures(effectiveProjectId)
      .then(setAvailableFeatures)
      .catch(() => setAvailableFeatures([]));
  }, [ticket?.id, effectiveProjectId]);

  useEffect(() => {
    let active = true;
    if (!ticket || !effectiveProjectId) return () => { active = false; };
    Promise.all([
      ticketApi.getComments(effectiveProjectId, ticket.id).catch(() => []),
      ticketApi.getActivityForTicket(effectiveProjectId, ticket.id).catch(() => []),
    ]).then(([comments, activity]) => {
      if (!active) return;
      setSelectedTicket({ ...ticket, comments, activity });
    });
    return () => { active = false; };
  }, [ticket?.id, effectiveProjectId]);

  const hasChanges = useMemo(() => {
    if (!ticket) return false;
    const statusChanged = statusDraft !== ticket.status;
    const currentAssignees = ticket.assignees.map((a) => a.id).sort();
    const draftAssignees = [...assigneeIdsDraft].sort();
    const assigneesChanged = currentAssignees.length !== draftAssignees.length
      || currentAssignees.some((id, idx) => id !== draftAssignees[idx]);
    const titleChanged = titleDraft.trim() !== ticket.title;
    const descChanged = (descriptionDraft || '') !== (ticket.description || '');
    const ticketDue = ticket.dueDate ? format(new Date(ticket.dueDate), 'yyyy-MM-dd') : '';
    const dueChanged = dueDateDraft !== ticketDue;
    const featureChanged = (ticket.featureId ? String(ticket.featureId) : '') !== featureIdDraft;
    const attachmentsChanged = (attachmentDraft || []).join(',') !== (ticket.attachments || []).join(',');
    return statusChanged || assigneesChanged || titleChanged || descChanged || dueChanged || featureChanged || attachmentsChanged;
  }, [ticket, statusDraft, assigneeIdsDraft, titleDraft, descriptionDraft, dueDateDraft, featureIdDraft, attachmentDraft]);

  // Keep draft assignees in sync with server list to drive the multi-select UI.

  const handleSave = async () => {
    if (!ticket || !hasChanges || !effectiveProjectId) return;
    setSaving(true);
    try {
      const ticketDue = ticket.dueDate ? format(new Date(ticket.dueDate), 'yyyy-MM-dd') : '';
      const detailFieldChanged = titleDraft.trim() !== ticket.title
        || (descriptionDraft || '') !== (ticket.description || '')
        || dueDateDraft !== ticketDue;
      const featureChanged = (ticket.featureId ? String(ticket.featureId) : '') !== featureIdDraft;
      const detailsChanged = detailFieldChanged || featureChanged;
      if (detailsChanged) {
        await updateTicketDetails(effectiveProjectId, ticket.id, {
          title: titleDraft.trim(),
          description: descriptionDraft || '',
          dueDate: dueDateDraft ? dueDateDraft : null,
          featureId: featureIdDraft ? Number(featureIdDraft) : null,
        });
      }
      if (statusDraft !== ticket.status) {
        await updateTicketStatus(effectiveProjectId, ticket.id, statusDraft);
      }
      const currentAssignees = ticket.assignees.map((a) => a.id).sort();
      const draftAssignees = [...assigneeIdsDraft].sort();
      const assigneesChanged = currentAssignees.length !== draftAssignees.length
        || currentAssignees.some((id, idx) => id !== draftAssignees[idx]);
      if (assigneesChanged) {
        await updateTicketAssignees(effectiveProjectId, ticket.id, assigneeIdsDraft);
      }
      const attachmentsChanged = (attachmentDraft || []).join(',') !== (ticket.attachments || []).join(',');
      if (attachmentsChanged) {
        await updateTicketAttachments(effectiveProjectId, ticket.id, attachmentDraft);
      }
      const refreshed = await ticketApi.getTicketById(effectiveProjectId, ticket.id);
      setSelectedTicket(refreshed);
      originalAttachmentsRef.current = refreshed.attachments || [];
      setAttachmentDraft(refreshed.attachments || []);
      toast('Changes saved');
    } catch (err: any) {
      toast(err?.response?.data?.message || 'Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    if (!ticket) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key !== 'Enter') return;
      if (!hasChanges) return;
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'TEXTAREA' || target.isContentEditable)) return;
      if (panelRef.current && !panelRef.current.contains(target)) return;
      e.preventDefault();
      void handleSave();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [ticket, hasChanges]);

  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (!hasChanges) return;
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [hasChanges]);

  if (!ticket) return null;

  const confirmClose = () => {
    if (!hasChanges) {
      setSelectedTicket(null);
      return;
    }
    setCloseConfirmOpen(true);
  };

  const cleanupUnsavedUploads = async () => {
    const original = originalAttachmentsRef.current || [];
    const added = (attachmentDraft || []).filter((id) => !original.includes(id));
    await Promise.all(added.map((id) => mediaApi.delete(id).catch(() => undefined)));
  };

  const handleCancel = () => {
    if (!ticket) return;
    void cleanupUnsavedUploads();
    setStatusDraft(ticket.status);
    setAssigneeIdsDraft(ticket.assignees.map((a) => a.id));
    setTitleDraft(ticket.title);
    setDescriptionDraft(ticket.description || '');
    setDueDateDraft(ticket.dueDate ? format(new Date(ticket.dueDate), 'yyyy-MM-dd') : '');
    setFeatureIdDraft(ticket.featureId ? String(ticket.featureId) : '');
    const baseAttachments = ticket.attachments || [];
    setAttachmentDraft(baseAttachments);
    originalAttachmentsRef.current = baseAttachments;
  };

  const tabs = [
    { id: 'details' as const, label: 'Details', icon: FileText },
    { id: 'activity' as const, label: 'Activity', icon: Activity },
    { id: 'comments' as const, label: 'Comments', icon: MessageSquare },
  ];

  const detailsContent = (
    <div className="space-y-4">
      <div>
        <label className="text-xs font-medium text-muted-foreground">Title</label>
        <input
          value={titleDraft}
          onChange={(e) => setTitleDraft(e.target.value)}
          className="mt-1 h-9 w-full rounded-md border bg-background px-3 text-sm"
        />
      </div>
      <div>
        <label className="text-xs font-medium text-muted-foreground">Description</label>
        <textarea
          value={descriptionDraft}
          onChange={(e) => setDescriptionDraft(e.target.value)}
          className="mt-1 min-h-[90px] w-full rounded-md border bg-background px-3 py-2 text-sm"
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-xs font-medium text-muted-foreground">Due Date</label>
          <input
            type="date"
            value={dueDateDraft}
            onChange={(e) => setDueDateDraft(e.target.value)}
            onClick={(e) => e.currentTarget.showPicker?.()}
            className="date-input mt-1 h-9 w-full rounded-md border bg-background px-3 text-sm"
          />
        </div>
        <div>
          <AssigneeMultiSelect users={availableUsers} value={assigneeIdsDraft} onChange={setAssigneeIdsDraft} />
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
          <label className="text-xs font-medium text-muted-foreground">Completed</label>
          <p className="text-sm mt-1">{ticket.doneAt ? format(new Date(ticket.doneAt), 'MMM d, yyyy, h:mm a') : '-'}</p>
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">Type</label>
          <div className="flex items-center gap-1.5 mt-1"><TypeIcon type={ticket.type} /><span className="text-sm capitalize">{ticket.type}</span></div>
        </div>
      </div>
              <AttachmentUploader
                value={attachmentDraft}
                onChange={(next) => setAttachmentDraft(next)}
                projectId={effectiveProjectId}
                featureName={availableFeatures.find((feature) => feature.id === featureIdDraft)?.name || ticket.featureName || null}
                label="Attachments"
                description="Drag images or videos here, or click to browse"
              />
    </div>
  );

  const activityContent = (
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
  );

  const commentsContent = (
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
                      if (!commentText.trim() || !effectiveProjectId) return;
                      setSubmittingComment(true);
                      try {
                        await addTicketComment(effectiveProjectId, ticket.id, commentText);
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
  );

  return (
    <>
      <div className="fixed inset-0 z-40 bg-foreground/20" onClick={confirmClose} />
      <div
        ref={panelRef}
        className={cn(
          'fixed bg-card shadow-2xl z-50 flex flex-col ticket-rubber-fix',
          isFullscreen
            ? 'inset-0 w-full h-full border'
            : 'right-0 top-0 h-screen w-full max-w-[600px] border-l animate-slide-in-right'
        )}
      >
        <div className="flex items-center justify-between p-4 border-b shrink-0">
          <div className="flex items-center gap-2">
            <TypeIcon type={ticket.type} />
            <span className="font-mono text-xs text-muted-foreground">{ticket.id}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsFullscreen((prev) => !prev)}
              className="p-1 rounded hover:bg-accent transition-colors text-muted-foreground"
              aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
            >
              {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </button>
            <button onClick={confirmClose} className="p-1 rounded hover:bg-accent transition-colors text-muted-foreground"><X className="h-4 w-4" /></button>
          </div>
        </div>

        <div className="px-4 pt-4 pb-2 shrink-0">
          <h2 className="text-lg font-semibold leading-tight">{ticket.title}</h2>
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <span className="inline-flex items-center rounded-full border bg-primary/10 text-primary px-3 py-1 text-xs font-semibold shadow-sm">
              Project: {ticket.projectId}
            </span>
            <div className="inline-flex items-center gap-2">
              <span className="inline-flex items-center rounded-full border bg-primary/10 text-primary px-3 py-1 text-xs font-semibold shadow-sm">
                Feature: {featureIdDraft ? (availableFeatures.find((f) => f.id === featureIdDraft)?.name || ticket.featureName || 'Feature') : 'No feature'}
              </span>
              <select
                value={featureIdDraft}
                onChange={(e) => setFeatureIdDraft(e.target.value)}
                className="h-7 rounded-full text-xs font-medium border-0 bg-muted px-3 focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                <option value="">No Feature</option>
                {availableFeatures.map((feature) => (
                  <option key={feature.id} value={feature.id}>{feature.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="px-4 pb-3 flex items-center gap-2 shrink-0">
          <select
            value={statusDraft}
            onChange={e => setStatusDraft(e.target.value as TicketStatus)}
            className="h-7 rounded-full text-xs font-medium border-0 bg-muted px-3 focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            {Object.entries(statusLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <PriorityIcon priority={ticket.priority} />
          <DeptBadge department={ticket.department} />
          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              disabled={!hasChanges || saving}
              onClick={handleSave}
              className="h-7 px-3 rounded-md bg-primary text-primary-foreground text-xs disabled:opacity-60"
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
            <button
              type="button"
              disabled={!hasChanges || saving}
              onClick={handleCancel}
              className="h-7 px-3 rounded-md border text-xs disabled:opacity-60"
            >
              Cancel
            </button>
          </div>
        </div>

        {!isFullscreen && (
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
        )}

        <div className={cn('flex-1 overflow-y-auto p-4', isFullscreen && 'bg-muted/20')}>
          {isFullscreen ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-full">
              <div className="rounded-xl border bg-card p-4 overflow-y-auto">
                <div className="flex items-center gap-2 mb-3">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <h3 className="text-sm font-semibold">Details</h3>
                </div>
                {detailsContent}
              </div>
              <div className="rounded-xl border bg-card p-4 overflow-y-auto">
                <div className="flex items-center gap-2 mb-3">
                  <Activity className="h-4 w-4 text-muted-foreground" />
                  <h3 className="text-sm font-semibold">Activity</h3>
                </div>
                {activityContent}
              </div>
              <div className="rounded-xl border bg-card p-4 overflow-y-auto">
                <div className="flex items-center gap-2 mb-3">
                  <MessageSquare className="h-4 w-4 text-muted-foreground" />
                  <h3 className="text-sm font-semibold">Comments</h3>
                </div>
                {commentsContent}
              </div>
            </div>
          ) : (
            <>
              {activeTab === 'details' && detailsContent}
              {activeTab === 'activity' && activityContent}
              {activeTab === 'comments' && commentsContent}
            </>
          )}
        </div>
      </div>
      <ConfirmationModal
        isOpen={closeConfirmOpen}
        title="Unsaved Changes"
        message="You have unsaved changes. Are you sure you want to leave without saving?"
        confirmLabel="Leave"
        cancelLabel="Cancel"
        variant="warning"
        onConfirm={() => {
          setCloseConfirmOpen(false);
          void cleanupUnsavedUploads().finally(() => setSelectedTicket(null));
        }}
        onCancel={() => setCloseConfirmOpen(false)}
      />
    </>
  );
};

export default TicketDetailPanel;

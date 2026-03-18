import React, { useState } from 'react';
import { X } from 'lucide-react';
import { useTickets } from '@/contexts/TicketContext';
import { departments, statusLabels, priorityLabels, typeLabels } from '@/data/models';
import type { TicketStatus, TicketPriority, TicketType, Department } from '@/data/models';
import { useLocation } from 'react-router-dom';
import { resolveFeatureId, resolveProjectId, setActiveProjectId } from '@/services/projectControl';
import { projectApi, ProjectItem } from '@/services/projectApi';
import { ticketApi } from '@/services/ticketApi';
import { featureApi, FeatureItem } from '@/services/featureApi';
import type { User } from '@/data/models';
import AttachmentUploader from '@/components/AttachmentUploader';
import AssigneeMultiSelect from '@/components/AssigneeMultiSelect';

interface NewTicketModalProps {
  open: boolean;
  onClose: () => void;
  defaultStatus?: TicketStatus;
}

const NewTicketModal = ({ open, onClose, defaultStatus = 'todo' }: NewTicketModalProps) => {
  const location = useLocation();
  const { createTicket } = useTickets();
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [features, setFeatures] = useState<FeatureItem[]>([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [department, setDepartment] = useState<Department>('Website');
  const [type, setType] = useState<TicketType>('task');
  const [priority, setPriority] = useState<TicketPriority>('medium');
  const [assigneeIds, setAssigneeIds] = useState<string[]>([]);
  const [status, setStatus] = useState<TicketStatus>(defaultStatus);
  const [projectId, setProjectId] = useState('');
  const [featureId, setFeatureId] = useState('');
  const [newFeatureName, setNewFeatureName] = useState('');
  const [creatingFeature, setCreatingFeature] = useState(false);
  const [featureError, setFeatureError] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [attachments, setAttachments] = useState<string[]>([]);
  const [submitError, setSubmitError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const createStatusOptions: TicketStatus[] = ['todo', 'in-progress'];

  React.useEffect(() => {
    if (!open) return;

    setStatus(defaultStatus);
    const activeProjectId = resolveProjectId(location.pathname);
    const activeFeatureId = resolveFeatureId(location.pathname);

    projectApi.getProjects()
      .then((rows) => {
        setProjects(rows);
        if (rows.some((p) => p.id === activeProjectId)) {
          setProjectId(activeProjectId);
        } else if (rows.length > 0) {
          setProjectId(rows[0].id);
        }
        if (activeFeatureId) {
          setFeatureId(activeFeatureId);
        }
      })
      .catch(() => setProjects([]));

  }, [open, defaultStatus, location.pathname]);

  React.useEffect(() => {
    if (!open || !projectId) return;
    ticketApi.getUsers(projectId, true)
      .then((rows) => {
        setAvailableUsers(rows);
        setAssigneeIds((prev) => {
          const kept = prev.filter((id) => rows.some((user) => user.id === id));
          return kept;
        });
      })
      .catch(() => {
        setAvailableUsers([]);
        setAssigneeIds([]);
      });
  }, [open, projectId]);

  React.useEffect(() => {
    if (!open || !projectId) return;
    featureApi.getFeatures(projectId)
      .then((rows) => {
        setFeatures(rows);
        if (featureId && rows.some((f) => f.id === featureId)) {
          return;
        }
        if (rows.length > 0) {
          setFeatureId(rows[0].id);
        }
      })
      .catch(() => setFeatures([]));
  }, [open, projectId]);
  React.useEffect(() => {
    if (!open) return;
    setNewFeatureName('');
    setCreatingFeature(false);
    setFeatureError('');
  }, [open, projectId]);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !projectId || !featureId) return;
    setSubmitError('');
    setSubmitting(true);
    try {
      setActiveProjectId(projectId);
      await createTicket({
        projectId,
        featureId: featureId || null,
        title: title.trim(),
        description,
        department,
        type,
        priority,
        status,
        assignees: availableUsers.filter((user) => assigneeIds.includes(user.id)),
        dueDate: dueDate || null,
        attachments,
      });
      onClose();
      setTitle('');
      setDescription('');
      setDepartment('Website');
      setType('task');
      setPriority('medium');
      setAssigneeIds([]);
      setStatus('todo');
      setFeatureId('');
      setDueDate('');
      setAttachments([]);
      setSubmitError('');
    } catch (err: any) {
      setSubmitError(err?.response?.data?.message || 'Failed to create ticket');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateFeature = async () => {
    if (!projectId || !newFeatureName.trim()) return;
    setCreatingFeature(true);
    setFeatureError('');
    try {
      const created = await featureApi.createFeature(projectId, newFeatureName.trim());
      const next = await featureApi.getFeatures(projectId);
      setFeatures(next);
      setFeatureId(created.id);
      setNewFeatureName('');
    } catch (err: any) {
      setFeatureError(err?.response?.data?.message || 'Failed to create feature');
    } finally {
      setCreatingFeature(false);
    }
  };

  const selectCls = "h-9 rounded-md border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 w-full";
  const labelCls = "text-xs font-medium text-muted-foreground mb-1 block";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-foreground/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-card rounded-xl shadow-2xl w-full max-w-lg mx-4 animate-fade-in border ticket-rubber-fix">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-base font-semibold">New Ticket</h2>
          <button onClick={onClose} className="p-1 rounded hover:bg-accent transition-colors text-muted-foreground"><X className="h-4 w-4" /></button>
        </div>
        <div className="ticket-rubber-scroll">
        <form onSubmit={handleSubmit} className="p-4 space-y-4 ticket-snap-form">
          <div>
            <label className={labelCls}>Title *</label>
            <input value={title} onChange={e => setTitle(e.target.value)} className="w-full h-9 rounded-md border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" placeholder="Brief summary of the issue" required />
          </div>
          <div>
            <label className={labelCls}>Description</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} className="w-full h-20 rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none" placeholder="Detailed description…" />
          </div>
          <AttachmentUploader
            value={attachments}
            onChange={setAttachments}
            label="Attachments"
            description="Drag files here or click to browse"
          />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Project</label>
              <select value={projectId} onChange={e => setProjectId(e.target.value)} className={selectCls} required>
                <option value="" disabled>Select project</option>
                {projects.map(project => <option key={project.id} value={project.id}>{project.name}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Feature</label>
              {features.length > 0 ? (
                <select value={featureId} onChange={e => setFeatureId(e.target.value)} className={selectCls} required>
                  {features.map(feature => <option key={feature.id} value={feature.id}>{feature.name}</option>)}
                </select>
              ) : (
                <div className="space-y-2">
                  <input
                    value={newFeatureName}
                    onChange={(e) => setNewFeatureName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key !== 'Enter') return;
                      e.preventDefault();
                      handleCreateFeature();
                    }}
                    className="w-full h-9 rounded-md border bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                    placeholder="Create first feature name"
                  />
                  <button
                    type="button"
                    onClick={handleCreateFeature}
                    disabled={creatingFeature || !newFeatureName.trim()}
                    className="h-9 px-3 rounded-md border text-sm font-medium hover:bg-accent transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {creatingFeature ? 'Creating...' : 'Create Feature'}
                  </button>
                  {featureError && <p className="text-xs text-destructive">{featureError}</p>}
                  <p className="text-[10px] text-muted-foreground">This project has no features yet. Add one to continue.</p>
                </div>
              )}
            </div>
            <div>
              <label className={labelCls}>Department</label>
              <select value={department} onChange={e => setDepartment(e.target.value as Department)} className={selectCls}>
                {departments.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Type</label>
              <select value={type} onChange={e => setType(e.target.value as TicketType)} className={selectCls}>
                {(Object.entries(typeLabels)).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Priority</label>
              <select value={priority} onChange={e => setPriority(e.target.value as TicketPriority)} className={selectCls}>
                {(Object.entries(priorityLabels)).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Status</label>
              <select value={status} onChange={e => setStatus(e.target.value as TicketStatus)} className={selectCls}>
                {createStatusOptions.map((k) => (
                  <option key={k} value={k}>{statusLabels[k]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Due Date</label>
              <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className={selectCls} />
            </div>
          </div>

          <AssigneeMultiSelect users={availableUsers} value={assigneeIds} onChange={setAssigneeIds} />

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="h-9 px-4 rounded-lg border text-sm font-medium hover:bg-accent transition-colors">Cancel</button>
            <button type="submit" disabled={submitting || !projectId || !featureId} className="h-9 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-60 disabled:cursor-not-allowed">{submitting ? 'Creating...' : 'Create Ticket'}</button>
          </div>
          {submitError && <p className="text-xs text-destructive">{submitError}</p>}
        </form>
        </div>
      </div>
    </div>
  );
};

export default NewTicketModal;

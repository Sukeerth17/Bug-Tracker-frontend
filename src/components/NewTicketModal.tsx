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
import { mediaApi } from '@/services/mediaApi';
import type { User } from '@/data/models';
import { UserAvatar } from '@/components/TicketBadges';

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
  const [uploading, setUploading] = useState(false);
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
          if (kept.length > 0 || rows.length === 0) {
            return kept;
          }
          return [rows[0].id];
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
    if (!title.trim() || assigneeIds.length === 0 || !projectId || !featureId) return;
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
      <div className="relative bg-card rounded-xl shadow-2xl w-full max-w-lg mx-4 animate-fade-in border max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-base font-semibold">New Ticket</h2>
          <button onClick={onClose} className="p-1 rounded hover:bg-accent transition-colors text-muted-foreground"><X className="h-4 w-4" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className={labelCls}>Title *</label>
            <input value={title} onChange={e => setTitle(e.target.value)} className="w-full h-9 rounded-md border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" placeholder="Brief summary of the issue" required />
          </div>
          <div>
            <label className={labelCls}>Description</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} className="w-full h-20 rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none" placeholder="Detailed description…" />
          </div>
          <div>
            <label className={labelCls}>Attachments (images, max 500KB each)</label>
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              multiple
              disabled={uploading}
              onChange={async (e) => {
                const files = Array.from(e.target.files || []);
                if (files.length === 0) return;
                setUploading(true);
                try {
                  const uploads = await Promise.all(files.map((file) => mediaApi.upload(file)));
                  setAttachments((prev) => [...prev, ...uploads.map((u) => u.id)]);
                } catch (err: any) {
                  setSubmitError(err?.response?.data?.message || 'Failed to upload attachment');
                } finally {
                  setUploading(false);
                  e.target.value = '';
                }
              }}
              className="block w-full text-xs text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-md file:border file:bg-background file:text-sm file:font-medium"
            />
            {attachments.length > 0 && (
              <div className="mt-2 space-y-1">
                {attachments.map((id) => (
                  <div key={id} className="flex items-center justify-between text-xs border rounded-md px-2 py-1">
                    <span>Attachment {id}</span>
                    <button
                      type="button"
                      onClick={async () => {
                        await mediaApi.delete(id);
                        setAttachments((prev) => prev.filter((a) => a !== id));
                      }}
                      className="text-destructive hover:underline"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
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
                    className="w-full h-9 rounded-md border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
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

          <div>
            <label className={labelCls}>Assignees</label>
            <select
              value={assigneeIds}
              onChange={e => setAssigneeIds(Array.from(e.target.selectedOptions, (option) => option.value))}
              className="w-full min-h-28 rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              multiple
            >
              {availableUsers.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
            <p className="text-[10px] text-muted-foreground mt-1">Hold Ctrl/Cmd to select multiple users.</p>
            {availableUsers.length === 0 && <p className="text-xs text-destructive mt-1">No assignable users in this project.</p>}
            {assigneeIds.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {availableUsers
                  .filter((user) => assigneeIds.includes(user.id))
                  .map((user) => (
                    <div key={user.id} className="inline-flex items-center gap-2 rounded-md border bg-muted/50 px-2 py-1">
                      <UserAvatar name={user.name} avatar={user.avatar} />
                      <span className="text-xs">{user.name}</span>
                      <button
                        type="button"
                        onClick={() => setAssigneeIds((prev) => prev.filter((id) => id !== user.id))}
                        className="text-xs text-muted-foreground hover:text-foreground"
                      >
                        ×
                      </button>
                    </div>
                  ))}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="h-9 px-4 rounded-lg border text-sm font-medium hover:bg-accent transition-colors">Cancel</button>
            <button type="submit" disabled={submitting || availableUsers.length === 0 || assigneeIds.length === 0 || !projectId || !featureId} className="h-9 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-60 disabled:cursor-not-allowed">{submitting ? 'Creating...' : 'Create Ticket'}</button>
          </div>
          {submitError && <p className="text-xs text-destructive">{submitError}</p>}
        </form>
      </div>
    </div>
  );
};

export default NewTicketModal;

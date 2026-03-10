import React, { useState, useRef } from 'react';
import { X, CloudUpload } from 'lucide-react';
import { useTickets } from '@/contexts/TicketContext';
import { departments, statusLabels, priorityLabels, typeLabels } from '@/data/models';
import type { TicketStatus, TicketPriority, TicketType, Department } from '@/data/models';
import { useLocation } from 'react-router-dom';
import { resolveProjectId, setActiveProjectId } from '@/services/projectControl';
import { projectApi, ProjectItem } from '@/services/projectApi';
import { ticketApi } from '@/services/ticketApi';
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
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [department, setDepartment] = useState<Department>('Website');
  const [type, setType] = useState<TicketType>('task');
  const [priority, setPriority] = useState<TicketPriority>('medium');
  const [assigneeIds, setAssigneeIds] = useState<string[]>([]);
  const [status, setStatus] = useState<TicketStatus>(defaultStatus);
  const [projectId, setProjectId] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [attachments, setAttachments] = useState<{ url: string; name: string }[]>([]);
  const [previewAttachment, setPreviewAttachment] = useState<{ url: string; name: string } | null>(null);
  const [attachError, setAttachError] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const readFileAsDataUrl = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });

  React.useEffect(() => {
    if (!open) return;

    setStatus(defaultStatus);
    const activeProjectId = resolveProjectId(location.pathname);

    projectApi.getProjects()
      .then((rows) => {
        setProjects(rows);
        if (rows.some((p) => p.id === activeProjectId)) {
          setProjectId(activeProjectId);
        } else if (rows.length > 0) {
          setProjectId(rows[0].id);
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

  if (!open) return null;

  const handleFiles = async (files: FileList | null) => {
    if (!files) return;
    setAttachError('');
    const remaining = 5 - attachments.length;
    const fileArr = Array.from(files).slice(0, remaining);
    const nextAttachments: { url: string; name: string }[] = [];

    for (const file of fileArr) {
      if (!file.type.startsWith('image/')) {
        setAttachError('Only image files are supported.');
        continue;
      }
      if (file.size > 5 * 1024 * 1024) {
        setAttachError('Max 5MB per file.');
        continue;
      }
      const url = await readFileAsDataUrl(file);
      nextAttachments.push({ url, name: file.name });
    }
    if (nextAttachments.length > 0) {
      setAttachments(prev => [...prev, ...nextAttachments]);
    }
  };

  const removeAttachment = (idx: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== idx));
    if (previewAttachment && previewAttachment.url === attachments[idx]?.url) {
      setPreviewAttachment(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || assigneeIds.length === 0 || !projectId) return;
    setSubmitError('');
    setSubmitting(true);
    try {
      setActiveProjectId(projectId);
      await createTicket({
        projectId,
        title: title.trim(),
        description,
        department,
        type,
        priority,
        status,
        assignees: availableUsers.filter((user) => assigneeIds.includes(user.id)),
        dueDate: dueDate || null,
        attachments: attachments.map((file) => file.url),
      });
      onClose();
      setTitle('');
      setDescription('');
      setDepartment('Website');
      setType('task');
      setPriority('medium');
      setAssigneeIds([]);
      setStatus('todo');
      setDueDate('');
      setAttachments([]);
      setAttachError('');
      setPreviewAttachment(null);
      setSubmitError('');
    } catch (err: any) {
      setSubmitError(err?.response?.data?.message || 'Failed to create ticket');
    } finally {
      setSubmitting(false);
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
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Project</label>
              <select value={projectId} onChange={e => setProjectId(e.target.value)} className={selectCls} required>
                <option value="" disabled>Select project</option>
                {projects.map(project => <option key={project.id} value={project.id}>{project.name}</option>)}
              </select>
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
                {(Object.entries(statusLabels)).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
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

          <div>
            <label className={labelCls}>Attachments</label>
            <div
              onClick={() => attachments.length < 5 && fileRef.current?.click()}
              onDragOver={e => { e.preventDefault(); e.stopPropagation(); }}
              onDrop={e => { e.preventDefault(); e.stopPropagation(); handleFiles(e.dataTransfer.files); }}
              className="border-2 border-dashed rounded-lg p-4 flex flex-col items-center gap-1 cursor-pointer hover:border-primary/50 transition-colors"
            >
              <CloudUpload className="h-6 w-6 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Drag & drop images here, or click to browse</span>
              <span className="text-[10px] text-muted-foreground">Supports: JPG, JPEG, PNG, GIF, WEBP — Max 5MB per file</span>
            </div>
            <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={e => handleFiles(e.target.files)} />
            {attachError && <p className="text-xs text-destructive mt-1">{attachError}</p>}
            {attachments.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {attachments.map((a, i) => (
                  <div key={i} className="relative h-20 w-20 rounded-md overflow-hidden border">
                    <button type="button" onClick={() => setPreviewAttachment(a)} className="h-full w-full">
                      <img src={a.url} alt={a.name} className="h-full w-full object-cover" />
                    </button>
                    <button type="button" onClick={() => removeAttachment(i)} className="absolute top-0.5 right-0.5 h-4 w-4 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center text-[10px]">×</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="h-9 px-4 rounded-lg border text-sm font-medium hover:bg-accent transition-colors">Cancel</button>
            <button type="submit" disabled={submitting || availableUsers.length === 0 || assigneeIds.length === 0 || !projectId} className="h-9 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-60 disabled:cursor-not-allowed">{submitting ? 'Creating...' : 'Create Ticket'}</button>
          </div>
          {submitError && <p className="text-xs text-destructive">{submitError}</p>}
        </form>
      </div>
      {previewAttachment && (
        <div className="fixed inset-0 z-[60] bg-black/70 flex items-center justify-center p-4" onClick={() => setPreviewAttachment(null)}>
          <div className="relative max-w-4xl max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
            <img src={previewAttachment.url} alt={previewAttachment.name} className="max-h-[90vh] max-w-full rounded-lg shadow-2xl" />
            <button
              type="button"
              onClick={() => setPreviewAttachment(null)}
              className="absolute -top-3 -right-3 h-8 w-8 rounded-full bg-card border text-foreground flex items-center justify-center"
            >
              ×
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default NewTicketModal;

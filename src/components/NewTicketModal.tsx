import React, { useState, useRef } from 'react';
import { X, CloudUpload } from 'lucide-react';
import { useTickets } from '@/contexts/TicketContext';
import { users, currentUser, departments, statusLabels, priorityLabels, typeLabels } from '@/data/mockData';
import type { TicketStatus, TicketPriority, TicketType, Department } from '@/data/mockData';

interface NewTicketModalProps {
  open: boolean;
  onClose: () => void;
  defaultStatus?: TicketStatus;
}

const NewTicketModal = ({ open, onClose, defaultStatus = 'todo' }: NewTicketModalProps) => {
  const { createTicket } = useTickets();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [department, setDepartment] = useState<Department>('Website');
  const [type, setType] = useState<TicketType>('task');
  const [priority, setPriority] = useState<TicketPriority>('medium');
  const [assigneeId, setAssigneeId] = useState('');
  const [status, setStatus] = useState<TicketStatus>(defaultStatus);
  const [dueDate, setDueDate] = useState('');
  const [attachments, setAttachments] = useState<{ url: string; name: string }[]>([]);
  const [attachError, setAttachError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  if (!open) return null;

  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    setAttachError('');
    const remaining = 5 - attachments.length;
    const fileArr = Array.from(files).slice(0, remaining);

    for (const file of fileArr) {
      if (!file.type.startsWith('image/')) {
        setAttachError('Only image files are supported.');
        continue;
      }
      if (file.size > 5 * 1024 * 1024) {
        setAttachError('Max 5MB per file.');
        continue;
      }
      const url = URL.createObjectURL(file);
      setAttachments(prev => [...prev, { url, name: file.name }]);
    }
  };

  const removeAttachment = (idx: number) => {
    setAttachments(prev => {
      URL.revokeObjectURL(prev[idx].url);
      return prev.filter((_, i) => i !== idx);
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    createTicket({
      title: title.trim(),
      description,
      department,
      type,
      priority,
      status,
      assignee: users.find(u => u.id === assigneeId) || null,
      reporter: currentUser,
      dueDate: dueDate || null,
    });
    onClose();
    setTitle(''); setDescription(''); setDepartment('Website'); setType('task'); setPriority('medium'); setAssigneeId(''); setStatus('todo'); setDueDate('');
    setAttachments([]); setAttachError('');
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
              <label className={labelCls}>Assignee</label>
              <select value={assigneeId} onChange={e => setAssigneeId(e.target.value)} className={selectCls}>
                <option value="">Unassigned</option>
                {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Due Date</label>
              <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className={selectCls} />
            </div>
          </div>

          {/* Attachments */}
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
                    <img src={a.url} alt={a.name} className="h-full w-full object-cover" />
                    <button type="button" onClick={() => removeAttachment(i)} className="absolute top-0.5 right-0.5 h-4 w-4 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center text-[10px]">×</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="h-9 px-4 rounded-lg border text-sm font-medium hover:bg-accent transition-colors">Cancel</button>
            <button type="submit" className="h-9 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">Create Ticket</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default NewTicketModal;

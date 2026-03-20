import React, { useEffect, useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { Department, Ticket, TicketPriority, TicketStatus, TicketType, priorityLabels, statusLabels, typeLabels } from '@/data/models';
import { featureApi, FeatureItem } from '@/services/featureApi';
import { ticketApi } from '@/services/ticketApi';
import { useTickets } from '@/contexts/TicketContext';
import AttachmentUploader from '@/components/AttachmentUploader';
import AssigneeMultiSelect from '@/components/AssigneeMultiSelect';
import { format } from 'date-fns';
import DepartmentMultiSelect from '@/components/DepartmentMultiSelect';
import SearchableFeatureSelect from '@/components/SearchableFeatureSelect';
import UnsavedChangesBadge from '@/components/UnsavedChangesBadge';

interface EditTicketModalProps {
  open: boolean;
  ticket: Ticket | null;
  projectId: string | null;
  onClose: () => void;
}

const EditTicketModal = ({ open, ticket, projectId, onClose }: EditTicketModalProps) => {
  const { updateTicketDetails, updateTicketStatus, updateTicketAssignees, updateTicketAttachments } = useTickets();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<TicketStatus>('todo');
  const [priority, setPriority] = useState<TicketPriority>('medium');
  const [departmentsDraft, setDepartmentsDraft] = useState<Department[]>(['Website']);
  const [type, setType] = useState<TicketType>('task');
  const [dueDate, setDueDate] = useState('');
  const [assigneeIds, setAssigneeIds] = useState<string[]>([]);
  const [attachments, setAttachments] = useState<string[]>([]);
  const [availableUsers, setAvailableUsers] = useState<Ticket['assignees']>([]);
  const [features, setFeatures] = useState<FeatureItem[]>([]);
  const [selectedFeatures, setSelectedFeatures] = useState<FeatureItem[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open || !ticket) return;
    setTitle(ticket.title);
    setDescription(ticket.description || '');
    setStatus(ticket.status);
    setPriority(ticket.priority);
    setDepartmentsDraft(ticket.departments?.length ? ticket.departments : [ticket.department]);
    setType(ticket.type);
    setDueDate(ticket.dueDate ? format(new Date(ticket.dueDate), 'yyyy-MM-dd') : '');
    setAssigneeIds(ticket.assignees.map((a) => a.id));
    setAttachments(ticket.attachments || []);
    if (ticket.featureId) {
      setSelectedFeatures([{ id: String(ticket.featureId), name: ticket.featureName || 'Feature', projectId: ticket.projectId, createdAt: '', createdByUserId: 0 } as FeatureItem]);
    } else {
      setSelectedFeatures([]);
    }
  }, [open, ticket?.id]);

  useEffect(() => {
    if (!open || !projectId) return;
    featureApi.getFeatures(projectId)
      .then((rows) => setFeatures([...rows].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }))))
      .catch(() => setFeatures([]));
  }, [open, projectId]);

  useEffect(() => {
    if (!open || !projectId) return;
    ticketApi.getUsers(projectId, true)
      .then(setAvailableUsers)
      .catch(() => setAvailableUsers([]));
  }, [open, projectId]);

  if (!open || !ticket) return null;

  const lastEdit = useMemo(() => {
    if (ticket.activity && ticket.activity.length > 0) {
      const latest = [...ticket.activity].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
      return { name: latest.user?.name || 'Unknown', at: latest.createdAt };
    }
    return { name: ticket.reporter?.name || 'Unknown', at: ticket.updatedAt };
  }, [ticket]);

  const hasUnsavedChanges = useMemo(() => {
    if (!ticket) return false;
    const savedDepartments = [...(ticket.departments?.length ? ticket.departments : [ticket.department])].sort();
    const draftDepartments = [...departmentsDraft].sort();
    return (
      title !== ticket.title
      || description !== (ticket.description || '')
      || status !== ticket.status
      || priority !== ticket.priority
      || type !== ticket.type
      || dueDate !== (ticket.dueDate ? format(new Date(ticket.dueDate), 'yyyy-MM-dd') : '')
      || savedDepartments.join(',') !== draftDepartments.join(',')
      || assigneeIds.slice().sort().join(',') !== ticket.assignees.map((a) => a.id).sort().join(',')
      || attachments.join(',') !== (ticket.attachments || []).join(',')
      || (selectedFeatures[0]?.id || '') !== (ticket.featureId ? String(ticket.featureId) : '')
    );
  }, [ticket, title, description, status, priority, type, dueDate, departmentsDraft, assigneeIds, attachments, selectedFeatures]);

  const handleSave = async () => {
    if (!projectId) return;
    setSaving(true);
    try {
      await updateTicketDetails(projectId, ticket.id, {
        title: title.trim(),
        description,
        dueDate: dueDate || null,
        priority,
        department: departmentsDraft[0] || 'Website',
        departmentIds: departmentsDraft,
        type,
        featureId: selectedFeatures[0]?.id ? Number(selectedFeatures[0].id) : null,
      });

      if (status !== ticket.status) {
        await updateTicketStatus(projectId, ticket.id, status);
      }

      const currentAssignees = ticket.assignees.map((a) => a.id).sort();
      const nextAssignees = [...assigneeIds].sort();
      const assigneeChanged = currentAssignees.length !== nextAssignees.length || currentAssignees.some((id, idx) => id !== nextAssignees[idx]);
      if (assigneeChanged) {
        await updateTicketAssignees(projectId, ticket.id, assigneeIds);
      }

      if (attachments.join(',') !== (ticket.attachments || []).join(',')) {
        await updateTicketAttachments(projectId, ticket.id, attachments);
      }
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const handleDiscard = () => {
    if (!ticket) return;
    setTitle(ticket.title);
    setDescription(ticket.description || '');
    setStatus(ticket.status);
    setPriority(ticket.priority);
    setDepartmentsDraft(ticket.departments?.length ? ticket.departments : [ticket.department]);
    setType(ticket.type);
    setDueDate(ticket.dueDate ? format(new Date(ticket.dueDate), 'yyyy-MM-dd') : '');
    setAssigneeIds(ticket.assignees.map((a) => a.id));
    setAttachments(ticket.attachments || []);
    setSelectedFeatures(ticket.featureId
      ? [{ id: String(ticket.featureId), name: ticket.featureName || 'Feature', projectId: ticket.projectId, createdAt: '', createdByUserId: 0 } as FeatureItem]
      : []);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-foreground/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-card rounded-2xl shadow-2xl w-full max-w-3xl mx-4 border max-h-[90vh] overflow-y-auto animate-fade-in">
        <div className="flex items-center justify-between p-4 border-b">
          <div>
            <h2 className="text-lg font-semibold">Edit Ticket</h2>
            <p className="text-xs text-muted-foreground">Update all fields and save changes together.</p>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-accent transition-colors text-muted-foreground"><X className="h-4 w-4" /></button>
        </div>

        <div className="p-5 space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="text-xs font-semibold text-muted-foreground">Title</label>
              <input value={title} onChange={(e) => setTitle(e.target.value)} className="w-full h-10 rounded-md border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>

            <div className="col-span-2">
              <label className="text-xs font-semibold text-muted-foreground">Description (Markdown)</label>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} className="w-full min-h-28 rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>

            <div>
              <label className="text-xs font-semibold text-muted-foreground">Status</label>
              <select value={status} onChange={(e) => setStatus(e.target.value as TicketStatus)} className="h-10 rounded-md border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 w-full">
                {Object.entries(statusLabels).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-muted-foreground">Priority</label>
              <select value={priority} onChange={(e) => setPriority(e.target.value as TicketPriority)} className="h-10 rounded-md border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 w-full">
                {Object.entries(priorityLabels).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>

            <div>
              <DepartmentMultiSelect value={departmentsDraft} onChange={setDepartmentsDraft} />
            </div>

            <div>
              <label className="text-xs font-semibold text-muted-foreground">Type</label>
              <select value={type} onChange={(e) => setType(e.target.value as TicketType)} className="h-10 rounded-md border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 w-full">
                {Object.entries(typeLabels).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-muted-foreground">Due Date</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                onClick={(e) => e.currentTarget.showPicker?.()}
                className="date-input h-10 rounded-md border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 w-full"
              />
            </div>
          </div>

          <div className="space-y-2">
            <SearchableFeatureSelect
              label="Feature"
              features={features}
              value={selectedFeatures[0]?.id || ''}
              onChange={(nextId) => {
                const next = features.find((feature) => feature.id === nextId);
                setSelectedFeatures(next ? [next] : []);
              }}
            />
          </div>

          <AssigneeMultiSelect users={availableUsers} value={assigneeIds} onChange={setAssigneeIds} />

          <AttachmentUploader
            value={attachments}
            onChange={setAttachments}
            projectId={projectId || undefined}
            featureName={selectedFeatures[0]?.name ?? null}
            label="Attachments"
            description="Drag images or videos here, or click to browse"
          />
        </div>

        <div className="flex items-center justify-between px-5 py-4 border-t bg-muted/30">
          <div className="text-xs text-muted-foreground">
            Last edited by <span className="font-semibold text-foreground">{lastEdit.name}</span> · {format(new Date(lastEdit.at), 'PPpp')}
          </div>
          <div className="flex items-center gap-2">
            <UnsavedChangesBadge visible={hasUnsavedChanges} />
            <button type="button" onClick={handleDiscard} disabled={!hasUnsavedChanges} className="h-9 px-4 rounded-lg border text-sm font-medium hover:bg-accent transition-colors disabled:opacity-60">Discard Changes</button>
            <button type="button" onClick={handleSave} disabled={saving || !hasUnsavedChanges} className="h-9 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-60">{saving ? 'Saving…' : 'Save'}</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditTicketModal;

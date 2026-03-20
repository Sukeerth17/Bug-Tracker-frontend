import React, { useEffect, useMemo, useState } from 'react';
import { MoreVertical, Trash2 } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { featureApi, FeatureItem } from '@/services/featureApi';
import { useTickets } from '@/contexts/TicketContext';
import { useAuth } from '@/contexts/AuthContext';
import { ticketApi } from '@/services/ticketApi';
import type { Ticket } from '@/data/models';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import SearchableFeatureSelect from '@/components/SearchableFeatureSelect';
import UnsavedChangesBadge from '@/components/UnsavedChangesBadge';

type TicketMenuProps = {
  ticket: Ticket;
  projectId?: string;
  className?: string;
};

const TicketMenu = ({ ticket, projectId, className }: TicketMenuProps) => {
  const { updateTicketDetails } = useTickets();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [features, setFeatures] = useState<FeatureItem[]>([]);
  const [selectedId, setSelectedId] = useState(ticket.featureId ? String(ticket.featureId) : '');
  const [draftId, setDraftId] = useState(ticket.featureId ? String(ticket.featureId) : '');

  useEffect(() => {
    setSelectedId(ticket.featureId ? String(ticket.featureId) : '');
    setDraftId(ticket.featureId ? String(ticket.featureId) : '');
  }, [ticket.featureId, ticket.id]);

  useEffect(() => {
    if (!open) return;
    const effectiveProjectId = projectId || ticket.projectId;
    if (!effectiveProjectId) return;
    featureApi.getFeatures(effectiveProjectId)
      .then((rows) => setFeatures([...rows].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }))))
      .catch(() => setFeatures([]));
  }, [open, projectId, ticket.projectId]);

  const featureLabel = useMemo(() => {
    if (!selectedId) return null;
    return features.find((feature) => feature.id === selectedId)?.name || ticket.featureName || 'Feature';
  }, [features, selectedId, ticket.featureName]);

  const handleFeatureSave = async () => {
    const dueDate = ticket.dueDate ? format(new Date(ticket.dueDate), 'yyyy-MM-dd') : null;
    try {
      await updateTicketDetails(projectId || ticket.projectId, ticket.id, {
        title: ticket.title,
        description: ticket.description || '',
        dueDate,
        featureId: draftId ? Number(draftId) : null,
      });
      setSelectedId(draftId);
      setOpen(false);
    } catch {
      setDraftId(selectedId);
    }
  };

  const handleDelete = async () => {
    const effectiveProjectId = projectId || ticket.projectId;
    if (!effectiveProjectId) return;
    const confirmed = window.confirm(`Delete ticket ${ticket.id}?`);
    if (!confirmed) return;
    await ticketApi.deleteTicket(effectiveProjectId, ticket.id);
    setOpen(false);
    window.dispatchEvent(new CustomEvent('ticket:updated', { detail: { projectId: effectiveProjectId } }));
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          onClick={(e) => e.stopPropagation()}
          className={cn(
            'inline-flex h-7 w-7 items-center justify-center rounded-md border bg-background text-muted-foreground transition-colors hover:text-foreground hover:bg-accent',
            className
          )}
          aria-label="Ticket menu"
        >
          <MoreVertical className="h-4 w-4" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-64 rounded-xl border bg-card p-2 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <DropdownMenuLabel className="text-xs font-semibold text-muted-foreground">Feature</DropdownMenuLabel>
        <div className="px-2 pb-2">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Feature:</span>
            {featureLabel ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-primary/40 bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
                {featureLabel}
              </span>
            ) : (
              <span className="text-xs text-muted-foreground">No feature assigned</span>
            )}
          </div>
        </div>
        <DropdownMenuSeparator />
        <div className="px-2 pb-2">
          <SearchableFeatureSelect features={features} value={draftId} onChange={setDraftId} label="Change feature" />
          <div className="mt-2 flex items-center justify-between gap-2">
            <UnsavedChangesBadge visible={draftId !== selectedId} />
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setDraftId(selectedId)}
                disabled={draftId === selectedId}
                className="h-8 rounded-md border px-3 text-xs disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleFeatureSave()}
                disabled={draftId === selectedId}
                className="h-8 rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground disabled:opacity-60"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
        {user?.role === 'SUPER_ADMIN' && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onSelect={(event) => {
                event.preventDefault();
                void handleDelete();
              }}
              className="mx-1 rounded-lg text-red-600 focus:bg-red-50 focus:text-red-700 dark:text-red-400 dark:focus:bg-red-500/10 dark:focus:text-red-300"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete Ticket
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default TicketMenu;

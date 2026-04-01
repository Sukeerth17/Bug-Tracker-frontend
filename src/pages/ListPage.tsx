import React, { useCallback, useEffect, useState } from 'react';
import { useTickets } from '@/contexts/TicketContext';
import { PriorityIcon, TypeIcon, UserAvatar, StatusBadge, AssigneeStack } from '@/components/TicketBadges';
import TicketMenu from '@/components/TicketMenu';
import { priorityLabels, statusLabels, Ticket } from '@/data/models';
import type { TicketPriority, TicketStatus, TicketType, User } from '@/data/models';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Plus, Search, ChevronLeft, ChevronRight, Download, Paperclip } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { NavLink, useLocation, useParams, useSearchParams } from 'react-router-dom';
import { resolveProjectId } from '@/services/projectControl';
import { ticketApi } from '@/services/ticketApi';
import TypeFilterPopover from '@/components/TypeFilterPopover';
import AssigneeFilterPopover from '@/components/AssigneeFilterPopover';
import TerraformFilterSelect from '@/components/TerraformFilterSelect';

type SortKey = 'title' | 'status' | 'priority' | 'createdAt' | 'updatedAt' | 'dueDate' | 'assignee';

const ListPage = () => {
  const { setSelectedTicket } = useTickets();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const { spaceId, featureId } = useParams();
  const projectId = spaceId || resolveProjectId(location.pathname);
  const contextSearch = searchParams.get('search')?.trim() || '';
  const isFeatureView = Boolean(featureId);

  const [rows, setRows] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>('createdAt');
  const [sortAsc, setSortAsc] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'all' | TicketStatus>('all');
  const [priorityFilter, setPriorityFilter] = useState<'all' | TicketPriority>('all');
  const [assigneeFilter, setAssigneeFilter] = useState<{ assigneeIds: string[]; unassigned: boolean }>({
    assigneeIds: searchParams.get('assigneeIds')?.split(',').filter(Boolean) || [],
    unassigned: searchParams.get('unassigned') === 'true',
  });
  const [typeFilter, setTypeFilter] = useState<TicketType[]>(searchParams.get('types')?.split(',').filter(Boolean) as TicketType[] || []);
  const [terraformFilter, setTerraformFilter] = useState<string>(searchParams.get('terraform') || 'all');
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [terraformOptions, setTerraformOptions] = useState<string[]>([]);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const loadTickets = useCallback(async () => {
    if (!projectId) {
      setRows([]);
      setTotalItems(0);
      setTotalPages(1);
      return;
    }

    setLoading(true);
    window.dispatchEvent(new CustomEvent('ticket:context-search-loading', { detail: { loading: true } }));
    try {
      const response = await ticketApi.queryTickets(projectId, {
        featureId: featureId || undefined,
        q: contextSearch || undefined,
        search: contextSearch || undefined,
        status: statusFilter === 'all' ? undefined : statusFilter,
        priority: priorityFilter === 'all' ? undefined : priorityFilter,
        assigneeIds: assigneeFilter.assigneeIds.length > 0 ? assigneeFilter.assigneeIds.map(Number) : undefined,
        unassigned: assigneeFilter.unassigned,
        types: typeFilter.length > 0 ? typeFilter : undefined,
        terraform: terraformFilter !== 'all' ? terraformFilter : undefined,
        sortBy: sortKey,
        sortDir: sortAsc ? 'asc' : 'desc',
        page,
        size: pageSize,
      });
      setRows(response.items);
      setTotalItems(response.totalItems);
      setTotalPages(Math.max(response.totalPages, 1));
      setSelected(new Set());
    } catch {
      setRows([]);
      setTotalItems(0);
      setTotalPages(1);
    } finally {
      setLoading(false);
      window.dispatchEvent(new CustomEvent('ticket:context-search-loading', { detail: { loading: false } }));
    }
  }, [projectId, featureId, contextSearch, statusFilter, priorityFilter, assigneeFilter, typeFilter, terraformFilter, sortKey, sortAsc, page, pageSize]);

  useEffect(() => {
    if (!projectId) {
      setAvailableUsers([]);
      return;
    }
    ticketApi.queryTickets(projectId, {
      featureId: featureId || undefined,
      search: contextSearch || undefined,
      status: statusFilter === 'all' ? undefined : statusFilter,
      priority: priorityFilter === 'all' ? undefined : priorityFilter,
      types: typeFilter.length > 0 ? typeFilter : undefined,
      terraform: terraformFilter !== 'all' ? terraformFilter : undefined,
      sortBy: sortKey,
      sortDir: sortAsc ? 'asc' : 'desc',
      page: 0,
      size: 50,
    })
      .then((response) => {
        const users = new Map<string, User>();
        response.items.forEach((ticket) => {
          ticket.assignees.forEach((assignee) => users.set(assignee.id, assignee));
        });
        setAvailableUsers(Array.from(users.values()).sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })));
      })
      .catch(() => setAvailableUsers([]));
  }, [projectId, featureId, contextSearch, statusFilter, priorityFilter, typeFilter, terraformFilter, sortKey, sortAsc]);

  useEffect(() => {
    if (!projectId) {
      setTerraformOptions([]);
      return;
    }
    ticketApi.getTerraformOptions(projectId)
      .then(setTerraformOptions)
      .catch(() => setTerraformOptions([]));
  }, [projectId]);

  useEffect(() => {
    setPage(0);
  }, [contextSearch]);

  useEffect(() => {
    const next = new URLSearchParams(searchParams);
    if (typeFilter.length > 0) next.set('types', typeFilter.join(','));
    else next.delete('types');
    if (assigneeFilter.assigneeIds.length > 0) next.set('assigneeIds', assigneeFilter.assigneeIds.join(','));
    else next.delete('assigneeIds');
    if (assigneeFilter.unassigned) next.set('unassigned', 'true');
    else next.delete('unassigned');
    if (terraformFilter !== 'all') next.set('terraform', terraformFilter);
    else next.delete('terraform');
    if (contextSearch) next.set('search', contextSearch);
    else next.delete('search');
    setSearchParams(next, { replace: true });
  }, [contextSearch, typeFilter, assigneeFilter, terraformFilter, searchParams, setSearchParams]);

  useEffect(() => {
    loadTickets();
  }, [loadTickets]);

  useEffect(() => {
    const handler = () => loadTickets();
    window.addEventListener('ticket:created', handler as EventListener);
    window.addEventListener('ticket:updated', handler as EventListener);
    return () => {
      window.removeEventListener('ticket:created', handler as EventListener);
      window.removeEventListener('ticket:updated', handler as EventListener);
    };
  }, [loadTickets]);

  const toggleSort = (key: SortKey) => {
    setPage(0);
    if (sortKey === key) setSortAsc(!sortAsc);
    else {
      setSortKey(key);
      setSortAsc(true);
    }
  };

  const sortIcon = (key: SortKey) => {
    if (sortKey !== key) return '↕';
    return sortAsc ? '↑' : '↓';
  };

  const exportPDF = () => {
    const doc = new jsPDF({ orientation: 'landscape' });
    doc.setFontSize(12);
    doc.text(`Tickets Export - ${format(new Date(), 'yyyy-MM-dd')}`, 14, 14);

    const headers = [['Ticket ID', 'Title', 'Department', 'Type', 'Assignee', 'Reporter', 'Status', 'Priority', 'Created', 'Updated', 'Due']];
    const exportRows = rows.map((t) => [
      t.id,
      t.title,
      t.department,
      t.type,
      t.assignees.length > 0 ? t.assignees.map((assignee) => assignee.name).join(', ') : 'Unassigned',
      t.reporter?.name || 'Hidden',
      statusLabels[t.status],
      t.priority,
      t.createdAt ? format(new Date(t.createdAt), 'yyyy-MM-dd') : '',
      t.updatedAt ? format(new Date(t.updatedAt), 'yyyy-MM-dd') : '',
      t.dueDate ? format(new Date(t.dueDate), 'yyyy-MM-dd') : '',
    ]);

    autoTable(doc, {
      head: headers,
      body: exportRows,
      startY: 20,
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [59, 130, 246] },
    });

    doc.save(`tickets-export-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
  };

  const thCls = 'px-3 py-2 text-left text-xs font-semibold text-muted-foreground cursor-pointer hover:text-foreground select-none';
  const isOverdue = (d: string | null) => d && new Date(d) < new Date();
  const isDueSoon = (d: string | null) => d && !isOverdue(d) && new Date(d) < new Date(Date.now() + 48 * 3600000);

  return (
    <div className="p-6 space-y-4 max-w-7xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {spaceId && (
            <div className="inline-flex items-center rounded-lg border bg-muted/40 p-1 text-xs">
              <NavLink
                to={featureId ? `/space/${spaceId}/feature/${featureId}/board` : `/space/${spaceId}/board`}
                className={({ isActive }) => cn(
                  'px-3 py-1 rounded-md transition-colors',
                  isActive ? 'bg-card text-foreground shadow' : 'text-muted-foreground hover:text-foreground'
                )}
              >
                Board
              </NavLink>
              <NavLink
                to={featureId ? `/space/${spaceId}/feature/${featureId}/list` : `/space/${spaceId}/list`}
                className={({ isActive }) => cn(
                  'px-3 py-1 rounded-md transition-colors',
                  isActive ? 'bg-card text-foreground shadow' : 'text-muted-foreground hover:text-foreground'
                )}
              >
                List
              </NavLink>
            </div>
          )}
          <h1 className="text-xl font-semibold">List</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => window.dispatchEvent(new CustomEvent('ticket:new', { detail: { status: 'todo' } }))}
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            Create
          </button>
          <div className="h-8 rounded-md border bg-muted/40 px-3 text-xs text-muted-foreground inline-flex items-center gap-1.5">
            <Search className="h-3.5 w-3.5" />
            Header search active
          </div>
          {loading && <span className="text-xs text-muted-foreground">Loading...</span>}
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value as 'all' | TicketStatus);
              setPage(0);
            }}
            className="h-8 rounded-md border bg-background px-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            <option value="all">All Status</option>
            {Object.entries(statusLabels).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
          <select
            value={priorityFilter}
            onChange={(e) => {
              setPriorityFilter(e.target.value as 'all' | TicketPriority);
              setPage(0);
            }}
            className="h-8 rounded-md border bg-background px-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            <option value="all">All Priority</option>
            {Object.entries(priorityLabels).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
          <TypeFilterPopover value={typeFilter} onApply={(next) => {
            setTypeFilter(next);
            setPage(0);
          }} />
          <TerraformFilterSelect
            value={terraformFilter}
            options={terraformOptions}
            onChange={(next) => {
              setTerraformFilter(next);
              setPage(0);
            }}
          />
          <AssigneeFilterPopover users={availableUsers} value={assigneeFilter} onApply={(next) => {
            setAssigneeFilter(next);
            setPage(0);
          }} />
        </div>
      </div>

      <div className="bg-card rounded-xl border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="w-10 px-3 py-2">
                  <input
                    type="checkbox"
                    className="rounded"
                    checked={selected.size === rows.length && rows.length > 0}
                    onChange={(e) => setSelected(e.target.checked ? new Set(rows.map((t) => t.id)) : new Set())}
                  />
                </th>
                <th className={thCls} onClick={() => toggleSort('title')}>Work {sortIcon('title')}</th>
                <th className={thCls} onClick={() => toggleSort('assignee')}>Assignees {sortIcon('assignee')}</th>
                <th className={thCls}>Reporter</th>
                <th className={thCls} onClick={() => toggleSort('status')}>Status {sortIcon('status')}</th>
                <th className={thCls} onClick={() => toggleSort('priority')}>Priority {sortIcon('priority')}</th>
                <th className={thCls} onClick={() => toggleSort('createdAt')}>Created {sortIcon('createdAt')}</th>
                <th className={thCls} onClick={() => toggleSort('updatedAt')}>Updated {sortIcon('updatedAt')}</th>
                <th className={thCls} onClick={() => toggleSort('dueDate')}>Due {sortIcon('dueDate')}</th>
              </tr>
            </thead>
            <tbody>
              {loading && rows.length === 0 && Array.from({ length: 6 }).map((_, idx) => (
                <tr key={`skeleton-${idx}`} className="border-b">
                  <td className="px-3 py-2"><div className="h-4 w-4 rounded bg-muted/60 animate-pulse" /></td>
                  <td className="px-3 py-2"><div className="h-4 w-48 rounded bg-muted/60 animate-pulse" /></td>
                  <td className="px-3 py-2"><div className="h-4 w-20 rounded bg-muted/60 animate-pulse" /></td>
                  <td className="px-3 py-2"><div className="h-4 w-20 rounded bg-muted/60 animate-pulse" /></td>
                  <td className="px-3 py-2"><div className="h-4 w-16 rounded bg-muted/60 animate-pulse" /></td>
                  <td className="px-3 py-2"><div className="h-4 w-16 rounded bg-muted/60 animate-pulse" /></td>
                  <td className="px-3 py-2"><div className="h-4 w-20 rounded bg-muted/60 animate-pulse" /></td>
                  <td className="px-3 py-2"><div className="h-4 w-20 rounded bg-muted/60 animate-pulse" /></td>
                  <td className="px-3 py-2"><div className="h-4 w-20 rounded bg-muted/60 animate-pulse" /></td>
                </tr>
              ))}
              {rows.map((ticket, i) => (
                <tr key={ticket.id} className={cn('border-b transition-colors hover:bg-accent/50', i % 2 === 1 && 'bg-muted/20')}>
                  <td className="px-3 py-2">
                    <input
                      type="checkbox"
                      className="rounded"
                      checked={selected.has(ticket.id)}
                      onChange={(e) => {
                        const next = new Set(selected);
                        if (e.target.checked) next.add(ticket.id); else next.delete(ticket.id);
                        setSelected(next);
                      }}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-start gap-2">
                      <TypeIcon type={ticket.type} />
                      <span className="font-mono text-xs text-muted-foreground">{ticket.id}</span>
                      {ticket.attachments.length > 0 && (
                        <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                          <Paperclip className="h-3 w-3" />
                          {ticket.attachments.length}
                        </span>
                      )}
                      <div className="min-w-0 flex-1">
                        <button
                          onClick={() => setSelectedTicket(ticket)}
                          className="text-sm hover:text-primary hover:underline transition-colors truncate max-w-xs text-left"
                        >
                          {ticket.title}
                        </button>
                        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                          <span className="inline-flex items-center rounded-full border bg-muted/50 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                            {ticket.projectId}
                          </span>
                          {ticket.featureName && (
                            <span className="inline-flex items-center rounded-full border bg-muted/50 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                              {ticket.featureName}
                            </span>
                          )}
                        </div>
                      </div>
                      <TicketMenu ticket={ticket} projectId={projectId || ticket.projectId} className="mt-0.5" />
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    <AssigneeStack assignees={ticket.assignees} />
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-1.5">
                      <UserAvatar name={ticket.reporter.name} avatar={ticket.reporter.avatar} />
                      <span className="text-xs hidden xl:inline">{ticket.reporter.name}</span>
                    </div>
                  </td>
                  <td className="px-3 py-2"><StatusBadge status={ticket.status} /></td>
                  <td className="px-3 py-2"><PriorityIcon priority={ticket.priority} /></td>
                  <td className="px-3 py-2 text-xs text-muted-foreground whitespace-nowrap">{format(new Date(ticket.createdAt), 'MMM d, yyyy')}</td>
                  <td className="px-3 py-2 text-xs text-muted-foreground whitespace-nowrap">{format(new Date(ticket.updatedAt), 'MMM d, yyyy')}</td>
                  <td className={cn('px-3 py-2 text-xs whitespace-nowrap', isOverdue(ticket.dueDate) && ticket.status !== 'done' ? 'text-destructive font-medium' : isDueSoon(ticket.dueDate) ? 'text-warning font-medium' : 'text-muted-foreground')}>
                    {ticket.dueDate ? format(new Date(ticket.dueDate), 'MMM d, yyyy') : '—'}
                  </td>
                </tr>
              ))}
              {rows.length === 0 && !loading && (
                <tr>
                  <td colSpan={9} className="px-3 py-6 text-center text-sm text-muted-foreground">No tickets found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <button
              className="h-8 w-8 rounded-md border flex items-center justify-center text-muted-foreground hover:text-foreground"
              onClick={() => setPage((p) => Math.max(p - 1, 0))}
              disabled={page === 0}
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              className="h-8 w-8 rounded-md border flex items-center justify-center text-muted-foreground hover:text-foreground"
              onClick={() => setPage((p) => Math.min(p + 1, totalPages - 1))}
              disabled={page >= totalPages - 1}
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            <span className="text-xs text-muted-foreground">Page {page + 1} of {totalPages}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={exportPDF}
              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md border text-xs font-medium hover:bg-accent"
            >
              <Download className="h-3.5 w-3.5" />
              Export PDF
            </button>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPage(0);
              }}
              className="h-8 rounded-md border bg-background px-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              <option value={10}>10 / page</option>
              <option value={25}>25 / page</option>
              <option value={50}>50 / page</option>
            </select>
            <span className="text-xs text-muted-foreground">
              Showing {rows.length === 0 ? 0 : page * pageSize + 1}–{Math.min((page + 1) * pageSize, totalItems)} of {totalItems}
            </span>
          </div>
        </div>
      </div>
      {!loading && rows.length === 0 && (
        <div className="rounded-xl border bg-card p-6 text-center">
          <p className="text-sm font-medium">No tickets found</p>
          <p className="text-xs text-muted-foreground mt-1">Try adjusting your filters or create a new ticket.</p>
        </div>
      )}
    </div>
  );
};

export default ListPage;

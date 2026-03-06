import React, { useState, useMemo } from 'react';
import { useTickets } from '@/contexts/TicketContext';
import { StatusBadge, PriorityIcon, TypeIcon, DeptBadge, UserAvatar, GhostAvatar } from '@/components/TicketBadges';
import { priorityLabels, statusLabels } from '@/data/models';
import type { TicketPriority, TicketStatus } from '@/data/models';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Plus, Search, ChevronLeft, ChevronRight, Download } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

type SortKey = 'title' | 'status' | 'priority' | 'created' | 'updated' | 'dueDate';

const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
const statusOrder: Record<TicketStatus, number> = { 'todo': 0, 'in-progress': 1, 'in-review': 2, 'done': 3 };

const ListPage = () => {
  const { tickets, setSelectedTicket, updateTicketStatus } = useTickets();
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('created');
  const [sortAsc, setSortAsc] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'all' | TicketStatus>('all');
  const [priorityFilter, setPriorityFilter] = useState<'all' | TicketPriority>('all');
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const filtered = useMemo(() => {
    let t = [...tickets];
    if (search) t = t.filter(tk => tk.title.toLowerCase().includes(search.toLowerCase()) || tk.id.toLowerCase().includes(search.toLowerCase()));
    if (statusFilter !== 'all') t = t.filter(tk => tk.status === statusFilter);
    if (priorityFilter !== 'all') t = t.filter(tk => tk.priority === priorityFilter);
    t.sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case 'title': cmp = a.title.localeCompare(b.title); break;
        case 'status': cmp = statusOrder[a.status] - statusOrder[b.status]; break;
        case 'priority': cmp = priorityOrder[a.priority] - priorityOrder[b.priority]; break;
        case 'created': cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(); break;
        case 'updated': cmp = new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime(); break;
        case 'dueDate': cmp = (a.dueDate || '9').localeCompare(b.dueDate || '9'); break;
        default: break;
      }
      return sortAsc ? cmp : -cmp;
    });
    return t;
  }, [tickets, search, statusFilter, priorityFilter, sortKey, sortAsc]);

  const totalPages = Math.ceil(filtered.length / pageSize);
  const paged = filtered.slice(page * pageSize, (page + 1) * pageSize);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(true); }
  };

  const exportPDF = () => {
    const doc = new jsPDF({ orientation: 'landscape' });
    doc.setFontSize(12);
    doc.text(`Tickets Export - ${format(new Date(), 'yyyy-MM-dd')}`, 14, 14);

    const headers = [['Ticket ID', 'Title', 'Department', 'Type', 'Assignee', 'Reporter', 'Status', 'Priority', 'Created', 'Updated', 'Due']];
    const rows = filtered.map(t => [
      t.id,
      t.title,
      t.department,
      t.type,
      t.assignee?.name || 'Unassigned',
      t.reporter?.name || 'Hidden',
      statusLabels[t.status],
      t.priority,
      t.createdAt ? format(new Date(t.createdAt), 'yyyy-MM-dd') : '',
      t.updatedAt ? format(new Date(t.updatedAt), 'yyyy-MM-dd') : '',
      t.dueDate ? format(new Date(t.dueDate), 'yyyy-MM-dd') : '',
    ]);

    autoTable(doc, {
      head: headers,
      body: rows,
      startY: 20,
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [59, 130, 246] },
    });

    doc.save(`tickets-export-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
  };

  const thCls = "px-3 py-2 text-left text-xs font-semibold text-muted-foreground cursor-pointer hover:text-foreground select-none";
  const isOverdue = (d: string | null) => d && new Date(d) < new Date();
  const isDueSoon = (d: string | null) => d && !isOverdue(d) && new Date(d) < new Date(Date.now() + 48 * 3600000);

  return (
    <div className="p-6 space-y-4 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">List</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => window.dispatchEvent(new CustomEvent('ticket:new', { detail: { status: 'todo' } }))}
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            Create
          </button>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <input value={search} onChange={e => { setSearch(e.target.value); setPage(0); }} placeholder="Filter tickets…" className="h-8 w-56 pl-8 pr-3 rounded-md border bg-background text-xs focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value as 'all' | TicketStatus); setPage(0); }}
            className="h-8 rounded-md border bg-background px-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            <option value="all">All Status</option>
            {Object.entries(statusLabels).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
          <select
            value={priorityFilter}
            onChange={(e) => { setPriorityFilter(e.target.value as 'all' | TicketPriority); setPage(0); }}
            className="h-8 rounded-md border bg-background px-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            <option value="all">All Priority</option>
            {Object.entries(priorityLabels).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="bg-card rounded-xl border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="w-10 px-3 py-2">
                  <input type="checkbox" className="rounded" checked={selected.size === paged.length && paged.length > 0} onChange={e => setSelected(e.target.checked ? new Set(paged.map(t => t.id)) : new Set())} />
                </th>
                <th className={thCls} onClick={() => toggleSort('title')}>Work {sortKey === 'title' && (sortAsc ? '↑' : '↓')}</th>
                <th className={thCls}>Assignee</th>
                <th className={thCls}>Reporter</th>
                <th className={thCls} onClick={() => toggleSort('status')}>Status {sortKey === 'status' && (sortAsc ? '↑' : '↓')}</th>
                <th className={thCls} onClick={() => toggleSort('priority')}>Priority {sortKey === 'priority' && (sortAsc ? '↑' : '↓')}</th>
                <th className={thCls} onClick={() => toggleSort('created')}>Created {sortKey === 'created' && (sortAsc ? '↑' : '↓')}</th>
                <th className={thCls} onClick={() => toggleSort('updated')}>Updated {sortKey === 'updated' && (sortAsc ? '↑' : '↓')}</th>
                <th className={thCls} onClick={() => toggleSort('dueDate')}>Due {sortKey === 'dueDate' && (sortAsc ? '↑' : '↓')}</th>
              </tr>
            </thead>
            <tbody>
              {paged.map((ticket, i) => (
                <tr key={ticket.id} className={cn('border-b transition-colors hover:bg-accent/50', i % 2 === 1 && 'bg-muted/20')}>
                  <td className="px-3 py-2"><input type="checkbox" className="rounded" checked={selected.has(ticket.id)} onChange={e => { const s = new Set(selected); e.target.checked ? s.add(ticket.id) : s.delete(ticket.id); setSelected(s); }} /></td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <TypeIcon type={ticket.type} />
                      <span className="font-mono text-xs text-muted-foreground">{ticket.id}</span>
                      <button onClick={() => setSelectedTicket(ticket)} className="text-sm hover:text-primary hover:underline transition-colors truncate max-w-xs text-left">{ticket.title}</button>
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-1.5">
                      {ticket.assignee ? <><UserAvatar name={ticket.assignee.name} avatar={ticket.assignee.avatar} /><span className="text-xs hidden xl:inline">{ticket.assignee.name}</span></> : <GhostAvatar />}
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-1.5">
                      <UserAvatar name={ticket.reporter.name} avatar={ticket.reporter.avatar} />
                      <span className="text-xs hidden xl:inline">{ticket.reporter.name}</span>
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    <select
                      value={ticket.status}
                      onChange={e => updateTicketStatus(ticket.id, e.target.value as TicketStatus)}
                      className="h-6 rounded-full text-[11px] font-medium border-0 bg-muted px-2 focus:outline-none cursor-pointer"
                    >
                      {Object.entries(statusLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                  </td>
                  <td className="px-3 py-2"><PriorityIcon priority={ticket.priority} /></td>
                  <td className="px-3 py-2 text-xs text-muted-foreground whitespace-nowrap">{format(new Date(ticket.createdAt), 'MMM d, yyyy')}</td>
                  <td className="px-3 py-2 text-xs text-muted-foreground whitespace-nowrap">{format(new Date(ticket.updatedAt), 'MMM d, yyyy')}</td>
                  <td className={cn('px-3 py-2 text-xs whitespace-nowrap', isOverdue(ticket.dueDate) && ticket.status !== 'done' ? 'text-destructive font-medium' : isDueSoon(ticket.dueDate) ? 'text-warning font-medium' : 'text-muted-foreground')}>
                    {ticket.dueDate ? format(new Date(ticket.dueDate), 'MMM d, yyyy') : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination + Export */}
        <div className="flex items-center justify-between px-4 py-3 border-t text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <button disabled={page === 0} onClick={() => setPage(p => p - 1)} className="p-1 rounded hover:bg-accent disabled:opacity-30"><ChevronLeft className="h-4 w-4" /></button>
            <span>{page + 1} / {totalPages || 1}</span>
            <button disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)} className="p-1 rounded hover:bg-accent disabled:opacity-30"><ChevronRight className="h-4 w-4" /></button>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={exportPDF} className="inline-flex items-center gap-1.5 h-7 px-3 rounded-md border text-xs font-medium hover:bg-accent transition-colors">
              <Download className="h-3.5 w-3.5" />
              Export PDF
            </button>
            <select value={pageSize} onChange={e => { setPageSize(Number(e.target.value)); setPage(0); }} className="h-7 rounded border bg-background px-2 text-xs">
              {[10, 25, 50].map(n => <option key={n} value={n}>{n} / page</option>)}
            </select>
            <span>
              Showing {filtered.length === 0 ? 0 : (page * pageSize + 1)}–{Math.min((page + 1) * pageSize, filtered.length)} of {filtered.length}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ListPage;

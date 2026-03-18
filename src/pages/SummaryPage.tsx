import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { CheckCircle2, ListChecks } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { useTickets } from '@/contexts/TicketContext';
import { StatusBadge, UserAvatar, DeptBadge } from '@/components/TicketBadges';
import { statusLabels, departments } from '@/data/models';
import type { ActivityEvent, Department, TicketStatus, Ticket } from '@/data/models';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { dashboardApi, DashboardSummary } from '@/services/dashboardApi';
import { useLocation, useParams } from 'react-router-dom';
import { resolveProjectId } from '@/services/projectControl';
import { ticketApi } from '@/services/ticketApi';

const statusColors: Record<TicketStatus, string> = {
  todo: '#94a3b8',
  'in-progress': '#3b82f6',
  'in-review': '#f59e0b',
  done: '#22c55e',
};

type SortKey = 'department' | 'status' | 'assignee';

const SummaryPage = () => {
  const { setSelectedTicket } = useTickets();
  const location = useLocation();
  const { spaceId } = useParams();
  const projectId = spaceId || resolveProjectId(location.pathname);
  const [activity, setActivity] = useState<ActivityEvent[]>([]);
  const [activityTickets, setActivityTickets] = useState<Record<string, Ticket>>({});

  const [deptFilter, setDeptFilter] = useState<Department | 'All'>('All');
  const [listDeptFilter, setListDeptFilter] = useState<Department | 'All'>('All');
  const [listStatusFilter, setListStatusFilter] = useState<TicketStatus | 'All'>('All');
  const [dashboard, setDashboard] = useState<DashboardSummary | null>(null);
  const [summaryRows, setSummaryRows] = useState<Ticket[]>([]);
  const [sortKey, setSortKey] = useState<SortKey>('department');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const fetchDashboard = useCallback(() => {
    if (!projectId) {
      setDashboard(null);
      return;
    }
    const deptParam = deptFilter === 'All'
      ? undefined
      : deptFilter.toUpperCase().replace(/\s+/g, '_');
    dashboardApi.getSummary(projectId, deptParam)
      .then(setDashboard)
      .catch(() => setDashboard(null));
  }, [projectId, deptFilter]);

  const fetchActivity = useCallback(() => {
    if (!projectId) {
      setActivity([]);
      setActivityTickets({});
      return;
    }
    ticketApi.getActivity(projectId)
      .then(setActivity)
      .catch(() => setActivity([]));
  }, [projectId]);

  useEffect(() => {
    if (!projectId || activity.length === 0) {
      setActivityTickets({});
      return;
    }
    const ids = Array.from(new Set(activity.map((event) => event.ticketId).filter(Boolean))) as string[];
    if (ids.length === 0) {
      setActivityTickets({});
      return;
    }
    Promise.all(ids.map((id) => ticketApi.getTicketById(projectId, id).catch(() => null)))
      .then((rows) => {
        const next: Record<string, Ticket> = {};
        rows.forEach((ticket) => {
          if (ticket) next[ticket.id] = ticket;
        });
        setActivityTickets(next);
      })
      .catch(() => setActivityTickets({}));
  }, [activity, projectId]);

  const fetchSummary = useCallback(() => {
    if (!projectId) {
      setSummaryRows([]);
      return;
    }
    ticketApi.getSummaryFiltered(projectId, {
      department: listDeptFilter === 'All' ? undefined : listDeptFilter,
      status: listStatusFilter === 'All' ? undefined : listStatusFilter,
      sortBy: sortKey === 'assignee' ? 'assignee' : sortKey,
      sortDir,
    })
      .then(setSummaryRows)
      .catch(() => setSummaryRows([]));
  }, [projectId, listDeptFilter, listStatusFilter, sortKey, sortDir]);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  useEffect(() => {
    fetchActivity();
  }, [fetchActivity]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  useEffect(() => {
    const handler = () => {
      fetchActivity();
      fetchDashboard();
      fetchSummary();
    };
    window.addEventListener('ticket:updated', handler);
    window.addEventListener('ticket:created', handler);
    return () => {
      window.removeEventListener('ticket:updated', handler);
      window.removeEventListener('ticket:created', handler);
    };
  }, [fetchActivity, fetchDashboard, fetchSummary]);

  const statusCounts = useMemo(() => {
    const fromSummaryRows = () => {
      const fallback = { todo: 0, inProgress: 0, inReview: 0, done: 0 };
      for (const ticket of summaryRows) {
        if (ticket.status === 'todo') fallback.todo += 1;
        else if (ticket.status === 'in-progress') fallback.inProgress += 1;
        else if (ticket.status === 'in-review') fallback.inReview += 1;
        else if (ticket.status === 'done') fallback.done += 1;
      }
      const total = fallback.todo + fallback.inProgress + fallback.inReview + fallback.done;
      return { ...fallback, total };
    };

    if (dashboard) {
      const byStatus = dashboard.byStatus || {};
      const todo = Number(byStatus['todo'] || byStatus['TODO'] || 0);
      const inProgress = Number(byStatus['in-progress'] || byStatus['IN_PROGRESS'] || 0);
      const inReview = Number(byStatus['in-review'] || byStatus['IN_REVIEW'] || 0);
      const done = Number(byStatus['done'] || byStatus['DONE'] || 0);
      const total = Number(dashboard.totalTickets ?? (todo + inProgress + inReview + done));
      const sum = todo + inProgress + inReview + done;
      if (sum > 0 || summaryRows.length === 0) {
        return { todo, inProgress, inReview, done, total };
      }
    }
    return fromSummaryRows();
  }, [dashboard, summaryRows]);

  const stats = useMemo(() => {
    return [
      { label: 'Todo', value: statusCounts.todo, icon: ListChecks, color: 'text-muted-foreground' },
      { label: 'In Progress', value: statusCounts.inProgress, icon: ListChecks, color: 'text-primary' },
      { label: 'In Review', value: statusCounts.inReview, icon: ListChecks, color: 'text-warning' },
      { label: 'Done', value: statusCounts.done, icon: CheckCircle2, color: 'text-success' },
      { label: 'Total', value: statusCounts.total, icon: ListChecks, color: 'text-muted-foreground' },
    ];
  }, [statusCounts]);

  const pieData = useMemo(() => ([
    { name: statusLabels.todo, value: statusCounts.todo, color: statusColors.todo },
    { name: statusLabels['in-progress'], value: statusCounts.inProgress, color: statusColors['in-progress'] },
    { name: statusLabels['in-review'], value: statusCounts.inReview, color: statusColors['in-review'] },
    { name: statusLabels.done, value: statusCounts.done, color: statusColors.done },
  ]), [statusCounts]);

  const totalTickets = statusCounts.total;
  const recentActivity = activity.slice(0, 15);

  const sortIcon = (key: SortKey) => {
    if (sortKey !== key) return '↕';
    return sortDir === 'asc' ? '↑' : '↓';
  };

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const selectCls = 'h-8 rounded-md border bg-background px-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary/30';

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <h1 className="text-xl font-semibold">Summary</h1>

      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex items-center gap-1">
          {deptFilter !== 'All' && <span className="h-2 w-2 rounded-full bg-primary shrink-0" />}
          <select
            value={deptFilter}
            onChange={(e) => setDeptFilter(e.target.value as Department | 'All')}
            className={selectCls}
          >
            <option value="All">All Departments</option>
            {departments.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 md:hidden">
        {stats.map((s) => (
          <div key={s.label} className="bg-card rounded-xl border p-4 flex items-center gap-3">
            <div className={cn('p-2 rounded-lg bg-muted', s.color)}>
              <s.icon className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold">{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="hidden md:flex items-stretch bg-card rounded-xl border">
        {stats.map((s, idx) => (
          <React.Fragment key={s.label}>
            <div className="flex-1 p-4 flex items-center gap-3">
              <div className={cn('p-2 rounded-lg bg-muted', s.color)}>
                <s.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            </div>
            {idx < stats.length - 1 && <div className="status-divider" />}
          </React.Fragment>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-card rounded-xl border p-5">
          <h3 className="text-sm font-semibold mb-4">Status Overview</h3>
          <div className="flex items-center gap-6">
            <div className="relative h-48 w-48 shrink-0">
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={pieData} dataKey="value" cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={2} strokeWidth={0}>
                    {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <p className="text-2xl font-bold">{totalTickets}</p>
                  <p className="text-[10px] text-muted-foreground">Total</p>
                </div>
              </div>
            </div>
            <div className="space-y-2">
              {pieData.map((d) => (
                <div key={d.name} className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
                  <span className="text-xs">{d.name}</span>
                  <span className="text-xs font-semibold ml-auto">{d.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-card rounded-xl border p-5">
          <h3 className="text-sm font-semibold mb-4">Recent Activity</h3>
          <div className="space-y-3 max-h-72 overflow-y-auto pr-2">
            {recentActivity.map((event) => (
              <div key={event.id} className="flex gap-3 group">
                <UserAvatar name={event.user.name} avatar={event.user.avatar} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm leading-snug">
                    <span className="font-medium">{event.user.name}</span>{' '}
                    <span className="text-muted-foreground">{event.action}</span>
                    {event.ticketId && (
                      <button
                        onClick={async () => {
                          if (!projectId) return;
                          try {
                            const t = await ticketApi.getTicketById(projectId, event.ticketId as string);
                            setSelectedTicket(t);
                          } catch {
                            // ignore
                          }
                        }}
                        className="ml-1 font-mono text-xs text-primary hover:underline"
                      >
                        {event.ticketId}
                      </button>
                    )}
                    {event.ticketId && activityTickets[event.ticketId] && (
                      <span className="ml-2 inline-flex items-center gap-1.5">
                        <span className="inline-flex items-center rounded-full border bg-muted/50 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                          {activityTickets[event.ticketId].projectId}
                        </span>
                        {activityTickets[event.ticketId].featureName && (
                          <span className="inline-flex items-center rounded-full border bg-muted/50 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                            {activityTickets[event.ticketId].featureName}
                          </span>
                        )}
                      </span>
                    )}
                  </p>
                  {event.oldValue && event.newValue && (
                    <div className="flex items-center gap-1 mt-0.5">
                      <StatusBadge status={event.oldValue as TicketStatus} />
                      <span className="text-muted-foreground text-xs">→</span>
                      <StatusBadge status={event.newValue as TicketStatus} />
                    </div>
                  )}
                  <p className="text-[11px] text-muted-foreground mt-0.5">{formatDistanceToNow(new Date(event.createdAt), { addSuffix: true })}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-card rounded-xl border p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <h3 className="text-sm font-semibold">Tickets by Department & Status</h3>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={listDeptFilter}
              onChange={(e) => setListDeptFilter(e.target.value as Department | 'All')}
              className={selectCls}
            >
              <option value="All">All Departments</option>
              {departments.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
            <select
              value={listStatusFilter}
              onChange={(e) => setListStatusFilter(e.target.value as TicketStatus | 'All')}
              className={selectCls}
            >
              <option value="All">All Status</option>
              {Object.entries(statusLabels).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">Ticket</th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground cursor-pointer" onClick={() => toggleSort('department')}>Department {sortIcon('department')}</th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground cursor-pointer" onClick={() => toggleSort('status')}>Status {sortIcon('status')}</th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground cursor-pointer" onClick={() => toggleSort('assignee')}>Assigned To {sortIcon('assignee')}</th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">Updated</th>
              </tr>
            </thead>
            <tbody>
              {summaryRows.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-3 py-6 text-center text-sm text-muted-foreground">
                    No tickets found for selected filters.
                  </td>
                </tr>
              )}
              {summaryRows.map((ticket) => (
                <tr key={ticket.id} className="border-b hover:bg-accent/40 transition-colors">
                  <td className="px-3 py-2">
                    <button
                      onClick={() => setSelectedTicket(ticket)}
                      className="text-left hover:text-primary hover:underline"
                    >
                      <span className="font-mono text-[11px] text-muted-foreground mr-2">{ticket.id}</span>
                      <span className="text-sm">{ticket.title}</span>
                    </button>
                  </td>
                  <td className="px-3 py-2"><DeptBadge department={ticket.department} /></td>
                  <td className="px-3 py-2"><StatusBadge status={ticket.status} /></td>
                  <td className="px-3 py-2">
                    {ticket.assignees.length > 0 ? (
                      <div className="flex items-center gap-2">
                        <UserAvatar name={ticket.assignees[0].name} avatar={ticket.assignees[0].avatar} />
                        <span className="text-xs">{ticket.assignees[0].name}{ticket.assignees.length > 1 ? ` +${ticket.assignees.length - 1}` : ''}</span>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">Unassigned</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">{formatDistanceToNow(new Date(ticket.updatedAt), { addSuffix: true })}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default SummaryPage;

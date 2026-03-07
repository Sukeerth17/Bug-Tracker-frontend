import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Activity as ActivityIcon, ListChecks, CalendarClock } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { useTickets } from '@/contexts/TicketContext';
import { StatusBadge, UserAvatar, DeptBadge } from '@/components/TicketBadges';
import { statusLabels, departments } from '@/data/models';
import type { Department, TicketStatus } from '@/data/models';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { dashboardApi, DashboardSummary } from '@/services/dashboardApi';
import { useLocation } from 'react-router-dom';
import { resolveProjectId } from '@/services/projectControl';

const statusColors: Record<TicketStatus, string> = {
  todo: '#94a3b8',
  'in-progress': '#f59e0b',
  'in-review': '#6366f1',
  done: '#22c55e',
};

const SummaryPage = () => {
  const { tickets, summaryTickets, allActivity, setSelectedTicket } = useTickets();
  const location = useLocation();
  const projectId = useMemo(() => resolveProjectId(location.pathname), [location.pathname]);

  const [deptFilter, setDeptFilter] = useState<Department | 'All'>('All');
  const [listDeptFilter, setListDeptFilter] = useState<Department | 'All'>('All');
  const [listStatusFilter, setListStatusFilter] = useState<TicketStatus | 'All'>('All');
  const [dashboard, setDashboard] = useState<DashboardSummary | null>(null);

  useEffect(() => {
    if (!projectId) {
      setDashboard(null);
      return;
    }
    dashboardApi.getSummary(projectId)
      .then(setDashboard)
      .catch(() => setDashboard(null));
  }, [projectId]);

  const filtered = useMemo(() => {
    if (deptFilter === 'All') return summaryTickets;
    return summaryTickets.filter((tk) => tk.department === deptFilter);
  }, [summaryTickets, deptFilter]);

  const stats = useMemo(() => {
    const total = dashboard?.totalTickets ?? filtered.length;
    const completed = dashboard?.closedTickets ?? filtered.filter((t) => t.status === 'done').length;
    const open = dashboard?.openTickets ?? filtered.filter((t) => t.status !== 'done').length;
    const dueSoon = filtered.filter((t) => t.dueDate && new Date(t.dueDate) <= new Date(Date.now() + 7 * 86400000) && t.status !== 'done').length;

    return [
      { label: 'Completed', value: completed, icon: CheckCircle2, color: 'text-success' },
      { label: 'Open', value: open, icon: ListChecks, color: 'text-primary' },
      { label: 'Activity', value: allActivity.length, icon: ActivityIcon, color: 'text-info' },
      { label: 'Due Soon', value: dueSoon, icon: CalendarClock, color: 'text-warning' },
      { label: 'Total', value: total, icon: ListChecks, color: 'text-muted-foreground' },
    ];
  }, [dashboard, filtered, allActivity.length]);

  const pieData = useMemo(() => {
    if (dashboard?.byStatus) {
      return (Object.keys(statusLabels) as TicketStatus[]).map((status) => ({
        name: statusLabels[status],
        value: Number(dashboard.byStatus[status] || 0),
        color: statusColors[status],
      }));
    }

    const counts: Record<TicketStatus, number> = { todo: 0, 'in-progress': 0, 'in-review': 0, done: 0 };
    filtered.forEach((t) => {
      counts[t.status] += 1;
    });
    return (Object.keys(counts) as TicketStatus[]).map((status) => ({
      name: statusLabels[status],
      value: counts[status],
      color: statusColors[status],
    }));
  }, [dashboard, filtered]);

  const totalTickets = pieData.reduce((sum, item) => sum + item.value, 0);
  const recentActivity = allActivity.slice(0, 15);

  const filteredTicketList = useMemo(() => {
    return summaryTickets.filter((ticket) => {
      if (listDeptFilter !== 'All' && ticket.department !== listDeptFilter) return false;
      if (listStatusFilter !== 'All' && ticket.status !== listStatusFilter) return false;
      return true;
    });
  }, [summaryTickets, listDeptFilter, listStatusFilter]);

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

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
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
                        onClick={() => {
                          const t = tickets.find((tk) => tk.id === event.ticketId);
                          if (t) setSelectedTicket(t);
                        }}
                        className="ml-1 font-mono text-xs text-primary hover:underline"
                      >
                        {event.ticketId}
                      </button>
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
                <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">Department</th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">Status</th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">Assignee</th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">Updated</th>
              </tr>
            </thead>
            <tbody>
              {filteredTicketList.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-3 py-6 text-center text-sm text-muted-foreground">
                    No tickets found for selected filters.
                  </td>
                </tr>
              )}
              {filteredTicketList.map((ticket) => (
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
                  <td className="px-3 py-2 text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(ticket.updatedAt), { addSuffix: true })}
                  </td>
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

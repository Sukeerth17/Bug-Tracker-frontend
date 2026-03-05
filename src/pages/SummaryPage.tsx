import React, { useState, useMemo } from 'react';
import { CheckCircle2, Pencil, PlusCircle, CalendarClock } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { useTickets } from '@/contexts/TicketContext';
import { StatusBadge, UserAvatar, DeptBadge } from '@/components/TicketBadges';
import { statusLabels, departments } from '@/data/mockData';
import type { Department, TicketStatus } from '@/data/mockData';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

const timeRanges = [
  { label: '1 Day', days: 1 },
  { label: '3 Days', days: 3 },
  { label: '5 Days', days: 5 },
  { label: '1 Week', days: 7 },
  { label: '2 Weeks', days: 14 },
  { label: '1 Month', days: 30 },
];

const statusColors: Record<TicketStatus, string> = {
  'todo': '#94a3b8',
  'in-progress': '#f59e0b',
  'in-review': '#6366f1',
  'done': '#22c55e',
};

const SummaryPage = () => {
  const { tickets, allActivity, setSelectedTicket } = useTickets();
  const [rangeIdx, setRangeIdx] = useState(3); // default "1 Week"
  const [deptFilter, setDeptFilter] = useState<Department | 'All'>('All');

  const range = timeRanges[rangeIdx];
  const cutoff = new Date(Date.now() - range.days * 86400000);

  const filtered = useMemo(() => {
    if (deptFilter === 'All') return tickets;
    return tickets.filter(tk => tk.department === deptFilter);
  }, [tickets, deptFilter]);

  const stats = useMemo(() => {
    const completed = filtered.filter(t => t.status === 'done' && new Date(t.updatedAt) >= cutoff).length;
    const updated = filtered.filter(t => new Date(t.updatedAt) >= cutoff).length;
    const created = filtered.filter(t => new Date(t.createdAt) >= cutoff).length;
    const dueSoon = filtered.filter(t => t.dueDate && new Date(t.dueDate) <= new Date(Date.now() + 7 * 86400000) && t.status !== 'done').length;
    return [
      { label: 'Completed', value: completed, icon: CheckCircle2, color: 'text-success' },
      { label: 'Updated', value: updated, icon: Pencil, color: 'text-primary' },
      { label: 'Created', value: created, icon: PlusCircle, color: 'text-info' },
      { label: 'Due Soon', value: dueSoon, icon: CalendarClock, color: 'text-warning' },
    ];
  }, [filtered, cutoff]);

  const pieData = useMemo(() => {
    const counts: Record<TicketStatus, number> = { 'todo': 0, 'in-progress': 0, 'in-review': 0, 'done': 0 };
    filtered.forEach(t => counts[t.status]++);
    return Object.entries(counts).map(([status, count]) => ({ name: statusLabels[status as TicketStatus], value: count, color: statusColors[status as TicketStatus] }));
  }, [filtered]);

  const totalTickets = filtered.length;
  const recentActivity = allActivity.slice(0, 15);

  const selectCls = "h-8 rounded-md border bg-background px-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary/30";

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <h1 className="text-xl font-semibold">Summary</h1>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <select value={rangeIdx} onChange={e => setRangeIdx(Number(e.target.value))} className={selectCls}>
          {timeRanges.map((r, i) => <option key={i} value={i}>{r.label}</option>)}
        </select>
        <div className="relative flex items-center gap-1">
          {deptFilter !== 'All' && <span className="h-2 w-2 rounded-full bg-primary shrink-0" />}
          <select
            value={deptFilter}
            onChange={e => setDeptFilter(e.target.value as Department | 'All')}
            className={selectCls}
          >
            <option value="All">All Departments</option>
            {departments.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map(s => (
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

      {/* Two columns */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Pie chart */}
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
              {pieData.map(d => (
                <div key={d.name} className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
                  <span className="text-xs">{d.name}</span>
                  <span className="text-xs font-semibold ml-auto">{d.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Activity feed */}
        <div className="bg-card rounded-xl border p-5">
          <h3 className="text-sm font-semibold mb-4">Recent Activity</h3>
          <div className="space-y-3 max-h-72 overflow-y-auto pr-2">
            {recentActivity.map(event => (
              <div key={event.id} className="flex gap-3 group">
                <UserAvatar name={event.user.name} avatar={event.user.avatar} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm leading-snug">
                    <span className="font-medium">{event.user.name}</span>{' '}
                    <span className="text-muted-foreground">{event.action}</span>
                    {event.ticketId && (
                      <button
                        onClick={() => {
                          const t = tickets.find(tk => tk.id === event.ticketId);
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
    </div>
  );
};

export default SummaryPage;

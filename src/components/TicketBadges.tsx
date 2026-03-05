import React from 'react';
import { cn } from '@/lib/utils';
import { TicketStatus, TicketPriority, TicketType, Department, statusLabels, priorityLabels, typeLabels } from '@/data/models';
import { Bug, CheckSquare, Bookmark, Zap, ChevronsUp, ChevronUp, Equal, ChevronDown } from 'lucide-react';

export const StatusBadge = ({ status, onClick }: { status: TicketStatus; onClick?: () => void }) => {
  const cls = {
    'todo': 'status-todo',
    'in-progress': 'status-in-progress',
    'in-review': 'status-in-review',
    'done': 'status-done',
  }[status];

  return (
    <span className={cn('status-badge cursor-default', cls, onClick && 'cursor-pointer hover:opacity-80')} onClick={onClick}>
      {statusLabels[status]}
    </span>
  );
};

export const PriorityIcon = ({ priority }: { priority: TicketPriority }) => {
  const icons = {
    critical: <ChevronsUp className="h-4 w-4 priority-critical" />,
    high: <ChevronUp className="h-4 w-4 priority-high" />,
    medium: <Equal className="h-4 w-4 priority-medium" />,
    low: <ChevronDown className="h-4 w-4 priority-low" />,
  };
  return (
    <span className="inline-flex items-center gap-1 text-xs">
      {icons[priority]}
      <span className={cn('hidden sm:inline', `priority-${priority}`)}>{priorityLabels[priority]}</span>
    </span>
  );
};

export const TypeIcon = ({ type }: { type: TicketType }) => {
  const icons = {
    bug: <Bug className="h-3.5 w-3.5 text-destructive" />,
    task: <CheckSquare className="h-3.5 w-3.5 text-primary" />,
    story: <Bookmark className="h-3.5 w-3.5 text-info" />,
    improvement: <Zap className="h-3.5 w-3.5 text-warning" />,
  };
  return icons[type];
};

export const DeptBadge = ({ department }: { department: Department }) => {
  const cls = {
    Website: 'dept-website',
    Mobile: 'dept-mobile',
    Backend: 'dept-backend',
    DevOps: 'dept-devops',
  }[department];
  return <span className={cn('status-badge', cls)}>{department}</span>;
};

export const UserAvatar = ({ name, avatar, size = 'sm' }: { name: string; avatar: string; size?: 'sm' | 'md' | 'lg' }) => {
  const sizes = { sm: 'h-6 w-6 text-[10px]', md: 'h-8 w-8 text-xs', lg: 'h-10 w-10 text-sm' };
  return (
    <div
      className={cn('rounded-full bg-primary/15 text-primary font-semibold flex items-center justify-center shrink-0', sizes[size])}
      title={name}
    >
      {avatar}
    </div>
  );
};

export const GhostAvatar = ({ size = 'sm' }: { size?: 'sm' | 'md' | 'lg' }) => {
  const sizes = { sm: 'h-6 w-6', md: 'h-8 w-8', lg: 'h-10 w-10' };
  return (
    <div className={cn('rounded-full bg-muted border-2 border-dashed border-muted-foreground/30 shrink-0', sizes[size])} title="Unassigned" />
  );
};

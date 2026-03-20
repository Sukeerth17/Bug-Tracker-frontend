import React, { useEffect, useMemo, useRef, useState } from 'react';
import { X } from 'lucide-react';
import type { User } from '@/data/models';
import { UserAvatar } from '@/components/TicketBadges';

type AssigneeFilterValue = {
  assigneeIds: string[];
  unassigned: boolean;
};

type AssigneeFilterPopoverProps = {
  users: User[];
  value: AssigneeFilterValue;
  onApply: (value: AssigneeFilterValue) => void;
};

const AssigneeFilterPopover = ({ users, value, onApply }: AssigneeFilterPopoverProps) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [draftIds, setDraftIds] = useState<string[]>(value.assigneeIds);
  const [draftUnassigned, setDraftUnassigned] = useState(value.unassigned);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    setDraftIds(value.assigneeIds);
    setDraftUnassigned(value.unassigned);
    const timer = window.setTimeout(() => inputRef.current?.focus(), 0);
    return () => window.clearTimeout(timer);
  }, [open, value.assigneeIds, value.unassigned]);

  useEffect(() => {
    if (!open) return;
    const handleOutsideClick = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (!containerRef.current || !target) return;
      if (!containerRef.current.contains(target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [open]);

  const filteredUsers = useMemo(() => {
    const sorted = [...users].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
    if (!query.trim()) return sorted;
    const normalized = query.trim().toLowerCase();
    return sorted.filter((user) => user.name.toLowerCase().includes(normalized));
  }, [users, query]);

  const allUserIds = useMemo(() => users.map((user) => user.id), [users]);
  const hasAllUsersInDraft = useMemo(
    () => allUserIds.length > 0 && allUserIds.every((id) => draftIds.includes(id)),
    [allUserIds, draftIds]
  );
  const isAllAssigneesDraft = !draftUnassigned && (draftIds.length === 0 || hasAllUsersInDraft);

  return (
    <div ref={containerRef} className="relative">
      <button type="button" onClick={() => setOpen((prev) => !prev)} className="h-8 rounded-md border bg-background px-3 text-xs">
        {value.assigneeIds.length === 0 && !value.unassigned ? 'All Assignees' : `Assignee (${value.assigneeIds.length + (value.unassigned ? 1 : 0)})`}
      </button>
      {open && (
        <div className="absolute right-0 z-50 mt-2 w-72 rounded-xl border bg-card p-2 shadow-xl">
          <div className="relative">
            <input
              ref={inputRef}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search users..."
              className="h-9 w-full rounded-md border bg-background px-3 pr-8 text-sm"
            />
            {query && (
              <button type="button" onClick={() => setQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:bg-accent">
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          <div className="mt-2 max-h-64 overflow-y-auto rounded-md border">
            <label className="flex items-center justify-between px-3 py-2 text-sm hover:bg-accent">
              <span>All Assignees</span>
              <input
                type="radio"
                checked={isAllAssigneesDraft}
                onChange={() => {
                  setDraftIds([]);
                  setDraftUnassigned(false);
                }}
              />
            </label>
            <label className="flex items-center justify-between px-3 py-2 text-sm hover:bg-accent">
              <span>Unassigned</span>
              <input
                type="checkbox"
                checked={draftUnassigned}
                onChange={() => setDraftUnassigned((prev) => !prev)}
              />
            </label>
            {filteredUsers.map((user) => (
              <label key={user.id} className="flex items-center justify-between gap-2 px-3 py-2 text-sm hover:bg-accent">
                <span className="inline-flex items-center gap-2">
                  <UserAvatar name={user.name} avatar={user.avatar} />
                  <span>{user.name}</span>
                  <span className="rounded-full border px-2 py-0.5 text-[10px] text-muted-foreground">{user.role || 'USER'}</span>
                </span>
                <input
                  type="checkbox"
                  checked={draftIds.includes(user.id)}
                  onChange={() => setDraftIds((prev) => (
                    prev.includes(user.id)
                      ? prev.filter((item) => item !== user.id)
                      : [...prev, user.id]
                  ))}
                />
              </label>
            ))}
          </div>
          <div className="mt-2 flex items-center justify-between">
            <button
              type="button"
              onClick={() => {
                setDraftIds([]);
                setDraftUnassigned(false);
              }}
              className="text-xs font-medium text-muted-foreground"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={() => {
                const normalizedIds = Array.from(new Set(draftIds));
                const hasAllUsers = allUserIds.length > 0 && allUserIds.every((id) => normalizedIds.includes(id));
                if (!draftUnassigned && hasAllUsers) {
                  onApply({ assigneeIds: [], unassigned: false });
                } else {
                  onApply({ assigneeIds: normalizedIds, unassigned: draftUnassigned });
                }
                setOpen(false);
              }}
              className="h-8 rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground"
            >
              Apply
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AssigneeFilterPopover;

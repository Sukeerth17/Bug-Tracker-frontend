import React, { useMemo, useRef, useState } from 'react';
import { Check, Search, Users } from 'lucide-react';
import { User } from '@/data/models';
import { UserAvatar, GhostAvatar } from '@/components/TicketBadges';
import { cn } from '@/lib/utils';

interface AssigneeMultiSelectProps {
  users: User[];
  value: string[];
  onChange: (next: string[]) => void;
  label?: string;
  disabled?: boolean;
}

const AssigneeMultiSelect = ({ users, value, onChange, label = 'Assignees', disabled = false }: AssigneeMultiSelectProps) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [draft, setDraft] = useState<string[]>(value);
  const ref = useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    setDraft(value);
  }, [value]);

  React.useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!ref.current) return;
      if (ref.current.contains(e.target as Node)) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q));
  }, [users, search]);

  const selectedUsers = useMemo(
    () => users.filter((user) => draft.includes(user.id)),
    [users, draft],
  );

  const isUnassigned = draft.length === 0;
  const selectedCount = draft.length;

  return (
    <div className="space-y-2" ref={ref}>
      <label className="text-xs font-semibold text-muted-foreground">{label}</label>
      <button
        type="button"
        onClick={() => !disabled && setOpen((prev) => !prev)}
        className={cn(
          'w-full h-10 rounded-lg border bg-background px-3 text-sm flex items-center justify-between transition-colors',
          disabled && 'opacity-60 cursor-not-allowed'
        )}
      >
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-muted-foreground" />
          <span>
            {selectedCount === 0
              ? 'Unassigned'
              : selectedCount === 1
                ? (selectedUsers[0]?.name || '1 selected')
                : `${selectedCount} selected`}
          </span>
        </div>
        <span className="text-xs text-muted-foreground">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="relative">
          <div className="absolute right-3 -top-9">
            {selectedCount > 0 && (
              <span className="inline-flex items-center rounded-full bg-primary/10 text-primary text-xs font-medium px-2 py-0.5">
                {selectedCount} selected
              </span>
            )}
          </div>
          <div className="mt-2 w-full rounded-xl border bg-card shadow-xl overflow-hidden animate-fade-in">
            <div className="p-3 border-b">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search users..."
                  className="w-full h-9 pl-9 pr-3 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
            </div>

            <div className="max-h-64 overflow-y-auto">
              <button
                type="button"
                onClick={() => setDraft([])}
                className={cn(
                  'w-full flex items-center justify-between px-4 py-2 text-sm hover:bg-accent/50 transition-colors',
                  isUnassigned && 'bg-primary/10'
                )}
              >
                <div className="flex items-center gap-2">
                  <GhostAvatar size="md" />
                  <div>
                    <p className="text-sm font-medium">Unassigned</p>
                    <p className="text-[11px] text-muted-foreground">Clear all assignees</p>
                  </div>
                </div>
                <span className={cn('h-4 w-4 rounded border flex items-center justify-center', isUnassigned ? 'bg-primary text-primary-foreground border-primary' : 'border-muted-foreground/40')}>
                  {isUnassigned && <Check className="h-3 w-3" />}
                </span>
              </button>

              {filtered.map((user) => {
                const checked = draft.includes(user.id);
                return (
                  <button
                    key={user.id}
                    type="button"
                    onClick={() => {
                      setDraft((prev) => {
                        if (prev.includes(user.id)) return prev.filter((id) => id !== user.id);
                        return [...prev, user.id];
                      });
                    }}
                    className={cn(
                      'w-full flex items-center justify-between px-4 py-2 text-sm hover:bg-accent/50 transition-colors',
                      checked && 'bg-primary/10'
                    )}
                  >
                <div className="flex items-center gap-2">
                  <UserAvatar name={user.name} avatar={user.avatar} />
                  <div>
                    <p className="text-sm font-medium">{user.name}</p>
                    <p className="text-[11px] text-muted-foreground">{user.email}</p>
                  </div>
                </div>
                <span className="ml-2 rounded-full border px-2 py-0.5 text-[10px] text-muted-foreground">{user.role || 'USER'}</span>
                <span className={cn('h-4 w-4 rounded border flex items-center justify-center', checked ? 'bg-primary text-primary-foreground border-primary' : 'border-muted-foreground/40')}>
                  {checked && <Check className="h-3 w-3" />}
                </span>
                  </button>
                );
              })}
              {filtered.length === 0 && (
                <p className="text-xs text-muted-foreground px-4 py-6 text-center">No users found.</p>
              )}
            </div>

            <div className="flex items-center justify-between gap-2 px-4 py-3 border-t bg-muted/40">
              <button
                type="button"
                onClick={() => setDraft([])}
                className="text-xs font-medium text-muted-foreground hover:text-foreground"
              >
                Clear All
              </button>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="h-8 px-3 rounded-md border text-xs font-medium hover:bg-accent"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onChange(draft);
                    setOpen(false);
                  }}
                  className="h-8 px-3 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90"
                >
                  Apply
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AssigneeMultiSelect;

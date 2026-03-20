import React, { useEffect, useMemo, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { Department, departments } from '@/data/models';
import { DeptBadge } from '@/components/TicketBadges';
import { cn } from '@/lib/utils';

type DepartmentMultiSelectProps = {
  value: Department[];
  onChange: (value: Department[]) => void;
  label?: string;
};

const DepartmentMultiSelect = ({ value, onChange, label = 'Departments' }: DepartmentMultiSelectProps) => {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Department[]>(value);
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  useEffect(() => {
    if (!open) {
      setQuery('');
      return;
    }
    const timer = window.setTimeout(() => inputRef.current?.focus(), 0);
    return () => window.clearTimeout(timer);
  }, [open]);

  const sortedDepartments = useMemo(
    () => [...departments].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' })),
    []
  );

  const filtered = useMemo(() => {
    if (!query.trim()) return sortedDepartments;
    const normalized = query.trim().toLowerCase();
    return sortedDepartments.filter((department) => department.toLowerCase().includes(normalized));
  }, [sortedDepartments, query]);

  const toggleDepartment = (department: Department) => {
    setDraft((prev) => (
      prev.includes(department)
        ? prev.filter((item) => item !== department)
        : [...prev, department].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }))
    ));
  };

  return (
    <div className="relative">
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="mt-1 flex min-h-9 w-full flex-wrap items-center gap-1 rounded-md border bg-background px-3 py-1.5 text-left text-sm"
      >
        {value.length === 0 && <span className="text-muted-foreground">Select departments</span>}
        {value.map((department) => (
          <span key={department} className="inline-flex items-center gap-1">
            <DeptBadge department={department} />
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onChange(value.filter((item) => item !== department));
              }}
              className="rounded p-0.5 text-muted-foreground hover:bg-accent"
              aria-label={`Remove ${department}`}
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
      </button>

      {open && (
        <div className="absolute z-50 mt-2 w-full rounded-xl border bg-card p-2 shadow-xl">
          <div className="relative">
            <input
              ref={inputRef}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search departments..."
              className="h-9 w-full rounded-md border bg-background px-3 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:bg-accent"
                aria-label="Clear department search"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <div className="mt-2 flex items-center justify-between px-1 text-xs">
            <button type="button" onClick={() => setDraft(sortedDepartments)} className="font-medium text-primary">Select All</button>
            <button type="button" onClick={() => setDraft([])} className="font-medium text-muted-foreground">Clear All</button>
          </div>

          <div className="mt-2 max-h-56 overflow-y-auto rounded-md border">
            {filtered.map((department) => (
              <label key={department} className={cn('flex items-center justify-between px-3 py-2 text-sm hover:bg-accent', draft.includes(department) && 'bg-accent/40')}>
                <span>{department}</span>
                <input
                  type="checkbox"
                  checked={draft.includes(department)}
                  onChange={() => toggleDepartment(department)}
                  className="rounded"
                />
              </label>
            ))}
            {filtered.length === 0 && (
              <p className="px-3 py-2 text-sm text-muted-foreground">No departments found</p>
            )}
          </div>

          <div className="mt-2 flex justify-end">
            <button
              type="button"
              onClick={() => {
                onChange(draft);
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

export default DepartmentMultiSelect;

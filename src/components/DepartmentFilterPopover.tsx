import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Department, departments } from '@/data/models';
import { DeptBadge } from '@/components/TicketBadges';
import { cn } from '@/lib/utils';

type DepartmentFilterPopoverProps = {
  value: Department[];
  onApply: (value: Department[]) => void;
};

const DepartmentFilterPopover = ({ value, onApply }: DepartmentFilterPopoverProps) => {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Department[]>(value);
  const containerRef = useRef<HTMLDivElement>(null);

  const options = useMemo(() => {
    return [...departments].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
  }, []);

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

  return (
    <div ref={containerRef} className="relative">
      <button type="button" onClick={() => {
        setDraft(value);
        setOpen((prev) => !prev);
      }} className="h-8 rounded-md border bg-background px-3 text-xs">
        {value.length === 0 ? 'All Departments' : `Department (${value.length})`}
      </button>
      {open && (
        <div className="absolute right-0 z-50 mt-2 w-56 rounded-xl border bg-card p-2 shadow-xl">
          <div className="max-h-56 overflow-y-auto rounded-md border">
            <label className={cn('flex items-center justify-between gap-2 px-3 py-2 text-sm hover:bg-accent', draft.length === 0 && 'bg-accent/40')}>
              <span>All Departments</span>
              <input
                type="radio"
                checked={draft.length === 0}
                onChange={() => setDraft([])}
              />
            </label>
            {options.map((department) => (
              <label key={department} className="flex items-center justify-between gap-2 px-3 py-2 text-sm hover:bg-accent">
                <span className="inline-flex items-center gap-2">
                  <DeptBadge department={department} />
                </span>
                <input
                  type="checkbox"
                  checked={draft.includes(department)}
                  onChange={() => setDraft((prev) => (
                    prev.includes(department)
                      ? prev.filter((item) => item !== department)
                      : [...prev, department]
                  ))}
                />
              </label>
            ))}
            {options.length === 0 && (
              <div className="px-3 py-2 text-sm text-muted-foreground">No departments</div>
            )}
          </div>
          <div className="mt-2 flex items-center justify-between">
            <button type="button" onClick={() => setDraft([])} className="text-xs font-medium text-muted-foreground">Clear</button>
            <button
              type="button"
              onClick={() => {
                onApply(draft);
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

export default DepartmentFilterPopover;

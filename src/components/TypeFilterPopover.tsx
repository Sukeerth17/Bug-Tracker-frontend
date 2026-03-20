import React, { useEffect, useMemo, useRef, useState } from 'react';
import { TicketType, typeLabels } from '@/data/models';
import { TypeIcon } from '@/components/TicketBadges';
import { cn } from '@/lib/utils';

type TypeFilterPopoverProps = {
  value: TicketType[];
  onApply: (value: TicketType[]) => void;
};

const TypeFilterPopover = ({ value, onApply }: TypeFilterPopoverProps) => {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<TicketType[]>(value);
  const containerRef = useRef<HTMLDivElement>(null);

  const options = useMemo(() => Object.keys(typeLabels) as TicketType[], []);

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
        {value.length === 0 ? 'All Types' : `Type (${value.length})`}
      </button>
      {open && (
        <div className="absolute right-0 z-50 mt-2 w-56 rounded-xl border bg-card p-2 shadow-xl">
          <div className="max-h-56 overflow-y-auto rounded-md border">
            <label className={cn('flex items-center justify-between gap-2 px-3 py-2 text-sm hover:bg-accent', draft.length === 0 && 'bg-accent/40')}>
              <span>All Types</span>
              <input
                type="radio"
                checked={draft.length === 0}
                onChange={() => setDraft([])}
              />
            </label>
            {options.map((type) => (
              <label key={type} className="flex items-center justify-between gap-2 px-3 py-2 text-sm hover:bg-accent">
                <span className="inline-flex items-center gap-2">
                  <TypeIcon type={type} />
                  {typeLabels[type]}
                </span>
                <input
                  type="checkbox"
                  checked={draft.includes(type)}
                  onChange={() => setDraft((prev) => (
                    prev.includes(type)
                      ? prev.filter((item) => item !== type)
                      : [...prev, type]
                  ))}
                />
              </label>
            ))}
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

export default TypeFilterPopover;

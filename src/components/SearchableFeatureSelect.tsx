import React, { useEffect, useMemo, useRef, useState } from 'react';
import { X } from 'lucide-react';
import type { FeatureItem } from '@/services/featureApi';
import { cn } from '@/lib/utils';

type SearchableFeatureSelectProps = {
  features: FeatureItem[];
  value: string;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  allowEmpty?: boolean;
  emptyLabel?: string;
  className?: string;
};

const sortFeatures = (features: FeatureItem[]) => [...features].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));

const SearchableFeatureSelect = ({
  features,
  value,
  onChange,
  label = 'Feature',
  placeholder = 'Search features...',
  allowEmpty = true,
  emptyLabel = 'No Feature',
  className,
}: SearchableFeatureSelectProps) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const sorted = useMemo(() => sortFeatures(features), [features]);
  const filtered = useMemo(() => {
    if (!query.trim()) return sorted;
    const normalized = query.trim().toLowerCase();
    return sorted.filter((feature) => feature.name.toLowerCase().includes(normalized));
  }, [sorted, query]);

  const selectedLabel = useMemo(() => {
    if (!value) return emptyLabel;
    return sorted.find((feature) => feature.id === value)?.name || emptyLabel;
  }, [sorted, value, emptyLabel]);

  useEffect(() => {
    if (!open) {
      setQuery('');
      return;
    }
    const timer = window.setTimeout(() => inputRef.current?.focus(), 0);
    return () => window.clearTimeout(timer);
  }, [open]);

  return (
    <div className={cn('relative', className)}>
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="mt-1 flex h-9 w-full items-center justify-between rounded-md border bg-background px-3 text-sm"
      >
        <span className="truncate">{selectedLabel}</span>
        <span className="text-muted-foreground">▾</span>
      </button>
      {open && (
        <div className="absolute z-50 mt-2 w-full rounded-xl border bg-card p-2 shadow-xl">
          <div className="relative">
            <input
              ref={inputRef}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={placeholder}
              className="h-9 w-full rounded-md border bg-background px-3 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:bg-accent"
                aria-label="Clear feature search"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          <div className="mt-2 max-h-56 overflow-y-auto rounded-md border">
            {allowEmpty && (
              <button
                type="button"
                onClick={() => {
                  onChange('');
                  setOpen(false);
                }}
                className={cn('w-full px-3 py-2 text-left text-sm hover:bg-accent', !value && 'bg-accent/50')}
              >
                {emptyLabel}
              </button>
            )}
            {filtered.map((feature) => (
              <button
                key={feature.id}
                type="button"
                onClick={() => {
                  onChange(feature.id);
                  setOpen(false);
                }}
                className={cn('w-full px-3 py-2 text-left text-sm hover:bg-accent', value === feature.id && 'bg-accent/50')}
              >
                {feature.name}
              </button>
            ))}
            {filtered.length === 0 && (
              <p className="px-3 py-2 text-sm text-muted-foreground">No features found</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchableFeatureSelect;

import React, { useMemo, useState } from 'react';

type TerraformSelectProps = {
  value: string;
  options: string[];
  onChange: (value: string) => void;
  onCreate: (value: string) => void;
  label?: string;
  selectClassName?: string;
};

const CREATE_VALUE = '__create_terraform__';

const TerraformSelect = ({ value, options, onChange, onCreate, label = 'Terraform', selectClassName }: TerraformSelectProps) => {
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState('');

  const uniqueOptions = useMemo(
    () => Array.from(new Set(options.map((option) => option.trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' })),
    [options],
  );

  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      <select
        value={creating ? CREATE_VALUE : (value || '')}
        onChange={(event) => {
          const next = event.target.value;
          if (next === CREATE_VALUE) {
            setCreating(true);
            return;
          }
          setCreating(false);
          onChange(next);
        }}
        className={selectClassName || 'h-9 rounded-md border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 w-full'}
      >
        <option value="">No Terraform</option>
        {uniqueOptions.map((option) => (
          <option key={option} value={option}>{option}</option>
        ))}
        <option value={CREATE_VALUE}>+ Create Terraform</option>
      </select>
      {creating && (
        <div className="flex gap-2">
          <input
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key !== 'Enter') return;
              event.preventDefault();
              const next = draft.trim();
              if (!next) return;
              onCreate(next);
              onChange(next);
              setDraft('');
              setCreating(false);
            }}
            placeholder="Enter terraform"
            className="h-9 flex-1 rounded-md border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
          <button
            type="button"
            onClick={() => {
              const next = draft.trim();
              if (!next) return;
              onCreate(next);
              onChange(next);
              setDraft('');
              setCreating(false);
            }}
            className="h-9 rounded-md border px-3 text-sm font-medium hover:bg-accent transition-colors"
          >
            Add
          </button>
        </div>
      )}
    </div>
  );
};

export default TerraformSelect;

import React from 'react';

type TerraformFilterSelectProps = {
  value: string;
  options: string[];
  onChange: (value: string) => void;
  className?: string;
  allLabel?: string;
};

const TerraformFilterSelect = ({ value, options, onChange, className, allLabel = 'All Terraform' }: TerraformFilterSelectProps) => {
  const uniqueOptions = Array.from(new Set(options.map((option) => option.trim()).filter(Boolean)))
    .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));

  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className={className || 'h-8 rounded-md border bg-background px-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary/30'}
    >
      <option value="all">{allLabel}</option>
      {uniqueOptions.map((option) => (
        <option key={option} value={option}>{option}</option>
      ))}
    </select>
  );
};

export default TerraformFilterSelect;

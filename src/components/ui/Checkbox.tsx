"use client";

import { Check } from "lucide-react";

interface CheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  id?: string;
  disabled?: boolean;
}

export default function Checkbox({ checked, onChange, label, id, disabled = false }: CheckboxProps) {
  return <label htmlFor={id} className="inline-flex cursor-pointer items-center gap-2 text-sm font-medium text-heading">
    <span className="relative size-5 shrink-0">
      <input id={id} type="checkbox" checked={checked} disabled={disabled} onChange={event => onChange(event.target.checked)}
        className="peer size-5 cursor-pointer appearance-none rounded-md border border-border-strong bg-surface transition-colors duration-150 checked:border-primary checked:bg-primary disabled:cursor-not-allowed disabled:opacity-50" />
      <Check className="pointer-events-none absolute inset-0 size-5 text-on-primary opacity-0 peer-checked:opacity-100" strokeWidth={1.75} aria-hidden="true" />
    </span>
    {label}
  </label>;
}

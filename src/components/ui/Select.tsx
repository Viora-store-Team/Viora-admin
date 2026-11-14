"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/cn";
import { useFloating } from "@/lib/useFloating";

export interface SelectOption { value: string; label: string }
interface SelectProps {
  label?: string;
  id: string;
  value: string;
  onChange: (value: string) => void;
  options: readonly SelectOption[];
  placeholder?: string;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
}

export default function Select({ label, id, value, onChange, options, placeholder, error, required = false, disabled = false, className }: SelectProps) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const { style } = useFloating(open, triggerRef);
  const items = placeholder ? [{ value: "", label: placeholder }, ...options] : options;
  const selected = items.find(option => option.value === value);
  const listboxId = `${id}-listbox`;

  const show = () => {
    if (disabled) return;
    setActive(Math.max(0, items.findIndex(option => option.value === value)));
    setOpen(true);
  };
  const hide = (restoreFocus = false) => {
    setOpen(false);
    if (restoreFocus) triggerRef.current?.focus();
  };
  const choose = (index: number) => {
    const option = items[index];
    if (!option) return;
    onChange(option.value);
    hide(true);
  };

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!triggerRef.current?.contains(target) && !listRef.current?.contains(target)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);
  useEffect(() => {
    if (open) listRef.current?.querySelector<HTMLElement>(`[data-select-index="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [open, active]);

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (disabled) return;
    if (event.key === "Escape" && open) {
      event.preventDefault();
      event.stopPropagation();
      hide(true);
      return;
    }
    if (event.key === "Tab") { if (open) hide(); return; }
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (!open) show();
      else if (items.length) setActive(index => (index + (event.key === "ArrowDown" ? 1 : -1) + items.length) % items.length);
      return;
    }
    if (event.key === "Home" || event.key === "End") {
      event.preventDefault();
      if (!open) show();
      setActive(event.key === "Home" ? 0 : items.length - 1);
      return;
    }
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      if (open) choose(active);
      else show();
      return;
    }
    if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey && items.length) {
      const start = open ? active + 1 : 0;
      const query = event.key.toLocaleLowerCase();
      const next = Array.from({ length: items.length }, (_, offset) => (start + offset) % items.length)
        .find(index => items[index].label.toLocaleLowerCase().startsWith(query));
      if (next !== undefined) { event.preventDefault(); if (!open) show(); setActive(next); }
    }
  };

  return <div className="flex min-w-0 flex-col gap-2">
    {label && <label id={`${id}-label`} htmlFor={id} className="text-sm font-medium text-heading">{label}{required && <span className="ms-1 text-danger" aria-hidden="true">*</span>}</label>}
    <input type="hidden" name={id} value={value} />
    <button ref={triggerRef} type="button" role="combobox" id={id} aria-haspopup="listbox" aria-expanded={open} aria-controls={listboxId}
      aria-labelledby={label ? `${id}-label ${id}` : undefined} aria-label={label ? undefined : id} aria-activedescendant={open && items[active] ? `${id}-option-${active}` : undefined}
      aria-invalid={error ? true : undefined} aria-describedby={error ? `${id}-error` : undefined} aria-required={required || undefined} disabled={disabled}
      onClick={() => open ? hide() : show()} onKeyDown={onKeyDown}
      className={cn("flex h-12 w-full min-w-0 items-center justify-between gap-3 rounded-xl border bg-surface px-4 text-start text-sm outline-none transition-colors duration-150 hover:border-border-strong focus:border-primary focus:ring-2 focus:ring-primary/15 disabled:opacity-50", error ? "border-danger bg-danger-soft/40 focus:border-danger focus:ring-danger/25" : "border-border", className)}>
      <span data-select-label aria-hidden="true" className="min-w-0 flex-1 truncate text-text-tertiary">{selected?.label ?? placeholder ?? ""}</span>
      <ChevronDown className={cn("size-4 shrink-0 text-text-tertiary transition-transform duration-150", open && "rotate-180")} strokeWidth={1.75} aria-hidden="true" />
    </button>
    {error && <p id={`${id}-error`} className="text-xs font-medium text-danger">{error}</p>}
    {open && typeof document !== "undefined" && createPortal(
      <div ref={listRef} id={listboxId} role="listbox" aria-labelledby={label ? `${id}-label` : undefined} style={style}
        className="z-[60] max-h-72 overflow-auto rounded-xl border border-border bg-surface p-1 shadow-pop animate-[viora-drop-in_150ms_ease-out_both]">
        {items.map((option, index) => <div key={`${option.value}-${index}`} id={`${id}-option-${index}`} role="option" data-value={option.value} data-select-index={index}
          aria-selected={value === option.value} onPointerDown={event => event.preventDefault()} onClick={() => choose(index)}
          className={cn("flex min-h-10 cursor-pointer items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm text-heading hover:bg-surface-muted", value === option.value && "bg-primary-soft text-primary", active === index && "outline outline-2 outline-primary/15")}>
          <span className="min-w-0 truncate">{option.label}</span>{value === option.value && <Check className="size-4 shrink-0" strokeWidth={1.75} aria-hidden="true" />}
        </div>)}
      </div>, document.body,
    )}
  </div>;
}

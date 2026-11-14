"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import IconButton from "./IconButton";
import { cn } from "@/lib/cn";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: ReactNode;
  size?: "sm" | "md" | "lg";
  footer?: ReactNode;
  children?: ReactNode;
  closeOnBackdrop?: boolean;
  labelledById?: string;
}

const focusableSelector = 'button:not(:disabled), a[href], input:not(:disabled), textarea:not(:disabled), select:not(:disabled), [tabindex="0"]';

export default function Modal({ open, onClose, title, description, size = "md", footer, children, closeOnBackdrop = true, labelledById }: ModalProps) {
  const generatedId = useId();
  const titleId = labelledById ?? generatedId;
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  useEffect(() => { closeRef.current = onClose; }, [onClose]);

  useEffect(() => {
    if (!open) return;
    const panel = panelRef.current;
    if (!panel) return;
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusable = () => [...panel.querySelectorAll<HTMLElement>(focusableSelector)].filter(element => element.getClientRects().length > 0);
    (panel.querySelector<HTMLElement>("[data-autofocus]") ?? focusable()[0] ?? panel).focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (event.defaultPrevented) return;
        event.preventDefault();
        closeRef.current();
        return;
      }
      if (event.key !== "Tab") return;
      const items = focusable();
      const first = items[0];
      const last = items.at(-1);
      if (!first) { event.preventDefault(); panel.focus(); return; }
      if (event.shiftKey && (document.activeElement === first || !panel.contains(document.activeElement))) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && (document.activeElement === last || !panel.contains(document.activeElement))) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = overflow;
      if (previous?.isConnected) previous.focus();
    };
  }, [open]);

  if (!open || typeof document === "undefined") return null;
  return createPortal(
    <div className="fixed inset-0 z-50 grid place-items-center p-4">
      <div className="absolute inset-0 bg-heading/40 animate-[viora-fade-in_200ms_ease-out_both]" aria-hidden="true" onClick={closeOnBackdrop ? onClose : undefined} />
      <div ref={panelRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby={titleId}
        className={cn("relative flex max-h-[calc(100dvh-2rem)] w-full flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-pop animate-[viora-pop-in_200ms_ease-out_both]", size === "sm" ? "max-w-sm" : size === "lg" ? "max-w-2xl" : "max-w-lg")}
      >
        <div className="flex shrink-0 items-start justify-between gap-4 px-6 pt-6 pb-4">
          <div><h2 id={titleId} className="text-lg font-bold text-heading">{title}</h2>{description && <div className="mt-2 text-sm text-text-secondary">{description}</div>}</div>
          <IconButton label="إغلاق" icon={<X className="size-5" strokeWidth={1.75} aria-hidden="true" />} variant="ghost" size="sm" onClick={onClose} />
        </div>
        <div className="min-h-0 overflow-y-auto px-6 pb-6">{children}</div>
        {footer && <div className="flex shrink-0 flex-wrap justify-end gap-3 border-t border-border px-6 py-4">{footer}</div>}
      </div>
    </div>, document.body,
  );
}

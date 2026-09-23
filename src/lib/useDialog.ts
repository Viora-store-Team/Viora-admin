"use client";
import { useEffect, useRef } from "react";

/** Trap focus, close with Escape, and restore focus when a dialog unmounts. */
export function useDialog(open: boolean, close: () => void, busy = false) {
  const ref = useRef<HTMLDivElement>(null);
  const callbacks = useRef({close, busy});
  useEffect(() => { callbacks.current = {close, busy}; }, [close, busy]);
  useEffect(() => {
    if (!open || !ref.current) return;
    const dialog = ref.current;
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusable = () => [...dialog.querySelectorAll<HTMLElement>('button:not(:disabled), a[href], input:not(:disabled), textarea:not(:disabled), select:not(:disabled), [tabindex="0"]')].filter(el => el.getClientRects().length > 0);
    if (!dialog.contains(document.activeElement)) (focusable()[0] || dialog).focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !callbacks.current.busy) { event.preventDefault(); callbacks.current.close(); }
      if (event.key !== "Tab") return;
      const items = focusable();
      const first = items[0], last = items.at(-1);
      if (!first) { event.preventDefault(); dialog.focus(); return; }
      if (event.shiftKey && (document.activeElement === first || !dialog.contains(document.activeElement))) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && (document.activeElement === last || !dialog.contains(document.activeElement))) { event.preventDefault(); first.focus(); }
    };
    dialog.addEventListener("keydown", onKey);
    return () => { dialog.removeEventListener("keydown", onKey); document.body.style.overflow = overflow; if (previous?.isConnected) previous.focus(); };
  }, [open]);
  return ref;
}

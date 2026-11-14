"use client";

import { useEffect, useState, type CSSProperties, type RefObject } from "react";

export function useFloating(
  open: boolean,
  triggerRef: RefObject<HTMLElement | null>,
  opts: { offset?: number; maxHeight?: number } = {},
): { style: CSSProperties; placement: "bottom" | "top" } {
  const { offset = 4, maxHeight = 288 } = opts;
  const [position, setPosition] = useState<{ style: CSSProperties; placement: "bottom" | "top" }>({
    style: { position: "fixed", visibility: "hidden" },
    placement: "bottom",
  });

  useEffect(() => {
    if (!open) return;
    let frame = 0;
    const update = () => {
      const trigger = triggerRef.current;
      if (!trigger) return;
      const rect = trigger.getBoundingClientRect();
      const below = window.innerHeight - rect.bottom - offset - 8;
      const above = rect.top - offset - 8;
      const placement = below < Math.min(maxHeight, 280) && above > below ? "top" : "bottom";
      const available = Math.max(0, placement === "top" ? above : below);
      setPosition({
        placement,
        style: {
          position: "fixed",
          insetInlineStart: window.innerWidth - rect.right,
          top: placement === "bottom" ? rect.bottom + offset : undefined,
          bottom: placement === "top" ? window.innerHeight - rect.top + offset : undefined,
          // القائمة بتكبر لتناسب النص (لحد 320px) بدل ما تقصّ الخيارات الطويلة
          minWidth: rect.width,
          maxWidth: Math.max(rect.width, 320),
          width: "max-content",
          maxHeight: Math.min(maxHeight, available),
        },
      });
    };
    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(update);
    };
    schedule();
    window.addEventListener("scroll", schedule, true);
    window.addEventListener("resize", schedule);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule, true);
      window.removeEventListener("resize", schedule);
    };
  }, [open, triggerRef, offset, maxHeight]);

  return position;
}

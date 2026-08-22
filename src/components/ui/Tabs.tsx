"use client";

import { cn } from "@/lib/cn";
import { formatNumber } from "@/lib/format";

export interface TabItem {
  key: string;
  label: string;
  /** عدّاد اختياري بينعرض كشارة جنب التسمية */
  count?: number;
}

interface TabsProps {
  items: readonly TabItem[];
  active: string;
  onChange: (key: string) => void;
  disabled?: boolean;
  className?: string;
}

/**
 * صف تبويبات على شكل حبوب.
 *
 * ترقية للنمط المكتوب يدوياً بصفحة الطلبات (أزرار aria-pressed جوّا صف قابل
 * للتمرير). صفحة الطلبات ما انلمست — المكوّن موجود لما يجي دورها.
 */
export default function Tabs({
  items,
  active,
  onChange,
  disabled = false,
  className,
}: TabsProps) {
  return (
    <div
      className={cn("no-scrollbar flex gap-2 overflow-x-auto pb-1", className)}
    >
      {items.map((item) => {
        const isActive = item.key === active;

        return (
          <button
            key={item.key}
            type="button"
            aria-pressed={isActive}
            disabled={disabled}
            onClick={() => onChange(item.key)}
            className={cn(
              "inline-flex shrink-0 items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold transition",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
              "disabled:pointer-events-none disabled:opacity-50",
              isActive
                ? "bg-primary text-icon shadow-sm"
                : "bg-field-bg text-field-label hover:bg-primary-soft hover:text-primary",
            )}
          >
            {item.label}
            {item.count !== undefined && (
              <span
                className={cn(
                  "ltr-nums rounded-full px-1.5 py-0.5 text-[11px] font-extrabold",
                  isActive ? "bg-icon/20 text-icon" : "bg-black/5 text-text-secondary",
                )}
              >
                {formatNumber(item.count)}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

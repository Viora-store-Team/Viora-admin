"use client";

import { cn } from "@/lib/cn";

interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  /** وصف للقارئ الصوتي — إجباري لأن المفتاح ما فيه نص */
  label: string;
  disabled?: boolean;
}

/**
 * مفتاح تبديل.
 *
 * ملاحظة RTL مهمة: خاصية transform ما بتنعكس تلقائياً مع dir="rtl"،
 * فلازم نعكس اتجاه الحركة يدوياً بـ rtl:-translate-x-*.
 */
export default function Toggle({
  checked,
  onChange,
  label,
  disabled = false,
}: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
        "disabled:cursor-not-allowed disabled:opacity-50",
        checked ? "bg-primary" : "bg-placeholder",
      )}
    >
      <span
        className={cn(
          "inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform",
          checked
            ? "translate-x-4 rtl:-translate-x-4"
            : "translate-x-1 rtl:-translate-x-1",
        )}
      />
    </button>
  );
}

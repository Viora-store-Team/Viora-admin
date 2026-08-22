"use client";

import { useEffect, useRef, useState } from "react";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { t } from "@/lib/strings";

interface SearchInputProps {
  /** القيمة المطبَّقة فعلياً (بعد التأخير) — بتيجي من حالة الصفحة */
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  id?: string;
  disabled?: boolean;
  /** تأخير قبل إطلاق onChange — بيمنع طلب لكل حرف */
  debounceMs?: number;
  className?: string;
}

/**
 * حقل البحث. أول حقل بحث بالمشروع — ما كان في ولا واحد.
 *
 * بيملك نصه محلياً وبيبلّغ الأب بعد التأخير، عشان الكتابة تضل فورية بينما
 * الطلب بينطلق مرة وحدة. لما القيمة تتغيّر من برّا (مسح الفلاتر) بيتزامن معها.
 */
export default function SearchInput({
  value,
  onChange,
  placeholder = t.admin.common.search,
  id = "search",
  disabled = false,
  debounceMs = 350,
  className,
}: SearchInputProps) {
  const [text, setText] = useState(value);

  // مزامنة مع تغيّر خارجي (مسح الفلاتر) — بلاها بيضل النص القديم بالحقل
  const [lastValue, setLastValue] = useState(value);
  if (lastValue !== value) {
    setLastValue(value);
    if (value !== text) setText(value);
  }

  // المرجع بيمنع إطلاق onChange عند أول رندر أو عند مزامنة خارجية
  const applied = useRef(value);

  useEffect(() => {
    if (text === applied.current) return;

    const timer = setTimeout(() => {
      applied.current = text;
      onChange(text);
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [text, debounceMs, onChange]);

  const clear = () => {
    applied.current = "";
    setText("");
    onChange("");
  };

  return (
    <div className={cn("relative w-full sm:max-w-sm", className)}>
      <span className="pointer-events-none absolute inset-y-0 start-3 flex items-center text-placeholder">
        <Search className="size-4" aria-hidden="true" />
      </span>

      <input
        id={id}
        type="search"
        value={text}
        disabled={disabled}
        placeholder={placeholder}
        aria-label={t.admin.common.search}
        onChange={(e) => setText(e.target.value)}
        className={cn(
          "w-full rounded-xl border border-border bg-field-bg py-3 ps-10 pe-10 text-sm text-heading",
          "placeholder:text-placeholder outline-none transition",
          "focus:border-primary focus:ring-2 focus:ring-primary/20",
          "disabled:cursor-not-allowed disabled:opacity-50",
          // متصفحات WebKit بتحط زر مسح خاص فيها — منخفيه لأن عنا واحد
          "[&::-webkit-search-cancel-button]:appearance-none",
        )}
      />

      {text && (
        <button
          type="button"
          onClick={clear}
          disabled={disabled}
          aria-label={t.admin.common.clearSearch}
          className="absolute inset-y-0 end-3 flex items-center text-placeholder transition hover:text-heading"
        >
          <X className="size-4" aria-hidden="true" />
        </button>
      )}
    </div>
  );
}

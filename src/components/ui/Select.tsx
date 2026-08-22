"use client";

import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/cn";

export interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps {
  /** تسمية الحقل */
  label?: string;
  id: string;
  /** "" يعني ما في اختيار */
  value: string;
  /** بيستقبل القيمة مباشرة مش الـ event — نفس اتفاقية Input */
  onChange: (value: string) => void;
  options: readonly SelectOption[];
  /** نص الخيار الفاضي بأول القائمة */
  placeholder?: string;
  /** رسالة خطأ — تظهر باللون الأحمر تحت الحقل */
  error?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
}

/**
 * قائمة منسدلة مبنية على <select> أصلي.
 *
 * الأصلي مقصود: بيجيب دعم لوحة المفاتيح وعجلة الموبايل والـ RTL مجاناً وبصفر تبعيات.
 * الشكل مطابق لـ Input عمداً — نفس الحواف ونفس ألوان الخطأ ونفس بنية الـ label.
 */
export default function Select({
  label,
  id,
  value,
  onChange,
  options,
  placeholder,
  error,
  required = false,
  disabled = false,
  className,
}: SelectProps) {
  const errorId = error ? `${id}-error` : undefined;

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={id} className="text-sm font-semibold text-field-label">
          {label}
          {required && (
            <span className="ms-1 text-danger" aria-hidden="true">
              *
            </span>
          )}
        </label>
      )}

      <div className="relative">
        <select
          id={id}
          value={value}
          disabled={disabled}
          required={required}
          aria-invalid={error ? true : undefined}
          aria-describedby={errorId}
          onChange={(e) => onChange(e.target.value)}
          className={cn(
            "w-full appearance-none rounded-xl border px-4 py-3 pe-10 text-sm text-heading",
            "outline-none transition",
            "disabled:cursor-not-allowed disabled:opacity-50",
            value === "" && "text-placeholder",
            error
              ? "border-danger bg-danger-soft/40 focus:border-danger focus:ring-2 focus:ring-danger/25"
              : "border-border bg-field-bg focus:border-primary focus:ring-2 focus:ring-primary/20",
            className,
          )}
        >
          {placeholder && <option value="">{placeholder}</option>}
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        <span className="pointer-events-none absolute inset-y-0 end-3 flex items-center text-placeholder">
          <ChevronDown className="size-4" aria-hidden="true" />
        </span>
      </div>

      {error && (
        <p id={errorId} className="text-xs font-semibold text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

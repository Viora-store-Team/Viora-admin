"use client";

import React, { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/cn";

/** أنواع الحقول اللي محتواها لاتيني — لازم تنعرض LTR حتى لو الصفحة RTL */
const LTR_TYPES = new Set([
  "email",
  "tel",
  "url",
  "number",
  "password",
  "date",
  "time",
  "datetime-local",
]);

type NativeProps = Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "onChange" | "value" | "id" | "type" | "className" | "dir"
>;

interface InputProps extends NativeProps {
  /** تسمية الحقل */
  label?: string;
  id: string;
  type?: string;
  value: string;
  /** بيستقبل القيمة مباشرة مش الـ event */
  onChange: (value: string) => void;
  placeholder?: string;
  /** رسالة خطأ — تظهر باللون الأحمر تحت الحقل */
  error?: string;
  /** استخدم textarea بدل input */
  multiline?: boolean;
  rows?: number;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  /** إضافة أيقونة إظهار/إخفاء لحقول كلمة المرور */
  showToggle?: boolean;
  /**
   * فرض اتجاه الحقل — بيتجاوز الاشتقاق التلقائي من النوع.
   * لازم لحقول نصية محتواها لاتيني زي كود اللون (#FDD835) والـ SKU،
   * لأن type="text" مش موجود بـ LTR_TYPES.
   */
  dir?: "ltr" | "rtl";
}

export default function Input({
  label,
  id,
  type = "text",
  value,
  onChange,
  placeholder,
  error,
  multiline = false,
  rows = 4,
  required = false,
  disabled = false,
  className,
  showToggle = false,
  dir,
  ...rest
}: InputProps) {
  const [visible, setVisible] = useState(false);
  const errorId = error ? `${id}-error` : undefined;
  const resolvedType = showToggle ? (visible ? "text" : "password") : type;
  const isLtr = !multiline && (dir === "ltr" || LTR_TYPES.has(resolvedType));
  const resolvedDir = dir ?? (isLtr ? "ltr" : undefined);

  const fieldClass = cn(
    "w-full rounded-xl border px-4 py-3 text-sm text-heading",
    "placeholder:text-placeholder outline-none transition",
    "disabled:cursor-not-allowed disabled:opacity-50",
    error
      ? "border-danger bg-danger-soft/40 focus:border-danger focus:ring-2 focus:ring-danger/25"
      : "border-border bg-field-bg focus:border-primary focus:ring-2 focus:ring-primary/20",
    isLtr && "text-start",
    className,
  );

  const sharedProps = {
    id,
    value,
    placeholder,
    disabled,
    required,
    "aria-invalid": error ? (true as const) : undefined,
    "aria-describedby": errorId,
  };

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

      {multiline ? (
        <textarea
          {...sharedProps}
          rows={rows}
          onChange={(e) => onChange(e.target.value)}
          className={cn(fieldClass, "resize-none")}
        />
      ) : showToggle ? (
        <div className="relative">
          <input
            {...rest}
            {...sharedProps}
            type={resolvedType}
            dir="ltr"
            onChange={(e) => onChange(e.target.value)}
            className={cn(fieldClass, "ps-11")}
          />
          <button
            type="button"
            tabIndex={-1}
            aria-label={visible ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
            onClick={() => setVisible((v) => !v)}
            className="absolute inset-y-0 start-3 flex items-center text-placeholder transition hover:text-heading"
          >
            {visible ? (
              <EyeOff className="size-4" aria-hidden="true" />
            ) : (
              <Eye className="size-4" aria-hidden="true" />
            )}
          </button>
        </div>
      ) : (
        <input
          {...rest}
          {...sharedProps}
          type={resolvedType}
          dir={resolvedDir}
          onChange={(e) => onChange(e.target.value)}
          className={fieldClass}
        />
      )}

      {error && (
        <p id={errorId} className="text-xs font-semibold text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

"use client";

import { RotateCcw } from "lucide-react";
import { cn } from "@/lib/cn";
import { t } from "@/lib/strings";
import Button from "./Button";

interface ErrorBannerProps {
  /** null أو "" يعني ما في خطأ — المكوّن بيخفي نفسه */
  message?: string | null;
  /** بيظهر زر إعادة المحاولة لما ينبعث */
  onRetry?: () => void;
  tone?: "danger" | "warning";
  className?: string;
}

/**
 * شريط الخطأ العلوي. كان div مكرّر بنفس الكلاسات بست صفحات، وكل مرة
 * بينساه حدا الـ role="alert" — فصار مكوّن واحد.
 */
export default function ErrorBanner({
  message,
  onRetry,
  tone = "danger",
  className,
}: ErrorBannerProps) {
  if (!message) return null;

  return (
    <div
      role="alert"
      className={cn(
        "flex flex-wrap items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-sm font-bold shadow-xs",
        tone === "danger"
          ? "border-danger/20 bg-danger-soft/80 text-danger"
          : "border-warning/20 bg-warning-soft/80 text-warning",
        className,
      )}
    >
      <span>{message}</span>
      {onRetry && (
        <Button
          variant="secondary"
          size="sm"
          onClick={onRetry}
          icon={<RotateCcw className="size-4" aria-hidden="true" />}
        >
          {t.common.retry}
        </Button>
      )}
    </div>
  );
}

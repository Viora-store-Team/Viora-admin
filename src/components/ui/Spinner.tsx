import { cn } from "@/lib/cn";
import { t } from "@/lib/strings";

interface SpinnerProps {
  /** "page" = متمركز بمساحة كبيرة · "inline" = جنب نص أو جوّا كرت */
  variant?: "page" | "inline";
  className?: string;
}

/**
 * مؤشّر التحميل. كان مكرّر حرفياً بكل صفحة، فصار مكوّن واحد.
 * ما في Skeleton بالمشروع — الدوران هو النمط المعتمد.
 */
export default function Spinner({ variant = "page", className }: SpinnerProps) {
  const dot = (
    <span
      role="status"
      aria-label={t.common.loading}
      className={cn(
        "animate-spin rounded-full border-primary-soft border-t-primary",
        variant === "page" ? "size-10 border-3" : "size-4 border-2",
        className,
      )}
    />
  );

  if (variant === "inline") return dot;

  return <div className="grid place-items-center py-24">{dot}</div>;
}

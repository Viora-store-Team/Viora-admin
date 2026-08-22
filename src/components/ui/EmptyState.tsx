import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  hint?: string;
  action?: ReactNode;
}

export default function EmptyState({
  icon: Icon,
  title,
  hint,
  action,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
      <div className="relative flex items-center justify-center">
        <div className="absolute -inset-2 rounded-full bg-primary/10 blur-sm" />
        <span className="relative grid size-16 place-items-center rounded-2xl bg-primary-soft text-primary shadow-xs">
          <Icon className="size-8" aria-hidden="true" />
        </span>
      </div>
      <p className="mt-2 text-base font-extrabold text-heading">{title}</p>
      {hint && <p className="max-w-md text-xs leading-relaxed text-text-secondary">{hint}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}

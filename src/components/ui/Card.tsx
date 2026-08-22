import { cn } from "@/lib/cn";

interface CardProps {
  children: React.ReactNode;
  className?: string;
  /** "surface" = خلفية بيضاء بإطار (للنماذج) — "muted" = خلفية رمادية (للجداول والإحصائيات) */
  variant?: "surface" | "muted";
}

export function Card({
  children,
  className,
  variant = "surface",
}: CardProps) {
  return (
    <div
      className={cn(
        "rounded-2xl",
        variant === "surface"
          ? "border border-border bg-surface shadow-sm"
          : "bg-field-bg",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  title,
  action,
}: {
  title: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-border px-6 py-4">
      <h2 className="text-base font-extrabold text-heading">{title}</h2>
      {action}
    </div>
  );
}

export function CardBody({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cn("space-y-5 p-6", className)}>{children}</div>;
}

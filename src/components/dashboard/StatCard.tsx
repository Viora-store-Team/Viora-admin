import { TrendingDown, TrendingUp, type LucideIcon } from "lucide-react";
import { t } from "@/lib/strings";
import { cn } from "@/lib/cn";
import { Card } from "@/components/ui/Card";

interface StatCardProps {
  title: string;
  value: string;
  /**
   * نسبة التغيّر. اختيارية لأن مؤشّرات لوحة الأدمن أرقام مطلقة
   * ("عدد المتاجر النشطة") ما إلها مقارنة بشهر سابق — بلاها بينخفي صف الاتجاه كله.
   */
  change?: string;
  positive?: boolean;
  icon: LucideIcon;
}

export default function StatCard({
  title,
  value,
  change,
  positive,
  icon: Icon,
}: StatCardProps) {
  const TrendIcon = positive ? TrendingUp : TrendingDown;
  const showTrend = change !== undefined;

  return (
    <Card variant="muted" className="flex flex-col gap-3 p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-text-secondary">{title}</p>
          <p className="mt-2 text-2xl font-extrabold text-heading">{value}</p>
        </div>
        <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-primary-soft text-primary">
          <Icon className="size-5" aria-hidden="true" />
        </span>
      </div>

      {showTrend && (
        <div className="flex flex-wrap items-center gap-2">
          <span
          className={cn(
            "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold",
            positive
              ? "bg-success-soft text-success"
              : "bg-danger-soft text-danger",
          )}
        >
            <TrendIcon className="size-3.5" aria-hidden="true" />
            <span className="ltr-nums">{change}</span>
          </span>
          <span className="text-xs text-text-secondary">
            {t.dashboard.vsLastMonth}
          </span>
        </div>
      )}
    </Card>
  );
}

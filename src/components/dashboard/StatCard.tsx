import { TrendingDown, TrendingUp, ChevronLeft, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { t } from "@/lib/strings";
import { cn } from "@/lib/cn";

export type StatColorScheme =
  | "emerald"
  | "amber"
  | "rose"
  | "blue"
  | "indigo"
  | "purple"
  | "teal"
  | "neutral";

const COLOR_MAP: Record<
  StatColorScheme,
  {
    iconBg: string;
    iconText: string;
    iconBorder: string;
    topAccent: string;
    glow: string;
  }
> = {
  emerald: {
    iconBg: "bg-success-soft",
    iconText: "text-success",
    iconBorder: "border-success/20",
    topAccent: "bg-success",
    glow: "group-hover:bg-success-soft/50",
  },
  amber: {
    iconBg: "bg-warning-soft",
    iconText: "text-warning",
    iconBorder: "border-warning/20",
    topAccent: "bg-warning",
    glow: "group-hover:bg-warning-soft/50",
  },
  rose: {
    iconBg: "bg-danger-soft",
    iconText: "text-danger",
    iconBorder: "border-danger/20",
    topAccent: "bg-danger",
    glow: "group-hover:bg-danger-soft/50",
  },
  blue: {
    iconBg: "bg-info-soft",
    iconText: "text-info",
    iconBorder: "border-info/20",
    topAccent: "bg-info",
    glow: "group-hover:bg-info-soft/50",
  },
  indigo: {
    iconBg: "bg-info-soft",
    iconText: "text-info",
    iconBorder: "border-info/20",
    topAccent: "bg-info",
    glow: "group-hover:bg-info-soft/50",
  },
  purple: {
    iconBg: "bg-primary-soft",
    iconText: "text-primary",
    iconBorder: "border-primary/20",
    topAccent: "bg-primary",
    glow: "group-hover:bg-primary-soft/50",
  },
  teal: {
    iconBg: "bg-success-soft",
    iconText: "text-success",
    iconBorder: "border-success/20",
    topAccent: "bg-success",
    glow: "group-hover:bg-success-soft/50",
  },
  neutral: {
    iconBg: "bg-primary-soft",
    iconText: "text-primary",
    iconBorder: "border-primary/10",
    topAccent: "bg-primary",
    glow: "group-hover:bg-primary/5",
  },
};

interface StatCardProps {
  title: string;
  value: string;
  icon: LucideIcon;
  colorScheme?: StatColorScheme;
  badge?: {
    text: string;
    variant?: "warning" | "danger" | "success" | "info" | "neutral";
  };
  subtitle?: string;
  change?: string;
  positive?: boolean;
  href?: string;
  onClick?: () => void;
}

export default function StatCard({
  title,
  value,
  icon: Icon,
  colorScheme = "neutral",
  badge,
  subtitle,
  change,
  positive,
  href,
  onClick,
}: StatCardProps) {
  const TrendIcon = positive ? TrendingUp : TrendingDown;
  const showTrend = change !== undefined;
  const colors = COLOR_MAP[colorScheme];

  const content = (
    <div
      className={cn(
        "group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-border/80 bg-surface p-5 transition-all duration-200",
        "shadow-card hover:border-border hover:shadow-pop",
        (href || onClick) && "cursor-pointer focus-visible:border-primary",
      )}
    >
      {/* Accent strip on top */}
      <div
        className={cn(
          "absolute inset-x-0 top-0 h-1 opacity-0 transition-opacity duration-200 group-hover:opacity-100",
          colors.topAccent,
        )}
      />

      {/* Subtle corner light */}
      <div
        className={cn(
          "pointer-events-none absolute -start-8 -top-8 size-28 rounded-full blur-2xl transition-colors duration-150",
          colors.glow,
        )}
      />

      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-xs font-bold text-text-secondary">{title}</p>
            {badge && (
              <span
                className={cn(
                  "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium",
                  badge.variant === "warning" && "bg-warning-soft text-warning",
                  badge.variant === "danger" && "bg-danger-soft text-danger",
                  badge.variant === "success" && "bg-success-soft text-success",
                  badge.variant === "info" && "bg-info-soft text-info",
                  (!badge.variant || badge.variant === "neutral") &&
                    "bg-chip text-chip-text",
                )}
              >
                {badge.text}
              </span>
            )}
          </div>
          <p className="ltr-nums text-2xl font-bold tracking-tight text-heading">
            {value}
          </p>
        </div>

        <span
          className={cn(
            "grid size-12 shrink-0 place-items-center rounded-2xl border transition-transform duration-200 group-hover:scale-105",
            colors.iconBg,
            colors.iconText,
            colors.iconBorder,
          )}
        >
          <Icon className="size-5.5" aria-hidden="true" />
        </span>
      </div>

      {(subtitle || showTrend || href || onClick) && (
        <div className="relative mt-3 flex items-center justify-between gap-2 pt-2 border-t border-border/50 text-xs">
          {showTrend ? (
            <div className="flex flex-wrap items-center gap-1.5">
              <span
                className={cn(
                  "inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-bold",
                  positive
                    ? "bg-success-soft text-success"
                    : "bg-danger-soft text-danger",
                )}
              >
                <TrendIcon className="size-3" aria-hidden="true" />
                <span className="ltr-nums">{change}</span>
              </span>
              <span className="text-text-secondary">{t.dashboard.vsLastMonth}</span>
            </div>
          ) : subtitle ? (
            <span className="text-text-secondary">{subtitle}</span>
          ) : (
            <span />
          )}

          {(href || onClick) && (
            <span className="inline-flex items-center gap-0.5 font-bold text-text-secondary transition-colors group-hover:text-primary">
              <span>عرض</span>
              <ChevronLeft className="size-3.5 transition-transform group-hover:-translate-x-0.5" />
            </span>
          )}
        </div>
      )}
    </div>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className="block w-full rounded-2xl text-start">
        {content}
      </button>
    );
  }

  return content;
}

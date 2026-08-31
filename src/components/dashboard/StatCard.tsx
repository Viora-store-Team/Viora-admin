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
    iconBg: "bg-emerald-500/10",
    iconText: "text-emerald-600",
    iconBorder: "border-emerald-500/20",
    topAccent: "bg-emerald-500",
    glow: "group-hover:bg-emerald-500/5",
  },
  amber: {
    iconBg: "bg-amber-500/10",
    iconText: "text-amber-600",
    iconBorder: "border-amber-500/20",
    topAccent: "bg-amber-500",
    glow: "group-hover:bg-amber-500/5",
  },
  rose: {
    iconBg: "bg-rose-500/10",
    iconText: "text-rose-600",
    iconBorder: "border-rose-500/20",
    topAccent: "bg-rose-500",
    glow: "group-hover:bg-rose-500/5",
  },
  blue: {
    iconBg: "bg-sky-500/10",
    iconText: "text-sky-600",
    iconBorder: "border-sky-500/20",
    topAccent: "bg-sky-500",
    glow: "group-hover:bg-sky-500/5",
  },
  indigo: {
    iconBg: "bg-indigo-500/10",
    iconText: "text-indigo-600",
    iconBorder: "border-indigo-500/20",
    topAccent: "bg-indigo-500",
    glow: "group-hover:bg-indigo-500/5",
  },
  purple: {
    iconBg: "bg-purple-500/10",
    iconText: "text-purple-600",
    iconBorder: "border-purple-500/20",
    topAccent: "bg-purple-500",
    glow: "group-hover:bg-purple-500/5",
  },
  teal: {
    iconBg: "bg-teal-500/10",
    iconText: "text-teal-600",
    iconBorder: "border-teal-500/20",
    topAccent: "bg-teal-500",
    glow: "group-hover:bg-teal-500/5",
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
        "shadow-xs hover:border-border hover:shadow-md",
        (href || onClick) && "cursor-pointer hover:-translate-y-0.5",
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
          "pointer-events-none absolute -left-8 -top-8 size-28 rounded-full blur-2xl transition-all duration-300",
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
                  "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-extrabold",
                  badge.variant === "warning" && "bg-amber-500/15 text-amber-700",
                  badge.variant === "danger" && "bg-rose-500/15 text-rose-700",
                  badge.variant === "success" && "bg-emerald-500/15 text-emerald-700",
                  badge.variant === "info" && "bg-sky-500/15 text-sky-700",
                  (!badge.variant || badge.variant === "neutral") &&
                    "bg-field-bg text-field-label",
                )}
              >
                {badge.text}
              </span>
            )}
          </div>
          <p className="ltr-nums text-2xl font-black tracking-tight text-heading">
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
                    ? "bg-emerald-500/10 text-emerald-600"
                    : "bg-rose-500/10 text-rose-600",
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
      <button type="button" onClick={onClick} className="w-full text-start">
        {content}
      </button>
    );
  }

  return content;
}

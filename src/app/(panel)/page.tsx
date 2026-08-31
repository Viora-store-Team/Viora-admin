"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  BarChart3,
  Calendar,
  Clock,
  Coins,
  Flag,
  ShoppingBag,
  Sparkles,
  Store,
  TrendingUp,
  UserPlus,
  UserRound,
  Users,
  XCircle,
} from "lucide-react";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { TableShell, Td, Thead } from "@/components/ui/Table";
import EmptyState from "@/components/ui/EmptyState";
import ErrorBanner from "@/components/ui/ErrorBanner";
import Spinner from "@/components/ui/Spinner";
import StatusBadge from "@/components/admin/StatusBadge";
import TrendChart from "@/components/ui/TrendChart";
import StatCard, { type StatColorScheme } from "@/components/dashboard/StatCard";
import { fetchStats } from "@/lib/admin/api";
import { STORE_STATUS } from "@/lib/admin/status";
import type {
  AdminStatsCharts,
  StatsCounters,
  StatsPeriod,
  TopStoreRow,
} from "@/lib/admin/types";
import { classifyStatus } from "@/lib/apiFailure";
import { formatCurrency, formatNumber } from "@/lib/format";
import { isBrokenText } from "@/lib/brokenText";
import { cn } from "@/lib/cn";
import { t } from "@/lib/strings";

const PERIOD_OPTIONS: { key: StatsPeriod; label: string }[] = [
  { key: 7, label: t.admin.dashboard.range7 },
  { key: 30, label: t.admin.dashboard.range30 },
  { key: 90, label: t.admin.dashboard.range90 },
];

const TOP_STORE_COLUMNS = [
  t.admin.dashboard.colStore,
  t.admin.dashboard.colOrders,
  t.admin.dashboard.colRevenue,
] as const;

interface StatsView {
  counters: StatsCounters;
  charts: AdminStatsCharts;
  topStores: TopStoreRow[];
}

export default function AdminOverviewPage() {
  const router = useRouter();

  const [period, setPeriod] = useState<StatsPeriod>(30);
  const [view, setView] = useState<StatsView | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const res = await fetchStats(period);
      if (cancelled) return;

      setLoading(false);

      if (res.success && res.stats) {
        setView({
          counters: res.stats,
          charts: res.charts ?? { signups: [], orders: [] },
          topStores: res.topStores ?? [],
        });
        setError("");
        return;
      }

      const failure = classifyStatus(res);
      setError(
        failure.kind === "unauthorized"
          ? t.admin.common.sessionInvalid
          : failure.message,
      );
    })();

    return () => {
      cancelled = true;
    };
  }, [period, attempt]);

  const changePeriod = (newPeriod: StatsPeriod) => {
    if (newPeriod === period) return;
    setLoading(true);
    setError("");
    setPeriod(newPeriod);
  };

  const retry = () => {
    setLoading(true);
    setAttempt((a) => a + 1);
  };

  const counters = view?.counters;

  const kpis: {
    title: string;
    value: string;
    icon: typeof Store;
    colorScheme: StatColorScheme;
    badge?: {
      text: string;
      variant?: "warning" | "danger" | "success" | "info" | "neutral";
    };
    href?: string;
  }[] = counters
    ? [
        {
          title: t.admin.dashboard.activeStores,
          value: `${formatNumber(counters.stores.active)} ${t.admin.dashboard.storeUnit}`,
          icon: Store,
          colorScheme: "emerald",
          badge: { text: "نشط", variant: "success" },
          href: "/stores",
        },
        {
          title: t.admin.dashboard.pendingStores,
          value: `${formatNumber(counters.stores.pending)} ${t.admin.dashboard.storeUnit}`,
          icon: Clock,
          colorScheme: "amber",
          badge:
            counters.stores.pending > 0
              ? { text: "يتطلب مراجعة", variant: "warning" }
              : undefined,
          href: "/stores",
        },
        {
          title: t.admin.dashboard.rejectedStores,
          value: `${formatNumber(counters.stores.rejected)} ${t.admin.dashboard.storeUnit}`,
          icon: XCircle,
          colorScheme: "neutral",
          href: "/stores",
        },
        {
          title: t.admin.dashboard.openReports,
          value: `${formatNumber(counters.reports.open)} ${t.admin.dashboard.reportUnit}`,
          icon: Flag,
          colorScheme: counters.reports.open > 0 ? "rose" : "neutral",
          badge:
            counters.reports.open > 0
              ? { text: "يحتاج متابعة", variant: "danger" }
              : undefined,
          href: "/reports",
        },
        {
          title: t.admin.dashboard.merchants,
          value: `${formatNumber(counters.users.merchants)} ${t.admin.dashboard.userUnit}`,
          icon: UserRound,
          colorScheme: "indigo",
          href: "/users",
        },
        {
          title: t.admin.dashboard.customers,
          value: `${formatNumber(counters.users.customers)} ${t.admin.dashboard.userUnit}`,
          icon: Users,
          colorScheme: "blue",
          href: "/users",
        },
        {
          title: t.admin.dashboard.orders,
          value: `${formatNumber(counters.orders.total)} ${t.admin.dashboard.orderUnit}`,
          icon: ShoppingBag,
          colorScheme: "purple",
        },
        {
          title: t.admin.dashboard.gmv,
          value: formatCurrency(Number(counters.revenue.total)),
          icon: TrendingUp,
          colorScheme: "teal",
        },
      ]
    : [];

  const currentPeriodLabel =
    PERIOD_OPTIONS.find((p) => p.key === period)?.label ?? `آخر ${period} يوم`;

  return (
    <div className="flex flex-col gap-6">
      {/* ── الرأس الرئيسي الموحد مع محدد المدى الزمني ───────────────── */}
      <div className="flex flex-col gap-4 rounded-3xl border border-border/80 bg-surface p-6 shadow-xs sm:p-8 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-extrabold text-primary">
              <Sparkles className="size-3.5" aria-hidden="true" />
              لوحة التحكم الرئيسية
            </span>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-heading sm:text-3xl">
            {t.admin.dashboard.title}
          </h1>
          <p className="text-sm font-medium text-text-secondary">
            {t.admin.dashboard.subtitle}
          </p>
        </div>

        {/* محدد المدى الزمني بتصميم حديث */}
        <div className="flex flex-col gap-2 sm:items-start lg:items-end">
          <div className="inline-flex items-center gap-1.5 rounded-2xl border border-border/70 bg-field-bg p-1 shadow-inner">
            <span className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-text-secondary">
              <Calendar className="size-3.5" aria-hidden="true" />
              <span>المدى:</span>
            </span>
            {PERIOD_OPTIONS.map((opt) => {
              const active = opt.key === period;
              return (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => changePeriod(opt.key)}
                  className={cn(
                    "rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all duration-200",
                    active
                      ? "bg-primary text-icon shadow-sm scale-100"
                      : "text-field-label hover:bg-surface hover:text-heading",
                  )}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
          <p className="text-[11px] font-medium text-text-secondary">
            {t.admin.dashboard.rangeHint}
          </p>
        </div>
      </div>

      <ErrorBanner message={error} onRetry={retry} />

      {loading ? (
        <div className="grid min-h-[300px] place-items-center">
          <Spinner />
        </div>
      ) : !view || !counters ? null : counters.stores.total === 0 ? (
        <Card className="overflow-hidden border border-border shadow-xs">
          <CardBody className="p-8">
            <EmptyState
              icon={BarChart3}
              title={t.admin.dashboard.empty}
              hint={t.admin.dashboard.emptyHint}
            />
          </CardBody>
        </Card>
      ) : (
        <>
          {/* ── البطاقات الإحصائية الرئيسية الملونة (8 بطاقات) ───────── */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {kpis.map((kpi) => (
              <StatCard
                key={kpi.title}
                title={kpi.title}
                value={kpi.value}
                icon={kpi.icon}
                colorScheme={kpi.colorScheme}
                badge={kpi.badge}
                href={kpi.href}
              />
            ))}
          </div>

          {/* ── بطاقة تسليط الضوء على نشاط الفترة المحددة ────────────── */}
          <div className="overflow-hidden rounded-3xl border border-border/80 bg-surface shadow-xs">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/70 bg-field-bg/50 px-6 py-4">
              <div className="flex items-center gap-2.5">
                <span className="grid size-8 place-items-center rounded-xl bg-primary/10 text-primary">
                  <TrendingUp className="size-4" aria-hidden="true" />
                </span>
                <div>
                  <h2 className="text-sm font-extrabold text-heading">
                    ملخص نشاط المنصة خلال الفترة
                  </h2>
                  <p className="text-xs text-text-secondary">
                    إحصائيات محصورة بـ ({currentPeriodLabel})
                  </p>
                </div>
              </div>
              <span className="rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-extrabold text-primary">
                {currentPeriodLabel}
              </span>
            </div>

            <div className="grid grid-cols-1 gap-4 p-6 sm:grid-cols-3">
              {/* تسجيلات الفترة */}
              <div className="flex items-center gap-4 rounded-2xl border border-indigo-500/15 bg-indigo-500/5 p-4.5 transition-all hover:bg-indigo-500/10">
                <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-indigo-500/15 text-indigo-600">
                  <UserPlus className="size-6" aria-hidden="true" />
                </span>
                <div className="min-w-0 space-y-1">
                  <p className="text-xs font-bold text-indigo-900/80">
                    {t.admin.dashboard.newSignups}
                  </p>
                  <p className="ltr-nums text-xl font-black text-heading">
                    {formatNumber(
                      counters.users.newMerchants + counters.users.newCustomers,
                    )}{" "}
                    <span className="text-xs font-bold text-text-secondary">
                      {t.admin.dashboard.userUnit}
                    </span>
                  </p>
                  <p className="text-[11px] font-medium text-text-secondary">
                    {formatNumber(counters.users.newMerchants)} تجار •{" "}
                    {formatNumber(counters.users.newCustomers)} عملاء
                  </p>
                </div>
              </div>

              {/* طلبات الفترة */}
              <div className="flex items-center gap-4 rounded-2xl border border-emerald-500/15 bg-emerald-500/5 p-4.5 transition-all hover:bg-emerald-500/10">
                <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-emerald-500/15 text-emerald-600">
                  <ShoppingBag className="size-6" aria-hidden="true" />
                </span>
                <div className="min-w-0 space-y-1">
                  <p className="text-xs font-bold text-emerald-900/80">
                    {t.admin.dashboard.ordersInPeriod}
                  </p>
                  <p className="ltr-nums text-xl font-black text-heading">
                    {formatNumber(counters.orders.inPeriod)}{" "}
                    <span className="text-xs font-bold text-text-secondary">
                      {t.admin.dashboard.orderUnit}
                    </span>
                  </p>
                  <p className="text-[11px] font-medium text-text-secondary">
                    طلبات منشأة خلال {currentPeriodLabel}
                  </p>
                </div>
              </div>

              {/* إيرادات الفترة */}
              <div className="flex items-center gap-4 rounded-2xl border border-teal-500/15 bg-teal-500/5 p-4.5 transition-all hover:bg-teal-500/10">
                <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-teal-500/15 text-teal-600">
                  <Coins className="size-6" aria-hidden="true" />
                </span>
                <div className="min-w-0 space-y-1">
                  <p className="text-xs font-bold text-teal-900/80">
                    {t.admin.dashboard.revenueInPeriod}
                  </p>
                  <p className="ltr-nums text-xl font-black text-heading">
                    {formatCurrency(Number(counters.revenue.inPeriod))}
                  </p>
                  <p className="text-[11px] font-medium text-text-secondary">
                    مبيعات محققة خلال {currentPeriodLabel}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* ── الرسوم البيانية للنمو والحركة ───────────────────────── */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card className="border border-border/80 shadow-xs">
              <CardHeader title={t.admin.dashboard.growthTitle} />
              <CardBody>
                <TrendChart
                  data={view.charts.signups}
                  xKey="date"
                  series={[
                    {
                      key: "customers",
                      label: t.admin.dashboard.growthCustomers,
                      color: "var(--color-primary)",
                    },
                    {
                      key: "merchants",
                      label: t.admin.dashboard.growthMerchants,
                      color: "var(--color-info)",
                    },
                  ]}
                />
              </CardBody>
            </Card>

            <Card className="border border-border/80 shadow-xs">
              <CardHeader title={t.admin.dashboard.ordersTrendTitle} />
              <CardBody>
                <TrendChart
                  data={view.charts.orders}
                  xKey="date"
                  series={[
                    {
                      key: "orders",
                      label: t.admin.dashboard.ordersTrendSeries,
                      color: "var(--color-success)",
                    },
                  ]}
                />
              </CardBody>
            </Card>
          </div>

          {/* ── جدول أعلى المتاجر أداءً ─────────────────────────────── */}
          <Card className="overflow-hidden border border-border/80 shadow-xs">
            <CardHeader title={t.admin.dashboard.topStores} />
            {view.topStores.length === 0 ? (
              <CardBody>
                <p className="text-sm text-text-secondary">
                  {t.admin.dashboard.topStoresEmpty}
                </p>
              </CardBody>
            ) : (
              <TableShell minWidth="min-w-[480px]">
                <Thead columns={TOP_STORE_COLUMNS} />
                <tbody className="divide-y divide-border/60">
                  {view.topStores.map((row) => (
                    <tr
                      key={row.store.id}
                      className="cursor-pointer bg-surface transition hover:bg-primary-soft/40"
                      onClick={() => router.push(`/stores/${row.store.id}`)}
                    >
                      <Td>
                        <span className="flex flex-wrap items-center gap-2">
                          <span className="font-bold text-heading">
                            {isBrokenText(row.store.name)
                              ? `${t.admin.stores.brokenName}${row.store.id}`
                              : row.store.name}
                          </span>
                          <StatusBadge meta={STORE_STATUS[row.store.status]} />
                        </span>
                      </Td>
                      <Td className="ltr-nums">{formatNumber(row.orders)}</Td>
                      <Td className="ltr-nums">
                        {formatCurrency(Number(row.revenue))}
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </TableShell>
            )}
          </Card>
        </>
      )}
    </div>
  );
}

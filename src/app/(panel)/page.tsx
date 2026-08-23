"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  BarChart3,
  Flag,
  ShoppingBag,
  Store,
  TrendingUp,
  UserRound,
  Users,
  XCircle,
} from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { TableShell, Td, Thead } from "@/components/ui/Table";
import EmptyState from "@/components/ui/EmptyState";
import ErrorBanner from "@/components/ui/ErrorBanner";
import Spinner from "@/components/ui/Spinner";
import StatusBadge from "@/components/admin/StatusBadge";
import Tabs, { type TabItem } from "@/components/ui/Tabs";
import TrendChart from "@/components/ui/TrendChart";
import StatCard from "@/components/dashboard/StatCard";
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
import { t } from "@/lib/strings";

/* المفاتيح أرقام لأن `?period=` بياخد أيام — Tabs بتشتغل بنصوص، فالتحويل
   بيصير مرة وحدة بالمعالج تحت بدل ما ينتشر بالصفحة. */
const PERIOD_TABS: TabItem[] = [
  { key: "7", label: t.admin.dashboard.range7 },
  { key: "30", label: t.admin.dashboard.range30 },
  { key: "90", label: t.admin.dashboard.range90 },
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

      /*
        `stats` هو المفتاح الوحيد اللي بنشترطه. `charts` و`topStores` بيجوا
        معه دايماً، بس لو نقص واحد منهن بنعرض الأرقام بدل ما نفشّل الشاشة
        كلها — العدّادات هي أهم إشي بالصفحة.
      */
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

  const changePeriod = (key: string) => {
    setLoading(true);
    setError("");
    setPeriod(Number(key) as StatsPeriod);
  };

  const retry = () => {
    setLoading(true);
    setAttempt((a) => a + 1);
  };

  const counters = view?.counters;

  /* ⚠️ العدّادات تحت **إجماليات** — ما بتتغيّر مع المدى. أرقام الفترة
     (newMerchants · inPeriod) محطوطة ببطاقة منفصلة عشان الفرق يبين. */
  const stats = counters
    ? [
        {
          title: t.admin.dashboard.activeStores,
          value: `${formatNumber(counters.stores.active)} ${t.admin.dashboard.storeUnit}`,
          icon: Store,
        },
        {
          title: t.admin.dashboard.pendingStores,
          value: `${formatNumber(counters.stores.pending)} ${t.admin.dashboard.storeUnit}`,
          icon: BarChart3,
        },
        {
          title: t.admin.dashboard.rejectedStores,
          value: `${formatNumber(counters.stores.rejected)} ${t.admin.dashboard.storeUnit}`,
          icon: XCircle,
        },
        {
          title: t.admin.dashboard.customers,
          value: `${formatNumber(counters.users.customers)} ${t.admin.dashboard.userUnit}`,
          icon: Users,
        },
        {
          title: t.admin.dashboard.merchants,
          value: `${formatNumber(counters.users.merchants)} ${t.admin.dashboard.userUnit}`,
          icon: UserRound,
        },
        {
          title: t.admin.dashboard.orders,
          value: `${formatNumber(counters.orders.total)} ${t.admin.dashboard.orderUnit}`,
          icon: ShoppingBag,
        },
        {
          title: t.admin.dashboard.gmv,
          value: formatCurrency(Number(counters.revenue.total)),
          icon: TrendingUp,
        },
        {
          title: t.admin.dashboard.openReports,
          value: `${formatNumber(counters.reports.open)} ${t.admin.dashboard.reportUnit}`,
          icon: Flag,
        },
      ]
    : [];

  const periodRows = counters
    ? [
        {
          label: t.admin.dashboard.newSignups,
          value: `${formatNumber(
            counters.users.newMerchants + counters.users.newCustomers,
          )} ${t.admin.dashboard.userUnit}`,
        },
        {
          label: t.admin.dashboard.ordersInPeriod,
          value: `${formatNumber(counters.orders.inPeriod)} ${t.admin.dashboard.orderUnit}`,
        },
        {
          label: t.admin.dashboard.revenueInPeriod,
          value: formatCurrency(Number(counters.revenue.inPeriod)),
        },
      ]
    : [];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t.admin.dashboard.title}
        subtitle={t.admin.dashboard.subtitle}
      />

      <ErrorBanner message={error} onRetry={retry} />

      <div className="flex flex-col gap-2">
        <Tabs
          items={PERIOD_TABS}
          active={String(period)}
          onChange={changePeriod}
        />
        <p className="text-xs text-text-secondary">
          {t.admin.dashboard.rangeHint}
        </p>
      </div>

      {loading ? (
        <Spinner />
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
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {stats.map((stat) => (
              <StatCard
                key={stat.title}
                title={stat.title}
                value={stat.value}
                icon={stat.icon}
              />
            ))}
          </div>

          <Card variant="muted">
            <CardBody className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {periodRows.map((row) => (
                <div key={row.label} className="space-y-1">
                  <p className="text-xs font-bold text-text-secondary">
                    {row.label}
                  </p>
                  <p className="ltr-nums text-lg font-extrabold text-heading">
                    {row.value}
                  </p>
                </div>
              ))}
            </CardBody>
          </Card>

          <Card>
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

          <Card>
            <CardHeader title={t.admin.dashboard.ordersTrendTitle} />
            <CardBody>
              <TrendChart
                data={view.charts.orders}
                xKey="date"
                series={[
                  {
                    /* مفتاح السلسلة `orders` مش `count` — نفس اسم الحقل
                       اللي بيبعثه السيرفر جوّا charts.orders */
                    key: "orders",
                    label: t.admin.dashboard.ordersTrendSeries,
                    color: "var(--color-success)",
                  },
                ]}
              />
            </CardBody>
          </Card>

          <Card className="overflow-hidden">
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
                  {/* المتجر متداخل جوّا `store` — مش مفلطح زي باقي القوائم */}
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

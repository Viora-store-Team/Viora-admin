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
} from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { TableShell, Td, Thead } from "@/components/ui/Table";
import EmptyState from "@/components/ui/EmptyState";
import ErrorBanner from "@/components/ui/ErrorBanner";
import Spinner from "@/components/ui/Spinner";
import Tabs, { type TabItem } from "@/components/ui/Tabs";
import TrendChart from "@/components/ui/TrendChart";
import StatCard from "@/components/dashboard/StatCard";
import { fetchOverview } from "@/lib/admin/api";
import type { AdminOverview, OverviewRange } from "@/lib/admin/types";
import { classifyStatus } from "@/lib/apiFailure";
import { formatCurrency, formatNumber } from "@/lib/format";
import { t } from "@/lib/strings";

const RANGE_TABS: TabItem[] = [
  { key: "7d", label: t.admin.dashboard.range7 },
  { key: "30d", label: t.admin.dashboard.range30 },
  { key: "90d", label: t.admin.dashboard.range90 },
];

const TOP_STORE_COLUMNS = [
  t.admin.dashboard.colStore,
  t.admin.dashboard.colOrders,
  t.admin.dashboard.colRevenue,
] as const;

export default function AdminOverviewPage() {
  const router = useRouter();

  const [range, setRange] = useState<OverviewRange>("30d");
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const res = await fetchOverview(range);
      if (cancelled) return;

      setLoading(false);

      if (res.success && res.overview) {
        setOverview(res.overview);
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
  }, [range, attempt]);

  const changeRange = (key: string) => {
    setLoading(true);
    setError("");
    setRange(key as OverviewRange);
  };

  const retry = () => {
    setLoading(true);
    setAttempt((a) => a + 1);
  };

  /* المؤشّرات الست المطلوبة: متاجر نشطة · بانتظار توثيق · عملاء · تجار ·
     طلبات · قيمة إجمالية — وبلاغات مفتوحة كمؤشّر تشغيلي سابع. */
  const stats = overview
    ? [
        {
          title: t.admin.dashboard.activeStores,
          value: `${formatNumber(overview.activeStores)} ${t.admin.dashboard.storeUnit}`,
          icon: Store,
        },
        {
          title: t.admin.dashboard.pendingStores,
          value: `${formatNumber(overview.pendingStores)} ${t.admin.dashboard.storeUnit}`,
          icon: BarChart3,
        },
        {
          title: t.admin.dashboard.customers,
          value: `${formatNumber(overview.customers)} ${t.admin.dashboard.userUnit}`,
          icon: Users,
        },
        {
          title: t.admin.dashboard.merchants,
          value: `${formatNumber(overview.merchants)} ${t.admin.dashboard.userUnit}`,
          icon: UserRound,
        },
        {
          title: t.admin.dashboard.orders,
          value: `${formatNumber(overview.orders.total)} ${t.admin.dashboard.orderUnit}`,
          icon: ShoppingBag,
        },
        {
          title: t.admin.dashboard.gmv,
          value: formatCurrency(Number(overview.gmv)),
          icon: TrendingUp,
        },
        {
          title: t.admin.dashboard.openReports,
          value: `${formatNumber(overview.openReports)} ${t.admin.dashboard.reportUnit}`,
          icon: Flag,
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

      <Tabs items={RANGE_TABS} active={range} onChange={changeRange} />

      {loading ? (
        <Spinner />
      ) : !overview ? null : overview.totalStores === 0 ? (
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

          <Card>
            <CardHeader title={t.admin.dashboard.growthTitle} />
            <CardBody>
              <TrendChart
                data={overview.registrationGrowth}
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
                data={overview.ordersTrend}
                xKey="date"
                series={[
                  {
                    key: "count",
                    label: t.admin.dashboard.ordersTrendSeries,
                    color: "var(--color-success)",
                  },
                ]}
              />
            </CardBody>
          </Card>

          <Card className="overflow-hidden">
            <CardHeader title={t.admin.dashboard.topStores} />
            {overview.topStores.length === 0 ? (
              <CardBody>
                <p className="text-sm text-text-secondary">
                  {t.admin.dashboard.topStoresEmpty}
                </p>
              </CardBody>
            ) : (
              <TableShell minWidth="min-w-[480px]">
                <Thead columns={TOP_STORE_COLUMNS} />
                <tbody className="divide-y divide-border/60">
                  {overview.topStores.map((store) => (
                    <tr
                      key={store.id}
                      className="cursor-pointer bg-surface transition hover:bg-primary-soft/40"
                      onClick={() => router.push(`/stores/${store.id}`)}
                    >
                      <Td className="font-bold text-heading">{store.name}</Td>
                      <Td className="ltr-nums">{formatNumber(store.orders)}</Td>
                      <Td className="ltr-nums">
                        {formatCurrency(Number(store.revenue))}
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

"use client";

import Link from "next/link";
import { useState } from "react";
import StatusBadge from "@/components/admin/StatusBadge";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import Select, { type SelectOption } from "@/components/ui/Select";
import { TableShell, Td, Thead } from "@/components/ui/Table";
import { fetchAdminCategories, fetchStats, fetchStores } from "@/lib/admin/api";
import { orderStatusMeta } from "@/lib/admin/status";
import type { InventoryAlerts, OrderPerformance, StatsPeriod, TopProductRow } from "@/lib/admin/types";
import { formatNumber } from "@/lib/format";

const stageLabels = {
  storeAcceptance: "من إنشاء الطلب إلى قبول المتجر",
  pickup: "من قبول المتجر إلى استلام المندوب",
  delivery: "من استلام المندوب إلى تسليم الزبون",
} as const;

function Performance({ performance }: { performance: OrderPerformance }) {
  return (
    <Card>
      <CardHeader title="أداء طلبات المتاجر" />
      <CardBody>
        <p className="text-sm text-text-secondary">الحالات الحالية للطلبات التي أُنشئت خلال الفترة المحددة.</p>
        <dl className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
          {Object.entries(performance.byStatus).map(([status, count]) => (
            <div key={status} className="space-y-2 rounded-xl bg-field-bg p-3">
              <dt><StatusBadge meta={orderStatusMeta(status)} /></dt>
              <dd className="font-bold text-heading">{formatNumber(count)}</dd>
            </div>
          ))}
        </dl>
        <dl className="grid gap-3 md:grid-cols-3">
          {Object.entries(stageLabels).map(([key, label]) => {
            const stage = performance.stages[key as keyof typeof stageLabels];
            return (
              <div key={key} className="rounded-xl border border-border p-3">
                <dt className="text-sm text-text-secondary">{label}</dt>
                <dd className="mt-1 font-bold text-heading">
                  {stage.averageMinutes === null ? "بيانات غير متاحة" : `${formatNumber(stage.averageMinutes)} دقيقة`}
                </dd>
                <dd className="mt-1 text-xs text-text-secondary">{formatNumber(stage.samples)} طلب محسوب</dd>
              </div>
            );
          })}
        </dl>
      </CardBody>
    </Card>
  );
}

async function loadStoreOptions() {
  const options = new Map<string, SelectOption>();
  for (let page = 1; ; page += 1) {
    const res = await fetchStores({ page, limit: 50 });
    if (!res.success || !res.stores) return null;
    for (const store of res.stores) {
      options.set(String(store.id), { value: String(store.id), label: store.name });
    }
    if (page >= (res.pagination?.totalPages ?? 1)) break;
  }
  return Array.from(options.values()).sort((a, b) => a.label.localeCompare(b.label, "ar"));
}

function TopProducts({ products, period }: { products: TopProductRow[]; period: StatsPeriod }) {
  const [options, setOptions] = useState<{ stores: SelectOption[]; categories: SelectOption[] }>();
  const [storeId, setStoreId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [filtered, setFiltered] = useState<TopProductRow[]>();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function loadFilters() {
    setPending(true);
    setError("");
    try {
      const [stores, categories] = await Promise.all([
        loadStoreOptions(),
        fetchAdminCategories({ flat: true }),
      ]);
      if (!stores || !categories.success || !categories.categories) {
        setError("تعذّر تحميل خيارات الفلترة.");
        return;
      }
      setOptions({
        stores,
        categories: categories.categories.map((category) => ({
          value: String(category.id),
          label: category.name,
        })),
      });
    } finally {
      setPending(false);
    }
  }

  async function applyFilters(nextStore: string, nextCategory: string) {
    setStoreId(nextStore);
    setCategoryId(nextCategory);
    setError("");
    setFiltered(undefined);
    if (!nextStore && !nextCategory) return;
    setPending(true);
    try {
      const res = await fetchStats(period, undefined, {
        storeId: nextStore ? Number(nextStore) : undefined,
        categoryId: nextCategory ? Number(nextCategory) : undefined,
      });
      if (res.success && res.topProducts) setFiltered(res.topProducts);
      else setError("تعذّر تحميل المنتجات لهذه الفلاتر.");
    } finally {
      setPending(false);
    }
  }

  const hasFilter = Boolean(storeId || categoryId);
  const rows = hasFilter ? filtered : products;

  return (
    <Card className="overflow-hidden">
      <CardHeader
        title="المنتجات الأكثر مبيعًا"
        action={!options && (
          <button type="button" disabled={pending} onClick={loadFilters} className="text-sm font-semibold text-primary disabled:opacity-50">
            تصفية المنتجات
          </button>
        )}
      />
      <CardBody>
        <p className="text-sm text-text-secondary">أعلى 10 منتجات حسب القطع التي استلمها الزباين خلال الفترة.</p>
        {options && (
          <div className="grid gap-3 sm:grid-cols-2">
            <Select id="top-products-store" label="المتجر" value={storeId} options={options.stores} placeholder="كل المتاجر"
              disabled={pending} onChange={(next) => applyFilters(next, categoryId)} />
            <Select id="top-products-category" label="التصنيف" value={categoryId} options={options.categories} placeholder="كل التصنيفات"
              disabled={pending} onChange={(next) => applyFilters(storeId, next)} />
          </div>
        )}
        {pending && <p role="status" className="text-sm text-text-secondary">جارٍ التحميل…</p>}
        {error && (
          <p role="alert" className="text-sm text-danger">
            {error} {hasFilter && <button type="button" onClick={() => applyFilters(storeId, categoryId)} className="underline">أعد المحاولة</button>}
          </p>
        )}
        {rows && (rows.length === 0 ? (
          <p className="text-sm text-text-secondary">ما في قطع مستلمة ضمن هذه الفترة.</p>
        ) : (
          <TableShell minWidth="min-w-[360px]">
            <Thead columns={["المنتج", "المتجر", "القطع المستلمة"]} />
            <tbody className="divide-y divide-border">
              {rows.map((row) => (
                <tr key={`${row.storeId}:${row.productId ?? row.productName}`}>
                  <Td>{row.productName}</Td>
                  <Td><Link href={`/stores/${row.storeId}`} className="text-primary hover:underline">{row.storeName}</Link></Td>
                  <Td>{formatNumber(row.units)}</Td>
                </tr>
              ))}
            </tbody>
          </TableShell>
        ))}
      </CardBody>
    </Card>
  );
}

function StockAlerts({ alerts }: { alerts: InventoryAlerts }) {
  const sections = [
    { title: "نافد", ...alerts.outOfStock },
    { title: "منخفض", ...alerts.lowStock },
  ];

  return (
    <Card className="overflow-hidden">
      <CardHeader title="تنبيهات المخزون" />
      <CardBody>
        <p className="text-sm text-text-secondary">المخزون الحالي حسب اللون والمقاس. المخزون المنخفض من 1 إلى {formatNumber(alerts.lowStockThreshold)} قطع.</p>
        {sections.map(({ title, total, items }) => (
          <div key={title} className="space-y-2">
            <h3 className="font-semibold text-heading">{title} · {formatNumber(total)}</h3>
            {items.length === 0 ? (
              <p className="text-sm text-text-secondary">ما في أصناف.</p>
            ) : (
              <>
                <TableShell minWidth="min-w-[480px]">
                  <Thead columns={["المنتج", "المتجر", "اللون", "المقاس", "المخزون"]} />
                  <tbody className="divide-y divide-border">
                    {items.map((row) => (
                      <tr key={row.variantSizeId}>
                        <Td>{row.productName}</Td>
                        <Td><Link href={`/stores/${row.storeId}`} className="text-primary hover:underline">{row.storeName}</Link></Td>
                        <Td>{row.color}</Td>
                        <Td>{row.size}</Td>
                        <Td>{formatNumber(row.stock)}</Td>
                      </tr>
                    ))}
                  </tbody>
                </TableShell>
                {total > items.length && (
                  <p className="text-xs text-text-secondary">معروض أول {formatNumber(items.length)} من {formatNumber(total)}.</p>
                )}
              </>
            )}
          </div>
        ))}
      </CardBody>
    </Card>
  );
}

export default function OperationsStats({
  performance, products, alerts, period,
}: {
  performance?: OrderPerformance;
  products?: TopProductRow[];
  alerts?: InventoryAlerts;
  period: StatsPeriod;
}) {
  return (
    <>
      {performance && <Performance performance={performance} />}
      {products && <TopProducts key={period} products={products} period={period} />}
      {alerts && <StockAlerts alerts={alerts} />}
    </>
  );
}

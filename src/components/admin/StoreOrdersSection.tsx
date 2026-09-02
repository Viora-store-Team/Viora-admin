"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ArrowUpDown,
  Eye,
  MapPin,
  Package,
  Search,
  ShoppingBag,
  User,
  XCircle,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import EmptyState from "@/components/ui/EmptyState";
import ErrorBanner from "@/components/ui/ErrorBanner";
import Pagination from "@/components/ui/Pagination";
import Spinner from "@/components/ui/Spinner";
import StatusBadge from "@/components/admin/StatusBadge";
import { TableShell, Td, Thead } from "@/components/ui/Table";
import { fetchStoreOrders } from "@/lib/admin/api";
import { STORE_ORDER_STATUS } from "@/lib/admin/status";
import type {
  StoreOrder,
  StoreOrderStatus,
} from "@/lib/admin/types";
import { formatCurrency, formatDate } from "@/lib/format";
import { t } from "@/lib/strings";
import type { Pagination as PaginationType } from "@/lib/api";

const ORDER_COLUMNS = [
  t.admin.orders.colOrderNumber,
  t.admin.orders.colCustomer,
  t.admin.orders.colItems,
  t.admin.orders.colAddress,
  t.admin.orders.colDate,
  t.admin.orders.colTotal,
  t.admin.orders.colPayment,
  t.admin.orders.colStatus,
  t.admin.orders.colAction,
] as const;

interface TabConfig {
  key: string;
  label: string;
  status: StoreOrderStatus | "";
}

const TABS: TabConfig[] = [
  { key: "all", label: t.admin.orders.tabAll, status: "" },
  { key: "NEW", label: t.admin.orders.statusNew, status: "NEW" },
  { key: "PROCESSING", label: t.admin.orders.statusProcessing, status: "PROCESSING" },
  { key: "READY", label: t.admin.orders.statusReady, status: "READY" },
  { key: "SHIPPED", label: t.admin.orders.statusShipped, status: "SHIPPED" },
  { key: "COMPLETED", label: t.admin.orders.statusCompleted, status: "COMPLETED" },
  { key: "CANCELLED", label: t.admin.orders.statusCancelled, status: "CANCELLED" },
];

export default function StoreOrdersSection({ storeId }: { storeId: number }) {
  const [orders, setOrders] = useState<StoreOrder[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [pagination, setPagination] = useState<PaginationType | null>(null);
  const [activeTab, setActiveTab] = useState<string>("all");
  const [queryText, setQueryText] = useState("");
  const [sortOption, setSortOption] = useState<"newest" | "oldest" | "highest">("newest");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<StoreOrder | null>(null);

  const loadOrders = useCallback(async () => {
    setLoading(true);
    setError("");

    const currentTabObj = TABS.find((tab) => tab.key === activeTab);
    const status = currentTabObj?.status || "";

    const res = await fetchStoreOrders(storeId, {
      page,
      limit: 10,
      q: queryText,
      status,
      sort: sortOption,
    });

    setLoading(false);

    if (res.success) {
      setOrders(res.orders || []);
      if (res.counts) setCounts(res.counts);
      if (res.pagination) setPagination(res.pagination);
    } else {
      setError(res.message || t.admin.common.loadFailed);
    }
  }, [storeId, activeTab, queryText, sortOption, page]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  return (
    <div className="flex flex-col gap-6">
      {/* Header & Subtitle */}
      <div className="flex flex-col gap-1">
        <h2 className="text-xl font-extrabold text-heading">
          {t.admin.orders.title}
        </h2>
        <p className="text-sm text-text-secondary">
          {t.admin.orders.subtitle}
        </p>
      </div>

      <ErrorBanner message={error} onRetry={loadOrders} />

      {/* Tabs with Count Pills */}
      <div className="flex flex-wrap items-center gap-2 overflow-x-auto pb-1">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.key;
          const count = counts[tab.key] ?? (tab.key === "all" ? counts.all : 0);

          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => {
                setActiveTab(tab.key);
                setPage(1);
              }}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-extrabold transition ${
                isActive
                  ? "bg-primary text-white shadow-xs"
                  : "border border-border/80 bg-surface text-text-secondary hover:border-primary/40 hover:text-heading"
              }`}
            >
              <span>{tab.label}</span>
              {typeof count === "number" && (
                <span
                  className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                    isActive
                      ? "bg-white/20 text-white"
                      : "bg-field-bg text-text-secondary"
                  }`}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Search & Sort Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1">
          <Search className="absolute right-3.5 top-1/2 size-4 -translate-y-1/2 text-text-secondary" />
          <input
            type="search"
            value={queryText}
            onChange={(e) => {
              setQueryText(e.target.value);
              setPage(1);
            }}
            placeholder={t.admin.orders.searchPlaceholder}
            className="h-10.5 w-full rounded-xl border border-border bg-surface pl-4 pr-10 text-sm text-heading placeholder:text-text-secondary/70 focus:border-primary focus:outline-hidden focus:ring-2 focus:ring-primary/20"
          />
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <select
              value={sortOption}
              onChange={(e) => {
                setSortOption(e.target.value as "newest" | "oldest" | "highest");
                setPage(1);
              }}
              className="h-10.5 appearance-none rounded-xl border border-border bg-surface pl-8 pr-4 text-xs font-bold text-heading hover:border-primary/40 focus:border-primary focus:outline-hidden"
            >
              <option value="newest">{t.admin.orders.sortNewest}</option>
              <option value="oldest">{t.admin.orders.sortOldest}</option>
              <option value="highest">{t.admin.orders.sortHighest}</option>
            </select>
            <ArrowUpDown className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-text-secondary" />
          </div>
        </div>
      </div>

      {/* Orders Table or Empty State */}
      {loading ? (
        <Card className="p-12">
          <Spinner />
        </Card>
      ) : orders.length === 0 ? (
        <Card className="border border-border p-8">
          <EmptyState
            icon={ShoppingBag}
            title={queryText || activeTab !== "all" ? t.admin.orders.noResults : t.admin.orders.empty}
            hint={t.admin.orders.emptyHint}
            action={
              queryText || activeTab !== "all" ? (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setQueryText("");
                    setActiveTab("all");
                    setPage(1);
                  }}
                >
                  {t.admin.common.clearSearch}
                </Button>
              ) : undefined
            }
          />
        </Card>
      ) : (
        <div className="flex flex-col gap-4">
          <Card className="overflow-hidden border border-border shadow-xs">
            <TableShell minWidth="min-w-[950px]">
              <Thead columns={ORDER_COLUMNS} />
              <tbody className="divide-y divide-border/60">
                {orders.map((order) => (
                  <tr
                    key={order.id}
                    className="transition hover:bg-primary-soft/30"
                  >
                    <Td>
                      <span className="font-extrabold text-heading">
                        {order.orderNumber}
                      </span>
                    </Td>
                    <Td>
                      <div className="flex flex-col">
                        <span className="font-bold text-heading">
                          {order.customerName}
                        </span>
                        {order.customerPhone && (
                          <span className="ltr-nums text-xs text-text-secondary">
                            {order.customerPhone}
                          </span>
                        )}
                      </div>
                    </Td>
                    <Td className="ltr-nums font-medium text-text-secondary">
                      {order.itemsCount}
                    </Td>
                    <Td className="max-w-[200px] truncate text-text-secondary">
                      {order.address || order.city}
                    </Td>
                    <Td className="ltr-nums whitespace-nowrap text-text-secondary">
                      {formatDate(order.createdAt)}
                    </Td>
                    <Td>
                      <span className="ltr-nums font-bold text-heading">
                        {formatCurrency(Number(order.total))}
                      </span>
                    </Td>
                    <Td>
                      <Badge tone={order.paymentMethod === "ONLINE" ? "info" : "neutral"}>
                        {order.paymentMethod === "ONLINE"
                          ? t.admin.orders.paymentOnline
                          : t.admin.orders.paymentCOD}
                      </Badge>
                    </Td>
                    <Td>
                      <StatusBadge meta={STORE_ORDER_STATUS[order.status]} />
                    </Td>
                    <Td>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => setSelectedOrder(order)}
                        icon={<Eye className="size-3.5" />}
                      >
                        {t.admin.orders.reviewOrder}
                      </Button>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </TableShell>
          </Card>

          {pagination && pagination.totalPages > 1 && (
            <Pagination
              pagination={pagination}
              onChange={(newPage) => setPage(newPage)}
            />
          )}
        </div>
      )}

      {/* Order Detail Modal Dialog */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
            onClick={() => setSelectedOrder(null)}
          />

          <div className="relative z-10 max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-border bg-surface p-6 shadow-xl">
            <div className="flex items-start justify-between border-b border-border/80 pb-4">
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-extrabold text-heading">
                    {t.admin.orders.detailsTitle} ({selectedOrder.orderNumber})
                  </h3>
                  <StatusBadge meta={STORE_ORDER_STATUS[selectedOrder.status]} />
                </div>
                <p className="text-xs text-text-secondary">
                  {formatDate(selectedOrder.createdAt)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                className="grid size-8 place-items-center rounded-xl text-text-secondary hover:bg-field-bg hover:text-heading"
              >
                <XCircle className="size-5" />
              </button>
            </div>

            <div className="mt-6 flex flex-col gap-6">
              {/* Customer & Address Grid */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="rounded-xl border border-border/70 bg-field-bg/40 p-4">
                  <p className="flex items-center gap-2 text-xs font-bold text-text-secondary">
                    <User className="size-4 text-primary" />
                    {t.admin.orders.customerInfo}
                  </p>
                  <p className="mt-2 text-sm font-bold text-heading">
                    {selectedOrder.customerName}
                  </p>
                  {selectedOrder.customerPhone && (
                    <p className="ltr-nums mt-1 text-xs text-text-secondary">
                      {selectedOrder.customerPhone}
                    </p>
                  )}
                  {selectedOrder.customerEmail && (
                    <p className="mt-1 text-xs text-text-secondary">
                      {selectedOrder.customerEmail}
                    </p>
                  )}
                </div>

                <div className="rounded-xl border border-border/70 bg-field-bg/40 p-4">
                  <p className="flex items-center gap-2 text-xs font-bold text-text-secondary">
                    <MapPin className="size-4 text-primary" />
                    {t.admin.orders.shippingAddress}
                  </p>
                  <p className="mt-2 text-sm font-bold text-heading">
                    {selectedOrder.city}
                  </p>
                  <p className="mt-1 text-xs text-text-secondary">
                    {selectedOrder.address}
                  </p>
                </div>
              </div>

              {/* Items List */}
              <div>
                <h4 className="mb-3 text-sm font-extrabold text-heading">
                  {t.admin.orders.itemsList} ({selectedOrder.itemsCount})
                </h4>
                <div className="divide-y divide-border/60 rounded-xl border border-border/80">
                  {(selectedOrder.items || []).map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-3.5 text-sm"
                    >
                      <div className="flex items-center gap-3">
                        <span className="grid size-9 place-items-center rounded-lg bg-field-bg text-text-secondary">
                          <Package className="size-4" />
                        </span>
                        <div>
                          <p className="font-bold text-heading">{item.productName}</p>
                          <p className="text-xs text-text-secondary">
                            {item.variant} · مقاس {item.size}
                          </p>
                        </div>
                      </div>
                      <div className="text-left">
                        <p className="ltr-nums font-bold text-heading">
                          {formatCurrency(Number(item.price))} × {item.quantity}
                        </p>
                        <p className="ltr-nums text-xs font-medium text-text-secondary">
                          {formatCurrency(Number(item.price) * item.quantity)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Financial Summary */}
              <div className="rounded-xl border border-border/80 bg-field-bg/50 p-4">
                <div className="flex items-center justify-between py-1 text-sm text-text-secondary">
                  <span>{t.admin.orders.subtotal}</span>
                  <span className="ltr-nums font-bold text-heading">
                    {formatCurrency(
                      Number(selectedOrder.total) -
                        Number(selectedOrder.shippingFee || 0),
                    )}
                  </span>
                </div>
                <div className="flex items-center justify-between py-1 text-sm text-text-secondary">
                  <span>{t.admin.orders.shippingFee}</span>
                  <span className="ltr-nums font-bold text-heading">
                    {Number(selectedOrder.shippingFee) > 0
                      ? formatCurrency(Number(selectedOrder.shippingFee))
                      : t.admin.orders.freeShipping}
                  </span>
                </div>
                <div className="flex items-center justify-between border-t border-border/80 pt-2 text-base font-extrabold text-heading">
                  <span>{t.admin.orders.grandTotal}</span>
                  <span className="ltr-nums text-primary">
                    {formatCurrency(Number(selectedOrder.total))}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <Button onClick={() => setSelectedOrder(null)}>
                {t.admin.common.backToList}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

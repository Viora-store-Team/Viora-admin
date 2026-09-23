"use client";
import Image from "next/image";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useDialog } from "@/lib/useDialog";
import { Eye, ShoppingBag, X } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import EmptyState from "@/components/ui/EmptyState";
import ErrorBanner from "@/components/ui/ErrorBanner";
import Pagination from "@/components/ui/Pagination";
import Spinner from "@/components/ui/Spinner";
import { TableShell, Td, Thead } from "@/components/ui/Table";
import InfoGrid from "@/components/admin/InfoGrid";
import StatusBadge from "@/components/admin/StatusBadge";
import { fetchAdminOrderDetail, fetchAdminOrders } from "@/lib/admin/api";
import { STORE_ORDER_STATUS } from "@/lib/admin/status";
import type { AdminOrderDetail, AdminOrderListItem, StoreOrderStatus } from "@/lib/admin/types";
import type { Pagination as PaginationType } from "@/lib/api";
import { classifyStatus } from "@/lib/apiFailure";
import { formatCurrency, formatDate, formatDateTime, formatNumber } from "@/lib/format";
import { t } from "@/lib/strings";

const COLUMNS = [
  t.admin.orders.colOrderNumber,
  t.admin.orders.colStore,
  t.admin.orders.colCustomer,
  t.admin.orders.colItems,
  t.admin.orders.colDate,
  t.admin.orders.colTotal,
  t.admin.orders.colStatus,
  t.admin.orders.colAction,
] as const;

function AdminOrdersPageContent() {
  const searchParams = useSearchParams();
  const requestedOrder = Number(searchParams.get("orderId"));
  const detailRequest = useRef(0);
  const [orders, setOrders] = useState<AdminOrderListItem[]>([]);
  const [pagination, setPagination] = useState<PaginationType | null>(null);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<StoreOrderStatus | "">("");
  const [storeInput, setStoreInput] = useState("");
  const [storeId, setStoreId] = useState<number | undefined>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [detail, setDetail] = useState<AdminOrderDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const res = await fetchAdminOrders({ page, limit: 20, status, storeId });
      if (cancelled) return;
      setLoading(false);
      if (res.success && res.orders) {
        setOrders(res.orders);
        setPagination(res.pagination ?? null);
        setError("");
        return;
      }
      setOrders([]);
      setPagination(null);
      const failure = classifyStatus(res);
      setError(failure.kind === "unauthorized" ? t.admin.common.sessionInvalid : failure.message);
    })();
    return () => { cancelled = true; };
  }, [page, attempt, status, storeId]);

  const openDetail = useCallback(async (orderId: number) => {
    const request = ++detailRequest.current;
    setDetailLoading(true);
    setDetail(null);
    const res = await fetchAdminOrderDetail(orderId);
    if (request !== detailRequest.current) return;
    setDetailLoading(false);
    if (res.success && res.order) {
      setDetail(res.order);
      return;
    }
    const failure = classifyStatus(res);
    setError(failure.kind === "unauthorized" ? t.admin.common.sessionInvalid : failure.message);
  }, []);
  const closeDetail = useCallback(() => { detailRequest.current++; setDetail(null); setDetailLoading(false); }, []);
  const dialogRef = useDialog(detailLoading || !!detail, closeDetail);
  useEffect(() => {
    if (Number.isSafeInteger(requestedOrder) && requestedOrder > 0) {
      // Open the resource selected by an external notification URL.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      void openDetail(requestedOrder);
    }
    // Invalidate the latest asynchronous request; this ref is a sequence counter, not a DOM node.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    return () => { detailRequest.current++; };
  }, [requestedOrder, openDetail]);

  const total = pagination?.total ?? orders.length;
  const delivery = detail?.delivery;
  const deliveryAddress = [delivery?.city, delivery?.area, delivery?.street, delivery?.details]
    .filter(Boolean)
    .join(" — ");
  const productsTotal = detail?.money?.productsTotal ?? detail?.total ?? "0";
  const deliveryFee = detail?.money?.deliveryFee ?? delivery?.fee;
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t.admin.orders.title} subtitle={total ? `${formatNumber(total)} ${t.admin.orders.count}` : t.admin.orders.globalSubtitle} />
      <ErrorBanner message={error} onRetry={() => { setLoading(true); setAttempt((value) => value + 1); }} />

      <form className="flex flex-wrap items-end gap-3" onSubmit={event => {
        event.preventDefault();
        const nextStore = storeInput.trim() ? Number(storeInput) : undefined;
        if (nextStore !== undefined && (!Number.isSafeInteger(nextStore) || nextStore <= 0)) return;
        if (nextStore !== storeId) { setStoreId(nextStore); setPage(1); setLoading(true); }
      }}>
        <label className="flex flex-col gap-1 text-sm font-bold">حالة الطلب
          <select aria-label="حالة الطلب" className="rounded-xl border border-border bg-surface p-2" value={status} onChange={event => {
            setStatus(event.target.value as StoreOrderStatus | ""); setPage(1); setLoading(true);
          }}>
            <option value="">كل الحالات</option>
            {Object.entries(STORE_ORDER_STATUS).map(([key, meta]) => <option key={key} value={key}>{meta.label}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm font-bold">معرّف المتجر
          <input aria-label="معرّف المتجر" type="number" min="1" step="1" value={storeInput} onChange={event => setStoreInput(event.target.value)} placeholder="كل المتاجر" className="rounded-xl border border-border bg-surface p-2" />
        </label>
        <Button type="submit">تطبيق فلتر المتجر</Button>
        {(status || storeId || storeInput) && <Button type="button" variant="secondary" onClick={() => {
          if (status || storeId) setLoading(true);
          setStatus(""); setStoreInput(""); setStoreId(undefined); setPage(1);
        }}>مسح الفلاتر</Button>}
      </form>

      {loading ? <Spinner /> : orders.length === 0 ? (
        <Card><CardBody className="p-8"><EmptyState icon={ShoppingBag} title={t.admin.orders.empty} hint={t.admin.orders.globalSubtitle} /></CardBody></Card>
      ) : (
        <div className="flex flex-col gap-4">
          <Card className="overflow-hidden border border-border shadow-xs">
            <TableShell minWidth="min-w-[900px]"><Thead columns={COLUMNS} /><tbody className="divide-y divide-border/60">
              {orders.map((order) => <tr key={order.id} className="bg-surface transition hover:bg-primary-soft/40">
                <Td className="font-extrabold text-heading">{order.orderNumber}</Td>
                <Td>{order.store?.name ?? t.admin.common.none}</Td>
                <Td><p className="font-semibold text-heading">{order.customer?.name ?? order.recipientName}</p><p className="mt-1 text-xs text-text-secondary">{order.city ?? t.admin.common.none}</p></Td>
                <Td className="ltr-nums">{formatNumber(order.itemsCount)}</Td>
                <Td className="ltr-nums whitespace-nowrap text-text-secondary">{formatDate(order.createdAt)}</Td>
                <Td className="ltr-nums font-bold">{formatCurrency(Number(order.total))}</Td>
                <Td><StatusBadge meta={STORE_ORDER_STATUS[order.status]} /></Td>
                <Td><Button size="sm" variant="secondary" onClick={() => openDetail(order.id)} icon={<Eye className="size-3.5" aria-hidden="true" />}>{t.admin.orders.reviewOrder}</Button></Td>
              </tr>)}
            </tbody></TableShell>
          </Card>
          {pagination && <Pagination pagination={pagination} onChange={next => { if (next !== page) { setLoading(true); setPage(next); } }} />}
        </div>
      )}

      {(detailLoading || detail) && <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <button type="button" className="fixed inset-0 bg-black/40 backdrop-blur-xs" aria-label={t.common.close} onClick={closeDetail} />
        <div ref={dialogRef} role="dialog" aria-modal="true" aria-label={t.admin.orders.detailsTitle} tabIndex={-1} className="relative z-10 max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-3xl border border-border bg-app-bg shadow-2xl">
          <div className="sticky top-0 z-10 flex items-start justify-between border-b border-border bg-surface px-6 py-5 sm:px-8">
            <div><h2 className="text-xl font-black text-heading">{t.admin.orders.detailsTitle}</h2>{detail && <p className="mt-1 ltr-nums text-sm font-semibold text-text-secondary">{detail.orderNumber}</p>}</div>
            <Button variant="ghost" size="sm" onClick={closeDetail} icon={<X className="size-4" aria-hidden="true" />}>{t.common.close}</Button>
          </div>
          {detailLoading ? <div className="p-12"><Spinner /></div> : detail && <div className="space-y-5 p-5 sm:p-8">
            <section className="flex flex-col gap-4 rounded-2xl bg-primary p-5 text-icon sm:flex-row sm:items-center sm:justify-between">
              <div><p className="text-xs font-bold text-icon/70">حالة الطلب</p><div className="mt-2"><StatusBadge meta={STORE_ORDER_STATUS[detail.status]} /></div></div>
              <div className="grid grid-cols-2 gap-5 text-start sm:text-end"><div><p className="text-xs font-bold text-icon/70">إجمالي المنتجات</p><p className="mt-1 ltr-nums text-lg font-black">{formatCurrency(Number(productsTotal))}</p></div><div><p className="text-xs font-bold text-icon/70">الإجمالي المطلوب</p><p className="mt-1 ltr-nums text-lg font-black">{formatCurrency(Number(detail.total))}</p></div></div>
            </section>

            <div className="grid gap-5 md:grid-cols-2">
              <Card className="border border-border shadow-xs"><CardHeader title={t.admin.orders.customerInfo} /><CardBody><InfoGrid rows={[
                { label: t.admin.orders.colCustomer, value: detail.customer.name },
                { label: t.admin.users.email, value: <span dir="ltr">{detail.customer.email}</span> },
                { label: t.admin.users.phone, value: <span dir="ltr">{delivery?.recipientPhone ?? detail.customer.phone ?? t.admin.common.none}</span> },
                { label: t.admin.common.createdAt, value: <span className="ltr-nums">{formatDateTime(detail.createdAt)}</span> },
              ]} /></CardBody></Card>
              <Card className="border border-border shadow-xs"><CardHeader title={t.admin.orders.shippingAddress} /><CardBody><InfoGrid rows={[
                { label: t.admin.orders.colStore, value: detail.store.name },
                { label: "العنوان", value: deliveryAddress || t.admin.common.none },
                { label: "اسم المستلم", value: delivery?.recipientName ?? detail.customer.name },
                { label: "رسوم التوصيل", value: deliveryFee === null || deliveryFee === undefined ? t.admin.orders.freeShipping : <span className="ltr-nums">{formatCurrency(Number(deliveryFee))}</span> },
              ]} /></CardBody></Card>
            </div>

            <Card className="overflow-hidden border border-border shadow-xs"><CardHeader title={t.admin.orders.itemsList} /><CardBody className="p-0"><div className="divide-y divide-border/70">{detail.items.map((item) => {
              const unitPrice = item.unitPrice ?? item.price;
              const lineTotal = item.lineTotal ?? String(item.quantity * Number(unitPrice));
              const variant = [item.colorName ?? item.variant, item.sizeName ?? item.size].filter(Boolean).join(" · ");
              const image = item.image ?? item.productImage;
              return <article key={item.id} className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-center gap-4">{image ? <Image width={64} height={64} unoptimized src={image} alt="" className="size-16 shrink-0 rounded-xl border border-border object-cover" /> : <span className="grid size-16 shrink-0 place-items-center rounded-xl bg-field-bg text-xs font-bold text-text-secondary">منتج</span>}<div className="min-w-0"><p className="truncate text-base font-extrabold text-heading">{item.productName}</p>{variant && <p className="mt-1 text-sm text-text-secondary">{variant}</p>}</div></div>
                <div className="grid grid-cols-3 gap-3 rounded-xl bg-field-bg p-3 text-center sm:min-w-[290px]"><div><p className="text-[11px] font-bold text-text-secondary">عدد القطع</p><p className="mt-1 ltr-nums font-black text-heading">{item.quantity}</p></div><div><p className="text-[11px] font-bold text-text-secondary">سعر القطعة</p><p className="mt-1 ltr-nums font-black text-heading">{formatCurrency(Number(unitPrice))}</p></div><div><p className="text-[11px] font-bold text-text-secondary">إجمالي المنتج</p><p className="mt-1 ltr-nums font-black text-primary">{formatCurrency(Number(lineTotal))}</p></div></div>
              </article>;
            })}</div></CardBody></Card>
          </div>}
        </div>
      </div>}
    </div>
  );
}

export default function AdminOrdersPage() {
  return <Suspense fallback={<Spinner />}><AdminOrdersPageContent /></Suspense>;
}

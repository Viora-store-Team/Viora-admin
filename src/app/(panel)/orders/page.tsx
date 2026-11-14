"use client";
import Image from "next/image";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Eye, ShoppingBag } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import EmptyState from "@/components/ui/EmptyState";
import ErrorBanner from "@/components/ui/ErrorBanner";
import Pagination from "@/components/ui/Pagination";
import Spinner from "@/components/ui/Spinner";
import Select from "@/components/ui/Select";
import Input from "@/components/ui/Input";
import { TableShell, Td, Thead, Tr } from "@/components/ui/Table";
import InfoGrid from "@/components/admin/InfoGrid";
import OrderPromoLines from "@/components/admin/OrderPromoLines";
import StatusBadge from "@/components/admin/StatusBadge";
import { fetchAdminOrderDetail, fetchAdminOrders } from "@/lib/admin/api";
import { orderStatusMeta, STORE_ORDER_STATUS } from "@/lib/admin/status";
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
        <Select id="order-status" label="حالة الطلب" value={status} placeholder="كل الحالات"
          options={Object.entries(STORE_ORDER_STATUS).map(([key, meta]) => ({ value: key, label: meta.label }))}
          onChange={value => { setStatus(value as StoreOrderStatus | ""); setPage(1); setLoading(true); }} />
        <Input id="orders-store" label="معرّف المتجر" aria-label="معرّف المتجر" type="number" min="1" step="1" value={storeInput} onChange={setStoreInput} placeholder="كل المتاجر" />
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
          <Card className="overflow-hidden border border-border shadow-card">
            <TableShell minWidth="min-w-[900px]"><Thead columns={COLUMNS} /><tbody className="divide-y divide-border">
              {orders.map((order) => <Tr key={order.id}>
                <Td className="font-bold text-heading">{order.orderNumber}</Td>
                <Td>{order.store?.name ?? t.admin.common.none}</Td>
                <Td><p className="font-medium text-heading">{order.customer?.name ?? order.recipientName}</p><p className="mt-1 text-xs text-text-secondary">{order.city ?? t.admin.common.none}</p></Td>
                <Td className="ltr-nums">{formatNumber(order.itemsCount)}</Td>
                <Td className="ltr-nums whitespace-nowrap text-text-secondary">{formatDate(order.createdAt)}</Td>
                <Td className="ltr-nums font-bold">{formatCurrency(Number(order.total))}</Td>
                <Td><StatusBadge meta={orderStatusMeta(order.status)} /></Td>
                <Td><Button size="sm" variant="secondary" onClick={() => openDetail(order.id)} icon={<Eye className="size-3.5" aria-hidden="true" />}>{t.admin.orders.reviewOrder}</Button></Td>
              </Tr>)}
            </tbody></TableShell>
          </Card>
          {pagination && <Pagination pagination={pagination} onChange={next => { if (next !== page) { setLoading(true); setPage(next); } }} />}
        </div>
      )}

      <Modal open={detailLoading || detail !== null} onClose={closeDetail} title={t.admin.orders.detailsTitle} size="xl"
        description={detail && <p className="mt-1 ltr-nums text-sm font-medium text-text-secondary">{detail.orderNumber}</p>}>
          {detailLoading ? <div className="p-12"><Spinner /></div> : detail && <div className="space-y-5">
            <section className="flex flex-col gap-4 rounded-2xl bg-primary p-5 text-on-primary sm:flex-row sm:items-center sm:justify-between">
              <div><p className="text-xs font-bold text-on-primary/70">حالة الطلب</p><div className="mt-2"><StatusBadge meta={orderStatusMeta(detail.status)} /></div></div>
              <div className="grid grid-cols-2 gap-5 text-start sm:text-end"><div><p className="text-xs font-bold text-on-primary/70">إجمالي المنتجات</p><p className="mt-1 ltr-nums text-lg font-bold">{formatCurrency(Number(productsTotal))}</p></div><div><p className="text-xs font-bold text-on-primary/70">الإجمالي المطلوب</p><p className="mt-1 ltr-nums text-lg font-bold">{formatCurrency(Number(detail.total))}</p></div></div>
            </section>
            <OrderPromoLines detail={detail} />

            <div className="grid gap-5 md:grid-cols-2">
              <Card className="border border-border shadow-card"><CardHeader title={t.admin.orders.customerInfo} /><CardBody><InfoGrid rows={[
                { label: t.admin.orders.colCustomer, value: detail.customer.name },
                { label: t.admin.users.email, value: <span dir="ltr">{detail.customer.email}</span> },
                { label: t.admin.users.phone, value: <span dir="ltr">{delivery?.recipientPhone ?? detail.customer.phone ?? t.admin.common.none}</span> },
                { label: t.admin.common.createdAt, value: <span className="ltr-nums">{formatDateTime(detail.createdAt)}</span> },
              ]} /></CardBody></Card>
              <Card className="border border-border shadow-card"><CardHeader title={t.admin.orders.shippingAddress} /><CardBody><InfoGrid rows={[
                { label: t.admin.orders.colStore, value: detail.store.name },
                { label: "العنوان", value: deliveryAddress || t.admin.common.none },
                { label: "اسم المستلم", value: delivery?.recipientName ?? detail.customer.name },
                { label: "رسوم التوصيل", value: deliveryFee === null || deliveryFee === undefined ? t.admin.orders.freeShipping : <span className="ltr-nums">{formatCurrency(Number(deliveryFee))}</span> },
              ]} /></CardBody></Card>
            </div>

            <Card className="overflow-hidden border border-border shadow-card"><CardHeader title={t.admin.orders.itemsList} /><CardBody className="p-0"><div className="divide-y divide-border/70">{detail.items.map((item) => {
              const unitPrice = item.unitPrice ?? item.price;
              const lineTotal = item.lineTotal ?? String(item.quantity * Number(unitPrice));
              const variant = [item.colorName ?? item.variant, item.sizeName ?? item.size].filter(Boolean).join(" · ");
              const image = item.image ?? item.productImage;
              return <article key={item.id} className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-center gap-4">{image ? <Image width={64} height={64} unoptimized src={image} alt="" className="size-16 shrink-0 rounded-xl border border-border object-cover" /> : <span className="grid size-16 shrink-0 place-items-center rounded-xl bg-surface-muted text-xs font-bold text-text-secondary">منتج</span>}<div className="min-w-0"><p className="truncate text-base font-bold text-heading">{item.productName}</p>{variant && <p className="mt-1 text-sm text-text-secondary">{variant}</p>}</div></div>
                <div className="grid grid-cols-3 gap-3 rounded-xl bg-surface-muted p-3 text-center sm:min-w-[290px]"><div><p className="text-[11px] font-bold text-text-secondary">عدد القطع</p><p className="mt-1 ltr-nums font-bold text-heading">{item.quantity}</p></div><div><p className="text-[11px] font-bold text-text-secondary">سعر القطعة</p><p className="mt-1 ltr-nums font-bold text-heading">{formatCurrency(Number(unitPrice))}</p></div><div><p className="text-[11px] font-bold text-text-secondary">إجمالي المنتج</p><p className="mt-1 ltr-nums font-bold text-primary">{formatCurrency(Number(lineTotal))}</p></div></div>
              </article>;
            })}</div></CardBody></Card>
          </div>}
      </Modal>
    </div>
  );
}

export default function AdminOrdersPage() {
  return <Suspense fallback={<Spinner />}><AdminOrdersPageContent /></Suspense>;
}

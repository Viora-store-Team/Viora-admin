"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowLeftRight,
  Banknote,
  Check,
  CircleAlert,
  Info,
  Percent,
  Receipt,
  RotateCw,
  Store,
  Wallet,
  X,
  type LucideIcon,
} from "lucide-react";
import Button from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import ErrorBanner from "@/components/ui/ErrorBanner";
import Pagination from "@/components/ui/Pagination";
import Spinner from "@/components/ui/Spinner";
import { TableShell, Td, Thead } from "@/components/ui/Table";
import {
  createPayout,
  fetchAdminSettlements,
  fetchCommissionSettings,
  fetchPayoutBalances,
  fetchPayout,
  fetchPayouts,
  updateCommissionSettings,
  voidPayout,
  type AdminPayoutBalance,
  type AdminPayoutRecord,
  type AdminSettlement,
} from "@/lib/admin/api";
import type { Pagination as PaginationInfo } from "@/lib/api";
import { formatCurrency, formatDateTime, formatNumber } from "@/lib/format";
import { dispatchToast } from "@/lib/toast";

type PaidFilter = "all" | "paid" | "unpaid";
type FinanceView = "overview" | "payouts" | "settlements";

const value = (item: unknown): number | null => {
  if (typeof item === "number") return Number.isFinite(item) ? item : null;
  if (item && typeof item === "object") {
    const nested = asRecord(item);
    if (nested) return value(firstValue(nested, ["amount", "value", "total", "balance", "_value", "unpaidAmount", "amountDue", "due", "available", "remaining"]));
  }
  if (typeof item !== "string" || !item.trim()) return null;
  const parsed = Number(item.replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
};
const money = (item: unknown) => {
  const parsed = value(item);
  return parsed === null ? "—" : formatCurrency(parsed);
};
const isVoided = (status: string) => ["voided", "void", "cancelled", "canceled"].includes(status.toLowerCase());
type FinanceSection = "commission" | "balances" | "payouts" | "settlements";

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function firstValue(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const result = record[key];
    if (result !== undefined && result !== null && result !== "") return result;
  }
  return undefined;
}

function responseRows<T>(response: Record<string, unknown>, keys: string[]): T[] {
  const payload = asRecord(response.data);
  for (const key of keys) {
    const direct = response[key];
    if (Array.isArray(direct)) return direct as T[];
    const nested = payload?.[key];
    if (Array.isArray(nested)) return nested as T[];
  }
  if (Array.isArray(response.data)) return response.data as T[];
  return [];
}

function normalizeBalance(item: AdminPayoutBalance): AdminPayoutBalance {
  const raw = item as Record<string, unknown>;
  const store = asRecord(raw.store) ?? asRecord(raw.merchant) ?? {};
  const totals = asRecord(raw.totals) ?? asRecord(raw.balance) ?? {};
  const payout = asRecord(raw.payout);
  const rawAccount = asRecord(raw.payoutAccount) ?? asRecord(raw.payout_account) ?? asRecord(raw.account) ?? asRecord(payout?.account);
  return {
    ...item,
    storeId: Number(firstValue(raw, ["storeId", "merchantId", "id"]) ?? store.id ?? 0),
    storeName: String(firstValue(raw, ["storeName", "merchantName", "name"]) ?? store.name ?? store.storeName ?? `متجر #${Number(store.id ?? raw.storeId ?? raw.merchantId ?? raw.id ?? 0)}`),
    earned: firstValue(raw, ["earned", "entitled", "entitlement", "totalEarned", "earnedAmount", "totalEntitled", "totalEntitlement", "merchantEarnings"]) as AdminPayoutBalance["earned"],
    paid: (firstValue(raw, ["paid", "received", "totalPaid", "paidAmount", "transferredAmount", "totalReceived"]) ?? firstValue(totals, ["paid", "received", "totalPaid", "transferredAmount", "totalReceived"])) as AdminPayoutBalance["paid"],
    outstanding: (firstValue(raw, ["unpaid", "outstanding", "pending", "balance", "due", "amountDue", "pendingAmount", "unpaidAmount", "remainingBalance", "amountOwed"]) ?? firstValue(totals, ["unpaid", "outstanding", "pending", "due", "amountDue", "unpaidAmount", "remainingBalance", "amountOwed"])) as AdminPayoutBalance["outstanding"],
    payoutAccount: rawAccount,
  };
}

function normalizeSettlement(item: AdminSettlement): AdminSettlement {
  const raw = item as Record<string, unknown>;
  const store = asRecord(raw.store) ?? {};
  const order = asRecord(raw.order) ?? {};
  const paidValue = firstValue(raw, ["paid", "isPaid", "isSettled", "transferred"]);
  const payoutId = firstValue(raw, ["payoutId", "payout_id"]);
  return {
    ...item,
    id: Number(raw.id ?? order.id ?? 0),
    orderId: Number(firstValue(raw, ["orderId", "storeOrderId"]) ?? order.id ?? 0),
    storeId: Number(raw.storeId ?? store.id ?? 0),
    storeName: String(firstValue(raw, ["storeName", "merchantName"]) ?? store.name ?? ""),
    amount: (firstValue(raw, ["amount", "storeDue", "entitlement", "entitledAmount", "merchantAmount", "storeAmount", "netAmount", "earned", "amountDue", "total", "merchantEarnings", "storeEarnings", "commissionableAmount"]) as string | number | undefined) ?? "",
    createdAt: String(firstValue(raw, ["createdAt", "closedAt", "settledAt", "orderClosedAt"]) ?? order.createdAt ?? ""),
    paid: paidValue === true || paidValue === 1 || (typeof paidValue === "string" && ["true", "1", "paid"].includes(paidValue.toLowerCase())) || (payoutId !== undefined && payoutId !== null && payoutId !== 0 && payoutId !== ""),
  };
}

function normalizePayout(item: AdminPayoutRecord): AdminPayoutRecord {
  const raw = item as unknown as Record<string, unknown>;
  const store = asRecord(raw.store) ?? {};
  const orders = Array.isArray(raw.orders) ? raw.orders : [];
  return {
    ...item,
    id: Number(raw.id ?? raw.payoutId ?? 0),
    storeId: Number(raw.storeId ?? raw.merchantId ?? store.id ?? 0),
    storeName: String(firstValue(raw, ["storeName", "merchantName"]) ?? store.name ?? ""),
    amount: (firstValue(raw, ["amount", "paidAmount", "total", "transferAmount"]) as string | number | undefined) ?? "",
    status: String(raw.status ?? (raw.voidedAt ? "voided" : "current")),
    createdAt: String(raw.createdAt ?? raw.paidAt ?? ""),
    orderIds: Array.isArray(raw.orderIds) ? raw.orderIds as number[] : orders.map((order) => Number(asRecord(order)?.id)).filter(Number.isFinite),
    reason: typeof raw.reason === "string" ? raw.reason : typeof raw.voidReason === "string" ? raw.voidReason : null,
  };
}

export default function FinancePage() {
  const [commission, setCommission] = useState<number | null>(null);
  const [customStoresCount, setCustomStoresCount] = useState<number | null>(null);
  const [balanceStoresCount, setBalanceStoresCount] = useState<number | null>(null);
  const [balanceTotalUnpaid, setBalanceTotalUnpaid] = useState<number | null>(null);
  const [commissionInput, setCommissionInput] = useState("");
  const [balances, setBalances] = useState<AdminPayoutBalance[]>([]);
  const [payouts, setPayouts] = useState<AdminPayoutRecord[]>([]);
  const [settlements, setSettlements] = useState<AdminSettlement[]>([]);
  const [payoutPagination, setPayoutPagination] = useState<PaginationInfo | undefined>();
  const [settlementPagination, setSettlementPagination] = useState<PaginationInfo | undefined>();
  const [payoutPage, setPayoutPage] = useState(1);
  const [settlementPage, setSettlementPage] = useState(1);
  const [paidFilter, setPaidFilter] = useState<PaidFilter>("all");
  const [activeView, setActiveView] = useState<FinanceView>("overview");
  const [payoutStatus, setPayoutStatus] = useState<"all" | "current" | "voided">("all");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [sectionErrors, setSectionErrors] = useState<Partial<Record<FinanceSection, string>>>({});
  const [payoutTarget, setPayoutTarget] = useState<AdminPayoutBalance | null>(null);
  const [voidTarget, setVoidTarget] = useState<number | null>(null);
  const [voidReason, setVoidReason] = useState("");
  const [payoutDetail, setPayoutDetail] = useState<AdminPayoutRecord | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const showToast = dispatchToast;

  const load = useCallback(async () => {
    setLoading(true);
    setSectionErrors({});
    const [commissionRes, balancesRes, payoutsRes, settlementsRes] = await Promise.all([
      fetchCommissionSettings(),
      fetchPayoutBalances(),
      fetchPayouts({ page: payoutPage, status: payoutStatus === "all" ? "" : payoutStatus }),
      fetchAdminSettlements({
        page: settlementPage,
        paid: paidFilter === "all" ? undefined : paidFilter === "paid",
      }),
    ]);

    const nextErrors: Partial<Record<FinanceSection, string>> = {};
    if (commissionRes.success) {
      const settings = commissionRes.settings ?? commissionRes.commission;
      const payload = asRecord(commissionRes.data) ?? {};
      const nestedSettings = asRecord(payload.settings) ?? asRecord(payload.commission) ?? {};
      const rate = settings?.defaultRate ?? settings?.percent ?? commissionRes.defaultRate ?? payload.defaultRate ?? payload.defaultCommission ?? payload.commissionRate ?? payload.rate ?? nestedSettings.defaultRate ?? nestedSettings.defaultCommission ?? nestedSettings.rate;
      const parsedRate = value(rate);
      if (parsedRate !== null) {
        setCommission(parsedRate);
        setCommissionInput(String(parsedRate));
      } else {
        setCommission(null);
        setCommissionInput("");
        nextErrors.commission = "تعذر قراءة نسبة العمولة الحالية؛ أوقفت الحفظ حتى لا تتغير بالخطأ.";
      }
      setCustomStoresCount(settings?.customStoresCount ?? settings?.customRateStores ?? commissionRes.customStoresCount ?? (typeof (payload.customStoresCount ?? nestedSettings.customStoresCount) === "number" ? Number(payload.customStoresCount ?? nestedSettings.customStoresCount) : null));
    } else {
      setCommission(null);
      setCustomStoresCount(null);
      nextErrors.commission = commissionRes.message || "تعذر تحميل نسبة العمولة. حاولي تحديث البيانات.";
    }
    if (balancesRes.success) {
      const rows = responseRows<AdminPayoutBalance>(balancesRes, ["balances", "stores", "items", "rows"]);
      setBalances(rows.map(normalizeBalance));
      const totals = asRecord(balancesRes.totals) ?? {};
      setBalanceStoresCount(value(totals.storesCount) ?? null);
      setBalanceTotalUnpaid(value(totals.unpaidAmount) ?? null);
    } else {
      setBalances([]);
      setBalanceStoresCount(null);
      setBalanceTotalUnpaid(null);
      nextErrors.balances = balancesRes.message || "تعذر تحميل مستحقات المتاجر. حاولي تحديث البيانات.";
    }
    if (payoutsRes.success) {
      const payload = asRecord(payoutsRes.data) ?? {};
      setPayouts(responseRows<AdminPayoutRecord>(payoutsRes, ["payouts", "items", "rows", "payments"]).map(normalizePayout));
      setPayoutPagination(payoutsRes.pagination ?? payload.pagination as PaginationInfo | undefined);
    } else {
      setPayouts([]);
      nextErrors.payouts = payoutsRes.message || "تعذر تحميل سجل التحويلات. حاولي تحديث البيانات.";
    }
    if (settlementsRes.success) {
      const payload = asRecord(settlementsRes.data) ?? {};
      const rows = responseRows<AdminSettlement>(settlementsRes, ["settlements", "items", "rows"]);
      setSettlements(rows.map(normalizeSettlement));
      setSettlementPagination(settlementsRes.pagination ?? payload.pagination as PaginationInfo | undefined);
    } else {
      setSettlements([]);
      nextErrors.settlements = settlementsRes.message || "تعذر تحميل تفاصيل الطلبات. حاولي تحديث البيانات.";
    }

    setSectionErrors(nextErrors);
    setLoading(false);
    return Object.keys(nextErrors).length === 0;
  }, [paidFilter, payoutPage, payoutStatus, settlementPage]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load, refreshKey]);

  const sortedBalances = useMemo(
    () => [...balances].sort((a, b) => (value(b.outstanding) ?? 0) - (value(a.outstanding) ?? 0)),
    [balances],
  );
  const storesOwedUnknown = balanceStoresCount === null;
  const storesOwed = balanceStoresCount ?? 0;

  const saveCommission = async () => {
    const nextRate = Number(commissionInput);
    if (!Number.isFinite(nextRate) || nextRate < 0 || nextRate > 100) {
      showToast("warning", "أدخلي نسبة بين 0 و100.");
      return;
    }
    setBusy("commission");
    try {
      const res = await updateCommissionSettings(nextRate);
      if (!res.success) {
        showToast("error", res.message || "ما قدرنا نحفظ العمولة. حاولي مرة ثانية.");
        return;
      }
      setCommission(nextRate);
      showToast("success", "انحفظت العمولة، وبتنطبق على الطلبات الجديدة.");
    } catch {
      showToast("error", "صار خطأ أثناء حفظ العمولة. حاولي مرة ثانية.");
    } finally {
      setBusy("");
    }
  };

  const confirmPayout = async () => {
    if (!payoutTarget) return;
    const store = payoutTarget;
    setBusy(`payout-${store.storeId}`);
    try {
      const res = await createPayout(store.storeId);
      if (!res.success) {
        showToast("error", res.message || "ما قدرنا نسجّل التحويل. راجعي سجل التحويل وحاولي مرة ثانية.");
        return;
      }
      setPayoutTarget(null);
      showToast("success", `تسجّل تحويل ${store.storeName} وأُرسل له إشعار.`);
      setRefreshKey((key) => key + 1);
    } catch {
      showToast("error", "صار خطأ أثناء تسجيل التحويل. تحققي من السجل قبل إعادة المحاولة.");
    } finally {
      setBusy("");
    }
  };

  const confirmVoid = async () => {
    if (voidTarget === null || voidReason.trim().length < 3) return;
    setBusy(`void-${voidTarget}`);
    try {
      const res = await voidPayout(voidTarget, voidReason.trim());
      if (!res.success) {
        showToast("error", res.message || "ما قدرنا نلغي التحويل. حاولي مرة ثانية.");
        return;
      }
      setVoidTarget(null);
      setVoidReason("");
      showToast("success", "انلغى سجل التحويل ورجعت الطلبات للمستحقات غير المدفوعة.");
      setRefreshKey((key) => key + 1);
    } catch {
      showToast("error", "صار خطأ أثناء إلغاء التحويل. حاولي مرة ثانية.");
    } finally {
      setBusy("");
    }
  };

  const showPayoutDetail = async (id: number) => {
    setDetailLoading(true);
    const res = await fetchPayout(id);
    setDetailLoading(false);
    const payload = asRecord(res.data) ?? {};
    const detail = res.payout ?? (asRecord(payload.payout) as AdminPayoutRecord | null) ?? (typeof res.id === "number" ? res as unknown as AdminPayoutRecord : null);
    if (!res.success || !detail) {
      showToast("error", res.message || "ما قدرنا نحمّل تفاصيل التحويل.");
      return;
    }
    setPayoutDetail(normalizePayout(detail));
    showToast("info", "انفتحت تفاصيل التحويل.");
  };

  const refreshData = async () => {
    setBusy("refresh");
    const ok = await load();
    setBusy("");
    showToast(ok ? "success" : "warning", ok ? "تحدّثت البيانات." : "تحدّثت الصفحة، لكن بعض البيانات ما زالت غير متاحة.");
  };

  return (
    <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-5 pb-10">
      <section className="relative overflow-hidden rounded-3xl border border-border bg-gradient-to-l from-primary-soft via-surface to-surface p-5 shadow-sm sm:p-7">
        <div className="pointer-events-none absolute -start-8 -top-12 size-44 rounded-full bg-primary/5 blur-2xl" />
        <div className="relative flex flex-wrap items-center justify-between gap-5">
          <div className="max-w-2xl">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-extrabold text-primary"><Wallet className="size-4" /> الإدارة المالية</div>
            <h1 className="text-2xl font-extrabold tracking-tight text-heading sm:text-3xl">العمولات والتحويلات</h1>
            <p className="mt-2 text-sm leading-6 text-text-secondary">تابعي مستحقات المتاجر وسجّلي التحويلات بعد تنفيذها. كل الأرقام هنا من بيانات الخادم.</p>
          </div>
          <Button variant="secondary" disabled={loading || busy === "refresh"} icon={<RotateCw className={`size-4 ${loading || busy === "refresh" ? "animate-spin" : ""}`} />} onClick={() => void refreshData()}>
            {busy === "refresh" ? "جارٍ التحديث…" : "تحديث البيانات"}
          </Button>
        </div>
      </section>

      {loading ? <Spinner /> : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <MetricCard icon={Percent} label="عمولة الطلبات الجديدة" value={commission === null ? "—" : `${commission}%`} tone="primary" />
            <MetricCard icon={Store} label="متاجر في كشف المستحقات" value={storesOwedUnknown ? "—" : formatNumber(storesOwed)} tone="info" />
            <MetricCard icon={Banknote} label="إجمالي بانتظار التحويل" value={balanceTotalUnpaid === null ? "—" : formatCurrency(balanceTotalUnpaid)} tone="success" />
          </div>

          <nav aria-label="أقسام المالية" className="grid grid-cols-1 gap-2 rounded-2xl border border-border bg-surface p-2 shadow-sm sm:grid-cols-3">
            {([ ["overview", "مستحقات المتاجر", Wallet], ["payouts", "سجل التحويلات", ArrowLeftRight], ["settlements", "مستحقات الطلبات", Receipt] ] as const).map(([view, label, Icon]) => (
              <button key={view} type="button" aria-pressed={activeView === view} onClick={() => setActiveView(view)} className={`flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-extrabold transition ${activeView === view ? "bg-primary text-icon shadow-sm" : "text-text-secondary hover:bg-field-bg hover:text-heading"}`}><Icon className="size-4" />{label}</button>
            ))}
          </nav>

          <Card className={activeView === "overview" ? "overflow-hidden" : "hidden"}>
            <CardHeader title="نسبة العمولة" action={<span className="rounded-full bg-primary-soft px-3 py-1 text-xs font-extrabold text-primary">طلبات جديدة فقط</span>} />
            <CardBody className="gap-4">
              {sectionErrors.commission && <ErrorBanner message={`تعذر تحميل العمولة: ${sectionErrors.commission}`} onRetry={() => setRefreshKey((key) => key + 1)} />}
              <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
                <div>
                  <p className="max-w-2xl text-sm leading-6 text-text-secondary">تُحسب العمولة على الطلبات التي تُنشأ بعد حفظ النسبة. الطلبات السابقة ومتاجر النسبة الخاصة لا تتأثر.</p>
                  <div className="mt-4 flex flex-wrap items-end gap-4">
                    <label className="flex flex-col gap-2 text-sm font-bold text-heading">
                      <span>النسبة الافتراضية</span>
                      <span className="flex items-center gap-2">
                        <input
                          aria-label="نسبة العمولة الافتراضية"
                          type="number"
                          min="0"
                          max="100"
                          step="0.01"
                          value={commissionInput}
                          onChange={(event) => setCommissionInput(event.target.value)}
                          className="w-36 rounded-xl border border-border bg-app-bg px-3 py-2.5 text-heading outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
                        />
                        <span className="font-extrabold text-text-secondary">%</span>
                      </span>
                    </label>
                    <Button onClick={saveCommission} disabled={commission === null || busy === "commission" || Number(commissionInput) === commission} icon={<Check className="size-4" />}>
                      {busy === "commission" ? "جارٍ الحفظ…" : "حفظ النسبة"}
                    </Button>
                  </div>
                </div>
                <div className="flex items-center gap-3 rounded-2xl bg-field-bg px-4 py-3">
                  <span className="grid size-10 place-items-center rounded-xl bg-surface text-primary"><Percent className="size-5" /></span>
                  <span><span className="block text-xs font-bold text-text-secondary">متاجر بمعدل خاص</span><strong className="mt-0.5 block text-lg text-heading">{customStoresCount === null ? "—" : formatNumber(customStoresCount)}</strong></span>
                </div>
              </div>
            </CardBody>
          </Card>

          <Card className={activeView === "overview" ? "overflow-hidden" : "hidden"}>
            <CardHeader title="المبالغ المستحقة للمتاجر" action={<span className="rounded-full bg-info-soft px-3 py-1 text-xs font-extrabold text-info">مرتبة حسب الأعلى</span>} />
            <CardBody className="gap-4">
              <div className="flex gap-3 rounded-2xl border border-info/15 bg-info-soft/60 px-4 py-3 text-sm leading-6 text-heading">
                <Info className="mt-1 size-4 shrink-0 text-info" />
                <p>الطلبات المغلقة تزيد مستحقات المتجر. التحويل يتم خارج اللوحة؛ بعد ما تحوّلي المبلغ، سجّليه هنا ليظهر بالسجل ويصل إشعار للمتجر.</p>
              </div>
              {sectionErrors.balances && <ErrorBanner message={`تعذر تحميل الأرصدة: ${sectionErrors.balances}`} onRetry={() => setRefreshKey((key) => key + 1)} />}
              {sortedBalances.length === 0 && !sectionErrors.balances ? <p className="py-6 text-center text-sm text-text-secondary">لا توجد مستحقات متاحة حالياً.</p> : sortedBalances.length > 0 ? (
                <TableShell minWidth="min-w-[700px]">
                  <Thead columns={["المتجر", "بانتظار التحويل", "طريقة الاستلام", "الإجراء"]} />
                  <tbody className="divide-y divide-border/70">
                    {sortedBalances.map((store) => (
                      <tr key={store.storeId}>
                        <Td className="font-bold text-heading">{store.storeName || `متجر #${store.storeId}`}</Td>
                        <Td className="font-extrabold text-heading">{money(store.outstanding)}</Td>
                        <Td className="text-xs text-text-secondary">{store.payoutAccount ? accountSummary(store.payoutAccount) : <span className="inline-flex items-center gap-1.5 text-warning"><CircleAlert className="size-3.5" />لم يضف المتجر وسيلة استلام</span>}</Td>
                        <Td><Button size="sm" disabled={value(store.outstanding) === null || (value(store.outstanding) ?? 0) <= 0 || busy === `payout-${store.storeId}`} onClick={() => setPayoutTarget(store)} icon={<ArrowLeftRight className="size-4" />}>{busy === `payout-${store.storeId}` ? "جارٍ التسجيل…" : "تسجيل التحويل"}</Button></Td>
                      </tr>
                    ))}
                  </tbody>
                </TableShell>
              ) : null}
            </CardBody>
          </Card>

          <Card className={activeView === "payouts" ? "overflow-hidden" : "hidden"}>
            <CardHeader title="سجل التحويلات" action={<select aria-label="فلتر حالة التحويل" value={payoutStatus} onChange={(event) => { setPayoutPage(1); setPayoutStatus(event.target.value as typeof payoutStatus); }} className="rounded-xl border border-border bg-app-bg px-3 py-2 text-sm font-bold text-heading outline-none focus:border-primary"><option value="all">كل التحويلات</option><option value="current">سارية</option><option value="voided">ملغاة</option></select>} />
            <CardBody>
              {sectionErrors.payouts && <ErrorBanner message={`تعذر تحميل سجل الدفعات: ${sectionErrors.payouts}`} onRetry={() => setRefreshKey((key) => key + 1)} />}
              {payouts.length === 0 && !sectionErrors.payouts ? <p className="py-6 text-center text-sm text-text-secondary">لا توجد دفعات مطابقة.</p> : payouts.length > 0 ? (
                <TableShell minWidth="min-w-[760px]">
                  <Thead columns={["رقم الدفعة", "المتجر", "المبلغ", "التاريخ", "الحالة", "الإجراءات"]} />
                  <tbody className="divide-y divide-border/70">
                    {payouts.map((payout) => (
                      <tr key={payout.id}>
                        <Td className="font-bold text-heading">#{payout.id}</Td>
                        <Td>{payout.storeName ?? `متجر #${payout.storeId}`}</Td>
                        <Td>{money(payout.amount)}</Td>
                        <Td>{formatDateTime(payout.createdAt)}</Td>
                        <Td><span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-extrabold ${isVoided(payout.status) ? "bg-danger-soft text-danger" : "bg-success-soft text-success"}`}>{isVoided(payout.status) ? "ملغى" : "تم التحويل"}</span></Td>
                        <Td><div className="flex flex-wrap gap-2"><Button size="sm" variant="secondary" onClick={() => void showPayoutDetail(payout.id)} disabled={detailLoading}>{detailLoading ? "جارٍ التحميل…" : "عرض التفاصيل"}</Button>{!isVoided(payout.status) && <Button size="sm" variant="danger" onClick={() => { setVoidTarget(payout.id); setVoidReason(""); }}>إلغاء التحويل</Button>}</div></Td>
                      </tr>
                    ))}
                  </tbody>
                </TableShell>
              ) : null}
              {payoutPagination && <Pagination pagination={payoutPagination} disabled={loading} onChange={setPayoutPage} />}
            </CardBody>
          </Card>

          <Card className={activeView === "settlements" ? "overflow-hidden" : "hidden"}>
            <CardHeader title="مستحقات كل طلب" action={<select aria-label="فلتر حالة تحويل الطلب" value={paidFilter} onChange={(event) => { setSettlementPage(1); setPaidFilter(event.target.value as PaidFilter); }} className="rounded-xl border border-border bg-app-bg px-3 py-2 text-sm font-bold text-heading outline-none focus:border-primary"><option value="all">كل الطلبات</option><option value="paid">تم تحويلها</option><option value="unpaid">بانتظار التحويل</option></select>} />
            <CardBody>
              {sectionErrors.settlements && <ErrorBanner message={`تعذر تحميل التسويات: ${sectionErrors.settlements}`} onRetry={() => setRefreshKey((key) => key + 1)} />}
              {settlements.length === 0 && !sectionErrors.settlements ? <p className="py-6 text-center text-sm text-text-secondary">لا توجد تسويات مطابقة.</p> : settlements.length > 0 ? (
                <TableShell minWidth="min-w-[680px]">
                  <Thead columns={["الطلب", "المتجر", "المستحق", "تاريخ الإغلاق", "التحويل"]} />
                  <tbody className="divide-y divide-border/70">
                    {settlements.map((settlement) => (
                      <tr key={settlement.id}>
                        <Td className="font-bold text-heading">#{settlement.orderId}</Td>
                        <Td>{settlement.storeName || `متجر #${settlement.storeId}`}</Td>
                        <Td className="font-bold text-heading">{money(settlement.amount)}</Td>
                        <Td>{formatDateTime(settlement.createdAt)}</Td>
                        <Td><span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-extrabold ${settlement.paid ? "bg-success-soft text-success" : "bg-warning-soft text-warning"}`}>{settlement.paid ? "تم التحويل" : "بانتظار التحويل"}</span></Td>
                      </tr>
                    ))}
                  </tbody>
                </TableShell>
              ) : null}
              {settlementPagination && <Pagination pagination={settlementPagination} disabled={loading} onChange={setSettlementPage} />}
            </CardBody>
          </Card>
        </>
      )}

      {payoutTarget && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-heading/45 p-4 backdrop-blur-sm" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && busy !== `payout-${payoutTarget.storeId}`) setPayoutTarget(null); }}>
          <section role="dialog" aria-modal="true" aria-labelledby="record-payout-title" className="w-full max-w-md rounded-3xl border border-border bg-surface p-6 shadow-2xl">
            <div className="mb-5 flex items-start gap-3"><span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-success-soft text-success"><ArrowLeftRight className="size-5" /></span><div><h2 id="record-payout-title" className="text-lg font-extrabold text-heading">تسجيل تحويل للمتجر</h2><p className="mt-1 text-sm text-text-secondary">راجعي المعلومات قبل تسجيله</p></div></div>
            <dl className="mb-4 grid grid-cols-2 gap-3 rounded-2xl bg-app-bg p-4 text-sm"><div><dt className="text-text-secondary">المتجر</dt><dd className="mt-1 font-extrabold text-heading">{payoutTarget.storeName}</dd></div><div><dt className="text-text-secondary">المبلغ المستحق</dt><dd className="mt-1 font-extrabold text-heading">{money(payoutTarget.outstanding)}</dd></div></dl>
            <div className="mb-5 flex gap-2 rounded-2xl border border-warning/20 bg-warning-soft/70 p-3 text-sm leading-6 text-warning"><Info className="mt-1 size-4 shrink-0" /><p>التسجيل لا يحوّل المال. كمّلي التحويل خارج اللوحة أولاً. عند التأكيد سيُسجّل الخادم الدفعة ويرسل إشعاراً للمتجر.</p></div>
            {!payoutTarget.payoutAccount && <p className="mb-4 text-xs leading-5 text-text-secondary">ما في طريقة استلام محفوظة لهذا المتجر. إذا حوّلتِ له بطريقة أخرى، تقدري تسجّلي التحويل بعد التأكد.</p>}
            <div className="flex justify-end gap-2"><Button variant="secondary" onClick={() => setPayoutTarget(null)} disabled={busy === `payout-${payoutTarget.storeId}`}>رجوع</Button><Button onClick={() => void confirmPayout()} disabled={busy === `payout-${payoutTarget.storeId}`} icon={<Check className="size-4" />}>{busy === `payout-${payoutTarget.storeId}` ? "جارٍ التسجيل…" : "تم التحويل، سجّله"}</Button></div>
          </section>
        </div>
      )}

      {voidTarget !== null && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-heading/45 p-4 backdrop-blur-sm" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && busy !== `void-${voidTarget}`) setVoidTarget(null); }}>
          <section role="dialog" aria-modal="true" aria-labelledby="void-payout-title" className="w-full max-w-md rounded-3xl border border-border bg-surface p-6 shadow-2xl">
            <div className="mb-4 flex items-start gap-3"><span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-danger-soft text-danger"><AlertTriangle className="size-5" /></span><div><h2 id="void-payout-title" className="text-lg font-extrabold text-heading">إلغاء التحويل #{voidTarget}</h2><p className="mt-1 text-sm text-text-secondary">لا يُحذف السجل؛ ترجع الطلبات للمستحقات غير المدفوعة.</p></div></div>
            <label className="mb-2 block text-sm font-bold text-heading" htmlFor="void-reason">سبب الإلغاء</label>
            <textarea id="void-reason" value={voidReason} onChange={(event) => setVoidReason(event.target.value)} maxLength={500} rows={3} className="w-full rounded-xl border border-border bg-app-bg p-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15" placeholder="اكتبي السبب (3 أحرف على الأقل)" />
            <div className="mt-5 flex justify-end gap-2"><Button variant="secondary" onClick={() => setVoidTarget(null)} disabled={busy === `void-${voidTarget}`}>رجوع</Button><Button variant="danger" onClick={() => void confirmVoid()} disabled={voidReason.trim().length < 3 || busy === `void-${voidTarget}`} icon={<Check className="size-4" />}>{busy === `void-${voidTarget}` ? "جارٍ الإلغاء…" : "تأكيد الإلغاء"}</Button></div>
          </section>
        </div>
      )}

      {payoutDetail && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setPayoutDetail(null); }}>
          <section role="dialog" aria-modal="true" aria-labelledby="payout-detail-title" className="w-full max-w-lg rounded-3xl border border-border bg-surface p-6 shadow-2xl">
            <div className="mb-5 flex items-center justify-between gap-4"><div><p className="text-xs font-bold text-text-secondary">معلومات التحويل</p><h2 id="payout-detail-title" className="mt-1 text-lg font-extrabold text-heading">تحويل رقم #{payoutDetail.id}</h2></div><button type="button" aria-label="إغلاق التفاصيل" onClick={() => setPayoutDetail(null)} className="grid size-9 place-items-center rounded-xl bg-field-bg text-text-secondary transition hover:text-heading"><X className="size-4" /></button></div>
            <dl className="grid grid-cols-2 gap-3 rounded-2xl bg-app-bg p-4 text-sm"><div><dt className="text-text-secondary">المتجر</dt><dd className="mt-1 font-bold">{payoutDetail.storeName ?? `متجر #${payoutDetail.storeId}`}</dd></div><div><dt className="text-text-secondary">المبلغ</dt><dd className="mt-1 font-bold">{money(payoutDetail.amount)}</dd></div><div><dt className="text-text-secondary">التاريخ</dt><dd className="mt-1 font-bold">{formatDateTime(payoutDetail.createdAt)}</dd></div><div><dt className="text-text-secondary">الحالة</dt><dd className="mt-1 font-bold">{isVoided(payoutDetail.status) ? "ملغى" : "تم التحويل"}</dd></div></dl>
            {payoutDetail.orderIds && <div className="mt-5"><h3 className="mb-2 text-sm font-extrabold">الطلبات المشمولة ({formatNumber(payoutDetail.orderIds.length)})</h3><p className="break-words text-sm text-text-secondary">{payoutDetail.orderIds.length ? payoutDetail.orderIds.map((id) => `#${id}`).join("، ") : "لا توجد طلبات مرتبطة."}</p></div>}
            {payoutDetail.reason && <p className="mt-4 rounded-xl bg-field-bg p-3 text-sm">سبب الإلغاء: {payoutDetail.reason}</p>}
          </section>
        </div>
      )}

    </div>
  );
}

function accountSummary(account: Record<string, unknown>) {
  const method = typeof account.method === "string" ? account.method : "حساب";
  const accountNumber = typeof account.accountNumber === "string" ? account.accountNumber : "";
  const phone = typeof account.walletPhone === "string" ? account.walletPhone : "";
  const detail = maskAccount(accountNumber || phone);
  return detail ? `${method} · ${detail}` : method;
}

function maskAccount(value: string) {
  const visible = value.slice(-4);
  return value.length > 4 ? `•••• ${visible}` : value;
}

function MetricCard({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  tone: "primary" | "info" | "success";
}) {
  const toneClass = tone === "primary"
    ? "bg-primary-soft text-primary"
    : tone === "info"
      ? "bg-info-soft text-info"
      : "bg-success-soft text-success";
  return (
    <Card className="overflow-hidden">
      <CardBody className="flex items-center gap-4 p-4 sm:p-5">
        <span className={`grid size-12 shrink-0 place-items-center rounded-2xl ${toneClass}`}><Icon className="size-5" /></span>
        <span className="min-w-0"><span className="block text-xs font-bold text-text-secondary">{label}</span><strong className="mt-1 block truncate text-xl font-extrabold text-heading sm:text-2xl">{value}</strong></span>
      </CardBody>
    </Card>
  );
}

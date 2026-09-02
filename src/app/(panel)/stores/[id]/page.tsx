"use client";

import { useCallback, useEffect, useState, use } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Ban,
  Calendar,
  Check,
  CircleCheck,
  CreditCard,
  DollarSign,
  ExternalLink,
  Mail,
  MapPin,
  Package,
  Phone,
  Power,
  PowerOff,
  RotateCcw,
  ShieldCheck,
  ShieldOff,
  ShoppingBag,
  Star,
  StarOff,
  Store as StoreIcon,
  Tag,
  TriangleAlert,
  User,
} from "lucide-react";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import ReasonDialog from "@/components/ui/ReasonDialog";
import EmptyState from "@/components/ui/EmptyState";
import ErrorBanner from "@/components/ui/ErrorBanner";
import Spinner from "@/components/ui/Spinner";
import InfoGrid from "@/components/admin/InfoGrid";
import StatusBadge from "@/components/admin/StatusBadge";
import StoreOrdersSection from "@/components/admin/StoreOrdersSection";
import {
  activateStore,
  activateUser,
  approveStore,
  featureStore,
  fetchStore,
  rejectStore,
  suspendStore,
  suspendUser,
  unfeatureStore,
} from "@/lib/admin/api";
import { accountStatus, STORE_STATUS } from "@/lib/admin/status";
import type { AdminStoreDetail, StoreOwner } from "@/lib/admin/types";
import { classifyStatus } from "@/lib/apiFailure";
import { formatCurrency, formatDate, formatNumber } from "@/lib/format";
import { isBrokenText, textOrNull } from "@/lib/brokenText";
import { useFlash } from "@/lib/useFlash";
import { t } from "@/lib/strings";

type Dialog =
  | "approve"
  | "reject"
  | "rereview"
  | "suspend"
  | "activate"
  | "feature"
  | "unfeature"
  | null;

type ActiveSection = "info" | "orders";

export default function AdminStoreDetailPage({
  params: paramsPromise,
}: {
  params?: Promise<{ id: string }>;
} = {}) {
  const router = useRouter();
  const routeParams = useParams<{ id: string }>();

  let rawId: string | undefined = Array.isArray(routeParams?.id)
    ? routeParams.id[0]
    : routeParams?.id;

  if (!rawId && paramsPromise) {
    try {
      const resolved = use(paramsPromise);
      rawId = Array.isArray(resolved?.id) ? resolved.id[0] : resolved?.id;
    } catch {
      // fallback
    }
  }

  const storeId = rawId ? Number(rawId) : NaN;

  const [store, setStore] = useState<AdminStoreDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [activeSection, setActiveSection] = useState<ActiveSection>("info");

  const [dialog, setDialog] = useState<Dialog>(null);
  const [busy, setBusy] = useState(false);
  const [reasonError, setReasonError] = useState<string>();
  const [flash, showFlash] = useFlash();

  useEffect(() => {
    if (!storeId || Number.isNaN(storeId) || storeId <= 0) {
      return;
    }

    let cancelled = false;
    setLoading(true);
    setNotFound(false);
    setError("");

    (async () => {
      const res = await fetchStore(storeId);
      if (cancelled) return;

      setLoading(false);

      if (res.success && res.store) {
        const isRejected = res.store.status === "REJECTED";
        const normalizedStore: AdminStoreDetail = {
          ...res.store,
          isActive: isRejected ? false : res.store.isActive,
          owner: res.store.owner
            ? {
                ...res.store.owner,
                isActive: isRejected ? false : res.store.owner.isActive,
              }
            : ({
                id: 0,
                name: "",
                email: "",
                phone: null,
                emailVerified: false,
                isActive: false,
                createdAt: "",
              } as StoreOwner),
          categories: Array.isArray(res.store.categories)
            ? res.store.categories
            : [],
        };
        setStore(normalizedStore);
        setNotFound(false);
        setError("");
        return;
      }

      const failure = classifyStatus(res);
      if (failure.kind === "notFound" || failure.kind === "noStore") {
        setNotFound(true);
        return;
      }
      setError(
        failure.kind === "unauthorized"
          ? t.admin.common.sessionInvalid
          : failure.message,
      );
    })();

    return () => {
      cancelled = true;
    };
  }, [storeId, attempt]);

  const handleApprove = useCallback(
    async (successMsg: string) => {
      setBusy(true);
      setError("");

      const res = await approveStore(storeId);
      if (!res.success) {
        setBusy(false);
        setDialog(null);
        const failure = classifyStatus(res);
        setError(
          failure.kind === "unauthorized"
            ? t.admin.common.sessionInvalid
            : failure.message,
        );
        return;
      }

      if (store?.owner?.id) {
        await activateUser(store.owner.id);
      }

      const updatedStore: AdminStoreDetail = res.store
        ? {
            ...res.store,
            isActive: true,
            owner: {
              ...res.store.owner,
              isActive: true,
            },
          }
        : {
            ...store!,
            status: "APPROVED",
            isActive: true,
            rejectionReason: null,
            owner: {
              ...store!.owner,
              isActive: true,
            },
          };

      setStore(updatedStore);
      setBusy(false);
      setDialog(null);
      showFlash(successMsg);
    },
    [storeId, store, showFlash],
  );

  const handleReject = useCallback(
    async (reason: string) => {
      setBusy(true);
      setError("");
      setReasonError(undefined);

      const res = await rejectStore(storeId, reason);
      if (!res.success) {
        setBusy(false);
        const failure = classifyStatus(res);
        if (failure.kind === "validation" && failure.errors?.reason) {
          setReasonError(failure.errors.reason);
          return;
        }
        setDialog(null);
        setError(
          failure.kind === "unauthorized"
            ? t.admin.common.sessionInvalid
            : failure.message,
        );
        return;
      }

      if (store?.owner?.id) {
        await suspendUser(store.owner.id);
      }

      const updatedStore: AdminStoreDetail = res.store
        ? {
            ...res.store,
            status: "REJECTED",
            isActive: false,
            rejectionReason: reason,
            owner: {
              ...res.store.owner,
              isActive: false,
            },
          }
        : {
            ...store!,
            status: "REJECTED",
            isActive: false,
            rejectionReason: reason,
            owner: {
              ...store!.owner,
              isActive: false,
            },
          };

      setStore(updatedStore);
      setBusy(false);
      setDialog(null);
      showFlash(t.admin.stores.didReject);
    },
    [storeId, store, showFlash],
  );

  const handleSuspendStore = useCallback(async () => {
    setBusy(true);
    setError("");

    const res = await suspendStore(storeId);
    if (!res.success) {
      setBusy(false);
      setDialog(null);
      const failure = classifyStatus(res);
      setError(
        failure.kind === "unauthorized"
          ? t.admin.common.sessionInvalid
          : failure.message,
      );
      return;
    }

    setStore((prev) => (prev ? { ...prev, isActive: false } : null));
    setBusy(false);
    setDialog(null);
    showFlash(t.admin.stores.didSuspend);
  }, [storeId, showFlash]);

  const handleActivateStore = useCallback(async () => {
    setBusy(true);
    setError("");

    const res = await activateStore(storeId);
    if (!res.success) {
      setBusy(false);
      setDialog(null);
      const failure = classifyStatus(res);
      setError(
        failure.kind === "unauthorized"
          ? t.admin.common.sessionInvalid
          : failure.message,
      );
      return;
    }

    setStore((prev) => (prev ? { ...prev, isActive: true } : null));
    setBusy(false);
    setDialog(null);
    showFlash(t.admin.stores.didActivate);
  }, [storeId, showFlash]);

  const handleFeatureStore = useCallback(async () => {
    setBusy(true);
    setError("");

    const res = await featureStore(storeId);
    if (!res.success) {
      setBusy(false);
      setDialog(null);
      const failure = classifyStatus(res);
      setError(
        failure.kind === "unauthorized"
          ? t.admin.common.sessionInvalid
          : failure.message,
      );
      return;
    }

    setStore((prev) => (prev ? { ...prev, isFeatured: true } : null));
    setBusy(false);
    setDialog(null);
    showFlash(t.admin.stores.didFeature);
  }, [storeId, showFlash]);

  const handleUnfeatureStore = useCallback(async () => {
    setBusy(true);
    setError("");

    const res = await unfeatureStore(storeId);
    if (!res.success) {
      setBusy(false);
      setDialog(null);
      const failure = classifyStatus(res);
      setError(
        failure.kind === "unauthorized"
          ? t.admin.common.sessionInvalid
          : failure.message,
      );
      return;
    }

    setStore((prev) =>
      prev ? { ...prev, isFeatured: false, featuredOrder: null } : null,
    );
    setBusy(false);
    setDialog(null);
    showFlash(t.admin.stores.didUnfeature);
  }, [storeId, showFlash]);

  if (loading) return <Spinner />;

  if (notFound) {
    return (
      <Card className="overflow-hidden border border-border shadow-xs">
        <CardBody className="p-8">
          <EmptyState
            icon={StoreIcon}
            title={t.admin.common.notFound}
            hint={t.admin.common.notFoundHint}
            action={
              <Button size="lg" onClick={() => router.push("/stores")}>
                {t.admin.common.backToList}
              </Button>
            }
          />
        </CardBody>
      </Card>
    );
  }

  if (!store) {
    return (
      <ErrorBanner
        message={error || t.admin.common.loadFailed}
        onRetry={() => {
          setLoading(true);
          setAttempt((a) => a + 1);
        }}
      />
    );
  }

  const broken =
    isBrokenText(store.name) ||
    isBrokenText(store.city) ||
    isBrokenText(store.owner?.name) ||
    isBrokenText(store.description) ||
    isBrokenText(store.address);

  const displayName = isBrokenText(store.name)
    ? `${t.admin.stores.brokenName}${store.id}`
    : store.name;

  return (
    <div className="flex flex-col gap-6">
      {/* Top Breadcrumb & Flash Notification */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-sm text-text-secondary">
          <button
            type="button"
            onClick={() => router.push("/stores")}
            className="font-bold transition hover:text-heading"
          >
            {t.admin.stores.title}
          </button>
          <span>/</span>
          <span className="font-bold text-heading">{displayName}</span>
        </div>

        <div className="flex items-center gap-3">
          {flash && (
            <span
              role="status"
              className="flex items-center gap-1.5 rounded-xl bg-success-soft px-3 py-1.5 text-xs font-bold text-success shadow-xs"
            >
              <Check className="size-4" aria-hidden="true" />
              {flash}
            </span>
          )}
          <Button
            variant="secondary"
            onClick={() => router.push("/stores")}
            icon={<ArrowLeft className="size-4 rtl:rotate-180" aria-hidden="true" />}
          >
            {t.admin.common.backToList}
          </Button>
        </div>
      </div>

      <ErrorBanner message={error} />

      {/* ⚠️ Broken Encoding Warning Banner */}
      {broken && (
        <Card className="border-warning/20 bg-warning-soft/40">
          <CardBody className="space-y-1">
            <p className="flex items-center gap-2 text-sm font-extrabold text-warning">
              <TriangleAlert className="size-4" aria-hidden="true" />
              {t.admin.stores.brokenTitle}
            </p>
            <p className="text-sm text-heading">{t.admin.stores.brokenBody}</p>
          </CardBody>
        </Card>
      )}

      {/* 🌟 Redesigned Store Hero Card */}
      <Card className="overflow-hidden border border-border shadow-xs">
        {/* Subtle cover gradient header */}
        <div className="h-28 w-full bg-linear-to-r from-primary/15 via-primary/5 to-field-bg" />

        <div className="relative px-6 pb-6 pt-0">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            {/* Logo + Identity Info */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              {/* Store Avatar Logo */}
              <div className="-mt-12 grid size-24 shrink-0 place-items-center overflow-hidden rounded-2xl border-4 border-surface bg-surface shadow-md">
                {store.logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={store.logoUrl}
                    alt={store.name}
                    className="size-full object-cover"
                  />
                ) : (
                  <div className="grid size-full place-items-center bg-primary/10 text-primary">
                    <StoreIcon className="size-10" />
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <div className="flex flex-wrap items-center gap-2.5">
                  <h1 className="text-2xl font-black text-heading">
                    {displayName}
                  </h1>
                  <span className="ltr-nums rounded-lg bg-field-bg px-2.5 py-0.5 text-xs font-extrabold text-text-secondary">
                    #{store.id}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2 text-xs text-text-secondary">
                  {store.city && (
                    <span className="flex items-center gap-1 font-bold">
                      <MapPin className="size-3.5 text-primary" />
                      {store.city}
                    </span>
                  )}
                  {store.categories && store.categories.length > 0 && (
                    <span className="flex items-center gap-1">
                      <Tag className="size-3.5" />
                      {store.categories.map((c) => c.name).join("، ")}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Action Buttons in Hero */}
            <div className="flex flex-wrap items-center gap-2">
              {store.status === "PENDING" && (
                <>
                  <Button
                    disabled={busy}
                    onClick={() => setDialog("approve")}
                    icon={<CircleCheck className="size-4" aria-hidden="true" />}
                  >
                    {t.admin.stores.approve}
                  </Button>

                  <Button
                    variant="danger"
                    disabled={busy}
                    onClick={() => setDialog("reject")}
                    icon={<Ban className="size-4" aria-hidden="true" />}
                  >
                    {t.admin.stores.reject}
                  </Button>
                </>
              )}

              {store.status === "APPROVED" && (
                <>
                  {store.isFeatured ? (
                    <Button
                      variant="secondary"
                      disabled={busy}
                      onClick={() => setDialog("unfeature")}
                      icon={<StarOff className="size-4" aria-hidden="true" />}
                    >
                      {t.admin.stores.unfeature}
                    </Button>
                  ) : (
                    <Button
                      variant="secondary"
                      disabled={busy}
                      onClick={() => setDialog("feature")}
                      icon={<Star className="size-4" aria-hidden="true" />}
                    >
                      {t.admin.stores.feature}
                    </Button>
                  )}

                  {store.isActive ? (
                    <Button
                      variant="danger"
                      disabled={busy}
                      onClick={() => setDialog("suspend")}
                      icon={<PowerOff className="size-4" aria-hidden="true" />}
                    >
                      {t.admin.stores.suspend}
                    </Button>
                  ) : (
                    <Button
                      disabled={busy}
                      onClick={() => setDialog("activate")}
                      icon={<Power className="size-4" aria-hidden="true" />}
                    >
                      {t.admin.stores.activate}
                    </Button>
                  )}

                  <Button
                    variant="danger"
                    disabled={busy}
                    onClick={() => setDialog("reject")}
                    icon={<Ban className="size-4" aria-hidden="true" />}
                  >
                    {t.admin.stores.reject}
                  </Button>
                </>
              )}

              {store.status === "REJECTED" && (
                <Button
                  disabled={busy}
                  onClick={() => setDialog("rereview")}
                  icon={<RotateCcw className="size-4" aria-hidden="true" />}
                >
                  {t.admin.stores.reReview}
                </Button>
              )}
            </div>
          </div>

          {/* Badges Bar */}
          <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-border/60 pt-4">
            <StatusBadge meta={STORE_STATUS[store.status]} />
            {store.status === "APPROVED" && (
              <StatusBadge meta={accountStatus(store.isActive)} />
            )}
            {store.status === "REJECTED" && (
              <StatusBadge meta={accountStatus(false)} />
            )}
            {store.isFeatured && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-warning/25 bg-warning-soft px-3 py-1 text-xs font-extrabold text-warning">
                <Star className="size-3.5 fill-warning text-warning" aria-hidden="true" />
                <span>{t.admin.stores.featuredBadge}</span>
              </span>
            )}
            <Badge tone={store.owner.emailVerified ? "success" : "warning"}>
              {store.owner.emailVerified
                ? t.admin.users.emailVerified
                : t.admin.users.emailNotVerified}
            </Badge>
          </div>
        </div>
      </Card>

      {/* 🔴 Rejection Info if Rejected */}
      {store.status === "REJECTED" && store.rejectionReason && (
        <Card className="border-danger/20 bg-danger-soft/40 shadow-xs">
          <CardBody className="space-y-2 p-5">
            <p className="flex items-center gap-2 text-sm font-extrabold text-danger">
              <ShieldOff className="size-4" aria-hidden="true" />
              {t.admin.stores.rejectionInfo}
            </p>
            <p className="text-sm font-medium text-heading">{store.rejectionReason}</p>
            {store.reviewedAt && (
              <p className="ltr-nums text-xs text-text-secondary">
                {formatDate(store.reviewedAt)}
                {store.reviewedBy?.name
                  ? ` · ${t.admin.common.by} ${store.reviewedBy.name}`
                  : ""}
              </p>
            )}
          </CardBody>
        </Card>
      )}

      {/* 📊 4 Modern KPI Metrics Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border border-border/80 p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-xs font-extrabold text-text-secondary">
                {t.admin.stores.revenue}
              </span>
              <span className="ltr-nums mt-1 text-xl font-black text-heading">
                {formatCurrency(Number(store.revenue))}
              </span>
            </div>
            <span className="grid size-11 place-items-center rounded-2xl bg-success-soft text-success">
              <DollarSign className="size-5" />
            </span>
          </div>
        </Card>

        <Card className="border border-border/80 p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-xs font-extrabold text-text-secondary">
                {t.admin.stores.colOrders}
              </span>
              <span className="ltr-nums mt-1 text-xl font-black text-heading">
                {formatNumber(store.ordersCount)} {t.admin.stores.ordersUnit}
              </span>
            </div>
            <span className="grid size-11 place-items-center rounded-2xl bg-primary-soft text-primary">
              <ShoppingBag className="size-5" />
            </span>
          </div>
        </Card>

        <Card className="border border-border/80 p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-xs font-extrabold text-text-secondary">
                {t.admin.stores.colProducts}
              </span>
              <span className="ltr-nums mt-1 text-xl font-black text-heading">
                {formatNumber(store.productsCount)} {t.admin.stores.productsUnit}
              </span>
            </div>
            <span className="grid size-11 place-items-center rounded-2xl bg-info-soft text-info">
              <Package className="size-5" />
            </span>
          </div>
        </Card>

        <Card className="border border-border/80 p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-xs font-extrabold text-text-secondary">
                {t.admin.common.createdAt}
              </span>
              <span className="ltr-nums mt-1 text-sm font-bold text-heading">
                {formatDate(store.createdAt)}
              </span>
            </div>
            <span className="grid size-11 place-items-center rounded-2xl bg-field-bg text-text-secondary">
              <Calendar className="size-5" />
            </span>
          </div>
        </Card>
      </div>

      {/* 🧭 Section Tabs (بيانات المتجر والمالك | طلبات المتجر) */}
      <div className="flex items-center gap-2 border-b border-border pb-3">
        <button
          type="button"
          onClick={() => setActiveSection("info")}
          className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-extrabold transition ${
            activeSection === "info"
              ? "bg-primary text-white shadow-xs"
              : "bg-surface text-text-secondary hover:text-heading"
          }`}
        >
          <StoreIcon className="size-4" />
          <span>{t.admin.stores.tabInfo}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSection("orders")}
          className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-extrabold transition ${
            activeSection === "orders"
              ? "bg-primary text-white shadow-xs"
              : "bg-surface text-text-secondary hover:text-heading"
          }`}
        >
          <ShoppingBag className="size-4" />
          <span>{t.admin.stores.tabOrders}</span>
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-bold ${
              activeSection === "orders"
                ? "bg-white/20 text-white"
                : "bg-field-bg text-text-secondary"
            }`}
          >
            {store.ordersCount}
          </span>
        </button>
      </div>

      {/* 📄 Section 1: Store & Owner Information Grid */}
      {activeSection === "info" && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Store Info */}
          <Card className="border border-border/80 shadow-xs">
            <CardHeader title={t.admin.stores.info} />
            <CardBody>
              <InfoGrid
                rows={[
                  {
                    label: t.admin.stores.description,
                    value: textOrNull(store.description),
                  },
                  { label: t.admin.stores.city, value: textOrNull(store.city) },
                  { label: t.admin.stores.address, value: textOrNull(store.address) },
                  {
                    label: t.admin.stores.phone,
                    value: store.phone && (
                      <span className="ltr-nums">{store.phone}</span>
                    ),
                  },
                  {
                    label: t.admin.stores.categories,
                    value: store.categories?.map((c) => c.name).join("، ") ?? "",
                  },
                  {
                    label: t.admin.stores.reviewedAt,
                    value: store.reviewedAt ? (
                      <span className="ltr-nums">
                        {formatDate(store.reviewedAt)}
                      </span>
                    ) : (
                      t.admin.stores.notReviewed
                    ),
                  },
                  {
                    label: t.admin.stores.reviewedBy,
                    value: store.reviewedBy?.name,
                  },
                  {
                    label: t.admin.common.createdAt,
                    value: (
                      <span className="ltr-nums">
                        {formatDate(store.createdAt)}
                      </span>
                    ),
                  },
                ]}
              />
            </CardBody>
          </Card>

          {/* Owner Info */}
          <Card className="border border-border/80 shadow-xs">
            <CardHeader
              title={t.admin.stores.ownerInfo}
              action={
                store.owner?.id ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => router.push(`/users/${store.owner.id}`)}
                    icon={<ExternalLink className="size-3.5" />}
                  >
                    {t.admin.stores.viewOwner}
                  </Button>
                ) : undefined
              }
            />
            <CardBody>
              <InfoGrid
                rows={[
                  {
                    label: t.admin.users.merchant,
                    value:
                      textOrNull(store.owner?.name) ??
                      (store.owner?.id
                        ? `${t.admin.users.brokenName}${store.owner.id}`
                        : t.admin.common.none),
                  },
                  {
                    label: t.admin.stores.email,
                    value: store.owner?.email ? (
                      <span className="ltr-nums">{store.owner.email}</span>
                    ) : (
                      t.admin.common.none
                    ),
                  },
                  {
                    label: t.admin.stores.phone,
                    value: store.owner?.phone ? (
                      <span className="ltr-nums">{store.owner.phone}</span>
                    ) : (
                      t.admin.common.none
                    ),
                  },
                  {
                    label: t.admin.stores.ownerEmailVerified,
                    value: (
                      <Badge tone={store.owner?.emailVerified ? "success" : "warning"}>
                        {store.owner?.emailVerified
                          ? t.admin.stores.ownerVerified
                          : t.admin.stores.ownerUnverified}
                      </Badge>
                    ),
                  },
                  {
                    label: t.admin.stores.ownerStatus,
                    value: (
                      <StatusBadge
                        meta={accountStatus(
                          store.status === "REJECTED"
                            ? false
                            : (store.owner?.isActive ?? false),
                        )}
                      />
                    ),
                  },
                  {
                    label: t.admin.common.createdAt,
                    value: store.owner?.createdAt ? (
                      <span className="ltr-nums">
                        {formatDate(store.owner.createdAt)}
                      </span>
                    ) : (
                      t.admin.common.none
                    ),
                  },
                ]}
              />
            </CardBody>
          </Card>
        </div>
      )}

      {/* 📦 Section 2: Store Orders Table (Matching User's Provided Image) */}
      {activeSection === "orders" && (
        <StoreOrdersSection storeId={store.id} />
      )}

      {/* Dialogs */}
      <ConfirmDialog
        open={dialog === "approve"}
        tone="primary"
        title={t.admin.stores.approveTitle}
        body={t.admin.stores.approveBody}
        confirmLabel={t.admin.stores.approve}
        loading={busy}
        onConfirm={() => handleApprove(t.admin.stores.didApprove)}
        onCancel={() => setDialog(null)}
      />

      <ReasonDialog
        open={dialog === "reject"}
        title={t.admin.stores.rejectTitle}
        body={t.admin.stores.rejectBody}
        confirmLabel={t.admin.stores.reject}
        loading={busy}
        serverError={reasonError}
        onConfirm={(reason) => handleReject(reason)}
        onCancel={() => setDialog(null)}
      />

      <ConfirmDialog
        open={dialog === "rereview"}
        tone="primary"
        title={t.admin.stores.reReviewTitle}
        body={t.admin.stores.reReviewBody}
        confirmLabel={t.admin.stores.reReview}
        loading={busy}
        onConfirm={() => handleApprove(t.admin.stores.didReactivate)}
        onCancel={() => setDialog(null)}
      />

      <ConfirmDialog
        open={dialog === "suspend"}
        tone="danger"
        title={t.admin.stores.suspendTitle}
        body={t.admin.stores.suspendBody}
        confirmLabel={t.admin.stores.suspend}
        loading={busy}
        onConfirm={handleSuspendStore}
        onCancel={() => setDialog(null)}
      />

      <ConfirmDialog
        open={dialog === "activate"}
        tone="primary"
        title={t.admin.stores.activateTitle}
        body={t.admin.stores.activateBody}
        confirmLabel={t.admin.stores.activate}
        loading={busy}
        onConfirm={handleActivateStore}
        onCancel={() => setDialog(null)}
      />

      <ConfirmDialog
        open={dialog === "feature"}
        tone="primary"
        title={t.admin.stores.feature}
        body="سيظهر المتجر في قسم «المتاجر المميزة» للمستخدمين في التطبيق."
        confirmLabel={t.admin.stores.feature}
        loading={busy}
        onConfirm={handleFeatureStore}
        onCancel={() => setDialog(null)}
      />

      <ConfirmDialog
        open={dialog === "unfeature"}
        tone="danger"
        title={t.admin.stores.unfeature}
        body="سيتم إزالة المتجر من قسم «المتاجر المميزة»."
        confirmLabel={t.admin.stores.unfeature}
        loading={busy}
        onConfirm={handleUnfeatureStore}
        onCancel={() => setDialog(null)}
      />
    </div>
  );
}

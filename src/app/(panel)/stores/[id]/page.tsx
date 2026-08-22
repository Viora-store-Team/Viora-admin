"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  BadgeCheck,
  Ban,
  Check,
  CircleCheck,
  ShieldOff,
  Store as StoreIcon,
} from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
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
import {
  fetchStore,
  reactivateStore,
  suspendStore,
  unverifyStore,
  verifyStore,
} from "@/lib/admin/api";
import { ENTITY_STATUS } from "@/lib/admin/status";
import type { AdminStoreDetail } from "@/lib/admin/types";
import { classifyStatus } from "@/lib/apiFailure";
import type { ApiResponse } from "@/lib/api";
import { formatCurrency, formatDate, formatNumber } from "@/lib/format";
import { useFlash } from "@/lib/useFlash";
import { t } from "@/lib/strings";

/** أي حوار مفتوح حالياً — واحد بس بأي لحظة */
type Dialog = "verify" | "unverify" | "suspend" | "reactivate" | null;

export default function AdminStoreDetailPage() {
  const router = useRouter();
  // قراءة الـ param من العميل — نفس أسلوب صفحة تعديل المنتج
  const storeId = Number(useParams<{ id: string }>().id);

  const [store, setStore] = useState<AdminStoreDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);

  const [dialog, setDialog] = useState<Dialog>(null);
  const [busy, setBusy] = useState(false);
  const [reasonError, setReasonError] = useState<string>();
  const [flash, showFlash] = useFlash();

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const res = await fetchStore(storeId);
      if (cancelled) return;

      setLoading(false);

      if (res.success && res.store) {
        setStore(res.store);
        setNotFound(false);
        setError("");
        return;
      }

      const failure = classifyStatus(res);
      if (failure.kind === "notFound") {
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

  /**
   * منفّذ موحّد لكل الإجراءات.
   *
   * كل رد نجاح بيرجّع المتجر كامل، فبنعيد بذر الحالة منه بدل إعادة جلب —
   * نفس نمط applyProduct بصفحة تعديل المنتج.
   */
  const run = useCallback(
    async (
      call: () => Promise<ApiResponse & { store?: AdminStoreDetail }>,
      success: string,
    ) => {
      setBusy(true);
      setError("");
      setReasonError(undefined);

      const res = await call();
      setBusy(false);

      if (res.success && res.store) {
        setStore(res.store);
        setDialog(null);
        showFlash(success);
        return;
      }

      const failure = classifyStatus(res);

      // خطأ حقل السبب بيضل جوّا الحوار — إغلاقه بيضيّع اللي كتبه المستخدم
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
    },
    [showFlash],
  );

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

  const suspended = store.status === "SUSPENDED";

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={store.name}
        subtitle={t.admin.stores.detailsTitle}
        action={
          <div className="flex flex-wrap items-center gap-3">
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
              icon={
                <ArrowLeft className="size-4 rtl:rotate-180" aria-hidden="true" />
              }
            >
              {t.admin.common.backToList}
            </Button>
          </div>
        }
      />

      <ErrorBanner message={error} />

      {/* شريط الحالة والإجراءات */}
      <Card>
        <CardBody className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge meta={ENTITY_STATUS[store.status]} />
            <Badge tone={store.isVerified ? "info" : "neutral"}>
              <BadgeCheck className="size-3.5" aria-hidden="true" />
              {store.isVerified
                ? t.admin.stores.verified
                : t.admin.stores.unverified}
            </Badge>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              variant={store.isVerified ? "secondary" : "primary"}
              disabled={busy}
              onClick={() => setDialog(store.isVerified ? "unverify" : "verify")}
              icon={<BadgeCheck className="size-4" aria-hidden="true" />}
            >
              {store.isVerified ? t.admin.stores.unverify : t.admin.stores.verify}
            </Button>

            {suspended ? (
              <Button
                disabled={busy}
                onClick={() => setDialog("reactivate")}
                icon={<CircleCheck className="size-4" aria-hidden="true" />}
              >
                {t.admin.stores.reactivate}
              </Button>
            ) : (
              <Button
                variant="danger"
                disabled={busy}
                onClick={() => setDialog("suspend")}
                icon={<Ban className="size-4" aria-hidden="true" />}
              >
                {t.admin.stores.suspend}
              </Button>
            )}
          </div>
        </CardBody>
      </Card>

      {/* سبب الإيقاف — أهم معلومة لما يكون المتجر موقوف */}
      {store.suspension && (
        <Card className="border-danger/20 bg-danger-soft/40">
          <CardBody className="space-y-2">
            <p className="flex items-center gap-2 text-sm font-extrabold text-danger">
              <ShieldOff className="size-4" aria-hidden="true" />
              {t.admin.stores.suspensionInfo}
            </p>
            <p className="text-sm text-heading">{store.suspension.reason}</p>
            <p className="ltr-nums text-xs text-text-secondary">
              {formatDate(store.suspension.at)} · {t.admin.common.by}{" "}
              {store.suspension.by}
            </p>
          </CardBody>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title={t.admin.stores.info} />
          <CardBody>
            <InfoGrid
              rows={[
                { label: t.admin.stores.description, value: store.description },
                { label: t.admin.stores.city, value: store.city },
                { label: t.admin.stores.address, value: store.address },
                {
                  label: t.admin.stores.phone,
                  value: store.phone && (
                    <span className="ltr-nums">{store.phone}</span>
                  ),
                },
                {
                  label: t.admin.stores.categories,
                  value: store.categories.map((c) => c.name).join("، "),
                },
                {
                  label: t.admin.stores.verifiedAt,
                  value: store.verifiedAt && (
                    <span className="ltr-nums">
                      {formatDate(store.verifiedAt)}
                    </span>
                  ),
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

        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader
              title={t.admin.stores.ownerInfo}
              action={
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => router.push(`/users/${store.ownerId}`)}
                >
                  {t.admin.stores.viewOwner}
                </Button>
              }
            />
            <CardBody>
              <InfoGrid
                rows={[
                  { label: t.admin.users.colUser, value: store.owner.name },
                  {
                    label: t.admin.stores.email,
                    value: <span className="ltr-nums">{store.owner.email}</span>,
                  },
                  {
                    label: t.admin.stores.phone,
                    value: store.owner.phone && (
                      <span className="ltr-nums">{store.owner.phone}</span>
                    ),
                  },
                  {
                    /* حالة الحساب مستقلة عن حالة المتجر — لهيك بتنعرض هون كمان */
                    label: t.admin.stores.ownerStatus,
                    value: (
                      <StatusBadge meta={ENTITY_STATUS[store.owner.status]} />
                    ),
                  },
                ]}
              />
            </CardBody>
          </Card>

          <Card>
            <CardHeader title={t.admin.stores.stats} />
            <CardBody>
              <InfoGrid
                rows={[
                  {
                    label: t.admin.stores.colProducts,
                    value: (
                      <span className="ltr-nums">
                        {formatNumber(store.stats.products)}{" "}
                        {t.admin.stores.productsUnit}
                      </span>
                    ),
                  },
                  {
                    label: t.admin.stores.colOrders,
                    value: (
                      <span className="ltr-nums">
                        {formatNumber(store.stats.orders)}{" "}
                        {t.admin.stores.ordersUnit}
                      </span>
                    ),
                  },
                  {
                    label: t.admin.stores.revenue,
                    value: (
                      <span className="ltr-nums">
                        {formatCurrency(Number(store.stats.revenue))}
                      </span>
                    ),
                  },
                  {
                    label: t.admin.stores.rating,
                    value:
                      store.stats.rating === null ? (
                        t.admin.stores.noRating
                      ) : (
                        <span className="ltr-nums">
                          {store.stats.rating} (
                          {formatNumber(store.stats.reviews)}{" "}
                          {t.admin.stores.reviewsUnit})
                        </span>
                      ),
                  },
                ]}
              />
            </CardBody>
          </Card>
        </div>
      </div>

      <ConfirmDialog
        open={dialog === "verify"}
        tone="primary"
        title={t.admin.stores.verifyTitle}
        body={t.admin.stores.verifyBody}
        confirmLabel={t.admin.stores.verify}
        loading={busy}
        onConfirm={() => run(() => verifyStore(storeId), t.admin.stores.didVerify)}
        onCancel={() => setDialog(null)}
      />

      <ConfirmDialog
        open={dialog === "unverify"}
        title={t.admin.stores.unverifyTitle}
        body={t.admin.stores.unverifyBody}
        confirmLabel={t.admin.stores.unverify}
        loading={busy}
        onConfirm={() =>
          run(() => unverifyStore(storeId), t.admin.stores.didUnverify)
        }
        onCancel={() => setDialog(null)}
      />

      <ConfirmDialog
        open={dialog === "reactivate"}
        tone="primary"
        title={t.admin.stores.reactivateTitle}
        body={t.admin.stores.reactivateBody}
        confirmLabel={t.admin.stores.reactivate}
        loading={busy}
        onConfirm={() =>
          run(() => reactivateStore(storeId), t.admin.stores.didReactivate)
        }
        onCancel={() => setDialog(null)}
      />

      {/* الإيقاف بسبب إلزامي — ما في مسار يوصل للسيرفر بلا سبب */}
      <ReasonDialog
        open={dialog === "suspend"}
        title={t.admin.stores.suspendTitle}
        body={t.admin.stores.suspendBody}
        confirmLabel={t.admin.stores.suspend}
        loading={busy}
        serverError={reasonError}
        onConfirm={(reason) =>
          run(() => suspendStore(storeId, reason), t.admin.stores.didSuspend)
        }
        onCancel={() => setDialog(null)}
      />
    </div>
  );
}

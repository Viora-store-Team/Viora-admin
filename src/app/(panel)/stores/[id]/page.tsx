"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Check,
  CircleCheck,
  PowerOff,
  ShieldOff,
  Store as StoreIcon,
  TriangleAlert,
  X,
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
import { approveStore, fetchStore, rejectStore } from "@/lib/admin/api";
import { STORE_STATUS } from "@/lib/admin/status";
import type { AdminStoreDetail } from "@/lib/admin/types";
import { classifyStatus } from "@/lib/apiFailure";
import type { ApiResponse } from "@/lib/api";
import { formatCurrency, formatDate, formatNumber } from "@/lib/format";
import { isBrokenText, textOrNull } from "@/lib/brokenText";
import { useFlash } from "@/lib/useFlash";
import { t } from "@/lib/strings";

/** أي حوار مفتوح حالياً — واحد بس بأي لحظة */
type Dialog = "approve" | "reject" | null;

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
      /*
        رسالة السيرفر «المتجر غير موجود» بتنصنّف `noStore` مش `notFound`،
        لأن classifyStatus بيفحص إذا الرسالة فيها كلمة "متجر" (قاعدة جاية
        من نطاق المنتجات). الحالتين نفس الشي هون: الصفحة غير موجودة.
      */
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

  /**
   * منفّذ موحّد للقبول والرفض.
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

  /*
    الزرّين بيضلّوا ظاهرين بكل الحالات — المسارين بيقبلوا تبديل القرار،
    فمتجر مرفوض ممكن ينقبل والعكس. اللي بينمنع بس هو تكرار نفس القرار.
  */
  const reviewed = store.status !== "PENDING";

  /* الترميز المكسور بيصيب حقول متعددة بنفس الصف، فبنفحصها كلها مرة وحدة
     ونعرض تنبيه واحد فوق بدل ما نكرّر علامة جنب كل حقل. */
  const broken =
    isBrokenText(store.name) ||
    isBrokenText(store.city) ||
    isBrokenText(store.owner.name) ||
    isBrokenText(store.description) ||
    isBrokenText(store.address);

  const displayName = isBrokenText(store.name)
    ? `${t.admin.stores.brokenName}${store.id}`
    : store.name;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={displayName}
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

      {/* ⚠️ تنبيه ترميز — بيوضّح إن الفراغات تحت سببها بيانات تالفة
          بقاعدة البيانات مش حقول ناقصة، وإنها مش قابلة للإصلاح من اللوحة */}
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

      {/* شريط الحالة والقرار */}
      <Card>
        <CardBody className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge meta={STORE_STATUS[store.status]} />
            {/* التوقّف حالة مستقلة عن القرار — ما في مسار بالباك إند يغيّرها */}
            {!store.isActive && (
              <Badge tone="danger">
                <PowerOff className="size-3.5" aria-hidden="true" />
                {t.admin.stores.inactive}
              </Badge>
            )}
            {reviewed && (
              <span className="text-xs text-text-secondary">
                {t.admin.stores.reReviewHint}
              </span>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              disabled={busy || store.status === "APPROVED"}
              onClick={() => setDialog("approve")}
              icon={<CircleCheck className="size-4" aria-hidden="true" />}
            >
              {t.admin.stores.approve}
            </Button>

            <Button
              variant="danger"
              disabled={busy || store.status === "REJECTED"}
              onClick={() => setDialog("reject")}
              icon={<X className="size-4" aria-hidden="true" />}
            >
              {t.admin.stores.reject}
            </Button>
          </div>
        </CardBody>
      </Card>

      {/* سبب الرفض — أهم معلومة لما يكون المتجر مرفوض */}
      {store.status === "REJECTED" && store.rejectionReason && (
        <Card className="border-danger/20 bg-danger-soft/40">
          <CardBody className="space-y-2">
            <p className="flex items-center gap-2 text-sm font-extrabold text-danger">
              <ShieldOff className="size-4" aria-hidden="true" />
              {t.admin.stores.rejectionInfo}
            </p>
            <p className="text-sm text-heading">{store.rejectionReason}</p>
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

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
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
                  value: store.categories.map((c) => c.name).join("، "),
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
                  /* بيضل فاضي بكل الصفوف الحالية — الباك إند ما بيعبّيه لهلق */
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

        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader
              title={t.admin.stores.ownerInfo}
              action={
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => router.push(`/users/${store.owner.id}`)}
                >
                  {t.admin.stores.viewOwner}
                </Button>
              }
            />
            <CardBody>
              <InfoGrid
                rows={[
                  {
                    label: t.admin.users.colUser,
                    value: textOrNull(store.owner.name),
                  },
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
                    /* رد /admin/stores ما فيه `status` للمالك — فيه العلمين
                       دول، وهما اللي بيقرّروا إذا بيقدر يسجّل دخول أصلاً */
                    label: t.admin.stores.ownerEmailVerified,
                    value: (
                      <Badge
                        tone={store.owner.emailVerified ? "success" : "warning"}
                      >
                        {store.owner.emailVerified
                          ? t.admin.stores.ownerVerified
                          : t.admin.stores.ownerUnverified}
                      </Badge>
                    ),
                  },
                  {
                    label: t.admin.stores.ownerStatus,
                    value: (
                      <Badge
                        tone={store.owner.isActive ? "success" : "danger"}
                      >
                        {store.owner.isActive
                          ? t.admin.status.active
                          : t.admin.status.suspended}
                      </Badge>
                    ),
                  },
                ]}
              />
            </CardBody>
          </Card>

          <Card>
            <CardHeader title={t.admin.stores.stats} />
            <CardBody>
              {/* عدّادات مفلطحة على المتجر مباشرة — ما في كائن `stats`،
                  وما في تقييمات بالعقد الحالي أصلاً */}
              <InfoGrid
                rows={[
                  {
                    label: t.admin.stores.colProducts,
                    value: (
                      <span className="ltr-nums">
                        {formatNumber(store.productsCount)}{" "}
                        {t.admin.stores.productsUnit}
                      </span>
                    ),
                  },
                  {
                    label: t.admin.stores.colOrders,
                    value: (
                      <span className="ltr-nums">
                        {formatNumber(store.ordersCount)}{" "}
                        {t.admin.stores.ordersUnit}
                      </span>
                    ),
                  },
                  {
                    label: t.admin.stores.revenue,
                    value: (
                      <span className="ltr-nums">
                        {formatCurrency(Number(store.revenue))}
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
        open={dialog === "approve"}
        tone="primary"
        title={t.admin.stores.approveTitle}
        body={t.admin.stores.approveBody}
        confirmLabel={t.admin.stores.approve}
        loading={busy}
        onConfirm={() =>
          run(() => approveStore(storeId), t.admin.stores.didApprove)
        }
        onCancel={() => setDialog(null)}
      />

      {/* الرفض بسبب — الواجهة بتفرض 10–500 حرف، والسيرفر بيعرض سببه لو رفض */}
      <ReasonDialog
        open={dialog === "reject"}
        title={t.admin.stores.rejectTitle}
        body={t.admin.stores.rejectBody}
        confirmLabel={t.admin.stores.reject}
        loading={busy}
        serverError={reasonError}
        onConfirm={(reason) =>
          run(() => rejectStore(storeId, reason), t.admin.stores.didReject)
        }
        onCancel={() => setDialog(null)}
      />
    </div>
  );
}

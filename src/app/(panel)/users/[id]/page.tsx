"use client";

import { useCallback, useEffect, useState, use } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Ban,
  Check,
  CircleCheck,
  PowerOff,
  UserRound,
} from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import EmptyState from "@/components/ui/EmptyState";
import ErrorBanner from "@/components/ui/ErrorBanner";
import Spinner from "@/components/ui/Spinner";
import InfoGrid from "@/components/admin/InfoGrid";
import StatusBadge from "@/components/admin/StatusBadge";
import { activateUser, fetchUser, suspendUser } from "@/lib/admin/api";
import { accountStatus, ROLE_LABEL, STORE_STATUS } from "@/lib/admin/status";
import type { AdminUserDetail } from "@/lib/admin/types";
import { classifyStatus } from "@/lib/apiFailure";
import type { ApiResponse } from "@/lib/api";
import { textOrNull } from "@/lib/brokenText";
import { formatCurrency, formatDate, formatNumber } from "@/lib/format";
import { useFlash } from "@/lib/useFlash";
import { t } from "@/lib/strings";

type Dialog = "suspend" | "activate" | null;

export default function AdminUserDetailPage({
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

  const userId = rawId ? Number(rawId) : NaN;

  const [user, setUser] = useState<AdminUserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);

  const [dialog, setDialog] = useState<Dialog>(null);
  const [busy, setBusy] = useState(false);
  const [flash, showFlash] = useFlash();

  useEffect(() => {
    if (!userId || Number.isNaN(userId) || userId <= 0) {
      return;
    }

    let cancelled = false;
    setLoading(true);
    setNotFound(false);
    setError("");

    (async () => {
      const res = await fetchUser(userId);
      if (cancelled) return;

      setLoading(false);

      if (res.success && res.user) {
        setUser(res.user);
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
  }, [userId, attempt]);

  /** كل رد نجاح بيرجّع المستخدم كامل، فبنعيد بذر الحالة منه بدل إعادة جلب */
  const run = useCallback(
    async (
      call: () => Promise<ApiResponse & { user?: AdminUserDetail }>,
      success: string,
    ) => {
      setBusy(true);
      setError("");

      const res = await call();
      setBusy(false);
      setDialog(null);

      if (res.success && res.user) {
        setUser(res.user);
        showFlash(success);
        return;
      }

      const failure = classifyStatus(res);
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
            icon={UserRound}
            title={t.admin.common.notFound}
            hint={t.admin.common.notFoundHint}
            action={
              <Button size="lg" onClick={() => router.push("/users")}>
                {t.admin.common.backToList}
              </Button>
            }
          />
        </CardBody>
      </Card>
    );
  }

  if (!user) {
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
    طريقة الدخول — الحسابين مستقلين: ممكن يكون عنده كلمة مرور، أو غوغل،
    أو الاتنين. الحالة الفاضية واردة نظرياً (حساب انربط ثم انفكّ) وبتفيد
    المشرف يفهم ليش المستخدم ما بيقدر يدخل.
  */
  const signInMethod =
    user.hasPassword && user.linkedGoogle
      ? t.admin.users.signInBoth
      : user.hasPassword
        ? t.admin.users.hasPassword
        : user.linkedGoogle
          ? t.admin.users.linkedGoogle
          : t.admin.users.signInNone;

  /* التاجر بياخد `revenue` والزبون `totalSpent` — مفتاح واحد بكل رد */
  const money = user.role === "MERCHANT" ? user.revenue : user.totalSpent;
  const moneyLabel =
    user.role === "MERCHANT" ? t.admin.users.revenue : t.admin.users.totalSpent;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={textOrNull(user.name) ?? `${t.admin.users.brokenName}${user.id}`}
        subtitle={t.admin.users.detailsTitle}
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
              onClick={() => router.push("/users")}
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

      <Card>
        <CardBody className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge meta={accountStatus(user.isActive)} />
            <StatusBadge meta={ROLE_LABEL[user.role]} />
            <Badge tone={user.emailVerified ? "success" : "warning"}>
              {user.emailVerified
                ? t.admin.users.emailVerified
                : t.admin.users.emailNotVerified}
            </Badge>
          </div>

          {user.isActive ? (
            <Button
              variant="danger"
              disabled={busy}
              onClick={() => setDialog("suspend")}
              icon={<Ban className="size-4" aria-hidden="true" />}
            >
              {t.admin.users.suspend}
            </Button>
          ) : (
            <Button
              disabled={busy}
              onClick={() => setDialog("activate")}
              icon={<CircleCheck className="size-4" aria-hidden="true" />}
            >
              {t.admin.users.activate}
            </Button>
          )}
        </CardBody>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title={t.admin.users.account} />
          <CardBody>
            {/* ما في «آخر دخول» — الباك إند ما بيرجّعه، فانشال بدل ما يعرض فراغ دايم */}
            <InfoGrid
              rows={[
                {
                  label: t.admin.users.email,
                  value: <span className="ltr-nums">{user.email}</span>,
                },
                {
                  label: t.admin.users.phone,
                  value: user.phone && (
                    <span className="ltr-nums">{user.phone}</span>
                  ),
                },
                {
                  label: t.admin.users.role,
                  value: ROLE_LABEL[user.role].label,
                },
                { label: t.admin.users.signInMethod, value: signInMethod },
                {
                  label: t.admin.users.colOrders,
                  value: (
                    <span className="ltr-nums">
                      {formatNumber(user.ordersCount)}
                    </span>
                  ),
                },
                {
                  label: t.admin.users.addresses,
                  value: (
                    <span className="ltr-nums">
                      {formatNumber(user.addressesCount)}{" "}
                      {t.admin.users.addressUnit}
                    </span>
                  ),
                },
                {
                  label: moneyLabel,
                  value:
                    money !== undefined && money !== null ? (
                      <span className="ltr-nums">
                        {formatCurrency(Number(money))}
                      </span>
                    ) : undefined,
                },
                {
                  label: t.admin.common.createdAt,
                  value: (
                    <span className="ltr-nums">{formatDate(user.createdAt)}</span>
                  ),
                },
                {
                  label: t.admin.users.updatedAt,
                  value: (
                    <span className="ltr-nums">{formatDate(user.updatedAt)}</span>
                  ),
                },
              ]}
            />
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title={t.admin.users.store}
            action={
              user.store ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => router.push(`/stores/${user.store!.id}`)}
                >
                  {t.admin.users.viewStore}
                </Button>
              ) : undefined
            }
          />
          <CardBody>
            {user.store ? (
              <InfoGrid
                rows={[
                  {
                    label: t.admin.stores.colStore,
                    value: textOrNull(user.store.name),
                  },
                  {
                    /* حالة **مراجعة** المتجر — مستقلة عن حالة الحساب */
                    label: t.admin.stores.colStatus,
                    value: <StatusBadge meta={STORE_STATUS[user.store.status]} />,
                  },
                  {
                    label: t.admin.users.storeRunning,
                    value: user.store.isActive ? (
                      t.common.active
                    ) : (
                      <span className="flex items-center gap-1.5 text-danger">
                        <PowerOff className="size-4" aria-hidden="true" />
                        {t.common.inactive}
                      </span>
                    ),
                  },
                ]}
              />
            ) : (
              <p className="text-sm text-text-secondary">
                {t.admin.users.noStore}
              </p>
            )}
          </CardBody>
        </Card>
      </div>

      {/*
        الإيقاف بتأكيد بسيط بلا حقل سبب — رد السيرفر ما فيه ولا حقل يخزّن
        سبب (`isActive` وبس)، فطلب سبب كان بيضيّع اللي بيكتبه المشرف.
      */}
      <ConfirmDialog
        open={dialog === "suspend"}
        tone="danger"
        title={t.admin.users.suspendTitle}
        body={
          user.store
            ? `${t.admin.users.suspendBody} ${t.admin.users.storeIndependentNote}`
            : t.admin.users.suspendBody
        }
        confirmLabel={t.admin.users.suspend}
        loading={busy}
        onConfirm={() => run(() => suspendUser(userId), t.admin.users.didSuspend)}
        onCancel={() => setDialog(null)}
      />

      <ConfirmDialog
        open={dialog === "activate"}
        tone="primary"
        title={t.admin.users.activateTitle}
        body={t.admin.users.activateBody}
        confirmLabel={t.admin.users.activate}
        loading={busy}
        onConfirm={() =>
          run(() => activateUser(userId), t.admin.users.didActivate)
        }
        onCancel={() => setDialog(null)}
      />
    </div>
  );
}

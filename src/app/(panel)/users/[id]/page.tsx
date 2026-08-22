"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Ban,
  Check,
  CircleCheck,
  ShieldOff,
  UserRound,
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
import { fetchUser, reactivateUser, suspendUser } from "@/lib/admin/api";
import { ENTITY_STATUS, ROLE_LABEL } from "@/lib/admin/status";
import type { AdminUserDetail } from "@/lib/admin/types";
import { classifyStatus } from "@/lib/apiFailure";
import type { ApiResponse } from "@/lib/api";
import { formatDate, formatNumber } from "@/lib/format";
import { useFlash } from "@/lib/useFlash";
import { t } from "@/lib/strings";

type Dialog = "suspend" | "reactivate" | null;

export default function AdminUserDetailPage() {
  const router = useRouter();
  const userId = Number(useParams<{ id: string }>().id);

  const [user, setUser] = useState<AdminUserDetail | null>(null);
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
  }, [userId, attempt]);

  const run = useCallback(
    async (
      call: () => Promise<ApiResponse & { user?: AdminUserDetail }>,
      success: string,
    ) => {
      setBusy(true);
      setError("");
      setReasonError(undefined);

      const res = await call();
      setBusy(false);

      if (res.success && res.user) {
        setUser(res.user);
        setDialog(null);
        showFlash(success);
        return;
      }

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

  const suspended = user.status === "SUSPENDED";

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={user.name}
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
            <StatusBadge meta={ENTITY_STATUS[user.status]} />
            <StatusBadge meta={ROLE_LABEL[user.role]} />
            <Badge tone={user.emailVerified ? "success" : "warning"}>
              {user.emailVerified
                ? t.admin.users.emailVerified
                : t.admin.users.emailNotVerified}
            </Badge>
          </div>

          {suspended ? (
            <Button
              disabled={busy}
              onClick={() => setDialog("reactivate")}
              icon={<CircleCheck className="size-4" aria-hidden="true" />}
            >
              {t.admin.users.reactivate}
            </Button>
          ) : (
            <Button
              variant="danger"
              disabled={busy}
              onClick={() => setDialog("suspend")}
              icon={<Ban className="size-4" aria-hidden="true" />}
            >
              {t.admin.users.suspend}
            </Button>
          )}
        </CardBody>
      </Card>

      {user.suspension && (
        <Card className="border-danger/20 bg-danger-soft/40">
          <CardBody className="space-y-2">
            <p className="flex items-center gap-2 text-sm font-extrabold text-danger">
              <ShieldOff className="size-4" aria-hidden="true" />
              {t.admin.stores.suspensionInfo}
            </p>
            <p className="text-sm text-heading">{user.suspension.reason}</p>
            <p className="ltr-nums text-xs text-text-secondary">
              {formatDate(user.suspension.at)} · {t.admin.common.by}{" "}
              {user.suspension.by}
            </p>
          </CardBody>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title={t.admin.users.account} />
          <CardBody>
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
                {
                  label: t.admin.users.colOrders,
                  value: (
                    <span className="ltr-nums">
                      {formatNumber(user.ordersCount)}
                    </span>
                  ),
                },
                {
                  label: t.admin.common.createdAt,
                  value: (
                    <span className="ltr-nums">{formatDate(user.createdAt)}</span>
                  ),
                },
                {
                  label: t.admin.users.lastLogin,
                  value: user.lastLoginAt ? (
                    <span className="ltr-nums">
                      {formatDate(user.lastLoginAt)}
                    </span>
                  ) : (
                    t.admin.users.neverLoggedIn
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
              user.storeId ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => router.push(`/stores/${user.storeId}`)}
                >
                  {t.admin.users.viewStore}
                </Button>
              ) : undefined
            }
          />
          <CardBody>
            {user.storeId ? (
              <InfoGrid
                rows={[
                  { label: t.admin.stores.colStore, value: user.storeName },
                  {
                    /*
                      حالة المتجر مستقلة عن حالة الحساب — إيقاف الحساب ما
                      بيوقف المتجر تلقائياً. القرار لسا ما تحدّد مع الباك إند.
                    */
                    label: t.admin.stores.colStatus,
                    value: user.storeStatus && (
                      <StatusBadge meta={ENTITY_STATUS[user.storeStatus]} />
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

      <ConfirmDialog
        open={dialog === "reactivate"}
        tone="primary"
        title={t.admin.users.reactivateTitle}
        body={t.admin.users.reactivateBody}
        confirmLabel={t.admin.users.reactivate}
        loading={busy}
        onConfirm={() =>
          run(() => reactivateUser(userId), t.admin.users.didReactivate)
        }
        onCancel={() => setDialog(null)}
      />

      <ReasonDialog
        open={dialog === "suspend"}
        title={t.admin.users.suspendTitle}
        body={t.admin.users.suspendBody}
        confirmLabel={t.admin.users.suspend}
        loading={busy}
        serverError={reasonError}
        onConfirm={(reason) =>
          run(() => suspendUser(userId, reason), t.admin.users.didSuspend)
        }
        onCancel={() => setDialog(null)}
      />
    </div>
  );
}

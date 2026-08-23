"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Check, Eye, EyeOff, Flag, XCircle } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import ReasonDialog from "@/components/ui/ReasonDialog";
import EmptyState from "@/components/ui/EmptyState";
import ErrorBanner from "@/components/ui/ErrorBanner";
import Spinner from "@/components/ui/Spinner";
import InfoGrid from "@/components/admin/InfoGrid";
import StatusBadge from "@/components/admin/StatusBadge";
import ReviewCard from "@/components/admin/ReviewCard";
import {
  fetchReport,
  hideReview,
  unhideReview,
  updateReport,
} from "@/lib/admin/api";
import { REPORT_STATUS, REPORT_TARGET, STORE_STATUS } from "@/lib/admin/status";
import type { AdminReportDetail } from "@/lib/admin/types";
import { classifyStatus } from "@/lib/apiFailure";
import { formatDate, formatNumber, formatPrice } from "@/lib/format";
import { useFlash } from "@/lib/useFlash";
import { t } from "@/lib/strings";

type Dialog = "hide" | "unhide" | "resolve" | "dismiss" | null;

export default function AdminReportDetailPage() {
  const router = useRouter();
  const reportId = Number(useParams<{ id: string }>().id);

  const [report, setReport] = useState<AdminReportDetail | null>(null);
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
      const res = await fetchReport(reportId);
      if (cancelled) return;

      setLoading(false);

      if (res.success && res.report) {
        setReport(res.report);
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
  }, [reportId, attempt]);

  /** إجراءات البلاغ نفسه — بترجّع البلاغ المحدّث */
  const changeStatus = async (
    status: "RESOLVED" | "DISMISSED",
    success: string,
  ) => {
    setBusy(true);
    setError("");

    const res = await updateReport(reportId, { status });
    setBusy(false);
    setDialog(null);

    if (res.success && res.report) {
      setReport(res.report);
      showFlash(success);
      return;
    }

    const failure = classifyStatus(res);
    setError(
      failure.kind === "unauthorized"
        ? t.admin.common.sessionInvalid
        : failure.message,
    );
  };

  /**
   * إخفاء/إظهار التقييم.
   * الرد بيرجّع التقييم لحاله، فبنركّبه جوّا لقطة البلاغ بدل إعادة جلب.
   */
  const toggleHidden = async (reason?: string) => {
    const review = report?.content.review;
    if (!review) return;

    setBusy(true);
    setError("");
    setReasonError(undefined);

    const res = reason
      ? await hideReview(review.id, reason)
      : await unhideReview(review.id);

    setBusy(false);

    if (res.success && res.review) {
      const updated = res.review;
      setReport((prev) =>
        prev ? { ...prev, content: { ...prev.content, review: updated } } : prev,
      );
      setDialog(null);
      showFlash(reason ? t.admin.reports.didHide : t.admin.reports.didUnhide);
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
  };

  if (loading) return <Spinner />;

  if (notFound) {
    return (
      <Card className="overflow-hidden border border-border shadow-xs">
        <CardBody className="p-8">
          <EmptyState
            icon={Flag}
            title={t.admin.common.notFound}
            hint={t.admin.common.notFoundHint}
            action={
              <Button size="lg" onClick={() => router.push("/reports")}>
                {t.admin.common.backToList}
              </Button>
            }
          />
        </CardBody>
      </Card>
    );
  }

  if (!report) {
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

  const { review, product, store } = report.content;
  const isOpen = report.status === "OPEN";

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t.admin.reports.detailsTitle}
        subtitle={report.reason}
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
              onClick={() => router.push("/reports")}
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
            <StatusBadge meta={REPORT_STATUS[report.status]} />
            <StatusBadge meta={REPORT_TARGET[report.targetType]} />
          </div>

          {isOpen && (
            <div className="flex flex-wrap gap-2">
              <Button
                disabled={busy}
                onClick={() => setDialog("resolve")}
                icon={<Check className="size-4" aria-hidden="true" />}
              >
                {t.admin.reports.resolve}
              </Button>
              <Button
                variant="secondary"
                disabled={busy}
                onClick={() => setDialog("dismiss")}
                icon={<XCircle className="size-4" aria-hidden="true" />}
              >
                {t.admin.reports.dismiss}
              </Button>
            </div>
          )}
        </CardBody>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title={t.admin.reports.reportInfo} />
          <CardBody>
            <InfoGrid
              rows={[
                { label: t.admin.reports.reportReason, value: report.reason },
                { label: t.admin.reports.reporter, value: report.reporter.name },
                {
                  label: t.admin.common.createdAt,
                  value: (
                    <span className="ltr-nums">
                      {formatDate(report.createdAt)}
                    </span>
                  ),
                },
                {
                  label: t.admin.reports.relatedCount,
                  value: (
                    <span className="ltr-nums">
                      {formatNumber(report.relatedCount)}
                    </span>
                  ),
                },
                { label: t.admin.reports.note, value: report.note },
              ]}
            />
          </CardBody>
        </Card>

        <div className="flex flex-col gap-4">
          <h2 className="text-sm font-extrabold text-heading">
            {t.admin.reports.reportedContent}
          </h2>

          {review && <ReviewCard review={review} />}

          {product && (
            <Card>
              <CardBody className="space-y-3">
                <p className="text-sm font-extrabold text-heading">
                  {product.name}
                </p>
                <InfoGrid
                  rows={[
                    {
                      label: t.admin.dashboard.colRevenue,
                      value: (
                        <span className="ltr-nums">
                          {formatPrice(product.price)}
                        </span>
                      ),
                    },
                    { label: t.admin.stores.colStore, value: product.storeName },
                  ]}
                />
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => router.push(`/stores/${product.storeId}`)}
                >
                  {t.admin.reports.viewStore}
                </Button>
              </CardBody>
            </Card>
          )}

          {store && (
            <Card>
              <CardBody className="space-y-3">
                <p className="text-sm font-extrabold text-heading">
                  {store.name}
                </p>
                <InfoGrid
                  rows={[
                    { label: t.admin.stores.colCity, value: store.city },
                    {
                      label: t.admin.stores.colStatus,
                      value: <StatusBadge meta={STORE_STATUS[store.status]} />,
                    },
                  ]}
                />
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => router.push(`/stores/${store.id}`)}
                >
                  {t.admin.reports.viewStore}
                </Button>
              </CardBody>
            </Card>
          )}

          {!review && !product && !store && (
            <Card>
              <CardBody>
                <p className="text-sm text-text-secondary">
                  {t.admin.reports.contentGone}
                </p>
              </CardBody>
            </Card>
          )}

          {/* إخفاء التقييم متاح للتقييمات بس — مش للمنتجات ولا المتاجر */}
          {review && (
            <div className="flex flex-wrap gap-2">
              {review.isHidden ? (
                <Button
                  variant="secondary"
                  disabled={busy}
                  onClick={() => setDialog("unhide")}
                  icon={<Eye className="size-4" aria-hidden="true" />}
                >
                  {t.admin.reports.unhide}
                </Button>
              ) : (
                <Button
                  variant="danger"
                  disabled={busy}
                  onClick={() => setDialog("hide")}
                  icon={<EyeOff className="size-4" aria-hidden="true" />}
                >
                  {t.admin.reports.hide}
                </Button>
              )}
            </div>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={dialog === "resolve"}
        tone="primary"
        title={t.admin.reports.resolveTitle}
        body={t.admin.reports.resolveBody}
        confirmLabel={t.admin.reports.resolve}
        loading={busy}
        onConfirm={() => changeStatus("RESOLVED", t.admin.reports.didResolve)}
        onCancel={() => setDialog(null)}
      />

      <ConfirmDialog
        open={dialog === "dismiss"}
        title={t.admin.reports.dismissTitle}
        body={t.admin.reports.dismissBody}
        confirmLabel={t.admin.reports.dismiss}
        loading={busy}
        onConfirm={() => changeStatus("DISMISSED", t.admin.reports.didDismiss)}
        onCancel={() => setDialog(null)}
      />

      <ConfirmDialog
        open={dialog === "unhide"}
        tone="primary"
        title={t.admin.reports.unhideTitle}
        body={t.admin.reports.unhideBody}
        confirmLabel={t.admin.reports.unhide}
        loading={busy}
        onConfirm={() => toggleHidden()}
        onCancel={() => setDialog(null)}
      />

      {/* إخفاء التقييم بسبب إلزامي — الإخفاء عن الزبون فقط، والتاجر بيضل يشوفه */}
      <ReasonDialog
        open={dialog === "hide"}
        title={t.admin.reports.hideTitle}
        body={t.admin.reports.hideBody}
        confirmLabel={t.admin.reports.hide}
        loading={busy}
        serverError={reasonError}
        onConfirm={(reason) => toggleHidden(reason)}
        onCancel={() => setDialog(null)}
      />
    </div>
  );
}

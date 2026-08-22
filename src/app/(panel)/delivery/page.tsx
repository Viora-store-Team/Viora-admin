"use client";

import { useCallback, useEffect, useState } from "react";
import { CircleCheck, RotateCcw } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { TableShell, Td, Thead } from "@/components/ui/Table";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import EmptyState from "@/components/ui/EmptyState";
import ErrorBanner from "@/components/ui/ErrorBanner";
import Spinner from "@/components/ui/Spinner";
import Pagination from "@/components/ui/Pagination";
import InfoGrid from "@/components/admin/InfoGrid";
import StatusBadge from "@/components/admin/StatusBadge";
import { fetchDeliveryFailures, fetchDeliveryHealth } from "@/lib/admin/api";
import { DELIVERY_STATUS } from "@/lib/admin/status";
import type { DeliveryFailure, DeliveryHealth } from "@/lib/admin/types";
import { useAdminList } from "@/lib/admin/useAdminList";
import { classifyStatus } from "@/lib/apiFailure";
import { formatDateTime, formatNumber } from "@/lib/format";
import { t } from "@/lib/strings";
import type { ApiResponse } from "@/lib/api";

const COLUMNS = [
  t.admin.delivery.colTime,
  t.admin.delivery.colOrder,
  t.admin.delivery.colEndpoint,
  t.admin.delivery.colStatus,
  t.admin.delivery.colMessage,
  "",
] as const;

export default function AdminDeliveryPage() {
  const [health, setHealth] = useState<DeliveryHealth | null>(null);
  const [healthLoading, setHealthLoading] = useState(true);
  const [healthError, setHealthError] = useState("");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const res = await fetchDeliveryHealth();
      if (cancelled) return;

      setHealthLoading(false);

      if (res.success && res.health) {
        setHealth(res.health);
        setHealthError("");
        return;
      }

      const failure = classifyStatus(res);
      setHealthError(
        failure.kind === "unauthorized"
          ? t.admin.common.sessionInvalid
          : failure.message,
      );
    })();

    return () => {
      cancelled = true;
    };
  }, [attempt]);

  const fetcher = useCallback(
    ({ page }: { page: number }) => fetchDeliveryFailures({ page }),
    [],
  );

  const select = useCallback(
    (res: ApiResponse) => res.failures as DeliveryFailure[] | undefined,
    [],
  );

  const list = useAdminList<DeliveryFailure>({ fetcher, select });

  const refresh = () => {
    setHealthLoading(true);
    setAttempt((a) => a + 1);
    list.reload();
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t.admin.delivery.title}
        subtitle={t.admin.delivery.subtitle}
        action={
          <Button
            variant="secondary"
            onClick={refresh}
            disabled={healthLoading || list.loading}
            icon={<RotateCcw className="size-4" aria-hidden="true" />}
          >
            {t.admin.delivery.refresh}
          </Button>
        }
      />

      <ErrorBanner
        message={healthError || (list.unauthorized ? t.admin.common.sessionInvalid : list.error)}
        onRetry={refresh}
      />

      {/* شاشة مراقبة للقراءة فقط — إعادة الإرسال قرار وصلاحية من الباك إند */}
      <p className="text-xs leading-relaxed text-text-secondary">
        {t.admin.delivery.readOnlyNote}
      </p>

      <Card>
        <CardHeader title={t.admin.delivery.health} />
        <CardBody>
          {healthLoading ? (
            <Spinner variant="page" />
          ) : health ? (
            <InfoGrid
              rows={[
                { label: t.admin.delivery.provider, value: health.provider },
                {
                  label: t.admin.stores.colStatus,
                  value: <StatusBadge meta={DELIVERY_STATUS[health.status]} />,
                },
                {
                  label: t.admin.delivery.successRate,
                  value: (
                    <span className="ltr-nums">{health.successRate24h}%</span>
                  ),
                },
                {
                  label: t.admin.delivery.avgResponse,
                  value: (
                    <span className="ltr-nums">
                      {formatNumber(health.avgResponseMs)} ms
                    </span>
                  ),
                },
                {
                  label: t.admin.delivery.failures24h,
                  value: (
                    <span className="ltr-nums">
                      {formatNumber(health.failures24h)}
                    </span>
                  ),
                },
                {
                  label: t.admin.delivery.lastCheck,
                  value: (
                    <span className="ltr-nums">
                      {formatDateTime(health.lastCheckAt)}
                    </span>
                  ),
                },
              ]}
            />
          ) : null}
        </CardBody>
      </Card>

      <Card className="overflow-hidden">
        <CardHeader title={t.admin.delivery.failuresTitle} />

        {list.loading ? (
          <Spinner />
        ) : list.rows.length === 0 ? (
          <CardBody className="p-8">
            {/* غياب الأعطال حالة إيجابية — النبرة لازم تعكس هيك مش تبدو فراغ */}
            <EmptyState
              icon={CircleCheck}
              title={t.admin.delivery.empty}
              hint={t.admin.delivery.emptyHint}
            />
          </CardBody>
        ) : (
          <TableShell minWidth="min-w-[820px]">
            <Thead columns={COLUMNS} />
            <tbody className="divide-y divide-border/60">
              {list.rows.map((failure) => (
                <tr key={failure.id} className="bg-surface">
                  <Td className="ltr-nums whitespace-nowrap text-text-secondary">
                    {formatDateTime(failure.occurredAt)}
                  </Td>
                  <Td className="ltr-nums font-bold text-heading">
                    {failure.orderId}
                  </Td>
                  <Td className="ltr-nums text-text-secondary">
                    {failure.endpoint}
                  </Td>
                  <Td>
                    <Badge
                      tone={failure.httpStatus >= 500 ? "danger" : "warning"}
                    >
                      <span className="ltr-nums">{failure.httpStatus}</span>
                    </Badge>
                  </Td>
                  <Td className="max-w-[280px]">
                    <span className="line-clamp-2">{failure.message}</span>
                  </Td>
                  <Td>
                    {failure.retryable && (
                      <Badge tone="info">{t.admin.delivery.retryable}</Badge>
                    )}
                  </Td>
                </tr>
              ))}
            </tbody>
          </TableShell>
        )}
      </Card>

      {list.pagination && (
        <Pagination pagination={list.pagination} onChange={list.changePage} />
      )}
    </div>
  );
}

"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { Flag } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import { Card, CardBody } from "@/components/ui/Card";
import EmptyState from "@/components/ui/EmptyState";
import ErrorBanner from "@/components/ui/ErrorBanner";
import Spinner from "@/components/ui/Spinner";
import Tabs, { type TabItem } from "@/components/ui/Tabs";
import Pagination from "@/components/ui/Pagination";
import Button from "@/components/ui/Button";
import ReportsTable from "@/components/admin/ReportsTable";
import { fetchReports } from "@/lib/admin/api";
import type { AdminReportListItem, ReportStatus } from "@/lib/admin/types";
import { useAdminList } from "@/lib/admin/useAdminList";
import { formatNumber } from "@/lib/format";
import { t } from "@/lib/strings";
import type { ApiResponse } from "@/lib/api";

const STATUS_TABS: TabItem[] = [
  { key: "", label: "الكل" },
  { key: "OPEN", label: "مفتوحة" },
  { key: "RESOLVED", label: "معالجة" },
  { key: "DISMISSED", label: "مرفوضة" },
];

export default function AdminReportListItemsPage() {
  const router = useRouter();
  const fetcher = useCallback(
    ({ page, q, filters }: { page: number; q: string; filters: Record<string, string> }) =>
      fetchReports({ page, q, status: filters.status as ReportStatus | "" }),
    [],
  );
  const select = useCallback(
    (res: ApiResponse) => res.reports as AdminReportListItem[] | undefined,
    [],
  );
  const list = useAdminList<AdminReportListItem>({
    fetcher,
    select,
    initialFilters: { status: "" },
  });
  const total = list.pagination?.total ?? 0;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t.admin.reports.title}
        subtitle={total > 0 ? `${formatNumber(total)} ${t.admin.reports.count}` : t.admin.reports.subtitle}
      />
      <ErrorBanner message={list.unauthorized ? t.admin.common.sessionInvalid : list.error} onRetry={list.unauthorized ? undefined : list.reload} />
      <Tabs items={STATUS_TABS} active={list.filters.status ?? ""} onChange={(key) => list.changeFilter("status", key)} />

      {list.loading ? <Spinner /> : list.error ? null : list.rows.length === 0 ? (
        <Card className="overflow-hidden border border-border shadow-xs">
          <CardBody className="p-8">
            <EmptyState
              icon={Flag}
              title={list.isFiltered ? t.admin.common.noResults : t.admin.reports.empty}
              hint={list.isFiltered ? t.admin.common.noResultsHint : t.admin.reports.emptyHint}
              action={list.isFiltered ? <Button variant="secondary" onClick={list.clearFilters}>{t.admin.common.clearSearch}</Button> : undefined}
            />
          </CardBody>
        </Card>
      ) : (
        <div className="flex flex-col gap-4">
          <Card className="overflow-hidden border border-border shadow-xs">
            <ReportsTable reports={list.rows} onOpen={(id) => router.push(`/reports/${id}`)} />
          </Card>
          {list.pagination && <Pagination pagination={list.pagination} onChange={list.changePage} />}
        </div>
      )}
    </div>
  );
}

"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { Flag } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import { Card, CardBody } from "@/components/ui/Card";
import EmptyState from "@/components/ui/EmptyState";
import ErrorBanner from "@/components/ui/ErrorBanner";
import Spinner from "@/components/ui/Spinner";
import SearchInput from "@/components/ui/SearchInput";
import Select from "@/components/ui/Select";
import Tabs, { type TabItem } from "@/components/ui/Tabs";
import Pagination from "@/components/ui/Pagination";
import Button from "@/components/ui/Button";
import ReportsTable from "@/components/admin/ReportsTable";
import { fetchReports } from "@/lib/admin/api";
import {
  REPORT_STATUS,
  REPORT_STATUS_KEYS,
  REPORT_TARGET,
  REPORT_TARGET_KEYS,
} from "@/lib/admin/status";
import type {
  AdminReportListItem,
  ReportStatus,
  ReportTarget,
} from "@/lib/admin/types";
import { useAdminList } from "@/lib/admin/useAdminList";
import { formatNumber } from "@/lib/format";
import { t } from "@/lib/strings";
import type { ApiResponse } from "@/lib/api";

/** الحالة هي المحور الأساسي — المشرف بيشتغل على المفتوح أول */
const STATUS_TABS: TabItem[] = [
  { key: "", label: t.admin.common.all },
  ...REPORT_STATUS_KEYS.map((key) => ({
    key,
    label: REPORT_STATUS[key].label,
  })),
];

const TARGET_OPTIONS = REPORT_TARGET_KEYS.map((key) => ({
  value: key,
  label: REPORT_TARGET[key].label,
}));

export default function AdminReportsPage() {
  const router = useRouter();

  const fetcher = useCallback(
    ({
      page,
      q,
      filters,
    }: {
      page: number;
      q: string;
      filters: Record<string, string>;
    }) =>
      fetchReports({
        page,
        q,
        status: filters.status as ReportStatus | "",
        targetType: filters.targetType as ReportTarget | "",
      }),
    [],
  );

  const select = useCallback(
    (res: ApiResponse) => res.reports as AdminReportListItem[] | undefined,
    [],
  );

  const list = useAdminList<AdminReportListItem>({
    fetcher,
    select,
    initialFilters: { status: "", targetType: "" },
  });

  const total = list.pagination?.total ?? 0;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t.admin.reports.title}
        subtitle={
          total > 0
            ? `${formatNumber(total)} ${t.admin.reports.count}`
            : t.admin.reports.subtitle
        }
      />

      <ErrorBanner
        message={list.unauthorized ? t.admin.common.sessionInvalid : list.error}
        onRetry={list.unauthorized ? undefined : list.reload}
      />

      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <SearchInput
            id="reports-search"
            value={list.q}
            onChange={list.changeQuery}
            placeholder={t.admin.reports.searchPlaceholder}
          />
          <Select
            id="reports-target"
            value={list.filters.targetType ?? ""}
            onChange={(value) => list.changeFilter("targetType", value)}
            options={TARGET_OPTIONS}
            placeholder={t.admin.common.all}
            className="sm:w-48"
          />
        </div>
        <Tabs
          items={STATUS_TABS}
          active={list.filters.status ?? ""}
          onChange={(key) => list.changeFilter("status", key)}
        />
      </div>

      {list.loading ? (
        <Spinner />
      ) : list.rows.length === 0 ? (
        <Card className="overflow-hidden border border-border shadow-xs">
          <CardBody className="p-8">
            <EmptyState
              icon={Flag}
              title={
                list.isFiltered ? t.admin.common.noResults : t.admin.reports.empty
              }
              hint={
                list.isFiltered
                  ? t.admin.common.noResultsHint
                  : t.admin.reports.emptyHint
              }
              action={
                list.isFiltered ? (
                  <Button variant="secondary" onClick={list.clearFilters}>
                    {t.admin.common.clearSearch}
                  </Button>
                ) : undefined
              }
            />
          </CardBody>
        </Card>
      ) : (
        <div className="flex flex-col gap-4">
          <Card className="overflow-hidden border border-border shadow-xs">
            <ReportsTable
              reports={list.rows}
              onOpen={(id) => router.push(`/reports/${id}`)}
            />
          </Card>
          {list.pagination && (
            <Pagination pagination={list.pagination} onChange={list.changePage} />
          )}
        </div>
      )}
    </div>
  );
}

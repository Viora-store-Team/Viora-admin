"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { Headphones } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import { Card, CardBody } from "@/components/ui/Card";
import EmptyState from "@/components/ui/EmptyState";
import ErrorBanner from "@/components/ui/ErrorBanner";
import Spinner from "@/components/ui/Spinner";
import Tabs, { type TabItem } from "@/components/ui/Tabs";
import Pagination from "@/components/ui/Pagination";
import Button from "@/components/ui/Button";
import SupportTicketsTable from "@/components/admin/SupportTicketsTable";
import { fetchSupportTickets } from "@/lib/admin/api";
import type { AdminSupportTicket, SupportTicketStatus } from "@/lib/admin/types";
import { useAdminList } from "@/lib/admin/useAdminList";
import { formatNumber } from "@/lib/format";
import { t } from "@/lib/strings";
import type { ApiResponse } from "@/lib/api";

const STATUS_TABS: TabItem[] = [
  { key: "", label: t.admin.support.all },
  { key: "OPEN", label: t.admin.support.open },
  { key: "RESOLVED", label: t.admin.support.resolved },
];

export default function AdminSupportTicketsPage() {
  const router = useRouter();
  const fetcher = useCallback(
    ({ page, filters }: { page: number; q: string; filters: Record<string, string> }) =>
      fetchSupportTickets({ page, status: filters.status as SupportTicketStatus | "" }),
    [],
  );
  const select = useCallback(
    (res: ApiResponse) => res.tickets as AdminSupportTicket[] | undefined,
    [],
  );
  const list = useAdminList<AdminSupportTicket>({
    fetcher,
    select,
    initialFilters: { status: "" },
  });
  const total = list.pagination?.total ?? 0;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t.admin.support.title}
        subtitle={total > 0 ? `${formatNumber(total)} ${t.admin.support.count}` : t.admin.support.subtitle}
      />
      <ErrorBanner message={list.unauthorized ? t.admin.common.sessionInvalid : list.error} onRetry={list.unauthorized ? undefined : list.reload} />
      <p className="text-xs leading-relaxed text-text-secondary">{t.admin.support.contactOutside}</p>
      <Tabs items={STATUS_TABS} active={list.filters.status ?? ""} onChange={(key) => list.changeFilter("status", key)} />

      {list.loading ? <Spinner /> : list.error ? null : list.rows.length === 0 ? (
        <Card className="overflow-hidden border border-border shadow-xs">
          <CardBody className="p-8">
            <EmptyState
              icon={Headphones}
              title={list.isFiltered ? t.admin.common.noResults : t.admin.support.empty}
              hint={list.isFiltered ? t.admin.common.noResultsHint : t.admin.support.emptyHint}
              action={list.isFiltered ? <Button variant="secondary" onClick={list.clearFilters}>{t.admin.common.clearSearch}</Button> : undefined}
            />
          </CardBody>
        </Card>
      ) : (
        <div className="flex flex-col gap-4">
          <Card className="overflow-hidden border border-border shadow-xs">
            <SupportTicketsTable tickets={list.rows} onOpen={(id) => router.push(`/support/${id}`)} />
          </Card>
          {list.pagination && <Pagination pagination={list.pagination} onChange={list.changePage} />}
        </div>
      )}
    </div>
  );
}

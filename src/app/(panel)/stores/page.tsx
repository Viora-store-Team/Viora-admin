"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { Store } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import { Card, CardBody } from "@/components/ui/Card";
import EmptyState from "@/components/ui/EmptyState";
import ErrorBanner from "@/components/ui/ErrorBanner";
import Spinner from "@/components/ui/Spinner";
import SearchInput from "@/components/ui/SearchInput";
import Tabs, { type TabItem } from "@/components/ui/Tabs";
import Pagination from "@/components/ui/Pagination";
import Button from "@/components/ui/Button";
import StoresTable from "@/components/admin/StoresTable";
import { fetchStores } from "@/lib/admin/api";
import { STORE_STATUS } from "@/lib/admin/status";
import type { AdminStoreListItem, StoreStatus } from "@/lib/admin/types";
import { STORE_STATUS_KEYS } from "@/lib/admin/types";
import { useAdminList } from "@/lib/admin/useAdminList";
import { formatNumber } from "@/lib/format";
import { t } from "@/lib/strings";
import type { ApiResponse } from "@/lib/api";

/* التبويبات الرسمية الخمسة من الباك إند:
   1. الكل (بلا فلتر)
   2. نشط (status=APPROVED & isActive=true)
   3. بانتظار التوثيق (status=PENDING)
   4. موقوف (isActive=false)
   5. مرفوض (status=REJECTED) */
const STATUS_TABS: TabItem[] = [
  { key: "all", label: t.admin.stores.tabAll },
  { key: "active", label: t.admin.stores.tabActive },
  { key: "pending", label: t.admin.stores.tabPending },
  { key: "suspended", label: t.admin.stores.tabSuspended },
  { key: "rejected", label: t.admin.stores.tabRejected },
];

function getTabFilters(tab: string): {
  status?: StoreStatus | "";
  isActive?: "true" | "false" | "";
} {
  switch (tab) {
    case "active":
      return { status: "APPROVED", isActive: "true" };
    case "pending":
      return { status: "PENDING", isActive: "" };
    case "suspended":
      return { status: "", isActive: "false" };
    case "rejected":
      return { status: "REJECTED", isActive: "" };
    case "all":
    default:
      return { status: "", isActive: "" };
  }
}

export default function AdminStoresPage() {
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
    }) => {
      const { status, isActive } = getTabFilters(filters.tab || "all");
      return fetchStores({ page, q, status, isActive });
    },
    [],
  );

  const select = useCallback(
    (res: ApiResponse) => res.stores as AdminStoreListItem[] | undefined,
    [],
  );

  const list = useAdminList<AdminStoreListItem>({
    fetcher,
    select,
    initialFilters: { tab: "all" },
  });

  const total = list.pagination?.total ?? 0;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t.admin.stores.title}
        subtitle={
          total > 0
            ? `${formatNumber(total)} ${t.admin.stores.count}`
            : t.admin.stores.subtitle
        }
      />

      <ErrorBanner
        message={list.unauthorized ? t.admin.common.sessionInvalid : list.error}
        onRetry={list.unauthorized ? undefined : list.reload}
      />

      <div className="flex flex-col gap-3">
        <SearchInput
          id="stores-search"
          value={list.q}
          onChange={list.changeQuery}
          placeholder={t.admin.stores.searchPlaceholder}
        />
        <Tabs
          items={STATUS_TABS}
          active={list.filters.tab || "all"}
          onChange={(key) => list.changeFilter("tab", key)}
        />
      </div>

      {list.loading ? (
        <Spinner />
      ) : list.rows.length === 0 ? (
        <Card className="overflow-hidden border border-border shadow-xs">
          <CardBody className="p-8">
            {/* الفرق مقصود: "ما في متاجر" غير "بحثك ما طلّع نتيجة" */}
            <EmptyState
              icon={Store}
              title={
                list.isFiltered ? t.admin.common.noResults : t.admin.stores.empty
              }
              hint={
                list.isFiltered
                  ? t.admin.common.noResultsHint
                  : t.admin.stores.emptyHint
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
            <StoresTable
              stores={list.rows}
              onOpen={(id) => router.push(`/stores/${id}`)}
            />
          </Card>
          {list.pagination && (
            <Pagination
              pagination={list.pagination}
              onChange={list.changePage}
            />
          )}
        </div>
      )}
    </div>
  );
}

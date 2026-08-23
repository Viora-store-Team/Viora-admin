"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { Users } from "lucide-react";
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
import UsersTable from "@/components/admin/UsersTable";
import { fetchUsers } from "@/lib/admin/api";
import type { AdminRole, AdminUserListItem } from "@/lib/admin/types";
import { useAdminList } from "@/lib/admin/useAdminList";
import { formatNumber } from "@/lib/format";
import { t } from "@/lib/strings";
import type { ApiResponse } from "@/lib/api";

/** الدور هو المحور الأساسي للتصفّح، فأخذ التبويبات */
const ROLE_TABS: TabItem[] = [
  { key: "", label: t.admin.common.all },
  { key: "MERCHANT", label: t.admin.users.merchant },
  { key: "CUSTOMER", label: t.admin.users.customer },
];

/*
  الحالة محور ثانوي — قائمة منسدلة بدل صف تبويبات ثاني يزحم الشاشة.

  ⚠️ القيم `"true"`/`"false"` لأن الفلتر بالباك إند اسمه `isActive` بولياني،
  مش `status` بقيم نصية. `?status=` بينتجاهل بصمت على السيرفر.
*/
const ACTIVE_OPTIONS = [
  { value: "true", label: t.admin.status.active },
  { value: "false", label: t.admin.status.suspended },
];

export default function AdminUsersPage() {
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
      fetchUsers({
        page,
        q,
        role: filters.role as AdminRole | "",
        isActive: filters.isActive as "true" | "false" | "",
      }),
    [],
  );

  const select = useCallback(
    (res: ApiResponse) => res.users as AdminUserListItem[] | undefined,
    [],
  );

  const list = useAdminList<AdminUserListItem>({
    fetcher,
    select,
    initialFilters: { role: "", isActive: "" },
  });

  const total = list.pagination?.total ?? 0;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t.admin.users.title}
        subtitle={
          total > 0
            ? `${formatNumber(total)} ${t.admin.users.count}`
            : t.admin.users.subtitle
        }
      />

      <ErrorBanner
        message={list.unauthorized ? t.admin.common.sessionInvalid : list.error}
        onRetry={list.unauthorized ? undefined : list.reload}
      />

      {/*
        نفس البريد ممكن يكون حسابين منفصلين (زبون + تاجر) بالعقد الحالي،
        فالبحث بالإيميل بيرجّع صفّين — سلوك صحيح لازم ينشرح للمشرف.
      */}
      <p className="text-xs leading-relaxed text-text-secondary">
        {t.admin.users.duplicateEmailNote}
      </p>

      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <SearchInput
            id="users-search"
            value={list.q}
            onChange={list.changeQuery}
            placeholder={t.admin.users.searchPlaceholder}
          />
          <Select
            id="users-status"
            value={list.filters.isActive ?? ""}
            onChange={(value) => list.changeFilter("isActive", value)}
            options={ACTIVE_OPTIONS}
            placeholder={t.admin.common.all}
            className="sm:w-48"
          />
        </div>
        <Tabs
          items={ROLE_TABS}
          active={list.filters.role ?? ""}
          onChange={(key) => list.changeFilter("role", key)}
        />
      </div>

      {list.loading ? (
        <Spinner />
      ) : list.rows.length === 0 ? (
        <Card className="overflow-hidden border border-border shadow-xs">
          <CardBody className="p-8">
            <EmptyState
              icon={Users}
              title={
                list.isFiltered ? t.admin.common.noResults : t.admin.users.empty
              }
              hint={
                list.isFiltered
                  ? t.admin.common.noResultsHint
                  : t.admin.users.emptyHint
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
            <UsersTable
              users={list.rows}
              onOpen={(id) => router.push(`/users/${id}`)}
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

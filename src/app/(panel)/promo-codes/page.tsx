"use client";

import { useCallback, useState } from "react";
import { TicketPercent } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import { Card, CardBody } from "@/components/ui/Card";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import EmptyState from "@/components/ui/EmptyState";
import ErrorBanner from "@/components/ui/ErrorBanner";
import Spinner from "@/components/ui/Spinner";
import SearchInput from "@/components/ui/SearchInput";
import Select from "@/components/ui/Select";
import Tabs, { type TabItem } from "@/components/ui/Tabs";
import Pagination from "@/components/ui/Pagination";
import Button from "@/components/ui/Button";
import PromoCodeFormDialog from "@/components/admin/PromoCodeFormDialog";
import PromoCodesTable from "@/components/admin/PromoCodesTable";
import { fetchPromoCodes, stopPromoCode } from "@/lib/admin/api";
import type { AdminPromoCode } from "@/lib/admin/types";
import { useAdminList } from "@/lib/admin/useAdminList";
import { dispatchToast } from "@/lib/toast";
import { t } from "@/lib/strings";
import type { ApiResponse } from "@/lib/api";

const OWNER_TABS: TabItem[] = [
  { key: "", label: t.admin.common.all },
  { key: "platform", label: "Viora" },
  { key: "store", label: "المتاجر" },
];

const STATUS_OPTIONS = [
  { value: "active", label: "فعّالة" },
  { value: "ended", label: "منتهية" },
];

/** «أكواد الخصم»: أكواد Viora وأكواد المتاجر، إنشاء كود Viora، وإيقاف أي كود. */
export default function AdminPromoCodesPage() {
  const [creating, setCreating] = useState(false);
  const [confirm, setConfirm] = useState<AdminPromoCode | null>(null);
  const [stopping, setStopping] = useState<number | null>(null);

  const fetcher = useCallback(
    ({ page, q, filters }: { page: number; q: string; filters: Record<string, string> }) =>
      fetchPromoCodes({
        page,
        q,
        owner: filters.owner as "platform" | "store" | "",
        status: (filters.status || "active") as "active" | "ended",
      }),
    [],
  );
  const select = useCallback(
    (res: ApiResponse) => res.promoCodes as AdminPromoCode[] | undefined,
    [],
  );
  const list = useAdminList<AdminPromoCode>({
    fetcher,
    select,
    initialFilters: { owner: "", status: "active" },
  });

  async function stop(promo: AdminPromoCode) {
    setStopping(promo.id);
    try {
      const res = await stopPromoCode(promo.id);
      if (res.success) {
        dispatchToast("success", "تم إيقاف الكود");
      } else if (res.status === 404 || res.errorCode === "PROMO_NOT_FOUND") {
        dispatchToast("error", "الكود غير موجود");
      } else {
        dispatchToast("error", res.message || t.errors.genericTitle);
        return;
      }
      list.reload();
    } finally {
      setStopping(null);
      setConfirm(null);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="أكواد الخصم"
        subtitle="أكواد Viora على حساب المنصة، وأكواد المتاجر على حساب المتجر."
        action={<Button onClick={() => setCreating(true)}>كود Viora جديد</Button>}
      />

      <ErrorBanner
        message={list.unauthorized ? t.admin.common.sessionInvalid : list.error}
        onRetry={list.unauthorized ? undefined : list.reload}
      />

      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <SearchInput
            id="promo-search"
            value={list.q}
            onChange={list.changeQuery}
            placeholder="ابحث بالكود"
          />
          <Select
            id="promo-status"
            label="الحالة"
            value={list.filters.status ?? "active"}
            onChange={(value) => list.changeFilter("status", value)}
            options={STATUS_OPTIONS}
            className="sm:w-48"
          />
        </div>
        <div role="group" aria-label="الجهة">
          <Tabs
            items={OWNER_TABS}
            active={list.filters.owner ?? ""}
            onChange={(key) => list.changeFilter("owner", key)}
          />
        </div>
      </div>

      {list.loading ? (
        <Spinner />
      ) : list.rows.length === 0 && !list.error ? (
        <EmptyState icon={TicketPercent} title="لا توجد أكواد مطابقة" />
      ) : list.rows.length > 0 ? (
        <Card>
          <CardBody>
            <PromoCodesTable
              rows={list.rows}
              stopping={stopping}
              onStop={setConfirm}
            />
          </CardBody>
        </Card>
      ) : null}

      {list.pagination && (
        <Pagination
          pagination={list.pagination}
          disabled={list.loading}
          onChange={list.changePage}
        />
      )}

      <PromoCodeFormDialog
        open={creating}
        onClose={() => setCreating(false)}
        onCreated={() => {
          setCreating(false);
          dispatchToast("success", "تم إنشاء الكود");
          list.reload();
        }}
      />

      <ConfirmDialog
        open={confirm !== null}
        title="إيقاف الكود؟"
        body={
          confirm ? (
            <p>
              الكود <span dir="ltr" className="font-extrabold">{confirm.code}</span>
              {confirm.owner === "STORE" && confirm.store
                ? ` (كود متجر ${confirm.store.name})`
                : " (كود Viora)"}
              {" "}ما رح يقدر حدا يستعمله بعد الآن. الطلبات القديمة ما بتتأثر.
            </p>
          ) : null
        }
        confirmLabel="إيقاف"
        loading={stopping !== null}
        onConfirm={() => confirm && stop(confirm)}
        onCancel={() => setConfirm(null)}
      />
    </div>
  );
}

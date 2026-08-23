"use client";

import {
  ChevronLeft,
  PowerOff,
  Store as StoreIcon,
  TriangleAlert,
} from "lucide-react";
import { TableShell, Td, Thead } from "@/components/ui/Table";
import StatusBadge from "./StatusBadge";
import { STORE_STATUS } from "@/lib/admin/status";
import type { AdminStoreListItem } from "@/lib/admin/types";
import { formatDate, formatNumber } from "@/lib/format";
import { isBrokenText, textOrNull } from "@/lib/brokenText";
import { t } from "@/lib/strings";

const COLUMNS = [
  t.admin.stores.colStore,
  t.admin.stores.colOwner,
  t.admin.stores.colCity,
  t.admin.stores.colProducts,
  t.admin.stores.colOrders,
  t.admin.stores.colStatus,
  t.admin.stores.colCreated,
  "",
] as const;

export default function StoresTable({
  stores,
  onOpen,
}: {
  stores: AdminStoreListItem[];
  onOpen: (id: number) => void;
}) {
  return (
    <TableShell minWidth="min-w-[900px]">
      <Thead columns={COLUMNS} />
      <tbody className="divide-y divide-border/60">
        {stores.map((store) => (
          <tr
            key={store.id}
            className="cursor-pointer bg-surface transition hover:bg-primary-soft/40"
            onClick={() => onOpen(store.id)}
          >
            <Td>
              <div className="flex items-center gap-3">
                <span className="grid size-9 shrink-0 place-items-center overflow-hidden rounded-xl bg-field-bg text-text-secondary">
                  {store.logoUrl ? (
                    /* <img> عادي زي باقي المشروع — الروابط بتيجي من رفع
                       المستخدمين، وnext/image بده remotePatterns لكل نطاق */
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={store.logoUrl}
                      alt=""
                      className="size-9 object-cover"
                    />
                  ) : (
                    <StoreIcon className="size-4" aria-hidden="true" />
                  )}
                </span>
                <span className="flex min-w-0 items-center gap-1.5">
                  {/* اسم مكسور الترميز بينبدل برقم المتجر — عرض الرموز
                      المكسّرة بيخلّي الصف غير قابل للتمييز أصلاً */}
                  {isBrokenText(store.name) ? (
                    <span className="flex items-center gap-1 truncate font-bold text-text-secondary">
                      <TriangleAlert
                        className="size-4 shrink-0 text-warning"
                        aria-label={t.admin.stores.brokenTitle}
                      />
                      <span className="ltr-nums">
                        {t.admin.stores.brokenName}
                        {store.id}
                      </span>
                    </span>
                  ) : (
                    <span className="truncate font-bold text-heading">
                      {store.name}
                    </span>
                  )}
                  {/* التوقّف مستقل عن قرار المراجعة — متجر مقبول وموقوف
                      حالة واردة، فبتلزمها علامة لحالها جنب الشارة */}
                  {!store.isActive && (
                    <PowerOff
                      className="size-4 shrink-0 text-danger"
                      aria-label={t.admin.stores.inactive}
                    />
                  )}
                </span>
              </div>
            </Td>
            <Td className="text-text-secondary">
              {textOrNull(store.owner.name) ?? t.admin.common.none}
            </Td>
            <Td className="text-text-secondary">
              {textOrNull(store.city) ?? t.admin.common.none}
            </Td>
            <Td className="ltr-nums">{formatNumber(store.productsCount)}</Td>
            <Td className="ltr-nums">{formatNumber(store.ordersCount)}</Td>
            <Td>
              <StatusBadge meta={STORE_STATUS[store.status]} />
            </Td>
            <Td className="ltr-nums whitespace-nowrap text-text-secondary">
              {formatDate(store.createdAt)}
            </Td>
            <Td>
              {/* السهم لليسار بالـ RTL بيعني "للأمام" — الصف كله قابل للنقر */}
              <ChevronLeft
                className="size-4 text-text-secondary"
                aria-hidden="true"
              />
            </Td>
          </tr>
        ))}
      </tbody>
    </TableShell>
  );
}

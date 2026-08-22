"use client";

import { BadgeCheck, ChevronLeft, Store as StoreIcon } from "lucide-react";
import { TableShell, Td, Thead } from "@/components/ui/Table";
import StatusBadge from "./StatusBadge";
import { ENTITY_STATUS } from "@/lib/admin/status";
import type { AdminStoreListItem } from "@/lib/admin/types";
import { formatDate, formatNumber } from "@/lib/format";
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
                  <span className="truncate font-bold text-heading">
                    {store.name}
                  </span>
                  {store.isVerified && (
                    <BadgeCheck
                      className="size-4 shrink-0 text-info"
                      aria-label={t.admin.stores.verified}
                    />
                  )}
                </span>
              </div>
            </Td>
            <Td className="text-text-secondary">{store.ownerName}</Td>
            <Td className="text-text-secondary">
              {store.city ?? t.admin.common.none}
            </Td>
            <Td className="ltr-nums">{formatNumber(store.productsCount)}</Td>
            <Td className="ltr-nums">{formatNumber(store.ordersCount)}</Td>
            <Td>
              <StatusBadge meta={ENTITY_STATUS[store.status]} />
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

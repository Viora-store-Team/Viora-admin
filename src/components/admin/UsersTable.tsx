"use client";

import { ChevronLeft, MailCheck, MailX } from "lucide-react";
import { TableShell, Td, Thead } from "@/components/ui/Table";
import StatusBadge from "./StatusBadge";
import { accountStatus, ROLE_LABEL } from "@/lib/admin/status";
import type { AdminUserListItem } from "@/lib/admin/types";
import { formatDate, formatNumber } from "@/lib/format";
import { isBrokenText, textOrNull } from "@/lib/brokenText";
import { t } from "@/lib/strings";

const COLUMNS = [
  t.admin.users.colUser,
  t.admin.users.colRole,
  t.admin.users.colStore,
  t.admin.users.colOrders,
  t.admin.users.colStatus,
  t.admin.users.colCreated,
  "",
] as const;

export default function UsersTable({
  users,
  onOpen,
}: {
  users: AdminUserListItem[];
  onOpen: (id: number) => void;
}) {
  return (
    <TableShell minWidth="min-w-[860px]">
      <Thead columns={COLUMNS} />
      <tbody className="divide-y divide-border/60">
        {users.map((user) => (
          <tr
            key={`${user.role}-${user.id}`}
            className="cursor-pointer bg-surface transition hover:bg-primary-soft/40"
            onClick={() => onOpen(user.id)}
          >
            <Td>
              <div className="flex items-center gap-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-full bg-field-bg text-sm font-bold text-text-secondary">
                  {/* الحرف الأول من اسم مكسور بيطلع رمز مكسّر كمان */}
                  {isBrokenText(user.name)
                    ? "#"
                    : user.name.charAt(0).toUpperCase()}
                </span>
                <div className="min-w-0">
                  <p className="truncate font-bold text-heading">
                    {isBrokenText(user.name) ? (
                      <span className="ltr-nums text-text-secondary">
                        {t.admin.users.brokenName}
                        {user.id}
                      </span>
                    ) : (
                      user.name
                    )}
                  </p>
                  <p className="ltr-nums flex items-center gap-1 truncate text-xs text-text-secondary">
                    {user.emailVerified ? (
                      <MailCheck
                        className="size-3.5 shrink-0 text-success"
                        aria-label={t.admin.users.emailVerified}
                      />
                    ) : (
                      <MailX
                        className="size-3.5 shrink-0 text-warning"
                        aria-label={t.admin.users.emailNotVerified}
                      />
                    )}
                    {user.email}
                  </p>
                </div>
              </div>
            </Td>
            <Td>
              <StatusBadge meta={ROLE_LABEL[user.role]} />
            </Td>
            {/* المتجر متداخل — `store` بيكون null للزبون */}
            <Td className="text-text-secondary">
              {textOrNull(user.store?.name) ?? t.admin.common.none}
            </Td>
            <Td className="ltr-nums">{formatNumber(user.ordersCount)}</Td>
            <Td>
              <StatusBadge meta={accountStatus(user.isActive)} />
            </Td>
            <Td className="ltr-nums whitespace-nowrap text-text-secondary">
              {formatDate(user.createdAt)}
            </Td>
            <Td>
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

"use client";

import { ChevronLeft } from "lucide-react";
import { TableShell, Td, Thead } from "@/components/ui/Table";
import StatusBadge from "./StatusBadge";
import { SUPPORT_TICKET_STATUS } from "@/lib/admin/status";
import type { AdminSupportTicket } from "@/lib/admin/types";
import { formatDate } from "@/lib/format";
import { t } from "@/lib/strings";

const COLUMNS = [
  t.admin.support.colSubject,
  t.admin.support.colMerchant,
  t.admin.support.colStatus,
  t.admin.support.colCreated,
  "",
] as const;

export default function SupportTicketsTable({
  tickets,
  onOpen,
}: {
  tickets: AdminSupportTicket[];
  onOpen: (id: number) => void;
}) {
  return (
    <TableShell minWidth="min-w-[760px]">
      <Thead columns={COLUMNS} />
      <tbody className="divide-y divide-border/60">
        {tickets.map((ticket) => (
          <tr
            key={ticket.id}
            className="cursor-pointer bg-surface transition hover:bg-primary-soft/40"
            onClick={() => onOpen(ticket.id)}
          >
            <Td className="max-w-[320px]">
              <p className="line-clamp-1 font-bold text-heading">{ticket.subject}</p>
              <p className="mt-1 line-clamp-1 text-xs text-text-secondary">
                {ticket.message}
              </p>
            </Td>
            <Td>
              <p className="font-semibold text-heading">{ticket.user.name}</p>
              <p className="mt-1 text-xs text-text-secondary" dir="ltr">
                {ticket.user.email}
              </p>
            </Td>
            <Td>
              <StatusBadge meta={SUPPORT_TICKET_STATUS[ticket.status]} />
            </Td>
            <Td className="ltr-nums whitespace-nowrap text-text-secondary">
              {formatDate(ticket.createdAt)}
            </Td>
            <Td>
              <ChevronLeft className="size-4 text-text-secondary" aria-hidden="true" />
            </Td>
          </tr>
        ))}
      </tbody>
    </TableShell>
  );
}

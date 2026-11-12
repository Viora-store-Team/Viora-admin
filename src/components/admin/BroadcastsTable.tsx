"use client";

import Badge from "@/components/ui/Badge";
import { TableShell, Td, Thead } from "@/components/ui/Table";
import { audienceLabel, linkTargetLabel } from "@/lib/admin/broadcast";
import type { Broadcast } from "@/lib/admin/types";
import { formatDateTime, formatNumber } from "@/lib/format";

const COLUMNS = ["التاريخ", "الإشعار", "الجمهور", "الزبائن", "الأجهزة", "وصل", "الرابط"] as const;

/** سجل الإرسال — الأحدث أولاً (ترتيب السيرفر). */
export default function BroadcastsTable({ rows }: { rows: Broadcast[] }) {
  return (
    <TableShell minWidth="min-w-[860px]">
      <Thead columns={COLUMNS} />
      <tbody className="divide-y divide-black/5">
        {rows.map((row) => (
          <tr key={row.id}>
            <Td className="whitespace-nowrap text-text-secondary">{formatDateTime(row.createdAt)}</Td>
            <Td className="max-w-xs">
              <p className="font-extrabold text-heading">{row.title}</p>
              <p className="truncate text-xs text-text-secondary" title={row.body}>
                {row.body}
              </p>
            </Td>
            <Td>
              <Badge tone={row.audience === "EMAILS" ? "info" : "primary"}>{audienceLabel(row)}</Badge>
            </Td>
            <Td className="ltr-nums">{formatNumber(row.recipients)}</Td>
            <Td className="ltr-nums">{formatNumber(row.devices)}</Td>
            <Td className="ltr-nums font-bold">{formatNumber(row.delivered)}</Td>
            <Td className="text-text-secondary">{linkTargetLabel(row.link)}</Td>
          </tr>
        ))}
      </tbody>
    </TableShell>
  );
}

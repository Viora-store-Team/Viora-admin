"use client";

import { ChevronLeft } from "lucide-react";
import { TableShell, Td, Thead } from "@/components/ui/Table";
import StatusBadge from "./StatusBadge";
import { REPORT_STATUS, REPORT_TARGET } from "@/lib/admin/status";
import type { AdminReportListItem } from "@/lib/admin/types";
import { formatDate } from "@/lib/format";
import { t } from "@/lib/strings";

const COLUMNS = [
  t.admin.reports.colTarget,
  t.admin.reports.colPreview,
  t.admin.reports.colReason,
  t.admin.reports.colReporter,
  t.admin.reports.colStatus,
  t.admin.reports.colCreated,
  "",
] as const;

export default function ReportsTable({
  reports,
  onOpen,
}: {
  reports: AdminReportListItem[];
  onOpen: (id: number) => void;
}) {
  return (
    <TableShell minWidth="min-w-[880px]">
      <Thead columns={COLUMNS} />
      <tbody className="divide-y divide-border/60">
        {reports.map((report) => (
          <tr
            key={report.id}
            className="cursor-pointer bg-surface transition hover:bg-primary-soft/40"
            onClick={() => onOpen(report.id)}
          >
            <Td>
              <StatusBadge meta={REPORT_TARGET[report.targetType]} />
            </Td>
            {/* اللقطة النصية بتيجي مع القائمة عشان الجدول ما يحتاج جلب إضافي */}
            <Td className="max-w-[260px]">
              <span className="line-clamp-2 text-text-secondary">
                {report.targetPreview}
              </span>
            </Td>
            <Td className="font-bold text-heading">{report.reason}</Td>
            <Td className="text-text-secondary">{report.reporter.name}</Td>
            <Td>
              <StatusBadge meta={REPORT_STATUS[report.status]} />
            </Td>
            <Td className="ltr-nums whitespace-nowrap text-text-secondary">
              {formatDate(report.createdAt)}
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

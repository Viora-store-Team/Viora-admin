import { t } from "@/lib/strings";

export interface InfoRow {
  label: string;
  /** null أو undefined بينعرضوا كشرطة بدل فراغ محيّر */
  value: React.ReactNode;
}

/**
 * عرض مفتاح/قيمة لصفحات التفاصيل.
 * القيم الفاضية بتنعرض كشرطة عشان يبان إن الحقل موجود بس بلا بيانات.
 */
export default function InfoGrid({ rows }: { rows: InfoRow[] }) {
  return (
    <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
      {rows.map((row) => (
        <div key={row.label} className="min-w-0">
          <dt className="text-xs font-semibold text-text-secondary">
            {row.label}
          </dt>
          <dd className="mt-1 text-sm font-bold break-words text-heading">
            {row.value === null || row.value === undefined || row.value === ""
              ? t.admin.common.none
              : row.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

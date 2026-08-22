import { cn } from "@/lib/cn";

/** غلاف الجدول — بيوحّد الحواف والتمرير الأفقي بدل ما يتكرر بكل صفحة */
export function TableShell({
  children,
  minWidth = "min-w-[640px]",
}: {
  children: React.ReactNode;
  minWidth?: string;
}) {
  return (
    <div className="overflow-hidden rounded-2xl bg-field-bg">
      <div className="overflow-x-auto">
        <table className={cn("w-full text-start text-sm", minWidth)}>
          {children}
        </table>
      </div>
    </div>
  );
}

export function Thead({ columns }: { columns: readonly string[] }) {
  return (
    <thead className="bg-black/5 text-xs text-text-secondary">
      <tr>
        {columns.map((col) => (
          <th key={col} scope="col" className="px-5 py-3 text-start font-bold">
            {col}
          </th>
        ))}
      </tr>
    </thead>
  );
}

export function Td({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <td className={cn("px-5 py-3", className)}>{children}</td>;
}

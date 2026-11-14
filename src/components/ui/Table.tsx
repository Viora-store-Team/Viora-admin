"use client";

import type { KeyboardEvent, MouseEvent, ReactNode } from "react";
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
    <div className="overflow-hidden rounded-2xl border border-border bg-surface">
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
    <thead className="bg-surface-muted text-[13px] font-medium text-text-secondary">
      <tr>
        {columns.map((col) => (
          <th key={col} scope="col" className="px-4 py-3 text-start font-medium">
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
  return <td className={cn("px-4 py-3.5", className)}>{children}</td>;
}

const INNER_CONTROL = "button, a, input, select, textarea, [role=combobox], [role=switch]";

export function Tr({ children, onClick, className }: { children: ReactNode; onClick?: () => void; className?: string }) {
  const isInnerControl = (target: EventTarget) => target instanceof Element && Boolean(target.closest(INNER_CONTROL));
  const handleClick = (event: MouseEvent<HTMLTableRowElement>) => {
    if (!isInnerControl(event.target)) onClick?.();
  };
  const handleKeyDown = (event: KeyboardEvent<HTMLTableRowElement>) => {
    if ((event.key === "Enter" || event.key === " ") && !isInnerControl(event.target)) {
      event.preventDefault();
      onClick?.();
    }
  };
  return <tr tabIndex={onClick ? 0 : undefined} onClick={onClick ? handleClick : undefined} onKeyDown={onClick ? handleKeyDown : undefined}
    className={cn("bg-surface", onClick && "cursor-pointer transition-colors duration-150 hover:bg-primary-soft focus-visible:bg-primary-soft", className)}>{children}</tr>;
}

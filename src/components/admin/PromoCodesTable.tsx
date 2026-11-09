"use client";

import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Spinner from "@/components/ui/Spinner";
import { TableShell, Td, Thead } from "@/components/ui/Table";
import { promoOwnerLabel, promoValueLabel } from "@/lib/admin/promo";
import type { AdminPromoCode } from "@/lib/admin/types";
import { formatDateTime, formatPrice } from "@/lib/format";

const COLUMNS = [
  "الكود",
  "الجهة",
  "الخصم",
  "الشروط",
  "المدة",
  "الاستعمال",
  "مجموع الخصم",
  "الحالة",
  "",
] as const;

function conditions(promo: AdminPromoCode): string {
  const parts = [
    promo.minOrder ? `حد أدنى ${formatPrice(promo.minOrder)}` : "",
    promo.maxDiscount ? `أقصى خصم ${formatPrice(promo.maxDiscount)}` : "",
  ].filter(Boolean);
  return parts.length ? parts.join(" · ") : "—";
}

function timing(promo: AdminPromoCode): string {
  if (promo.stoppedAt) return `موقوف ${formatDateTime(promo.stoppedAt)}`;
  if (promo.status === "ENDED") return `انتهى ${formatDateTime(promo.endsAt)}`;
  return `ينتهي ${formatDateTime(promo.endsAt)}`;
}

export default function PromoCodesTable({
  rows,
  stopping,
  onStop,
}: {
  rows: AdminPromoCode[];
  stopping: number | null;
  onStop: (promo: AdminPromoCode) => void;
}) {
  return (
    <TableShell minWidth="min-w-[960px]">
      <Thead columns={COLUMNS} />
      <tbody className="divide-y divide-black/5">
        {rows.map((promo) => (
          <tr key={promo.id}>
            <Td className="font-extrabold text-heading">
              <span dir="ltr">{promo.code}</span>
            </Td>
            <Td>
              <Badge tone={promo.owner === "PLATFORM" ? "primary" : "info"}>
                {promoOwnerLabel(promo)}
              </Badge>
            </Td>
            <Td>{promoValueLabel(promo)}</Td>
            <Td className="text-text-secondary">{conditions(promo)}</Td>
            <Td className="whitespace-nowrap text-text-secondary">{timing(promo)}</Td>
            <Td className="ltr-nums">{promo.usesCount}</Td>
            <Td className="ltr-nums font-bold">{formatPrice(promo.discountTotal)}</Td>
            <Td>
              <Badge tone={promo.status === "ACTIVE" ? "success" : "neutral"}>
                {promo.status === "ACTIVE" ? "فعّال" : "منتهي"}
              </Badge>
            </Td>
            <Td>
              {promo.status === "ACTIVE" && (
                <Button
                  variant="danger"
                  aria-label={`إيقاف ${promo.code}`}
                  disabled={stopping !== null}
                  onClick={() => onStop(promo)}
                >
                  {stopping === promo.id ? <Spinner variant="inline" /> : "إيقاف"}
                </Button>
              )}
            </Td>
          </tr>
        ))}
      </tbody>
    </TableShell>
  );
}

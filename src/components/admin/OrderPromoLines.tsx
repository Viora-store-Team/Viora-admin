import { orderPromoLines } from "@/lib/admin/promo";
import type { AdminOrderDetail } from "@/lib/admin/types";
import { formatCurrency } from "@/lib/format";

/** سطور كود الخصم بتفاصيل الطلب — ما بترسم شي لو الطلب بلا كود. */
export default function OrderPromoLines({ detail }: { detail: Pick<AdminOrderDetail, "money" | "group"> }) {
  const lines = orderPromoLines(detail);
  if (!lines.length) return null;
  return (
    <dl className="mt-4 grid gap-2 rounded-xl bg-surface-muted p-4 text-sm">
      {lines.map((line) => {
        const [label, value] =
          line.kind === "code"
            ? ["كود الخصم", <span key="v"><span dir="ltr" className="font-bold">{line.code}</span> ({line.fundedBy === "PLATFORM" ? "على حساب Viora" : "على حساب المتجر"})</span>]
            : line.kind === "discount"
              ? ["الخصم", `− ${formatCurrency(line.amount)}`]
              : line.kind === "waived"
                ? ["توصيل مجاني", `− ${formatCurrency(line.amount)}`]
                : ["الإجمالي بعد الخصم", formatCurrency(line.amount)];
        return (
          <div key={line.kind} className="flex items-center justify-between gap-3">
            <dt className="font-bold text-text-secondary">{label}</dt>
            <dd className="ltr-nums font-bold text-heading">{value}</dd>
          </div>
        );
      })}
    </dl>
  );
}

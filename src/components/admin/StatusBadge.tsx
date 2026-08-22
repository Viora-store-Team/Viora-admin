import Badge, { type BadgeTone } from "@/components/ui/Badge";

/**
 * شارة حالة بتقرأ من خرائط lib/admin/status.ts.
 * الغرض إن التسمية واللون ييجوا من مصدر واحد بدل ما ينكتبوا بكل جدول.
 */
export default function StatusBadge({
  meta,
  className,
}: {
  meta: { label: string; tone: BadgeTone };
  className?: string;
}) {
  return (
    <Badge tone={meta.tone} className={className}>
      {meta.label}
    </Badge>
  );
}

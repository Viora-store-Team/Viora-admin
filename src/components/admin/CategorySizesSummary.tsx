import { Tag } from "lucide-react";
import Badge from "@/components/ui/Badge";
import type { AdminCategoryNode } from "@/lib/admin/types";
import { t } from "@/lib/strings";

const PREVIEW = 4;

/**
 * ملخص مقاسات التصنيف: «بدون مقاس» أو أول ٤ مقاسات و«+N».
 * بيستبدل شارة sizeGroup القديمة بالشجرة والتفاصيل (كانت منسوخة بالمكانين).
 * الرئيسي بلا مقاسات → null.
 */
export default function CategorySizesSummary({ node }: { node: AdminCategoryNode }) {
  if (node.parentId === null) return null;

  if (node.noSizes) {
    return (
      <Badge tone="neutral">
        <Tag className="size-3" aria-hidden="true" />
        <span>{t.admin.categories.sizesSummaryNone}</span>
      </Badge>
    );
  }

  const sizes = node.sizes ?? [];
  if (sizes.length === 0) {
    return <Badge tone="warning">{t.admin.categories.sizesSummaryMissing}</Badge>;
  }

  const shown = sizes.slice(0, PREVIEW).map((size) => size.name);
  const rest = sizes.length - shown.length;
  return (
    <Badge tone="info">
      <Tag className="size-3" aria-hidden="true" />
      <span className="ltr-nums">
        {shown.join(" · ")}
        {rest > 0 ? ` +${rest}` : ""}
      </span>
    </Badge>
  );
}

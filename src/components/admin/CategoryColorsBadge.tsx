import { Palette } from "lucide-react";
import Badge from "@/components/ui/Badge";
import type { AdminCategoryNode } from "@/lib/admin/types";
import { t } from "@/lib/strings";

/**
 * شارة «بدون ألوان» للتصنيف الفرعي. بالشجرة بتظهر لما التصنيف بلا ألوان بس؛
 * بالتفاصيل (`showWhenHasColors`) بتعرض الحالتين. الرئيسي → null.
 */
export default function CategoryColorsBadge({
  node,
  showWhenHasColors = false,
}: {
  node: AdminCategoryNode;
  showWhenHasColors?: boolean;
}) {
  if (node.parentId === null) return null;

  if (node.noColors) {
    return (
      <Badge tone="neutral">
        <Palette className="size-3" aria-hidden="true" />
        <span>{t.admin.categories.colorsSummaryNone}</span>
      </Badge>
    );
  }
  if (!showWhenHasColors) return null;
  return (
    <Badge tone="info">
      <Palette className="size-3" aria-hidden="true" />
      <span>{t.admin.categories.colorsSummaryHas}</span>
    </Badge>
  );
}

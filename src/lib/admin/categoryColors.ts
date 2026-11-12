/*
  منطق «بدون ألوان» للتصنيف (بلا React وبلا شبكة) — مفحوص بـ tests/unit/categoryColors.test.mjs.
*/
import type { ApiResponse } from "../api";

export const CATEGORY_COLORS_IN_USE = "CATEGORY_COLORS_IN_USE";

/** السيرفر بيرجّع أول 20 رقم منتج بس — لو وصلنا الحد العدد الحقيقي ممكن يكون أكبر */
export const COLORS_IN_USE_LIST_CAP = 20;

/**
 * رسالة رفض 409 `CATEGORY_COLORS_IN_USE` مع عدد المنتجات (من `details.productIds`)،
 * أو null لو الرد مش هالخطأ.
 */
export function colorsInUseMessage(res: ApiResponse): string | null {
  if (res.status !== 409 || res.errorCode !== CATEGORY_COLORS_IN_USE) return null;

  const details = (res.details ?? {}) as { productIds?: unknown };
  const count = Array.isArray(details.productIds) ? details.productIds.length : 0;

  let subject = "في منتجات بأكثر من لون";
  if (count === 1) subject = "في منتج واحد بأكثر من لون";
  else if (count === 2) subject = "في منتجان بأكثر من لون";
  else if (count >= COLORS_IN_USE_LIST_CAP) subject = `في ${COLORS_IN_USE_LIST_CAP} منتج أو أكثر بأكثر من لون`;
  else if (count > 2) subject = `في ${count} منتجات بأكثر من لون`;

  return `ما بنقدر نفعّل «بدون ألوان»: ${subject} بهالتصنيف. خلّي لكل منتج لونًا واحدًا أو انقله لتصنيف ثاني، وبعدين جرّب من جديد.`;
}

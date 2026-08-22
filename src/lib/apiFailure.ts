import type { ApiErrors, ApiResponse } from "@/lib/api";

/**
 * تصنيف الردود الفاشلة حسب كود الحالة — بمعزل عن شكل أخطاء الحقول.
 *
 * ليش منفصل عن lib/products/errors.ts: منطق «شو معنى 401 و403 و404» واحد
 * بكل المشروع، بس شكل أخطاء الحقول مختلف — المنتجات إلها مفاتيح مهيكلة
 * (variants[0].sizes[1].stock) بينما مسارات الأدمن مفاتيحها مسطّحة.
 * فبنشارك التصنيف وبنترك فكّ الحقول لكل نطاق.
 */

export const FAILURE_FALLBACK = "صار خطأ غير متوقع. جرّب مرة ثانية.";

export type FailureKind =
  | "validation"
  | "unauthorized"
  | "forbidden"
  /** 404 على إنشاء منتج = «ما عندك متجر» — خاص بنطاق المنتجات */
  | "noStore"
  | "notFound"
  | "network"
  | "unknown";

export interface StatusFailure {
  kind: FailureKind;
  message: string;
  /** خريطة أخطاء الحقول الخام — بتنفكّ حسب النطاق */
  errors?: ApiErrors;
}

export function classifyStatus(
  res: ApiResponse,
  opts: { isCreate?: boolean } = {},
): StatusFailure {
  const message = res.message || FAILURE_FALLBACK;

  if (res.status === 0) return { kind: "network", message };
  if (res.status === 401) return { kind: "unauthorized", message };
  if (res.status === 403) return { kind: "forbidden", message };

  if (res.status === 400) {
    return { kind: "validation", message, errors: res.errors };
  }

  if (res.status === 404) {
    if (opts.isCreate || message.includes("متجر")) {
      return { kind: "noStore", message };
    }
    return { kind: "notFound", message };
  }

  return { kind: "unknown", message };
}

import type { BadgeTone } from "@/components/ui/Badge";
import { t } from "@/lib/strings";
import type {
  DeliveryStatus,
  ReportStatus,
  ReportTarget,
  ReviewTarget,
  StoreStatus,
} from "./types";

/**
 * المصدر الوحيد لتسمية ولون كل حالة بلوحة الأدمن — نفس أسلوب lib/orderStatus.ts.
 * بلاها بتتكرر الخرائط بالجداول وصفحات التفاصيل وبتطلع ألوان مختلفة لنفس الحالة.
 */

interface StatusMeta {
  label: string;
  tone: BadgeTone;
}

/**
 * حالة الحساب — مشتقّة من `isActive` مش من حقل حالة.
 *
 * دالة مش خريطة، لأن الباك إند بيرجّع بولياني. خريطة بمفاتيح نصية كانت
 * بتضطرنا نخترع قيم `"ACTIVE"`/`"SUSPENDED"` ما بترجع من السيرفر أصلاً.
 */
export function accountStatus(isActive: boolean): StatusMeta {
  return isActive
    ? { label: t.admin.status.active, tone: "success" }
    : { label: t.admin.status.suspended, tone: "danger" };
}

/**
 * حالة مراجعة المتجر — خريطة منفصلة عن ENTITY_STATUS عمداً.
 *
 * الاتنين فيهن مفتاح PENDING بس بمعنيين مختلفين ("بانتظار المراجعة" للمتجر
 * ضد "بانتظار التوثيق" للحساب)، ودمجهن بخريطة وحدة بيخلّي أي صفحة تعرض
 * تسمية الكيان الغلط بلا ما يشتكي التصريف.
 */
export const STORE_STATUS: Record<StoreStatus, StatusMeta> = {
  PENDING: { label: t.admin.status.storePending, tone: "warning" },
  APPROVED: { label: t.admin.status.storeApproved, tone: "success" },
  REJECTED: { label: t.admin.status.storeRejected, tone: "danger" },
};

export const REPORT_STATUS: Record<ReportStatus, StatusMeta> = {
  OPEN: { label: t.admin.status.open, tone: "warning" },
  RESOLVED: { label: t.admin.status.resolved, tone: "success" },
  DISMISSED: { label: t.admin.status.dismissed, tone: "neutral" },
};

export const REPORT_STATUS_KEYS = [
  "OPEN",
  "RESOLVED",
  "DISMISSED",
] as const satisfies readonly ReportStatus[];

export const REPORT_TARGET: Record<ReportTarget, StatusMeta> = {
  REVIEW: { label: t.admin.reports.targetReview, tone: "info" },
  PRODUCT: { label: t.admin.reports.targetProduct, tone: "primary" },
  STORE: { label: t.admin.reports.targetStore, tone: "neutral" },
};

export const REPORT_TARGET_KEYS = [
  "REVIEW",
  "PRODUCT",
  "STORE",
] as const satisfies readonly ReportTarget[];

export const REVIEW_TARGET: Record<ReviewTarget, string> = {
  PRODUCT: t.admin.reports.reviewOnProduct,
  STORE: t.admin.reports.reviewOnStore,
};

export const DELIVERY_STATUS: Record<DeliveryStatus, StatusMeta> = {
  UP: { label: t.admin.delivery.up, tone: "success" },
  DEGRADED: { label: t.admin.delivery.degraded, tone: "warning" },
  DOWN: { label: t.admin.delivery.down, tone: "danger" },
};

/** الأدوار — نفس القيم اللي بيرجّعها /auth/me */
export const ROLE_LABEL: Record<"MERCHANT" | "CUSTOMER", StatusMeta> = {
  MERCHANT: { label: t.admin.users.merchant, tone: "primary" },
  CUSTOMER: { label: t.admin.users.customer, tone: "info" },
};

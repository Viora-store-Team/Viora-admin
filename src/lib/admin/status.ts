import type { BadgeTone } from "@/components/ui/Badge";
import { t } from "@/lib/strings";
import type {
  DeliveryStatus,
  EntityStatus,
  ReportStatus,
  ReportTarget,
  ReviewTarget,
} from "./types";

/**
 * المصدر الوحيد لتسمية ولون كل حالة بلوحة الأدمن — نفس أسلوب lib/orderStatus.ts.
 * بلاها بتتكرر الخرائط بالجداول وصفحات التفاصيل وبتطلع ألوان مختلفة لنفس الحالة.
 */

interface StatusMeta {
  label: string;
  tone: BadgeTone;
}

export const ENTITY_STATUS: Record<EntityStatus, StatusMeta> = {
  ACTIVE: { label: t.admin.status.active, tone: "success" },
  SUSPENDED: { label: t.admin.status.suspended, tone: "danger" },
  PENDING: { label: t.admin.status.pending, tone: "warning" },
};

export const ENTITY_STATUS_KEYS = [
  "ACTIVE",
  "SUSPENDED",
  "PENDING",
] as const satisfies readonly EntityStatus[];

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

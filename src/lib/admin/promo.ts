/*
  منطق أكواد الخصم الصرف (بلا React وبلا شبكة) — مفحوص بـ tests/unit/promo.test.mjs.
  بيستورد أنواع بس (بتنشال وقت التشغيل) عشان node --test يقدر يحمّله.
*/
import type { ApiResponse } from "../api";
import type {
  AdminOrderDetail,
  AdminPromoCode,
  PromoCreateBody,
  PromoDuration,
  PromoType,
} from "./types";

export const PROMO_MESSAGES = {
  code: "الكود من 4 لـ 20 حرف إنجليزي أو رقم",
  percent: "النسبة رقم صحيح من 1 لـ 90",
  money: "مبلغ موجب بخانتين عشريتين بالأكثر",
  endMissing: "اختر وقت انتهاء الكود",
  endRange: "النهاية لازم تكون بعد ساعة على الأقل وخلال 90 يوم",
  taken: "هذا الكود مستخدم، اختر كوداً آخر",
} as const;

/** قيم النموذج كما بالحقول (نصوص). `customEnd` قيمة `datetime-local`. */
export interface PromoForm {
  code: string;
  type: PromoType;
  percent: string;
  maxDiscount: string;
  minOrder: string;
  duration: PromoDuration;
  customEnd: string;
}

export type PromoField = keyof PromoForm | "endsAt";
export type PromoFormErrors = Partial<Record<PromoField, string>>;

const CODE = /^[A-Z0-9]{4,20}$/;
const MONEY = /^\d+(\.\d{1,2})?$/;
const HOUR = 60 * 60 * 1000;
const MAX_CUSTOM = 90 * 24 * HOUR;

/** مبلغ اختياري: فاضي = غير مرسل، غلط = خطأ. */
function money(raw: string): number | null | "invalid" {
  const text = raw.trim();
  if (!text) return null;
  const value = Number(text);
  if (!MONEY.test(text) || !(value > 0)) return "invalid";
  return value;
}

/** بيبني جسم الإنشاء أو بيرجّع أخطاء الحقول. */
export function buildPromoBody(
  form: PromoForm,
  now: Date,
): { body: PromoCreateBody } | { errors: PromoFormErrors } {
  const errors: PromoFormErrors = {};
  const code = form.code.trim().toUpperCase();
  if (!CODE.test(code)) errors.code = PROMO_MESSAGES.code;

  const isPercent = form.type === "PERCENT";
  let percent: number | undefined;
  let maxDiscount: number | null = null;
  if (isPercent) {
    const text = form.percent.trim();
    const value = Number(text);
    if (!/^\d+$/.test(text) || value < 1 || value > 90) {
      errors.percent = PROMO_MESSAGES.percent;
    } else {
      percent = value;
    }
    const max = money(form.maxDiscount);
    if (max === "invalid") errors.maxDiscount = PROMO_MESSAGES.money;
    else maxDiscount = max;
  }

  const min = money(form.minOrder);
  if (min === "invalid") errors.minOrder = PROMO_MESSAGES.money;

  let endsAt: string | undefined;
  if (form.duration === "CUSTOM") {
    const end = form.customEnd ? new Date(form.customEnd) : null;
    if (!end || Number.isNaN(end.getTime())) {
      errors.endsAt = PROMO_MESSAGES.endMissing;
    } else {
      const left = end.getTime() - now.getTime();
      if (left < HOUR || left > MAX_CUSTOM) errors.endsAt = PROMO_MESSAGES.endRange;
      else endsAt = end.toISOString();
    }
  }

  if (Object.keys(errors).length) return { errors };
  // ترتيب المفاتيح ثابت (code, type, percent, maxDiscount, minOrder,
  // duration, endsAt) عشان جسم الطلب يطابق العقد حرفياً.
  return {
    body: {
      code,
      type: form.type,
      ...(percent !== undefined ? { percent } : {}),
      ...(maxDiscount !== null ? { maxDiscount } : {}),
      ...(min !== null && min !== "invalid" ? { minOrder: min } : {}),
      duration: form.duration,
      ...(endsAt ? { endsAt } : {}),
    },
  };
}

const FIELDS: PromoField[] = [
  "code",
  "type",
  "percent",
  "maxDiscount",
  "minOrder",
  "duration",
  "endsAt",
];

/** أخطاء السيرفر لكل حقل بالنموذج — الكود المحجوز برسالته الثابتة. */
export function serverPromoErrors(res: ApiResponse): PromoFormErrors {
  const fieldErrors = (res.fieldErrors ?? {}) as Record<string, { code?: string } | undefined>;
  const texts = (res.errors ?? {}) as Record<string, unknown>;
  const errors: PromoFormErrors = {};
  for (const field of FIELDS) {
    if (fieldErrors[field]?.code === "PROMO_CODE_TAKEN") {
      errors[field] = PROMO_MESSAGES.taken;
    } else if (typeof texts[field] === "string" && texts[field]) {
      errors[field] = texts[field] as string;
    }
  }
  if (!errors.code && res.errorCode === "PROMO_CODE_TAKEN") errors.code = PROMO_MESSAGES.taken;
  return errors;
}

export function promoValueLabel(promo: AdminPromoCode): string {
  return promo.type === "PERCENT" ? `خصم ${promo.percent ?? 0}%` : "توصيل مجاني";
}

export function promoOwnerLabel(promo: AdminPromoCode): string {
  return promo.owner === "PLATFORM" ? "Viora" : promo.store?.name ?? "متجر";
}

export type OrderPromoLine =
  | { kind: "code"; code: string; fundedBy: AdminPromoCode["owner"] }
  | { kind: "discount" | "waived" | "net"; amount: number };

const amount = (value: string | null | undefined): number => {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
};

/**
 * سطور الكود بتفاصيل الطلب (من أرقام السيرفر كما هي): الكود ومين موّله،
 * الخصم، التوصيل المعفى، والإجمالي بعد الخصم. فاضية بلا كود.
 */
export function orderPromoLines(detail: Pick<AdminOrderDetail, "money" | "group">): OrderPromoLine[] {
  const promo = detail.money?.promo;
  const groupPromo = detail.group?.promo;
  const code = promo?.code ?? groupPromo?.code;
  const fundedBy = promo?.fundedBy ?? groupPromo?.owner;
  if (!code || !fundedBy) return [];
  const lines: OrderPromoLine[] = [{ kind: "code", code, fundedBy }];
  const discount = amount(detail.money?.discount);
  if (discount > 0) lines.push({ kind: "discount", amount: discount });
  const waived = amount(detail.money?.deliveryWaived);
  if (waived > 0) lines.push({ kind: "waived", amount: waived });
  const net = detail.money?.payableTotal ?? detail.money?.finalTotal;
  if (net != null) lines.push({ kind: "net", amount: amount(net) });
  return lines;
}

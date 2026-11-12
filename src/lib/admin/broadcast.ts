/*
  منطق إشعارات الزبائن الصرف (بلا React وبلا شبكة) — مفحوص بـ
  tests/unit/broadcast.test.mjs. نفس قواعد الباك إند حرفياً.
*/
import type { ApiResponse } from "../api";
import type { Broadcast, BroadcastAudience, BroadcastBody } from "./types";

export const BROADCAST_LIMITS = { title: 100, body: 300, emails: 500 } as const;
export const SHARE_LINK_HOST = "link.vioragaza.com";

export const AUDIENCE_LABELS: Record<BroadcastAudience, string> = {
  ALL: "الكل",
  ANDROID: "أندرويد",
  IOS: "آيفون",
  EMAILS: "إيميلات محددة",
};

export const AUDIENCES: BroadcastAudience[] = ["ALL", "ANDROID", "IOS", "EMAILS"];

export const BROADCAST_MESSAGES = {
  title: "العنوان مطلوب",
  body: "نص الإشعار مطلوب",
  emailsRequired: "أضف إيميلاً واحداً على الأقل",
  emailsMax: `الحد الأقصى ${BROADCAST_LIMITS.emails} إيميل`,
  link: "الرابط لازم يكون رابط مشاركة لمتجر أو منتج من التطبيق",
  noRecipients: "لا يوجد زبائن مطابقون لهذا الاستهداف",
} as const;

export interface BroadcastForm {
  title: string;
  body: string;
  audience: BroadcastAudience;
  emails: string;
  link: string;
}

export type BroadcastField = "title" | "body" | "audience" | "emails" | "link";
export type BroadcastFormErrors = Partial<Record<BroadcastField, string>>;

/** يفكّ نصاً (فواصل/مسافات/أسطر)، يقصّ ويصغّر الأحرف ويشيل التكرار. */
export function parseEmails(text: string): string[] {
  const seen = new Set<string>();
  for (const part of text.split(/[\s,;،]+/)) {
    const email = part.trim().toLowerCase();
    if (email) seen.add(email);
  }
  return [...seen];
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** رابط مشاركة: https + المضيف الرسمي + /p/<id> أو /s/<id> فقط. */
export function isShareLink(url: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(url.trim());
  } catch {
    return false;
  }
  return (
    parsed.protocol === "https:" &&
    parsed.host === SHARE_LINK_HOST &&
    /^\/[ps]\/[1-9]\d*$/.test(parsed.pathname)
  );
}

/** يبني الجسم أو يرجّع أخطاء الحقول. */
export function buildBroadcastBody(
  form: BroadcastForm,
): { body: BroadcastBody } | { errors: BroadcastFormErrors } {
  const errors: BroadcastFormErrors = {};
  const title = form.title.trim();
  const body = form.body.trim();
  const link = form.link.trim();
  if (!title) errors.title = BROADCAST_MESSAGES.title;
  if (!body) errors.body = BROADCAST_MESSAGES.body;
  if (link && !isShareLink(link)) errors.link = BROADCAST_MESSAGES.link;

  let emails: string[] = [];
  if (form.audience === "EMAILS") {
    emails = parseEmails(form.emails);
    const bad = emails.find((e) => !EMAIL.test(e));
    if (emails.length === 0) errors.emails = BROADCAST_MESSAGES.emailsRequired;
    else if (emails.length > BROADCAST_LIMITS.emails) errors.emails = BROADCAST_MESSAGES.emailsMax;
    else if (bad) errors.emails = `إيميل غير صالح: ${bad}`;
  }

  if (Object.keys(errors).length) return { errors };
  return {
    body: {
      title,
      body,
      audience: form.audience,
      ...(form.audience === "EMAILS" ? { emails } : {}),
      ...(link ? { link } : {}),
    },
  };
}

const FIELDS: BroadcastField[] = ["title", "body", "audience", "emails", "link"];

/** أخطاء السيرفر لكل حقل (نصوص `errors`)، و`BROADCAST_NO_RECIPIENTS` برسالته. */
export function serverBroadcastErrors(res: ApiResponse): {
  fields: BroadcastFormErrors;
  general: string;
} {
  const texts = (res.errors ?? {}) as Record<string, unknown>;
  const fields: BroadcastFormErrors = {};
  for (const field of FIELDS) {
    if (typeof texts[field] === "string" && texts[field]) fields[field] = texts[field] as string;
  }
  const general = res.errorCode === "BROADCAST_NO_RECIPIENTS" ? BROADCAST_MESSAGES.noRecipients : "";
  return { fields, general };
}

/** هدف الرابط للعرض بالجدول: «متجر #12» / «منتج #5» / «—». */
export function linkTargetLabel(link: string | null | undefined): string {
  if (!link) return "—";
  const match = /\/([ps])\/(\d+)\/?$/.exec(link);
  if (!match) return "رابط";
  return `${match[1] === "s" ? "متجر" : "منتج"} #${match[2]}`;
}

export function audienceLabel(item: Pick<Broadcast, "audience" | "emails">): string {
  const label = AUDIENCE_LABELS[item.audience];
  return item.audience === "EMAILS" ? `${label} (${item.emails.length})` : label;
}

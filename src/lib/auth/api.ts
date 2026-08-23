import { apiFetch, type ApiResponse } from "@/lib/api";
import type { AuthUser, Role } from "./types";

/** الدور الوحيد اللي بيسمح بالدخول لهاد التطبيق */
export const ADMIN_ROLE: Role = "ADMIN";

/** رد POST /admin/login و GET /admin/me */
export type SessionResponse = ApiResponse & {
  user?: AuthUser;
  token?: string;
};

/**
 * دخول الأدمن — مسار **منفصل** عن `/auth/login`.
 *
 * `/auth/login` بيخدم التجار والزبائن؛ حساب الأدمن ما بيمرّ منه. الرد نفس
 * شكل رد التسجيل بالضبط: `user` + `token`.
 *
 * أكواد الفشل زي باقي مسارات الدخول: 400 حقل ناقص · 401 بيانات غلط ·
 * 403 حساب موقوف · 429 محاولات كتير. الرسائل جاهزة بالعربي من السيرفر.
 */
export function adminLogin(
  email: string,
  password: string,
): Promise<SessionResponse> {
  return apiFetch("/admin/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

/**
 * الجلسة الحالية.
 *
 * `/admin/me` مش `/auth/me`: الاتنين بيرجّعوا نفس الشكل بتوكن أدمن، بس
 * `/auth/me` بيقبل توكن تاجر أو زبون كمان. استعمال المسار المحمي بالدور
 * بيخلّي السيرفر يرفض التوكن الغلط بدل ما نعتمد على فحص الدور بالواجهة.
 */
export function getMe(): Promise<SessionResponse> {
  return apiFetch("/admin/me", { cache: "no-store" });
}

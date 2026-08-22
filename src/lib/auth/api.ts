import { apiFetch, type ApiResponse } from "@/lib/api";
import type { AuthUser, Role } from "./types";

/**
 * الدور اللي بيسمح بالدخول لهاد التطبيق.
 *
 * ⚠️ مؤقت — ما في دور ADMIN بالعقد لهلق، فبوابة الدور بـ AuthContext
 * لسا بتقيس على MERCHANT. لما يوصل دخول الأدمن بينقلب هاد لـ "ADMIN".
 */
export const MERCHANT_ROLE: Role = "MERCHANT";

/** رد GET /auth/me */
export type SessionResponse = ApiResponse & {
  user?: AuthUser;
  token?: string;
};

export function getMe(): Promise<SessionResponse> {
  return apiFetch("/auth/me", { cache: "no-store" });
}

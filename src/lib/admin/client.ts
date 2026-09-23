import { apiFetch, type ApiResponse } from "@/lib/api";

// Mock is an explicit development choice, never a production fallback.
export const ADMIN_FORCE_MOCK = process.env.NODE_ENV === "development" &&
  process.env.NEXT_PUBLIC_ADMIN_MOCK === "true";

export function isLiveEndpoint(endpoint: string): boolean {
  return Boolean(endpoint) && !ADMIN_FORCE_MOCK;
}

export function isLivePage(pathname: string): boolean {
  return Boolean(pathname) && !ADMIN_FORCE_MOCK;
}

export async function adminFetch(endpoint: string, options: RequestInit = {}): Promise<ApiResponse> {
  if (ADMIN_FORCE_MOCK) {
    const { mockFetch } = await import("./mock");
    return mockFetch(endpoint, options);
  }
  const result = await apiFetch(endpoint, options);
  if (result.status === 404 && /^\/admin\/(reports|delivery|reviews)(\/|\?|$)/.test(endpoint)) {
    return { ...result, message: "هذه الميزة غير متاحة من الخادم حالياً. أعد المحاولة لاحقاً." };
  }
  return result;
}

export function query(params: Record<string, string | number | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === "") continue;
    search.set(key, String(value));
  }
  return search.size ? `?${search}` : "";
}

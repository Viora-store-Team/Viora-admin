import { apiFetch, type ApiResponse } from "@/lib/api";
import { mockFetch } from "./mock";

/**
 * الموجّه بين الباك إند الحقيقي والبيانات التجريبية — **لكل مسار على حدة**.
 *
 * القسم مربوط على مرحلتين لأن الباك إند وصّل جزء من المسارات بس. بدل ما
 * القسم كله يكون تجريبي أو كله حقيقي، كل مسار بيروح على مصدره:
 *
 * - `/admin/stats` · `/admin/stores*` · `/admin/users*` · `/admin/categories*`
 *   → السيرفر الحقيقي
 * - الباقي (بلاغات · محتوى · توصيل) → mock/
 *
 * لما يوصل أي مسار جديد من الباك إند: ضيف بادئته لـ `LIVE_PREFIXES` وضيف
 * صفحته لـ `LIVE_PAGES`. لما توصل كلها: احذف mock/ وخلّي الجسم `apiFetch`
 * مباشرة. ولا صفحة بتتغيّر — الصفحات بتستورد من api.ts بس.
 */
const LIVE_PREFIXES = [
  "/admin/stats",
  "/admin/stores",
  "/admin/users",
  "/admin/ratings",
  "/admin/categories",
  "/admin/occasions",
  "/admin/collections",
  "/admin/content",
  "/admin/orders",
  "/notifications",
] as const;

/**
 * مسارات الصفحات اللي بتقرأ من السيرفر الحقيقي — بتغذّي شريط التنبيه بس.
 * مطابقة **بادئة**: `/stores/18` بتنحسب تحت `/stores`.
 */
const LIVE_PAGES = ["/", "/stores", "/users", "/categories", "/reviews", "/content"] as const;

/**
 * مفتاح طوارئ: `NEXT_PUBLIC_ADMIN_MOCK=true` بيرجّع **كل** المسارات
 * للبيانات التجريبية.
 *
 * موجود لأن الاستضافة مجانية والسيرفر بينام بعد ~15 دقيقة — لما تشتغل
 * على شغل واجهة بحت، هذا بيوفّر عليك انتظار 60 ثانية بكل إقلاع.
 *
 * ⚠️ Next بيحقن NEXT_PUBLIC_* وقت البناء — لازم تعيد تشغيل سيرفر التطوير.
 */
export const ADMIN_FORCE_MOCK = process.env.NEXT_PUBLIC_ADMIN_MOCK === "true";

/** المسار بيروح على الباك إند الحقيقي؟ */
export function isLiveEndpoint(endpoint: string): boolean {
  if (ADMIN_FORCE_MOCK) return false;
  return LIVE_PREFIXES.some((prefix) => endpoint.startsWith(prefix));
}

/** الصفحة بتعرض بيانات حقيقية؟ — مستهلكها الوحيد MockNotice */
export function isLivePage(pathname: string): boolean {
  if (ADMIN_FORCE_MOCK) return false;
  return LIVE_PAGES.some(
    (page) => pathname === page || pathname.startsWith(`${page}/`),
  );
}

export function adminFetch(
  endpoint: string,
  options: RequestInit = {},
): Promise<ApiResponse> {
  return isLiveEndpoint(endpoint)
    ? apiFetch(endpoint, options)
    : mockFetch(endpoint, options);
}

/** بنّاء سلسلة الاستعلام — بيتجاهل القيم الفاضية بدل ما يبعث q= فاضية */
export function query(params: Record<string, string | number | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === "") continue;
    search.set(key, String(value));
  }
  const text = search.toString();
  return text ? `?${text}` : "";
}

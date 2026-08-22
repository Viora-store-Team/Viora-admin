import { apiFetch, type ApiResponse } from "@/lib/api";
import { mockFetch } from "./mock";

/**
 * المبدّل بين البيانات التجريبية والـ API الحقيقي.
 *
 * هاد الملف هو **نقطة التبديل الوحيدة** بالمشروع كله. لما توصل مسارات
 * /admin من الباك إند: حطّ NEXT_PUBLIC_ADMIN_MOCK=false بملف البيئة، جرّب،
 * وبعدها احذف mock/ وخلّي الجسم `apiFetch(...)` مباشرة. ولا صفحة بتتغيّر —
 * الصفحات بتستورد من api.ts بس، وما بتعرف مين اللي ردّ عليها.
 */
const USE_MOCK = process.env.NEXT_PUBLIC_ADMIN_MOCK !== "false";

export function adminFetch(
  endpoint: string,
  options: RequestInit = {},
): Promise<ApiResponse> {
  return USE_MOCK ? mockFetch(endpoint, options) : apiFetch(endpoint, options);
}

/** بتنعرض كشريط تنبيه بالقشرة عشان ما حدا يتلخبط ويحسب الأرقام حقيقية */
export const ADMIN_USING_MOCK = USE_MOCK;

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

import type { ApiResponse, Pagination } from "@/lib/api";
import { adminFetch, query } from "./client";
import type {
  AdminCategoryRoot,
  AdminOverview,
  AdminReportDetail,
  AdminReportListItem,
  AdminStoreDetail,
  AdminStoreListItem,
  AdminUserDetail,
  AdminUserListItem,
  Banner,
  BannerPayload,
  CategoryPayload,
  DeliveryFailure,
  DeliveryHealth,
  EntityStatus,
  HomeContent,
  OverviewRange,
  ReportStatus,
  ReportTarget,
  Review,
  StaticPage,
  StaticPageKey,
} from "./types";
import { ADMIN_LIMITS } from "./types";

/**
 * غلاف رقيق مكتوب الأنواع فوق adminFetch لكل مسارات الأدمن.
 * نفس أسلوب lib/products/api.ts — بلا أي منطق واجهة.
 *
 * ⚠️ هاد الملف هو **العقد المقترح على الباك إند**. أي تغيير بالمسارات أو
 * بأسماء المفاتيح لما يوصل العقد الحقيقي بيتم هون وبـ mock/ فقط.
 */

const json = (body: unknown): RequestInit => ({ body: JSON.stringify(body) });

type Paged<K extends string, T> = ApiResponse & {
  [P in K]?: T[];
} & { pagination?: Pagination };

export interface ListParams {
  page?: number;
  limit?: number;
  q?: string;
}

// ─── لوحة التحكم ───────────────────────────────────────────────

export function fetchOverview(
  range: OverviewRange,
): Promise<ApiResponse & { overview?: AdminOverview }> {
  return adminFetch(`/admin/overview${query({ range })}`);
}

// ─── المتاجر ───────────────────────────────────────────────────

export function fetchStores(
  params: ListParams & { status?: EntityStatus | "" } = {},
): Promise<Paged<"stores", AdminStoreListItem>> {
  return adminFetch(
    `/admin/stores${query({
      page: params.page ?? 1,
      limit: params.limit ?? ADMIN_LIMITS.pageLimit,
      q: params.q,
      status: params.status,
    })}`,
  );
}

export function fetchStore(
  id: number,
): Promise<ApiResponse & { store?: AdminStoreDetail }> {
  return adminFetch(`/admin/stores/${id}`);
}

export function verifyStore(
  id: number,
): Promise<ApiResponse & { store?: AdminStoreDetail }> {
  return adminFetch(`/admin/stores/${id}/verify`, { method: "POST" });
}

export function unverifyStore(
  id: number,
): Promise<ApiResponse & { store?: AdminStoreDetail }> {
  return adminFetch(`/admin/stores/${id}/verify`, { method: "DELETE" });
}

/** ⚠️ السبب إلزامي — بينحفظ بسجل التدقيق على السيرفر */
export function suspendStore(
  id: number,
  reason: string,
): Promise<ApiResponse & { store?: AdminStoreDetail }> {
  return adminFetch(`/admin/stores/${id}/suspend`, {
    method: "POST",
    ...json({ reason }),
  });
}

export function reactivateStore(
  id: number,
): Promise<ApiResponse & { store?: AdminStoreDetail }> {
  return adminFetch(`/admin/stores/${id}/reactivate`, { method: "POST" });
}

// ─── المستخدمون ────────────────────────────────────────────────

export function fetchUsers(
  params: ListParams & { role?: string; status?: EntityStatus | "" } = {},
): Promise<Paged<"users", AdminUserListItem>> {
  return adminFetch(
    `/admin/users${query({
      page: params.page ?? 1,
      limit: params.limit ?? ADMIN_LIMITS.pageLimit,
      q: params.q,
      role: params.role,
      status: params.status,
    })}`,
  );
}

export function fetchUser(
  id: number,
): Promise<ApiResponse & { user?: AdminUserDetail }> {
  return adminFetch(`/admin/users/${id}`);
}

/** ⚠️ السبب إلزامي */
export function suspendUser(
  id: number,
  reason: string,
): Promise<ApiResponse & { user?: AdminUserDetail }> {
  return adminFetch(`/admin/users/${id}/suspend`, {
    method: "POST",
    ...json({ reason }),
  });
}

export function reactivateUser(
  id: number,
): Promise<ApiResponse & { user?: AdminUserDetail }> {
  return adminFetch(`/admin/users/${id}/reactivate`, { method: "POST" });
}

// ─── التصنيفات ─────────────────────────────────────────────────

/* كل عمليات التصنيفات بترجّع الشجرة الكاملة بعد التعديل — أبسط من إعادة
   الجلب، وبيضمن إن الواجهة والسيرفر متفقين على الشكل النهائي. */

export function fetchAdminCategories(): Promise<
  ApiResponse & { categories?: AdminCategoryRoot[] }
> {
  return adminFetch("/admin/categories");
}

export function createCategory(
  payload: CategoryPayload,
): Promise<ApiResponse & { categories?: AdminCategoryRoot[] }> {
  return adminFetch("/admin/categories", { method: "POST", ...json(payload) });
}

/** ⚠️ الاسم والصورة بس — sizeGroup ما بينعدّل (بيبطّل الـ variantSizeId) */
export function updateCategory(
  id: number,
  payload: Pick<CategoryPayload, "name" | "imageUrl">,
): Promise<ApiResponse & { categories?: AdminCategoryRoot[] }> {
  return adminFetch(`/admin/categories/${id}`, {
    method: "PATCH",
    ...json(payload),
  });
}

// ─── البلاغات والتقييمات ───────────────────────────────────────

export function fetchReports(
  params: ListParams & { targetType?: ReportTarget | ""; status?: ReportStatus | "" } = {},
): Promise<Paged<"reports", AdminReportListItem>> {
  return adminFetch(
    `/admin/reports${query({
      page: params.page ?? 1,
      limit: params.limit ?? ADMIN_LIMITS.pageLimit,
      q: params.q,
      targetType: params.targetType,
      status: params.status,
    })}`,
  );
}

export function fetchReport(
  id: number,
): Promise<ApiResponse & { report?: AdminReportDetail }> {
  return adminFetch(`/admin/reports/${id}`);
}

export function updateReport(
  id: number,
  payload: { status?: ReportStatus; note?: string },
): Promise<ApiResponse & { report?: AdminReportDetail }> {
  return adminFetch(`/admin/reports/${id}`, { method: "PATCH", ...json(payload) });
}

/**
 * ⚠️ الإخفاء بيحجب التقييم **عن الزبون بس** — التاجر بيضل يشوفه.
 * السبب إلزامي وبينحفظ بسجل التدقيق.
 */
export function hideReview(
  id: number,
  reason: string,
): Promise<ApiResponse & { review?: Review }> {
  return adminFetch(`/admin/reviews/${id}/hide`, {
    method: "POST",
    ...json({ reason }),
  });
}

export function unhideReview(
  id: number,
): Promise<ApiResponse & { review?: Review }> {
  return adminFetch(`/admin/reviews/${id}/unhide`, { method: "POST" });
}

// ─── المحتوى ───────────────────────────────────────────────────

export function fetchHomeContent(): Promise<
  ApiResponse & { home?: HomeContent }
> {
  return adminFetch("/admin/content/home");
}

export function saveHomeContent(
  payload: HomeContent,
): Promise<ApiResponse & { home?: HomeContent }> {
  return adminFetch("/admin/content/home", { method: "PUT", ...json(payload) });
}

export function fetchStaticPages(): Promise<
  ApiResponse & { pages?: StaticPage[] }
> {
  return adminFetch("/admin/content/pages");
}

export function saveStaticPage(
  key: StaticPageKey,
  payload: { title: string; body: string },
): Promise<ApiResponse & { page?: StaticPage }> {
  return adminFetch(`/admin/content/pages/${key}`, {
    method: "PUT",
    ...json(payload),
  });
}

export function fetchBanners(): Promise<ApiResponse & { banners?: Banner[] }> {
  return adminFetch("/admin/banners");
}

export function createBanner(
  payload: BannerPayload,
): Promise<ApiResponse & { banners?: Banner[] }> {
  return adminFetch("/admin/banners", { method: "POST", ...json(payload) });
}

export function updateBanner(
  id: number,
  payload: Partial<BannerPayload>,
): Promise<ApiResponse & { banners?: Banner[] }> {
  return adminFetch(`/admin/banners/${id}`, { method: "PATCH", ...json(payload) });
}

export function deleteBanner(
  id: number,
): Promise<ApiResponse & { banners?: Banner[] }> {
  return adminFetch(`/admin/banners/${id}`, { method: "DELETE" });
}

// ─── التوصيل ───────────────────────────────────────────────────

export function fetchDeliveryHealth(): Promise<
  ApiResponse & { health?: DeliveryHealth }
> {
  return adminFetch("/admin/delivery/health");
}

export function fetchDeliveryFailures(
  params: ListParams = {},
): Promise<Paged<"failures", DeliveryFailure>> {
  return adminFetch(
    `/admin/delivery/failures${query({
      page: params.page ?? 1,
      limit: params.limit ?? ADMIN_LIMITS.pageLimit,
    })}`,
  );
}

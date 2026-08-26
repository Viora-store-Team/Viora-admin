import type { ApiResponse, Pagination } from "@/lib/api";
import { adminFetch, query } from "./client";
import type {
  AdminCategoryNode,
  AdminCategoryRoot,
  AdminReportDetail,
  AdminReportListItem,
  AdminStatsCharts,
  AdminStoreDetail,
  AdminStoreListItem,
  AdminUserDetail,
  AdminUserListItem,
  Banner,
  BannerPayload,
  CategoryPayload,
  CategoryUpdatePayload,
  DeliveryFailure,
  DeliveryHealth,
  AdminRole,
  HomeContent,
  ReportStatus,
  ReportTarget,
  Review,
  StaticPage,
  StaticPageKey,
  StatsCounters,
  StatsPeriod,
  StatsPeriodInfo,
  StoreStatus,
  TopStoreRow,
} from "./types";
import { ADMIN_LIMITS } from "./types";

/**
 * غلاف رقيق مكتوب الأنواع فوق adminFetch لكل مسارات الأدمن.
 * نفس أسلوب lib/products/api.ts — بلا أي منطق واجهة.
 *
 * الدوال تحت مقسومة لقسمين، وكل وحدة معلّمة:
 *
 * ✅ = مربوطة بالباك إند الحقيقي · المسار والمفاتيح متأكّدين على السيرفر.
 * 🟡 = لسا تجريبية · المسار بيرجّع 404، والشكل مقترح لحد ما يوصل العقد.
 *
 * ⚠️ ما في **ولا طبقة تحويل** بالمسارات المربوطة — اللي بترجعه الدالة هو
 * حرفياً اللي بعثه السيرفر. لو تغيّر مفتاح بالباك إند، بينكسر التصريف هون
 * مش الصفحة وقت التشغيل.
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

// ─── لوحة التحكم ✅ ────────────────────────────────────────────

/**
 * ✅ `GET /admin/stats?period=<أيام>`
 *
 * الكيانات بترجع **بالمستوى الأعلى** مفرّقة (`stats` · `topStores` ·
 * `charts` · `period`) — مش ملفوفة بمفتاح واحد زي باقي المسارات.
 *
 * ⚠️ اسم المعامل `period` بالأيام كرقم. `range=7d` و`days=7` بينتجاهلوا
 * بصمت وبيرجّع 30 يوم — انفحص على السيرفر.
 */
export type StatsResponse = ApiResponse & {
  period?: StatsPeriodInfo;
  stats?: StatsCounters;
  topStores?: TopStoreRow[];
  charts?: AdminStatsCharts;
};

export function fetchStats(period: StatsPeriod): Promise<StatsResponse> {
  return adminFetch(`/admin/stats${query({ period })}`);
}

// ─── المتاجر ✅ ────────────────────────────────────────────────

/**
 * ✅ `GET /admin/stores?page&limit&q&status`
 *
 * `status` من قيم `StoreStatus` (PENDING · APPROVED · REJECTED) —
 * **مش** ACTIVE/SUSPENDED. `q` بيبحث بالاسم والمدينة والمالك.
 */
export function fetchStores(
  params: ListParams & { status?: StoreStatus | "" } = {},
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

/** ✅ `GET /admin/stores/:id` — 404 برسالة «المتجر غير موجود» */
export function fetchStore(
  id: number,
): Promise<ApiResponse & { store?: AdminStoreDetail }> {
  return adminFetch(`/admin/stores/${id}`);
}

/**
 * ✅ `PATCH /admin/stores/:id/approve`
 *
 * ⚠️ الميثود **PATCH** مش POST — POST بيرجّع 404 من الراوتر.
 */
export function approveStore(
  id: number,
): Promise<ApiResponse & { store?: AdminStoreDetail }> {
  return adminFetch(`/admin/stores/${id}/approve`, { method: "PATCH" });
}

/**
 * ✅ `PATCH /admin/stores/:id/reject`
 *
 * ⚠️ شروط `reason` على السيرفر **ما انفحصت** — التحقق بيصير بعد ما يلاقي
 * المتجر، فما بينقاس على معرّف وهمي. الواجهة بتفرض 10–500 حرف من طرفها،
 * وأي خطأ 400 راجع بمفتاح `reason` بينعرض جوّا الحوار متل ما هو.
 */
export function rejectStore(
  id: number,
  reason: string,
): Promise<ApiResponse & { store?: AdminStoreDetail }> {
  return adminFetch(`/admin/stores/${id}/reject`, {
    method: "PATCH",
    ...json({ reason }),
  });
}

// ─── المستخدمون ✅ ─────────────────────────────────────────────

/**
 * ✅ `GET /admin/users?page&limit&q&role&isActive`
 *
 * ⚠️ الفلتر اسمه **`isActive`** بقيمة `"true"`/`"false"` — **مش `status`**.
 * `?status=` بينتجاهل بصمت (فحصناه: `status=ACTIVE` و`status=SUSPENDED`
 * رجّعوا نفس الإجمالي 55).
 *
 * `role` بيقبل `MERCHANT` أو `CUSTOMER` بس — `ADMIN` بيرجّع 400
 * برسالة «الدور غير صحيح».
 */
export function fetchUsers(
  params: ListParams & {
    role?: AdminRole | "";
    /** نص مش بولياني — بينحط بسلسلة الاستعلام كما هو */
    isActive?: "true" | "false" | "";
  } = {},
): Promise<Paged<"users", AdminUserListItem>> {
  return adminFetch(
    `/admin/users${query({
      page: params.page ?? 1,
      limit: params.limit ?? ADMIN_LIMITS.pageLimit,
      q: params.q,
      role: params.role,
      isActive: params.isActive,
    })}`,
  );
}

/** ✅ `GET /admin/users/:id` — 404 برسالة «المستخدم غير موجود» */
export function fetchUser(
  id: number,
): Promise<ApiResponse & { user?: AdminUserDetail }> {
  return adminFetch(`/admin/users/${id}`);
}

/**
 * ✅ `PATCH /admin/users/:id/suspend`
 *
 * ⚠️ **بلا سبب.** رد المستخدم ما فيه ولا حقل يخزّن سبب الإيقاف
 * (`isActive` وبس)، فطلب سبب من المشرف كان بيضيّع اللي بيكتبه. الميثود
 * PATCH مش POST.
 *
 * ⚠️ شروط الجسم ما انفحصت end-to-end — الكتابة على السيرفر انحجبت وقت
 * الربط، والتحقق بيصير بعد ما يلاقي المستخدم فما بينقاس على معرّف وهمي.
 */
export function suspendUser(
  id: number,
): Promise<ApiResponse & { user?: AdminUserDetail }> {
  return adminFetch(`/admin/users/${id}/suspend`, { method: "PATCH" });
}

/** ✅ `PATCH /admin/users/:id/activate` — الاسم `activate` مش `reactivate` */
export function activateUser(
  id: number,
): Promise<ApiResponse & { user?: AdminUserDetail }> {
  return adminFetch(`/admin/users/${id}/activate`, { method: "PATCH" });
}

// ─── التصنيفات ✅ ──────────────────────────────────────────────

/**
 * ⚠️ **كل عمليات الكتابة بترجّع التصنيف الواحد `category` — مش الشجرة.**
 *
 * هاد أهم فرق عن التصميم القديم: كانت الصفحة بتعيد بذر شجرتها من رد
 * العملية مباشرة. مع العقد الحقيقي هذا مستحيل — الرد فيه صف واحد بلا
 * `children` وبلا العدّادات المحدّثة لباقي الشجرة، فالصفحة بتعيد الجلب
 * بعد كل عملية ناجحة.
 */
type CategoryResponse = ApiResponse & { category?: AdminCategoryNode };

/**
 * ✅ `GET /admin/categories`
 *
 * الافتراضي شجرة مستويين. `flat=true` بترجّع كل التصنيفات بمستوى واحد
 * (38 صف حالياً)، و`parentId` بترجّع أبناء تصنيف واحد مسطّحين.
 */
export function fetchAdminCategories(
  params: { flat?: boolean; parentId?: number; isActive?: boolean } = {},
): Promise<
  ApiResponse & { categories?: AdminCategoryRoot[]; count?: number; flat?: boolean }
> {
  return adminFetch(
    `/admin/categories${query({
      flat: params.flat === undefined ? undefined : String(params.flat),
      parentId: params.parentId,
      isActive: params.isActive === undefined ? undefined : String(params.isActive),
    })}`,
  );
}

/** ✅ `GET /admin/categories/:id` — 404 «التصنيف غير موجود» */
export function fetchCategory(id: number): Promise<CategoryResponse> {
  return adminFetch(`/admin/categories/${id}`);
}

/**
 * ✅ `POST /admin/categories` — 201
 *
 * قواعد التحقق كما رجّعها السيرفر:
 * - `name` مطلوب. **ما في حد أدنى للطول ولا فحص تكرار** — حرف واحد بيمرّ،
 *   واسم مكرّر بيمرّ. اللوحة بتفرض 2–60 من طرفها لأن السيرفر ما بيفرض.
 * - `parentId` موجود ⇒ `sizeGroup` **إلزامي**، وممنوع يكون الأب فرعي.
 * - جذر ⇒ `sizeGroup` **ممنوع**.
 * - `imageUrl` لازم رابط http/https صحيح · `sortOrder` رقم 0–9999.
 */
export function createCategory(
  payload: CategoryPayload,
): Promise<CategoryResponse> {
  return adminFetch("/admin/categories", { method: "POST", ...json(payload) });
}

/** ✅ `PATCH /admin/categories/:id` — جسم فاضي بيرجّع 200 بلا تغيير */
export function updateCategory(
  id: number,
  payload: CategoryUpdatePayload,
): Promise<CategoryResponse> {
  return adminFetch(`/admin/categories/${id}`, {
    method: "PATCH",
    ...json(payload),
  });
}

/**
 * ✅ `DELETE /admin/categories/:id`
 *
 * ⚠️ بيرجّع **409** لو التصنيف مربوط، مع عدّادات تشرح السبب
 * (`childrenCount` · `productsCount` · `storesCount`) ورسالة عربية جاهزة
 * بتقترح الإخفاء بدل الحذف. الحذف بينجح بس لما تكون العدّادات الثلاثة صفر.
 */
export function deleteCategory(id: number): Promise<CategoryResponse> {
  return adminFetch(`/admin/categories/${id}`, { method: "DELETE" });
}

/** ✅ `PATCH /admin/categories/:id/activate` — «التصنيف صار ظاهر» */
export function activateCategory(id: number): Promise<CategoryResponse> {
  return adminFetch(`/admin/categories/${id}/activate`, { method: "PATCH" });
}

/** ✅ `PATCH /admin/categories/:id/deactivate` — «التصنيف صار مخفي» */
export function deactivateCategory(id: number): Promise<CategoryResponse> {
  return adminFetch(`/admin/categories/${id}/deactivate`, { method: "PATCH" });
}

// ─── البلاغات والتقييمات 🟡 ────────────────────────────────────

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

// ─── المحتوى 🟡 ────────────────────────────────────────────────

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

// ─── التوصيل 🟡 ────────────────────────────────────────────────

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

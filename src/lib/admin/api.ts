import type { ApiResponse, Pagination } from "@/lib/api";
import { adminFetch, query } from "./client";
import type { AdminOrderListItem, AdminCategoryNode, AdminCategoryRoot, AdminReportDetail, AdminReportListItem, AdminSupportTicket, AdminStatsCharts, AdminStoreDetail, AdminStoreListItem, AdminUserDetail, AdminUserListItem, Banner, BannerPayload, BannerSlot, CategoryPayload, CategoryReorderPayload, CategoryUpdatePayload, DeliveryFailure, DeliveryHealth, AdminRole, HomeContent, ProductReview, AdminRatingItem, ReportStatus, ReportTarget, Review, ReviewsOverviewStats, StaticPage, StaticPageKey, StatsCounters, StatsPeriod, StatsPeriodInfo, StoreOrder, StoreOrderStatus, StoreRatingSummary, StoreStatus, SupportTicketStatus, TopStoreRow, AdminContentPageDetail, AdminContentPageListItem, AdminContentPagePayload, AdminOrderDetail, NotificationsListResponse } from "./types";
import { apiFetch } from "@/lib/api";
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

export function fetchStats(
  period: StatsPeriod,
  limit?: number,
): Promise<StatsResponse> {
  return adminFetch(`/admin/stats${query({ period, limit })}`);
}

// ─── المتاجر ✅ ────────────────────────────────────────────────

/**
 * ✅ `GET /admin/stores?page&limit&q&status&isActive`
 *
 * `status` من قيم `StoreStatus` (PENDING · APPROVED · REJECTED).
 * `isActive` الحظر ("true" | "false").
 * `q` بيبحث بالاسم والمدينة والمالك.
 */
export function fetchStores(
  params: ListParams & {
    status?: StoreStatus | "";
    isActive?: "true" | "false" | "";
  } = {},
): Promise<Paged<"stores", AdminStoreListItem>> {
  return adminFetch(
    `/admin/stores${query({
      page: params.page ?? 1,
      limit: params.limit ?? ADMIN_LIMITS.pageLimit,
      q: params.q,
      status: params.status,
      isActive: params.isActive,
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
 * ⚠️ سبب الرفض إلزامي عملياً ليراه التاجر (حد 255 حرف).
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

/**
 * ✅ `PATCH /admin/stores/:id/suspend` — حظر المتجر (isActive: false)
 */
export function suspendStore(
  id: number,
): Promise<ApiResponse & { store?: AdminStoreDetail }> {
  return adminFetch(`/admin/stores/${id}/suspend`, { method: "PATCH" });
}

/**
 * ✅ `PATCH /admin/stores/:id/activate` — رفع الحظر عن المتجر (isActive: true)
 */
export function activateStore(
  id: number,
): Promise<ApiResponse & { store?: AdminStoreDetail }> {
  return adminFetch(`/admin/stores/${id}/activate`, { method: "PATCH" });
}

/**
 * ✅ `PATCH /admin/stores/:id/feature` — تمييز المتجر في قسم «المتاجر المميزة»
 */
export function featureStore(
  id: number,
  payload?: { order?: number },
): Promise<ApiResponse & { store?: AdminStoreDetail }> {
  return adminFetch(`/admin/stores/${id}/feature`, {
    method: "PATCH",
    ...(payload ? json(payload) : {}),
  });
}

/**
 * ✅ `PATCH /admin/stores/:id/unfeature` — إلغاء تمييز المتجر
 */
export function unfeatureStore(
  id: number,
): Promise<ApiResponse & { store?: AdminStoreDetail }> {
  return adminFetch(`/admin/stores/${id}/unfeature`, { method: "PATCH" });
}

/**
 * ✅ `DELETE /admin/stores/:id`
 *
 * حذف متجر نهائياً مع حساب التاجر وتصنيفاته ومنتجاته وصوره.
 * ⚠️ يرجع 409 لو المتجر عليه ولو طلب واحد.
 */
export function deleteStore(
  id: number,
): Promise<ApiResponse & { ordersCount?: number; ownerOrdersCount?: number }> {
  return adminFetch(`/admin/stores/${id}`, { method: "DELETE" });
}

/**
 * `GET /admin/stores/:id/orders`
 *
 * قائمة طلبات المتجر مع الفلترة حسب الحالة والبحث والترتيب
 */
export function fetchStoreOrders(
  storeId: number,
  params: ListParams & {
    status?: StoreOrderStatus | "";
    sort?: "newest" | "oldest" | "highest" | "";
  } = {},
): Promise<Paged<"orders", StoreOrder> & { counts?: Record<string, number>; statusCounts?: Record<string, number> }> {
  return adminFetch(
    `/admin/stores/${storeId}/orders${query({
      page: params.page ?? 1,
      limit: params.limit ?? 20,
      q: params.q,
      status: params.status,
      sort: params.sort,
    })}`,
  );
}

/**
 * ✅ `GET /admin/orders/:id`
 *
 * تفاصيل طلب واحد بمنظور إداري شامل (الزبون، المتجر، الطلبية الأم ومتاجرها الأخرى).
 */
export function fetchAdminOrderDetail(
  orderId: number,
): Promise<ApiResponse & { order?: AdminOrderDetail }> {
  return adminFetch(`/admin/orders/${orderId}`);
}

/** `GET /admin/orders?page&limit` — كل طلبات المنصة، مش طلبات متجر واحد. */
export function fetchAdminOrders(
  params: Pick<ListParams, "page" | "limit"> & { status?: StoreOrderStatus | ""; storeId?: number } = {},
): Promise<Paged<"orders", AdminOrderListItem> & { statusCounts?: Record<string, number> }> {
  return adminFetch(
    `/admin/orders${query({
      status: params.status,
      storeId: params.storeId,
      page: params.page ?? 1,
      limit: params.limit ?? ADMIN_LIMITS.pageLimit,
    })}`,
  );
}

/** فحص تشخيصي خفيف لقاعدة البيانات؛ لا يغيّر بيانات ولا يحتاج توكن. */
export function fetchDatabaseHealth(): Promise<ApiResponse> {
  return apiFetch("/health/db", { cache: "no-store" });
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

/**
 * ✅ `DELETE /admin/users/:id`
 *
 * حذف مستخدم نهائياً مع متجره وسلته وعناوينه ومفضلته.
 * ⚠️ يرجع 409 لو الحساب عليه أي طلبات (شراء أو بيع).
 */
export function deleteUser(
  id: number,
): Promise<ApiResponse & { ordersCount?: number; storeOrdersCount?: number }> {
  return adminFetch(`/admin/users/${id}`, { method: "DELETE" });
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

/**
 * ✅ `PATCH /admin/categories/reorder`
 *
 * إعادة ترتيب الإخوة بالسحب والإفلات — يستقبل `{ parentId, ids }`
 */
export function reorderCategories(
  payload: CategoryReorderPayload,
): Promise<ApiResponse> {
  return adminFetch("/admin/categories/reorder", {
    method: "PATCH",
    ...json(payload),
  });
}

// ─── البلاغات والتقييمات 🟡 ────────────────────────────────────

export function fetchReports(
  params: ListParams & { targetType?: ReportTarget | ""; status?: ReportStatus | "" } = {},
): Promise<Paged<"reports", AdminReportListItem>> {
  // واجهة الأدمن تسمي الحالة OPEN، بينما عقد الـAPI يستخدم PENDING.
  const apiStatus = params.status === "OPEN" ? "PENDING" : params.status;
  return adminFetch(
    `/admin/reports${query({
      page: params.page ?? 1,
      limit: params.limit ?? ADMIN_LIMITS.pageLimit,
      q: params.q,
      targetType: params.targetType,
      status: apiStatus,
    })}`,
  );
}

// ─── العمولات والدفعات والتسويات (مسارات PDF Viora-New-Routes) ──

export interface CommissionSettings {
  defaultRate?: number;
  percent?: number | string;
  customStoresCount?: number;
  customRateStores?: number;
}

export interface AdminPayoutBalance {
  storeId: number;
  storeName: string;
  earned?: string | number | Record<string, unknown> | null;
  paid?: string | number | Record<string, unknown> | null;
  outstanding?: string | number | Record<string, unknown> | null;
  payoutAccount?: Record<string, unknown> | null;
  store?: { id?: number; name?: string } | null;
  merchant?: { id?: number; name?: string; storeName?: string } | null;
  [key: string]: unknown;
}

export interface AdminPayoutRecord {
  id: number;
  storeId: number;
  storeName?: string;
  amount: string | number;
  status: "current" | "voided" | string;
  createdAt: string;
  orderIds?: number[];
  reason?: string | null;
}

export interface AdminSettlement {
  id: number;
  storeId: number;
  storeName?: string;
  orderId: number;
  amount: string | number;
  paid: boolean;
  createdAt: string;
  store?: { id?: number; name?: string } | null;
  order?: { id?: number; orderNumber?: string; createdAt?: string } | null;
  [key: string]: unknown;
}

export function fetchCommissionSettings(): Promise<ApiResponse & {
  settings?: CommissionSettings;
  commission?: CommissionSettings;
  defaultRate?: number;
  customStoresCount?: number;
}> {
  return adminFetch("/admin/settings/commission");
}

export function updateCommissionSettings(defaultRate: number): Promise<ApiResponse> {
  return adminFetch("/admin/settings/commission", {
    method: "PATCH",
    ...json({ percent: defaultRate }),
  });
}

export function fetchPayoutBalances(): Promise<ApiResponse & {
  stores?: AdminPayoutBalance[];
  balances?: AdminPayoutBalance[];
  totals?: { unpaidAmount?: string | number; storesCount?: number };
}> {
  return adminFetch("/admin/payouts/balances");
}

/** الخادم يحسب المبلغ المستحق تلقائياً؛ نرسل المتجر فقط. */
export function createPayout(storeId: number): Promise<ApiResponse & {
  payout?: AdminPayoutRecord;
}> {
  return adminFetch("/admin/payouts", {
    method: "POST",
    ...json({ storeId }),
  });
}

export function fetchPayouts(
  params: ListParams & { storeId?: number; from?: string; to?: string; status?: "current" | "voided" | "" } = {},
): Promise<Paged<"payouts", AdminPayoutRecord>> {
  return adminFetch(`/admin/payouts${query({
    page: params.page ?? 1,
    limit: params.limit ?? ADMIN_LIMITS.pageLimit,
    q: params.q,
    storeId: params.storeId,
    from: params.from,
    to: params.to,
    status: params.status,
  })}`);
}

export function fetchPayout(id: number): Promise<ApiResponse & { payout?: AdminPayoutRecord }> {
  return adminFetch(`/admin/payouts/${id}`);
}

export function voidPayout(id: number, reason: string): Promise<ApiResponse & { payout?: AdminPayoutRecord }> {
  return adminFetch(`/admin/payouts/${id}/void`, {
    method: "PATCH",
    ...json({ reason }),
  });
}

export function fetchAdminSettlements(
  params: ListParams & { paid?: boolean } = {},
): Promise<Paged<"settlements", AdminSettlement>> {
  return adminFetch(`/admin/settlements${query({
    page: params.page ?? 1,
    limit: params.limit ?? ADMIN_LIMITS.pageLimit,
    q: params.q,
    paid: params.paid === undefined ? undefined : String(params.paid),
  })}`);
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

// ─── ٥ · التقييمات ومراجعات الطلبات ✅ ─────────────────────────

/**
 * ✅ `GET /admin/ratings?page&limit&hidden`
 *
 * كل التقييمات للمراجعة — مع المنتج ومتجره والمقيّم بالإيميل والطلب.
 */
export function fetchRatings(
  params: ListParams & {
    hidden?: boolean | string;
  } = {},
): Promise<Paged<"ratings", AdminRatingItem>> {
  return adminFetch(
    `/admin/ratings${query({
      page: params.page ?? 1,
      limit: params.limit ?? 20,
      hidden:
        params.hidden !== "" && params.hidden !== undefined
          ? String(params.hidden)
          : undefined,
    })}`,
  );
}

export type AdminRatingApiItem = Omit<AdminRatingItem, "rating"> & {
  rating?: number | string | null;
  stars?: number | string | null;
};

/** Read a complete, bounded snapshot before offering global client-side analytics.
 * Stops explicitly rather than labelling a partial page as a platform statistic.
 * Replace with server aggregation once that contract is available.
 */
export async function fetchRatingsSnapshot(signal?: AbortSignal): Promise<ApiResponse & { ratings?: AdminRatingApiItem[]; pagination?: Pagination }> {
  const items = new Map<number, AdminRatingApiItem>();
  let total: number | undefined;
  for (let page = 1; page <= 100; page++) {
    if (signal?.aborted) return { success: false, status: 0, message: "تم إلغاء التحميل" };
    // Live API validation caps this endpoint at limit=50.
    const res = await adminFetch(`/admin/ratings${query({page, limit: 50})}`, {signal}) as Paged<"ratings", AdminRatingApiItem>;
    if (!res.success) return res;
    const pagination = res.pagination;
    if (!Array.isArray(res.ratings) || !pagination || pagination.page !== page || !Number.isSafeInteger(pagination.total) || pagination.total < 0 || !Number.isSafeInteger(pagination.totalPages) || pagination.totalPages < 0) {
      return {success:false,status:502,message:"رد التقييمات غير مكتمل؛ تعذر حساب إحصائيات موثوقة."};
    }
    if (pagination.total > 10_000 || pagination.totalPages > 100) return {success:false,status:413,message:"عدد التقييمات يتطلب خدمة إحصائيات من الخادم. لا يمكن عرض نتائج جزئية كإجمالي."};
    if (total !== undefined && total !== pagination.total) return {success:false,status:409,message:"تغيرت التقييمات أثناء التحميل. أعد المحاولة."};
    total = pagination.total;
    for (const item of res.ratings) items.set(item.id,item);
    if (page >= pagination.totalPages) {
      if (items.size !== total) return {success:false,status:409,message:"بيانات التقييمات غير مكتملة أو تغيرت أثناء التحميل. أعد المحاولة."};
      return {success:true,status:200,ratings:[...items.values()],pagination};
    }
  }
  return {success:false,status:413,message:"تعذر تحميل كل التقييمات. يلزم تجميع من الخادم."};
}

/**
 * ✅ `PATCH /admin/ratings/:id/hide` — إخفاء تعليق مسيء
 */
export function hideRating(
  id: number,
): Promise<ApiResponse & { rating?: AdminRatingItem }> {
  return adminFetch(`/admin/ratings/${id}/hide`, { method: "PATCH" });
}

/**
 * ✅ `PATCH /admin/ratings/:id/unhide` — إرجاع التقييم للعرض
 */
export function unhideRating(
  id: number,
): Promise<ApiResponse & { rating?: AdminRatingItem }> {
  return adminFetch(`/admin/ratings/${id}/unhide`, { method: "PATCH" });
}

export function fetchProductReviews(
  params: ListParams & {
    rating?: number | "";
    storeId?: number;
    productId?: number;
    isHidden?: boolean | "";
    sort?: "newest" | "highest" | "lowest" | "";
  } = {},
): Promise<Paged<"reviews", ProductReview> & { overview?: ReviewsOverviewStats }> {
  return adminFetch(
    `/admin/reviews${query({
      page: params.page ?? 1,
      limit: params.limit ?? 10,
      q: params.q,
      rating: params.rating,
      storeId: params.storeId,
      productId: params.productId,
      isHidden: params.isHidden !== "" && params.isHidden !== undefined ? String(params.isHidden) : undefined,
      sort: params.sort,
    })}`,
  );
}

export function fetchReviewsOverview(): Promise<
  ApiResponse & { overview?: ReviewsOverviewStats }
> {
  return adminFetch("/admin/reviews/overview");
}

export function fetchStoreRatings(
  params: ListParams = {},
): Promise<Paged<"stores", StoreRatingSummary>> {
  return adminFetch(
    `/admin/reviews/stores${query({
      page: params.page ?? 1,
      limit: params.limit ?? 10,
      q: params.q,
    })}`,
  );
}

export function hideProductReview(
  id: number,
): Promise<ApiResponse & { review?: ProductReview }> {
  return hideRating(id);
}

export function unhideProductReview(
  id: number,
): Promise<ApiResponse & { review?: ProductReview }> {
  return unhideRating(id);
}

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

// ─── تذاكر الدعم ✅ ─────────────────────────────────────────────

/** `GET /admin/support/tickets?status&page&limit` — الأقدم أولاً للمفتوحة. */
export function fetchSupportTickets(
  params: ListParams & { status?: SupportTicketStatus | "" } = {},
): Promise<Paged<"tickets", AdminSupportTicket>> {
  return adminFetch(
    `/admin/support/tickets${query({
      page: params.page ?? 1,
      limit: params.limit ?? 20,
      status: params.status,
    })}`,
  );
}

/** `GET /admin/support/tickets/:id` */
export function fetchSupportTicket(
  id: number,
): Promise<ApiResponse & { ticket?: AdminSupportTicket }> {
  return adminFetch(`/admin/support/tickets/${id}`);
}

/** `PATCH /admin/support/tickets/:id/resolve` — الملاحظة اختيارية، حتى 1000 حرف. */
export function resolveSupportTicket(
  id: number,
  adminNote?: string,
): Promise<ApiResponse & { ticket?: AdminSupportTicket }> {
  return adminFetch(`/admin/support/tickets/${id}/resolve`, {
    method: "PATCH",
    ...json(adminNote ? { adminNote } : {}),
  });
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

/**
 * 📜 إدارة المحتوى والصفحات الثابتة (شروط وأحكام · خصوصية · من نحن)
 * `GET /admin/content`
 * `GET /admin/content/:key`
 * `PUT /admin/content/:key`
 */
export function fetchAdminContentPages(): Promise<
  ApiResponse & { pages?: AdminContentPageListItem[] }
> {
  return adminFetch("/admin/content");
}

export function fetchAdminContentPage(
  key: string,
): Promise<ApiResponse & { page?: AdminContentPageDetail }> {
  return adminFetch(`/admin/content/${key}`);
}

export function saveAdminContentPage(
  key: string,
  payload: AdminContentPagePayload,
): Promise<ApiResponse & { page?: AdminContentPageDetail }> {
  return adminFetch(`/admin/content/${key}`, {
    method: "PUT",
    ...json(payload),
  });
}

// ─── توافقية سابقة للمسار القديم ───
export interface TermsContentPayload {
  title: string;
  content: string;
}

export interface TermsContentData {
  key: string;
  title: string;
  content: string;
  updatedAt: string;
}

export async function fetchTermsContent(): Promise<
  ApiResponse & { data?: TermsContentData }
> {
  const res = await fetchAdminContentPage("terms");
  return {
    ...res,
    data: res.page
      ? {
          key: res.page.key,
          title: res.page.title,
          content: res.page.html,
          updatedAt: res.page.updatedAt || "",
        }
      : undefined,
  };
}

export async function saveTermsContent(
  payload: TermsContentPayload,
): Promise<ApiResponse & { data?: TermsContentData }> {
  const res = await saveAdminContentPage("terms", {
    title: payload.title,
    html: payload.content,
  });
  return {
    ...res,
    data: res.page
      ? {
          key: res.page.key,
          title: res.page.title,
          content: res.page.html,
          updatedAt: res.page.updatedAt || "",
        }
      : undefined,
  };
}

export function fetchBanners(): Promise<ApiResponse & { banners?: Banner[] }> {
  return adminFetch("/admin/banners");
}

/** Saves a fixed slot; the response contains the updated banner. */
export function updateBanner(
  slot: BannerSlot,
  payload: BannerPayload,
): Promise<ApiResponse & { banner?: Banner; allowedSlots?: BannerSlot[] }> {
  return adminFetch(`/admin/banners/${slot}`, { method: "PUT", ...json(payload) });
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

// ─── الإشعارات والجرس 🔔 ─────────────────────────────────────

/**
 * ✅ `GET /notifications?page&limit`
 * جلب قائمة الإشعارات وعدد غير المقروء
 */
export function fetchNotifications(
  page = 1,
  limit = 20,
): Promise<ApiResponse & NotificationsListResponse> {
  return adminFetch(`/notifications${query({ page, limit })}`);
}

/**
 * ✅ `GET /notifications/count`
 * جلب عدد الإشعارات غير المقروءة فقط (خفيف للشارة)
 */
export function fetchUnreadNotificationsCount(): Promise<
  ApiResponse & { unread?: number }
> {
  return adminFetch("/notifications/count");
}

/**
 * ✅ `PATCH /notifications/:id/read`
 * تعليم إشعار واحد كمقروء
 */
export function markNotificationAsRead(
  id: number,
): Promise<ApiResponse & { unread?: number }> {
  return adminFetch(`/notifications/${id}/read`, { method: "PATCH" });
}

/**
 * ✅ `PATCH /notifications/read-all`
 * تعليم جميع الإشعارات كمقروءة
 */
export function markAllNotificationsAsRead(): Promise<
  ApiResponse & { marked?: number; unread?: number }
> {
  return adminFetch("/notifications/read-all", { method: "PATCH" });
}

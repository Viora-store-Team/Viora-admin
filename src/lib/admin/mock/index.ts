/**
 * موجّه الطلبات التجريبية.
 *
 * ⚠️ مؤقت — بينحذف المجلد كله لما توصل مسارات /admin الحقيقية.
 *
 * القاعدة الوحيدة اللي ما بتنكسر: **بيرجّع نفس مغلّف ApiResponse بالضبط**
 * اللي بيرجّعه apiFetch — بما فيه status وشكل errors. لهيك الصفحات بتستخدم
 * classifyStatus وسلّم الحالات بلا ما تعرف إذا البيانات تجريبية ولا حقيقية،
 * والتبديل للـ API الحقيقي بيصير بمتغيّر بيئة واحد بلا لمس أي واجهة.
 */

import type { ApiResponse } from "@/lib/api";
import { ADMIN_LIMITS } from "../types";
import type {
  AdminCategoryNode,
  AdminStatsCharts,
  BannerPayload,
  CategoryPayload,
  CategoryUpdatePayload,
  FeaturedCollectionPayload,
  OccasionFilterPayload,
  OrdersPoint,
  ProductReview,
  ReportStatus,
  ReviewsOverviewStats,
  SignupsPoint,
  StaticPageKey,
  StatsCounters,
  StoreOrder,
  StoreOrderItem,
  StoreOrderStatus,
  StoreRatingSummary,
  TopStoreRow,
} from "../types";
import { db } from "./db";
import { daysAgo, spread } from "./seed";

/** تأخير صناعي — عشان حالات التحميل تبيّن فعلياً وقت التطوير */
const LATENCY_MS = 320;

/**
 * محاكاة الأعطال لاختبار حالات الخطأ والفراغ.
 * `network` = فشل شبكة (status 0) · `server` = 500 · `empty` = قوائم فاضية.
 */
const FAIL_MODE = process.env.NEXT_PUBLIC_ADMIN_MOCK_FAIL ?? "";

const wait = () => new Promise((resolve) => setTimeout(resolve, LATENCY_MS));

// ─── مساعدات ───────────────────────────────────────────────────

function ok<T extends object>(payload: T): ApiResponse {
  return { success: true, status: 200, ...payload };
}

function fail(
  status: number,
  message: string,
  errors?: Record<string, string>,
): ApiResponse {
  return { success: false, status, message, errors };
}

const notFound = () => fail(404, "العنصر المطلوب غير موجود.");

/** نفس شكل الترقيم اللي بيرجّعه GET /products/me */
function paginate<T>(rows: T[], page: number, limit: number) {
  const total = rows.length;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const safePage = Math.min(Math.max(1, page), totalPages);
  return {
    slice: rows.slice((safePage - 1) * limit, safePage * limit),
    pagination: { page: safePage, limit, total, totalPages },
  };
}

/** بحث نصي بسيط — بيقارن بعد تطبيع حالة الأحرف */
function matches(query: string, ...fields: (string | null | undefined)[]): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return fields.some((f) => (f ?? "").toLowerCase().includes(q));
}

function readBody<T>(options: RequestInit): Partial<T> {
  if (typeof options.body !== "string") return {};
  try {
    return JSON.parse(options.body) as Partial<T>;
  } catch {
    return {};
  }
}

/** نفس تحقّق السيرفر من سبب الإجراء — الواجهة بتفرضه كمان قبل الإرسال */
function checkReason(reason: unknown): ApiResponse | null {
  const value = typeof reason === "string" ? reason.trim() : "";
  if (value.length < ADMIN_LIMITS.reasonMin) {
    return fail(400, "بيانات غير صحيحة", {
      reason: `السبب لازم يكون ${ADMIN_LIMITS.reasonMin} أحرف على الأقل`,
    });
  }
  if (value.length > ADMIN_LIMITS.reasonMax) {
    return fail(400, "بيانات غير صحيحة", {
      reason: `السبب أطول من ${ADMIN_LIMITS.reasonMax} حرف`,
    });
  }
  return null;
}

const today = () => daysAgo(0);

// ─── لوحة التحكم ───────────────────────────────────────────────

/**
 * بيبني رد `/admin/stats` بنفس شكل السيرفر بالضبط — نفس أسماء المفاتيح،
 * ونفس التداخل (`stats` · `topStores` · `charts` · `period` بالمستوى الأعلى).
 */
function buildStats(days: number) {
  const signups: SignupsPoint[] = Array.from({ length: days }, (_, i) => {
    const back = days - 1 - i;
    return {
      date: daysAgo(back),
      // منحنى صاعد خفيف مع تذبذب حتمي — بيبيّن "نمو" بلا عشوائية
      merchants: 1 + Math.round((days - back) / 12) + (i % 3),
      customers: 4 + Math.round((days - back) / 3) + spread(i, 6),
    };
  });

  const orders: OrdersPoint[] = signups.map((point, i) => {
    const count = 18 + spread(i, 24) + Math.round(i / 4);
    return {
      date: point.date,
      orders: count,
      revenue: (count * 87.5).toFixed(2),
    };
  });

  const totalOrders = db.stores.reduce((sum, s) => sum + s.ordersCount, 0);
  const inPeriod = orders.reduce((sum, o) => sum + o.orders, 0);

  const counters: StatsCounters = {
    stores: {
      active: db.stores.filter((s) => s.status === "APPROVED").length,
      pending: db.stores.filter((s) => s.status === "PENDING").length,
      rejected: db.stores.filter((s) => s.status === "REJECTED").length,
      suspended: db.stores.filter((s) => !s.isActive).length,
      total: db.stores.length,
    },
    users: {
      merchants: db.users.filter((u) => u.role === "MERCHANT").length,
      customers: db.users.filter((u) => u.role === "CUSTOMER").length,
      total: db.users.length,
      newMerchants: signups.reduce((sum, p) => sum + p.merchants, 0),
      newCustomers: signups.reduce((sum, p) => sum + p.customers, 0),
    },
    orders: { total: totalOrders, inPeriod },
    revenue: {
      total: (totalOrders * 87.5).toFixed(2),
      inPeriod: (inPeriod * 87.5).toFixed(2),
    },
    reports: { open: db.reports.filter((r) => r.status === "OPEN").length },
  };

  const topStores: TopStoreRow[] = [...db.stores]
    .sort((a, b) => b.ordersCount - a.ordersCount)
    .slice(0, 5)
    .map((s) => ({
      store: {
        id: s.id,
        name: s.name,
        logoUrl: s.logoUrl,
        status: s.status,
      },
      orders: s.ordersCount,
      revenue: s.revenue,
    }));

  const charts: AdminStatsCharts = { signups, orders };

  return {
    period: {
      days,
      from: daysAgo(days),
      to: daysAgo(0),
    },
    stats: counters,
    topStores,
    charts,
  };
}

// ─── تحويل التفاصيل لعنصر قائمة ────────────────────────────────

/* الاقتطاع مقصود: المسار الحقيقي بيرجّع الشكل الخفيف بالقوائم، فلو رجّعنا
   الكائن الكامل هون بتنبني الواجهة على حقول رح تختفي وقت الربط. */

function storeListItem(s: (typeof db.stores)[number]) {
  return {
    id: s.id,
    name: s.name,
    logoUrl: s.logoUrl,
    city: s.city,
    status: s.status,
    isActive: s.isActive,
    createdAt: s.createdAt,
    reviewedAt: s.reviewedAt,
    owner: s.owner,
    productsCount: s.productsCount,
    ordersCount: s.ordersCount,
  };
}

function userListItem(u: (typeof db.users)[number]) {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    phone: u.phone,
    avatarUrl: u.avatarUrl,
    role: u.role,
    emailVerified: u.emailVerified,
    isActive: u.isActive,
    createdAt: u.createdAt,
    store: u.store,
    ordersCount: u.ordersCount,
  };
}

/**
 * بيوقف الحساب أو بيرجّعه، وبيزامن نسخة المالك جوّا صفّ المتجر.
 *
 * ⚠️ ما بيلمس `store.status` — قرار مراجعة المتجر مستقل عن حالة الحساب
 * بالباك إند، وخلطهن كان بيخلّي إيقاف حساب يبيّن كأنه رفض للمتجر.
 */
function setUserActive(user: (typeof db.users)[number], isActive: boolean) {
  user.isActive = isActive;

  const store = db.stores.find((s) => s.owner.id === user.id);
  if (!store) return;

  store.owner.isActive = isActive;
  // نسخة المتجر المتداخلة بصفّ المستخدم بتضل هي هي — حالة المتجر ما بتتغيّر
  if (user.store) user.store.isActive = store.isActive;
}

function reportListItem(r: (typeof db.reports)[number]) {
  return {
    id: r.id,
    targetType: r.targetType,
    targetId: r.targetId,
    targetPreview: r.targetPreview,
    reason: r.reason,
    reporter: r.reporter,
    status: r.status,
    createdAt: r.createdAt,
  };
}

function generateStoreOrders(storeId: number): StoreOrder[] {
  const customerList = [
    { name: "أحمد حسن", phone: "0599112233", email: "ahmad.h@example.com", city: "غزة", address: "غزة - الرمال" },
    { name: "رائد علي", phone: "0598774411", email: "raed.ali@example.com", city: "خانيونس", address: "خانيونس - الكتيبة" },
    { name: "محمود الخالدي", phone: "0592334455", email: "m.khaldi@example.com", city: "رام الله", address: "رام الله - الماصيون" },
    { name: "سارة عودة", phone: "0595667788", email: "sara.odeh@example.com", city: "نابلس", address: "نابلس - رفيديا" },
    { name: "هبة النجار", phone: "0594112299", email: "heba.n@example.com", city: "الخليل", address: "الخليل - عين سارة" },
    { name: "عمر الخطيب", phone: "0597889900", email: "omar.k@example.com", city: "غزة", address: "غزة - تل الهوا" },
    { name: "ليلى قاسم", phone: "0593445566", email: "laila.q@example.com", city: "بيت لحم", address: "بيت لحم - شارع المهد" },
    { name: "يوسف إبراهيم", phone: "0591223344", email: "yousef.i@example.com", city: "جنين", address: "جنين - الدوار الرئيسي" },
  ];

  const sampleProducts = [
    { name: "فستان سهرة كلاسيك", price: 180 },
    { name: "قميص صيفي قطني", price: 65 },
    { name: "بنطال جينز كاجوال", price: 110 },
    { name: "حذاء رياضي جلد", price: 135 },
    { name: "حقيبة يد جلدية فاخرة", price: 160 },
    { name: "شال كشمير أنيق", price: 45 },
  ];

  const statuses: StoreOrderStatus[] = [
    "NEW", "NEW",
    "PROCESSING", "PROCESSING", "PROCESSING",
    "READY", "READY",
    "SHIPPED", "SHIPPED",
    "COMPLETED", "COMPLETED", "COMPLETED", "COMPLETED", "COMPLETED", "COMPLETED",
    "CANCELLED"
  ];

  return Array.from({ length: 23 }, (_, idx) => {
    const cust = customerList[idx % customerList.length];
    const status = statuses[idx % statuses.length];
    const orderNum = 1049 - idx;
    const itemsCount = idx === 0 ? 3 : idx === 1 ? 10 : idx === 2 ? 10 : (idx % 4) + 1;
    const prod = sampleProducts[idx % sampleProducts.length];
    const unitPrice = prod.price;
    const totalCalc = (unitPrice * (itemsCount > 3 ? 2 : itemsCount) + (idx % 3 === 0 ? 16.5 : 0)).toFixed(2);

    const items: StoreOrderItem[] = Array.from({ length: Math.min(itemsCount, 3) }, (__, pIdx) => ({
      id: pIdx + 1,
      productName: sampleProducts[(idx + pIdx) % sampleProducts.length].name,
      variant: pIdx === 0 ? "لون أسود" : "لون كحلي",
      size: pIdx === 0 ? "L" : "M",
      quantity: Math.max(1, Math.floor(itemsCount / 2)),
      price: sampleProducts[(idx + pIdx) % sampleProducts.length].price.toFixed(2),
    }));

    return {
      id: idx + 1,
      orderNumber: `#VIO-${orderNum}`,
      customerName: cust.name,
      customerPhone: cust.phone,
      customerEmail: cust.email,
      itemsCount,
      items,
      city: cust.city,
      address: cust.address,
      createdAt: daysAgo(idx),
      total: idx === 0 ? "346.50" : idx === 1 ? "310.00" : idx === 2 ? "60.00" : totalCalc,
      shippingFee: idx % 2 === 0 ? "15.00" : "0.00",
      paymentMethod: idx % 2 === 0 ? "ONLINE" : "CASH_ON_DELIVERY",
      status,
    };
  });
}

const MOCK_PRODUCT_REVIEWS_SEED: ProductReview[] = [
  {
    id: 1,
    productId: 101,
    productName: "فستان سهرة كلاسيك حريري",
    productImage: null,
    productPrice: "240.00",
    orderId: 1049,
    orderNumber: "#VIO-1049",
    storeId: 1,
    storeName: "متجر الهدى للأزياء",
    storeLogoUrl: null,
    storeCity: "غزة",
    storeAverageRating: 4.8,
    storeTotalReviews: 38,
    customerId: 501,
    customerName: "رغد الأغا",
    customerPhone: "0599112233",
    rating: 5,
    comment: "الخامة ممتازة جداً وتفاصيل القماش فخمة والمقاس جاء مضبوط تماماً بعد الاستلام! التوصيل كان سريع والتغليف راقي.",
    isHidden: false,
    hiddenReason: null,
    hiddenAt: null,
    createdAt: daysAgo(2),
  },
  {
    id: 2,
    productId: 102,
    productName: "قميص قطن صيفي كاجوال",
    productImage: null,
    productPrice: "85.00",
    orderId: 1048,
    orderNumber: "#VIO-1048",
    storeId: 2,
    storeName: "إيليت فاشن",
    storeLogoUrl: null,
    storeCity: "رام الله",
    storeAverageRating: 4.6,
    storeTotalReviews: 29,
    customerId: 502,
    customerName: "أحمد حسن",
    customerPhone: "0598774411",
    rating: 5,
    comment: "وصل الطلب بحالة ممتازة وجودة القماش قطنية 100% ومريح جداً باللبس. تجربة ممتازة وسأكرر الشراء.",
    isHidden: false,
    hiddenReason: null,
    hiddenAt: null,
    createdAt: daysAgo(3),
  },
  {
    id: 3,
    productId: 103,
    productName: "حذاء كلاسيك جلد طبيعي",
    productImage: null,
    productPrice: "160.00",
    orderId: 1045,
    orderNumber: "#VIO-1045",
    storeId: 1,
    storeName: "متجر الهدى للأزياء",
    storeLogoUrl: null,
    storeCity: "غزة",
    storeAverageRating: 4.8,
    storeTotalReviews: 38,
    customerId: 503,
    customerName: "محمود الخالدي",
    customerPhone: "0592334455",
    rating: 4,
    comment: "الحذاء أنيق ومريح في المشي، فقط النعل يحتاج يومين ليلين. الجودة عموماً تستحق السعر.",
    isHidden: false,
    hiddenReason: null,
    hiddenAt: null,
    createdAt: daysAgo(5),
  },
  {
    id: 4,
    productId: 104,
    productName: "حقيبة كتف جلدية فاخرة",
    productImage: null,
    productPrice: "130.00",
    orderId: 1042,
    orderNumber: "#VIO-1042",
    storeId: 3,
    storeName: "جاردينيا بوتيك",
    storeLogoUrl: null,
    storeCity: "نابلس",
    storeAverageRating: 4.9,
    storeTotalReviews: 44,
    customerId: 504,
    customerName: "مريم النجار",
    customerPhone: "0595667788",
    rating: 5,
    comment: "الحقيبة أجمل بكثير من الصور والتقسيمات الداخلية واسعة والجلد طبيعي رائع! شكراً للمتجر على الهدية البسيطة المرفقة.",
    isHidden: false,
    hiddenReason: null,
    hiddenAt: null,
    createdAt: daysAgo(7),
  },
  {
    id: 5,
    productId: 105,
    productName: "شال كشمير صوف ناعم",
    productImage: null,
    productPrice: "55.00",
    orderId: 1039,
    orderNumber: "#VIO-1039",
    storeId: 2,
    storeName: "إيليت فاشن",
    storeLogoUrl: null,
    storeCity: "رام الله",
    storeAverageRating: 4.6,
    storeTotalReviews: 29,
    customerId: 505,
    customerName: "سارة عودة",
    customerPhone: "0594112299",
    rating: 3,
    comment: "اللون بالواقع أغمق قليلاً من الصورة في التطبيق، لكن الجودة جيدة ودافئ.",
    isHidden: false,
    hiddenReason: null,
    hiddenAt: null,
    createdAt: daysAgo(10),
  },
  {
    id: 6,
    productId: 106,
    productName: "ساعة يد كلاسيكية مقاومة للماء",
    productImage: null,
    productPrice: "190.00",
    orderId: 1035,
    orderNumber: "#VIO-1035",
    storeId: 4,
    storeName: "متجر الرحمة",
    storeLogoUrl: null,
    storeCity: "الخليل",
    storeAverageRating: 4.2,
    storeTotalReviews: 18,
    customerId: 506,
    customerName: "عمر الخطيب",
    customerPhone: "0597889900",
    rating: 1,
    comment: "تعليق غير لائق يحتوي على عبارات مسيئة وغير مقبولة ضد المتجر.",
    isHidden: true,
    hiddenReason: "مخالفة سياسة النشر واستخدام ألفاظ غير لائقة.",
    hiddenAt: daysAgo(12),
    createdAt: daysAgo(14),
  },
];

let liveProductReviews = [...MOCK_PRODUCT_REVIEWS_SEED];

// ─── الموجّه ───────────────────────────────────────────────────

export async function mockFetch(
  endpoint: string,
  options: RequestInit = {},
): Promise<ApiResponse> {
  await wait();

  if (FAIL_MODE === "network") {
    return {
      success: false,
      status: 0,
      message: "حدث خطأ في الاتصال بالخادم. يرجى المحاولة لاحقاً.",
    };
  }
  if (FAIL_MODE === "server") {
    return fail(500, "الخادم مش جاهز حالياً. جرّب بعد شوي.");
  }
  const emptyMode = FAIL_MODE === "empty";

  const url = new URL(endpoint, "http://mock.local");
  const seg = url.pathname.split("/").filter(Boolean);
  const q = url.searchParams;
  const method = (options.method ?? "GET").toUpperCase();

  const page = Number(q.get("page") ?? 1) || 1;
  const limit = Number(q.get("limit") ?? ADMIN_LIMITS.pageLimit) || ADMIN_LIMITS.pageLimit;
  const search = q.get("q") ?? "";

  // seg = ["admin", <resource>, <id?>, <action?>]
  const [, resource, rawId, action] = seg;
  const id = Number(rawId);

  // ─── نظرة عامة ──────────────────────────────────────────────
  if (resource === "stats") {
    // `period` بالأيام — نفس اسم المعامل تبع السيرفر، مش `range`
    const days = Number(q.get("period") ?? 30) || 30;
    return ok(buildStats(days));
  }

  // ─── المتاجر ────────────────────────────────────────────────
  if (resource === "stores") {
    if (!rawId) {
      const status = q.get("status");
      const rows = emptyMode
        ? []
        : db.stores
            .filter((s) => (status ? s.status === status : true))
            .filter((s) => matches(search, s.name, s.city, s.owner.name))
            .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

      const { slice, pagination } = paginate(rows, page, limit);
      return ok({ stores: slice.map(storeListItem), pagination });
    }

    const store = db.stores.find((s) => s.id === id);
    if (!store) return notFound();

    if (method === "GET") return ok({ store });

    /*
      القبول والرفض بس — ما في توثيق ولا إيقاف بالباك إند، والميثود PATCH
      مش POST. القرار قابل للتبديل بالاتجاهين، فالرفض بيمسح أثر القبول
      والعكس.
    */
    if (action === "approve" && method === "PATCH") {
      store.status = "APPROVED";
      store.isActive = true;
      store.owner.isActive = true;
      // القبول بيمسح أثر الرفض السابق — انفحص على السيرفر
      store.rejectionReason = null;
      store.reviewedAt = today();
      store.reviewedBy = { id: 398, name: db.actor, email: "owner@viora.com" };
      const merchant = db.users.find(
        (u) => u.store?.id === store.id || u.id === store.owner.id,
      );
      if (merchant) {
        merchant.isActive = true;
        if (merchant.store) {
          merchant.store.status = "APPROVED";
          merchant.store.isActive = true;
        }
      }
      return ok({ store });
    }

    if (action === "reject" && method === "PATCH") {
      const body = readBody<{ reason: string }>(options);
      /* ⚠️ شروط السبب على السيرفر الحقيقي ما انفحصت — المحاكاة هون بتفرض
         نفس حدود الواجهة (10–500) كتخمين معقول، مش كعقد مؤكّد. */
      const invalid = checkReason(body.reason);
      if (invalid) return invalid;

      store.status = "REJECTED";
      store.isActive = false;
      store.owner.isActive = false;
      store.rejectionReason = (body.reason ?? "").trim();
      store.reviewedAt = today();
      store.reviewedBy = { id: 398, name: db.actor, email: "owner@viora.com" };
      const merchant = db.users.find(
        (u) => u.store?.id === store.id || u.id === store.owner.id,
      );
      if (merchant) {
        merchant.isActive = false;
        if (merchant.store) {
          merchant.store.status = "REJECTED";
          merchant.store.isActive = false;
        }
      }
      return ok({ store });
    }

    if (action === "suspend" && method === "PATCH") {
      store.isActive = false;
      return ok({ store });
    }

    if (action === "activate" && method === "PATCH") {
      store.isActive = true;
      return ok({ store });
    }

    if (action === "feature" && method === "PATCH") {
      const body = readBody<{ order?: number }>(options);
      store.isFeatured = true;
      if (body.order !== undefined) store.featuredOrder = body.order;
      return ok({ store });
    }

    if (action === "unfeature" && method === "PATCH") {
      store.isFeatured = false;
      store.featuredOrder = null;
      return ok({ store });
    }

    if (action === "orders" && method === "GET") {
      const allOrders = generateStoreOrders(id);
      const statusFilter = q.get("status");
      const sort = q.get("sort") || "newest";

      // Calculate status counts
      const counts: Record<string, number> = {
        all: allOrders.length,
        NEW: allOrders.filter((o) => o.status === "NEW").length,
        PROCESSING: allOrders.filter((o) => o.status === "PROCESSING").length,
        READY: allOrders.filter((o) => o.status === "READY").length,
        SHIPPED: allOrders.filter((o) => o.status === "SHIPPED").length,
        COMPLETED: allOrders.filter((o) => o.status === "COMPLETED").length,
        CANCELLED: allOrders.filter((o) => o.status === "CANCELLED").length,
      };

      let filtered = allOrders;
      if (statusFilter && statusFilter !== "all") {
        filtered = filtered.filter((o) => o.status === statusFilter);
      }
      if (search) {
        filtered = filtered.filter((o) =>
          matches(search, o.orderNumber, o.customerName, o.city, o.address, o.createdAt),
        );
      }

      if (sort === "oldest") {
        filtered.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
      } else if (sort === "highest") {
        filtered.sort((a, b) => Number(b.total) - Number(a.total));
      } else {
        filtered.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      }

      const { slice, pagination } = paginate(filtered, page, limit);
      return ok({ orders: slice, pagination, counts });
    }
  }

  // ─── المستخدمون ─────────────────────────────────────────────
  if (resource === "users") {
    if (!rawId) {
      const role = q.get("role");
      // `isActive` بولياني نصّي — نفس اسم وقيم فلتر السيرفر، مش `status`
      const isActive = q.get("isActive");
      const rows = emptyMode
        ? []
        : db.users
            .filter((u) => (role ? u.role === role : true))
            .filter((u) =>
              isActive ? u.isActive === (isActive === "true") : true,
            )
            .filter((u) => matches(search, u.name, u.email, u.phone))
            .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

      const { slice, pagination } = paginate(rows, page, limit);
      return ok({ users: slice.map(userListItem), pagination });
    }

    const user = db.users.find((u) => u.id === id);
    if (!user) return notFound();

    if (method === "GET") return ok({ user });

    /* بلا سبب — رد السيرفر ما فيه حقل يخزّنه. والميثود PATCH مش POST. */
    if (action === "suspend" && method === "PATCH") {
      setUserActive(user, false);
      return ok({ user });
    }

    // الاسم `activate` مش `reactivate` — انفحص على السيرفر
    if (action === "activate" && method === "PATCH") {
      setUserActive(user, true);
      return ok({ user });
    }
  }
  // ─── التصنيفات ──────────────────────────────────────────────
  if (resource === "categories") {
    /*
      بيحاكي عقد `/admin/categories` الحقيقي:
      - الكتابة بترجّع **التصنيف الواحد** `category` مش الشجرة.
      - الشجرة مستويين — ما بينضاف تحت فرعي.
      - الحذف بيرجّع 409 مع العدّادات لو التصنيف مربوط.
    */

    /** بيلاقي أي عقدة بالشجرة مع أبوها — الشجرة مستويين فالبحث مستويين */
    const locate = (nodeId: number) => {
      const root = db.categories.find((c) => c.id === nodeId);
      if (root) return { node: root as AdminCategoryNode, parent: null };
      for (const parent of db.categories) {
        const child = parent.children.find((c) => c.id === nodeId);
        if (child) return { node: child as AdminCategoryNode, parent };
      }
      return null;
    };

    const missing = () => fail(404, "التصنيف غير موجود");

    if (rawId === "reorder" && method === "PATCH") {
      return ok({ message: "تمت إعادة الترتيب بنجاح" });
    }

    if (method === "GET") {
      if (rawId) {
        const found = locate(id);
        return found ? ok({ category: found.node }) : missing();
      }
      const rows = emptyMode ? [] : db.categories;
      return ok({ categories: rows, count: rows.length, flat: false });
    }

    if (method === "POST" && !rawId) {
      const body = readBody<CategoryPayload>(options);
      const name = (body.name ?? "").trim();

      if (!name) {
        return fail(400, "بيانات غير صحيحة", { name: "اسم التصنيف مطلوب" });
      }

      const newId = ++db.nextCategoryId;
      const base = {
        id: newId,
        name,
        slug: `category-${newId}`,
        imageUrl: body.imageUrl ?? null,
        sortOrder: body.sortOrder ?? 0,
        isActive: body.isActive ?? true,
        createdAt: today(),
        updatedAt: today(),
        childrenCount: 0,
        productsCount: 0,
        storesCount: 0,
      };

      if (body.parentId) {
        const parent = db.categories.find((c) => c.id === body.parentId);
        // الأب لازم يكون جذر — الشجرة مستويين بس
        if (!parent) {
          return fail(400, "بيانات غير صحيحة", {
            parentId: "الشجرة مستويين بس",
          });
        }
        if (!body.sizeGroup) {
          return fail(400, "بيانات غير صحيحة", {
            sizeGroup:
              "مجموعة المقاسات مطلوبة للتصنيف الفرعي (CLOTHING · SHOES · KIDS · ONE_SIZE)",
          });
        }

        const child = { ...base, sizeGroup: body.sizeGroup, parentId: parent.id };
        parent.children.push(child);
        parent.childrenCount = parent.children.length;
        return { ...ok({ category: child }), status: 201 };
      }

      if (body.sizeGroup) {
        return fail(400, "بيانات غير صحيحة", {
          sizeGroup: "التصنيف الرئيسي ما بياخد مجموعة مقاسات — المنتجات بتنحط على الفرعي",
        });
      }

      const root = { ...base, sizeGroup: null, parentId: null, children: [] };
      db.categories.push(root);
      return { ...ok({ category: root }), status: 201 };
    }

    if (rawId) {
      const found = locate(id);
      if (!found) return missing();
      const { node, parent } = found;

      if (method === "PATCH" && !action) {
        const body = readBody<CategoryUpdatePayload>(options);

        if (body.name !== undefined) {
          const name = body.name.trim();
          if (!name) {
            return fail(400, "بيانات غير صحيحة", { name: "اسم التصنيف مطلوب" });
          }
          node.name = name; // ⚠️ الـslug ما بيتغيّر مع إعادة التسمية — زي السيرفر
        }
        if (body.imageUrl !== undefined) node.imageUrl = body.imageUrl;
        if (body.sortOrder !== undefined) {
          if (!Number.isInteger(body.sortOrder) || body.sortOrder < 0 || body.sortOrder > 9999) {
            return fail(400, "بيانات غير صحيحة", {
              sortOrder: "الترتيب لازم يكون رقم من 0 لـ 9999",
            });
          }
          node.sortOrder = body.sortOrder;
        }
        if (body.isActive !== undefined) node.isActive = body.isActive;

        node.updatedAt = today();
        return ok({ category: node });
      }

      if (method === "PATCH" && (action === "activate" || action === "deactivate")) {
        node.isActive = action === "activate";
        node.updatedAt = today();
        return ok({ category: node });
      }

      if (method === "DELETE") {
        // نفس شرط السيرفر: الحذف بينجح بس لما العدّادات التلاتة صفر
        if (node.childrenCount > 0 || node.productsCount > 0 || node.storesCount > 0) {
          const reason =
            node.childrenCount > 0
              ? `${node.childrenCount} تصنيف فرعي`
              : node.productsCount > 0
                ? `${node.productsCount} منتج`
                : `${node.storesCount} متجر`;
          return {
            ...fail(409, `ما بينحذف — مربوط فيه ${reason}. اخفيه بدل ما تحذفه`),
            childrenCount: node.childrenCount,
            productsCount: node.productsCount,
            storesCount: node.storesCount,
          };
        }

        if (parent) {
          parent.children = parent.children.filter((c) => c.id !== id);
          parent.childrenCount = parent.children.length;
        } else {
          db.categories = db.categories.filter((c) => c.id !== id);
        }
        return ok({ category: { id: node.id, name: node.name } });
      }
    }
  }

  // ─── البلاغات ───────────────────────────────────────────────
  if (resource === "reports") {
    if (!rawId) {
      const targetType = q.get("targetType");
      const status = q.get("status");
      const rows = emptyMode
        ? []
        : db.reports
            .filter((r) => (targetType ? r.targetType === targetType : true))
            .filter((r) => (status ? r.status === status : true))
            .filter((r) =>
              matches(search, r.reason, r.reporter.name, r.targetPreview),
            )
            .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

      const { slice, pagination } = paginate(rows, page, limit);
      return ok({ reports: slice.map(reportListItem), pagination });
    }

    const report = db.reports.find((r) => r.id === id);
    if (!report) return notFound();

    if (method === "GET") return ok({ report });

    if (method === "PATCH") {
      const body = readBody<{ status: ReportStatus; note: string }>(options);
      if (body.status) {
        report.status = body.status;
        report.resolvedAt = body.status === "OPEN" ? null : today();
      }
      if (typeof body.note === "string") report.note = body.note.trim() || null;
      return ok({ report });
    }
  }

  // ─── التقييمات ──────────────────────────────────────────────
  if (resource === "reviews") {
    // 1. Overview stats
    if (rawId === "overview" && method === "GET") {
      const all = liveProductReviews;
      const totalReviews = all.length;
      const avg = totalReviews > 0 ? (all.reduce((s, r) => s + r.rating, 0) / totalReviews) : 0;
      const positiveCount = all.filter((r) => r.rating >= 4).length;
      const positivePercentage = totalReviews > 0 ? Math.round((positiveCount / totalReviews) * 100) : 0;
      const hiddenCount = all.filter((r) => r.isHidden).length;

      const starCounts = {
        5: all.filter((r) => r.rating === 5).length,
        4: all.filter((r) => r.rating === 4).length,
        3: all.filter((r) => r.rating === 3).length,
        2: all.filter((r) => r.rating === 2).length,
        1: all.filter((r) => r.rating === 1).length,
      };

      const overview: ReviewsOverviewStats = {
        platformAverage: Number(avg.toFixed(1)),
        totalReviews,
        positivePercentage,
        hiddenCount,
        starCounts,
      };

      return ok({ overview });
    }

    // 2. Store ratings list
    if (rawId === "stores" && method === "GET") {
      const storesMap = new Map<number, { name: string; city: string | null; ratings: number[] }>();
      for (const r of liveProductReviews) {
        const sId = r.storeId ?? r.store?.id ?? 1;
        const sName = r.storeName ?? r.store?.name ?? "متجر";
        const sCity = r.storeCity ?? r.store?.city ?? null;
        if (!storesMap.has(sId)) {
          storesMap.set(sId, { name: sName, city: sCity, ratings: [] });
        }
        storesMap.get(sId)!.ratings.push(r.rating);
      }

      const storeSummaries: StoreRatingSummary[] = Array.from(storesMap.entries()).map(([storeId, val]) => {
        const total = val.ratings.length;
        const avg = total > 0 ? val.ratings.reduce((a, b) => a + b, 0) / total : 0;
        return {
          storeId,
          storeName: val.name,
          storeLogoUrl: null,
          city: val.city,
          averageRating: Number(avg.toFixed(1)),
          totalReviews: total,
          ratingDistribution: {
            5: val.ratings.filter((r) => r === 5).length,
            4: val.ratings.filter((r) => r === 4).length,
            3: val.ratings.filter((r) => r === 3).length,
            2: val.ratings.filter((r) => r === 2).length,
            1: val.ratings.filter((r) => r === 1).length,
          },
        };
      });

      const { slice, pagination } = paginate(storeSummaries, page, limit);
      return ok({ stores: slice, pagination });
    }

    // 3. Product Reviews list
    if (!rawId && method === "GET") {
      const ratingFilter = q.get("rating") ? Number(q.get("rating")) : undefined;
      const storeIdFilter = q.get("storeId") ? Number(q.get("storeId")) : undefined;
      const isHiddenFilter = q.get("isHidden");
      const sort = q.get("sort") || "newest";

      let rows = [...liveProductReviews];

      if (ratingFilter) {
        rows = rows.filter((r) => r.rating === ratingFilter);
      }
      if (storeIdFilter) {
        rows = rows.filter((r) => r.storeId === storeIdFilter);
      }
      if (isHiddenFilter !== null && isHiddenFilter !== undefined && isHiddenFilter !== "") {
        rows = rows.filter((r) => r.isHidden === (isHiddenFilter === "true"));
      }
      if (search) {
        rows = rows.filter((r) =>
          matches(search, r.productName, r.storeName, r.customerName, r.orderNumber, r.comment ?? ""),
        );
      }

      if (sort === "highest") {
        rows.sort((a, b) => b.rating - a.rating || b.createdAt.localeCompare(a.createdAt));
      } else if (sort === "lowest") {
        rows.sort((a, b) => a.rating - b.rating || b.createdAt.localeCompare(a.createdAt));
      } else {
        rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      }

      const totalReviews = liveProductReviews.length;
      const avg = totalReviews > 0 ? (liveProductReviews.reduce((s, r) => s + r.rating, 0) / totalReviews) : 0;
      const positiveCount = liveProductReviews.filter((r) => r.rating >= 4).length;
      const positivePercentage = totalReviews > 0 ? Math.round((positiveCount / totalReviews) * 100) : 0;
      const hiddenCount = liveProductReviews.filter((r) => r.isHidden).length;

      const overview: ReviewsOverviewStats = {
        platformAverage: Number(avg.toFixed(1)),
        totalReviews,
        positivePercentage,
        hiddenCount,
        starCounts: {
          5: liveProductReviews.filter((r) => r.rating === 5).length,
          4: liveProductReviews.filter((r) => r.rating === 4).length,
          3: liveProductReviews.filter((r) => r.rating === 3).length,
          2: liveProductReviews.filter((r) => r.rating === 2).length,
          1: liveProductReviews.filter((r) => r.rating === 1).length,
        },
      };

      const { slice, pagination } = paginate(rows, page, limit);
      return ok({ reviews: slice, pagination, overview });
    }

    // 4. Single review actions
    const review = liveProductReviews.find((r) => r.id === id);
    if (!review) return notFound();

    if (action === "hide" && method === "POST") {
      const body = readBody<{ reason: string }>(options);
      const invalid = checkReason(body.reason);
      if (invalid) return invalid;

      review.isHidden = true;
      review.hiddenReason = (body.reason ?? "").trim();
      review.hiddenAt = today();
      return ok({ review });
    }

    if (action === "unhide" && method === "POST") {
      review.isHidden = false;
      review.hiddenReason = null;
      review.hiddenAt = null;
      return ok({ review });
    }
  }

  // ─── المحتوى ────────────────────────────────────────────────
  if (resource === "content") {
    if (rawId === "home") {
      if (method === "GET") return ok({ home: db.home });
      if (method === "PUT") {
        db.home = { ...db.home, ...readBody<typeof db.home>(options) };
        return ok({ home: db.home });
      }
    }

    if (rawId === "pages") {
      if (!action) return ok({ pages: db.pages });

      const staticPage = db.pages.find((p) => p.key === (action as StaticPageKey));
      if (!staticPage) return notFound();

      if (method === "GET") return ok({ page: staticPage });

      if (method === "PUT") {
        const body = readBody<{ title: string; body: string }>(options);
        const title = (body.title ?? "").trim();
        const text = body.body ?? "";
        const errors: Record<string, string> = {};

        if (!title) errors.title = "أدخل عنوان الصفحة";
        if (!text.trim()) errors.body = "أدخل نص الصفحة";
        else if (text.length > ADMIN_LIMITS.pageBodyMax) {
          errors.body = "النص أطول من الحد المسموح";
        }
        if (Object.keys(errors).length > 0) {
          return fail(400, "بيانات غير صحيحة", errors);
        }

        staticPage.title = title;
        staticPage.body = text;
        staticPage.updatedAt = today();
        return ok({ page: staticPage });
      }
    }
  }

  // ─── الإعلانات ──────────────────────────────────────────────
  if (resource === "banners") {
    if (!rawId) {
      if (method === "GET") {
        const rows = emptyMode
          ? []
          : [...db.banners].sort((a, b) => a.position - b.position);
        return ok({ banners: rows });
      }

      if (method === "POST") {
        const body = readBody<BannerPayload>(options);
        const invalid = checkBanner(body);
        if (invalid) return invalid;

        db.banners.push({
          id: ++db.nextBannerId,
          title: (body.title ?? "").trim(),
          imageUrl: body.imageUrl ?? "",
          linkUrl: body.linkUrl || null,
          position: body.position ?? db.banners.length + 1,
          isActive: body.isActive ?? true,
          startsAt: body.startsAt || null,
          endsAt: body.endsAt || null,
        });
        return ok({ banners: db.banners });
      }
    }

    const index = db.banners.findIndex((b) => b.id === id);
    if (index === -1) return notFound();

    if (method === "PATCH") {
      const body = readBody<BannerPayload>(options);
      // التفعيل السريع بيبعث isActive لحاله — بلا عنوان ولا صورة
      const activeOnly = Object.keys(body).length === 1 && "isActive" in body;
      if (!activeOnly) {
        const invalid = checkBanner(body);
        if (invalid) return invalid;
      }
      db.banners[index] = { ...db.banners[index], ...body, id };
      return ok({ banners: db.banners });
    }

    if (method === "DELETE") {
      db.banners.splice(index, 1);
      return ok({ banners: db.banners });
    }
  }

  // ─── وسوم وفلاتر المناسبات ───────────────────────────────────
  if (resource === "occasions") {
    if (!rawId) {
      if (method === "GET") {
        const rows = emptyMode
          ? []
          : [...db.occasions].sort((a, b) => a.sortOrder - b.sortOrder);
        return ok({ occasions: rows });
      }

      if (method === "POST") {
        const body = readBody<OccasionFilterPayload>(options);
        const name = (body.name ?? "").trim();
        if (!name) return fail(400, "بيانات غير صحيحة", { name: "اسم الفلتر مطلوب" });

        const newId = ++db.nextOccasionId;
        const newOccasion = {
          id: newId,
          name,
          slug: body.slug?.trim() || `occasion-${newId}`,
          icon: body.icon || "sparkles",
          description: body.description?.trim() || "",
          productsCount: 0,
          isActive: body.isActive ?? true,
          isFeaturedOnHome: body.isFeaturedOnHome ?? false,
          sortOrder: body.sortOrder ?? db.occasions.length + 1,
          targetCategories: body.targetCategories || [],
        };
        db.occasions.push(newOccasion);
        return ok({ occasions: db.occasions });
      }
    }

    const index = db.occasions.findIndex((o) => o.id === id);
    if (index === -1) return notFound();

    if (method === "PATCH") {
      const body = readBody<Partial<OccasionFilterPayload>>(options);
      db.occasions[index] = { ...db.occasions[index], ...body, id };
      return ok({ occasions: db.occasions });
    }

    if (method === "DELETE") {
      db.occasions.splice(index, 1);
      return ok({ occasions: db.occasions });
    }
  }

  // ─── المجموعات المميزة ──────────────────────────────────────────
  if (resource === "collections") {
    if (!rawId) {
      if (method === "GET") {
        const rows = emptyMode
          ? []
          : [...db.collections].sort((a, b) => a.sortOrder - b.sortOrder);
        return ok({ collections: rows });
      }

      if (method === "POST") {
        const body = readBody<FeaturedCollectionPayload>(options);
        const title = (body.title ?? "").trim();
        if (!title) return fail(400, "بيانات غير صحيحة", { title: "عنوان المجموعة مطلوب" });

        const newId = ++db.nextCollectionId;
        const newCollection = {
          id: newId,
          title,
          slug: body.slug?.trim() || `collection-${newId}`,
          subtitle: body.subtitle?.trim() || "",
          badge: body.badge?.trim() || null,
          imageUrl: body.imageUrl || null,
          productsCount: 0,
          isActive: body.isActive ?? true,
          sortOrder: body.sortOrder ?? db.collections.length + 1,
        };
        db.collections.push(newCollection);
        return ok({ collections: db.collections });
      }
    }

    const index = db.collections.findIndex((c) => c.id === id);
    if (index === -1) return notFound();

    if (method === "PATCH") {
      const body = readBody<Partial<FeaturedCollectionPayload>>(options);
      db.collections[index] = { ...db.collections[index], ...body, id };
      return ok({ collections: db.collections });
    }

    if (method === "DELETE") {
      db.collections.splice(index, 1);
      return ok({ collections: db.collections });
    }
  }

  // ─── التوصيل ────────────────────────────────────────────────
  if (resource === "delivery") {
    if (rawId === "health") return ok({ health: db.deliveryHealth });

    if (rawId === "failures") {
      const rows = emptyMode ? [] : db.deliveryFailures;
      const { slice, pagination } = paginate(rows, page, limit);
      return ok({ failures: slice, pagination });
    }
  }

  return notFound();
}

function checkBanner(body: Partial<BannerPayload>): ApiResponse | null {
  const errors: Record<string, string> = {};
  if (!(body.title ?? "").trim()) errors.title = "أدخل عنوان الإعلان";
  if (!body.imageUrl) errors.imageUrl = "أضف صورة الإعلان";
  return Object.keys(errors).length > 0
    ? fail(400, "بيانات غير صحيحة", errors)
    : null;
}

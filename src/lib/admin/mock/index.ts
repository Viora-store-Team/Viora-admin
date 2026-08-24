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
  AdminStatsCharts,
  BannerPayload,
  CategoryPayload,
  OrdersPoint,
  ReportStatus,
  SignupsPoint,
  StaticPageKey,
  StatsCounters,
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
    if (method === "GET") {
      return ok({ categories: emptyMode ? [] : db.categories });
    }

    if (method === "POST") {
      const body = readBody<CategoryPayload>(options);
      const name = (body.name ?? "").trim();
      const errors: Record<string, string> = {};

      if (
        name.length < ADMIN_LIMITS.categoryNameMin ||
        name.length > ADMIN_LIMITS.categoryNameMax
      ) {
        errors.name = "الاسم لازم يكون من حرفين لـ 60";
      }
      if (Object.keys(errors).length > 0) {
        return fail(400, "بيانات غير صحيحة", errors);
      }

      const newId = ++db.nextCategoryId;
      const slug = `cat-${newId}`;

      if (body.parentId) {
        const parent = db.categories.find((c) => c.id === body.parentId);
        if (!parent) return notFound();

        // التصنيف الفرعي بلا sizeGroup بيكسر اختيار المقاسات بصفحة المنتج
        const sizeGroup = body.sizeGroup;
        if (!sizeGroup) {
          return fail(400, "بيانات غير صحيحة", {
            sizeGroup: "اختر مجموعة المقاسات",
          });
        }

        parent.children.push({
          id: newId,
          name,
          slug,
          imageUrl: body.imageUrl ?? null,
          sizeGroup,
          productsCount: 0,
        });
      } else {
        db.categories.push({
          id: newId,
          name,
          slug,
          imageUrl: body.imageUrl ?? null,
          sizeGroup: null,
          productsCount: 0,
          children: [],
        });
      }

      return ok({ categories: db.categories });
    }

    if (method === "PATCH") {
      const body = readBody<CategoryPayload>(options);
      const name = (body.name ?? "").trim();
      if (
        name.length < ADMIN_LIMITS.categoryNameMin ||
        name.length > ADMIN_LIMITS.categoryNameMax
      ) {
        return fail(400, "بيانات غير صحيحة", {
          name: "الاسم لازم يكون من حرفين لـ 60",
        });
      }

      const root = db.categories.find((c) => c.id === id);
      if (root) {
        root.name = name;
        root.imageUrl = body.imageUrl ?? root.imageUrl;
        return ok({ categories: db.categories });
      }

      for (const parent of db.categories) {
        const child = parent.children.find((c) => c.id === id);
        if (child) {
          child.name = name;
          child.imageUrl = body.imageUrl ?? child.imageUrl;
          // ⚠️ sizeGroup ما بينعدّل — تغييره بيبطّل كل variantSizeId تحت التصنيف
          return ok({ categories: db.categories });
        }
      }

      return notFound();
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
    const review = db.reviews.find((r) => r.id === id);
    if (!review) return notFound();

    if (action === "hide") {
      const body = readBody<{ reason: string }>(options);
      const invalid = checkReason(body.reason);
      if (invalid) return invalid;

      review.isHidden = true;
      review.hiddenReason = (body.reason ?? "").trim();
      review.hiddenAt = today();
      return ok({ review });
    }

    if (action === "unhide") {
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

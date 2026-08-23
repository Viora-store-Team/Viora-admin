/**
 * قاعدة البيانات التجريبية — مصفوفات **قابلة للتعديل** بالذاكرة.
 *
 * ليش قابلة للتعديل: عشان الإيقاف والتوثيق وإخفاء التقييم وإنشاء التصنيف
 * تبيّن أثرها فعلياً وقت التجربة بدل ما ترجع نفس البيانات. بتتصفّى مع إعادة
 * تحميل الصفحة — نفس عمر كاش lookups.ts، وهو المطلوب لبيانات تجريبية.
 */

import type {
  AdminCategoryRoot,
  AdminReportDetail,
  AdminStoreDetail,
  AdminUserDetail,
  Banner,
  DeliveryFailure,
  DeliveryHealth,
  HomeContent,
  ReportStatus,
  ReportTarget,
  Review,
  StaticPage,
  StoreStatus,
} from "../types";
import {
  CITIES,
  CUSTOMER_NAMES,
  OWNER_NAMES,
  REPORT_REASONS,
  REVIEW_COMMENTS,
  STORE_NAMES,
  daysAgo,
  hoursAgo,
  spread,
} from "./seed";

/** اسم المشرف المنفّذ — بالحقيقة السيرفر هو اللي بيحطّه من التوكن */
const ACTOR = "مالك المنصة";

// ─── المتاجر ───────────────────────────────────────────────────

/*
  الشكل تحت **مطابق لرد /admin/stores الحقيقي** — مع إنه تجريبي.

  القصد إن مفتاح الطوارئ NEXT_PUBLIC_ADMIN_MOCK=true يضل يخدم نفس الصفحات
  بلا فرع خاص فيه. لو انحرف الشكل هون عن السيرفر، بيصير المفتاح يخفي أعطال
  بدل ما يبيّنها — وهذا أسوأ من إنه ما يكون موجود.
*/

function storeStatus(i: number): StoreStatus {
  if (i % 9 === 4) return "PENDING";
  if (i % 11 === 7) return "REJECTED";
  return "APPROVED";
}

const stores: AdminStoreDetail[] = STORE_NAMES.map((name, i) => {
  const status = storeStatus(i);
  const products = spread(i, 40, 2);
  const orders = spread(i, 180, 5);
  const reviewed = status !== "PENDING";

  return {
    id: i + 1,
    name,
    logoUrl: null,
    city: CITIES[i % CITIES.length],
    status,
    // مستقل عن قرار المراجعة — متجر مقبول وموقوف حالة واردة
    isActive: i % 17 !== 9,
    createdAt: daysAgo(200 - i * 7),
    reviewedAt: reviewed ? daysAgo(150 - i * 5) : null,
    owner: {
      id: 100 + i,
      name: OWNER_NAMES[i % OWNER_NAMES.length],
      email: `owner${i + 1}@viora-demo.com`,
      phone: `059${String(2000000 + i * 91733).slice(0, 7)}`,
      emailVerified: i % 5 !== 0,
      isActive: i % 13 !== 5,
      createdAt: daysAgo(201 - i * 7),
    },
    productsCount: products,
    ordersCount: orders,

    description:
      i % 4 === 0
        ? null
        : `متجر متخصّص بـ${name.split(" ").slice(-1)[0]} — توصيل لكل المحافظات.`,
    coverUrl: null,
    phone: `059${String(1000000 + i * 13757).slice(0, 7)}`,
    address: `${CITIES[i % CITIES.length]}، شارع ${spread(i, 40, 3)}`,
    rejectionReason:
      status === "REJECTED"
        ? "صور المتجر مش واضحة والوصف ناقص — عدّلهن وقدّم الطلب من جديد."
        : null,
    updatedAt: daysAgo(10 + (i % 30)),
    reviewedBy: reviewed
      ? { id: 398, name: ACTOR, email: "owner@viora.com" }
      : null,
    categories: [
      { id: 1, name: "ملابس رجالية", slug: "mens-clothing", imageUrl: null },
      { id: 2, name: "ملابس نسائية", slug: "womens-clothing", imageUrl: null },
    ].slice(0, (i % 2) + 1),
    revenue: (orders * 87.5).toFixed(2),
  };
});

// ─── المستخدمون ────────────────────────────────────────────────

/*
  مطابق لرد `/admin/users` الحقيقي: `isActive` بولياني بدل `status`،
  والمتجر متداخل جوّا `store` بدل `storeId`/`storeName` مفلطحين. ما في
  `suspension` ولا `lastLoginAt` — السيرفر ما بيرجّعهم.
*/

const merchants: AdminUserDetail[] = stores.map((store, i) => ({
  id: store.owner.id,
  name: store.owner.name,
  email: store.owner.email,
  phone: store.owner.phone,
  avatarUrl: null,
  role: "MERCHANT",
  emailVerified: store.owner.emailVerified,
  isActive: store.owner.isActive,
  createdAt: store.createdAt,
  store: {
    id: store.id,
    name: store.name,
    status: store.status,
    isActive: store.isActive,
  },
  ordersCount: store.ordersCount,
  updatedAt: daysAgo(spread(i, 30)),
  addressesCount: spread(i, 3),
  hasPassword: i % 9 !== 4,
  linkedGoogle: i % 5 === 2,
  // التاجر بياخد `revenue` بس — بلا `totalSpent`
  revenue: store.revenue,
}));

const customers: AdminUserDetail[] = CUSTOMER_NAMES.map((name, i) => {
  const orders = spread(i, 22);
  return {
    id: 500 + i,
    name,
    email: `customer${i + 1}@viora-demo.com`,
    // الزبون ما بنطلب منه رقم بالتسجيل — null هون طبيعي مش نقص بيانات
    phone: i % 3 === 0 ? null : `056${String(3000000 + i * 55217).slice(0, 7)}`,
    avatarUrl: null,
    role: "CUSTOMER",
    emailVerified: i % 4 !== 1,
    isActive: i % 8 !== 6,
    createdAt: daysAgo(160 - i * 8),
    store: null,
    ordersCount: orders,
    updatedAt: daysAgo(spread(i, 25)),
    addressesCount: spread(i, 4, 1),
    hasPassword: i % 7 !== 3,
    linkedGoogle: i % 4 === 1,
    // الزبون بياخد `totalSpent` بس — بلا `revenue`
    totalSpent: (orders * 87.5).toFixed(2),
  };
});

const users: AdminUserDetail[] = [...merchants, ...customers];

// ─── التصنيفات ─────────────────────────────────────────────────

/**
 * ⚠️ نفس شكل GET /categories الحقيقي — الجذر sizeGroup: null والابن إلزامي.
 * أي خلل هون بينعكس مباشرة على CategoryPicker بصفحة إنشاء المنتج.
 */
const categories: AdminCategoryRoot[] = [
  {
    id: 1,
    name: "ملابس رجالية",
    slug: "mens-clothing",
    imageUrl: null,
    sizeGroup: null,
    productsCount: 64,
    children: [
      { id: 11, name: "قمصان", slug: "shirts", imageUrl: null, sizeGroup: "CLOTHING", productsCount: 28 },
      { id: 12, name: "بناطيل", slug: "pants", imageUrl: null, sizeGroup: "CLOTHING", productsCount: 21 },
      { id: 13, name: "جاكيتات", slug: "jackets", imageUrl: null, sizeGroup: "CLOTHING", productsCount: 15 },
    ],
  },
  {
    id: 2,
    name: "ملابس نسائية",
    slug: "womens-clothing",
    imageUrl: null,
    sizeGroup: null,
    productsCount: 82,
    children: [
      { id: 21, name: "فساتين", slug: "dresses", imageUrl: null, sizeGroup: "CLOTHING", productsCount: 34 },
      { id: 22, name: "بلوزات", slug: "blouses", imageUrl: null, sizeGroup: "CLOTHING", productsCount: 26 },
      { id: 23, name: "عبايات", slug: "abayas", imageUrl: null, sizeGroup: "CLOTHING", productsCount: 22 },
    ],
  },
  {
    id: 3,
    name: "أطفال",
    slug: "kids",
    imageUrl: null,
    sizeGroup: null,
    productsCount: 41,
    children: [
      { id: 31, name: "ملابس أولاد", slug: "boys", imageUrl: null, sizeGroup: "KIDS", productsCount: 23 },
      { id: 32, name: "ملابس بنات", slug: "girls", imageUrl: null, sizeGroup: "KIDS", productsCount: 18 },
    ],
  },
  {
    id: 4,
    name: "أحذية",
    slug: "shoes",
    imageUrl: null,
    sizeGroup: null,
    productsCount: 37,
    children: [
      { id: 41, name: "أحذية رجالية", slug: "mens-shoes", imageUrl: null, sizeGroup: "SHOES", productsCount: 16 },
      { id: 42, name: "أحذية نسائية", slug: "womens-shoes", imageUrl: null, sizeGroup: "SHOES", productsCount: 14 },
      { id: 43, name: "أحذية أطفال", slug: "kids-shoes", imageUrl: null, sizeGroup: "SHOES", productsCount: 7 },
    ],
  },
  {
    id: 5,
    name: "إكسسوارات",
    slug: "accessories",
    imageUrl: null,
    sizeGroup: null,
    productsCount: 19,
    children: [
      { id: 51, name: "حقائب", slug: "bags", imageUrl: null, sizeGroup: "ONE_SIZE", productsCount: 11 },
      { id: 52, name: "أحزمة", slug: "belts", imageUrl: null, sizeGroup: "ONE_SIZE", productsCount: 8 },
    ],
  },
];

// ─── منتجات مختصرة — لازمة فقط كلقطة داخل البلاغات ─────────────

const PRODUCT_NAMES = [
  "قميص قطن كلاسيك",
  "بنطلون جينز سليم",
  "فستان سهرة مطرّز",
  "جاكيت شتوي مبطّن",
  "حذاء رياضي خفيف",
  "عباية كلوش سادة",
  "بلوزة صيفية",
  "حقيبة يد جلد",
];

const products = PRODUCT_NAMES.map((name, i) => ({
  id: 1000 + i,
  name,
  price: (45 + i * 17.5).toFixed(2),
  image: null as string | null,
  storeId: stores[i % stores.length].id,
  storeName: stores[i % stores.length].name,
  isActive: i % 6 !== 4,
}));

// ─── التقييمات ─────────────────────────────────────────────────

/**
 * ⚠️ isHidden بتحجب عن **الزبون بس** — التاجر بيضل يشوف التقييم.
 * سياسة منتج مقرّرة، فما في مكان بالواجهة بيقول "محذوف".
 */
const reviews: Review[] = REVIEW_COMMENTS.map((comment, i) => {
  const onProduct = i % 3 !== 2;
  const product = products[i % products.length];
  const store = stores[i % stores.length];
  const hidden = i % 5 === 1;

  return {
    id: 200 + i,
    targetType: onProduct ? "PRODUCT" : "STORE",
    targetId: onProduct ? product.id : store.id,
    targetName: onProduct ? product.name : store.name,
    // التقييمات السلبية هي اللي بينبلّغ عنها غالباً — التوزيع بيعكس هيك
    rating: (i % 5) + 1,
    comment,
    author: {
      id: customers[i % customers.length].id,
      name: customers[i % customers.length].name,
    },
    storeId: onProduct ? product.storeId : store.id,
    storeName: onProduct ? product.storeName : store.name,
    isHidden: hidden,
    hiddenReason: hidden
      ? "لغة مسيئة تجاه التاجر تخالف شروط استخدام المنصة."
      : null,
    hiddenAt: hidden ? daysAgo(spread(i, 20)) : null,
    createdAt: daysAgo(spread(i, 90, 2)),
  };
});

// ─── البلاغات ──────────────────────────────────────────────────

function reportTarget(i: number): ReportTarget {
  if (i % 3 === 0) return "REVIEW";
  if (i % 3 === 1) return "PRODUCT";
  return "STORE";
}

function reportStatus(i: number): ReportStatus {
  if (i % 4 === 1) return "RESOLVED";
  if (i % 7 === 5) return "DISMISSED";
  return "OPEN";
}

const reports: AdminReportDetail[] = Array.from({ length: 16 }, (_, i) => {
  const targetType = reportTarget(i);
  const status = reportStatus(i);
  const review = reviews[i % reviews.length];
  const product = products[i % products.length];
  const store = stores[(i + 3) % stores.length];

  const targetId =
    targetType === "REVIEW"
      ? review.id
      : targetType === "PRODUCT"
        ? product.id
        : store.id;

  const preview =
    targetType === "REVIEW"
      ? (review.comment ?? "")
      : targetType === "PRODUCT"
        ? product.name
        : store.name;

  return {
    id: 300 + i,
    targetType,
    targetId,
    targetPreview: preview,
    reason: REPORT_REASONS[i % REPORT_REASONS.length],
    reporter: {
      id: customers[(i + 5) % customers.length].id,
      name: customers[(i + 5) % customers.length].name,
    },
    status,
    createdAt: daysAgo(spread(i, 45)),
    note: status === "RESOLVED" ? "تم التواصل مع التاجر واتخاذ الإجراء اللازم." : null,
    content: {
      review: targetType === "REVIEW" ? review : null,
      product: targetType === "PRODUCT" ? product : null,
      store:
        targetType === "STORE"
          ? {
              id: store.id,
              name: store.name,
              logoUrl: store.logoUrl,
              city: store.city,
              status: store.status,
            }
          : null,
    },
    relatedCount: i % 4,
    resolvedAt: status === "OPEN" ? null : daysAgo(spread(i, 20)),
  };
});

// ─── المحتوى ───────────────────────────────────────────────────

const home: HomeContent = {
  heroTitle: "كل متاجرك المفضّلة بمكان واحد",
  heroSubtitle: "تسوّق من مئات المتاجر المحلية مع توصيل لكل المحافظات.",
  heroImageUrl: null,
  featuredStoreIds: [1, 2, 5, 9],
  featuredCategoryIds: [1, 2, 4],
};

const pages: StaticPage[] = [
  {
    key: "terms",
    title: "شروط الاستخدام",
    body:
      "باستخدامك لمنصة فيورا فأنت توافق على الشروط التالية:\n\n" +
      "١. الالتزام بصحة البيانات المدخلة عند التسجيل.\n" +
      "٢. عدم استخدام المنصة لأي غرض مخالف للقانون.\n" +
      "٣. تحتفظ المنصة بحق إيقاف أي حساب يخالف هذه الشروط.",
    updatedAt: daysAgo(40),
  },
  {
    key: "privacy",
    title: "سياسة الخصوصية",
    body:
      "نحن نحترم خصوصيتك ونلتزم بحماية بياناتك الشخصية.\n\n" +
      "البيانات التي نجمعها تُستخدم فقط لتشغيل المنصة وتحسين تجربتك، " +
      "ولا تتم مشاركتها مع أي طرف ثالث دون موافقتك.",
    updatedAt: daysAgo(65),
  },
  {
    key: "about",
    title: "من نحن",
    body:
      "فيورا منصة تجارة إلكترونية تجمع المتاجر المحلية بمكان واحد، " +
      "وتوفّر للتجار أدوات إدارة متجرهم وللزبائن تجربة تسوّق بسيطة وآمنة.",
    updatedAt: daysAgo(120),
  },
];

const banners: Banner[] = [
  {
    id: 1,
    title: "تخفيضات نهاية الموسم",
    imageUrl: "https://placehold.co/1200x400/253745/ffffff?text=Season+Sale",
    linkUrl: "/offers",
    position: 1,
    isActive: true,
    startsAt: daysAgo(10),
    endsAt: null,
  },
  {
    id: 2,
    title: "متاجر جديدة على المنصة",
    imageUrl: "https://placehold.co/1200x400/1b2a35/ffffff?text=New+Stores",
    linkUrl: null,
    position: 2,
    isActive: true,
    startsAt: null,
    endsAt: null,
  },
  {
    id: 3,
    title: "عودة المدارس",
    imageUrl: "https://placehold.co/1200x400/6b7280/ffffff?text=Back+To+School",
    linkUrl: "/products",
    position: 3,
    isActive: false,
    startsAt: daysAgo(60),
    endsAt: daysAgo(20),
  },
];

// ─── التوصيل ───────────────────────────────────────────────────

/** ⚠️ اسم المزوّد وشكل السجل تخمين — ما في أي ذكر لشركة توصيل بالمشروع */
const deliveryHealth: DeliveryHealth = {
  provider: "شركة وصّل للتوصيل",
  status: "DEGRADED",
  lastCheckAt: hoursAgo(1),
  successRate24h: 93.4,
  avgResponseMs: 842,
  failures24h: 7,
};

const DELIVERY_ERRORS = [
  { httpStatus: 504, message: "انتهت مهلة الاتصال بخادم شركة التوصيل", retryable: true },
  { httpStatus: 422, message: "العنوان المرسل غير مكتمل — المدينة مطلوبة", retryable: false },
  { httpStatus: 500, message: "خطأ داخلي عند مزوّد التوصيل", retryable: true },
  { httpStatus: 401, message: "مفتاح التكامل مرفوض — تحقّق من الإعدادات", retryable: false },
  { httpStatus: 429, message: "تجاوز حد الطلبات المسموح", retryable: true },
];

const deliveryFailures: DeliveryFailure[] = Array.from({ length: 11 }, (_, i) => {
  const error = DELIVERY_ERRORS[i % DELIVERY_ERRORS.length];
  return {
    id: 400 + i,
    occurredAt: hoursAgo(i * 3 + 1),
    orderId: `ORD-${String(1024 + i * 7).padStart(4, "0")}`,
    endpoint: i % 2 === 0 ? "POST /shipments" : "GET /shipments/status",
    ...error,
  };
});

// ─── الحالة المشتركة ───────────────────────────────────────────

export const db = {
  stores,
  users,
  categories,
  products,
  reviews,
  reports,
  banners,
  pages,
  home,
  deliveryHealth,
  deliveryFailures,
  actor: ACTOR,
  /** عدّادات المعرّفات — عشان الإنشاء بالجلسة ما يكرّر id */
  nextCategoryId: 900,
  nextBannerId: 100,
};

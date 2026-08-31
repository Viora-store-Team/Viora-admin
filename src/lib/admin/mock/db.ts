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
  FeaturedCollection,
  HomeContent,
  OccasionFilter,
  ReportStatus,
  ReportTarget,
  Review,
  SizeGroup,
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
    // المتجر المرفوض أو قيد المراجعة لا يكون نشطاً أبداً
    isActive: status === "APPROVED" && i % 17 !== 9,
    createdAt: daysAgo(200 - i * 7),
    reviewedAt: reviewed ? daysAgo(150 - i * 5) : null,
    owner: {
      id: 100 + i,
      name: OWNER_NAMES[i % OWNER_NAMES.length],
      email: `owner${i + 1}@viora-demo.com`,
      phone: `059${String(2000000 + i * 91733).slice(0, 7)}`,
      emailVerified: i % 5 !== 0,
      isActive: status === "APPROVED" && i % 13 !== 5,
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
 * ⚠️ نفس شكل `/admin/categories` الحقيقي بالضبط — بما فيه `sortOrder`
 * و`isActive` و`parentId` والعدّادات التلاتة (`childrenCount` ·
 * `productsCount` · `storesCount`). الجذر `sizeGroup: null` والابن إلزامي.
 *
 * البنّاء تحت بيعبّي الحقول المشتقّة بدل ما تنكتب يدوي على عشرين كائن —
 * `childrenCount` بينحسب من المصفوفة نفسها فما بيقدر ينحرف عنها.
 */

interface SeedChild {
  id: number;
  name: string;
  slug: string;
  sizeGroup: SizeGroup;
  productsCount: number;
  isActive?: boolean;
}

interface SeedRoot {
  id: number;
  name: string;
  slug: string;
  storesCount: number;
  children: SeedChild[];
}

const CATEGORY_SEED: SeedRoot[] = [
  {
    id: 1,
    name: "ملابس نسائية",
    slug: "womens-clothing",
    storesCount: 24,
    children: [
      { id: 101, name: "بلايز", slug: "womens-blouses", sizeGroup: "CLOTHING", productsCount: 35 },
      { id: 102, name: "قمصان", slug: "womens-shirts", sizeGroup: "CLOTHING", productsCount: 28 },
      { id: 103, name: "تيشرتات", slug: "womens-tshirts", sizeGroup: "CLOTHING", productsCount: 42 },
      { id: 104, name: "توب", slug: "womens-tops", sizeGroup: "CLOTHING", productsCount: 19 },
      { id: 105, name: "كروب توب", slug: "womens-crop-tops", sizeGroup: "CLOTHING", productsCount: 22 },
      { id: 106, name: "تونيك", slug: "womens-tunics", sizeGroup: "CLOTHING", productsCount: 17 },
      { id: 107, name: "جاكيتات", slug: "womens-jackets", sizeGroup: "CLOTHING", productsCount: 26 },
      { id: 108, name: "ترانش", slug: "womens-trench", sizeGroup: "CLOTHING", productsCount: 12 },
      { id: 109, name: "معطف", slug: "womens-coats", sizeGroup: "CLOTHING", productsCount: 18 },
      { id: 110, name: "بليزر", slug: "womens-blazers", sizeGroup: "CLOTHING", productsCount: 24 },
      { id: 111, name: "كارديغان", slug: "womens-cardigans", sizeGroup: "CLOTHING", productsCount: 16 },
      { id: 112, name: "فيست", slug: "womens-vests", sizeGroup: "CLOTHING", productsCount: 11 },
      { id: 113, name: "فساتين (يومي، سهرة، رسمي، طويل، قصير، ميدي، محتشم)", slug: "womens-dresses", sizeGroup: "CLOTHING", productsCount: 58 },
      { id: 114, name: "جلبابات", slug: "womens-jilbabs", sizeGroup: "CLOTHING", productsCount: 21 },
      { id: 115, name: "عبايات", slug: "womens-abayas", sizeGroup: "CLOTHING", productsCount: 36 },
      { id: 116, name: "قفطان", slug: "womens-kaftans", sizeGroup: "CLOTHING", productsCount: 14 },
      { id: 117, name: "تونيك طويل", slug: "womens-long-tunics", sizeGroup: "CLOTHING", productsCount: 15 },
      { id: 118, name: "أطقم (بنطال، تنورة، صيفي، شتوي، ترنقات منزلية)", slug: "womens-sets", sizeGroup: "CLOTHING", productsCount: 32 },
      { id: 119, name: "بناطيل", slug: "womens-pants", sizeGroup: "CLOTHING", productsCount: 40 },
      { id: 120, name: "تنانير", slug: "womens-skirts", sizeGroup: "CLOTHING", productsCount: 23 },
      { id: 121, name: "شورتات", slug: "womens-shorts", sizeGroup: "CLOTHING", productsCount: 16 },
      { id: 122, name: "جينز", slug: "womens-jeans", sizeGroup: "CLOTHING", productsCount: 38 },
      { id: 123, name: "ليقنز", slug: "womens-leggings", sizeGroup: "CLOTHING", productsCount: 25 },
      { id: 124, name: "بيجامات", slug: "womens-pajamas", sizeGroup: "CLOTHING", productsCount: 29 },
      { id: 125, name: "أرواب", slug: "womens-robes", sizeGroup: "CLOTHING", productsCount: 14 },
      { id: 126, name: "ملابس منزلية", slug: "womens-homewear", sizeGroup: "CLOTHING", productsCount: 22 },
      { id: 127, name: "ملابس نوم", slug: "womens-nightwear", sizeGroup: "CLOTHING", productsCount: 27 },
    ],
  },
  {
    id: 2,
    name: "ملابس رجالية",
    slug: "mens-clothing",
    storesCount: 18,
    children: [
      { id: 201, name: "تيشرت", slug: "mens-tshirt", sizeGroup: "CLOTHING", productsCount: 45 },
      { id: 202, name: "قميص", slug: "mens-shirt", sizeGroup: "CLOTHING", productsCount: 34 },
      { id: 203, name: "سويت تيشرت", slug: "mens-sweatshirt", sizeGroup: "CLOTHING", productsCount: 26 },
      { id: 204, name: "هودي", slug: "mens-hoodie", sizeGroup: "CLOTHING", productsCount: 31 },
      { id: 205, name: "بنطال", slug: "mens-pants", sizeGroup: "CLOTHING", productsCount: 38 },
      { id: 206, name: "جينز", slug: "mens-jeans", sizeGroup: "CLOTHING", productsCount: 42 },
      { id: 207, name: "شورت", slug: "mens-shorts", sizeGroup: "CLOTHING", productsCount: 20 },
      { id: 208, name: "جاكيت", slug: "mens-jacket", sizeGroup: "CLOTHING", productsCount: 24 },
      { id: 209, name: "بليزر", slug: "mens-blazer", sizeGroup: "CLOTHING", productsCount: 18 },
      { id: 210, name: "معطف", slug: "mens-coat", sizeGroup: "CLOTHING", productsCount: 15 },
      { id: 211, name: "فيست", slug: "mens-vest", sizeGroup: "CLOTHING", productsCount: 12 },
      { id: 212, name: "بيجامة", slug: "mens-pajamas", sizeGroup: "CLOTHING", productsCount: 19 },
      { id: 213, name: "ملابس رسمية (بدلة، بنطال رسمي، قميص رسمي، ربطة عنق)", slug: "mens-formalwear", sizeGroup: "CLOTHING", productsCount: 22 },
      { id: 214, name: "ملابس رياضية", slug: "mens-sportswear", sizeGroup: "CLOTHING", productsCount: 30 },
      { id: 215, name: "أطقم منزلية (ترنقات)", slug: "mens-tracksuits", sizeGroup: "CLOTHING", productsCount: 27 },
    ],
  },
  {
    id: 3,
    name: "أطفال ومحير - بنات",
    slug: "girls-clothing",
    storesCount: 15,
    children: [
      { id: 301, name: "فساتين", slug: "girls-dresses", sizeGroup: "KIDS", productsCount: 36 },
      { id: 302, name: "تيشرتات", slug: "girls-tshirts", sizeGroup: "KIDS", productsCount: 31 },
      { id: 303, name: "بلوزة", slug: "girls-blouses", sizeGroup: "KIDS", productsCount: 25 },
      { id: 304, name: "قميص", slug: "girls-shirts", sizeGroup: "KIDS", productsCount: 18 },
      { id: 305, name: "تنورة", slug: "girls-skirts", sizeGroup: "KIDS", productsCount: 22 },
      { id: 306, name: "بنطال", slug: "girls-pants", sizeGroup: "KIDS", productsCount: 27 },
      { id: 307, name: "جينز", slug: "girls-jeans", sizeGroup: "KIDS", productsCount: 29 },
      { id: 308, name: "شورت", slug: "girls-shorts", sizeGroup: "KIDS", productsCount: 16 },
      { id: 309, name: "أطقم", slug: "girls-sets", sizeGroup: "KIDS", productsCount: 28 },
      { id: 310, name: "جاكيت", slug: "girls-jackets", sizeGroup: "KIDS", productsCount: 19 },
      { id: 311, name: "معطف", slug: "girls-coats", sizeGroup: "KIDS", productsCount: 14 },
      { id: 312, name: "هودي", slug: "girls-hoodies", sizeGroup: "KIDS", productsCount: 23 },
      { id: 313, name: "سويت شيرت", slug: "girls-sweatshirts", sizeGroup: "KIDS", productsCount: 21 },
      { id: 314, name: "أطقم منزلية", slug: "girls-homewear", sizeGroup: "KIDS", productsCount: 24 },
      { id: 315, name: "أطقم رياضية", slug: "girls-sportswear", sizeGroup: "KIDS", productsCount: 20 },
      { id: 316, name: "بيجامات", slug: "girls-pajamas", sizeGroup: "KIDS", productsCount: 26 },
      { id: 317, name: "ملابس تنكرية", slug: "girls-costumes", sizeGroup: "KIDS", productsCount: 13 },
    ],
  },
  {
    id: 4,
    name: "أطفال ومحير - أولاد",
    slug: "boys-clothing",
    storesCount: 14,
    children: [
      { id: 401, name: "هودي", slug: "boys-hoodies", sizeGroup: "KIDS", productsCount: 28 },
      { id: 402, name: "تيشرتات", slug: "boys-tshirts", sizeGroup: "KIDS", productsCount: 35 },
      { id: 403, name: "بلوزة", slug: "boys-blouses", sizeGroup: "KIDS", productsCount: 22 },
      { id: 404, name: "قميص", slug: "boys-shirts", sizeGroup: "KIDS", productsCount: 24 },
      { id: 405, name: "بنطال", slug: "boys-pants", sizeGroup: "KIDS", productsCount: 30 },
      { id: 406, name: "جينز", slug: "boys-jeans", sizeGroup: "KIDS", productsCount: 33 },
      { id: 407, name: "شورت", slug: "boys-shorts", sizeGroup: "KIDS", productsCount: 19 },
      { id: 408, name: "أطقم", slug: "boys-sets", sizeGroup: "KIDS", productsCount: 26 },
      { id: 409, name: "جاكيت", slug: "boys-jackets", sizeGroup: "KIDS", productsCount: 20 },
      { id: 410, name: "معطف", slug: "boys-coats", sizeGroup: "KIDS", productsCount: 15 },
      { id: 411, name: "سويت شيرت", slug: "boys-sweatshirts", sizeGroup: "KIDS", productsCount: 23 },
      { id: 412, name: "أطقم منزلية", slug: "boys-homewear", sizeGroup: "KIDS", productsCount: 21 },
      { id: 413, name: "أطقم رياضية", slug: "boys-sportswear", sizeGroup: "KIDS", productsCount: 25 },
      { id: 414, name: "بيجامات", slug: "boys-pajamas", sizeGroup: "KIDS", productsCount: 22 },
      { id: 415, name: "ملابس تنكرية", slug: "boys-costumes", sizeGroup: "KIDS", productsCount: 12 },
    ],
  },
  {
    id: 5,
    name: "ملابس المواليد والرضع",
    slug: "baby-clothing",
    storesCount: 10,
    children: [
      { id: 501, name: "أطقم مواليد", slug: "baby-sets", sizeGroup: "KIDS", productsCount: 26 },
      { id: 502, name: "سالوبيت (تبان / رومبير)", slug: "baby-rompers", sizeGroup: "KIDS", productsCount: 34 },
      { id: 503, name: "تيشرت", slug: "baby-tshirts", sizeGroup: "KIDS", productsCount: 20 },
      { id: 504, name: "بلوزة", slug: "baby-blouses", sizeGroup: "KIDS", productsCount: 18 },
      { id: 505, name: "بنطال", slug: "baby-pants", sizeGroup: "KIDS", productsCount: 22 },
      { id: 506, name: "شورت", slug: "baby-shorts", sizeGroup: "KIDS", productsCount: 15 },
      { id: 507, name: "تنورة", slug: "baby-skirts", sizeGroup: "KIDS", productsCount: 14 },
      { id: 508, name: "فستان", slug: "baby-dresses", sizeGroup: "KIDS", productsCount: 25 },
      { id: 509, name: "كيس نوم", slug: "baby-sleep-sack", sizeGroup: "ONE_SIZE", productsCount: 16 },
      { id: 510, name: "بطانيات ولفافات", slug: "baby-blankets-wraps", sizeGroup: "ONE_SIZE", productsCount: 21 },
      { id: 511, name: "جاكيت", slug: "baby-jackets", sizeGroup: "KIDS", productsCount: 17 },
      { id: 512, name: "كنزة", slug: "baby-sweaters", sizeGroup: "KIDS", productsCount: 19 },
      { id: 513, name: "أطقم شتوية", slug: "baby-winter-sets", sizeGroup: "KIDS", productsCount: 22 },
      { id: 514, name: "مرايل وبافتات", slug: "baby-bibs", sizeGroup: "ONE_SIZE", productsCount: 18 },
      { id: 515, name: "بدلات وغيارات", slug: "baby-changes", sizeGroup: "KIDS", productsCount: 24 },
      { id: 516, name: "إكسسوارات المواليد (قبعة، قفازات، جوارب)", slug: "baby-accessories", sizeGroup: "ONE_SIZE", productsCount: 28 },
      { id: 517, name: "كلكولة (أحذية مواليد)", slug: "baby-booties", sizeGroup: "SHOES", productsCount: 19 },
    ],
  },
  {
    id: 6,
    name: "متجر الأحذية",
    slug: "shoes",
    storesCount: 16,
    children: [
      { id: 601, name: "كعب", slug: "womens-heels", sizeGroup: "SHOES", productsCount: 32 },
      { id: 602, name: "صندل", slug: "sandals", sizeGroup: "SHOES", productsCount: 28 },
      { id: 603, name: "شبشب", slug: "slippers", sizeGroup: "SHOES", productsCount: 24 },
      { id: 604, name: "بوت", slug: "boots", sizeGroup: "SHOES", productsCount: 22 },
      { id: 605, name: "بوتين", slug: "ankle-boots", sizeGroup: "SHOES", productsCount: 18 },
      { id: 606, name: "لوفر", slug: "loafers", sizeGroup: "SHOES", productsCount: 21 },
      { id: 607, name: "باليرينا وفلات (سكربينا)", slug: "ballerinas-flats", sizeGroup: "SHOES", productsCount: 27 },
      { id: 608, name: "حذاء رياضي", slug: "sports-shoes", sizeGroup: "SHOES", productsCount: 36 },
      { id: 609, name: "سنيكرز", slug: "sneakers", sizeGroup: "SHOES", productsCount: 40 },
      { id: 610, name: "كوتشي", slug: "kootshy", sizeGroup: "SHOES", productsCount: 35 },
      { id: 611, name: "سكيتشرز", slug: "sketchers", sizeGroup: "SHOES", productsCount: 23 },
      { id: 612, name: "أحذية طبية", slug: "medical-shoes", sizeGroup: "SHOES", productsCount: 19 },
      { id: 613, name: "أحذية شتوية", slug: "winter-shoes", sizeGroup: "SHOES", productsCount: 21 },
      { id: 614, name: "منتوفلي (حذاء منزلي)", slug: "house-shoes", sizeGroup: "SHOES", productsCount: 17 },
      { id: 615, name: "حذاء رسمي رجالي", slug: "mens-formal-shoes", sizeGroup: "SHOES", productsCount: 26 },
      { id: 616, name: "أحذية أطفال", slug: "kids-shoes", sizeGroup: "SHOES", productsCount: 31 },
      { id: 617, name: "كلكولة (أحذية مواليد)", slug: "baby-shoes-kalkooleh", sizeGroup: "SHOES", productsCount: 16 },
    ],
  },
  {
    id: 7,
    name: "كوزماتيكس وإكسسوارات",
    slug: "cosmetics-and-accessories",
    storesCount: 14,
    children: [
      { id: 701, name: "ساعات", slug: "watches", sizeGroup: "ONE_SIZE", productsCount: 33 },
      { id: 702, name: "عقد أو طقم مجوهرات", slug: "necklaces-sets", sizeGroup: "ONE_SIZE", productsCount: 28 },
      { id: 703, name: "خاتم", slug: "rings", sizeGroup: "ONE_SIZE", productsCount: 24 },
      { id: 704, name: "قرط", slug: "earrings", sizeGroup: "ONE_SIZE", productsCount: 26 },
      { id: 705, name: "خلخال", slug: "anklets", sizeGroup: "ONE_SIZE", productsCount: 15 },
      { id: 706, name: "انسيال", slug: "bracelets", sizeGroup: "ONE_SIZE", productsCount: 22 },
      { id: 707, name: "بروش", slug: "brooches", sizeGroup: "ONE_SIZE", productsCount: 12 },
      { id: 708, name: "سلاسل", slug: "chains", sizeGroup: "ONE_SIZE", productsCount: 29 },
      { id: 709, name: "نظارات", slug: "glasses", sizeGroup: "ONE_SIZE", productsCount: 25 },
      { id: 710, name: "شال", slug: "shawls", sizeGroup: "ONE_SIZE", productsCount: 31 },
      { id: 711, name: "خمار", slug: "khimar", sizeGroup: "ONE_SIZE", productsCount: 18 },
      { id: 712, name: "بندانة", slug: "bandanas", sizeGroup: "ONE_SIZE", productsCount: 22 },
      { id: 713, name: "دبابيس حجاب", slug: "hijab-pins", sizeGroup: "ONE_SIZE", productsCount: 16 },
      { id: 714, name: "طاقية وقبعة", slug: "hats-caps", sizeGroup: "ONE_SIZE", productsCount: 20 },
      { id: 715, name: "كاب", slug: "caps", sizeGroup: "ONE_SIZE", productsCount: 24 },
      { id: 716, name: "محافظ", slug: "wallets", sizeGroup: "ONE_SIZE", productsCount: 27 },
      { id: 717, name: "عطور ومزيلات عرق", slug: "perfumes-deodorants", sizeGroup: "ONE_SIZE", productsCount: 42 },
      { id: 718, name: "أطقم عطور (عطر ولوشن، عطر وبودي ميست)", slug: "perfume-gift-sets", sizeGroup: "ONE_SIZE", productsCount: 26 },
      { id: 719, name: "حقيبة يد", slug: "handbags", sizeGroup: "ONE_SIZE", productsCount: 38 },
      { id: 720, name: "حقيبة كتف", slug: "shoulder-bags", sizeGroup: "ONE_SIZE", productsCount: 32 },
      { id: 721, name: "حقيبة ظهر", slug: "backpacks", sizeGroup: "ONE_SIZE", productsCount: 29 },
      { id: 722, name: "حقيبة خصر", slug: "waist-bags", sizeGroup: "ONE_SIZE", productsCount: 18 },
      { id: 723, name: "حقيبة سفر", slug: "travel-bags", sizeGroup: "ONE_SIZE", productsCount: 16 },
      { id: 724, name: "كلاتش", slug: "clutch-bags", sizeGroup: "ONE_SIZE", productsCount: 21 },
      { id: 725, name: "توت باج", slug: "tote-bags", sizeGroup: "ONE_SIZE", productsCount: 25 },
      { id: 726, name: "كروكس", slug: "crocs", sizeGroup: "SHOES", productsCount: 20 },
      { id: 727, name: "سكارف ووشاح", slug: "scarves", sizeGroup: "ONE_SIZE", productsCount: 23 },
      { id: 728, name: "قفازات ومعاصم", slug: "gloves-wristbands", sizeGroup: "ONE_SIZE", productsCount: 17 },
      { id: 729, name: "إكسسوارات الشعر", slug: "hair-accessories", sizeGroup: "ONE_SIZE", productsCount: 27 },
      { id: 730, name: "أحزمة", slug: "belts", sizeGroup: "ONE_SIZE", productsCount: 19 },
    ],
  },
  {
    id: 8,
    name: "الميك اب والعناية بالتجميل",
    slug: "makeup-and-beauty-care",
    storesCount: 16,
    children: [
      { id: 801, name: "غسول الوجه", slug: "face-wash", sizeGroup: "ONE_SIZE", productsCount: 34 },
      { id: 802, name: "مرطب البشرة", slug: "moisturizer", sizeGroup: "ONE_SIZE", productsCount: 38 },
      { id: 803, name: "سيروم", slug: "serum", sizeGroup: "ONE_SIZE", productsCount: 29 },
      { id: 804, name: "واقي شمس", slug: "sunscreen", sizeGroup: "ONE_SIZE", productsCount: 32 },
      { id: 805, name: "ماسك للوجه", slug: "face-masks", sizeGroup: "ONE_SIZE", productsCount: 27 },
      { id: 806, name: "مزيل الميك اب", slug: "makeup-remover", sizeGroup: "ONE_SIZE", productsCount: 24 },
      { id: 807, name: "برايمر", slug: "primer", sizeGroup: "ONE_SIZE", productsCount: 22 },
      { id: 808, name: "فاونديشن (كريم أساس)", slug: "foundation", sizeGroup: "ONE_SIZE", productsCount: 46 },
      { id: 809, name: "كونسيلر", slug: "concealer", sizeGroup: "ONE_SIZE", productsCount: 36 },
      { id: 810, name: "بودرة وجه", slug: "face-powder", sizeGroup: "ONE_SIZE", productsCount: 30 },
      { id: 811, name: "أحمر خدود (بلاشر)", slug: "blusher", sizeGroup: "ONE_SIZE", productsCount: 35 },
      { id: 812, name: "هايلايتر", slug: "highlighter", sizeGroup: "ONE_SIZE", productsCount: 25 },
      { id: 813, name: "ظلال العيون (ايشادو)", slug: "eyeshadow", sizeGroup: "ONE_SIZE", productsCount: 40 },
      { id: 814, name: "ايلاينر", slug: "eyeliner", sizeGroup: "ONE_SIZE", productsCount: 31 },
      { id: 815, name: "ماسكارا", slug: "mascara", sizeGroup: "ONE_SIZE", productsCount: 44 },
      { id: 816, name: "كحل", slug: "kohl", sizeGroup: "ONE_SIZE", productsCount: 23 },
      { id: 817, name: "قلم حواجب", slug: "eyebrow-pencil", sizeGroup: "ONE_SIZE", productsCount: 28 },
      { id: 818, name: "احمر شفاه", slug: "lipstick", sizeGroup: "ONE_SIZE", productsCount: 52 },
      { id: 819, name: "ملمع شفاه", slug: "lip-gloss", sizeGroup: "ONE_SIZE", productsCount: 33 },
      { id: 820, name: "محدد شفاه", slug: "lip-liner", sizeGroup: "ONE_SIZE", productsCount: 29 },
      { id: 821, name: "شامبو", slug: "shampoo", sizeGroup: "ONE_SIZE", productsCount: 37 },
      { id: 822, name: "بلسم", slug: "conditioner", sizeGroup: "ONE_SIZE", productsCount: 31 },
      { id: 823, name: "ماسكات وزيوت الشعر", slug: "hair-masks-oils", sizeGroup: "ONE_SIZE", productsCount: 35 },
      { id: 824, name: "منتجات تصفيف الشعر", slug: "hair-styling", sizeGroup: "ONE_SIZE", productsCount: 26 },
      { id: 825, name: "لوشن الجسم", slug: "body-lotion", sizeGroup: "ONE_SIZE", productsCount: 33 },
      { id: 826, name: "كريمات ومنتجات الاستحمام", slug: "bath-and-body", sizeGroup: "ONE_SIZE", productsCount: 38 },
      { id: 827, name: "فرش الميك اب والاسفنجات", slug: "makeup-brushes-sponges", sizeGroup: "ONE_SIZE", productsCount: 30 },
      { id: 828, name: "مرايا", slug: "beauty-mirrors", sizeGroup: "ONE_SIZE", productsCount: 16 },
      { id: 829, name: "حقائب الميك اب", slug: "makeup-bags", sizeGroup: "ONE_SIZE", productsCount: 25 },
    ],
  },
];

const categories: AdminCategoryRoot[] = CATEGORY_SEED.map((root, i) => ({
  id: root.id,
  name: root.name,
  slug: root.slug,
  imageUrl: null,
  sortOrder: i,
  isActive: true,
  sizeGroup: null,
  parentId: null,
  createdAt: daysAgo(300 - i * 5),
  updatedAt: daysAgo(30 - i),
  childrenCount: root.children.length,
  // الجذر ما بيحمل منتجات — بتنحط على الفرعي، زي السيرفر الحقيقي
  productsCount: 0,
  storesCount: root.storesCount,
  children: root.children.map((child, j) => ({
    id: child.id,
    name: child.name,
    slug: child.slug,
    imageUrl: null,
    sortOrder: j,
    isActive: child.isActive ?? true,
    sizeGroup: child.sizeGroup,
    parentId: root.id,
    createdAt: daysAgo(299 - i * 5),
    updatedAt: daysAgo(29 - i),
    childrenCount: 0,
    productsCount: child.productsCount,
    storesCount: 0,
  })),
}));

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

// ─── وسوم وفلاتر المناسبات ─────────────────────────────────────

const occasions: OccasionFilter[] = [
  {
    id: 1,
    name: "يومي وكاجوال",
    slug: "casual-daily",
    icon: "coffee",
    description: "إطلالات مريحة للمشاوير اليومية، الجامعة، والتسوق.",
    productsCount: 148,
    isActive: true,
    isFeaturedOnHome: true,
    sortOrder: 1,
    targetCategories: ["ملابس نسائية", "ملابس رجالية", "أطفال ومحير", "أحذية"],
  },
  {
    id: 2,
    name: "عمل ورسمي",
    slug: "work-formal",
    icon: "briefcase",
    description: "بدل رسمية، بليزرات، قمصان، وأحذية كلاسيكية للمكتب والمقابلات.",
    productsCount: 86,
    isActive: true,
    isFeaturedOnHome: true,
    sortOrder: 2,
    targetCategories: ["ملابس نسائية", "ملابس رجالية", "أحذية", "إكسسوارات وحقائب"],
  },
  {
    id: 3,
    name: "سهرة ومناسبات خاصة",
    slug: "evening-occasions",
    icon: "sparkles",
    description: "فساتين سهرة راقية، بدل توكسيدو، أحذية كعب، وكلاتشات لامعة.",
    productsCount: 0,
    isActive: true,
    isFeaturedOnHome: true,
    sortOrder: 3,
    targetCategories: ["ملابس نسائية", "ملابس رجالية", "أحذية", "مستحضرات التجميل والعناية"],
  },
  {
    id: 4,
    name: "أعراس وخطوبة",
    slug: "weddings-engagements",
    icon: "heart",
    description: "أزياء المناسبات الكبرى للعرائس، المعازيم، والخطوبة بأرقى التصاميم.",
    productsCount: 0,
    isActive: true,
    isFeaturedOnHome: false,
    sortOrder: 4,
    targetCategories: ["ملابس نسائية", "ملابس رجالية", "أحذية", "إكسسوارات وحقائب"],
  },
  {
    id: 5,
    name: "حفلات وتخرج",
    slug: "parties-graduation",
    icon: "party-popper",
    description: "ملابس أنيقة ومميزة لحفلات التخرج، أعياد الميلاد والاحتفالات.",
    productsCount: 0,
    isActive: true,
    isFeaturedOnHome: false,
    sortOrder: 5,
    targetCategories: ["ملابس نسائية", "ملابس رجالية", "أطفال ومحير"],
  },
  {
    id: 6,
    name: "أعياد ومواسم",
    slug: "eid-festive",
    icon: "moon",
    description: "تشكيلات العيد، الأطقم الجديدة والعبايات والجلابيب والقفاطين.",
    productsCount: 0,
    isActive: true,
    isFeaturedOnHome: true,
    sortOrder: 6,
    targetCategories: ["ملابس نسائية", "ملابس رجالية", "أطفال ومحير", "مواليد ورضع"],
  },
  {
    id: 7,
    name: "رياضة ونشاطات",
    slug: "sports-activewear",
    icon: "activity",
    description: "ملابس رياضية، سنيكرز، أطقم تدريب، وترنقات نشطة.",
    productsCount: 0,
    isActive: true,
    isFeaturedOnHome: false,
    sortOrder: 7,
    targetCategories: ["ملابس رجالية", "ملابس نسائية", "أطفال ومحير", "أحذية"],
  },
  {
    id: 8,
    name: "ملابس تنكرية ومناسبات أطفال",
    slug: "kids-costumes",
    icon: "sun",
    description: "أزياء شخصيات كرتونية وتنكرية لحفلات المدارس وأعياد الأطفال.",
    productsCount: 0,
    isActive: true,
    isFeaturedOnHome: false,
    sortOrder: 8,
    targetCategories: ["أطفال ومحير"],
  },
];

// ─── المجموعات المميزة ──────────────────────────────────────────

const collections: FeaturedCollection[] = [
  {
    id: 1,
    title: "تشكيلة العيد الفاخرة",
    slug: "eid-luxe-collection",
    subtitle: "أرقى الفساتين والبدل وأطقم العيد الجديدة لجميع أفراد العائلة.",
    badge: "الأكثر طلباً",
    imageUrl: null,
    productsCount: 0,
    isActive: true,
    sortOrder: 1,
  },
  {
    id: 2,
    title: "إطلالات العمل والجامعة",
    slug: "back-to-work-uni",
    subtitle: "بليزرات، قمصان، وبناطيل كلاسيكية أنيقة وعملية تضمن لك الراحة والتميز.",
    badge: "أحدث الإطلالات",
    imageUrl: null,
    productsCount: 0,
    isActive: true,
    sortOrder: 2,
  },
  {
    id: 3,
    title: "سهرات وأعراس 2026",
    slug: "evening-glam-2026",
    subtitle: "فساتين سهرة مذهلة، بدل توكسيدو فخمة، وأطقم مجوهرات وأحذية برّاقة.",
    badge: "حصري",
    imageUrl: null,
    productsCount: 0,
    isActive: true,
    sortOrder: 3,
  },
  {
    id: 4,
    title: "تشكيلة الصيف المنعشة",
    slug: "summer-refresh",
    subtitle: "ألوان مبهجة وأقمشة باردة خفيفة تناسب حر الصيف والنزهات البحرية.",
    badge: "موسمي",
    imageUrl: null,
    productsCount: 0,
    isActive: true,
    sortOrder: 4,
  },
  {
    id: 5,
    title: "أطقم ومستلزمات المواليد الجدد",
    slug: "newborn-essentials",
    subtitle: "أطقم قطنية ناعمة 100%، سالوبيتات، ولفافات دافئة تليق بطفلك الجديد.",
    badge: "هدايا مواليد",
    imageUrl: null,
    productsCount: 0,
    isActive: true,
    sortOrder: 5,
  },
  {
    id: 6,
    title: "الراحة المنزلية واللانجري (Loungewear)",
    slug: "cozy-loungewear",
    subtitle: "بيجامات قطنية فاخرة، أرواب مريحة، وترنقات منزلية ناعمة للاسترخاء التام.",
    badge: "راحة تامة",
    imageUrl: null,
    productsCount: 0,
    isActive: true,
    sortOrder: 6,
  },
];

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
  occasions,
  collections,
  deliveryHealth,
  deliveryFailures,
  actor: ACTOR,
  /** عدّادات المعرّفات — عشان الإنشاء بالجلسة ما يكرّر id */
  nextCategoryId: 900,
  nextBannerId: 100,
  nextOccasionId: 50,
  nextCollectionId: 50,
};

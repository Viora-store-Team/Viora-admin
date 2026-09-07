/**
 * أنواع كيانات لوحة مالك المنصة.
 *
 * الملف مقسوم لنصّين:
 *
 * ١. **مربوط بالباك إند** — النظرة العامة (`/admin/stats`) والمتاجر
 *    (`/admin/stores`). الأشكال هون منسوخة حرفياً عن رد السيرفر، فما في
 *    ولا طبقة تحويل بينهم وبين الصفحات. أي فرق بينهن بيصير خطأ ترجمة
 *    مش عطل وقت التشغيل.
 *
 * ٢. **لسا تجريبي** — المستخدمون والتصنيفات والبلاغات والمحتوى والتوصيل.
 *    مسارات الباك إند إلهن بترجّع 404 لحد الآن، فالأشكال تحتهن لسا تصميم
 *    مقترح والـ mock بيولّدها. لما توصل، بتنعدّل هون وبـ mock/ بس.
 */

// ─── تصنيفات الكتالوج ──────────────────────────────────────────

/*
  الأشكال تحت **مشتركة مع لوحة التاجر** (اللي بتقرأها من GET /categories).
  التعريف مكرّر عمداً بالريبوين — نسخة الأدمن هي مصدر الحقيقة لأن هون
  بينكتبوا. أي تعديل على الشكل لازم ينعكس بالاتنين.
*/

export type SizeGroup = "CLOTHING" | "SHOES" | "KIDS" | "ONE_SIZE";

export const SIZE_GROUPS: readonly SizeGroup[] = [
  "CLOTHING",
  "SHOES",
  "KIDS",
  "ONE_SIZE",
];

export interface CategoryChild {
  id: number;
  name: string;
  slug: string;
  imageUrl: string | null;
  sizeGroup: SizeGroup;
}

export interface CategoryRoot {
  id: number;
  name: string;
  slug: string;
  imageUrl: string | null;
  /** بيكون null للتصنيف الرئيسي — المجموعة بتيجي من الأبناء */
  sizeGroup: SizeGroup | null;
  children: CategoryChild[];
}

// ─── مشترك ─────────────────────────────────────────────────────

/*
  ما في `EntityStatus` ولا `Suspension` هون بعد ما وصل عقد المستخدمين.

  الاتنين كانوا تخميناً: افترضنا حالة حساب من تلات قيم وسجل إيقاف بسبب
  ومنفّذ. الباك إند بيعبّر عن الإيقاف بعلم بولياني (`isActive`) بلا سبب
  ولا تاريخ ولا منفّذ — فالنوعين انشالوا بدل ما نخلّيهم يوهموا بحقول
  ما بترجع من السيرفر أبداً.

  حالة **المتجر** إشي تاني تماماً — شوف `StoreStatus` تحت.
*/

/** الأدوار اللي بترجع بقوائم المستخدمين — الأدمن ما بينعرض بالقائمة */
export type AdminRole = "MERCHANT" | "CUSTOMER";

export const ADMIN_ROLE_KEYS = [
  "MERCHANT",
  "CUSTOMER",
] as const satisfies readonly AdminRole[];

// ─── ١ · لوحة التحكم ───────────────────────────────────────────

/*
  الأشكال تحت **مطابقة حرفياً** لرد GET /admin/stats — ما في طبقة تحويل.
  المسار بياخد `?period=` بالأيام (رقم) مش `range=7d`؛ `days` و`range`
  بينتجاهلوا بصمت وبيرجّع 30 يوم.
*/

/** القيم اللي أزرار المدى بتبعثها — السيرفر بيقبل أي رقم، وهدول تلاتة كفاية */
export type StatsPeriod = 7 | 30 | 90;

export const STATS_PERIODS: readonly StatsPeriod[] = [7, 30, 90];

export interface StatsPeriodInfo {
  days: number;
  from: string;
  to: string;
}

export interface StatsCounters {
  stores: {
    active: number;
    pending: number;
    rejected: number;
    suspended: number;
    total: number;
  };
  users: {
    merchants: number;
    customers: number;
    total: number;
    /** تسجيلات جديدة **ضمن المدى** — مش الإجمالي */
    newMerchants: number;
    newCustomers: number;
  };
  orders: { total: number; inPeriod: number };
  /** مبالغ نصية Decimal زي أسعار المنتجات — لا تعامَل كأرقام قبل التنسيق */
  revenue: { total: string; inPeriod: string };
  reports: { open: number };
}

/** المتجر جاي **متداخل** جوّا `store` — مش مفلطح زي باقي القوائم */
export interface TopStoreRow {
  store: {
    id: number;
    name: string;
    logoUrl: string | null;
    status: StoreStatus;
  };
  orders: number;
  revenue: string;
}

/** نقطة على منحنى التسجيلات — التاريخ YYYY-MM-DD */
export interface SignupsPoint {
  date: string;
  merchants: number;
  customers: number;
}

export interface OrdersPoint {
  date: string;
  orders: number;
  revenue: string;
}

export interface AdminStatsCharts {
  signups: SignupsPoint[];
  orders: OrdersPoint[];
}

// ─── ٢ · المتاجر ───────────────────────────────────────────────

/**
 * حالة مراجعة المتجر — **مش** حالة تفعيل.
 *
 * الباك إند بيفصل الاتنين: `status` قرار المراجعة (بانتظار · مقبول · مرفوض)
 * و`isActive` إذا المتجر شغّال. ما في مفهوم "موثّق" (isVerified) ولا مسار
 * إيقاف — القبول والرفض بس. الواجهة اتعدّلت لتتبع هذا مش العكس.
 */
export type StoreStatus = "PENDING" | "APPROVED" | "REJECTED";

export const STORE_STATUS_KEYS = [
  "PENDING",
  "APPROVED",
  "REJECTED",
] as const satisfies readonly StoreStatus[];

/** مالك المتجر كما بيرجّعه /admin/stores — ما فيه `status`، فيه `isActive` */
export interface StoreOwner {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  emailVerified: boolean;
  isActive: boolean;
  createdAt: string;
}

export interface AdminStoreListItem {
  id: number;
  name: string;
  logoUrl: string | null;
  city: string | null;
  status: StoreStatus;
  isActive: boolean;
  isFeatured?: boolean;
  featuredOrder?: number | null;
  createdAt: string;
  /** وقت قرار المراجعة — null يعني لسا ما انراجع */
  reviewedAt: string | null;
  /** متداخل مش مفلطح — لهيك `store.owner.name` مش `store.ownerName` */
  owner: StoreOwner;
  productsCount: number;
  ordersCount: number;
}

export interface AdminStoreDetail extends AdminStoreListItem {
  description: string | null;
  coverUrl: string | null;
  phone: string | null;
  address: string | null;
  /** معبّى لما تكون الحالة REJECTED */
  rejectionReason: string | null;
  updatedAt: string;
  /**
   * المشرف اللي اتخذ القرار — `null` قبل أول مراجعة.
   * الشكل انتأكد من السيرفر بعد تنفيذ قبول فعلي على متجر.
   */
  reviewedBy: { id: number; name: string; email: string } | null;
  categories: {
    id: number;
    name: string;
    slug: string;
    imageUrl: string | null;
  }[];
  /** نص Decimal */
  revenue: string;
}

// ─── ٢.١ · طلبات المتجر ────────────────────────────────────────

export type StoreOrderStatus =
  | "PENDING"
  | "ACCEPTED"
  | "REJECTED"
  | "DELIVERED"
  | "CANCELLED"
  | "NEW"
  | "PROCESSING"
  | "READY"
  | "SHIPPED"
  | "COMPLETED";

export const STORE_ORDER_STATUS_KEYS = [
  "PENDING",
  "ACCEPTED",
  "REJECTED",
  "DELIVERED",
  "CANCELLED",
  "NEW",
  "PROCESSING",
  "READY",
  "SHIPPED",
  "COMPLETED",
] as const satisfies readonly StoreOrderStatus[];

export type PaymentMethod = "ONLINE" | "CASH_ON_DELIVERY";

export interface StoreOrderItem {
  id: number;
  productName: string;
  productImage?: string | null;
  variant?: string | null;
  size?: string | null;
  quantity: number;
  price: string;
}

export interface StoreOrder {
  id: number;
  orderNumber: string;
  customerName: string;
  customerPhone?: string | null;
  customerEmail?: string | null;
  itemsCount: number;
  items?: StoreOrderItem[];
  city: string;
  address: string;
  createdAt: string;
  total: string;
  shippingFee?: string;
  paymentMethod: PaymentMethod;
  status: StoreOrderStatus;
}

export interface AdminOrderCustomer {
  id: number;
  name: string;
  email: string;
  phone?: string | null;
}

export interface AdminOrderStoreOwner {
  id: number;
  name: string;
  email: string;
  phone?: string | null;
}

export interface AdminOrderStore {
  id: number;
  name: string;
  slug?: string;
  logoUrl?: string | null;
  owner?: AdminOrderStoreOwner | null;
}

export interface AdminOrderGroupSibling {
  id: number;
  orderNumber: string;
  storeId: number;
  storeName?: string;
  status: StoreOrderStatus;
  subtotal?: string;
  total: string;
}

export interface AdminOrderGroup {
  id: number;
  groupNumber?: string;
  totalAmount: string;
  orders: AdminOrderGroupSibling[];
}

export interface AdminOrderDetail {
  id: number;
  orderNumber: string;
  status: StoreOrderStatus;
  subtotal?: string;
  shippingFee?: string;
  total: string;
  paymentMethod: PaymentMethod;
  recipientName: string;
  recipientPhone: string;
  city: string;
  address: string;
  notes?: string | null;
  createdAt: string;
  updatedAt?: string;
  store: AdminOrderStore;
  customer: AdminOrderCustomer;
  items: StoreOrderItem[];
  group?: AdminOrderGroup | null;
}

// ─── ٣ · المستخدمون ────────────────────────────────────────────

/*
  مطابق حرفياً لرد `/admin/users` — بلا طبقة تحويل، زي المتاجر.

  ⚠️ ما في `status` للحساب ولا كائن `suspension`. الباك إند بيعبّر عن
  الإيقاف بعلم بولياني واحد `isActive`، وما بيحفظ سبب — لهيك الإيقاف
  باللوحة صار تأكيد بسيط بلا حقل سبب.
*/

/** ملخّص متجر التاجر جوّا رد المستخدمين — أخفّ من AdminStoreListItem */
export interface UserStoreSummary {
  id: number;
  name: string;
  status: StoreStatus;
  isActive: boolean;
}

export interface AdminUserListItem {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  avatarUrl: string | null;
  role: AdminRole;
  emailVerified: boolean;
  /** `false` = الحساب موقوف — ما في حقل status */
  isActive: boolean;
  createdAt: string;
  /** `null` للزبون · متداخل للتاجر */
  store: UserStoreSummary | null;
  ordersCount: number;
}

export interface AdminUserDetail extends AdminUserListItem {
  updatedAt: string;
  addressesCount: number;
  /** `false` = حساب غوغل بلا كلمة مرور */
  hasPassword: boolean;
  linkedGoogle: boolean;
  /**
   * المبلغ بيختلف اسمه حسب الدور — نص Decimal بالحالتين:
   * التاجر بياخد `revenue` (إيرادات متجره) والزبون `totalSpent` (مصروفه).
   * الاتنين اختياريين لأن كل رد بيحمل واحد بس.
   */
  revenue?: string;
  totalSpent?: string;
}

// ─── ٤ · التصنيفات ✅ ──────────────────────────────────────────

/*
  مطابق حرفياً لرد `/admin/categories`.

  الشجرة **مستويين بس** — الباك إند بيرفض إضافة تصنيف تحت تصنيف فرعي
  برسالة «الشجرة مستويين بس». الجذر بلا `sizeGroup` والفرعي إلزامي إله.
*/

/** الحقول المشتركة بين الجذر والفرعي — نفس الشكل بالضبط من السيرفر */
export interface AdminCategoryNode {
  id: number;
  name: string;
  /** بينتولّد من الاسم وقت الإنشاء، وما بينتغيّر مع إعادة التسمية */
  slug: string;
  imageUrl: string | null;
  /** ترتيب العرض 0–9999 — الأصغر أول */
  sortOrder: number;
  /** `false` = مخفي عن الزبائن. بديل الحذف لما يكون التصنيف مربوط */
  isActive: boolean;
  /** `null` للجذر · إلزامي للفرعي */
  sizeGroup: SizeGroup | null;
  parentId: number | null;
  createdAt: string;
  updatedAt: string;
  childrenCount: number;
  productsCount: number;
  /** عدد المتاجر المرتبطة — بيمنع الحذف زي المنتجات والأبناء */
  storesCount: number;
}

/** الفرعي ما بيجي معه `children` — الشجرة مستويين */
export type AdminCategoryChild = AdminCategoryNode;

export interface AdminCategoryRoot extends AdminCategoryNode {
  children: AdminCategoryChild[];
}

/** جسم `POST /admin/categories` */
export interface CategoryPayload {
  name: string;
  imageUrl?: string | null;
  /** موجود = تصنيف فرعي · غايب = تصنيف رئيسي */
  parentId?: number;
  /** إلزامي للفرعي · **ممنوع** للجذر (بيرجّع 400) */
  sizeGroup?: SizeGroup;
  sortOrder?: number;
  isActive?: boolean;
}

/**
 * جسم `PATCH /admin/categories/:id` — كل الحقول اختيارية.
 *
 * ⚠️ `sizeGroup` مستثنى: على الجذر بيرجّع 400 صراحة، وعلى الفرعي ما
 * انفحص — وتغييره بيبطّل كل `variantSizeId` تحت التصنيف. التعديل من
 * اللوحة بيضل بلا مجموعة مقاسات لحد ما يتأكد السلوك.
 */
export type CategoryUpdatePayload = Partial<
  Pick<CategoryPayload, "name" | "imageUrl" | "sortOrder" | "isActive">
>;

/** جسم `PATCH /admin/categories/reorder` */
export interface CategoryReorderPayload {
  parentId: number | null;
  ids: number[];
}

/** تفاصيل الرفض 409 — بترجع مع رسالة السيرفر وبتشرح ليش ما انحذف */
export interface CategoryDeleteBlock {
  childrenCount: number;
  productsCount: number;
  storesCount: number;
}

// ─── ٥ · تقييمات المنتجات وطلبات المتاجر ──────────────────────

export interface AdminRatingItem {
  id: number;
  productId?: number;
  product?: {
    id: number;
    name: string;
    imageUrl?: string | null;
    price?: string;
  } | null;
  productName?: string;
  productImage?: string | null;
  productPrice?: string | null;
  storeId?: number;
  store?: {
    id: number;
    name: string;
    city?: string | null;
    logoUrl?: string | null;
  } | null;
  storeName?: string;
  storeLogoUrl?: string | null;
  storeCity?: string | null;
  storeAverageRating?: number;
  storeTotalReviews?: number;
  user?: {
    id: number;
    name: string;
    email: string;
    phone?: string | null;
  } | null;
  customerName?: string;
  customerPhone?: string | null;
  customerId?: number;
  orderId?: number;
  order?: {
    id: number;
    orderNumber?: string;
  } | null;
  orderNumber?: string;
  rating: number;
  comment: string | null;
  images?: string[];
  isHidden?: boolean;
  hidden?: boolean;
  hiddenReason?: string | null;
  hiddenAt?: string | null;
  createdAt: string;
}

export type ProductReview = AdminRatingItem;

export interface StoreRatingSummary {
  storeId: number;
  storeName: string;
  storeLogoUrl: string | null;
  city: string | null;
  averageRating: number;
  totalReviews: number;
  ratingDistribution: {
    5: number;
    4: number;
    3: number;
    2: number;
    1: number;
  };
}

export interface ReviewsOverviewStats {
  platformAverage: number;
  totalReviews: number;
  positivePercentage: number;
  hiddenCount: number;
  starCounts: {
    5: number;
    4: number;
    3: number;
    2: number;
    1: number;
  };
}

export type ReviewTarget = "PRODUCT" | "STORE";

/**
 * التقييم — على منتج أو على المتجر ككل.
 *
 * ⚠️ `isHidden` بتحجب التقييم **عن الزبون بس**. التاجر بيضل يشوفه — مقرّرة
 * كسياسة منتج، فأي نص بالواجهة لازم يقول "مخفي عن الزبائن" مش "محذوف".
 */
export interface Review {
  id: number;
  targetType: ReviewTarget;
  targetId: number;
  targetName: string;
  rating: number;
  comment: string | null;
  author: { id: number; name: string };
  storeId: number;
  storeName: string;
  isHidden: boolean;
  hiddenReason: string | null;
  hiddenAt: string | null;
  createdAt: string;
}

export type ReportTarget = "REVIEW" | "PRODUCT" | "STORE";
export type ReportStatus = "OPEN" | "RESOLVED" | "DISMISSED";

export interface AdminReportListItem {
  id: number;
  targetType: ReportTarget;
  targetId: number;
  /** سطر مختصر بيوصف المحتوى المبلّغ عنه — عشان الجدول ما يحتاج جلب إضافي */
  targetPreview: string;
  reason: string;
  reporter: { id: number; name: string };
  status: ReportStatus;
  createdAt: string;
}

/** لقطة المحتوى المبلّغ عنه — نوع واحد منها بيكون معبّى حسب targetType */
export interface ReportedContent {
  review: Review | null;
  product: {
    id: number;
    name: string;
    price: string;
    image: string | null;
    storeId: number;
    storeName: string;
    isActive: boolean;
  } | null;
  store: {
    id: number;
    name: string;
    logoUrl: string | null;
    city: string | null;
    status: StoreStatus;
  } | null;
}

export interface AdminReportDetail extends AdminReportListItem {
  note: string | null;
  content: ReportedContent;
  /** بلاغات سابقة على نفس الهدف — بتساعد المشرف يقرّر */
  relatedCount: number;
  resolvedAt: string | null;
}

// ─── ٦ · المحتوى ───────────────────────────────────────────────

export interface HomeContent {
  heroTitle: string;
  heroSubtitle: string;
  heroImageUrl: string | null;
  featuredStoreIds: number[];
  featuredCategoryIds: number[];
}

/** قائمة مغلقة مؤقتاً — لحد ما يتأكد إذا الباك إند بده CRUD حر للصفحات */
export type StaticPageKey = "terms" | "privacy" | "about";

export const STATIC_PAGE_KEYS: readonly StaticPageKey[] = [
  "terms",
  "privacy",
  "about",
];

export interface StaticPage {
  key: StaticPageKey;
  title: string;
  body: string;
  updatedAt: string;
}

export interface Banner {
  id: number;
  title: string;
  imageUrl: string;
  linkUrl: string | null;
  /** ترتيب العرض — الأصغر أول */
  position: number;
  isActive: boolean;
  startsAt: string | null;
  endsAt: string | null;
}

export type BannerPayload = Omit<Banner, "id">;

// ─── ٧ · التوصيل ───────────────────────────────────────────────

export type DeliveryStatus = "UP" | "DEGRADED" | "DOWN";

export interface DeliveryHealth {
  provider: string;
  status: DeliveryStatus;
  lastCheckAt: string;
  /** نسبة النجاح بآخر 24 ساعة (0–100) */
  successRate24h: number;
  avgResponseMs: number;
  failures24h: number;
}

export interface DeliveryFailure {
  id: number;
  occurredAt: string;
  orderId: string;
  endpoint: string;
  httpStatus: number;
  message: string;
  retryable: boolean;
}

// ─── ٨ · وسوم وفلاتر المناسبات والمجموعات ────────────────────────

export interface OccasionFilter {
  id: number;
  name: string;
  slug: string;
  icon: string;
  description: string;
  productsCount: number;
  isActive: boolean;
  isFeaturedOnHome: boolean;
  sortOrder: number;
  targetCategories: string[];
}

export type OccasionFilterPayload = Omit<OccasionFilter, "id" | "productsCount">;

export interface FeaturedCollection {
  id: number;
  title: string;
  slug: string;
  subtitle: string;
  badge: string | null;
  imageUrl: string | null;
  productsCount: number;
  isActive: boolean;
  sortOrder: number;
}

export type FeaturedCollectionPayload = Omit<FeaturedCollection, "id" | "productsCount">;

// ─── إدارة المحتوى والصفحات الثابتة 🟢 ──────────────────────

export type AdminContentKey = "terms" | "privacy" | "about" | "faq";

export interface AdminContentAuthor {
  id: number;
  name: string;
  email: string;
}

export interface AdminContentPageListItem {
  key: AdminContentKey;
  title: string;
  isPublished: boolean;
  updatedAt: string | null;
  updatedBy: AdminContentAuthor | null;
}

export interface AdminContentPageDetail {
  key: AdminContentKey;
  title: string;
  html: string;
  isPublished: boolean;
  createdAt: string | null;
  updatedAt: string | null;
  updatedBy: AdminContentAuthor | null;
}

export interface AdminContentPagePayload {
  title: string;
  html: string;
}

// ─── حدود مشتركة ───────────────────────────────────────────────

export const ADMIN_LIMITS = {
  pageLimit: 15,
  /** أقصر سبب مقبول — بيمنع "لا" و"." كسبب إيقاف */
  reasonMin: 10,
  reasonMax: 500,
  storeRejectReasonMax: 255,
  categoryNameMin: 2,
  categoryNameMax: 60,
  bannerTitleMax: 100,
  pageTitleMax: 120,
  pageBodyMax: 20000,
} as const;


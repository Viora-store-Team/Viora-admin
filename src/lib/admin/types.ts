/**
 * أنواع كيانات لوحة مالك المنصة.
 *
 * ⚠️ الحالة الحالية: عقد الباك إند لمسارات /admin **لسا ما وصل**. كل شكل هون
 * هو تصميم مبدئي متفق عليه، والـ mock بيولّد نفس الشكل بالضبط. لما توصل
 * المسارات الحقيقية، التعديل بيصير هون وبـ mock/ بس — الصفحات ما بتتغيّر
 * لأنها بتستهلك هالأنواع مش شكل الرد الخام.
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

/** حالة المتجر أو الحساب. PENDING = متجر جديد لسا ما تم توثيقه */
export type EntityStatus = "ACTIVE" | "SUSPENDED" | "PENDING";

/**
 * سجل الإيقاف. السبب إلزامي بكل عمليات الإيقاف — الواجهة بتفرضه بـ ReasonDialog
 * والسيرفر هو اللي بيسجّله فعلياً بسجل التدقيق (الواجهة بتغذّي السجل ما بتملكه).
 */
export interface Suspension {
  reason: string;
  at: string;
  /** اسم المشرف اللي نفّذ العملية — بيجي من السيرفر */
  by: string;
}

export type AdminRole = "MERCHANT" | "CUSTOMER";

// ─── ١ · لوحة التحكم ───────────────────────────────────────────

/** نقطة على السلسلة الزمنية — التاريخ بصيغة YYYY-MM-DD */
export interface GrowthPoint {
  date: string;
  customers: number;
  merchants: number;
}

export interface OrdersPoint {
  date: string;
  count: number;
  /** قيمة الطلبات باليوم — نص Decimal زي أسعار المنتجات */
  value: string;
}

export interface TopStore {
  id: number;
  name: string;
  orders: number;
  revenue: string;
}

export type OverviewRange = "7d" | "30d" | "90d";

export const OVERVIEW_RANGES: readonly OverviewRange[] = ["7d", "30d", "90d"];

export interface AdminOverview {
  activeStores: number;
  totalStores: number;
  pendingStores: number;
  customers: number;
  merchants: number;
  orders: { total: number; today: number };
  /** إجمالي قيمة المبيعات — نص Decimal */
  gmv: string;
  openReports: number;
  registrationGrowth: GrowthPoint[];
  ordersTrend: OrdersPoint[];
  topStores: TopStore[];
}

// ─── ٢ · المتاجر ───────────────────────────────────────────────

export interface AdminStoreListItem {
  id: number;
  name: string;
  logoUrl: string | null;
  city: string | null;
  ownerId: number;
  ownerName: string;
  status: EntityStatus;
  isVerified: boolean;
  productsCount: number;
  ordersCount: number;
  createdAt: string;
}

export interface AdminStoreDetail extends AdminStoreListItem {
  description: string | null;
  address: string | null;
  phone: string | null;
  coverUrl: string | null;
  categories: { id: number; name: string }[];
  owner: {
    id: number;
    name: string;
    email: string;
    phone: string | null;
    status: EntityStatus;
  };
  stats: {
    products: number;
    orders: number;
    revenue: string;
    /** متوسط تقييم المتجر — null يعني ما في تقييمات بعد */
    rating: number | null;
    reviews: number;
  };
  verifiedAt: string | null;
  suspension: Suspension | null;
}

// ─── ٣ · المستخدمون ────────────────────────────────────────────

export interface AdminUserListItem {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  role: AdminRole;
  status: EntityStatus;
  emailVerified: boolean;
  /** موجود للتجار بس */
  storeId: number | null;
  storeName: string | null;
  ordersCount: number;
  createdAt: string;
}

export interface AdminUserDetail extends AdminUserListItem {
  updatedAt: string;
  lastLoginAt: string | null;
  suspension: Suspension | null;
  /** حالة متجره — للتجار بس. مستقلة عن حالة الحساب (قرار مؤقت لحد ما يوضّح الباك إند) */
  storeStatus: EntityStatus | null;
}

// ─── ٤ · التصنيفات ─────────────────────────────────────────────

/**
 * نفس شجرة `CategoryRoot` تبع المنتجات + عدّاد المنتجات.
 * التوسعة مقصودة مش نوع جديد — لازم تضل الشجرة متوافقة مع CategoryPicker
 * و/sizes?sizeGroup= حرفياً، وإلا بينكسر إنشاء المنتجات.
 */
export interface AdminCategoryChild extends CategoryChild {
  productsCount: number;
}

export interface AdminCategoryRoot extends Omit<CategoryRoot, "children"> {
  productsCount: number;
  children: AdminCategoryChild[];
}

export interface CategoryPayload {
  name: string;
  imageUrl?: string | null;
  /** موجود = تصنيف فرعي · غايب = تصنيف رئيسي */
  parentId?: number;
  /** إلزامي للتصنيف الفرعي · ممنوع للرئيسي */
  sizeGroup?: SizeGroup;
}

// ─── ٥ · التقييمات والبلاغات ───────────────────────────────────

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
    status: EntityStatus;
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

// ─── حدود مشتركة ───────────────────────────────────────────────

export const ADMIN_LIMITS = {
  pageLimit: 15,
  /** أقصر سبب مقبول — بيمنع "لا" و"." كسبب إيقاف */
  reasonMin: 10,
  reasonMax: 500,
  categoryNameMin: 2,
  categoryNameMax: 60,
  bannerTitleMax: 100,
  pageTitleMax: 120,
  pageBodyMax: 20000,
} as const;

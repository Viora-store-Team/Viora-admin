import { uploadFiles, type UploadResult } from "./media-upload";

/*
  الافتراضي هو السيرفر المنشور. حطّ NEXT_PUBLIC_API_BASE_URL بملف .env.local
  لما تشتغل على باك إند محلي — بلاها كل تجربة محلية بتضرب على الإنتاج.
*/
const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  "https://api.vioragaza.com/api";

/**
 * أخطاء الحقول الراجعة مع 400.
 * المفاتيح ممكن تكون مسطّحة ("name") أو مهيكلة ("variants[0].sizes[1].stock") —
 * بالحالتين هي مفاتيح نصية عادية. فكّها بـ mapApiErrors في lib/products/errors.ts
 */
export type ApiErrors = Record<string, string>;

/**
 * مغلّف الرد الموحّد.
 *
 * الفهرس `unknown` مش `any` عن قصد: الكيانات بترجع بالمستوى الأعلى بأسماء
 * مختلفة لكل مسار (`stores` · `user` · `categories`…)، فما بنقدر نعدّهن هون.
 * `unknown` بيخلّي كل قراءة لمفتاح غير معرّف تتطلب تأكيد نوع صريح — وهذا
 * المقصود: الغلاف المكتوب بـ lib/admin/api.ts هو اللي بيسمّي الشكل، مش
 * الصفحات وهي بتخمّن.
 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  /** كود HTTP — 0 يعني فشل شبكة قبل ما يوصل الطلب أصلاً */
  status: number;
  data?: T;
  message?: string;
  errors?: ApiErrors;
  token?: string;
  [key: string]: unknown;
}

/**
 * موت الجلسة — البلاغ اللي بيطلع من الـinterceptor لما يوصل `forceLogout`.
 */
export interface SessionDeath {
  /** رسالة السيرفر جاهزة للعرض بشاشة الدخول */
  message: string;
  /** السبب إيقاف الحساب تحديداً — بتنعرض لوحة مخصصة بدل شريط عام */
  accountSuspended: boolean;
}

/*
  المشترك الوحيد هو AuthContext. `apiFetch` مش مكوّن React فما بيقدر
  ينقّل، فبيمسح التوكن ويبلّغ من هون — والسياق هو اللي بيصفّر المستخدم
  ويوجّه على `/login` مع الرسالة.
*/
let sessionDeathHandler: ((death: SessionDeath) => void) | null = null;

export function setSessionDeathHandler(
  handler: ((death: SessionDeath) => void) | null,
): void {
  sessionDeathHandler = handler;
}

/** الحصول على التوكن من التخزين المحلي */
export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("token");
}

/** حفظ التوكن في التخزين المحلي */
export function setToken(token: string): void {
  if (typeof window !== "undefined") {
    localStorage.setItem("token", token);
  }
}

/** حذف التوكن عند تسجيل الخروج */
export function removeToken(): void {
  if (typeof window !== "undefined") {
    localStorage.removeItem("token");
  }
}

/** دالة موحدة لإرسال جميع الطلبات إلى الباك إند مع إضافة التوكن تلقائياً */
export async function apiFetch(
  endpoint: string,
  options: RequestInit = {},
): Promise<ApiResponse> {
  const token = getToken();

  const headers = new Headers(options.headers);

  /*
    Content-Type بينتحط بس لما يكون في body.
    الـ GET بلا body ما بده هيدر محتوى، ولاحقاً لما ييجي رفع الملفات لازم المتصفح
    يحط الـ boundary تبع multipart بنفسه — وهذا ما بيصير إذا فرضنا application/json.
  */
  if (
    options.body !== undefined &&
    !(options.body instanceof FormData) &&
    !headers.has("Content-Type")
  ) {
    headers.set("Content-Type", "application/json");
  }

  /*
    إرفاق توكن الجلسة — بس لما المستدعي ما بعث توكن خاص فيه.
    مسارات زي /auth/google/complete و /auth/reset-password بتشتغل بتوكن مؤقت
    (setupToken / resetToken) مش بتوكن الجلسة، فلازم ما ندهس هيدرهم.
  */
  const usesSessionToken = !headers.has("Authorization") && endpoint !== "/admin/login";

  if (usesSessionToken && token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  let response: Response;
  const timeout = AbortSignal.timeout(45_000);
  const signal = options.signal ? AbortSignal.any([options.signal, timeout]) : timeout;

  try {
    response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
      signal,
    });
  } catch {
    // فشل شبكة حقيقي — ما وصلنا للسيرفر أصلاً
    return {
      success: false,
      status: 0,
      message: timeout.aborted
        ? "الخادم تأخر بالرد. أعد المحاولة."
        : "حدث خطأ في الاتصال بالخادم. يرجى المحاولة لاحقاً.",
    };
  }

  /*
    تحليل الـ JSON بمعزل عن الـ fetch.
    السيرفر على Render المجاني بيرجّع صفحة HTML (502/503) وهو بيصحى من النوم،
    ولو خلطنا الحالتين بنفس الـ catch بيطلع "خطأ اتصال" بلا status وبنخسر السبب.
  */
  try {
    const data = await response.json();
    if (!data || typeof data !== "object" || Array.isArray(data)) throw new Error("Invalid response");

    /*
      🚪 موت الجلسة — الفرع الوحيد اللي بيمسح التوكن.

      `forceLogout` علم بيبعثه السيرفر مع كل رد فشل بيوجب الطرد، وبيغطّي
      أربع حالات كانت بتنلاحق وحدة وحدة: التوكن منتهي · الحساب انحذف ·
      الحساب موقوف · كلمة المرور تغيّرت.

      ⚠️ **مش** `status === 403`: الـ403 بيرجع لتلات أسباب مختلفة — حساب
      موقوف (اطرد)، رفض دور (خليه مكانه)، وإيميل ما تأكّد (شاشة الكود).
      الطرد على الـstatus كان بيرمي المستخدم برّا لما يفتح شاشة مش إله.

      ⚠️ وكمان مش على الرسالة العربية — نص للعرض مش مُعرّف، وصياغته ممكن
      تتغيّر بأي وقت بلا ما تنعتبر كسر عقد.
    */
    if (usesSessionToken && token && token === getToken() && data.forceLogout === true && typeof window !== "undefined") {
      removeToken();
      sessionDeathHandler?.({
        message: typeof data.message === "string" ? data.message : "",
        accountSuspended: data.accountSuspended === true,
      });
    } else if (
      /*
        احتياط للمسارات اللي لسا ما بتبعث العلم: 401 على **توكن الجلسة**
        معناها التوكن مات. توكنات الفلوهات المؤقتة (setup · pending ·
        reset) بتمرّر Authorization خاص فيها، فـ`usesSessionToken` بتكون
        false وما بينمسح توكن جلسة سليم — نفس الفخ اللي بيوقّع فيه
        مستخدم بيصفّر كلمة مروره بتاب وجلسته مفتوحة بتاب تاني.
      */
      response.status === 401 &&
      usesSessionToken &&
      token && token === getToken() &&
      typeof window !== "undefined"
    ) {
      removeToken();
      sessionDeathHandler?.({ message: typeof data.message === "string" ? data.message : "", accountSuspended: false });
    }

    return { ...data, success: response.ok && data.success === true, status: response.status };
  } catch {
    if (response.status === 401 && usesSessionToken && token && token === getToken() && typeof window !== "undefined") {
      removeToken();
      sessionDeathHandler?.({ message: "", accountSuspended: false });
    }
    return {
      success: false,
      status: response.status,
      message:
        response.status >= 500
          ? "الخادم مش جاهز حالياً. جرّب بعد شوي."
          : "رد غير متوقع من الخادم.",
    };
  }
}

/*
  الرفع صار مباشر للتخزين بتذكرة موقّعة — المنطق النقي بـ media-upload.ts
  (قابل للفحص بحقن apiFetch وfetch)، وهون بس التوصيل بالدوال الحقيقية.
*/
export { UPLOAD_LIMITS } from "./media-upload";
export type { UploadResult } from "./media-upload";

/**
 * رفع عدة ملفات بالتوازي: تذكرة من POST /uploads/image-ticket ثم PUT مباشر.
 */
export function uploadMany(files: File[]): Promise<UploadResult> {
  return uploadFiles(files, { apiFetch, fetch: (input, init) => fetch(input, init) });
}

/** ترقيم الصفحات — نفس الشكل بكل المسارات اللي بترجّع قوائم */
export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

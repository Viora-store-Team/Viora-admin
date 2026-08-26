/*
  الافتراضي هو السيرفر المنشور. حطّ NEXT_PUBLIC_API_BASE_URL بملف .env.local
  لما تشتغل على باك إند محلي — بلاها كل تجربة محلية بتضرب على الإنتاج.
*/
const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  "https://viora-backend-tuqg.onrender.com/api";

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

  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };

  /*
    Content-Type بينتحط بس لما يكون في body.
    الـ GET بلا body ما بده هيدر محتوى، ولاحقاً لما ييجي رفع الملفات لازم المتصفح
    يحط الـ boundary تبع multipart بنفسه — وهذا ما بيصير إذا فرضنا application/json.
  */
  if (
    options.body !== undefined &&
    !(options.body instanceof FormData) &&
    !headers["Content-Type"]
  ) {
    headers["Content-Type"] = "application/json";
  }

  /*
    إرفاق توكن الجلسة — بس لما المستدعي ما بعث توكن خاص فيه.
    مسارات زي /auth/google/complete و /auth/reset-password بتشتغل بتوكن مؤقت
    (setupToken / resetToken) مش بتوكن الجلسة، فلازم ما ندهس هيدرهم.
  */
  const usesSessionToken = !headers["Authorization"];

  if (usesSessionToken && token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  let response: Response;

  try {
    response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });
  } catch {
    // فشل شبكة حقيقي — ما وصلنا للسيرفر أصلاً
    return {
      success: false,
      status: 0,
      message: "حدث خطأ في الاتصال بالخادم. يرجى المحاولة لاحقاً.",
    };
  }

  /*
    تحليل الـ JSON بمعزل عن الـ fetch.
    السيرفر على Render المجاني بيرجّع صفحة HTML (502/503) وهو بيصحى من النوم،
    ولو خلطنا الحالتين بنفس الـ catch بيطلع "خطأ اتصال" بلا status وبنخسر السبب.
  */
  try {
    const data = await response.json();

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
    if (data.forceLogout === true && typeof window !== "undefined") {
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
      typeof window !== "undefined"
    ) {
      removeToken();
    }

    return { ...data, status: response.status };
  } catch {
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

export interface UploadResult {
  urls: string[];
  failed: { name: string; message: string }[];
}

/** الشروط اللي بيفرضها POST /api/uploads — منفحصها محلياً عشان ما نرفع ملف مرفوض أصلاً */
export const UPLOAD_LIMITS = {
  maxBytes: 10 * 1024 * 1024,
  types: ["image/jpeg", "image/png", "image/webp"] as const,
};

/**
 * بيقرأ أول مفتاح فيه نص غير فاضي من كائن مجهول الشكل.
 *
 * مسار الرفع ما استقرّ على اسم واحد للرابط (`url` · `path` · `location`)،
 * وممكن يجي بالمستوى الأعلى أو جوّا `data`. بدل سلسلة `||` طويلة بتنكسر
 * مع `unknown`، القراءة صارت مفحوصة النوع بمكان واحد.
 */
function readString(source: unknown, keys: string[]): string | null {
  if (typeof source !== "object" || source === null) return null;
  const record = source as Record<string, unknown>;
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value) return value;
  }
  return null;
}

/** نفس رسائل السيرفر بالضبط، بس بترجع فوراً بلا رحلة شبكة */
function localFileError(file: File): string | null {
  if (!UPLOAD_LIMITS.types.includes(file.type as (typeof UPLOAD_LIMITS.types)[number])) {
    return "نوع الصورة غير مدعوم (JPG أو PNG أو WebP بس)";
  }
  if (file.size > UPLOAD_LIMITS.maxBytes) {
    return "حجم الصورة كبير (الحد 10 ميجا)";
  }
  return null;
}

/**
 * رفع عدة ملفات بالتوازي إلى مسار الباك إند POST /api/uploads
 */
export async function uploadMany(files: File[]): Promise<UploadResult> {
  const results = await Promise.allSettled(
    files.map(async (file) => {
      const local = localFileError(file);
      if (local) throw new Error(local);

      const formData = new FormData();
      formData.append("file", file);

      const res = await apiFetch("/uploads", {
        method: "POST",
        body: formData,
      });

      if (res.success) {
        const keys = ["url", "path", "location"];
        const url = readString(res, keys) ?? readString(res.data, keys);
        if (url) return url;
        throw new Error("السيرفر رجّع نجاح بلا رابط صورة.");
      }

      /*
        السيرفر بيرجّع السبب الحقيقي جوّا errors.file ("حجم الصورة كبير"، "نوع الصورة غير مدعوم")
        و message بيكون عام ("بيانات غير صحيحة") — فبناخد الأدق أول.
      */
      throw new Error(res.errors?.file || res.message || "فشل رفع الصورة");
    })
  );

  const urls: string[] = [];
  const failed: { name: string; message: string }[] = [];

  results.forEach((result, index) => {
    if (result.status === "fulfilled") {
      urls.push(result.value);
    } else {
      failed.push({
        name: files[index].name,
        message:
          result.reason instanceof Error ? result.reason.message : String(result.reason),
      });
    }
  });

  return { urls, failed };
}

/** ترقيم الصفحات — نفس الشكل بكل المسارات اللي بترجّع قوائم */
export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

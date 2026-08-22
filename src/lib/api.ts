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

export interface ApiResponse<T = any> {
  success: boolean;
  /** كود HTTP — 0 يعني فشل شبكة قبل ما يوصل الطلب أصلاً */
  status: number;
  data?: T;
  message?: string;
  errors?: ApiErrors;
  token?: string;
  [key: string]: any;
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
    401 على توكن الجلسة = التوكن مات، فبنمسحه (التوجيه للوجين مسؤولية الصفحة).
    بس 401 على توكن مؤقت معناها "انتهت الـ 30 دقيقة" — ما إلها علاقة بالجلسة،
    ولو مسحنا التوكن هون بينطرد مستخدم جلسته صالحة.
  */
  if (response.status === 401 && usesSessionToken && typeof window !== "undefined") {
    removeToken();
  }

  /*
    تحليل الـ JSON بمعزل عن الـ fetch.
    السيرفر على Render المجاني بيرجّع صفحة HTML (502/503) وهو بيصحى من النوم،
    ولو خلطنا الحالتين بنفس الـ catch بيطلع "خطأ اتصال" بلا status وبنخسر السبب.
  */
  try {
    const data = await response.json();
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
        const url = res.url || res.data?.url || res.data?.path || res.path || res.location || res.data?.location;
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

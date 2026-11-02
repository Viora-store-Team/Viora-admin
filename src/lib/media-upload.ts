/*
  رفع الصور مباشرة للتخزين عبر تذكرة موقّعة.

  الخطوات لكل ملف: فحص محلي ← POST /uploads/image-ticket ← PUT مباشر على
  uploadUrl. المنطق هون نقي (apiFetch وfetch بيتحقنوا) عشان ينفحص بوحدات
  بلا شبكة. `import type` بس — الملف ما بيسحب شي من api.ts وقت التشغيل.
*/
import type { ApiResponse } from "./api";

/** الشروط اللي بيفرضها السيرفر — منفحصها محلياً عشان ما نطلب تذكرة لملف مرفوض أصلاً */
export const UPLOAD_LIMITS = {
  maxBytes: 10 * 1024 * 1024,
  types: ["image/jpeg", "image/png", "image/webp"] as const,
};

export interface UploadResult {
  urls: string[];
  failed: { name: string; message: string }[];
}

type TicketFetch = (
  endpoint: string,
  options?: RequestInit,
) => Promise<ApiResponse>;

export interface UploadDeps {
  /** apiFetch — بيحمل توكن الجلسة لطلب التذكرة بس */
  apiFetch: TicketFetch;
  /** fetch الخام للـPUT — ما بنبعث فيه أي هيدر جلسة */
  fetch: typeof fetch;
}

const GENERIC_FAILURE = "فشل رفع الصورة";
const TICKET_PURPOSE = "platform";
const PUT_TIMEOUT_MS = 60_000;

/** نفس رسائل السيرفر بالضبط، بس بترجع فوراً بلا رحلة شبكة */
export function localFileError(file: Pick<File, "type" | "size">): string | null {
  if (!UPLOAD_LIMITS.types.includes(file.type as (typeof UPLOAD_LIMITS.types)[number])) {
    return "نوع الصورة غير مدعوم (JPG أو PNG أو WebP بس)";
  }
  if (file.size <= 0) {
    return "الصورة فاضية";
  }
  if (file.size > UPLOAD_LIMITS.maxBytes) {
    return "حجم الصورة كبير (الحد 10 ميجا)";
  }
  return null;
}

function readString(source: unknown, key: string): string | null {
  if (typeof source !== "object" || source === null) return null;
  const value = (source as Record<string, unknown>)[key];
  return typeof value === "string" && value ? value : null;
}

/** رسالة فشل التذكرة — الحقل الأدق أول، و5xx ما بيعرض نص السيرفر أبداً */
function ticketErrorMessage(res: ApiResponse): string {
  if (res.status === 0) return res.message || GENERIC_FAILURE;
  if (res.status >= 500) return GENERIC_FAILURE;
  const fields = res.errors;
  return (
    fields?.size || fields?.contentType || fields?.purpose || res.message || GENERIC_FAILURE
  );
}

/**
 * يرفع ملفاً واحداً ويرجّع رابطه النهائي، أو يرمي Error برسالة جاهزة للعرض.
 */
export async function uploadOne(file: File, deps: UploadDeps): Promise<string> {
  const local = localFileError(file);
  if (local) throw new Error(local);

  const ticket = await deps.apiFetch("/uploads/image-ticket", {
    method: "POST",
    body: JSON.stringify({
      contentType: file.type,
      size: file.size,
      purpose: TICKET_PURPOSE,
    }),
  });
  if (!ticket.success) throw new Error(ticketErrorMessage(ticket));

  const uploadUrl = readString(ticket, "uploadUrl");
  const url = readString(ticket, "url");
  if (!uploadUrl || !url) throw new Error(GENERIC_FAILURE);

  // الرفع المباشر لازم يكون https بس — أي بروتوكول تاني بنعتبره فشل
  try {
    if (new URL(uploadUrl).protocol !== "https:") throw new Error("insecure");
  } catch {
    throw new Error(GENERIC_FAILURE);
  }

  /*
    Content-Type وContent-Length موقّعين: لازم نبعث نفس نوع التذكرة بالضبط
    وجسم هو نفس الـFile اللي انصرح حجمه. ولا Authorization ولا هيدر جلسة.
    التذكرة بلا headers.Content-Type = رد غير سليم، فشل بدل تخمين النوع.
  */
  const ticketType = readString(ticket.headers, "Content-Type");
  if (!ticketType) throw new Error(GENERIC_FAILURE);

  let put: Response;
  try {
    put = await deps.fetch(uploadUrl, {
      method: "PUT",
      headers: { "Content-Type": ticketType },
      body: file,
      // طلب معلّق ما لازم يبقي حالة "جاري الرفع" عالقة للأبد
      signal: AbortSignal.timeout(PUT_TIMEOUT_MS),
    });
  } catch (cause) {
    const timedOut =
      cause instanceof DOMException &&
      (cause.name === "TimeoutError" || cause.name === "AbortError");
    throw new Error(
      timedOut ? GENERIC_FAILURE : "حدث خطأ في الاتصال بالخادم. يرجى المحاولة لاحقاً.",
    );
  }
  if (!put.ok) throw new Error(GENERIC_FAILURE);

  return url;
}

/** رفع عدة ملفات بالتوازي — نفس شكل النتيجة القديم (urls + failed) */
export async function uploadFiles(files: File[], deps: UploadDeps): Promise<UploadResult> {
  const results = await Promise.allSettled(files.map((file) => uploadOne(file, deps)));

  const urls: string[] = [];
  const failed: UploadResult["failed"] = [];

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

const MEDIA_HOST = "media.vioragaza.com";

/**
 * رابط مصغّر للصور الصغيرة. بيطبّق بس على روابط https بنطاق الميديا اللي
 * مش أصلاً تحت /cdn-cgi/؛ أي رابط تاني (قديم أو خارجي) بيرجع زي ما هو.
 * البنرات المعروضة كبيرة لازم تضل على الرابط الأصلي.
 */
export function thumbUrl(url: string | null | undefined, width: number): string {
  if (!url) return "";
  try {
    const parsed = new URL(url);
    if (
      parsed.protocol !== "https:" ||
      parsed.hostname !== MEDIA_HOST ||
      parsed.pathname.startsWith("/cdn-cgi/")
    ) {
      return url;
    }
    return `${parsed.origin}/cdn-cgi/image/width=${width},quality=80,format=auto${parsed.pathname}`;
  } catch {
    return url;
  }
}

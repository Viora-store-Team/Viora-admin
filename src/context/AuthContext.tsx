"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useRouter, usePathname } from "next/navigation";
import { apiFetch, getToken, removeToken, setToken } from "@/lib/api";
import { getMe, MERCHANT_ROLE } from "@/lib/auth/api";
import type { AuthUser } from "@/lib/auth/types";
import { t } from "@/lib/strings";

export type User = AuthUser;

interface LoginOptions {
  /** وين يروح بعد الدخول. التسجيل بيمرّر /products — تاجر جديد ما عنده إشي بالرئيسية */
  redirectTo?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  /**
   * رسالة بتنعرض على شاشة الدخول بعد طرد المستخدم (جلسة منتهية · حساب زبون ·
   * حساب موقوف). بتعيش بالذاكرة بس — بتختفي مع إعادة تحميل الصفحة، وهذا مقصود.
   */
  notice: string | null;
  setNotice: (message: string | null) => void;
  loginUser: (userData: User, token: string, options?: LoginOptions) => void;
  logout: () => void;
  refetchUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/*
  ⚠️ مؤقت — الحارس معطّل بالكامل لأن الباك إند لسا ما وصّل دخول الأدمن.

  ما في دور ADMIN بالعقد أصلاً، وما في `/login` بهاد التطبيق — فأي دفع
  للزائر على شاشة دخول بيرمي 404 وبيقفل اللوحة كلها بوجه المطوّر.

  لما يوصل الدخول: خلّي العلم `false`، ضيف `"/login"` (وأي شاشة استرجاع
  كلمة مرور) لـ PUBLIC_PREFIXES، وحطّ الصفحة **برّا** مجموعة `(panel)`.

  هذا **مش حماية** — التوكن بالـ localStorage وما في proxy.ts، فالحماية
  الحقيقية لازم تكون تفويض من طرف الخادم على كل مسار /admin/*.
*/
const AUTH_GUARD_DISABLED = true;

/**
 * المسارات اللي ما بتحتاج تسجيل دخول.
 * مطابقة **بادئة** مش مطابقة تامة — `/login/reset` بتنحسب تحت `/login`.
 */
const PUBLIC_PREFIXES: string[] = [];

function isPublic(pathname: string): boolean {
  if (AUTH_GUARD_DISABLED) return true;
  return PUBLIC_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [notice, setNotice] = useState<string | null>(null);
  const router = useRouter();
  const pathname = usePathname();

  const isPublicPath = isPublic(pathname);

  // الـ effect تبع /auth/me بيشتغل مرة وحدة، فلازم يشوف آخر قيمة بلا ما يعيد الاشتراك
  const publicRef = useRef(isPublicPath);
  useEffect(() => {
    publicRef.current = isPublicPath;
  }, [isPublicPath]);

  // ── تصحية السيرفر النايم عند فتح التطبيق ───────────────────────
  // الاستضافة المجانية (Render) تنيّم السيرفر بعد ~15 دقيقة بلا استخدام.
  // هذا الطلب الصامت يصحيه بينما المستخدم لسا بيقرأ الصفحة.
  useEffect(() => {
    apiFetch("/health").catch(() => {
      // نتجاهل الخطأ — الهدف فقط إيقاظ السيرفر
    });
  }, []);

  /** طرد: امسح التوكن، صفّر المستخدم، ورجّعه للدخول برسالة تشرح ليش */
  const eject = useCallback(
    (message: string | null) => {
      removeToken();
      setUser(null);
      setNotice(message);
      if (!publicRef.current) router.push("/login");
    },
    [router],
  );

  // ── جلب بيانات المستخدم الحالي GET /api/auth/me ─────────────────
  const refetchUser = useCallback(async () => {
    const token = getToken();
    if (!token) {
      setUser(null);
      setLoading(false);
      if (!publicRef.current) router.push("/login");
      return;
    }

    try {
      const res = await getMe();
      const fetched = res.user ?? res.data?.user;

      if (res.success && fetched) {
        /*
          بوابة الدور. التوكن مربوط بحساب واحد، وحساب الزبون حساب منفصل تماماً
          — ما إله علاقة بجدول المتاجر أصلاً. بلا هالفحص، توكن زبون بيفوت
          الداشبورد ويشوف شاشات بترجع 403 من كل مسار بلا سبب مفهوم.
        */
        if (fetched.role !== MERCHANT_ROLE) {
          eject(t.auth.notMerchant);
          return;
        }
        setUser(fetched);
        setNotice(null);
      } else if (res.status === 401) {
        // التوكن مرفوض صراحة (منتهي · الحساب انحذف · كلمة المرور تغيّرت)
        eject(res.message || t.auth.sessionExpired);
      } else if (res.status === 403) {
        eject(res.message || t.auth.suspended);
      } else {
        // خطأ شبكة أو خادم ناشئ/نائم — لا نمسح التوكن
        console.warn("تعذّر الاتصال بخادم المصادقة حالياً:", res.message);
      }
    } catch (err) {
      console.error("فشل جلب بيانات المستخدم:", err);
    } finally {
      setLoading(false);
    }
  }, [eject, router]);

  // التأكد من حماية المسارات محلياً عند الانتقال بين الصفحات (بدون إرسال طلبات للسيرفر)
  useEffect(() => {
    const token = getToken();
    if (!token && !isPublicPath) {
      setUser(null);
      router.push("/login");
    }
  }, [pathname, isPublicPath, router]);

  // جلب بيانات المستخدم كاملة من السيرفر عند تحميل الموقع لأول مرة فقط
  useEffect(() => {
    refetchUser();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loginUser = useCallback(
    (userData: User, token: string, options: LoginOptions = {}) => {
      setToken(token);
      setUser(userData);
      setNotice(null);
      setLoading(false);
      router.push(options.redirectTo ?? "/");
    },
    [router],
  );

  /*
    الخروج محلي بالكامل — ما في POST /auth/logout بالعقد الجديد.
    التوكن JWT بلا حالة على السيرفر، فمسحه من هون بينهي الجلسة فعلياً.

    ما بندفع على `/login` طول ما الحارس معطّل — الصفحة مش موجودة بهاد
    التطبيق فبيطلع 404. مسح التوكن كافي: أي طلب جاي بيروح بلا Authorization.
  */
  const logout = useCallback(() => {
    removeToken();
    setUser(null);
    setNotice(null);
    if (!AUTH_GUARD_DISABLED) router.push("/login");
  }, [router]);

  return (
    <AuthContext.Provider
      value={{ user, loading, notice, setNotice, loginUser, logout, refetchUser }}
    >
      {children}
    </AuthContext.Provider>
  );
}

/** Hook مخصص لاستخدام بيانات المستخدم بسهولة في أي صفحة أو مكون */
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth يجب أن تُستخدم داخل AuthProvider");
  }
  return context;
}

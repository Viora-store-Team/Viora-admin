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
import {
  apiFetch,
  getToken,
  removeToken,
  setSessionDeathHandler,
  setToken,
  type SessionDeath,
} from "@/lib/api";
import { ADMIN_ROLE, getMe } from "@/lib/auth/api";
import type { AuthUser } from "@/lib/auth/types";
import { t } from "@/lib/strings";

export type User = AuthUser;

interface LoginOptions {
  /** وين يروح بعد الدخول — الافتراضي `/` (النظرة العامة) */
  redirectTo?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  /**
   * بتنعرض على شاشة الدخول بعد طرد المستخدم (جلسة منتهية · حساب مش أدمن ·
   * حساب موقوف). بتعيش بالذاكرة بس — بتختفي مع إعادة تحميل الصفحة.
   */
  notice: AuthNotice | null;
  setNotice: (notice: AuthNotice | null) => void;
  loginUser: (userData: User, token: string, options?: LoginOptions) => void;
  logout: () => void;
  refetchUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/** سبب الطرد كما بيوصل لشاشة الدخول */
export interface AuthNotice {
  message: string;
  /**
   * السبب إيقاف الحساب تحديداً (`accountSuspended` من السيرفر) — بتنعرض
   * لوحة «حسابك موقوف» بدل شريط خطأ عام.
   */
  accountSuspended: boolean;
}

/**
 * المسارات اللي ما بتحتاج تسجيل دخول.
 *
 * وحدة بس — حساب الأدمن بينزرع من `.env` على السيرفر، فما في تسجيل ولا
 * استرجاع كلمة مرور من الواجهة.
 *
 * مطابقة **بادئة** مش مطابقة تامة — `/login/x` بتنحسب تحت `/login`.
 */
const PUBLIC_PREFIXES: string[] = ["/login"];

function isPublic(pathname: string): boolean {
  return PUBLIC_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

/*
  ⚠️ الحارس تحت **مش حماية**. التوكن بالـ localStorage وما في middleware،
  فأي حدا بيقدر يفتح الصفحات ويشوف الهيكل. الحماية الحقيقية إن كل مسار
  تحت /api/admin بيطلب توكن دوره ADMIN — الصفحات بترجعلها 401/403 وبتطلع
  فاضية. الحارس هون للتجربة بس: بيوفّر على المستخدم شاشة أخطاء بلا معنى.
*/

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [notice, setNotice] = useState<AuthNotice | null>(null);
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
    (message: string, accountSuspended = false) => {
      removeToken();
      setUser(null);
      setNotice({ message, accountSuspended });
      if (!publicRef.current) router.push("/login");
    },
    [router],
  );

  /*
    🚪 اشتراك بموت الجلسة — المصدر الوحيد للطرد التلقائي.

    `apiFetch` بيمسح التوكن أول ما يشوف `forceLogout` بأي رد، ومن هون
    بنصفّر المستخدم ونوجّهه. يعني أي طلب بأي صفحة بيطرد المستخدم لما
    الجلسة تموت — مش بس `/admin/me` وقت الإقلاع.
  */
  useEffect(() => {
    const onDeath = ({ message, accountSuspended }: SessionDeath) => {
      setUser(null);
      setNotice({ message: message || t.auth.sessionExpired, accountSuspended });
      if (!publicRef.current) router.push("/login");
    };

    setSessionDeathHandler(onDeath);
    return () => setSessionDeathHandler(null);
  }, [router]);

  // ── جلب بيانات المستخدم الحالي GET /api/admin/me ────────────────
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
      /* `/admin/me` بيرجّع المستخدم بالمستوى الأعلى — انفحص على السيرفر.
         ما في نسخة ملفوفة بـ`data` فما بنحتاط لشكل تاني. */
      const fetched = res.user;

      if (res.success && fetched) {
        /*
          بوابة الدور — حزام أمان تاني.

          `/admin/me` أصلاً محمي بالدور على السيرفر، فتوكن تاجر أو زبون
          بيرجع 403 قبل ما نوصل لهون. الفحص موجود عشان لو تراخى السيرفر
          يوماً، ما يفوت توكن غير أدمن ويشوف شاشات بترجع 403 بلا سبب مفهوم.
        */
        if (fetched.role !== ADMIN_ROLE) {
          eject(t.auth.notAdmin);
          return;
        }
        setUser(fetched);
        setNotice(null);
      } else if (res.status === 401 || res.status === 403) {
        /*
          401 (توكن منتهي/غير صالح) أو 403 (الحساب ليس أدمن / لا يملك صلاحية):
          نطرد المستخدم ونمسح التوكن ونوجّهه لشاشة الدخول مع الرسالة المناسبة.
        */
        eject(
          res.message ||
            (res.status === 403 ? t.auth.notAdmin : t.auth.sessionExpired),
        );
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

  /*
    حارس التنقّل — فحص محلي بلا طلب للسيرفر.

    التوجيه بس، بلا `setUser`. تصفير المستخدم مملوك لـ`logout` و`eject`،
    وهما معالجا أحداث مش effects. الدفع على `/login` بيفكّ تركيب قشرة
    اللوحة أصلاً، فالمستخدم القديم بالسياق ما بيرسم إشي — وتصفيره هون كان
    بيضيف رندر متتالي بلا فايدة.
  */
  useEffect(() => {
    if (!getToken() && !isPublicPath) router.push("/login");
  }, [pathname, isPublicPath, router]);

  /*
    مزامنة الجلسة مع السيرفر عند أول تحميل.

    eslint-disable تحت مقصود ومبرّر: هاي بالضبط الحالة اللي الـeffects
    موجودة إلها — مزامنة حالة React مع نظام خارجي (خادم المصادقة +
    التوكن بالتخزين المحلي). كل الـsetState جوّا `refetchUser` بتصير بعد
    `await getMe()` ما عدا فرع «ما في توكن»، والقاعدة ما بتقدر تشوف الفرق.
    البديل الوحيد لإسكاتها بشكل «نظيف» هو `await` وهمي — تحايل على القاعدة
    مش إصلاح، وبيخفي النية بدل ما يوضّحها.
  */
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refetchUser();
    // مرة وحدة عند التحميل — `refetchUser` بتتغيّر مع الراوتر وما بدنا تعيد الجلب
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
    الخروج محلي بالكامل — ما في POST /admin/logout (فحصناه: 404).
    التوكن JWT بلا حالة على السيرفر، فمسحه من هون بينهي الجلسة فعلياً.
  */
  const logout = useCallback(() => {
    removeToken();
    setUser(null);
    setNotice(null);
    router.push("/login");
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

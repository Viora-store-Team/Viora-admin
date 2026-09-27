"use client";

import { useRef, useState } from "react";
import { ArrowLeft, ChevronDown, LoaderCircle, ShieldOff } from "lucide-react";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import ErrorBanner from "@/components/ui/ErrorBanner";
import { useAuth } from "@/context/AuthContext";
import { adminLogin, ADMIN_ROLE } from "@/lib/auth/api";
import { dispatchToast } from "@/lib/toast";
import { t } from "@/lib/strings";
import styles from "../auth.module.css";

/** فحص محلي بسيط — بيوفّر رحلة شبكة على حقل فاضي أو إيميل بلا @ */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function AdminLoginPage() {
  const { notice, setNotice, loginUser } = useAuth();
  const formRef = useRef<HTMLFormElement>(null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [banner, setBanner] = useState("");
  /** الدخول نفسه رجّع `accountSuspended` — 403 بلا `forceLogout` */
  const [suspended, setSuspended] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  /*
    `notice` = سبب الطرد الجاي من AuthContext (جلسة منتهية · حساب مش أدمن ·
    موقوف). بتنمسح أول ما المستخدم يحاول من جديد.

    الحساب الموقوف بياخد لوحة مخصصة بدل شريط الخطأ — بيوصل من طريقين:
    طرد أثناء الجلسة (`notice.accountSuspended`) أو رفض وقت الدخول
    (`suspended`). الاتنين بينقاسوا على **العلم** مش على نص الرسالة.
  */
  const showSuspended = suspended || notice?.accountSuspended === true;
  const shownBanner = showSuspended ? "" : banner || notice?.message || "";

  /*
    شرح اللوحة. رسالة السيرفر للحساب الموقوف هي «هذا الحساب موقوف» — نفس
    عنوان اللوحة حرفياً، فعرضها كمان بينتج تكرار. بنعرضها بس لما تضيف
    معلومة جديدة، وغير هيك بنعرض الشرح الثابت (وين يروح المستخدم بعدها).
  */
  const serverMessage = (suspended ? banner : notice?.message) ?? "";
  const suspendedBody =
    serverMessage && serverMessage.trim() !== t.auth.login.suspendedTitle
      ? serverMessage
      : t.auth.login.suspendedHint;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    setBanner("");
    setSuspended(false);
    setNotice(null);
    setFieldErrors({});

    const trimmed = email.trim();
    const showFieldError = (field: "email" | "password", message: string) => {
      setFieldErrors({ [field]: message });
      const input = formRef.current?.elements.namedItem(field);
      if (input instanceof HTMLInputElement) input.focus();
    };

    if (!trimmed) {
      return showFieldError("email", t.auth.login.emailRequired);
    }
    if (!EMAIL_PATTERN.test(trimmed)) {
      return showFieldError("email", t.auth.login.emailInvalid);
    }
    if (!password) {
      return showFieldError("password", t.auth.login.passwordRequired);
    }

    setLoading(true);
    try {
      const res = await adminLogin(trimmed, password);

      if (res.success && res.user && res.token) {
        /*
          بوابة الدور هون كمان مش بس بالحارس: لو حساب غير أدمن نجح بالدخول
          من هالمسار يوماً، بنوقفه على الشاشة بدل ما نخزّن توكنه ونطرده بعدين
          من AuthContext — الطرد بعد الدخول بيبيّن للمستخدم كأنه عطل.
        */
        if (res.user.role !== ADMIN_ROLE) {
          setBanner(t.auth.notAdmin);
          dispatchToast("error", t.auth.notAdmin);
          return;
        }
        loginUser(res.user, res.token);
        return;
      }

      // 400 = حقل ناقص، والمفاتيح أسماء الحقول بالضبط
      if (res.status === 400 && res.errors) {
        setFieldErrors(res.errors);
        if (res.message) setBanner(res.message);
        return;
      }

      /*
        الحساب موقوف وقت الدخول: 403 مع `accountSuspended` وبلا `forceLogout`
        (ما في جلسة عشان تنقتل أصلاً). التفريع على العلم مش على الـstatus —
        نفس الـ403 بيرجع كمان لرفض الدور وللإيميل اللي ما تأكّد.
      */
      if (res.accountSuspended === true) {
        setSuspended(true);
        setBanner(res.message || "");
        return;
      }

      // 401 بيانات غلط · 429 محاولات كتير — الرسائل جاهزة بالعربي
      setBanner(res.message || t.errors.genericTitle);
      dispatchToast("error", res.message || t.errors.genericTitle);
    } catch {
      const message = "تعذّر إكمال تسجيل الدخول. تأكّد من السماح بتخزين بيانات الموقع وحاول مرة ثانية.";
      setBanner(message);
      dispatchToast("error", message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.login}>
        <div className={styles.intro}>
          <p className={styles.eyebrow}>{t.auth.login.eyebrow}</p>
          <h1 className={styles.title}>
            {t.auth.login.title}
          </h1>
          <p className={styles.subtitle}>{t.auth.login.subtitle}</p>
        </div>

        {/* لوحة الحساب الموقوف — بديل شريط الخطأ العام، مش زيادة عليه */}
        {showSuspended ? (
          <div
            role="alert"
            className={`${styles.feedback} ${styles.suspended}`}
          >
            <div className={styles.suspendedTitle}>
              <ShieldOff size={18} aria-hidden="true" />
              {t.auth.login.suspendedTitle}
            </div>
            <p>{suspendedBody}</p>
          </div>
        ) : (
          <ErrorBanner message={shownBanner} className={styles.feedback} />
        )}

        <form ref={formRef} onSubmit={handleSubmit} className={styles.form} aria-busy={loading} noValidate>
          <Input
            label={t.auth.login.email}
            id="email"
            name="email"
            type="email"
            value={email}
            onChange={setEmail}
            placeholder={t.auth.login.emailPlaceholder}
            error={fieldErrors.email}
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            required
          />

          <Input
            label={t.auth.login.password}
            id="password"
            name="password"
            type="password"
            value={password}
            onChange={setPassword}
            placeholder={t.auth.login.passwordPlaceholder}
            error={fieldErrors.password}
            autoComplete="current-password"
            showToggle
            required
          />

          <Button
            type="submit"
            variant="primary"
            size="lg"
            fullWidth
            disabled={loading}
            className={styles.submit}
          >
            <span>{loading ? t.auth.login.submitting : t.auth.login.submit}</span>
            {loading ? (
              <LoaderCircle size={18} className={styles.spinner} aria-hidden="true" />
            ) : (
              <ArrowLeft size={18} className={styles.submitArrow} aria-hidden="true" />
            )}
          </Button>
        </form>
        <p className="sr-only" role="status">{loading ? t.auth.login.submitting : ""}</p>

        <details className={styles.help}>
          <summary>{t.auth.login.helpTitle}<ChevronDown size={13} aria-hidden="true" /></summary>
          <p>{t.auth.login.helpBody}</p>
        </details>
    </div>
  );
}

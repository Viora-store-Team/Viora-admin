"use client";

import { useState } from "react";
import { ShieldCheck } from "lucide-react";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import ErrorBanner from "@/components/ui/ErrorBanner";
import { Card, CardBody } from "@/components/ui/Card";
import { useAuth } from "@/context/AuthContext";
import { adminLogin, ADMIN_ROLE } from "@/lib/auth/api";
import { t } from "@/lib/strings";

/** فحص محلي بسيط — بيوفّر رحلة شبكة على حقل فاضي أو إيميل بلا @ */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function AdminLoginPage() {
  const { notice, setNotice, loginUser } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [banner, setBanner] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  /* `notice` = رسالة الطرد الجاية من AuthContext (جلسة منتهية · حساب مش
     أدمن · موقوف). بتنمسح أول ما المستخدم يحاول من جديد. */
  const shownBanner = banner || notice || "";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setBanner("");
    setNotice(null);
    setFieldErrors({});

    const trimmed = email.trim();

    if (!trimmed) {
      return setFieldErrors({ email: t.auth.login.emailRequired });
    }
    if (!EMAIL_PATTERN.test(trimmed)) {
      return setFieldErrors({ email: t.auth.login.emailInvalid });
    }
    if (!password) {
      return setFieldErrors({ password: t.auth.login.passwordRequired });
    }

    setLoading(true);
    const res = await adminLogin(trimmed, password);
    setLoading(false);

    if (res.success && res.user && res.token) {
      /*
        بوابة الدور هون كمان مش بس بالحارس: لو حساب غير أدمن نجح بالدخول
        من هالمسار يوماً، بنوقفه على الشاشة بدل ما نخزّن توكنه ونطرده بعدين
        من AuthContext — الطرد بعد الدخول بيبيّن للمستخدم كأنه عطل.
      */
      if (res.user.role !== ADMIN_ROLE) {
        setBanner(t.auth.notAdmin);
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

    // 401 بيانات غلط · 403 موقوف · 429 محاولات كتير — الرسائل جاهزة بالعربي
    setBanner(res.message || t.errors.genericTitle);
  };

  return (
    <Card className="w-full max-w-md border border-border shadow-xs">
      <CardBody className="space-y-6 p-6 sm:p-8">
        <div className="space-y-2 text-center">
          <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-primary-soft text-primary">
            <ShieldCheck className="size-6" aria-hidden="true" />
          </span>
          <h1 className="text-xl font-extrabold text-heading">
            {t.auth.login.title}
          </h1>
          <p className="text-sm text-text-secondary">{t.auth.login.subtitle}</p>
        </div>

        <ErrorBanner message={shownBanner} />

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <Input
            label={t.auth.login.email}
            id="email"
            type="email"
            value={email}
            onChange={setEmail}
            placeholder={t.auth.login.emailPlaceholder}
            error={fieldErrors.email}
            autoComplete="username"
            required
          />

          <Input
            label={t.auth.login.password}
            id="password"
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
          >
            {loading ? t.auth.login.submitting : t.auth.login.submit}
          </Button>
        </form>

        <p className="text-center text-xs leading-relaxed text-text-secondary">
          {t.auth.login.seedHint}
        </p>
      </CardBody>
    </Card>
  );
}

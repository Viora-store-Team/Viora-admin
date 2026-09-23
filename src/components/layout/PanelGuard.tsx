"use client";

import Spinner from "@/components/ui/Spinner";
import ErrorBanner from "@/components/ui/ErrorBanner";
import { useAuth } from "@/context/AuthContext";

/**
 * بيمنع ومضة اللوحة قبل ما تتأكد الجلسة.
 *
 * AuthContext بيدفع الزائر على `/login` لحاله، بس الدفع بيصير جوّا effect —
 * يعني القشرة بترسم رسمة كاملة (سايدبار + جدول فاضي + شريط خطأ) قبل ما
 * يشتغل التوجيه. الغلاف هنا بيوقف الرسم لحد ما نعرف مين المستخدم.
 *
 * ⚠️ **مش حماية**. الحماية على السيرفر — كل مسار /api/admin بيطلب توكن
 * دوره ADMIN. هذا تحسين تجربة بس.
 */
export default function PanelGuard({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading, authError, refetchUser } = useAuth();

  if (loading) {
    return (
      <div className="grid min-h-dvh place-items-center">
        <Spinner />
      </div>
    );
  }

  // ما في مستخدم = التوجيه على /login شغّال هلق — ما بنرسم إشي بالوقت الضائع
  if (!user) return authError ? (
    <div className="mx-auto max-w-xl p-6 pt-24">
      <ErrorBanner message={authError} onRetry={() => void refetchUser()} />
    </div>
  ) : null;

  return <>{children}</>;
}

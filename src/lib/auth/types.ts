/**
 * أنواع المصادقة — النسخة المقلّمة تبع لوحة مالك المنصة.
 *
 * لوحة التاجر عندها نسخة أوسع (أنواع التسجيل والمتجر وإكمال غوغل). هون
 * المستهلكين اتنين بس: AuthContext وشاشة الدخول، فما بنجرّ معنا أنواع
 * مسارات ما إلها صفحات بهاد التطبيق.
 *
 * الفكرة الأساسية بالعقد: **حساب منفصل لكل دور**. نفس الإيميل ممكن يكون إله
 * صفّين بقاعدة البيانات — واحد زبون وواحد تاجر — بـ id وكلمة مرور مستقلين.
 * وحساب الأدمن صفّ تالت بينزرع من متغيّرات البيئة وقت إقلاع السيرفر؛ ما في
 * ولا مسار HTTP بيعمل حساب أدمن.
 */

export type Role = "ADMIN" | "MERCHANT" | "CUSTOMER";

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  /** null عادي — حساب الأدمن المزروع ما إله رقم */
  phone: string | null;
  role: Role;
  /** بيرجع من /admin/me — ما إله مستهلك بالواجهة لهلق */
  avatarUrl?: string | null;
  emailVerified?: boolean;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

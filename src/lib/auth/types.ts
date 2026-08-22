/**
 * أنواع المصادقة — النسخة المقلّمة تبع لوحة مالك المنصة.
 *
 * لوحة التاجر عندها نسخة أوسع (أنواع التسجيل والمتجر وإكمال غوغل). هون
 * الاستهلاك الوحيد هو AuthContext لما يقرأ GET /auth/me، فما بنجرّ معنا
 * أنواع مسارات ما إلها صفحات بهاد التطبيق.
 *
 * الفكرة الأساسية بالعقد: **حساب منفصل لكل دور**. نفس الإيميل ممكن يكون إله
 * صفّين بقاعدة البيانات — واحد زبون وواحد تاجر — بـ id وكلمة مرور مستقلين.
 * ما في دور ADMIN بالعقد لهلق؛ لما يوصل بينضاف هون.
 */

export type Role = "MERCHANT" | "CUSTOMER";

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  /** null عادي — الزبون ما بنطلب منه رقم بالتسجيل */
  phone: string | null;
  role: Role;
  emailVerified?: boolean;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

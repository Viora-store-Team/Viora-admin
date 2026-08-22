import type { Metadata } from "next";
import { Cairo } from "next/font/google";
import { t } from "@/lib/strings";
import { AuthProvider } from "@/context/AuthContext";
import "./globals.css";

const cairo = Cairo({
  variable: "--font-cairo",
  subsets: ["arabic", "latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: `${t.app.name} | ${t.admin.tagline}`,
  description: "لوحة مالك منصة فيورا — إدارة المتاجر والمستخدمين والمحتوى.",
};

/*
  ما في StoreProvider هون — سياق المتجر خاص بلوحة التاجر (بيعبّي نموذج
  الإعدادات وبيغذّي شاشات المنتجات)، وما إله أي مستهلك بهاد التطبيق.
*/
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // lang + dir على الجذر مرة وحدة — بدل ما تتكرر dir="rtl" على div بكل صفحة
    <html lang="ar" dir="rtl" className={`${cairo.variable} h-full`}>
      <body className="min-h-full antialiased">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}

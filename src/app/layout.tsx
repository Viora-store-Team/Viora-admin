import type { Metadata, Viewport } from "next";
import { PwaProvider } from "@/components/pwa/PwaProvider";
import localFont from "next/font/local";
import { t } from "@/lib/strings";
import { AuthProvider } from "@/context/AuthContext";
import ToastViewport from "@/components/ui/ToastViewport";
import "./globals.css";

const thmanyah = localFont({
  src: [
    { path: "./fonts/thmanyahsans-Regular.otf", weight: "400" },
    { path: "./fonts/thmanyahsans-Medium.otf", weight: "500" },
    { path: "./fonts/thmanyahsans-Bold.otf", weight: "700" },
  ],
  variable: "--font-thmanyah",
  display: "swap",
});

export const metadata: Metadata = {
  applicationName: "Viora Admin",
  appleWebApp: { capable: true, title: "Viora Admin", statusBarStyle: "default" },
  icons: { icon: "/icons/icon-192.png?v=2", apple: "/icons/apple-touch-icon.png?v=2" },
  title: `${t.app.name} | ${t.admin.tagline}`,
  description: "لوحة مالك منصة فيورا — إدارة المتاجر والمستخدمين والمحتوى.",
};

export const viewport: Viewport = { themeColor: "#511016" };

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
    <html lang="ar" dir="rtl" className={`${thmanyah.variable} h-full`}>
      <body className="min-h-full antialiased">
        <PwaProvider><AuthProvider>{children}<ToastViewport /></AuthProvider></PwaProvider>
      </body>
    </html>
  );
}

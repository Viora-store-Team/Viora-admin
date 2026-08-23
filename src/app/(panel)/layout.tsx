import AppShell from "@/components/layout/AppShell";
import PanelGuard from "@/components/layout/PanelGuard";
import MockNotice from "@/components/admin/MockNotice";

/**
 * قشرة لوحة مالك المنصة.
 *
 * القشرة بتقرأ قائمة روابطها من config/nav.ts بنفسها، فما في props بتعبر
 * حدود Server → Client (أيقونات lucide دوال وما بتنسرلز).
 *
 * كل صفحات اللوحة جوّا مجموعة `(panel)` عشان تشارك القشرة بلا ما تظهر
 * `panel` بالمسار. شاشة الدخول برّا المجموعة — بمجموعة `(auth)` — فبتطلع
 * بلا سايدبار.
 */
export default function PanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <PanelGuard>
      <AppShell>
        <MockNotice />
        {children}
      </AppShell>
    </PanelGuard>
  );
}

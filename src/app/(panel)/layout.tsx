import AppShell from "@/components/layout/AppShell";
import MockNotice from "@/components/admin/MockNotice";

/**
 * قشرة لوحة مالك المنصة.
 *
 * القشرة بتقرأ قائمة روابطها من config/nav.ts بنفسها، فما في props بتعبر
 * حدود Server → Client (أيقونات lucide دوال وما بتنسرلز).
 *
 * كل صفحات اللوحة جوّا مجموعة `(panel)` عشان تشارك القشرة بلا ما تظهر
 * `panel` بالمسار. لما يوصل دخول الأدمن من الباك إند، `/login` بينحط
 * **برّا** المجموعة فبيطلع بلا سايدبار بلا ما ننقل ولا ملف من هون.
 */
export default function PanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AppShell>
      <MockNotice />
      {children}
    </AppShell>
  );
}

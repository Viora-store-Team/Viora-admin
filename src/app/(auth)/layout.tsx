import type { ReactNode } from "react";

/**
 * غلاف شاشة الدخول — خلفية وتوسيط بلا سايدبار ولا توب-بار.
 *
 * محطوطة **برّا** مجموعة `(panel)` عشان ما ترث القشرة: شاشة دخول فيها
 * سايدبار بتعرض روابط ما بتفتح.
 *
 * `dir="rtl"` مش هون — محطوط مرة وحدة على `<html>` بالـ layout الجذر.
 */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-field-bg px-4 py-10">
      {children}
    </div>
  );
}

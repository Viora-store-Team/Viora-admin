import type { ReactNode } from "react";
import Image from "next/image";
import { ArrowUpLeft, LockKeyhole } from "lucide-react";
import styles from "./auth.module.css";

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
    <main className={styles.scene}>
      <section className={styles.workspace} aria-label="تسجيل الدخول إلى فيورا">
        <header className={styles.header}>
          <div className={styles.brand} aria-label="فيورا">
            <Image src="/icons/original-logo.png" alt="" width={38} height={35} className={styles.brandMark} />
            <span className={styles.brandName} lang="en" dir="ltr">viora</span>
          </div>
          <span className={styles.headerLabel}>مساحة الإدارة</span>
        </header>

        <div className={styles.formStage}>{children}</div>

        <footer className={styles.footer}>
          <span><LockKeyhole size={13} aria-hidden="true" /> مخصّصة لفريق إدارة فيورا</span>
          <span className={styles.copyright} lang="en" dir="ltr">© {new Date().getFullYear()} VIORA</span>
        </footer>
      </section>

      <aside className={styles.artPanel} aria-label="فيورا — كل شيء تحت نظرك">
        <div className={styles.artTopline}>
          <span>رؤية تهتمّ بكل تفصيلة.</span>
          <ArrowUpLeft size={23} strokeWidth={1.1} aria-hidden="true" />
        </div>
        <div className={styles.artwork} aria-hidden="true">
          <div className={styles.orbit} />
          <Image
            src="/images/login-sculpture.webp"
            alt=""
            width={1200}
            height={1200}
            sizes="(max-width: 900px) 1px, 56vw"
            loading="eager"
            className={styles.sculpture}
          />
        </div>
        <div className={styles.artBottom}>
          <div>
            <h2>كلّ شيء.<br /><span>تحت نظرك.</span></h2>
          </div>
          <div className={styles.artSignature} lang="en" dir="ltr">
            <span>V.</span>
          </div>
        </div>
      </aside>
    </main>
  );
}

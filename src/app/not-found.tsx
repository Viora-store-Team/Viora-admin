import { t } from "@/lib/strings";
import Link from "next/link";

export default function NotFound() {
  return (
    <div className="grid min-h-dvh place-items-center p-6">
      <div className="flex flex-col items-center gap-3 text-center">
        <p className="text-5xl font-bold text-primary">404</p>
        <h1 className="text-xl font-bold text-heading">
          {t.errors.notFoundTitle}
        </h1>
        <p className="text-sm text-text-secondary">{t.errors.notFoundBody}</p>
        <Link
          href="/dashboard"
          className="mt-2 inline-flex h-12 items-center justify-center rounded-xl bg-primary px-5 text-sm font-medium text-on-primary transition-colors duration-150 hover:bg-primary-hover active:scale-[.98]"
        >
          {t.errors.backHome}
        </Link>
      </div>
    </div>
  );
}

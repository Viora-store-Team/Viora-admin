import Link from "next/link";
import { t } from "@/lib/strings";

export default function NotFound() {
  return (
    <div className="grid min-h-dvh place-items-center p-6">
      <div className="flex flex-col items-center gap-3 text-center">
        <p className="text-5xl font-extrabold text-primary">404</p>
        <h1 className="text-xl font-extrabold text-heading">
          {t.errors.notFoundTitle}
        </h1>
        <p className="text-sm text-text-secondary">{t.errors.notFoundBody}</p>
        <Link
          href="/dashboard"
          className="mt-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-icon transition hover:bg-primary-hover"
        >
          {t.errors.backHome}
        </Link>
      </div>
    </div>
  );
}

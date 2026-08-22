import { t } from "@/lib/strings";

export default function Loading() {
  return (
    <div className="grid min-h-dvh place-items-center">
      <div className="flex flex-col items-center gap-3">
        <span className="size-8 animate-spin rounded-full border-2 border-primary-soft border-t-primary" />
        <p className="text-sm font-semibold text-text-secondary">
          {t.common.loading}
        </p>
      </div>
    </div>
  );
}

"use client";

import { t } from "@/lib/strings";
import Button from "@/components/ui/Button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="grid min-h-dvh place-items-center p-6">
      <div className="flex flex-col items-center gap-3 text-center">
        <h1 className="text-xl font-extrabold text-heading">
          {t.errors.genericTitle}
        </h1>
        <p className="text-sm text-text-secondary">{t.errors.genericBody}</p>
        {error.digest && (
          <p className="ltr-nums text-xs text-placeholder">{error.digest}</p>
        )}
        <Button onClick={reset} className="mt-2">
          {t.errors.retry}
        </Button>
      </div>
    </div>
  );
}

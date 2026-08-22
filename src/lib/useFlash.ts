"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * رسالة نجاح مؤقتة بتختفي لحالها.
 *
 * نفس السلوك اللي بصفحة الإعدادات (setSaved + setTimeout) بس معزول بمكان واحد،
 * ومع تنظيف المؤقت عشان ما يصير setState على مكوّن مفكوك لو المستخدم غادر الصفحة
 * قبل ما تخلص الثواني الثلاثة.
 */
export function useFlash(ms = 3000): [string | null, (message: string) => void] {
  const [message, setMessage] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flash = useCallback(
    (next: string) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      setMessage(next);
      timerRef.current = setTimeout(() => setMessage(null), ms);
    },
    [ms],
  );

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return [message, flash];
}

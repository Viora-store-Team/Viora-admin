"use client";

import { useEffect } from "react";
import { t } from "@/lib/strings";
import Button from "./Button";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  /** بيقبل عناصر مش نص بس — عشان نعرض قائمة الألوان اللي رح تنحذف */
  body: React.ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  tone?: "danger" | "primary";
  /** بيعطّل الأزرار وبيبدّل تسمية التأكيد أثناء الطلب */
  loading?: boolean;
  /** إجراء ثالث اختياري بينعرض فوق أزرار الإلغاء/التأكيد (زي "أوقف بدل ما تحذف") */
  extraAction?: React.ReactNode;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * حوار تأكيد للعمليات المدمّرة.
 *
 * التركيز الافتراضي على زر الإلغاء — الخيار الآمن هو اللي لازم يكون تحت الإصبع
 * لما المستخدم يضغط Enter بلا ما يقرأ.
 */
export default function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel,
  cancelLabel = t.common.cancel,
  tone = "danger",
  loading = false,
  extraAction,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  // إغلاق بـ Escape + منع تمرير الصفحة خلف الحوار — نفس نمط AppShell
  useEffect(() => {
    if (!open) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !loading) onCancel();
    };

    document.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, loading, onCancel]);

  if (!open) return null;

  const titleId = "confirm-dialog-title";

  return (
    <>
      <button
        type="button"
        aria-label={t.common.close}
        onClick={onCancel}
        disabled={loading}
        className="fixed inset-0 z-40 bg-black/25 backdrop-blur-[1px]"
      />

      <div className="pointer-events-none fixed inset-0 z-50 grid place-items-center p-4">
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          className="pointer-events-auto w-full max-w-md rounded-2xl bg-surface p-6 shadow-2xl"
        >
          <h2 id={titleId} className="text-base font-extrabold text-heading">
            {title}
          </h2>

          <div className="mt-2 text-sm text-text-secondary">{body}</div>

          {extraAction && <div className="mt-5">{extraAction}</div>}

          <div className="mt-6 flex flex-wrap justify-end gap-2">
            {/* التركيز الافتراضي على الإلغاء — الخيار الآمن */}
            <Button
              autoFocus
              variant="secondary"
              onClick={onCancel}
              disabled={loading}
            >
              {cancelLabel}
            </Button>
            <Button variant={tone} onClick={onConfirm} disabled={loading}>
              {loading ? t.common.saving : confirmLabel}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}

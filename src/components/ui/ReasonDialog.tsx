"use client";

import { useEffect, useState } from "react";
import { t } from "@/lib/strings";
import { ADMIN_LIMITS } from "@/lib/admin/types";
import Button from "./Button";
import Input from "./Input";

interface ReasonDialogProps {
  open: boolean;
  title: string;
  body: React.ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  tone?: "danger" | "primary";
  loading?: boolean;
  /** خطأ راجع من السيرفر على حقل reason — بينعرض تحت الحقل */
  serverError?: string;
  onConfirm: (reason: string) => void;
  onCancel: () => void;
}

/**
 * حوار تأكيد بسبب **إلزامي**.
 *
 * كل عملية حسّاسة بلوحة الأدمن (إيقاف متجر · إيقاف حساب · إخفاء تقييم) لازم
 * تسجّل سبب. الإلزام هون بنيوي مش اتفاق: زر التأكيد معطّل لحد ما ينكتب سبب
 * صالح، فما في مسار يوصل للسيرفر بلا سبب.
 *
 * ⚠️ الواجهة **بتغذّي** سجل التدقيق ما بتملكه — السيرفر هو اللي بيكتب السجل
 * (المنفّذ · الهدف · السبب · الوقت). التحقّق هون تجربة استخدام، والتحقّق
 * الحقيقي لازم يتكرّر على السيرفر.
 *
 * مبني على نفس نمط ConfirmDialog — Escape للإغلاق، قفل تمرير الصفحة،
 * والتركيز الافتراضي على الحقل لأن المستخدم لازم يكتب قبل ما يأكّد.
 */
export default function ReasonDialog({
  open,
  title,
  body,
  confirmLabel,
  cancelLabel = t.common.cancel,
  tone = "danger",
  loading = false,
  serverError,
  onConfirm,
  onCancel,
}: ReasonDialogProps) {
  const [reason, setReason] = useState("");
  const [touched, setTouched] = useState(false);

  // تصفير الحقل عند كل فتح — بلاها بيضل سبب العملية السابقة مكتوب
  const [wasOpen, setWasOpen] = useState(open);
  if (wasOpen !== open) {
    setWasOpen(open);
    if (open) {
      setReason("");
      setTouched(false);
    }
  }

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

  const trimmed = reason.trim();
  const tooShort = trimmed.length < ADMIN_LIMITS.reasonMin;
  const tooLong = trimmed.length > ADMIN_LIMITS.reasonMax;
  const invalid = tooShort || tooLong;

  /*
    ⚠️ فرع multiline بـ Input ما بينشر `...rest` على الـ textarea، فـ onBlur
    و autoFocus بينضاعوا بصمت. لهيك بنعتبر المستخدم "لمس" الحقل أول ما يكتب
    حرف، أو لما يضغط تأكيد — بلا ما نعدّل مكوّن مشترك مع نماذج التاجر.
  */
  const showError = touched || trimmed.length > 0;

  const localError = !showError
    ? undefined
    : trimmed.length === 0
      ? t.admin.common.reasonRequired
      : tooShort
        ? t.admin.common.reasonTooShort
        : tooLong
          ? t.admin.common.reasonTooLong
          : undefined;

  const titleId = "reason-dialog-title";

  const confirm = () => {
    setTouched(true);
    if (invalid) return;
    onConfirm(trimmed);
  };

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

          <div className="mt-5">
            <Input
              id="reason-dialog-input"
              label={t.admin.common.reasonLabel}
              placeholder={t.admin.common.reasonPlaceholder}
              value={reason}
              onChange={setReason}
              error={localError ?? serverError}
              disabled={loading}
              multiline
              rows={3}
              required
            />
            <p className="ltr-nums mt-1 text-end text-xs text-text-secondary">
              {trimmed.length} / {ADMIN_LIMITS.reasonMax}
            </p>
          </div>

          <div className="mt-6 flex flex-wrap justify-end gap-2">
            <Button variant="secondary" onClick={onCancel} disabled={loading}>
              {cancelLabel}
            </Button>
            <Button
              variant={tone}
              onClick={confirm}
              // الإلزام بنيوي: بلا سبب صالح ما في طريقة توصل للسيرفر
              disabled={loading || invalid}
            >
              {loading ? t.common.saving : confirmLabel}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}

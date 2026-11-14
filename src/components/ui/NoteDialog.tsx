"use client";

import { useState } from "react";
import { t } from "@/lib/strings";
import Button from "./Button";
import Input from "./Input";
import Modal from "./Modal";

interface NoteDialogProps {
  open: boolean;
  title: string;
  body: React.ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  tone?: "danger" | "primary";
  loading?: boolean;
  label: string;
  placeholder?: string;
  maxLength: number;
  /** خطأ راجع من السيرفر على حقل الملاحظة — بينعرض تحت الحقل */
  serverError?: string;
  /** الملاحظة بعد التنظيف، أو undefined لو تركها فاضية */
  onConfirm: (note: string | undefined) => void;
  onCancel: () => void;
}

/**
 * حوار تأكيد بملاحظة **اختيارية**.
 *
 * عكس ReasonDialog: هون الملاحظة مش شرط للتأكيد (قرار بلاغ عادي ممكن
 * ما يحتاج شرح)، بس لو انكتبت فلازم ما تتعدى الحد.
 */
export default function NoteDialog({
  open,
  title,
  body,
  confirmLabel,
  cancelLabel = t.common.cancel,
  tone = "primary",
  loading = false,
  label,
  placeholder,
  maxLength,
  serverError,
  onConfirm,
  onCancel,
}: NoteDialogProps) {
  const [note, setNote] = useState("");

  // تصفير الحقل عند كل فتح — بلاها بتضل ملاحظة القرار السابق مكتوبة
  const [wasOpen, setWasOpen] = useState(open);
  if (wasOpen !== open) {
    setWasOpen(open);
    if (open) setNote("");
  }

  const trimmed = note.trim();
  const tooLong = trimmed.length > maxLength;

  return (
    <Modal open={open} onClose={() => { if (!loading) onCancel(); }} title={title} labelledById="note-dialog-title" closeOnBackdrop={!loading}
      footer={<>
        <Button variant="secondary" onClick={onCancel} disabled={loading}>{cancelLabel}</Button>
        <Button variant={tone} onClick={() => onConfirm(trimmed || undefined)} disabled={loading || tooLong}>
          {loading ? t.common.saving : confirmLabel}
        </Button>
      </>}>
          <div className="text-sm text-text-secondary">{body}</div>
          <div className="mt-5">
            <Input
              id="note-dialog-input"
              label={label}
              placeholder={placeholder}
              value={note}
              onChange={setNote}
              error={tooLong ? t.admin.reports.noteTooLong : serverError}
              disabled={loading}
              multiline
              rows={4}
            />
            <p className="ltr-nums mt-1 text-end text-xs text-text-secondary">
              {trimmed.length} / {maxLength}
            </p>
          </div>

    </Modal>
  );
}

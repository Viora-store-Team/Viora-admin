"use client";

import { t } from "@/lib/strings";
import Button from "./Button";
import Modal from "./Modal";

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
  return <Modal open={open} onClose={() => { if (!loading) onCancel(); }} title={title} labelledById="confirm-dialog-title"
    closeOnBackdrop={!loading} size="md"
    footer={<><Button data-autofocus variant="secondary" onClick={onCancel} disabled={loading}>{cancelLabel}</Button>
      <Button variant={tone} onClick={onConfirm} disabled={loading}>{loading ? t.common.saving : confirmLabel}</Button></>}>
    <div className="text-sm text-text-secondary">{body}</div>
    {extraAction && <div className="mt-5">{extraAction}</div>}
  </Modal>;
}

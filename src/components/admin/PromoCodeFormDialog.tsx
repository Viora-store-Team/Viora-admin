"use client";

import { useId, useRef, useState } from "react";
import Button from "@/components/ui/Button";
import ErrorBanner from "@/components/ui/ErrorBanner";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Spinner from "@/components/ui/Spinner";
import { createPromoCode } from "@/lib/admin/api";
import {
  buildPromoBody,
  serverPromoErrors,
  type PromoForm,
  type PromoFormErrors,
} from "@/lib/admin/promo";
import type { AdminPromoCode, PromoDuration, PromoType } from "@/lib/admin/types";
import { cn } from "@/lib/cn";
import { t } from "@/lib/strings";
import { useDialog } from "@/lib/useDialog";

const EMPTY: PromoForm = {
  code: "",
  type: "PERCENT",
  percent: "",
  maxDiscount: "",
  minOrder: "",
  duration: "1D",
  customEnd: "",
};

const DURATIONS: { value: PromoDuration; label: string }[] = [
  { value: "12H", label: "12 ساعة" },
  { value: "1D", label: "يوم" },
  { value: "3D", label: "3 أيام" },
  { value: "7D", label: "أسبوع" },
  { value: "CUSTOM", label: "مخصص" },
];

const TYPES: { value: PromoType; label: string }[] = [
  { value: "PERCENT", label: "نسبة خصم" },
  { value: "FREE_DELIVERY", label: "توصيل مجاني" },
];

/**
 * «كود Viora جديد» — الخصم على حساب المنصة. التحقق المحلي من promo.ts،
 * وأخطاء السيرفر بتنزل تحت حقلها (الكود المحجوز تحت خانة الكود).
 */
export default function PromoCodeFormDialog({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (promo: AdminPromoCode) => void;
}) {
  const [form, setForm] = useState<PromoForm>(EMPTY);
  const [errors, setErrors] = useState<PromoFormErrors>({});
  const [failure, setFailure] = useState("");
  const [busy, setBusy] = useState(false);
  const submitting = useRef(false);
  const titleId = useId();

  const close = () => {
    if (submitting.current) return;
    setForm(EMPTY);
    setErrors({});
    setFailure("");
    onClose();
  };
  const dialogRef = useDialog(open, close, busy);

  function update<K extends keyof PromoForm>(key: K, value: PromoForm[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined, ...(key === "customEnd" ? { endsAt: undefined } : {}) }));
  }

  async function submit() {
    if (submitting.current) return;
    const built = buildPromoBody(form, new Date());
    if ("errors" in built) {
      setErrors(built.errors);
      return;
    }
    submitting.current = true;
    setBusy(true);
    setFailure("");
    try {
      const res = await createPromoCode(built.body);
      if (res.success && res.promoCode) {
        setForm(EMPTY);
        setErrors({});
        onCreated(res.promoCode);
        return;
      }
      const fieldErrors = serverPromoErrors(res);
      setErrors(fieldErrors);
      if (!Object.keys(fieldErrors).length) {
        setFailure(res.message || t.errors.genericTitle);
      }
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }

  if (!open) return null;

  const percent = form.type === "PERCENT";
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label={t.common.close}
        className="absolute inset-0 bg-black/40"
        onClick={close}
      />
      <div
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-2xl bg-surface p-6 shadow-2xl"
      >
        <h2 id={titleId} className="text-base font-extrabold text-heading">
          كود Viora جديد
        </h2>
        <p className="mt-1 text-sm text-text-secondary">
          الخصم على حساب Viora — المتاجر بتستلم سعرها كامل.
        </p>

        <div className="mt-5 flex flex-col gap-4">
          <ErrorBanner message={failure} />
          <Input
            id="promo-code"
            label="الكود"
            dir="ltr"
            value={form.code}
            maxLength={20}
            onChange={(value) => update("code", value.replace(/[^A-Za-z0-9]/g, "").toUpperCase())}
            placeholder="VIORA10"
            error={errors.code}
            disabled={busy}
          />

          <fieldset>
            <legend className="mb-2 text-sm font-bold text-field-label">نوع الخصم</legend>
            <div className="grid grid-cols-2 gap-2">
              {TYPES.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  aria-pressed={form.type === option.value}
                  disabled={busy}
                  onClick={() => update("type", option.value)}
                  className={cn(
                    "rounded-xl border px-3 py-2.5 text-sm font-bold transition",
                    form.type === option.value
                      ? "border-primary bg-primary-soft text-primary"
                      : "border-black/10 text-text-secondary hover:border-primary/40",
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </fieldset>

          {percent && (
            <div className="grid grid-cols-2 gap-3">
              <Input
                id="promo-percent"
                label="نسبة الخصم"
                inputMode="numeric"
                dir="ltr"
                value={form.percent}
                onChange={(value) => update("percent", value)}
                placeholder="10"
                error={errors.percent}
                disabled={busy}
              />
              <Input
                id="promo-max"
                label="أقصى خصم (اختياري)"
                inputMode="decimal"
                dir="ltr"
                value={form.maxDiscount}
                onChange={(value) => update("maxDiscount", value)}
                placeholder="30"
                error={errors.maxDiscount}
                disabled={busy}
              />
            </div>
          )}

          <Input
            id="promo-min"
            label="الحد الأدنى للطلب (اختياري)"
            inputMode="decimal"
            dir="ltr"
            value={form.minOrder}
            onChange={(value) => update("minOrder", value)}
            placeholder="100"
            error={errors.minOrder}
            disabled={busy}
          />

          <Select
            id="promo-duration"
            label="مدة الكود"
            value={form.duration}
            onChange={(value) => update("duration", value as PromoDuration)}
            options={DURATIONS}
            error={errors.duration}
            disabled={busy}
          />
          {form.duration === "CUSTOM" && (
            <Input
              id="promo-end"
              label="ينتهي في"
              type="datetime-local"
              dir="ltr"
              value={form.customEnd}
              onChange={(value) => update("customEnd", value)}
              error={errors.endsAt}
              disabled={busy}
            />
          )}
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <Button variant="secondary" onClick={close} disabled={busy}>
            {t.common.cancel}
          </Button>
          <Button onClick={submit} disabled={busy} aria-busy={busy}>
            {busy ? <Spinner variant="inline" /> : null}
            إنشاء
          </Button>
        </div>
      </div>
    </div>
  );
}

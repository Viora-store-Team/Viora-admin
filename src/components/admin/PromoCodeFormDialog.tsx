"use client";

import { useRef, useState } from "react";
import Button from "@/components/ui/Button";
import ErrorBanner from "@/components/ui/ErrorBanner";
import Input from "@/components/ui/Input";
import Modal from "@/components/ui/Modal";
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

  const close = () => {
    if (submitting.current) return;
    setForm(EMPTY);
    setErrors({});
    setFailure("");
    onClose();
  };

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

  const percent = form.type === "PERCENT";
  return (
    <Modal open={open} onClose={close} closeOnBackdrop={!busy} title="كود Viora جديد"
      description="الخصم على حساب Viora — المتاجر بتستلم سعرها كامل."
      footer={<>
        <Button variant="secondary" onClick={close} disabled={busy}>{t.common.cancel}</Button>
        <Button onClick={submit} disabled={busy} aria-busy={busy}>
          {busy ? <Spinner variant="inline" /> : null}إنشاء
        </Button>
      </>}
    >
        <div className="flex flex-col gap-4">
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
            <legend className="mb-2 text-sm font-bold text-heading">نوع الخصم</legend>
            <div className="grid grid-cols-2 gap-2">
              {TYPES.map((option) => (
                <Button
                  key={option.value}
                  variant="secondary"
                  size="sm"
                  aria-pressed={form.type === option.value}
                  disabled={busy}
                  onClick={() => update("type", option.value)}
                  className={cn(
                    "rounded-xl border px-3 text-sm font-medium transition-colors duration-150",
                    form.type === option.value
                      ? "border-primary bg-primary-soft text-primary"
                      : "border-border text-text-secondary hover:border-primary/40",
                  )}
                >
                  {option.label}
                </Button>
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

    </Modal>
  );
}

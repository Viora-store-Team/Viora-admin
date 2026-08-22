"use client";

import { useState } from "react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Toggle from "@/components/ui/Toggle";
import { uploadMany } from "@/lib/api";
import type { Banner, BannerPayload } from "@/lib/admin/types";
import { t } from "@/lib/strings";

interface BannerFormDialogProps {
  /** null = مغلق · كائن فاضي = إعلان جديد · إعلان = تعديل */
  banner: Banner | "new" | null;
  loading?: boolean;
  serverErrors?: Record<string, string>;
  onSubmit: (payload: BannerPayload) => void;
  onCancel: () => void;
}

const EMPTY: BannerPayload = {
  title: "",
  imageUrl: "",
  linkUrl: null,
  position: 1,
  isActive: true,
  startsAt: null,
  endsAt: null,
};

export default function BannerFormDialog({
  banner,
  loading = false,
  serverErrors,
  onSubmit,
  onCancel,
}: BannerFormDialogProps) {
  const [form, setForm] = useState<BannerPayload>(EMPTY);
  const [touched, setTouched] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");

  const [last, setLast] = useState(banner);
  if (last !== banner) {
    setLast(banner);
    setTouched(false);
    setUploadError("");
    setForm(
      banner && banner !== "new"
        ? {
            title: banner.title,
            imageUrl: banner.imageUrl,
            linkUrl: banner.linkUrl,
            position: banner.position,
            isActive: banner.isActive,
            startsAt: banner.startsAt,
            endsAt: banner.endsAt,
          }
        : EMPTY,
    );
  }

  if (!banner) return null;

  const patch = (next: Partial<BannerPayload>) =>
    setForm((prev) => ({ ...prev, ...next }));

  const titleInvalid = form.title.trim() === "";
  const imageInvalid = form.imageUrl.trim() === "";
  const invalid = titleInvalid || imageInvalid;
  const busy = loading || uploading;

  /** يستخدم uploadMany القائمة — نفس مسار POST /uploads تبع صور المنتجات */
  const pickFile = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    setUploading(true);
    setUploadError("");

    const result = await uploadMany([files[0]]);
    setUploading(false);

    if (result.urls[0]) {
      patch({ imageUrl: result.urls[0] });
      return;
    }
    setUploadError(result.failed[0]?.message ?? t.errors.genericTitle);
  };

  const submit = () => {
    setTouched(true);
    if (invalid) return;
    onSubmit({ ...form, title: form.title.trim() });
  };

  const titleId = "banner-dialog-title";

  return (
    <>
      <button
        type="button"
        aria-label={t.common.close}
        onClick={onCancel}
        disabled={busy}
        className="fixed inset-0 z-40 bg-black/25 backdrop-blur-[1px]"
      />

      <div className="pointer-events-none fixed inset-0 z-50 grid place-items-center p-4">
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          className="pointer-events-auto max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-2xl bg-surface p-6 shadow-2xl"
        >
          <h2 id={titleId} className="text-base font-extrabold text-heading">
            {banner === "new"
              ? t.admin.content.newBanner
              : t.admin.content.editBanner}
          </h2>

          <div className="mt-5 space-y-4">
            <Input
              id="banner-title"
              label={t.admin.content.bannerTitle}
              value={form.title}
              onChange={(value) => patch({ title: value })}
              disabled={busy}
              required
              error={
                (touched && titleInvalid
                  ? t.admin.content.bannerTitleRequired
                  : undefined) ?? serverErrors?.title
              }
            />

            <Input
              id="banner-image"
              label={t.admin.content.bannerImage}
              value={form.imageUrl}
              onChange={(value) => patch({ imageUrl: value })}
              disabled={busy}
              dir="ltr"
              required
              error={
                uploadError ||
                ((touched && imageInvalid
                  ? t.admin.content.bannerImageRequired
                  : undefined) ??
                  serverErrors?.imageUrl)
              }
            />

            <input
              id="banner-file"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              disabled={busy}
              onChange={(e) => pickFile(e.target.files)}
              className="block w-full text-xs text-text-secondary file:me-3 file:rounded-lg file:border-0 file:bg-field-bg file:px-3 file:py-2 file:text-xs file:font-bold file:text-field-label"
            />

            {form.imageUrl && (
              // <img> عادي زي باقي المشروع — الرابط بيجي من رفع المستخدم
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={form.imageUrl}
                alt=""
                className="h-28 w-full rounded-xl border border-border object-cover"
              />
            )}

            <Input
              id="banner-link"
              label={t.admin.content.bannerLink}
              placeholder={t.admin.content.bannerLinkPlaceholder}
              value={form.linkUrl ?? ""}
              onChange={(value) => patch({ linkUrl: value || null })}
              disabled={busy}
              dir="ltr"
            />

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Input
                id="banner-position"
                label={t.admin.content.bannerPosition}
                type="number"
                value={String(form.position)}
                onChange={(value) => patch({ position: Number(value) || 1 })}
                disabled={busy}
              />
              <Input
                id="banner-starts"
                label={t.admin.content.bannerStarts}
                type="date"
                value={form.startsAt ?? ""}
                onChange={(value) => patch({ startsAt: value || null })}
                disabled={busy}
              />
              <Input
                id="banner-ends"
                label={t.admin.content.bannerEnds}
                type="date"
                value={form.endsAt ?? ""}
                onChange={(value) => patch({ endsAt: value || null })}
                disabled={busy}
              />
            </div>

            <Toggle
              checked={form.isActive}
              onChange={(checked) => patch({ isActive: checked })}
              label={t.admin.content.bannerActive}
              disabled={busy}
            />
          </div>

          <div className="mt-6 flex flex-wrap justify-end gap-2">
            <Button variant="secondary" onClick={onCancel} disabled={busy}>
              {t.common.cancel}
            </Button>
            <Button onClick={submit} disabled={busy || (touched && invalid)}>
              {busy ? t.common.saving : t.common.save}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}

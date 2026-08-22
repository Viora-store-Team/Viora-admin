"use client";

import { useState } from "react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import {
  ADMIN_LIMITS,
  SIZE_GROUPS,
  type CategoryPayload,
  type SizeGroup,
} from "@/lib/admin/types";
import { t } from "@/lib/strings";

/**
 * الوضع بيحدّد الحقول المعروضة:
 * - `root`  إنشاء تصنيف رئيسي (بلا sizeGroup — بيجي من الأبناء)
 * - `child` إنشاء تصنيف فرعي تحت parentId (sizeGroup **إلزامي**)
 * - `edit`  تعديل الاسم والصورة بس
 */
export type CategoryFormMode =
  | { kind: "root" }
  | { kind: "child"; parentId: number; parentName: string }
  | { kind: "edit"; id: number; name: string; imageUrl: string | null };

const SIZE_GROUP_OPTIONS = SIZE_GROUPS.map((group) => ({
  value: group,
  label: t.admin.sizeGroups[group],
}));

interface CategoryFormDialogProps {
  mode: CategoryFormMode | null;
  loading?: boolean;
  /** أخطاء حقول راجعة من السيرفر (400) */
  serverErrors?: Record<string, string>;
  onSubmit: (payload: CategoryPayload) => void;
  onCancel: () => void;
}

export default function CategoryFormDialog({
  mode,
  loading = false,
  serverErrors,
  onSubmit,
  onCancel,
}: CategoryFormDialogProps) {
  const [name, setName] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [sizeGroup, setSizeGroup] = useState("");
  const [touched, setTouched] = useState(false);

  /*
    تعبئة/تصفير الحقول عند تغيّر الوضع — تعديل حالة أثناء الرندر، نفس نمط
    AppShell. بلاها بيضل اسم التصنيف السابق مكتوب لما نفتح الحوار لتصنيف ثاني.
  */
  const [lastMode, setLastMode] = useState(mode);
  if (lastMode !== mode) {
    setLastMode(mode);
    setTouched(false);
    setName(mode?.kind === "edit" ? mode.name : "");
    setImageUrl(mode?.kind === "edit" ? (mode.imageUrl ?? "") : "");
    setSizeGroup("");
  }

  if (!mode) return null;

  const trimmed = name.trim();
  const nameInvalid =
    trimmed.length < ADMIN_LIMITS.categoryNameMin ||
    trimmed.length > ADMIN_LIMITS.categoryNameMax;
  const needsSizeGroup = mode.kind === "child";
  const sizeGroupInvalid = needsSizeGroup && sizeGroup === "";
  const invalid = nameInvalid || sizeGroupInvalid;

  const title =
    mode.kind === "edit"
      ? t.admin.categories.editRoot
      : mode.kind === "child"
        ? t.admin.categories.newChild
        : t.admin.categories.newRoot;

  const submit = () => {
    setTouched(true);
    if (invalid) return;

    onSubmit({
      name: trimmed,
      imageUrl: imageUrl.trim() || null,
      ...(mode.kind === "child"
        ? { parentId: mode.parentId, sizeGroup: sizeGroup as SizeGroup }
        : {}),
    });
  };

  const titleId = "category-dialog-title";

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

          {mode.kind === "child" && (
            <p className="mt-1 text-sm text-text-secondary">{mode.parentName}</p>
          )}

          <div className="mt-5 space-y-4">
            <Input
              id="category-name"
              label={t.admin.categories.name}
              placeholder={t.admin.categories.namePlaceholder}
              value={name}
              onChange={setName}
              disabled={loading}
              required
              error={
                (touched && nameInvalid
                  ? t.admin.categories.nameRequired
                  : undefined) ?? serverErrors?.name
              }
            />

            <Input
              id="category-image"
              label={t.admin.categories.imageUrl}
              placeholder={t.admin.categories.imageUrlPlaceholder}
              value={imageUrl}
              onChange={setImageUrl}
              disabled={loading}
              dir="ltr"
              error={serverErrors?.imageUrl}
            />

            {needsSizeGroup && (
              <div>
                <Select
                  id="category-size-group"
                  label={t.admin.categories.sizeGroup}
                  placeholder={t.admin.categories.sizeGroupPlaceholder}
                  value={sizeGroup}
                  onChange={setSizeGroup}
                  options={SIZE_GROUP_OPTIONS}
                  disabled={loading}
                  required
                  error={
                    (touched && sizeGroupInvalid
                      ? t.admin.categories.sizeGroupRequired
                      : undefined) ?? serverErrors?.sizeGroup
                  }
                />
                {/*
                  ⚠️ sizeGroup بيقود منظومة المقاسات كلها بالمنتجات — بيحدّد
                  شو بيرجّع GET /sizes وبينبني عليه محرّر التركيبات. ما بينعدّل
                  بعد الإنشاء لأن تغييره بيبطّل كل variantSizeId تحت التصنيف.
                */}
                <p className="mt-1.5 text-xs leading-relaxed text-text-secondary">
                  {t.admin.categories.sizeGroupHint}
                </p>
              </div>
            )}
          </div>

          <div className="mt-6 flex flex-wrap justify-end gap-2">
            <Button variant="secondary" onClick={onCancel} disabled={loading}>
              {t.common.cancel}
            </Button>
            <Button onClick={submit} disabled={loading || (touched && invalid)}>
              {loading ? t.common.saving : t.common.save}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}

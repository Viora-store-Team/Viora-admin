"use client";

import { useRef, useState } from "react";
import { Trash2, Upload } from "lucide-react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Spinner from "@/components/ui/Spinner";
import { uploadMany } from "@/lib/api";
import { cn } from "@/lib/cn";
import {
  ADMIN_LIMITS,
  SIZE_GROUPS,
  type AdminCategoryNode,
  type CategoryPayload,
  type CategoryUpdatePayload,
  type SizeGroup,
} from "@/lib/admin/types";
import { t } from "@/lib/strings";

/**
 * الوضع بيحدّد الحقول المعروضة:
 * - `root`  إنشاء تصنيف رئيسي (بلا sizeGroup — السيرفر بيرفضه على الجذر)
 * - `child` إنشاء تصنيف فرعي تحت parentId (sizeGroup **إلزامي**)
 * - `edit`  تعديل — الاسم والصورة والترتيب. بلا sizeGroup (شوف تحت).
 */
export type CategoryFormMode =
  | { kind: "root" }
  | { kind: "child"; parentId: number; parentName: string }
  | { kind: "edit"; node: AdminCategoryNode };

const SIZE_GROUP_OPTIONS = SIZE_GROUPS.map((group) => ({
  value: group,
  label: t.admin.sizeGroups[group],
}));

const SORT_MIN = 0;
const SORT_MAX = 9999;

interface CategoryFormDialogProps {
  mode: CategoryFormMode | null;
  loading?: boolean;
  /** أخطاء حقول راجعة من السيرفر (400) */
  serverErrors?: Record<string, string>;
  onCreate: (payload: CategoryPayload) => void;
  onUpdate: (id: number, payload: CategoryUpdatePayload) => void;
  onCancel: () => void;
}

export default function CategoryFormDialog({
  mode,
  loading = false,
  serverErrors,
  onCreate,
  onUpdate,
  onCancel,
}: CategoryFormDialogProps) {
  const [name, setName] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [sizeGroup, setSizeGroup] = useState("");
  const [sortOrder, setSortOrder] = useState("");
  const [touched, setTouched] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [isDragging, setIsDragging] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  /*
    تعبئة/تصفير الحقول عند تغيّر الوضع — تعديل حالة أثناء الرندر، نفس نمط
    AppShell. بلاها بيضل اسم التصنيف السابق مكتوب لما نفتح الحوار لتصنيف ثاني.
  */
  const [lastMode, setLastMode] = useState(mode);
  if (lastMode !== mode) {
    setLastMode(mode);
    setTouched(false);
    setUploadError("");
    setIsDragging(false);
    setName(mode?.kind === "edit" ? mode.node.name : "");
    setImageUrl(mode?.kind === "edit" ? (mode.node.imageUrl ?? "") : "");
    setSortOrder(mode?.kind === "edit" ? String(mode.node.sortOrder) : "");
    setSizeGroup("");
  }

  if (!mode) return null;

  const trimmed = name.trim();
  const nameInvalid =
    trimmed.length < ADMIN_LIMITS.categoryNameMin ||
    trimmed.length > ADMIN_LIMITS.categoryNameMax;

  const needsSizeGroup = mode.kind === "child";
  const sizeGroupInvalid = needsSizeGroup && sizeGroup === "";

  /* الترتيب اختياري — فاضي يعني «ما تبعثه». لو انكتب لازم يكون رقم بالمدى */
  const sortTrimmed = sortOrder.trim();
  const sortNumber = Number(sortTrimmed);
  const sortInvalid =
    sortTrimmed !== "" &&
    (!Number.isInteger(sortNumber) ||
      sortNumber < SORT_MIN ||
      sortNumber > SORT_MAX);

  const invalid = nameInvalid || sizeGroupInvalid || sortInvalid;
  const busy = loading || uploading;

  /** رفع الصورة عبر مسار POST /uploads الموحد */
  const pickFile = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    setUploading(true);
    setUploadError("");

    const result = await uploadMany([files[0]]);
    setUploading(false);

    if (result.urls[0]) {
      setImageUrl(result.urls[0]);
      return;
    }
    setUploadError(result.failed[0]?.message ?? t.errors.genericTitle);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (busy) return;
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      pickFile(e.dataTransfer.files);
    }
  };

  const title =
    mode.kind === "edit"
      ? t.admin.categories.editTitle
      : mode.kind === "child"
        ? t.admin.categories.newChild
        : t.admin.categories.newRoot;

  const submit = () => {
    setTouched(true);
    if (invalid) return;

    const sortValue = sortTrimmed === "" ? undefined : sortNumber;

    if (mode.kind === "edit") {
      onUpdate(mode.node.id, {
        name: trimmed,
        imageUrl: imageUrl.trim() || null,
        sortOrder: sortValue,
      });
      return;
    }

    onCreate({
      name: trimmed,
      imageUrl: imageUrl.trim() || null,
      sortOrder: sortValue,
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
        disabled={busy}
        className="fixed inset-0 z-40 bg-black/25 backdrop-blur-[1px]"
      />

      <div className="pointer-events-none fixed inset-0 z-50 grid place-items-center p-4">
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          className="pointer-events-auto max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-2xl bg-surface p-6 shadow-2xl"
        >
          <h2 id={titleId} className="text-base font-extrabold text-heading">
            {title}
          </h2>

          {mode.kind === "child" && (
            <p className="mt-1 text-sm text-text-secondary">{mode.parentName}</p>
          )}

          {/* الـslug ثابت بعد الإنشاء — بينعرض بالتعديل عشان ما يتفاجأ
              المشرف إنه ما تغيّر مع إعادة التسمية */}
          {mode.kind === "edit" && (
            <p className="ltr-nums mt-1 text-sm text-text-secondary">
              {mode.node.slug}
            </p>
          )}

          <div className="mt-5 space-y-4">
            <Input
              id="category-name"
              label={t.admin.categories.name}
              placeholder={t.admin.categories.namePlaceholder}
              value={name}
              onChange={setName}
              disabled={busy}
              required
              error={
                (touched && nameInvalid
                  ? t.admin.categories.nameRequired
                  : undefined) ?? serverErrors?.name
              }
            />

            {/* حقل رفع الصورة */}
            <div>
              <label className="block text-xs font-bold text-field-label mb-1.5">
                {t.admin.categories.image}
              </label>

              <input
                ref={fileInputRef}
                id="category-file"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                disabled={busy}
                onChange={(e) => pickFile(e.target.files)}
                className="hidden"
              />

              {imageUrl ? (
                <div className="flex items-center gap-3 rounded-xl border border-border bg-field-bg/40 p-2.5">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={imageUrl}
                    alt=""
                    className="size-16 shrink-0 rounded-lg border border-border object-cover bg-surface"
                  />
                  <div className="flex flex-1 flex-col gap-1 min-w-0">
                    <p className="truncate text-xs font-medium text-heading dir-ltr text-left">
                      {imageUrl.split("/").pop()}
                    </p>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={busy}
                        className="text-xs font-bold text-primary hover:underline"
                      >
                        {t.admin.categories.changeImage}
                      </button>
                      <span className="text-border">|</span>
                      <button
                        type="button"
                        onClick={() => {
                          setImageUrl("");
                          setUploadError("");
                        }}
                        disabled={busy}
                        className="inline-flex items-center gap-1 text-xs font-bold text-danger hover:underline"
                      >
                        <Trash2 className="size-3" aria-hidden="true" />
                        {t.admin.categories.removeImage}
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    if (!busy) setIsDragging(true);
                  }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleDrop}
                  onClick={() => !busy && fileInputRef.current?.click()}
                  className={cn(
                    "flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-4 text-center cursor-pointer transition",
                    isDragging
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50 hover:bg-field-bg/60 bg-field-bg/30",
                    busy && "pointer-events-none opacity-60",
                  )}
                >
                  {uploading ? (
                    <div className="flex flex-col items-center gap-2 py-2">
                      <Spinner variant="inline" className="size-5" />
                      <span className="text-xs font-medium text-text-secondary">
                        {t.admin.categories.uploadingImage}
                      </span>
                    </div>
                  ) : (
                    <>
                      <div className="grid size-9 place-items-center rounded-lg bg-surface text-text-secondary border border-border shadow-2xs">
                        <Upload className="size-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-heading">
                          {t.admin.categories.uploadImage}
                        </p>
                        <p className="mt-0.5 text-[11px] text-text-secondary">
                          {t.admin.categories.imageHint}
                        </p>
                      </div>
                    </>
                  )}
                </div>
              )}

              {(uploadError || serverErrors?.imageUrl) && (
                <p className="mt-1.5 text-xs text-danger">
                  {uploadError || serverErrors?.imageUrl}
                </p>
              )}
            </div>

            <div>
              <Input
                id="category-sort"
                label={t.admin.categories.sortOrder}
                value={sortOrder}
                onChange={setSortOrder}
                disabled={busy}
                dir="ltr"
                inputMode="numeric"
                error={
                  (touched && sortInvalid
                    ? t.admin.categories.sortOrderInvalid
                    : undefined) ?? serverErrors?.sortOrder
                }
              />
              <p className="mt-1.5 text-xs text-text-secondary">
                {t.admin.categories.sortOrderHint}
              </p>
            </div>

            {needsSizeGroup && (
              <div>
                <Select
                  id="category-size-group"
                  label={t.admin.categories.sizeGroup}
                  placeholder={t.admin.categories.sizeGroupPlaceholder}
                  value={sizeGroup}
                  onChange={setSizeGroup}
                  options={SIZE_GROUP_OPTIONS}
                  disabled={busy}
                  required
                  error={
                    (touched && sizeGroupInvalid
                      ? t.admin.categories.sizeGroupRequired
                      : undefined) ?? serverErrors?.sizeGroup
                  }
                />
                {/*
                  ⚠️ sizeGroup بيقود منظومة المقاسات كلها بالمنتجات — بيحدّد
                  شو بيرجّع GET /sizes وبينبني عليه محرّر التركيبات. مستثنى من
                  التعديل: على الجذر السيرفر بيرفضه صراحة، وعلى الفرعي تغييره
                  بيبطّل كل variantSizeId تحت التصنيف.
                */}
                <p className="mt-1.5 text-xs leading-relaxed text-text-secondary">
                  {t.admin.categories.sizeGroupHint}
                </p>
              </div>
            )}
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

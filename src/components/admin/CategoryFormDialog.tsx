"use client";
import { useRef, useState } from "react";
import { Trash2, Upload } from "lucide-react";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import Input from "@/components/ui/Input";
import Spinner from "@/components/ui/Spinner";
import CategorySizesPicker, {
  EMPTY_PICKER,
  isPickerValid,
  toSizesPayload,
  type PickerValue,
} from "@/components/admin/CategorySizesPicker";
import { uploadMany } from "@/lib/api";
import { thumbUrl } from "@/lib/media-upload";
import { cn } from "@/lib/cn";
import {
  ADMIN_LIMITS,
  type AdminCategoryNode,
  type CategoryPayload,
  type CategorySizesPayload,
  type CategoryUpdatePayload,
} from "@/lib/admin/types";
import Toggle from "@/components/ui/Toggle";
import { t } from "@/lib/strings";

/**
 * الوضع بيحدّد الحقول المعروضة:
 * - `root`  إنشاء تصنيف رئيسي (بلا مقاسات — السيرفر بيرفضها على الجذر)
 * - `child` إنشاء تصنيف فرعي تحت parentId (مقاسات **إلزامية**)
 * - `edit`  تعديل — الاسم والصورة والترتيب **والمقاسات للفرعي**.
 */
export type CategoryFormMode =
  | { kind: "root" }
  | { kind: "child"; parentId: number; parentName: string }
  | { kind: "edit"; node: AdminCategoryNode };

const SORT_MIN = 0;
const SORT_MAX = 9999;

interface CategoryFormDialogProps {
  mode: CategoryFormMode | null;
  loading?: boolean;
  /** أخطاء حقول راجعة من السيرفر (400) */
  serverErrors?: Record<string, string>;
  onCreate: (payload: CategoryPayload) => void;
  /** sizes: undefined = ما تغيّرت (الجذر أو ما انلمست) */
  onUpdate: (id: number, payload: CategoryUpdatePayload, sizes?: CategorySizesPayload) => void;
  onCancel: () => void;
}

/** المقاسات تغيّرت فعلاً عن الحالية؟ (نفس الترتيب مهم) */
function sizesChanged(node: AdminCategoryNode, value: PickerValue): boolean {
  const currentNoSizes = Boolean(node.noSizes);
  if (currentNoSizes !== value.noSizes) return true;
  if (value.noSizes) return false;
  const currentIds = (node.sizes ?? []).map((s) => s.id);
  return (
    currentIds.length !== value.sizeIds.length ||
    currentIds.some((id, index) => id !== value.sizeIds[index])
  );
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
  const [sizes, setSizes] = useState<PickerValue>(EMPTY_PICKER);
  const [noColors, setNoColors] = useState(false);
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
    setNoColors(mode?.kind === "edit" ? Boolean(mode.node.noColors) : false);
    setSizes(
      mode?.kind === "edit"
        ? { noSizes: Boolean(mode.node.noSizes), sizeIds: mode.node.noSizes ? [] : (mode.node.sizes ?? []).map((s) => s.id) }
        : EMPTY_PICKER,
    );
  }

  if (!mode) return null;

  const trimmed = name.trim();
  const nameInvalid =
    trimmed.length < ADMIN_LIMITS.categoryNameMin ||
    trimmed.length > ADMIN_LIMITS.categoryNameMax;

  /* مقاسات الفرعي: عند إنشائه، وعند تعديله (الرئيسي ما إله مقاسات) */
  const needsSizes =
    mode.kind === "child" || (mode.kind === "edit" && mode.node.parentId !== null);
  const sizesInvalid = needsSizes && !isPickerValid(sizes);

  /* الترتيب اختياري — فاضي يعني «ما تبعثه». لو انكتب لازم يكون رقم بالمدى */
  const sortTrimmed = sortOrder.trim();
  const sortNumber = Number(sortTrimmed);
  const sortInvalid =
    sortTrimmed !== "" &&
    (!Number.isInteger(sortNumber) ||
      sortNumber < SORT_MIN ||
      sortNumber > SORT_MAX);

  const invalid = nameInvalid || sizesInvalid || sortInvalid;
  const busy = loading || uploading;

  /** رفع الصورة مباشرة بتذكرة موقّعة (uploadMany) */
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
      onUpdate(
        mode.node.id,
        {
          name: trimmed,
          imageUrl: imageUrl.trim() || null,
          sortOrder: sortValue,
          ...(needsSizes && noColors !== Boolean(mode.node.noColors) ? { noColors } : {}),
        },
        needsSizes && sizesChanged(mode.node, sizes) ? toSizesPayload(sizes) : undefined,
      );
      return;
    }

    onCreate({
      name: trimmed,
      imageUrl: imageUrl.trim() || null,
      sortOrder: sortValue,
      ...(mode.kind === "child"
        ? { parentId: mode.parentId, ...toSizesPayload(sizes), noColors }
        : {}),
    });
  };

  // الـslug ثابت بعد الإنشاء — بينعرض بالتعديل عشان ما يتفاجأ
  // المشرف إنه ما تغيّر مع إعادة التسمية.
  return (
    <Modal open={true} onClose={() => { if (!busy) onCancel(); }} closeOnBackdrop={!busy}
      title={title} labelledById="category-dialog-title"
      description={mode.kind === "child"
        ? <p className="mt-1 text-sm text-text-secondary">{mode.parentName}</p>
        : mode.kind === "edit"
          ? (
            <p className="ltr-nums mt-1 text-sm text-text-secondary">
              {mode.node.slug}
            </p>
          )
          : undefined}
      footer={
        <>
          <Button variant="secondary" onClick={onCancel} disabled={busy}>
            {t.common.cancel}
          </Button>
          <Button onClick={submit} disabled={busy || (touched && invalid)}>
            {busy ? t.common.saving : t.common.save}
          </Button>
        </>
      }>
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
              <label className="block text-xs font-bold text-heading mb-1.5">
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
                <div className="flex items-center gap-3 rounded-xl border border-border bg-surface-muted/40 p-2.5">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={thumbUrl(imageUrl, 128)}
                    alt=""
                    className="size-16 shrink-0 rounded-lg border border-border object-cover bg-surface"
                  />
                  <div className="flex flex-1 flex-col gap-1 min-w-0">
                    <p className="truncate text-xs font-medium text-heading dir-ltr text-left">
                      {imageUrl.split("/").pop()}
                    </p>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={busy}
                        className="text-xs font-bold text-primary hover:underline"
                      >
                        {t.admin.categories.changeImage}
                      </Button>
                      <span className="text-border">|</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setImageUrl("");
                          setUploadError("");
                        }}
                        disabled={busy}
                        className="inline-flex items-center gap-1 text-xs font-bold text-danger hover:underline"
                      >
                        <Trash2 className="size-3" aria-hidden="true" />
                        {t.admin.categories.removeImage}
                      </Button>
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
                      : "border-border hover:border-primary/50 hover:bg-surface-muted/60 bg-surface-muted/30",
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

            {needsSizes && (
              <div>
                <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-surface-muted/40 px-3 py-2.5">
                  <div>
                    <p className="text-xs font-bold text-heading">{t.admin.categories.noColors}</p>
                    <p className="text-[11px] text-text-secondary">{t.admin.categories.noColorsHint}</p>
                  </div>
                  <Toggle
                    checked={noColors}
                    onChange={setNoColors}
                    label={t.admin.categories.noColors}
                    disabled={busy}
                  />
                </div>
                {serverErrors?.noColors && (
                  <p role="alert" className="mt-1.5 text-xs leading-relaxed text-danger">
                    {serverErrors.noColors}
                  </p>
                )}
              </div>
            )}

            {needsSizes && (
              <CategorySizesPicker
                value={sizes}
                onChange={setSizes}
                disabled={busy}
                error={
                  (touched && sizesInvalid ? t.admin.categories.sizesRequired : undefined) ??
                  serverErrors?.sizeIds ??
                  serverErrors?.noSizes
                }
              />
            )}
          </div>

    </Modal>
  );
}

"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Toggle from "@/components/ui/Toggle";
import type {
  FeaturedCollection,
  FeaturedCollectionPayload,
} from "@/lib/admin/types";

interface FeaturedCollectionDialogProps {
  open: boolean;
  collection: FeaturedCollection | "new" | null;
  loading: boolean;
  onSave: (payload: FeaturedCollectionPayload) => void;
  onClose: () => void;
}

export default function FeaturedCollectionDialog({
  open,
  collection,
  loading,
  onSave,
  onClose,
}: FeaturedCollectionDialogProps) {
  const isNew = collection === "new";
  const item = typeof collection === "object" ? collection : null;

  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [badge, setBadge] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [sortOrder, setSortOrder] = useState("1");
  const [error, setError] = useState("");

  useEffect(() => {
    if (item) {
      setTitle(item.title);
      setSlug(item.slug);
      setSubtitle(item.subtitle);
      setBadge(item.badge || "");
      setImageUrl(item.imageUrl || "");
      setIsActive(item.isActive);
      setSortOrder(String(item.sortOrder));
    } else {
      setTitle("");
      setSlug("");
      setSubtitle("");
      setBadge("");
      setImageUrl("");
      setIsActive(true);
      setSortOrder("1");
    }
    setError("");
  }, [item, open]);

  if (!open) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError("يرجى إدخال عنوان المجموعة");
      return;
    }

    const orderNum = parseInt(sortOrder, 10);
    const validOrder = isNaN(orderNum) ? 1 : Math.max(0, orderNum);

    onSave({
      title: title.trim(),
      slug: slug.trim() || title.trim().toLowerCase().replace(/\s+/g, "-"),
      subtitle: subtitle.trim(),
      badge: badge.trim() || null,
      imageUrl: imageUrl.trim() || null,
      isActive,
      sortOrder: validOrder,
    });
  };

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/50 backdrop-blur-xs transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        role="dialog"
        aria-modal="true"
        className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto"
      >
        <div
          className="w-full max-w-lg rounded-2xl border border-border bg-surface p-6 shadow-xl my-8"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between border-b border-border pb-3">
            <h2 className="text-base font-bold text-heading">
              {isNew ? "إضافة مجموعة مميزة جديدة" : "تعديل المجموعة المميزة"}
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="grid size-8 place-items-center rounded-lg text-text-secondary hover:bg-field-bg hover:text-heading"
              aria-label="إغلاق"
            >
              <X className="size-4" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-4">
            {error && (
              <div className="rounded-xl bg-danger-soft p-3 text-xs font-semibold text-danger">
                {error}
              </div>
            )}

            <Input
              id="collection-title"
              label="عنوان المجموعة"
              placeholder="مثال: تشكيلة العيد، إطلالات العمل والجامعة"
              value={title}
              onChange={(val) => {
                setTitle(val);
                if (!item && !slug) {
                  setSlug(val.trim().toLowerCase().replace(/\s+/g, "-"));
                }
              }}
              disabled={loading}
              required
            />

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input
                id="collection-slug"
                label="الرابط الدائم (Slug)"
                placeholder="مثال: eid-collection"
                value={slug}
                onChange={setSlug}
                disabled={loading}
                dir="ltr"
              />

              <Input
                id="collection-badge"
                label="الشارة الترويجية (Badge)"
                placeholder="مثال: الأكثر طلباً، حصري، موسمي"
                value={badge}
                onChange={setBadge}
                disabled={loading}
              />
            </div>

            <Input
              id="collection-subtitle"
              label="الوصف المختصر"
              placeholder="نبذة تظهر تحت عنوان المجموعة في الصفحة الرئيسية..."
              value={subtitle}
              onChange={setSubtitle}
              multiline
              rows={2}
              disabled={loading}
            />

            <Input
              id="collection-image"
              label="رابط صورة الغلاف"
              placeholder="https://images.unsplash.com/..."
              value={imageUrl}
              onChange={setImageUrl}
              disabled={loading}
              dir="ltr"
            />

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input
                id="collection-sort"
                type="number"
                label="ترتيب العرض"
                value={sortOrder}
                onChange={setSortOrder}
                disabled={loading}
                min={0}
              />
            </div>

            <div className="flex items-center justify-between rounded-2xl border border-border bg-field-bg p-3.5">
              <div>
                <p className="text-xs font-bold text-heading">تفعيل المجموعة</p>
                <p className="text-[11px] text-text-secondary">
                  إظهار هذه المجموعة في الصفحة الرئيسية وقائمة المجموعات
                </p>
              </div>
              <Toggle
                label="تفعيل المجموعة"
                checked={isActive}
                onChange={setIsActive}
                disabled={loading}
              />
            </div>

            <div className="mt-2 flex items-center justify-end gap-2">
              <Button type="button" variant="ghost" onClick={onClose} disabled={loading}>
                إلغاء
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "جارٍ الحفظ..." : isNew ? "إضافة المجموعة" : "حفظ التعديلات"}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}

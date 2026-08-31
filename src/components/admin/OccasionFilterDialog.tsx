"use client";

import { useEffect, useState } from "react";
import {
  Activity,
  Briefcase,
  Coffee,
  Heart,
  Moon,
  PartyPopper,
  Sparkles,
  Sun,
  X,
} from "lucide-react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Toggle from "@/components/ui/Toggle";
import type {
  OccasionFilter,
  OccasionFilterPayload,
} from "@/lib/admin/types";

const ICONS = [
  { key: "sparkles", label: "بريق / سهرة", icon: Sparkles },
  { key: "briefcase", label: "حقيبة عمل / رسمي", icon: Briefcase },
  { key: "coffee", label: "قهوة / يومي كاجوال", icon: Coffee },
  { key: "heart", label: "قلب / أعراس وخطوبة", icon: Heart },
  { key: "party-popper", label: "احتفال / حفلات وتخرج", icon: PartyPopper },
  { key: "moon", label: "هلال / أعياد ومواسم", icon: Moon },
  { key: "activity", label: "نشاط / رياضي", icon: Activity },
  { key: "sun", label: "شمس / أطفال وتنكري", icon: Sun },
];

const AVAILABLE_CATEGORIES = [
  "ملابس نسائية",
  "ملابس رجالية",
  "أطفال ومحير",
  "مواليد ورضع",
  "أحذية",
  "إكسسوارات وحقائب",
  "مستحضرات التجميل والعناية",
];

interface OccasionFilterDialogProps {
  open: boolean;
  filter: OccasionFilter | "new" | null;
  loading: boolean;
  onSave: (payload: OccasionFilterPayload) => void;
  onClose: () => void;
}

export default function OccasionFilterDialog({
  open,
  filter,
  loading,
  onSave,
  onClose,
}: OccasionFilterDialogProps) {
  const isNew = filter === "new";
  const item = typeof filter === "object" ? filter : null;

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [icon, setIcon] = useState("sparkles");
  const [description, setDescription] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [isFeaturedOnHome, setIsFeaturedOnHome] = useState(false);
  const [sortOrder, setSortOrder] = useState("1");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    if (item) {
      setName(item.name);
      setSlug(item.slug);
      setIcon(item.icon);
      setDescription(item.description);
      setIsActive(item.isActive);
      setIsFeaturedOnHome(item.isFeaturedOnHome);
      setSortOrder(String(item.sortOrder));
      setSelectedCategories(item.targetCategories || []);
    } else {
      setName("");
      setSlug("");
      setIcon("sparkles");
      setDescription("");
      setIsActive(true);
      setIsFeaturedOnHome(false);
      setSortOrder("1");
      setSelectedCategories(["ملابس نسائية", "ملابس رجالية"]);
    }
    setError("");
  }, [item, open]);

  if (!open) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("يرجى إدخال اسم الفلتر/المناسبة");
      return;
    }

    const orderNum = parseInt(sortOrder, 10);
    const validOrder = isNaN(orderNum) ? 1 : Math.max(0, orderNum);

    onSave({
      name: name.trim(),
      slug: slug.trim() || name.trim().toLowerCase().replace(/\s+/g, "-"),
      icon,
      description: description.trim(),
      isActive,
      isFeaturedOnHome,
      sortOrder: validOrder,
      targetCategories: selectedCategories,
    });
  };

  const toggleCategory = (cat: string) => {
    setSelectedCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat],
    );
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
              {isNew ? "إضافة وسم / فلتر مناسبة جديد" : "تعديل فلتر المناسبة"}
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
              id="occasion-name"
              label="اسم المناسبة / الفلتر"
              placeholder="مثال: سهرة ومناسبات خاصة، إطلالات العمل"
              value={name}
              onChange={(val) => {
                setName(val);
                if (!item && !slug) {
                  setSlug(val.trim().toLowerCase().replace(/\s+/g, "-"));
                }
              }}
              disabled={loading}
              required
            />

            <Input
              id="occasion-slug"
              label="الرابط الدائم (Slug)"
              placeholder="مثال: evening-occasions"
              value={slug}
              onChange={setSlug}
              disabled={loading}
              dir="ltr"
            />

            <div>
              <label className="mb-2 block text-xs font-bold text-heading">
                الأيقونة التعبيرية
              </label>
              <div className="grid grid-cols-4 gap-2">
                {ICONS.map((ic) => {
                  const IconComp = ic.icon;
                  const selected = icon === ic.key;
                  return (
                    <button
                      type="button"
                      key={ic.key}
                      onClick={() => setIcon(ic.key)}
                      className={`flex flex-col items-center gap-1.5 rounded-xl border p-2.5 text-xs transition-colors ${
                        selected
                          ? "border-primary bg-primary-soft text-primary font-bold shadow-xs"
                          : "border-border bg-surface text-text-secondary hover:border-text-secondary/40"
                      }`}
                    >
                      <IconComp className="size-5" />
                      <span className="truncate text-[11px]">{ic.label.split("/")[0]}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <Input
              id="occasion-desc"
              label="الوصف التوضيحي"
              placeholder="شرح بسيط للملابس والمنتجات التي يشملها هذا الفلتر..."
              value={description}
              onChange={setDescription}
              multiline
              rows={2}
              disabled={loading}
            />

            <div>
              <label className="mb-2 block text-xs font-bold text-heading">
                التصنيفات المشمولة بهذا الفلتر
              </label>
              <div className="flex flex-wrap gap-2">
                {AVAILABLE_CATEGORIES.map((cat) => {
                  const checked = selectedCategories.includes(cat);
                  return (
                    <button
                      type="button"
                      key={cat}
                      onClick={() => toggleCategory(cat)}
                      className={`rounded-xl border px-3 py-1.5 text-xs transition-all ${
                        checked
                          ? "border-primary bg-primary text-white font-bold shadow-2xs"
                          : "border-border bg-surface text-text-secondary hover:border-text-secondary/40"
                      }`}
                    >
                      {checked ? "✓ " : "+ "}
                      {cat}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input
                id="occasion-sort"
                type="number"
                label="ترتيب العرض"
                value={sortOrder}
                onChange={setSortOrder}
                disabled={loading}
                min={0}
              />
            </div>

            <div className="flex flex-col gap-3 rounded-2xl border border-border bg-field-bg p-3.5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-heading">تفعيل الفلتر</p>
                  <p className="text-[11px] text-text-secondary">
                    إظهار هذا الفلتر للزبائن في شريط الفلاتر بصفحة المنتجات
                  </p>
                </div>
                <Toggle
                  label="تفعيل الفلتر"
                  checked={isActive}
                  onChange={setIsActive}
                  disabled={loading}
                />
              </div>

              <div className="flex items-center justify-between border-t border-border/60 pt-3">
                <div>
                  <p className="text-xs font-bold text-heading">إبراز بالصفحة الرئيسية</p>
                  <p className="text-[11px] text-text-secondary">
                    عرض أيقونة المناسبة كزر وصول سريع في الرئيسية
                  </p>
                </div>
                <Toggle
                  label="إبراز بالصفحة الرئيسية"
                  checked={isFeaturedOnHome}
                  onChange={setIsFeaturedOnHome}
                  disabled={loading}
                />
              </div>
            </div>

            <div className="mt-2 flex items-center justify-end gap-2">
              <Button type="button" variant="ghost" onClick={onClose} disabled={loading}>
                إلغاء
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "جارٍ الحفظ..." : isNew ? "إضافة الفلتر" : "حفظ التعديلات"}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}

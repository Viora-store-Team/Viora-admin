"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Check,
  Eye,
  FolderHeart,
  FolderTree,
  GitBranch,
  Layers,
  Package,
  Plus,
  Sparkles,
  Tags,
} from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import { Card, CardBody } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import EmptyState from "@/components/ui/EmptyState";
import ErrorBanner from "@/components/ui/ErrorBanner";
import Spinner from "@/components/ui/Spinner";
import SearchInput from "@/components/ui/SearchInput";
import Tabs, { type TabItem } from "@/components/ui/Tabs";
import CategoryTree from "@/components/admin/CategoryTree";
import CategoryFormDialog, {
  type CategoryFormMode,
} from "@/components/admin/CategoryFormDialog";
import CategoryDetailDialog from "@/components/admin/CategoryDetailDialog";
import OccasionFilterList from "@/components/admin/OccasionFilterList";
import OccasionFilterDialog from "@/components/admin/OccasionFilterDialog";
import OccasionDetailDialog from "@/components/admin/OccasionDetailDialog";
import FeaturedCollectionList from "@/components/admin/FeaturedCollectionList";
import FeaturedCollectionDialog from "@/components/admin/FeaturedCollectionDialog";
import {
  OFFICIAL_COLLECTIONS,
  OFFICIAL_OCCASIONS,
} from "@/lib/admin/catalogSeedData";
import {
  activateCategory,
  createCategory,
  createFeaturedCollection,
  createOccasionFilter,
  deactivateCategory,
  deleteCategory,
  deleteFeaturedCollection,
  deleteOccasionFilter,
  fetchAdminCategories,
  fetchFeaturedCollections,
  fetchOccasionFilters,
  updateCategory,
  updateFeaturedCollection,
  updateOccasionFilter,
} from "@/lib/admin/api";
import type {
  AdminCategoryNode,
  AdminCategoryRoot,
  CategoryPayload,
  CategoryUpdatePayload,
  FeaturedCollection,
  FeaturedCollectionPayload,
  OccasionFilter,
  OccasionFilterPayload,
} from "@/lib/admin/types";
import { classifyStatus } from "@/lib/apiFailure";
import type { ApiResponse } from "@/lib/api";
import { formatNumber } from "@/lib/format";
import { useFlash } from "@/lib/useFlash";
import { t } from "@/lib/strings";

const SECTION_TABS: TabItem[] = [
  { key: "catalog", label: "شجرة التصنيفات الأساسية" },
  { key: "occasions", label: "فلاتر ووسوم المناسبات" },
  { key: "collections", label: "المجموعات المميزة" },
];

const STATUS_TABS: TabItem[] = [
  { key: "all", label: t.admin.categories.allFilter },
  { key: "active", label: t.admin.categories.activeFilter },
  { key: "hidden", label: t.admin.categories.hiddenFilter },
];

/** الحوار المفتوح لتأكيد عملية */
type Pending =
  | { kind: "toggle-category"; node: AdminCategoryNode }
  | { kind: "delete-category"; node: AdminCategoryNode }
  | { kind: "delete-occasion"; item: OccasionFilter }
  | { kind: "delete-collection"; item: FeaturedCollection }
  | null;

export default function AdminCategoriesPage() {
  const [activeSection, setActiveSection] = useState("catalog");

  // بيانات التصنيفات
  const [roots, setRoots] = useState<AdminCategoryRoot[]>([]);
  // بيانات المناسبات
  const [occasions, setOccasions] = useState<OccasionFilter[]>([]);
  // بيانات المجموعات
  const [collections, setCollections] = useState<FeaturedCollection[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "hidden">("all");

  // نوافذ الحوار
  const [categoryMode, setCategoryMode] = useState<CategoryFormMode | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<{
    node: AdminCategoryNode;
    parentName?: string;
  } | null>(null);
  const [occasionDialog, setOccasionDialog] = useState<OccasionFilter | "new" | null>(null);
  const [selectedOccasion, setSelectedOccasion] = useState<OccasionFilter | null>(null);
  const [collectionDialog, setCollectionDialog] = useState<FeaturedCollection | "new" | null>(null);

  const [pending, setPending] = useState<Pending>(null);
  const [saving, setSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>();
  const [flash, showFlash] = useFlash();

  /**
   * جلب البيانات الشاملة: التصنيفات، المناسبات، المجموعات
   */
  const load = useCallback(async () => {
    const [catsRes, occRes, colRes] = await Promise.all([
      fetchAdminCategories(),
      fetchOccasionFilters(),
      fetchFeaturedCollections(),
    ]);

    let hasError = false;
    const catsData = catsRes.categories || (catsRes.data as AdminCategoryRoot[] | undefined);
    if (catsRes.success && catsData) {
      setRoots(catsData);
    } else {
      hasError = true;
    }

    const occData = occRes.occasions || (occRes.data as OccasionFilter[] | undefined);
    if (occRes.success && occData && occData.length > 0) {
      setOccasions(occData);
    } else {
      setOccasions((prev) => (prev.length > 0 ? prev : (OFFICIAL_OCCASIONS as OccasionFilter[])));
    }

    const colData = colRes.collections || (colRes.data as FeaturedCollection[] | undefined);
    if (colRes.success && colData && colData.length > 0) {
      setCollections(colData);
    } else {
      setCollections((prev) => (prev.length > 0 ? prev : (OFFICIAL_COLLECTIONS as FeaturedCollection[])));
    }

    if (!hasError) {
      setError("");
    } else {
      const failure = classifyStatus(catsRes);
      setError(
        failure.kind === "unauthorized"
          ? t.admin.common.sessionInvalid
          : failure.message,
      );
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      await load();
      if (!cancelled) setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [attempt, load]);

  const reload = useCallback(() => {
    setLoading(true);
    setAttempt((a) => a + 1);
  }, []);

  /**
   * منفّذ موحّد لعمليات الكتابة
   */
  const run = useCallback(
    async (call: () => Promise<ApiResponse>, success: string) => {
      setSaving(true);
      setError("");
      setFieldErrors(undefined);

      const res = await call();

      if (res.success) {
        setCategoryMode(null);
        setOccasionDialog(null);
        setCollectionDialog(null);
        setPending(null);
        showFlash(success);
        await load();
        setSaving(false);
        return;
      }

      setSaving(false);
      const failure = classifyStatus(res);

      if (failure.kind === "validation" && failure.errors) {
        setFieldErrors(failure.errors);
        return;
      }

      setCategoryMode(null);
      setOccasionDialog(null);
      setCollectionDialog(null);
      setPending(null);

      setError(
        failure.kind === "unauthorized"
          ? t.admin.common.sessionInvalid
          : failure.message,
      );
    },
    [load, showFlash],
  );

  // عمليات التصنيفات
  const createCat = (payload: CategoryPayload) =>
    run(() => createCategory(payload), t.admin.categories.created);

  const updateCat = (id: number, payload: CategoryUpdatePayload) =>
    run(() => updateCategory(id, payload), t.admin.categories.updated);

  // عمليات فلاتر المناسبات
  const saveOccasion = (payload: OccasionFilterPayload) => {
    if (occasionDialog === "new") {
      return run(() => createOccasionFilter(payload), "تم إضافة فلتر المناسبة بنجاح");
    }
    if (typeof occasionDialog === "object" && occasionDialog) {
      return run(
        () => updateOccasionFilter(occasionDialog.id, payload),
        "تم تعديل فلتر المناسبة بنجاح",
      );
    }
  };

  const toggleOccasion = (item: OccasionFilter) => {
    run(
      () => updateOccasionFilter(item.id, { isActive: !item.isActive }),
      item.isActive ? "تم تعطيل الفلتر" : "تم تفعيل الفلتر",
    );
  };

  const toggleOccasionFeatured = (item: OccasionFilter) => {
    run(
      () =>
        updateOccasionFilter(item.id, {
          isFeaturedOnHome: !item.isFeaturedOnHome,
        }),
      item.isFeaturedOnHome ? "تم إزالة الإبراز بالرئيسية" : "تم إبراز الفلتر بالرئيسية",
    );
  };

  // عمليات المجموعات المميزة
  const saveCollection = (payload: FeaturedCollectionPayload) => {
    if (collectionDialog === "new") {
      return run(() => createFeaturedCollection(payload), "تم إضافة المجموعة بنجاح");
    }
    if (typeof collectionDialog === "object" && collectionDialog) {
      return run(
        () => updateFeaturedCollection(collectionDialog.id, payload),
        "تم تعديل المجموعة بنجاح",
      );
    }
  };

  const toggleCollection = (item: FeaturedCollection) => {
    run(
      () => updateFeaturedCollection(item.id, { isActive: !item.isActive }),
      item.isActive ? "تم تعطيل المجموعة" : "تم تفعيل المجموعة",
    );
  };

  // إحصائيات سريعة
  const stats = useMemo(() => {
    const totalRoots = roots.length;
    let totalChildren = 0;
    let totalProducts = 0;
    let totalActive = 0;
    let totalHidden = 0;

    for (const root of roots) {
      if (root.isActive) totalActive++;
      else totalHidden++;
      totalProducts += root.productsCount || 0;
      totalChildren += root.children.length;

      for (const child of root.children) {
        if (child.isActive) totalActive++;
        else totalHidden++;
        totalProducts += child.productsCount || 0;
      }
    }

    return { totalRoots, totalChildren, totalProducts, totalActive, totalHidden };
  }, [roots]);

  const totalAllCategories = stats.totalRoots + stats.totalChildren;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t.admin.categories.title}
        subtitle="إدارة التصنيفات، فلاتر المناسبات، والمجموعات المميزة للكتالوج والصفحة الرئيسية."
        action={
          <div className="flex flex-wrap items-center gap-3">
            {flash && (
              <span
                role="status"
                className="flex items-center gap-1.5 rounded-xl bg-success-soft px-3 py-1.5 text-xs font-bold text-success shadow-xs"
              >
                <Check className="size-4" aria-hidden="true" />
                {flash}
              </span>
            )}
            {activeSection === "catalog" && (
              <Button
                onClick={() => setCategoryMode({ kind: "root" })}
                icon={<Plus className="size-4" aria-hidden="true" />}
                disabled={saving}
              >
                {t.admin.categories.addRoot}
              </Button>
            )}
            {activeSection === "occasions" && (
              <Button
                onClick={() => setOccasionDialog("new")}
                icon={<Plus className="size-4" aria-hidden="true" />}
                disabled={saving}
              >
                إضافة فلتر مناسبة
              </Button>
            )}
            {activeSection === "collections" && (
              <Button
                onClick={() => setCollectionDialog("new")}
                icon={<Plus className="size-4" aria-hidden="true" />}
                disabled={saving}
              >
                إضافة مجموعة مميزة
              </Button>
            )}
          </div>
        }
      />

      <ErrorBanner message={error} onRetry={reload} />

      {/* تبويبات الأقسام الرئيسية */}
      <Tabs
        items={SECTION_TABS}
        active={activeSection}
        onChange={(tabKey) => {
          setActiveSection(tabKey);
          setSearchQuery("");
        }}
        disabled={saving}
      />

      {/* ─── قسم شجرة التصنيفات الأساسية ─── */}
      {activeSection === "catalog" && (
        <>
          {/* بطاقات الإحصائيات العلوية */}
          {!loading && roots.length > 0 && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-4 shadow-2xs">
                <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary">
                  <Layers className="size-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-text-secondary truncate">
                    {t.admin.categories.totalRoots}
                  </p>
                  <p className="ltr-nums mt-0.5 text-xl font-extrabold text-heading">
                    {formatNumber(stats.totalRoots)}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-4 shadow-2xs">
                <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-field-bg text-heading">
                  <GitBranch className="size-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-text-secondary truncate">
                    {t.admin.categories.totalChildren}
                  </p>
                  <p className="ltr-nums mt-0.5 text-xl font-extrabold text-heading">
                    {formatNumber(stats.totalChildren)}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-4 shadow-2xs">
                <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-field-bg text-heading">
                  <Package className="size-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-text-secondary truncate">
                    {t.admin.categories.totalLinkedProducts}
                  </p>
                  <p className="ltr-nums mt-0.5 text-xl font-extrabold text-heading">
                    {formatNumber(stats.totalProducts)}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-4 shadow-2xs">
                <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-success-soft text-success">
                  <Eye className="size-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-text-secondary truncate">
                    {t.admin.categories.activeCategories}
                  </p>
                  <p className="ltr-nums mt-0.5 text-xl font-extrabold text-heading">
                    {formatNumber(stats.totalActive)}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* شريط البحث وتصفية الحالة */}
          {!loading && roots.length > 0 && (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="w-full sm:max-w-md">
                <SearchInput
                  id="categories-search"
                  value={searchQuery}
                  onChange={setSearchQuery}
                  placeholder={t.admin.categories.searchPlaceholder}
                />
              </div>

              <Tabs
                items={STATUS_TABS}
                active={statusFilter}
                onChange={(key) => setStatusFilter(key as "all" | "active" | "hidden")}
              />
            </div>
          )}

          {/* المحتوى الرئيسي للشجرة */}
          {loading ? (
            <Spinner />
          ) : roots.length === 0 ? (
            <Card className="overflow-hidden border border-border shadow-xs">
              <CardBody className="p-8">
                <EmptyState
                  icon={FolderTree}
                  title={t.admin.categories.empty}
                  hint={t.admin.categories.emptyHint}
                  action={
                    <Button
                      size="lg"
                      onClick={() => setCategoryMode({ kind: "root" })}
                      icon={<Plus className="size-5" aria-hidden="true" />}
                    >
                      {t.admin.categories.addRoot}
                    </Button>
                  }
                />
              </CardBody>
            </Card>
          ) : (
            <CategoryTree
              roots={roots}
              disabled={saving}
              searchQuery={searchQuery}
              statusFilter={statusFilter}
              onSelectNode={(node, parentName) =>
                setSelectedCategory({ node, parentName })
              }
              onAddChild={(root) =>
                setCategoryMode({ kind: "child", parentId: root.id, parentName: root.name })
              }
              onEdit={(node) => setCategoryMode({ kind: "edit", node })}
              onToggleActive={(node) => setPending({ kind: "toggle-category", node })}
              onDelete={(node) => setPending({ kind: "delete-category", node })}
            />
          )}
        </>
      )}

      {/* ─── قسم وسوم وفلاتر المناسبات ─── */}
      {activeSection === "occasions" && (
        <>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="w-full sm:max-w-md">
              <SearchInput
                id="occasions-search"
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder="ابحث باسم المناسبة، الوصف، أو الرابط..."
              />
            </div>

            <span className="text-xs font-semibold text-text-secondary">
              إجمالي الفلاتر:{" "}
              <strong className="text-heading font-extrabold">{occasions.length}</strong>
            </span>
          </div>

          {loading ? (
            <Spinner />
          ) : (
            <OccasionFilterList
              occasions={occasions}
              searchQuery={searchQuery}
              disabled={saving}
              onSelectOccasion={(item) => setSelectedOccasion(item)}
              onAddNew={() => setOccasionDialog("new")}
              onEdit={(item) => setOccasionDialog(item)}
              onToggleActive={toggleOccasion}
              onToggleFeatured={toggleOccasionFeatured}
              onDelete={(item) => setPending({ kind: "delete-occasion", item })}
            />
          )}
        </>
      )}

      {/* ─── قسم المجموعات المميزة ─── */}
      {activeSection === "collections" && (
        <>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="w-full sm:max-w-md">
              <SearchInput
                id="collections-search"
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder="ابحث بعنوان المجموعة، الوصف، أو الشارة..."
              />
            </div>

            <span className="text-xs font-semibold text-text-secondary">
              إجمالي المجموعات:{" "}
              <strong className="text-heading font-extrabold">{collections.length}</strong>
            </span>
          </div>

          {loading ? (
            <Spinner />
          ) : (
            <FeaturedCollectionList
              collections={collections}
              searchQuery={searchQuery}
              disabled={saving}
              onAddNew={() => setCollectionDialog("new")}
              onEdit={(item) => setCollectionDialog(item)}
              onToggleActive={toggleCollection}
              onDelete={(item) => setPending({ kind: "delete-collection", item })}
            />
          )}
        </>
      )}

      {/* نافذة تفاصيل التصنيف عند النقر عليه */}
      <CategoryDetailDialog
        node={selectedCategory?.node ?? null}
        parentName={selectedCategory?.parentName}
        onClose={() => setSelectedCategory(null)}
        onEdit={(node) => setCategoryMode({ kind: "edit", node })}
        onToggleActive={(node) => setPending({ kind: "toggle-category", node })}
        onDelete={(node) => setPending({ kind: "delete-category", node })}
        onAddChild={(node) =>
          setCategoryMode({ kind: "child", parentId: node.id, parentName: node.name })
        }
      />

      {/* نافذة تفاصيل فلتر المناسبة عند النقر عليه */}
      <OccasionDetailDialog
        occasion={selectedOccasion}
        onClose={() => setSelectedOccasion(null)}
        onEdit={(item) => setOccasionDialog(item)}
        onToggleActive={toggleOccasion}
        onToggleFeatured={toggleOccasionFeatured}
        onDelete={(item) => setPending({ kind: "delete-occasion", item })}
      />

      {/* نافذة إنشاء وتعديل التصنيف مع رفع الصور */}
      <CategoryFormDialog
        mode={categoryMode}
        loading={saving}
        serverErrors={fieldErrors}
        onCreate={createCat}
        onUpdate={updateCat}
        onCancel={() => setCategoryMode(null)}
      />

      {/* نافذة إضافة وتعديل فلتر المناسبة */}
      <OccasionFilterDialog
        open={occasionDialog !== null}
        filter={occasionDialog}
        loading={saving}
        onSave={saveOccasion}
        onClose={() => setOccasionDialog(null)}
      />

      {/* نافذة إضافة وتعديل المجموعة المميزة */}
      <FeaturedCollectionDialog
        open={collectionDialog !== null}
        collection={collectionDialog}
        loading={saving}
        onSave={saveCollection}
        onClose={() => setCollectionDialog(null)}
      />

      {/* نافذة تأكيد إخفاء وإظهار التصنيف */}
      <ConfirmDialog
        open={pending?.kind === "toggle-category"}
        tone={pending?.kind === "toggle-category" && pending.node.isActive ? "danger" : "primary"}
        title={
          pending?.kind === "toggle-category" && pending.node.isActive
            ? t.admin.categories.hideTitle
            : t.admin.categories.showTitle
        }
        body={
          pending?.kind === "toggle-category" && pending.node.isActive
            ? t.admin.categories.hideBody
            : t.admin.categories.showBody
        }
        confirmLabel={
          pending?.kind === "toggle-category" && pending.node.isActive
            ? t.admin.categories.hide
            : t.admin.categories.show
        }
        loading={saving}
        onConfirm={() => {
          if (pending?.kind !== "toggle-category") return;
          const { id, isActive } = pending.node;
          run(
            () => (isActive ? deactivateCategory(id) : activateCategory(id)),
            isActive ? t.admin.categories.didHide : t.admin.categories.didShow,
          );
        }}
        onCancel={() => setPending(null)}
      />

      {/* نافذة تأكيد حذف التصنيف */}
      <ConfirmDialog
        open={pending?.kind === "delete-category"}
        tone="danger"
        title={t.admin.categories.deleteTitle}
        body={t.admin.categories.deleteBody}
        confirmLabel={t.admin.categories.delete}
        loading={saving}
        onConfirm={() => {
          if (pending?.kind !== "delete-category") return;
          run(
            () => deleteCategory(pending.node.id),
            t.admin.categories.didDelete,
          );
        }}
        onCancel={() => setPending(null)}
      />

      {/* نافذة تأكيد حذف فلتر المناسبة */}
      <ConfirmDialog
        open={pending?.kind === "delete-occasion"}
        tone="danger"
        title="حذف فلتر المناسبة؟"
        body={`هل أنت متأكد من حذف فلتر "${pending?.kind === "delete-occasion" ? pending.item.name : ""}"؟`}
        confirmLabel="حذف الفلتر"
        loading={saving}
        onConfirm={() => {
          if (pending?.kind !== "delete-occasion") return;
          run(
            () => deleteOccasionFilter(pending.item.id),
            "تم حذف فلتر المناسبة بنجاح",
          );
        }}
        onCancel={() => setPending(null)}
      />

      {/* نافذة تأكيد حذف المجموعة المميزة */}
      <ConfirmDialog
        open={pending?.kind === "delete-collection"}
        tone="danger"
        title="حذف المجموعة المميزة؟"
        body={`هل أنت متأكد من حذف مجموعة "${pending?.kind === "delete-collection" ? pending.item.title : ""}"؟`}
        confirmLabel="حذف المجموعة"
        loading={saving}
        onConfirm={() => {
          if (pending?.kind !== "delete-collection") return;
          run(
            () => deleteFeaturedCollection(pending.item.id),
            "تم حذف المجموعة بنجاح",
          );
        }}
        onCancel={() => setPending(null)}
      />
    </div>
  );
}

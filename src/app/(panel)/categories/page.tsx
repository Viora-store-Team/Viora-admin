"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, Eye, FolderTree, GitBranch, Layers, Package, Plus } from "lucide-react";
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
import {
  activateCategory,
  createCategory,
  deactivateCategory,
  deleteCategory,
  fetchCategory,
  fetchAdminCategories,
  updateCategory,
  reorderCategories,
} from "@/lib/admin/api";
import type {
  AdminCategoryNode,
  AdminCategoryRoot,
  CategoryPayload,
  CategoryUpdatePayload,
} from "@/lib/admin/types";
import { classifyStatus } from "@/lib/apiFailure";
import type { ApiResponse } from "@/lib/api";
import { formatNumber } from "@/lib/format";
import { useFlash } from "@/lib/useFlash";
import { dispatchToast } from "@/lib/toast";
import { t } from "@/lib/strings";

const STATUS_TABS: TabItem[] = [
  { key: "all", label: t.admin.categories.allFilter },
  { key: "active", label: t.admin.categories.activeFilter },
  { key: "hidden", label: t.admin.categories.hiddenFilter },
];

/** الحوار المفتوح لتأكيد عملية */
type Pending =
  | { kind: "toggle-category"; node: AdminCategoryNode }
  | { kind: "delete-category"; node: AdminCategoryNode }
  | null;

export default function AdminCategoriesPage() {

  // بيانات التصنيفات
  const [roots, setRoots] = useState<AdminCategoryRoot[]>([]);

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

  const [pending, setPending] = useState<Pending>(null);
  const [saving, setSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>();
  const [flash, showFlash] = useFlash();

  /**
   * جلب شجرة التصنيفات
   */
  const load = useCallback(async () => {
    const catsRes = await fetchAdminCategories();

    let hasError = false;
    const catsData = catsRes.categories || (catsRes.data as AdminCategoryRoot[] | undefined);
    if (catsRes.success && catsData) {
      setRoots(catsData);
    } else {
      hasError = true;
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
        dispatchToast("warning", "راجعي الحقول المطلوبة ثم حاولي الحفظ من جديد.");
        return;
      }

      setCategoryMode(null);

      setPending(null);

      setError(
        failure.kind === "unauthorized"
          ? t.admin.common.sessionInvalid
          : failure.message,
      );
      dispatchToast("error", failure.kind === "unauthorized" ? t.admin.common.sessionInvalid : failure.message);
    },
    [load, showFlash],
  );

  // عمليات التصنيفات
  const createCat = (payload: CategoryPayload) =>
    run(() => createCategory(payload), t.admin.categories.created);

  const updateCat = (id: number, payload: CategoryUpdatePayload) =>
    run(() => updateCategory(id, payload), t.admin.categories.updated);

  const openCategory = async (node: AdminCategoryNode, parentName?: string) => {
    setError("");
    const res = await fetchCategory(node.id);
    if (res.success && res.category) {
      setSelectedCategory({ node: res.category, parentName });
      return;
    }
    const failure = classifyStatus(res);
    setError(failure.kind === "unauthorized" ? t.admin.common.sessionInvalid : failure.message);
    dispatchToast("error", failure.kind === "unauthorized" ? t.admin.common.sessionInvalid : failure.message);
  };

  const moveCategory = async (
    parentId: number | null,
    nodeId: number,
    direction: "up" | "down",
  ) => {
    const siblings = parentId === null
      ? roots
      : roots.find((root) => root.id === parentId)?.children ?? [];
    const index = siblings.findIndex((item) => item.id === nodeId);
    const target = direction === "up" ? index - 1 : index + 1;
    if (index < 0 || target < 0 || target >= siblings.length) return;

    const ids = siblings.map((item) => item.id);
    [ids[index], ids[target]] = [ids[target], ids[index]];
    setSaving(true);
    setError("");
    const res = await reorderCategories({ parentId, ids });
    setSaving(false);
    if (res.success) {
      showFlash("تم حفظ ترتيب التصنيفات");
      await load();
      return;
    }
    const failure = classifyStatus(res);
    setError(failure.kind === "unauthorized" ? t.admin.common.sessionInvalid : failure.message);
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

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t.admin.categories.title}
        subtitle="إدارة التصنيفات الرئيسية والفرعية للكتالوج."
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
            <Button
                onClick={() => setCategoryMode({ kind: "root" })}
                icon={<Plus className="size-4" aria-hidden="true" />}
                disabled={saving || loading || !!error}
              >
                {t.admin.categories.addRoot}
              </Button>

          </div>
        }
      />

      <ErrorBanner message={error} onRetry={reload} />

      {/* ─── قسم شجرة التصنيفات الأساسية ─── */}
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
              onSelectNode={openCategory}
              onAddChild={(root) =>
                setCategoryMode({ kind: "child", parentId: root.id, parentName: root.name })
              }
              onEdit={(node) => setCategoryMode({ kind: "edit", node })}
              onToggleActive={(node) => setPending({ kind: "toggle-category", node })}
              onDelete={(node) => setPending({ kind: "delete-category", node })}
              onMove={moveCategory}
            />
          )}
        </>

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

      {/* نافذة إنشاء وتعديل التصنيف مع رفع الصور */}
      <CategoryFormDialog
        mode={categoryMode}
        loading={saving}
        serverErrors={fieldErrors}
        onCreate={createCat}
        onUpdate={updateCat}
        onCancel={() => setCategoryMode(null)}
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

    </div>
  );
}

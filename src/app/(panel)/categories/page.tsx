"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Check,
  Eye,
  FolderTree,
  GitBranch,
  Layers,
  Package,
  Plus,
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
import {
  activateCategory,
  createCategory,
  deactivateCategory,
  deleteCategory,
  fetchAdminCategories,
  updateCategory,
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
import { t } from "@/lib/strings";

/** الحوار المفتوح لتأكيد عملية على صف واحد */
type Pending =
  | { kind: "toggle"; node: AdminCategoryNode }
  | { kind: "delete"; node: AdminCategoryNode }
  | null;

const STATUS_TABS: TabItem[] = [
  { key: "all", label: t.admin.categories.allFilter },
  { key: "active", label: t.admin.categories.activeFilter },
  { key: "hidden", label: t.admin.categories.hiddenFilter },
];

export default function AdminCategoriesPage() {
  const [roots, setRoots] = useState<AdminCategoryRoot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "hidden">("all");

  const [mode, setMode] = useState<CategoryFormMode | null>(null);
  const [pending, setPending] = useState<Pending>(null);
  const [saving, setSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>();
  const [flash, showFlash] = useFlash();

  /**
   * جلب الشجرة. مشتركة بين التحميل الأول وإعادة الجلب بعد كل كتابة
   */
  const load = useCallback(async () => {
    const res = await fetchAdminCategories();

    if (res.success && res.categories) {
      setRoots(res.categories);
      setError("");
      return;
    }

    const failure = classifyStatus(res);
    setError(
      failure.kind === "unauthorized"
        ? t.admin.common.sessionInvalid
        : failure.message,
    );
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
   * منفّذ موحّد لكل عمليات الكتابة.
   */
  const run = useCallback(
    async (call: () => Promise<ApiResponse>, success: string) => {
      setSaving(true);
      setError("");
      setFieldErrors(undefined);

      const res = await call();

      if (res.success) {
        setMode(null);
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

      setMode(null);
      setPending(null);

      setError(
        failure.kind === "unauthorized"
          ? t.admin.common.sessionInvalid
          : failure.message,
      );
    },
    [load, showFlash],
  );

  const create = (payload: CategoryPayload) =>
    run(() => createCategory(payload), t.admin.categories.created);

  const update = (id: number, payload: CategoryUpdatePayload) =>
    run(() => updateCategory(id, payload), t.admin.categories.updated);

  // إحصائيات سريعة في أعلى الصفحة
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
        subtitle={
          totalAllCategories > 0
            ? `${formatNumber(totalAllCategories)} ${t.admin.categories.count} (${formatNumber(stats.totalRoots)} رئيسي · ${formatNumber(stats.totalChildren)} فرعي)`
            : t.admin.categories.subtitle
        }
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
              onClick={() => setMode({ kind: "root" })}
              icon={<Plus className="size-4" aria-hidden="true" />}
            >
              {t.admin.categories.addRoot}
            </Button>
          </div>
        }
      />

      <ErrorBanner message={error} onRetry={reload} />

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
                  onClick={() => setMode({ kind: "root" })}
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
          onAddChild={(root) =>
            setMode({ kind: "child", parentId: root.id, parentName: root.name })
          }
          onEdit={(node) => setMode({ kind: "edit", node })}
          onToggleActive={(node) => setPending({ kind: "toggle", node })}
          onDelete={(node) => setPending({ kind: "delete", node })}
        />
      )}

      {/* نافذة إنشاء وتعديل التصنيف مع رفع الصور */}
      <CategoryFormDialog
        mode={mode}
        loading={saving}
        serverErrors={fieldErrors}
        onCreate={create}
        onUpdate={update}
        onCancel={() => setMode(null)}
      />

      {/* نافذة تأكيد الإخفاء والإظهار */}
      <ConfirmDialog
        open={pending?.kind === "toggle"}
        tone={pending?.kind === "toggle" && pending.node.isActive ? "danger" : "primary"}
        title={
          pending?.kind === "toggle" && pending.node.isActive
            ? t.admin.categories.hideTitle
            : t.admin.categories.showTitle
        }
        body={
          pending?.kind === "toggle" && pending.node.isActive
            ? t.admin.categories.hideBody
            : t.admin.categories.showBody
        }
        confirmLabel={
          pending?.kind === "toggle" && pending.node.isActive
            ? t.admin.categories.hide
            : t.admin.categories.show
        }
        loading={saving}
        onConfirm={() => {
          if (pending?.kind !== "toggle") return;
          const { id, isActive } = pending.node;
          run(
            () => (isActive ? deactivateCategory(id) : activateCategory(id)),
            isActive ? t.admin.categories.didHide : t.admin.categories.didShow,
          );
        }}
        onCancel={() => setPending(null)}
      />

      {/* نافذة تأكيد الحذف */}
      <ConfirmDialog
        open={pending?.kind === "delete"}
        tone="danger"
        title={t.admin.categories.deleteTitle}
        body={t.admin.categories.deleteBody}
        confirmLabel={t.admin.categories.delete}
        loading={saving}
        onConfirm={() => {
          if (pending?.kind !== "delete") return;
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

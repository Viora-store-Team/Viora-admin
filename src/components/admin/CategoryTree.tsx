"use client";

import { useMemo, useState } from "react";
import {
  ChevronDown,
  ChevronLeft,
  ChevronUp,
  Eye,
  EyeOff,
  FolderTree,
  Package,
  Pencil,
  Plus,
  Search,
  Store,
  Tag,
  Trash2,
} from "lucide-react";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import type {
  AdminCategoryChild,
  AdminCategoryNode,
  AdminCategoryRoot,
  SizeGroup,
} from "@/lib/admin/types";
import { formatNumber } from "@/lib/format";
import { t } from "@/lib/strings";

interface CategoryTreeProps {
  roots: AdminCategoryRoot[];
  disabled?: boolean;
  searchQuery?: string;
  statusFilter?: "all" | "active" | "hidden";
  onAddChild: (root: AdminCategoryRoot) => void;
  onEdit: (node: AdminCategoryNode) => void;
  onToggleActive: (node: AdminCategoryNode) => void;
  onDelete: (node: AdminCategoryNode) => void;
}

/** تلوين مجموعات المقاسات بشكل بصري جذاب وواضح */
function getSizeGroupBadge(group: SizeGroup | null) {
  if (!group) return null;

  const toneMap: Record<SizeGroup, "info" | "success" | "warning" | "neutral"> = {
    CLOTHING: "info",
    SHOES: "warning",
    KIDS: "success",
    ONE_SIZE: "neutral",
  };

  return (
    <Badge tone={toneMap[group] ?? "neutral"}>
      <Tag className="size-3" aria-hidden="true" />
      <span>{t.admin.sizeGroups[group] ?? group}</span>
    </Badge>
  );
}

function NodeCounters({ node }: { node: AdminCategoryNode }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {node.productsCount > 0 && (
        <span
          title={`${formatNumber(node.productsCount)} ${t.admin.categories.productsUnit}`}
          className="inline-flex items-center gap-1 rounded-lg bg-field-bg px-2 py-1 text-xs font-semibold text-text-secondary"
        >
          <Package className="size-3.5 text-primary" aria-hidden="true" />
          <span className="ltr-nums font-bold text-heading">
            {formatNumber(node.productsCount)}
          </span>
          <span className="text-[11px]">{t.admin.categories.productsUnit}</span>
        </span>
      )}

      {node.storesCount > 0 && (
        <span
          title={`${formatNumber(node.storesCount)} ${t.admin.categories.storesUnit}`}
          className="inline-flex items-center gap-1 rounded-lg bg-field-bg px-2 py-1 text-xs font-semibold text-text-secondary"
        >
          <Store className="size-3.5 text-text-secondary" aria-hidden="true" />
          <span className="ltr-nums font-bold text-heading">
            {formatNumber(node.storesCount)}
          </span>
          <span className="text-[11px]">{t.admin.categories.storesUnit}</span>
        </span>
      )}

      <Badge tone={node.isActive ? "success" : "warning"}>
        {node.isActive ? (
          <>
            <span className="size-1.5 rounded-full bg-success animate-pulse" />
            {t.admin.categories.active}
          </>
        ) : (
          <>
            <EyeOff className="size-3" aria-hidden="true" />
            {t.admin.categories.hidden}
          </>
        )}
      </Badge>
    </div>
  );
}

function ActionButtons({
  node,
  disabled,
  onEdit,
  onToggleActive,
  onDelete,
}: {
  node: AdminCategoryNode;
  disabled: boolean;
  onEdit: (node: AdminCategoryNode) => void;
  onToggleActive: (node: AdminCategoryNode) => void;
  onDelete: (node: AdminCategoryNode) => void;
}) {
  return (
    <div className="flex items-center gap-1">
      <Button
        variant="ghost"
        size="sm"
        disabled={disabled}
        onClick={() => onEdit(node)}
        icon={<Pencil className="size-3.5" aria-hidden="true" />}
        title={t.common.edit}
      >
        <span className="hidden sm:inline">{t.common.edit}</span>
      </Button>

      <Button
        variant="ghost"
        size="sm"
        disabled={disabled}
        onClick={() => onToggleActive(node)}
        icon={
          node.isActive ? (
            <EyeOff className="size-3.5" aria-hidden="true" />
          ) : (
            <Eye className="size-3.5" aria-hidden="true" />
          )
        }
        title={node.isActive ? t.admin.categories.hide : t.admin.categories.show}
      >
        <span className="hidden sm:inline">
          {node.isActive ? t.admin.categories.hide : t.admin.categories.show}
        </span>
      </Button>

      <Button
        variant="danger"
        size="sm"
        disabled={disabled}
        onClick={() => onDelete(node)}
        icon={<Trash2 className="size-3.5" aria-hidden="true" />}
        title={t.admin.categories.delete}
      >
        <span className="hidden sm:inline">{t.admin.categories.delete}</span>
      </Button>
    </div>
  );
}

export default function CategoryTree({
  roots,
  disabled = false,
  searchQuery = "",
  statusFilter = "all",
  onAddChild,
  onEdit,
  onToggleActive,
  onDelete,
}: CategoryTreeProps) {
  const [collapsed, setCollapsed] = useState<Set<number>>(new Set());

  const toggle = (id: number) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const expandAll = () => setCollapsed(new Set());
  const collapseAll = () => setCollapsed(new Set(roots.map((r) => r.id)));

  // تصفية التصنيفات بالبحث وحالة النشاط
  const filteredRoots = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return roots
      .map((root) => {
        const rootMatch =
          !query ||
          root.name.toLowerCase().includes(query) ||
          root.slug.toLowerCase().includes(query);

        const matchingChildren = root.children.filter((child) => {
          const childQueryMatch =
            !query ||
            child.name.toLowerCase().includes(query) ||
            child.slug.toLowerCase().includes(query);

          const childStatusMatch =
            statusFilter === "all" ||
            (statusFilter === "active" && child.isActive) ||
            (statusFilter === "hidden" && !child.isActive);

          return childQueryMatch && childStatusMatch;
        });

        const rootStatusMatch =
          statusFilter === "all" ||
          (statusFilter === "active" && root.isActive) ||
          (statusFilter === "hidden" && !root.isActive);

        // يظهر الجذر لو هو نفسه طابق أو لو عنده فرعي طابق
        if ((rootMatch && rootStatusMatch) || matchingChildren.length > 0) {
          return {
            ...root,
            children: query ? matchingChildren : (
              statusFilter === "all"
                ? root.children
                : root.children.filter((c) =>
                    statusFilter === "active" ? c.isActive : !c.isActive,
                  )
            ),
          };
        }

        return null;
      })
      .filter((r): r is AdminCategoryRoot => r !== null);
  }, [roots, searchQuery, statusFilter]);

  if (filteredRoots.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-surface p-12 text-center">
        <div className="grid size-12 place-items-center rounded-2xl bg-field-bg text-text-secondary">
          <Search className="size-6 text-text-secondary" />
        </div>
        <h3 className="mt-4 text-sm font-bold text-heading">
          {t.admin.categories.noSearchResults}
        </h3>
        <p className="mt-1 text-xs text-text-secondary max-w-sm">
          {t.admin.categories.noSearchResultsHint}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* شريط التحكم السريع بالتوسيع والطي */}
      <div className="flex items-center justify-between px-1">
        <span className="text-xs font-semibold text-text-secondary">
          عرض {formatNumber(filteredRoots.length)} تصنيف رئيسي
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={expandAll}
            className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-bold text-text-secondary hover:bg-field-bg hover:text-heading transition"
          >
            <ChevronDown className="size-3.5" />
            {t.admin.categories.expandAll}
          </button>
          <span className="text-border">|</span>
          <button
            type="button"
            onClick={collapseAll}
            className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-bold text-text-secondary hover:bg-field-bg hover:text-heading transition"
          >
            <ChevronUp className="size-3.5" />
            {t.admin.categories.collapseAll}
          </button>
        </div>
      </div>

      {/* قائمة بطاقات التصنيفات الرئيسية */}
      <div className="flex flex-col gap-4">
        {filteredRoots.map((root) => {
          const isOpen = !collapsed.has(root.id);

          return (
            <div
              key={root.id}
              className={cn(
                "overflow-hidden rounded-2xl border bg-surface transition shadow-xs",
                isOpen ? "border-primary/30 ring-1 ring-primary/10" : "border-border",
                !root.isActive && "bg-surface/80 opacity-80",
              )}
            >
              {/* رأس بطاقة التصنيف الرئيسي */}
              <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-surface hover:bg-field-bg/30 transition">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <button
                    type="button"
                    onClick={() => toggle(root.id)}
                    aria-expanded={isOpen}
                    aria-label={
                      isOpen
                        ? t.admin.categories.collapse
                        : t.admin.categories.expand
                    }
                    className="grid size-9 shrink-0 place-items-center rounded-xl bg-field-bg text-text-secondary transition hover:bg-primary/10 hover:text-primary"
                  >
                    {isOpen ? (
                      <ChevronDown className="size-4" aria-hidden="true" />
                    ) : (
                      <ChevronLeft className="size-4" aria-hidden="true" />
                    )}
                  </button>

                  {/* صورة التصنيف الرئيسي */}
                  <div className="relative size-12 shrink-0 overflow-hidden rounded-xl border border-border bg-field-bg shadow-2xs">
                    {root.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={root.imageUrl}
                        alt=""
                        className="size-full object-cover"
                      />
                    ) : (
                      <div className="grid size-full place-items-center bg-primary-soft text-primary">
                        <FolderTree className="size-6" aria-hidden="true" />
                      </div>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="truncate text-base font-extrabold text-heading">
                        {root.name}
                      </h3>
                      <span className="ltr-nums inline-block rounded-md bg-field-bg px-2 py-0.5 text-[11px] font-semibold text-text-secondary">
                        {root.slug}
                      </span>
                      {root.sortOrder > 0 && (
                        <span className="text-[11px] font-medium text-text-secondary">
                          #{root.sortOrder}
                        </span>
                      )}
                    </div>

                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      <Badge tone="neutral">
                        <span className="ltr-nums font-bold">
                          {formatNumber(root.children.length)}
                        </span>
                        <span>{t.admin.categories.childrenUnit}</span>
                      </Badge>
                      <NodeCounters node={root} />
                    </div>
                  </div>
                </div>

                {/* أزرار الإجراءات على التصنيف الرئيسي */}
                <div className="flex items-center gap-2">
                  <Button
                    variant="primary"
                    size="sm"
                    disabled={disabled}
                    onClick={() => onAddChild(root)}
                    icon={<Plus className="size-4" aria-hidden="true" />}
                  >
                    {t.admin.categories.addChild}
                  </Button>

                  <ActionButtons
                    node={root}
                    disabled={disabled}
                    onEdit={onEdit}
                    onToggleActive={onToggleActive}
                    onDelete={onDelete}
                  />
                </div>
              </div>

              {/* قسم التصنيفات الفرعية */}
              {isOpen && (
                <div className="border-t border-border/80 bg-field-bg/30 p-4">
                  {root.children.length === 0 ? (
                    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-surface/50 py-8 px-4 text-center">
                      <p className="text-xs font-bold text-heading">
                        {t.admin.categories.noChildrenYet}
                      </p>
                      <p className="mt-1 text-xs text-text-secondary">
                        {t.admin.categories.addChildPrompt}
                      </p>
                      <Button
                        variant="secondary"
                        size="sm"
                        className="mt-3"
                        disabled={disabled}
                        onClick={() => onAddChild(root)}
                        icon={<Plus className="size-3.5" aria-hidden="true" />}
                      >
                        {t.admin.categories.addChild}
                      </Button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
                      {root.children.map((child: AdminCategoryChild) => (
                        <div
                          key={child.id}
                          className={cn(
                            "flex flex-col justify-between rounded-xl border border-border bg-surface p-3 transition hover:border-primary/40 hover:shadow-xs",
                            !child.isActive && "opacity-75 bg-surface/60",
                          )}
                        >
                          <div className="flex items-start gap-2.5">
                            {/* صورة الفرعي */}
                            <div className="size-10 shrink-0 overflow-hidden rounded-lg border border-border bg-field-bg shadow-2xs">
                              {child.imageUrl ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={child.imageUrl}
                                  alt=""
                                  className="size-full object-cover"
                                />
                              ) : (
                                <div className="grid size-full place-items-center bg-field-bg text-text-secondary">
                                  <Tag className="size-4" aria-hidden="true" />
                                </div>
                              )}
                            </div>

                            <div className="min-w-0 flex-1">
                              <h4 className="truncate text-sm font-bold text-heading">
                                {child.name}
                              </h4>
                              <p className="ltr-nums truncate text-[11px] text-text-secondary">
                                {child.slug}
                              </p>
                            </div>
                          </div>

                          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-border/50">
                            <div className="flex flex-wrap items-center gap-1.5">
                              {getSizeGroupBadge(child.sizeGroup)}
                              <NodeCounters node={child} />
                            </div>

                            <ActionButtons
                              node={child}
                              disabled={disabled}
                              onEdit={onEdit}
                              onToggleActive={onToggleActive}
                              onDelete={onDelete}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

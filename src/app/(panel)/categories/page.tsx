"use client";

import { useEffect, useState } from "react";
import { Check, FolderTree, Plus } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import { Card, CardBody } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import EmptyState from "@/components/ui/EmptyState";
import ErrorBanner from "@/components/ui/ErrorBanner";
import Spinner from "@/components/ui/Spinner";
import CategoryTree from "@/components/admin/CategoryTree";
import CategoryFormDialog, {
  type CategoryFormMode,
} from "@/components/admin/CategoryFormDialog";
import {
  createCategory,
  fetchAdminCategories,
  updateCategory,
} from "@/lib/admin/api";
import type { AdminCategoryRoot, CategoryPayload } from "@/lib/admin/types";
import { classifyStatus } from "@/lib/apiFailure";
import { useFlash } from "@/lib/useFlash";
import { t } from "@/lib/strings";

export default function AdminCategoriesPage() {
  const [roots, setRoots] = useState<AdminCategoryRoot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);

  const [mode, setMode] = useState<CategoryFormMode | null>(null);
  const [saving, setSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>();
  const [flash, showFlash] = useFlash();

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const res = await fetchAdminCategories();
      if (cancelled) return;

      setLoading(false);

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
    })();

    return () => {
      cancelled = true;
    };
  }, [attempt]);

  const submit = async (payload: CategoryPayload) => {
    if (!mode) return;

    setSaving(true);
    setFieldErrors(undefined);
    setError("");

    const res =
      mode.kind === "edit"
        ? await updateCategory(mode.id, {
            name: payload.name,
            imageUrl: payload.imageUrl,
          })
        : await createCategory(payload);

    setSaving(false);

    if (res.success && res.categories) {
      setRoots(res.categories);
      setMode(null);
      /*
        كاش تصنيفات لوحة التاجر **مش مسؤوليتنا**. لما كانت اللوحتين بنفس
        التطبيق كنّا بنستدعي invalidateCategories() هون عشان التاجر يشوف
        التصنيف الجديد فوراً. صاروا تطبيقين بذاكرتين منفصلتين، فالكاش هناك
        بيتفضّى بإعادة تحميل صفحته — ما في شي نعمله من هون.
      */
      showFlash(
        mode.kind === "edit"
          ? t.admin.categories.updated
          : t.admin.categories.created,
      );
      return;
    }

    const failure = classifyStatus(res);

    // أخطاء الحقول بتضل جوّا الحوار — إغلاقه بيضيّع اللي كتبه المستخدم
    if (failure.kind === "validation" && failure.errors) {
      setFieldErrors(failure.errors);
      return;
    }

    setMode(null);
    setError(
      failure.kind === "unauthorized"
        ? t.admin.common.sessionInvalid
        : failure.message,
    );
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t.admin.categories.title}
        subtitle={t.admin.categories.subtitle}
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

      <ErrorBanner
        message={error}
        onRetry={() => {
          setLoading(true);
          setAttempt((a) => a + 1);
        }}
      />

      {/* الحذف غير متاح — قواعده لسا ما تحدّدت مع الباك إند */}
      <p className="text-xs leading-relaxed text-text-secondary">
        {t.admin.categories.deleteNote}
      </p>

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
          onAddChild={(root) =>
            setMode({ kind: "child", parentId: root.id, parentName: root.name })
          }
          onEdit={(id, name, imageUrl) =>
            setMode({ kind: "edit", id, name, imageUrl })
          }
        />
      )}

      <CategoryFormDialog
        mode={mode}
        loading={saving}
        serverErrors={fieldErrors}
        onSubmit={submit}
        onCancel={() => setMode(null)}
      />
    </div>
  );
}

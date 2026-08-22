"use client";

import { useEffect, useState } from "react";
import { Check, ImageOff, Pencil, Plus, Trash2 } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import EmptyState from "@/components/ui/EmptyState";
import ErrorBanner from "@/components/ui/ErrorBanner";
import Input from "@/components/ui/Input";
import Spinner from "@/components/ui/Spinner";
import Tabs, { type TabItem } from "@/components/ui/Tabs";
import Toggle from "@/components/ui/Toggle";
import StaticPageEditor from "@/components/admin/StaticPageEditor";
import BannerFormDialog from "@/components/admin/BannerFormDialog";
import {
  createBanner,
  deleteBanner,
  fetchBanners,
  fetchHomeContent,
  fetchStaticPages,
  saveHomeContent,
  saveStaticPage,
  updateBanner,
} from "@/lib/admin/api";
import type {
  Banner,
  BannerPayload,
  HomeContent,
  StaticPage,
  StaticPageKey,
} from "@/lib/admin/types";
import { classifyStatus } from "@/lib/apiFailure";
import { useFlash } from "@/lib/useFlash";
import { t } from "@/lib/strings";

const TABS: TabItem[] = [
  { key: "home", label: t.admin.content.tabHome },
  { key: "pages", label: t.admin.content.tabPages },
  { key: "banners", label: t.admin.content.tabBanners },
];

/** "1, 2, 5" → [1,2,5] — مؤقت لحد ما يوصل مسار اختيار المتاجر من الباك إند */
const parseIds = (text: string): number[] =>
  text
    .split(/[,،\s]+/)
    .map((part) => Number(part.trim()))
    .filter((n) => Number.isInteger(n) && n > 0);

export default function AdminContentPage() {
  const [tab, setTab] = useState("home");

  const [home, setHome] = useState<HomeContent | null>(null);
  const [pages, setPages] = useState<StaticPage[]>([]);
  const [banners, setBanners] = useState<Banner[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);

  const [saving, setSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>();
  const [flash, showFlash] = useFlash();

  const [pageKey, setPageKey] = useState<StaticPageKey>("terms");
  const [bannerForm, setBannerForm] = useState<Banner | "new" | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Banner | null>(null);

  // محرّرات الرئيسية بتشتغل على نسخة محلية لحد الحفظ
  const [heroTitle, setHeroTitle] = useState("");
  const [heroSubtitle, setHeroSubtitle] = useState("");
  const [heroImageUrl, setHeroImageUrl] = useState("");
  const [featuredStores, setFeaturedStores] = useState("");
  const [featuredCategories, setFeaturedCategories] = useState("");

  useEffect(() => {
    let cancelled = false;

    (async () => {
      // التبويبات الثلاث بتتحمّل مرة وحدة — البيانات صغيرة والتنقّل بينهن فوري
      const [homeRes, pagesRes, bannersRes] = await Promise.all([
        fetchHomeContent(),
        fetchStaticPages(),
        fetchBanners(),
      ]);
      if (cancelled) return;

      setLoading(false);

      const failed = [homeRes, pagesRes, bannersRes].find((r) => !r.success);
      if (failed) {
        const failure = classifyStatus(failed);
        setError(
          failure.kind === "unauthorized"
            ? t.admin.common.sessionInvalid
            : failure.message,
        );
        return;
      }

      setError("");
      if (homeRes.home) {
        setHome(homeRes.home);
        setHeroTitle(homeRes.home.heroTitle);
        setHeroSubtitle(homeRes.home.heroSubtitle);
        setHeroImageUrl(homeRes.home.heroImageUrl ?? "");
        setFeaturedStores(homeRes.home.featuredStoreIds.join("، "));
        setFeaturedCategories(homeRes.home.featuredCategoryIds.join("، "));
      }
      if (pagesRes.pages) setPages(pagesRes.pages);
      if (bannersRes.banners) setBanners(bannersRes.banners);
    })();

    return () => {
      cancelled = true;
    };
  }, [attempt]);

  const handleFailure = (res: Parameters<typeof classifyStatus>[0]) => {
    const failure = classifyStatus(res);
    if (failure.kind === "validation" && failure.errors) {
      setFieldErrors(failure.errors);
      return true;
    }
    setError(
      failure.kind === "unauthorized"
        ? t.admin.common.sessionInvalid
        : failure.message,
    );
    return false;
  };

  const saveHome = async () => {
    setSaving(true);
    setFieldErrors(undefined);
    setError("");

    const res = await saveHomeContent({
      heroTitle: heroTitle.trim(),
      heroSubtitle: heroSubtitle.trim(),
      heroImageUrl: heroImageUrl.trim() || null,
      featuredStoreIds: parseIds(featuredStores),
      featuredCategoryIds: parseIds(featuredCategories),
    });
    setSaving(false);

    if (res.success && res.home) {
      setHome(res.home);
      showFlash(t.common.saved);
      return;
    }
    handleFailure(res);
  };

  const savePage = async (payload: { title: string; body: string }) => {
    setSaving(true);
    setFieldErrors(undefined);
    setError("");

    const res = await saveStaticPage(pageKey, payload);
    setSaving(false);

    if (res.success && res.page) {
      const updated = res.page;
      setPages((prev) => prev.map((p) => (p.key === updated.key ? updated : p)));
      showFlash(t.common.saved);
      return;
    }
    handleFailure(res);
  };

  const submitBanner = async (payload: BannerPayload) => {
    setSaving(true);
    setFieldErrors(undefined);
    setError("");

    const res =
      bannerForm === "new"
        ? await createBanner(payload)
        : await updateBanner((bannerForm as Banner).id, payload);
    setSaving(false);

    if (res.success && res.banners) {
      setBanners(res.banners);
      setBannerForm(null);
      showFlash(t.admin.content.bannerSaved);
      return;
    }
    if (!handleFailure(res)) setBannerForm(null);
  };

  /** التفعيل السريع من البطاقة — بيبعث isActive لحاله بلا باقي الحقول */
  const toggleBanner = async (banner: Banner) => {
    setSaving(true);
    setError("");

    const res = await updateBanner(banner.id, { isActive: !banner.isActive });
    setSaving(false);

    if (res.success && res.banners) {
      setBanners(res.banners);
      showFlash(t.common.saved);
      return;
    }
    handleFailure(res);
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;

    setSaving(true);
    setError("");

    const res = await deleteBanner(pendingDelete.id);
    setSaving(false);
    setPendingDelete(null);

    if (res.success && res.banners) {
      setBanners(res.banners);
      showFlash(t.admin.content.bannerDeleted);
      return;
    }
    handleFailure(res);
  };

  const currentPage = pages.find((p) => p.key === pageKey);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t.admin.content.title}
        subtitle={t.admin.content.subtitle}
        action={
          flash ? (
            <span
              role="status"
              className="flex items-center gap-1.5 rounded-xl bg-success-soft px-3 py-1.5 text-xs font-bold text-success shadow-xs"
            >
              <Check className="size-4" aria-hidden="true" />
              {flash}
            </span>
          ) : undefined
        }
      />

      <ErrorBanner
        message={error}
        onRetry={() => {
          setLoading(true);
          setAttempt((a) => a + 1);
        }}
      />

      <Tabs items={TABS} active={tab} onChange={setTab} disabled={saving} />

      {loading ? (
        <Spinner />
      ) : tab === "home" ? (
        <Card>
          <CardHeader title={t.admin.content.tabHome} />
          <CardBody>
            <Input
              id="hero-title"
              label={t.admin.content.heroTitle}
              value={heroTitle}
              onChange={setHeroTitle}
              disabled={saving}
              error={fieldErrors?.heroTitle}
            />
            <Input
              id="hero-subtitle"
              label={t.admin.content.heroSubtitle}
              value={heroSubtitle}
              onChange={setHeroSubtitle}
              disabled={saving}
              multiline
              rows={2}
              error={fieldErrors?.heroSubtitle}
            />
            <Input
              id="hero-image"
              label={t.admin.content.heroImage}
              value={heroImageUrl}
              onChange={setHeroImageUrl}
              disabled={saving}
              dir="ltr"
              error={fieldErrors?.heroImageUrl}
            />

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input
                id="featured-stores"
                label={t.admin.content.featuredStores}
                value={featuredStores}
                onChange={setFeaturedStores}
                disabled={saving}
                dir="ltr"
              />
              <Input
                id="featured-categories"
                label={t.admin.content.featuredCategories}
                value={featuredCategories}
                onChange={setFeaturedCategories}
                disabled={saving}
                dir="ltr"
              />
            </div>

            {/* إدخال المعرّفات يدوي مؤقتاً — ما في مسار اختيار من الباك إند بعد */}
            <p className="text-xs leading-relaxed text-text-secondary">
              {t.admin.content.featuredHint}
            </p>

            <div className="flex justify-end">
              <Button onClick={saveHome} disabled={saving || !home}>
                {saving ? t.common.saving : t.common.save}
              </Button>
            </div>
          </CardBody>
        </Card>
      ) : tab === "pages" ? (
        <div className="flex flex-col gap-4">
          <Tabs
            items={pages.map((p) => ({
              key: p.key,
              label: t.admin.content[p.key],
            }))}
            active={pageKey}
            onChange={(key) => setPageKey(key as StaticPageKey)}
            disabled={saving}
          />
          {currentPage && (
            <StaticPageEditor
              page={currentPage}
              saving={saving}
              serverErrors={fieldErrors}
              onSave={savePage}
            />
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="flex justify-end">
            <Button
              onClick={() => setBannerForm("new")}
              disabled={saving}
              icon={<Plus className="size-4" aria-hidden="true" />}
            >
              {t.admin.content.addBanner}
            </Button>
          </div>

          {banners.length === 0 ? (
            <Card className="overflow-hidden border border-border shadow-xs">
              <CardBody className="p-8">
                <EmptyState
                  icon={ImageOff}
                  title={t.admin.content.bannersEmpty}
                  hint={t.admin.content.bannersEmptyHint}
                  action={
                    <Button
                      size="lg"
                      onClick={() => setBannerForm("new")}
                      icon={<Plus className="size-5" aria-hidden="true" />}
                    >
                      {t.admin.content.addBanner}
                    </Button>
                  }
                />
              </CardBody>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {banners.map((banner) => (
                <Card key={banner.id} className="overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={banner.imageUrl}
                    alt=""
                    className="h-32 w-full border-b border-border object-cover"
                  />
                  <CardBody className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <p className="min-w-0 flex-1 truncate text-sm font-extrabold text-heading">
                        {banner.title}
                      </p>
                      <Badge tone="neutral">
                        <span className="ltr-nums">{banner.position}</span>
                      </Badge>
                    </div>

                    <Toggle
                      checked={banner.isActive}
                      onChange={() => toggleBanner(banner)}
                      label={t.admin.content.bannerActive}
                      disabled={saving}
                    />

                    <div className="flex gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        disabled={saving}
                        onClick={() => setBannerForm(banner)}
                        icon={<Pencil className="size-3.5" aria-hidden="true" />}
                      >
                        {t.common.edit}
                      </Button>
                      <Button
                        variant="danger"
                        size="sm"
                        disabled={saving}
                        onClick={() => setPendingDelete(banner)}
                        icon={<Trash2 className="size-3.5" aria-hidden="true" />}
                      >
                        {t.common.delete}
                      </Button>
                    </div>
                  </CardBody>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      <BannerFormDialog
        banner={bannerForm}
        loading={saving}
        serverErrors={fieldErrors}
        onSubmit={submitBanner}
        onCancel={() => setBannerForm(null)}
      />

      <ConfirmDialog
        open={pendingDelete !== null}
        title={t.admin.content.deleteBannerTitle}
        body={t.admin.content.deleteBannerBody}
        confirmLabel={t.common.delete}
        loading={saving}
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}

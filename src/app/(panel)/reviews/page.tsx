"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  ArrowUpDown,
  Check,
  ChevronLeft,
  Eye,
  EyeOff,
  Mail,
  MessageSquare,
  Package,
  Search,
  ShieldAlert,
  ShoppingBag,
  Star,
  Store as StoreIcon,
  ThumbsUp,
} from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import EmptyState from "@/components/ui/EmptyState";
import ErrorBanner from "@/components/ui/ErrorBanner";
import Pagination from "@/components/ui/Pagination";
import Spinner from "@/components/ui/Spinner";
import {
  fetchRatings,
  fetchStoreRatings,
  hideRating,
  unhideRating,
} from "@/lib/admin/api";
import type {
  AdminRatingItem,
  ReviewsOverviewStats,
  StoreRatingSummary,
} from "@/lib/admin/types";
import { formatDate, formatNumber } from "@/lib/format";
import { useFlash } from "@/lib/useFlash";
import { t } from "@/lib/strings";
import type { Pagination as PaginationType } from "@/lib/api";

function StarRating({ rating, size = "md" }: { rating: number; size?: "sm" | "md" | "lg" }) {
  const sizeClasses = {
    sm: "size-3.5",
    md: "size-4.5",
    lg: "size-5.5",
  };

  return (
    <div className="flex items-center gap-1" dir="ltr">
      {[1, 2, 3, 4, 5].map((star) => {
        const isFilled = star <= rating;
        return (
          <Star
            key={star}
            className={`${sizeClasses[size]} ${
              isFilled
                ? "fill-amber-400 text-amber-400"
                : "fill-border/40 text-border"
            }`}
            aria-hidden="true"
          />
        );
      })}
    </div>
  );
}

export default function AdminReviewsPage() {
  const [reviews, setReviews] = useState<AdminRatingItem[]>([]);
  const [overview, setOverview] = useState<ReviewsOverviewStats | null>(null);
  const [storesRatings, setStoresRatings] = useState<StoreRatingSummary[]>([]);
  const [pagination, setPagination] = useState<PaginationType | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [activeTab, setActiveTab] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOption, setSortOption] = useState<"newest" | "highest" | "lowest">("newest");

  const [hidingReviewId, setHidingReviewId] = useState<number | null>(null);
  const [unhidingReviewId, setUnhidingReviewId] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [flash, showFlash] = useFlash();

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");

    let isHiddenFilter: boolean | "" = "";
    if (activeTab === "hidden") isHiddenFilter = true;

    const ratingsRes = await fetchRatings({
      page,
      limit: 10,
      hidden: isHiddenFilter,
    });

    setLoading(false);

    if (ratingsRes.success) {
      const items: AdminRatingItem[] = ratingsRes.ratings || [];
      setReviews(items);
      if (ratingsRes.pagination) setPagination(ratingsRes.pagination);

      // Compute overview KPIs strictly from data
      const total = ratingsRes.pagination?.total ?? items.length;
      const positiveCount = items.filter((r) => r.rating >= 4).length;
      const hiddenCount = items.filter((r) => r.isHidden || r.hidden).length;
      const avg =
        items.length > 0
          ? items.reduce((s, r) => s + r.rating, 0) / items.length
          : 0;

      setOverview({
        platformAverage: Number(avg.toFixed(1)),
        totalReviews: total,
        positivePercentage:
          items.length > 0 ? Math.round((positiveCount / items.length) * 100) : 0,
        hiddenCount,
        starCounts: {
          5: items.filter((r) => r.rating === 5).length,
          4: items.filter((r) => r.rating === 4).length,
          3: items.filter((r) => r.rating === 3).length,
          2: items.filter((r) => r.rating === 2).length,
          1: items.filter((r) => r.rating === 1).length,
        },
      });

      // Compute store ratings aggregation strictly from live ratings items
      const storesMap = new Map<number, { name: string; city: string | null; ratings: number[] }>();
      for (const r of items) {
        const sId = r.store?.id ?? r.storeId;
        if (!sId) continue;
        const sName = r.store?.name ?? r.storeName ?? "متجر";
        const sCity = r.store?.city ?? r.storeCity ?? null;
        if (!storesMap.has(sId)) {
          storesMap.set(sId, { name: sName, city: sCity, ratings: [] });
        }
        storesMap.get(sId)!.ratings.push(r.rating);
      }

      if (storesMap.size > 0) {
        const liveSummaries: StoreRatingSummary[] = Array.from(storesMap.entries())
          .map(([sId, val]) => {
            const count = val.ratings.length;
            const sAvg = count > 0 ? val.ratings.reduce((a, b) => a + b, 0) / count : 0;
            return {
              storeId: sId,
              storeName: val.name,
              storeLogoUrl: null,
              city: val.city,
              averageRating: Number(sAvg.toFixed(1)),
              totalReviews: count,
              ratingDistribution: {
                5: val.ratings.filter((r) => r === 5).length,
                4: val.ratings.filter((r) => r === 4).length,
                3: val.ratings.filter((r) => r === 3).length,
                2: val.ratings.filter((r) => r === 2).length,
                1: val.ratings.filter((r) => r === 1).length,
              },
            };
          })
          .sort((a, b) => b.averageRating - a.averageRating);

        setStoresRatings(liveSummaries);
      } else {
        setStoresRatings([]);
      }
    } else {
      setError(ratingsRes.message || t.admin.common.loadFailed);
    }
  }, [page, activeTab]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleHide = async () => {
    if (!hidingReviewId) return;
    setBusy(true);

    const res = await hideRating(hidingReviewId);
    setBusy(false);

    if (res.success) {
      setReviews((prev) =>
        prev.map((r) =>
          r.id === hidingReviewId
            ? { ...r, isHidden: true, hidden: true }
            : r,
        ),
      );
      setHidingReviewId(null);
      showFlash(t.admin.reviews.didHide);
    } else {
      setError(res.message || t.admin.common.loadFailed);
    }
  };

  const handleUnhide = async () => {
    if (!unhidingReviewId) return;
    setBusy(true);

    const res = await unhideRating(unhidingReviewId);
    setBusy(false);

    if (res.success) {
      setReviews((prev) =>
        prev.map((r) =>
          r.id === unhidingReviewId
            ? { ...r, isHidden: false, hidden: false }
            : r,
        ),
      );
      setUnhidingReviewId(null);
      showFlash(t.admin.reviews.didUnhide);
    } else {
      setError(res.message || t.admin.common.loadFailed);
    }
  };

  // Client-side filtering for star tabs and search query
  const filteredReviews = reviews.filter((r) => {
    if (activeTab === "5" && r.rating !== 5) return false;
    if (activeTab === "4" && r.rating !== 4) return false;
    if (activeTab === "3" && r.rating !== 3) return false;
    if (activeTab === "low" && r.rating > 2) return false;
    if (activeTab === "hidden" && !(r.isHidden || r.hidden)) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const pName = (r.product?.name || r.productName || "").toLowerCase();
      const sName = (r.store?.name || r.storeName || "").toLowerCase();
      const uName = (r.user?.name || r.customerName || "").toLowerCase();
      const uEmail = (r.user?.email || "").toLowerCase();
      const ord = (r.order?.orderNumber || r.orderNumber || "").toLowerCase();
      const comm = (r.comment || "").toLowerCase();

      return (
        pName.includes(q) ||
        sName.includes(q) ||
        uName.includes(q) ||
        uEmail.includes(q) ||
        ord.includes(q) ||
        comm.includes(q)
      );
    }

    return true;
  });

  // Client-side sorting
  filteredReviews.sort((a, b) => {
    if (sortOption === "highest") return b.rating - a.rating;
    if (sortOption === "lowest") return a.rating - b.rating;
    return (b.createdAt || "").localeCompare(a.createdAt || "");
  });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t.admin.reviews.title}
        subtitle={t.admin.reviews.subtitle}
      />

      {flash && (
        <div className="flex items-center gap-2 rounded-xl border border-success/20 bg-success-soft px-4 py-3 text-sm font-bold text-success shadow-xs">
          <Check className="size-4" />
          <span>{flash}</span>
        </div>
      )}

      <ErrorBanner message={error} onRetry={loadData} />

      {/* 📊 4 Top KPI Metric Cards */}
      {overview && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="border border-border/80 p-5 shadow-xs">
            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-xs font-extrabold text-text-secondary">
                  {t.admin.reviews.storeAverage}
                </span>
                <div className="mt-1 flex items-center gap-2">
                  <span className="ltr-nums text-2xl font-black text-heading">
                    {overview.platformAverage.toFixed(1)}
                  </span>
                  <Star className="size-5 fill-amber-400 text-amber-400" />
                </div>
              </div>
              <span className="grid size-12 place-items-center rounded-2xl bg-amber-500/10 text-amber-500">
                <Star className="size-6" />
              </span>
            </div>
            <p className="mt-2 text-[11px] font-bold text-text-secondary/80">
              {t.admin.reviews.basedOnOrders}
            </p>
          </Card>

          <Card className="border border-border/80 p-5 shadow-xs">
            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-xs font-extrabold text-text-secondary">
                  {t.admin.reviews.totalReviews}
                </span>
                <span className="ltr-nums mt-1 text-2xl font-black text-heading">
                  {formatNumber(overview.totalReviews)}
                </span>
              </div>
              <span className="grid size-12 place-items-center rounded-2xl bg-primary-soft text-primary">
                <MessageSquare className="size-6" />
              </span>
            </div>
            <p className="mt-2 text-[11px] font-bold text-text-secondary/80">
              لكل المنتجات والمتاجر
            </p>
          </Card>

          <Card className="border border-border/80 p-5 shadow-xs">
            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-xs font-extrabold text-text-secondary">
                  {t.admin.reviews.positiveRate}
                </span>
                <span className="ltr-nums mt-1 text-2xl font-black text-heading">
                  {overview.positivePercentage}%
                </span>
              </div>
              <span className="grid size-12 place-items-center rounded-2xl bg-success-soft text-success">
                <ThumbsUp className="size-6" />
              </span>
            </div>
            <p className="mt-2 text-[11px] font-bold text-text-secondary/80">
              تقييمات 4 و 5 نجوم
            </p>
          </Card>

          <Card className="border border-border/80 p-5 shadow-xs">
            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-xs font-extrabold text-text-secondary">
                  {t.admin.reviews.hiddenCount}
                </span>
                <span className="ltr-nums mt-1 text-2xl font-black text-heading">
                  {formatNumber(overview.hiddenCount)}
                </span>
              </div>
              <span className="grid size-12 place-items-center rounded-2xl bg-danger-soft text-danger">
                <ShieldAlert className="size-6" />
              </span>
            </div>
            <p className="mt-2 text-[11px] font-bold text-text-secondary/80">
              محجوبة لمخالفة سياسة المنصة
            </p>
          </Card>
        </div>
      )}

      {/* Main Layout Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-5 lg:col-span-2">
          {/* Tabs Filter */}
          <div className="flex flex-wrap items-center gap-2 overflow-x-auto pb-1">
            {[
              { key: "all", label: t.admin.reviews.tabAll, count: overview?.totalReviews },
              { key: "5", label: t.admin.reviews.tab5Stars, count: overview?.starCounts[5] },
              { key: "4", label: t.admin.reviews.tab4Stars, count: overview?.starCounts[4] },
              { key: "3", label: t.admin.reviews.tab3Stars, count: overview?.starCounts[3] },
              { key: "low", label: t.admin.reviews.tabLowStars, count: (overview?.starCounts[2] || 0) + (overview?.starCounts[1] || 0) },
              { key: "hidden", label: t.admin.reviews.tabHidden, count: overview?.hiddenCount },
            ].map((tab) => {
              const isActive = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => {
                    setActiveTab(tab.key);
                    setPage(1);
                  }}
                  className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-extrabold transition ${
                    isActive
                      ? "bg-primary text-white shadow-xs"
                      : "border border-border/80 bg-surface text-text-secondary hover:border-primary/40 hover:text-heading"
                  }`}
                >
                  <span>{tab.label}</span>
                  {typeof tab.count === "number" && tab.count > 0 && (
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                        isActive
                          ? "bg-white/20 text-white"
                          : "bg-field-bg text-text-secondary"
                      }`}
                    >
                      {tab.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Search & Sort Bar */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative flex-1">
              <Search className="absolute right-3.5 top-1/2 size-4 -translate-y-1/2 text-text-secondary" />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(1);
                }}
                placeholder={t.admin.reviews.searchPlaceholder}
                className="h-10.5 w-full rounded-xl border border-border bg-surface pl-4 pr-10 text-sm text-heading placeholder:text-text-secondary/70 focus:border-primary focus:outline-hidden focus:ring-2 focus:ring-primary/20"
              />
            </div>

            <div className="flex items-center gap-2">
              <div className="relative">
                <select
                  value={sortOption}
                  onChange={(e) => {
                    setSortOption(e.target.value as "newest" | "highest" | "lowest");
                    setPage(1);
                  }}
                  className="h-10.5 appearance-none rounded-xl border border-border bg-surface pl-8 pr-4 text-xs font-bold text-heading hover:border-primary/40 focus:border-primary focus:outline-hidden"
                >
                  <option value="newest">{t.admin.orders.sortNewest}</option>
                  <option value="highest">الأعلى تقييماً</option>
                  <option value="lowest">الأقل تقييماً</option>
                </select>
                <ArrowUpDown className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-text-secondary" />
              </div>
            </div>
          </div>

          {/* Reviews List */}
          {loading ? (
            <Card className="p-12">
              <Spinner />
            </Card>
          ) : filteredReviews.length === 0 ? (
            <Card className="border border-border p-8">
              <EmptyState
                icon={Star}
                title={t.admin.reviews.empty}
                hint={t.admin.reviews.emptyHint}
                action={
                  searchQuery || activeTab !== "all" ? (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        setSearchQuery("");
                        setActiveTab("all");
                        setPage(1);
                      }}
                    >
                      {t.admin.common.clearSearch}
                    </Button>
                  ) : undefined
                }
              />
            </Card>
          ) : (
            <div className="flex flex-col gap-4">
              {filteredReviews.map((review) => {
                const customerName = review.user?.name || review.customerName || "عميل";
                const customerEmail = review.user?.email || "";
                const productName = review.product?.name || review.productName || "منتج";
                const storeName = review.store?.name || review.storeName || "متجر";
                const sId = review.store?.id || review.storeId;
                const orderNum = review.order?.orderNumber || (review.orderId ? `#VIO-${review.orderId}` : review.orderNumber || "طلب موثق");
                const isHidden = Boolean(review.isHidden || review.hidden);

                return (
                  <Card
                    key={review.id}
                    className={`overflow-hidden border transition ${
                      isHidden
                        ? "border-danger/30 bg-danger-soft/20"
                        : "border-border bg-surface hover:border-primary/30"
                    } shadow-xs`}
                  >
                    <div className="p-5">
                      {/* Top Row: Customer Info, Star Rating, and Status Badge */}
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <span className="grid size-10 shrink-0 place-items-center rounded-full bg-primary/10 text-sm font-black text-primary">
                            {customerName.charAt(0)}
                          </span>
                          <div className="flex flex-col">
                            <div className="flex items-center gap-2">
                              <span className="font-extrabold text-heading">
                                {customerName}
                              </span>
                              <span className="flex items-center gap-1 rounded-full bg-success-soft px-2 py-0.5 text-[10px] font-extrabold text-success">
                                <Check className="size-3" />
                                {t.admin.reviews.verifiedBuyer}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-text-secondary">
                              {customerEmail && (
                                <span className="ltr-nums flex items-center gap-1">
                                  <Mail className="size-3" />
                                  {customerEmail}
                                </span>
                              )}
                              <span>·</span>
                              <span className="ltr-nums">
                                {formatDate(review.createdAt)}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <StarRating rating={review.rating} />
                          {isHidden ? (
                            <Badge tone="danger">{t.admin.reviews.hiddenBadge}</Badge>
                          ) : (
                            <Badge tone="success">{t.admin.reviews.visibleBadge}</Badge>
                          )}
                        </div>
                      </div>

                      {/* Middle: Linked Product and Store Pill Badges */}
                      <div className="mt-3.5 flex flex-wrap items-center gap-2">
                        {/* Product Tag */}
                        <div className="flex items-center gap-1.5 rounded-lg border border-border/80 bg-field-bg/60 px-2.5 py-1 text-xs font-bold text-heading">
                          <Package className="size-3.5 text-primary" />
                          <span>{productName}</span>
                        </div>

                        {/* Order Number Tag */}
                        <div className="flex items-center gap-1.5 rounded-lg border border-border/80 bg-field-bg/60 px-2.5 py-1 text-xs font-bold text-text-secondary">
                          <ShoppingBag className="size-3.5 text-info" />
                          <span>{orderNum}</span>
                        </div>

                        {/* Store Tag */}
                        {sId ? (
                          <Link
                            href={`/stores/${sId}`}
                            className="flex items-center gap-1.5 rounded-lg border border-border/80 bg-field-bg/60 px-2.5 py-1 text-xs font-bold text-heading transition hover:border-primary/40 hover:text-primary"
                            title="الانتقال لصفحة تفاصيل المتجر"
                          >
                            <StoreIcon className="size-3.5 text-primary" />
                            <span>{storeName}</span>
                          </Link>
                        ) : (
                          <div className="flex items-center gap-1.5 rounded-lg border border-border/80 bg-field-bg/60 px-2.5 py-1 text-xs font-bold text-heading">
                            <StoreIcon className="size-3.5 text-primary" />
                            <span>{storeName}</span>
                          </div>
                        )}
                      </div>

                      {/* Review Body Comment */}
                      <div className="mt-3.5 rounded-xl border border-border/60 bg-field-bg/30 p-3.5">
                        <p className="text-sm font-medium leading-relaxed text-heading">
                          {review.comment || t.admin.reviews.noComment}
                        </p>

                        {isHidden && (
                          <div className="mt-2.5 flex items-start gap-2 rounded-lg bg-danger-soft/60 p-2 text-xs text-danger">
                            <AlertCircle className="size-4 shrink-0" />
                            <div>
                              <span className="font-bold">حالة التقييم: </span>
                              <span>محجوب ومستثنى من متوسط تقييم المنتج والمتجر.</span>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Action Footer */}
                      <div className="mt-4 flex items-center justify-end gap-2 border-t border-border/60 pt-3">
                        {isHidden ? (
                          <Button
                            variant="secondary"
                            size="sm"
                            disabled={busy}
                            onClick={() => setUnhidingReviewId(review.id)}
                            icon={<Eye className="size-3.5" />}
                          >
                            {t.admin.reviews.unhide}
                          </Button>
                        ) : (
                          <Button
                            variant="danger"
                            size="sm"
                            disabled={busy}
                            onClick={() => setHidingReviewId(review.id)}
                            icon={<EyeOff className="size-3.5" />}
                          >
                            {t.admin.reviews.hide}
                          </Button>
                        )}
                      </div>
                    </div>
                  </Card>
                );
              })}

              {pagination && pagination.totalPages > 1 && (
                <Pagination
                  pagination={pagination}
                  onChange={(newPage) => setPage(newPage)}
                />
              )}
            </div>
          )}
        </div>

        {/* 🏬 Sidebar: Store Average Ratings Overview */}
        <div className="flex flex-col gap-4">
          <Card className="border border-border/80 shadow-xs">
            <CardHeader
              title={t.admin.reviews.topRatedStores}
              action={
                <span className="flex items-center gap-1 text-xs font-extrabold text-primary">
                  <Star className="size-3.5 fill-primary text-primary" />
                  حسب التقييم
                </span>
              }
            />
            <CardBody className="space-y-4 p-5">
              <p className="text-xs font-medium text-text-secondary">
                متوسط تقييم كل متجر محسوب تراكمياً من تقييمات العملاء الفعلية لطلبات المنتجات.
              </p>

              {storesRatings.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border/80 p-6 text-center">
                  <p className="text-xs font-bold text-text-secondary">لا توجد تقييمات للمتاجر حالياً</p>
                  <p className="mt-1 text-[11px] text-text-secondary/70">
                    عندما يقوم الزبائن بتقييم طلبات المتاجر، ستظهر المتاجر الأعلى تقييماً هنا.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-border/60">
                  {storesRatings.map((store) => (
                    <Link
                      key={store.storeId}
                      href={`/stores/${store.storeId}`}
                      className="group -mx-2 flex items-center justify-between rounded-xl px-2 py-3 transition hover:bg-field-bg/60"
                      title={`الانتقال لتفاصيل ${store.storeName}`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary transition group-hover:bg-primary group-hover:text-white">
                          <StoreIcon className="size-4.5" />
                        </span>
                        <div>
                          <p className="text-sm font-extrabold text-heading transition group-hover:text-primary">
                            {store.storeName}
                          </p>
                          <p className="text-xs text-text-secondary">
                            {store.city || "فلسطين"} · {store.totalReviews} تقييم
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1 rounded-lg bg-amber-400/15 px-2 py-1 text-xs font-black text-amber-700">
                          <Star className="size-3.5 fill-amber-500 text-amber-500" />
                          <span>{store.averageRating.toFixed(1)}</span>
                        </div>
                        <ChevronLeft className="size-4 text-text-secondary/60 transition group-hover:-translate-x-0.5 group-hover:text-primary" />
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardBody>
          </Card>
        </div>
      </div>

      {/* Hide Confirm Dialog */}
      <ConfirmDialog
        open={hidingReviewId !== null}
        tone="danger"
        title={t.admin.reviews.hideTitle}
        body="سيتم إخفاء التقييم عن الزبائن واستثناؤه من متوسط تقييم المنتج والمتجر فوراً."
        confirmLabel={t.admin.reviews.hide}
        loading={busy}
        onConfirm={handleHide}
        onCancel={() => setHidingReviewId(null)}
      />

      {/* Unhide Confirm Dialog */}
      <ConfirmDialog
        open={unhidingReviewId !== null}
        tone="primary"
        title={t.admin.reviews.unhideTitle}
        body={t.admin.reviews.unhideBody}
        confirmLabel={t.admin.reviews.unhide}
        loading={busy}
        onConfirm={handleUnhide}
        onCancel={() => setUnhidingReviewId(null)}
      />
    </div>
  );
}

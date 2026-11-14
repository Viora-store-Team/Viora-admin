"use client";

import Image from "next/image";
import { ImageOff, Package } from "lucide-react";
import { useEffect, useState } from "react";
import Badge from "@/components/ui/Badge";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import EmptyState from "@/components/ui/EmptyState";
import ErrorBanner from "@/components/ui/ErrorBanner";
import Pagination from "@/components/ui/Pagination";
import Spinner from "@/components/ui/Spinner";
import { fetchStoreProducts } from "@/lib/admin/api";
import type { AdminCatalogProduct } from "@/lib/admin/types";
import type { Pagination as PaginationInfo } from "@/lib/api";
import { classifyStatus } from "@/lib/apiFailure";
import { formatCurrency, formatNumber } from "@/lib/format";

function ProductImage({ src, name }: { src?: string; name: string }) {
  const [failed, setFailed] = useState(false);
  const imageUrl = src && /^(https?:\/\/|\/(?!\/))/i.test(src) ? src : undefined;
  return (
    <div className="aspect-square size-20 shrink-0 overflow-hidden rounded-lg bg-surface-muted sm:size-24">
      {imageUrl && !failed ? (
        <Image
          src={imageUrl}
          alt={name}
          width={96}
          height={96}
          unoptimized
          className="size-full object-cover"
          onError={() => setFailed(true)}
        />
      ) : (
        <div className="grid size-full place-items-center text-text-secondary" role="img" aria-label="الصورة غير متاحة">
          <ImageOff className="size-5" aria-hidden="true" />
        </div>
      )}
    </div>
  );
}

function ProductCard({ product }: { product: AdminCatalogProduct }) {
  const cover = product.variants.find((variant) => variant.images.length > 0)?.images[0]?.url;
  const stock = product.variants.reduce(
    (sum, variant) => sum + variant.sizes.reduce((total, size) => total + size.stock, 0),
    0,
  );
  return (
    <article className="overflow-hidden rounded-2xl border border-border bg-surface p-4">
      <div className="flex min-w-0 gap-3">
        <ProductImage key={cover} src={cover} name={product.name} />
        <div className="min-w-0 space-y-1 break-words">
          <h3 className="font-bold text-heading">{product.name}</h3>
          <p className="text-sm text-text-secondary">{product.category.name}</p>
          <p className="flex flex-wrap gap-x-2 text-sm font-medium text-heading">
            <span>{formatCurrency(Number(product.price))}</span>
            {product.compareAtPrice != null && (
              <del className="text-text-secondary">{formatCurrency(Number(product.compareAtPrice))}</del>
            )}
          </p>
          <Badge tone={product.isActive && !product.archivedAt ? "success" : "neutral"}>
            {product.archivedAt ? "مؤرشف" : product.isActive ? "نشط" : "غير نشط"}
          </Badge>
        </div>
      </div>
      <p className="my-3 text-sm text-text-secondary">إجمالي المخزون {formatNumber(stock)}</p>
      {product.variants.length > 0 ? (
        <details className="rounded-lg border border-border p-3">
          <summary className="cursor-pointer text-sm font-medium text-heading">الصور والألوان والمقاسات</summary>
          <ul className="mt-3 space-y-3">
            {product.variants.map((variant) => (
              <li key={variant.id} className="space-y-2 border-t border-border pt-3">
                <p className="flex items-center gap-2 text-sm font-medium text-heading">
                  <span className="size-4 rounded-full border border-border" style={{ backgroundColor: variant.colorHex }} aria-hidden="true" />
                  {variant.colorName || variant.colorHex}
                </p>
                {variant.images.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {variant.images.map(({ url }, index) => (
                      <ProductImage key={`${index}-${url}`} src={url} name={`${product.name}، ${variant.colorName || variant.colorHex}، صورة ${index + 1}`} />
                    ))}
                  </div>
                )}
                {variant.sizes.length ? (
                  <ul className="flex flex-wrap gap-2">
                    {variant.sizes.map((row) => (
                      <li key={row.id}>
                        <Badge tone={row.stock === 0 ? "warning" : "neutral"}>
                          {row.size.name} · {formatNumber(row.stock)} قطعة
                        </Badge>
                      </li>
                    ))}
                  </ul>
                ) : <p className="text-sm text-text-secondary">ما في مقاسات.</p>}
              </li>
            ))}
          </ul>
        </details>
      ) : <p className="text-sm text-text-secondary">ما في ألوان أو مقاسات.</p>}
    </article>
  );
}

export default function StoreProductsSection({ storeId }: { storeId: number }) {
  const [archived, setArchived] = useState(false);
  const [page, setPage] = useState(1);
  const [attempt, setAttempt] = useState(0);
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<{ products: AdminCatalogProduct[]; pagination: PaginationInfo }>();
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    void fetchStoreProducts(storeId, { page, archived }).then((res) => {
      if (cancelled) return;
      setLoading(false);
      if (res.success && res.products && res.pagination) {
        setResult({ products: res.products, pagination: res.pagination });
        setError("");
      } else {
        setResult(undefined);
        setError(res.success ? "رد المنتجات غير مكتمل." : classifyStatus(res).message);
      }
    });
    return () => { cancelled = true; };
  }, [storeId, page, archived, attempt]);

  return (
    <Card>
      <CardHeader title="منتجات المتجر" action={
        <label className="flex items-center gap-2 text-sm text-heading">
          <input type="checkbox" checked={archived} onChange={(event) => {
            setLoading(true);
            setArchived(event.target.checked);
            setPage(1);
          }} />
          عرض المؤرشفة
        </label>
      } />
      <CardBody>
        {loading ? <Spinner /> : error ? (
          <ErrorBanner message={error} onRetry={() => { setLoading(true); setAttempt(attempt + 1); }} />
        ) : result && (result.pagination.total === 0 ? (
          <EmptyState icon={Package} title={archived ? "ما في منتجات مؤرشفة" : "ما في منتجات في هذا المتجر"} />
        ) : (
          <>
            <p className="text-sm text-text-secondary">{formatNumber(result.pagination.total)} منتج</p>
            <div className="grid gap-4 lg:grid-cols-2">
              {result.products.map((product) => <ProductCard key={product.id} product={product} />)}
            </div>
            <Pagination pagination={result.pagination} onChange={(next) => { setLoading(true); setPage(next); }} />
          </>
        ))}
      </CardBody>
    </Card>
  );
}

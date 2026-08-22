"use client";

import { EyeOff, Star } from "lucide-react";
import Badge from "@/components/ui/Badge";
import { Card, CardBody } from "@/components/ui/Card";
import { cn } from "@/lib/cn";
import { REVIEW_TARGET } from "@/lib/admin/status";
import type { Review } from "@/lib/admin/types";
import { formatDate } from "@/lib/format";
import { t } from "@/lib/strings";

/**
 * بطاقة التقييم المبلّغ عنه.
 *
 * ⚠️ أهم تفصيلة هون هي شارة الإخفاء: الإخفاء بيحجب التقييم **عن الزبائن بس**،
 * والتاجر بيضل يشوفه. لهيك النبرة `warning` مش `danger` والنص بيقول "مخفي عن
 * الزبائن · ظاهر للتاجر" — عشان ما يظن المشرف إنه حذف المحتوى.
 */
export default function ReviewCard({ review }: { review: Review }) {
  return (
    <Card
      className={cn(
        review.isHidden && "border-warning/30 bg-warning-soft/25",
      )}
    >
      <CardBody className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="info">{REVIEW_TARGET[review.targetType]}</Badge>
          <span className="text-sm font-extrabold text-heading">
            {review.targetName}
          </span>

          <span
            className="ms-auto flex items-center gap-0.5"
            aria-label={`${t.admin.reports.reviewRating} ${review.rating}/5`}
          >
            {[1, 2, 3, 4, 5].map((n) => (
              <Star
                key={n}
                className={cn(
                  "size-4",
                  n <= review.rating
                    ? "fill-warning text-warning"
                    : "text-border",
                )}
                aria-hidden="true"
              />
            ))}
          </span>
        </div>

        <p className="text-sm leading-relaxed text-heading">
          {review.comment ?? t.admin.common.none}
        </p>

        <p className="text-xs text-text-secondary">
          {t.admin.reports.reviewBy}{" "}
          <span className="font-bold">{review.author.name}</span> ·{" "}
          <span className="ltr-nums">{formatDate(review.createdAt)}</span> ·{" "}
          {review.storeName}
        </p>

        {review.isHidden && (
          <div className="space-y-1.5 rounded-xl border border-warning/25 bg-warning-soft/60 px-3 py-2.5">
            <p className="flex items-center gap-1.5 text-xs font-extrabold text-warning">
              <EyeOff className="size-3.5" aria-hidden="true" />
              {t.admin.reports.hiddenBadge}
            </p>
            {review.hiddenReason && (
              <p className="text-xs text-heading">
                <span className="font-bold">
                  {t.admin.reports.hiddenReason}:
                </span>{" "}
                {review.hiddenReason}
              </p>
            )}
            {review.hiddenAt && (
              <p className="ltr-nums text-xs text-text-secondary">
                {formatDate(review.hiddenAt)}
              </p>
            )}
          </div>
        )}
      </CardBody>
    </Card>
  );
}

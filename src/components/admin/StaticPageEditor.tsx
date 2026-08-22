"use client";

import { useState } from "react";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { ADMIN_LIMITS, type StaticPage } from "@/lib/admin/types";
import { formatDate } from "@/lib/format";
import { t } from "@/lib/strings";

interface StaticPageEditorProps {
  page: StaticPage;
  saving?: boolean;
  serverErrors?: Record<string, string>;
  onSave: (payload: { title: string; body: string }) => void;
}

/**
 * محرّر صفحة ثابتة — حقل نص عادي + معاينة بجانبه.
 *
 * بلا محرّر Markdown ولا WYSIWYG: النص بينتخزّن كنص واحد، فترقية المحرّر
 * لاحقاً ما بتغيّر شكل البيانات ولا عقد الـ API. المعاينة بتعرض النص كما هو
 * مع احترام فواصل الأسطر — بلا تحويل HTML، يعني بلا مساحة XSS.
 */
export default function StaticPageEditor({
  page,
  saving = false,
  serverErrors,
  onSave,
}: StaticPageEditorProps) {
  const [title, setTitle] = useState(page.title);
  const [body, setBody] = useState(page.body);

  // إعادة البذر لما يتبدّل التبويب لصفحة ثانية — تعديل حالة أثناء الرندر
  const [lastKey, setLastKey] = useState(page.key);
  if (lastKey !== page.key) {
    setLastKey(page.key);
    setTitle(page.title);
    setBody(page.body);
  }

  const changed = title !== page.title || body !== page.body;

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader
          title={t.admin.content[page.key]}
          action={
            <span className="ltr-nums text-xs text-text-secondary">
              {t.admin.content.lastUpdated}: {formatDate(page.updatedAt)}
            </span>
          }
        />
        <CardBody>
          <Input
            id={`page-title-${page.key}`}
            label={t.admin.content.pageTitle}
            value={title}
            onChange={setTitle}
            disabled={saving}
            required
            error={serverErrors?.title}
          />

          <Input
            id={`page-body-${page.key}`}
            label={t.admin.content.pageBody}
            value={body}
            onChange={setBody}
            disabled={saving}
            multiline
            rows={14}
            required
            error={serverErrors?.body}
          />

          <p className="ltr-nums text-end text-xs text-text-secondary">
            {body.length} / {ADMIN_LIMITS.pageBodyMax}
          </p>

          <div className="flex justify-end">
            <Button
              onClick={() => onSave({ title: title.trim(), body })}
              // بلا تغيير ما في داعي لطلب — نفس منطق diffBasics بصفحة المنتج
              disabled={saving || !changed}
            >
              {saving
                ? t.common.saving
                : changed
                  ? t.common.save
                  : t.common.nothingChanged}
            </Button>
          </div>
        </CardBody>
      </Card>

      <Card variant="muted">
        <CardHeader title={t.admin.content.preview} />
        <CardBody>
          {body.trim() === "" ? (
            <p className="text-sm text-text-secondary">
              {t.admin.content.previewEmpty}
            </p>
          ) : (
            <>
              <h3 className="text-lg font-extrabold text-heading">{title}</h3>
              {/* whitespace-pre-line بيحترم الأسطر بلا ما نحوّل النص لـ HTML */}
              <p className="whitespace-pre-line text-sm leading-relaxed text-heading">
                {body}
              </p>
            </>
          )}
        </CardBody>
      </Card>
    </div>
  );
}

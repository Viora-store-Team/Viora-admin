"use client";

import { useCallback, useRef, useState } from "react";
import { Megaphone } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import { Card, CardBody } from "@/components/ui/Card";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import EmptyState from "@/components/ui/EmptyState";
import ErrorBanner from "@/components/ui/ErrorBanner";
import Spinner from "@/components/ui/Spinner";
import Tabs, { type TabItem } from "@/components/ui/Tabs";
import Pagination from "@/components/ui/Pagination";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import BroadcastsTable from "@/components/admin/BroadcastsTable";
import { fetchBroadcasts, previewBroadcast, sendBroadcast } from "@/lib/admin/api";
import {
  AUDIENCES,
  AUDIENCE_LABELS,
  BROADCAST_LIMITS,
  buildBroadcastBody,
  parseEmails,
  serverBroadcastErrors,
  type BroadcastForm,
  type BroadcastFormErrors,
} from "@/lib/admin/broadcast";
import type { Broadcast, BroadcastBody, BroadcastPreview } from "@/lib/admin/types";
import { useAdminList } from "@/lib/admin/useAdminList";
import { formatNumber } from "@/lib/format";
import { dispatchToast } from "@/lib/toast";
import { t } from "@/lib/strings";
import type { ApiResponse } from "@/lib/api";

const EMPTY: BroadcastForm = { title: "", body: "", audience: "ALL", emails: "", link: "" };
const AUDIENCE_TABS: TabItem[] = AUDIENCES.map((key) => ({ key, label: AUDIENCE_LABELS[key] }));

function targetText(target: BroadcastPreview["target"]): string {
  if (!target) return "";
  return `${target.type === "store" ? "متجر" : "منتج"}: ${target.name}`;
}

/** «إشعارات للزبائن»: إرسال إشعار جماعي (مع معاينة وتأكيد) وسجل الإرسال. */
export default function AdminBroadcastsPage() {
  const [form, setForm] = useState<BroadcastForm>(EMPTY);
  const [errors, setErrors] = useState<BroadcastFormErrors>({});
  const [failure, setFailure] = useState("");
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState<{ body: BroadcastBody; preview: BroadcastPreview } | null>(null);
  const [sending, setSending] = useState(false);
  const working = useRef(false);

  const fetcher = useCallback(({ page }: { page: number }) => fetchBroadcasts(page), []);
  const select = useCallback((res: ApiResponse) => res.broadcasts as Broadcast[] | undefined, []);
  const list = useAdminList<Broadcast>({ fetcher, select });

  const set = (patch: Partial<BroadcastForm>) => {
    setForm((current) => ({ ...current, ...patch }));
    setErrors((current) => {
      const next = { ...current };
      for (const key of Object.keys(patch) as (keyof BroadcastForm)[]) delete next[key];
      return next;
    });
    setFailure("");
  };

  function showServerFailure(res: ApiResponse) {
    const { fields, general } = serverBroadcastErrors(res);
    setErrors(fields);
    setFailure(general || (Object.keys(fields).length ? "" : res.message || t.errors.genericTitle));
  }

  async function review() {
    if (working.current) return;
    const built = buildBroadcastBody(form);
    if ("errors" in built) {
      setErrors(built.errors);
      setFailure("");
      return;
    }
    working.current = true;
    setBusy(true);
    setFailure("");
    try {
      const res = await previewBroadcast(built.body);
      if (res.success && res.preview) {
        setPending({ body: built.body, preview: res.preview });
      } else {
        showServerFailure(res);
      }
    } finally {
      working.current = false;
      setBusy(false);
    }
  }

  async function send() {
    if (!pending || working.current) return;
    working.current = true;
    setSending(true);
    try {
      const res = await sendBroadcast(pending.body);
      if (res.success && res.broadcast) {
        dispatchToast("success", `تم الإرسال — وصل إلى ${formatNumber(res.broadcast.delivered)} جهاز`);
        setForm(EMPTY);
        setErrors({});
        setFailure("");
        list.reload();
      } else {
        showServerFailure(res);
      }
      setPending(null);
    } finally {
      working.current = false;
      setSending(false);
    }
  }

  const emailCount = form.audience === "EMAILS" ? parseEmails(form.emails).length : 0;
  const preview = pending?.preview;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="إشعارات للزبائن"
        subtitle="إشعار جماعي لزبائن التطبيق المسجّلين. الضيوف ما بيوصلهم شي."
      />

      <Card>
        <CardBody>
          <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
            <div className="flex flex-col gap-4">
              {failure && <ErrorBanner message={failure} />}

              <div className="flex flex-col gap-1">
                <Input
                  id="broadcast-title"
                  label="العنوان"
                  value={form.title}
                  onChange={(title) => set({ title })}
                  maxLength={BROADCAST_LIMITS.title}
                  error={errors.title}
                  required
                />
                <span className="ltr-nums text-xs text-text-secondary">
                  {form.title.length}/{BROADCAST_LIMITS.title}
                </span>
              </div>

              <div className="flex flex-col gap-1">
                <Input
                  id="broadcast-body"
                  label="نص الإشعار"
                  multiline
                  rows={3}
                  value={form.body}
                  onChange={(body) => set({ body })}
                  maxLength={BROADCAST_LIMITS.body}
                  error={errors.body}
                  required
                />
                <span className="ltr-nums text-xs text-text-secondary">
                  {form.body.length}/{BROADCAST_LIMITS.body}
                </span>
              </div>

              <div className="flex flex-col gap-1.5" role="group" aria-label="الجمهور">
                <span className="text-sm font-medium text-heading">الجمهور</span>
                <Tabs
                  items={AUDIENCE_TABS}
                  active={form.audience}
                  onChange={(key) => set({ audience: key as BroadcastForm["audience"] })}
                />
              </div>

              {form.audience === "EMAILS" && (
                <div className="flex flex-col gap-1">
                  <Input
                    id="broadcast-emails"
                    label="الإيميلات"
                    multiline
                    rows={4}
                    dir="ltr"
                    value={form.emails}
                    onChange={(emails) => set({ emails })}
                    placeholder="a@example.com, b@example.com"
                    error={errors.emails}
                  />
                  <span className="text-xs text-text-secondary">
                    {formatNumber(emailCount)} إيميل (حتى {BROADCAST_LIMITS.emails})
                  </span>
                </div>
              )}

              <div className="flex flex-col gap-1">
                <Input
                  id="broadcast-link"
                  label="رابط (اختياري)"
                  value={form.link}
                  onChange={(link) => set({ link })}
                  placeholder="https://link.vioragaza.com/s/12"
                  dir="ltr"
                  error={errors.link}
                />
                <span className="text-xs text-text-secondary">
                  انسخ رابط المتجر أو المنتج من زر المشاركة بالتطبيق
                </span>
              </div>

              <div>
                <Button onClick={review} disabled={busy || sending}>
                  {busy ? <Spinner variant="inline" /> : "مراجعة وإرسال"}
                </Button>
              </div>
            </div>

            <div aria-hidden="true" className="flex flex-col gap-2">
              <span className="text-sm font-medium text-heading">معاينة</span>
              <div className="rounded-3xl bg-surface-muted p-4">
                <div className="rounded-2xl bg-surface p-3 shadow-sm">
                  <div className="flex items-center gap-2 text-[11px] font-bold text-text-secondary">
                    <Megaphone className="size-3.5" />
                    Viora
                  </div>
                  <p className="mt-1 break-words text-sm font-bold text-heading">
                    {form.title.trim() || "عنوان الإشعار"}
                  </p>
                  <p className="mt-0.5 break-words text-xs text-text-secondary">
                    {form.body.trim() || "نص الإشعار"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardBody>
      </Card>

      <section className="flex flex-col gap-3" aria-label="سجل الإرسال">
        <h2 className="text-base font-bold text-heading">سجل الإرسال</h2>
        <ErrorBanner
          message={list.unauthorized ? t.admin.common.sessionInvalid : list.error}
          onRetry={list.unauthorized ? undefined : list.reload}
        />
        {list.loading ? (
          <Spinner />
        ) : list.rows.length === 0 && !list.error ? (
          <EmptyState icon={Megaphone} title="ما انبعت أي إشعار بعد" />
        ) : list.rows.length > 0 ? (
          <Card>
            <CardBody>
              <BroadcastsTable rows={list.rows} />
            </CardBody>
          </Card>
        ) : null}
        {list.pagination && (
          <Pagination pagination={list.pagination} disabled={list.loading} onChange={list.changePage} />
        )}
      </section>

      <ConfirmDialog
        open={pending !== null}
        title="إرسال الإشعار؟"
        tone="primary"
        body={
          preview ? (
            <div className="flex flex-col gap-2">
              <p>
                سيصل الإشعار إلى{" "}
                <span className="ltr-nums font-bold">{formatNumber(preview.recipients)}</span> زبون على{" "}
                <span className="ltr-nums font-bold">{formatNumber(preview.devices)}</span> جهاز
              </p>
              {preview.target && <p>{targetText(preview.target)}</p>}
              {preview.notFoundEmails.length > 0 && (
                <div role="note" className="rounded-xl bg-warning-soft p-3 text-warning">
                  <p className="font-bold">إيميلات ما لقينا لها زبون فعّال:</p>
                  <ul dir="ltr" className="mt-1 list-inside list-disc text-xs">
                    {preview.notFoundEmails.map((email) => (
                      <li key={email}>{email}</li>
                    ))}
                  </ul>
                </div>
              )}
              <p className="text-xs">ما في تراجع بعد الإرسال.</p>
            </div>
          ) : null
        }
        confirmLabel="إرسال"
        loading={sending}
        onConfirm={send}
        onCancel={() => setPending(null)}
      />
    </div>
  );
}

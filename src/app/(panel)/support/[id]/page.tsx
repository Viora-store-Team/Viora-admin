"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Check, Headphones } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import EmptyState from "@/components/ui/EmptyState";
import ErrorBanner from "@/components/ui/ErrorBanner";
import Input from "@/components/ui/Input";
import Spinner from "@/components/ui/Spinner";
import InfoGrid from "@/components/admin/InfoGrid";
import StatusBadge from "@/components/admin/StatusBadge";
import { fetchSupportTicket, resolveSupportTicket } from "@/lib/admin/api";
import { SUPPORT_TICKET_STATUS } from "@/lib/admin/status";
import type { AdminSupportTicket } from "@/lib/admin/types";
import { classifyStatus } from "@/lib/apiFailure";
import { formatDateTime } from "@/lib/format";
import { useFlash } from "@/lib/useFlash";
import { t } from "@/lib/strings";

function AdminSupportTicketDetailPageContent() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const rawId = Array.isArray(params?.id) ? params.id[0] : params?.id;
  const ticketId = rawId ? Number(rawId) : NaN;
  const validId = Number.isSafeInteger(ticketId) && ticketId > 0;
  const [ticket, setTicket] = useState<AdminSupportTicket | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [adminNote, setAdminNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [flash, showFlash] = useFlash();

  const reload = () => {
    setLoading(true);
    setAttempt((value) => value + 1);
  };

  useEffect(() => {
    if (!validId) {
      return;
    }
    let cancelled = false;

    void (async () => {
      const res = await fetchSupportTicket(ticketId);
      if (cancelled) return;
      setLoading(false);
      if (res.success && res.ticket) {
        setTicket(res.ticket);
        setError("");
        setNotFound(false);
        return;
      }
      const failure = classifyStatus(res);
      if (failure.kind === "notFound") {
        setNotFound(true);
        return;
      }
      setError(failure.kind === "unauthorized" ? t.admin.common.sessionInvalid : failure.message);
    })();

    return () => { cancelled = true; };
  }, [ticketId, validId, attempt]);

  const resolveTicket = async () => {
    if (!ticket) return;
    setBusy(true);
    setError("");
    const res = await resolveSupportTicket(ticket.id, adminNote.trim() || undefined);
    setBusy(false);
    if (res.success && res.ticket) {
      setTicket(res.ticket);
      setDialogOpen(false);
      showFlash(t.admin.support.didResolve);
      return;
    }
    const failure = classifyStatus(res);
    setDialogOpen(false);
    setError(failure.kind === "unauthorized" ? t.admin.common.sessionInvalid : failure.message);
    if (failure.kind === "conflict") reload();
  };

  if (loading && validId) return <Spinner />;
  if (notFound || !validId) {
    return <Card className="overflow-hidden border border-border shadow-xs"><CardBody className="p-8"><EmptyState icon={Headphones} title={t.admin.common.notFound} hint={t.admin.common.notFoundHint} action={<Button onClick={() => router.push("/support")}>{t.admin.common.backToList}</Button>} /></CardBody></Card>;
  }
  if (!ticket) return <ErrorBanner message={error || t.admin.common.loadFailed} onRetry={reload} />;

  const isOpen = ticket.status === "OPEN";
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t.admin.support.detailsTitle} subtitle={ticket.subject} action={<div className="flex flex-wrap items-center gap-3">
        {flash && <span role="status" className="flex items-center gap-1.5 rounded-xl bg-success-soft px-3 py-1.5 text-xs font-bold text-success shadow-xs"><Check className="size-4" aria-hidden="true" />{flash}</span>}
        <Button variant="secondary" onClick={() => router.push("/support")} icon={<ArrowLeft className="size-4 rtl:rotate-180" aria-hidden="true" />}>{t.admin.common.backToList}</Button>
      </div>} />
      <ErrorBanner message={error} />
      <Card><CardBody className="flex flex-wrap items-center justify-between gap-4"><StatusBadge meta={SUPPORT_TICKET_STATUS[ticket.status]} />{isOpen && <Button onClick={() => setDialogOpen(true)} icon={<Check className="size-4" aria-hidden="true" />}>{t.admin.support.resolve}</Button>}</CardBody></Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card><CardHeader title={t.admin.support.sender} /><CardBody><InfoGrid rows={[
          { label: t.admin.support.name, value: ticket.user.name },
          { label: t.admin.support.email, value: <span dir="ltr">{ticket.user.email}</span> },
          { label: t.admin.support.phone, value: ticket.user.phone ? <span dir="ltr">{ticket.user.phone}</span> : null },
          { label: t.admin.common.createdAt, value: <span className="ltr-nums">{formatDateTime(ticket.createdAt)}</span> },
        ]} /></CardBody></Card>
        <Card><CardHeader title={t.admin.support.ticket} /><CardBody><p className="whitespace-pre-wrap text-sm leading-7 text-heading">{ticket.message}</p></CardBody></Card>
      </div>

      {!isOpen && <Card><CardHeader title={t.admin.support.resolvedInfo} /><CardBody><InfoGrid rows={[
        { label: t.admin.support.adminNote, value: ticket.adminNote },
        { label: t.admin.support.resolvedAt, value: ticket.resolvedAt ? <span className="ltr-nums">{formatDateTime(ticket.resolvedAt)}</span> : null },
        { label: t.admin.support.resolvedBy, value: ticket.resolvedBy ? `${ticket.resolvedBy.name} — ${ticket.resolvedBy.email}` : null },
      ]} /></CardBody></Card>}

      <ConfirmDialog open={dialogOpen} tone="primary" title={t.admin.support.resolveTitle} body={t.admin.support.resolveBody} confirmLabel={t.admin.support.resolve} loading={busy} onConfirm={resolveTicket} onCancel={() => setDialogOpen(false)} extraAction={<div className="space-y-1.5"><Input id="support-admin-note" label={t.admin.support.adminNote} value={adminNote} onChange={setAdminNote} placeholder={t.admin.support.adminNotePlaceholder} multiline rows={4} maxLength={1000} /><p className="text-xs text-text-secondary">{adminNote.length}/1000 — {t.admin.support.noteLimit}</p></div>} />
    </div>
  );
}

export default function AdminSupportTicketDetailPage() {
  const params = useParams<{id: string}>();
  return <AdminSupportTicketDetailPageContent key={params.id} />;
}

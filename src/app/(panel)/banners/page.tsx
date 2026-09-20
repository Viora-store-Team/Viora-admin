"use client";

import { useEffect, useRef, useState } from "react";
import { ImageIcon, Upload, Save } from "lucide-react";
import Button from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import ErrorBanner from "@/components/ui/ErrorBanner";
import { fetchBanners, updateBanner } from "@/lib/admin/api";
import { uploadMany, UPLOAD_LIMITS } from "@/lib/api";
import type { Banner, BannerSlot } from "@/lib/admin/types";
import { formatDate } from "@/lib/format";

const SLOTS: BannerSlot[] = [1, 2, 3];

function BannerCard({ slot, banner, ready, onSaved }: {
  slot: BannerSlot;
  banner?: Banner;
  ready: boolean;
  onSaved: (banner: Banner) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const saving = useRef(false);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [uploadedUrl, setUploadedUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    return () => { if (preview) URL.revokeObjectURL(preview); };
  }, [preview]);

  function chooseFile(selected?: File) {
    if (!selected || saving.current) return;
    setError("");
    setNotice("");
    if (!UPLOAD_LIMITS.types.includes(selected.type as typeof UPLOAD_LIMITS.types[number])) {
      setError("اختر صورة بصيغة JPG أو PNG أو WebP.");
      return;
    }
    if (selected.size > UPLOAD_LIMITS.maxBytes || selected.size === 0) {
      setError("اختر صورة غير فارغة بحجم لا يتجاوز 10 ميجابايت.");
      return;
    }
    setFile(selected);
    setPreview(URL.createObjectURL(selected));
    setUploadedUrl("");
  }

  async function save() {
    if (!file || saving.current || !ready) return;
    saving.current = true;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      let imageUrl = uploadedUrl;
      if (!imageUrl) {
        const uploaded = await uploadMany([file]);
        if (!uploaded.urls[0]) throw new Error(uploaded.failed[0]?.message || "تعذر رفع الصورة.");
        imageUrl = uploaded.urls[0];
        setUploadedUrl(imageUrl);
      }
      const result = await updateBanner(slot, { imageUrl });
      if (!result.success) {
        const allowed = result.status === 404 && result.allowedSlots
          ? ` الخانات المتاحة: ${result.allowedSlots.join("، ")}.` : "";
        throw new Error((result.errors?.imageUrl || result.message || "تعذر حفظ البنر.") + allowed);
      }
      if (!result.banner || result.banner.slot !== slot) throw new Error("رد الحفظ غير متوقع. أعد تحميل الصفحة للتحقق من البنر.");
      onSaved(result.banner);
      setFile(null);
      setPreview("");
      setUploadedUrl("");
      setNotice("تم حفظ البنر بنجاح.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "تعذر حفظ البنر. حاول مرة أخرى.");
    } finally {
      saving.current = false;
      setBusy(false);
    }
  }

  const imageUrl = preview || banner?.imageUrl;
  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between border-b border-border p-5">
        <h2 className="font-extrabold text-heading">البنر {slot}</h2>
        <span className="rounded-full bg-field-bg px-3 py-1 text-xs text-muted">
          {!ready ? "غير متاح" : banner?.isPublished ? "منشور" : "خانة فارغة"}
        </span>
      </div>
      <div className="space-y-4 p-5" aria-busy={busy}>
        <div className="flex aspect-[1505/625] items-center justify-center overflow-hidden rounded-xl border border-border bg-field-bg">
          {imageUrl ? (
            // Uploaded and remote banner URLs are provided by the API.
            // eslint-disable-next-line @next/next/no-img-element
            <img src={imageUrl} alt={`معاينة البنر ${slot}`} className="h-full w-full object-contain" />
          ) : (
            <div className="space-y-2 text-center text-muted">
              <ImageIcon className="mx-auto size-9" />
              <p className="text-sm">{ready ? "لم تُضف صورة بعد" : "بانتظار تحميل البنر"}</p>
            </div>
          )}
        </div>
        {file && <p className="break-all text-xs text-muted">صورة جديدة: {file.name} — لم تُحفظ بعد</p>}
        <input ref={input} type="file" accept={UPLOAD_LIMITS.types.join(",")} className="hidden"
          aria-label={`اختيار صورة البنر ${slot}`} disabled={!ready || busy}
          onChange={(event) => { chooseFile(event.target.files?.[0]); event.target.value = ""; }} />
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" disabled={!ready || busy} icon={<Upload className="size-4" />} onClick={() => input.current?.click()}>
            {banner?.imageUrl ? "تغيير الصورة" : "اختيار صورة"}
          </Button>
          <Button disabled={!ready || !file || busy} icon={<Save className="size-4" />} onClick={save}>
            {busy ? "جارٍ الحفظ…" : "حفظ البنر"}
          </Button>
          {file && <Button variant="ghost" disabled={busy} onClick={() => {
            setFile(null); setPreview(""); setUploadedUrl(""); setError(""); setNotice("");
          }}>إلغاء</Button>}
        </div>
        <p className="text-xs text-muted">المقاس المناسب: 1505 × 625 بكسل — JPG، PNG أو WebP حتى 10 ميجابايت</p>
        <ErrorBanner message={error} />
        {notice && <p role="status" className="text-sm text-primary">{notice}</p>}
        {banner?.updatedAt && <p className="text-xs text-muted">آخر تعديل: {formatDate(banner.updatedAt)}</p>}
        {banner?.createdAt && <p className="text-xs text-muted">تاريخ الإنشاء: {formatDate(banner.createdAt)}</p>}
        {banner?.updatedBy && <p className="text-xs text-muted">بواسطة: {banner.updatedBy.name || banner.updatedBy.email}</p>}
      </div>
    </Card>
  );
}

export default function BannersPage() {
  const [banners, setBanners] = useState<Banner[] | null>(null);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    fetchBanners().then((result) => {
      if (!active) return;
      if (!result.success || !Array.isArray(result.banners) || result.banners.length !== 3 ||
        !SLOTS.every(slot => result.banners?.some(banner => banner.slot === slot))) {
        setError(result.message || "تعذر تحميل خانات البنرات. حاول مرة أخرى.");
        return;
      }
      setBanners(result.banners);
      setError("");
    }).catch(() => { if (active) setError("تعذر الاتصال بالخادم. حاول مرة أخرى."); });
    return () => { active = false; };
  }, [attempt]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-heading">بنرات التطبيق</h1>
        <p className="mt-2 text-sm text-muted">ثلاث خانات ثابتة تظهر بالترتيب. اختر صورة واحفظها لنشرها في التطبيق والمتجر.</p>
      </div>
      <ErrorBanner message={error} onRetry={() => { setError(""); setAttempt(value => value + 1); }} />
      {!banners && !error && <p role="status" className="text-sm text-muted">جارٍ تحميل البنرات…</p>}
      <div className="grid gap-5 xl:grid-cols-2">
        {SLOTS.map(slot => <BannerCard key={slot} slot={slot} ready={banners !== null}
          banner={banners?.find(banner => banner.slot === slot)}
          onSaved={saved => setBanners(previous => previous?.map(banner => banner.slot === saved.slot ? saved : banner) ?? null)} />)}
      </div>
    </div>
  );
}

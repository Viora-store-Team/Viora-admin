"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Check, Info, X, XCircle } from "lucide-react";
import { TOAST_EVENT, type ToastKind } from "@/lib/toast";

type ToastItem = { id: number; kind: ToastKind; message: string };

const toastStyles: Record<ToastKind, { title: string; classes: string; icon: typeof Check; duration: number }> = {
  success: { title: "تم بنجاح", classes: "border-success/25 bg-success-soft text-success", icon: Check, duration: 4200 },
  error: { title: "تعذر إتمام العملية", classes: "border-danger/25 bg-danger-soft text-danger", icon: XCircle, duration: 7000 },
  warning: { title: "تنبيه", classes: "border-warning/25 bg-warning-soft text-warning", icon: AlertTriangle, duration: 6000 },
  info: { title: "معلومة", classes: "border-info/25 bg-info-soft text-info", icon: Info, duration: 5000 },
};

export default function ToastViewport() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    const timers = new Map<number, ReturnType<typeof setTimeout>>();
    const dismiss = (id: number) => {
      const timer = timers.get(id);
      if (timer) clearTimeout(timer);
      timers.delete(id);
      setToasts((current) => current.filter((toast) => toast.id !== id));
    };
    const handleToast = (event: Event) => {
      const detail = (event as CustomEvent<{ kind?: ToastKind; message?: string }>).detail;
      if (!detail?.message?.trim()) return;
      const kind = detail.kind && detail.kind in toastStyles ? detail.kind : "info";
      const id = Date.now() + Math.random();
      setToasts((current) => [...current.slice(-2), { id, kind, message: detail.message!.trim() }]);
      timers.set(id, setTimeout(() => dismiss(id), toastStyles[kind].duration));
    };

    window.addEventListener(TOAST_EVENT, handleToast);
    return () => {
      window.removeEventListener(TOAST_EVENT, handleToast);
      timers.forEach(clearTimeout);
    };
  }, []);

  return (
    <div aria-label="إشعارات العمليات" className="pointer-events-none fixed inset-x-0 bottom-4 z-[100] flex flex-col items-center gap-2 px-3 sm:inset-x-auto sm:bottom-5 sm:start-5 sm:w-[min(92vw,420px)] sm:items-start">
      {toasts.map((toast) => {
        const style = toastStyles[toast.kind];
        const Icon = style.icon;
        return (
          <div
            key={toast.id}
            role={toast.kind === "error" ? "alert" : "status"}
            aria-live={toast.kind === "error" ? "assertive" : "polite"}
            className={`pointer-events-auto flex w-full items-start gap-3 rounded-2xl border px-4 py-3 shadow-lg backdrop-blur-sm animate-[viora-toast-in_180ms_ease-out] ${style.classes}`}
          >
            <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-xl bg-white/70" aria-hidden="true">
              <Icon className="size-[18px]" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-extrabold leading-5">{style.title}</p>
              <p className="mt-0.5 break-words text-sm leading-6">{toast.message}</p>
            </div>
            <button
              type="button"
              aria-label="إغلاق الإشعار"
              onClick={() => setToasts((current) => current.filter((item) => item.id !== toast.id))}
              className="grid size-8 shrink-0 place-items-center rounded-lg transition hover:bg-black/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current"
            >
              <X className="size-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}

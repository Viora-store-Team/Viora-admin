"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { dispatchToast } from "@/lib/toast";
import { Download } from "lucide-react";
import Button from "@/components/ui/Button";

interface InstallPrompt extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const InstallContext = createContext<{ prompt: InstallPrompt | null; ios: boolean; clear: () => void }>({ prompt: null, ios: false, clear: () => {} });

export function PwaProvider({ children }: { children: React.ReactNode }) {
  const [prompt, setPrompt] = useState<InstallPrompt | null>(null);
  const [ios, setIos] = useState(false);
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    const standalone = window.matchMedia("(display-mode: standalone)");
    const sync = () => {
      const installed = standalone.matches || (navigator as Navigator & { standalone?: boolean }).standalone;
      setIos(!installed && (/iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)));
      if (installed) setPrompt(null);
      setOffline(!navigator.onLine);
    };
    const onPrompt = (event: Event) => { event.preventDefault(); setPrompt(event as InstallPrompt); };
    const onInstalled = () => { setPrompt(null); setIos(false); };
    sync();
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    window.addEventListener("online", sync);
    window.addEventListener("offline", sync);
    standalone.addEventListener("change", sync);
    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" }).catch((error) => console.error("PWA registration failed", error));
    }
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
      window.removeEventListener("online", sync);
      window.removeEventListener("offline", sync);
      standalone.removeEventListener("change", sync);
    };
  }, []);

  return <InstallContext.Provider value={{ prompt, ios, clear: () => setPrompt(null) }}>
    {offline && <div role="status" className="bg-warning-soft px-4 py-3 text-center text-sm text-warning">الاتصال بالإنترنت مقطوع. البيانات المعروضة قديمة؛ أعد الاتصال قبل تنفيذ أي عملية.</div>}
    {children}
  </InstallContext.Provider>;
}

export function InstallButton() {
  const { prompt, ios, clear } = useContext(InstallContext);
  const [help, setHelp] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  if (!prompt && !ios) return null;

  async function install() {
    if (!prompt) { setHelp(!help); return; }
    setBusy(true);
    setError("");
    try { await prompt.prompt(); await prompt.userChoice; clear(); }
    catch { const message = "تعذّر فتح التثبيت. جرّب من قائمة المتصفح."; setError(message); dispatchToast("error", message); }
    finally { setBusy(false); }
  }

  return <div className="relative">
    <Button type="button" variant="ghost" size="sm" onClick={install} disabled={busy} aria-label="تثبيت التطبيق" aria-expanded={ios ? help : undefined} className="h-10 bg-primary-soft text-sm text-primary hover:bg-primary-subtle" icon={<Download className="size-5" strokeWidth={1.75} aria-hidden="true" />}>
      <span className="hidden sm:inline">تثبيت التطبيق</span>
    </Button>
    {help && ios && <div className="absolute end-0 top-12 z-40 w-64 rounded-xl border border-border bg-surface p-4 text-sm leading-7 shadow-pop">
      افتح الموقع في Safari، واضغط مشاركة، ثم «إضافة إلى الشاشة الرئيسية».
      <Button type="button" variant="ghost" size="sm" onClick={() => setHelp(false)} className="mt-2">إغلاق</Button>
    </div>}
    {error && <p role="alert" className="absolute end-0 top-12 w-64 rounded-xl bg-surface p-3 text-sm text-danger shadow-pop">{error}</p>}
  </div>;
}

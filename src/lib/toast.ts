export type ToastKind = "success" | "error" | "warning" | "info";

export const TOAST_EVENT = "viora:toast";

export function dispatchToast(kind: ToastKind, message: string) {
  if (typeof window === "undefined" || !message.trim()) return;
  window.dispatchEvent(
    new CustomEvent(TOAST_EVENT, { detail: { kind, message: message.trim() } }),
  );
}

import type { ReactNode } from "react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return <main className="grid min-h-dvh place-items-center bg-surface px-4 py-8">{children}</main>;
}

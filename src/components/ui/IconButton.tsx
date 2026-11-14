import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

type IconButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> & {
  label: string;
  icon: ReactNode;
  variant?: "muted" | "ghost";
  size?: "sm" | "md";
  badge?: number;
  href?: string;
};

export default function IconButton({ label, icon, variant = "muted", size = "md", badge, href, className, type = "button", ...props }: IconButtonProps) {
  const classes = cn("relative inline-grid shrink-0 place-items-center rounded-xl text-icon transition-colors duration-150 hover:bg-primary-soft hover:text-primary", variant === "muted" ? "bg-surface-muted" : "bg-transparent", size === "md" ? "size-10" : "size-8", className);
  const content = <>{icon}{badge !== undefined && badge > 0 && <span className="absolute -top-1 -end-1 min-w-4 rounded-full bg-danger px-1 text-center text-[11px] font-medium text-on-primary">{badge > 99 ? "99+" : badge}</span>}</>;
  if (href) return <Link href={href} aria-label={label} title={label} className={classes}>{content}</Link>;
  return <button {...props} type={type} aria-label={label} title={label} className={classes}>{content}</button>;
}

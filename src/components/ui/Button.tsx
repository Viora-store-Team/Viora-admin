import React from "react";
import { cn } from "@/lib/cn";
import Spinner from "./Spinner";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "danger-soft";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  icon?: React.ReactNode;
  loading?: boolean;
}

const variants: Record<ButtonVariant, string> = {
  primary: "bg-primary text-on-primary hover:bg-primary-hover",
  secondary: "border border-border bg-surface text-heading hover:bg-surface-muted",
  ghost: "bg-transparent text-primary hover:bg-primary-soft",
  danger: "bg-danger text-on-primary hover:bg-danger/90",
  "danger-soft": "bg-danger-soft text-danger hover:bg-danger-soft/70",
};

const sizes: Record<ButtonSize, string> = {
  sm: "h-9 px-3 text-xs",
  md: "h-12 px-5 text-sm",
  lg: "h-13 px-6 text-base",
};

export default function Button({ children, variant = "primary", size = "md", fullWidth = false, icon, loading = false, className, type = "button", disabled, ...props }: ButtonProps) {
  return (
    <button type={type} disabled={disabled || loading} aria-busy={loading || undefined}
      className={cn("inline-flex items-center justify-center gap-2 rounded-xl font-medium transition-colors duration-150 active:scale-[.98] disabled:opacity-50", variants[variant], sizes[size], fullWidth && "w-full", className)}
      {...props}>
      {loading ? <Spinner variant="inline" /> : icon && <span className="shrink-0">{icon}</span>}
      {children}
    </button>
  );
}

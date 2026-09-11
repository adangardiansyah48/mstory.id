import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "outline" | "ghost" | "success" | "danger";
  size?: "default" | "sm" | "lg" | "icon";
  children: ReactNode;
}

export function Button({
  variant = "default",
  size = "default",
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-2xl font-medium tracking-widest uppercase transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50",
        size === "default" && "h-11 px-7 text-sm",
        size === "sm" && "h-9 px-5 text-xs",
        size === "lg" && "h-14 px-9 text-sm",
        size === "icon" && "h-10 w-10 rounded-full",
        variant === "default" &&
          "bg-[var(--brand)] text-white shadow-[0_4px_20px_-2px_rgba(192,178,158,0.4)] hover:bg-[var(--brand-hover)] active:scale-[0.98]",
        variant === "outline" &&
          "glass-inset text-[var(--ink)] active:scale-[0.98]",
        variant === "ghost" &&
          "text-[var(--muted-2)] hover:bg-[var(--brand)]/10 active:scale-[0.98]",
        variant === "success" &&
          "bg-[#4CAF50] text-white shadow-lg shadow-green-500/20 hover:bg-[#43A047] active:scale-[0.98]",
        variant === "danger" &&
          "bg-red-500 text-white shadow-lg shadow-red-500/20 hover:bg-red-600 active:scale-[0.98]",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
import type { InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export function Input({ label, error, className, id, ...props }: InputProps) {
  const inputId =
    id || (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);

  return (
    <div className="w-full">
      {label && (
        <label
          htmlFor={inputId}
          className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[var(--muted)]"
        >
          {label}
        </label>
      )}
      <input
        id={inputId}
        className={cn(
          "h-12 w-full rounded-xl border bg-white/50 px-4 text-[var(--ink)] backdrop-blur-md transition-all placeholder:text-[var(--muted-5)] focus:border-[var(--ink)] focus:bg-white/80 focus:outline-none focus:ring-2 focus:ring-[var(--bg)] focus:shadow-[0_0_0_4px_var(--glass-strong)]",
          error && "border-red-400 focus:border-red-400 focus:ring-red-200",
          className,
        )}
        {...props}
      />
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}
"use client";

import { useEffect, type ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  className?: string;
}

export function Modal({ open, onClose, children, className }: ModalProps) {
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-[var(--ink)]/40 backdrop-blur-sm" />
      <div
        className={cn(
          "glass-strong relative z-10 flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-[2rem] sm:max-h-[85dvh] sm:max-w-lg sm:rounded-[2rem]",
          className,
        )}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <button
          onClick={onClose}
          className="absolute right-4 top-4 z-20 flex h-9 w-9 items-center justify-center rounded-full bg-white/50 text-[var(--ink)] backdrop-blur-md transition-colors hover:bg-white/80"
          aria-label="Tutup"
        >
          <X className="h-5 w-5" />
        </button>
        {children}
      </div>
    </div>
  );
}
"use client";

import { useEffect, useRef } from "react";

interface UseAutoRefreshOptions {
  enabled?: boolean;
}

/**
 * Jalankan `callback` setiap `intervalMs` milidetik.
 * Refresh berjalan di latar belakang (silent) — komponen yang memakai
 * hook ini cukup menamai fungsi load-nya tanpa menampilkan spinner agar
 * UI tidak berkedip saat data diperbarui.
 */
export function useAutoRefresh(
  callback: () => void | Promise<void>,
  intervalMs: number,
  options: UseAutoRefreshOptions = {},
) {
  const { enabled = true } = options;
  const cbRef = useRef(callback);

  useEffect(() => {
    cbRef.current = callback;
  }, [callback]);

  useEffect(() => {
    if (!enabled || intervalMs <= 0) return;
    const id = window.setInterval(() => {
      void cbRef.current();
    }, intervalMs);
    return () => window.clearInterval(id);
  }, [enabled, intervalMs]);
}
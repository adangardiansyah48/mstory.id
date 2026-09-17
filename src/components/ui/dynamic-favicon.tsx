"use client";

import { useEffect } from "react";
import { getSiteSettings, getStoredPublicUrl } from "@/lib/site-settings";

const MIME_BY_EXT: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  svg: "image/svg+xml",
  ico: "image/x-icon",
};

export function DynamicFavicon() {
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      if (!supabaseUrl) return;
      try {
        const settings = await getSiteSettings();
        if (cancelled) return;
        const raw = settings.logo_url;
        if (!raw) return;
        const url = getStoredPublicUrl(raw);
        if (!url) return;
        const ext = (url.split("?")[0].split(".").pop() ?? "").toLowerCase();
        const type = MIME_BY_EXT[ext] ?? "image/png";
        document.querySelectorAll<HTMLLinkElement>('link[rel="icon"], link[rel="shortcut icon"], link[rel="apple-touch-icon"]').forEach((el) => {
          el.href = url;
          if (type) el.type = type;
        });
      } catch {
        /* fallback: favicon default tetap dipakai */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
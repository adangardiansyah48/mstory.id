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
      try {
        const settings = await getSiteSettings();
        if (cancelled) return;
        const raw = settings.logo_url;
        if (!raw) return;
        const url = getStoredPublicUrl(raw);
        if (!url) return;
        const ext = (url.split("?")[0].split(".").pop() ?? "").toLowerCase();
        const type = MIME_BY_EXT[ext] ?? "image/png";
        const setOrCreate = (rel: string) => {
          let el = document.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
          if (!el) {
            el = document.createElement("link");
            el.rel = rel;
            document.head.appendChild(el);
          }
          el.href = url;
          if (type) el.type = type;
        };
        setOrCreate("icon");
        setOrCreate("shortcut icon");
        setOrCreate("apple-touch-icon");
        document.querySelectorAll<HTMLLinkElement>('link[rel="icon"], link[rel="shortcut icon"], link[rel="apple-touch-icon"]').forEach((el) => {
          if (el.href !== url) el.href = url;
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
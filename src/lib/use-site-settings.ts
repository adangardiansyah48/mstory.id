"use client";

import { useEffect, useState } from "react";
import {
  DEFAULT_SETTINGS,
  getSiteSettings,
  peekSiteSettings,
  type SiteSettings,
} from "@/lib/site-settings";

export function useFanpageSettings(): { settings: SiteSettings; loaded: boolean } {
  const [settings, setSettings] = useState<SiteSettings>(() => {
    const peeked = peekSiteSettings();
    if (peeked) {
      return peeked;
    }
    // Fallback objek sementara sampai data ter-load.
    return {
      id: 1,
      ...DEFAULT_SETTINGS,
      updated_at: "",
    };
  });
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getSiteSettings()
      .then((data) => {
        if (cancelled) return;
        setSettings(data);
        setLoaded(true);
      })
      .catch(() => {
        if (!cancelled) setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = settings.theme_fanpage ?? "CLASSIC";
  }, [settings.theme_fanpage]);

  return { settings, loaded };
}
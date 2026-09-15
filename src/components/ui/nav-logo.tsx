"use client";

import { useFanpageSettings } from "@/lib/use-site-settings";
import { getStoredPublicUrl, parseObjectPosition } from "@/lib/site-settings";

export function NavLogo({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const { settings } = useFanpageSettings();
  const logoUrl = getStoredPublicUrl(settings.logo_url);
  const pos = parseObjectPosition(logoUrl, 50, 30);

  const sizes = {
    sm: "h-8 w-8",
    md: "h-9 w-9",
    lg: "h-10 w-10",
  };

  if (!logoUrl) {
    return (
      <span
        className={`${sizes[size]} flex shrink-0 items-center justify-center rounded-full bg-[var(--brand)]/15 font-serif text-sm font-bold text-[var(--brand)] ring-2 ring-[var(--brand)]/30`}
      >
        M
      </span>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={logoUrl}
      alt={settings.subtitle || "Mstory.id"}
      className={`${sizes[size]} shrink-0 rounded-full object-contain bg-white p-0.5 ring-2 ring-[var(--brand)]/30`}
      style={{ objectPosition: `${pos.x}% ${pos.y}%` }}
    />
  );
}

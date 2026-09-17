import type { Metadata } from "next";
import { Playfair_Display, Plus_Jakarta_Sans } from "next/font/google";
import { createClient } from "@/lib/supabase/server";
import { DynamicFavicon } from "@/components/ui/dynamic-favicon";
import "./globals.css";

async function resolveFanpageUrl(
  field: "logo_url" | "banner_url",
): Promise<string | null> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) return null;
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("linktree_settings")
      .select(field)
      .maybeSingle();
    const row = data as Record<string, string | null> | null;
    const raw = row?.[field];
    if (!raw) return null;
    return /^(https?:)?\/\//.test(raw)
      ? raw
      : `${supabaseUrl}/storage/v1/object/public/${raw}`;
  } catch {
    return null;
  }
}

const faviconCache: { url: string | null; expiresAt: number } = {
  url: null,
  expiresAt: 0,
};

async function getCachedFavicon(): Promise<string | null> {
  const now = Date.now();
  if (faviconCache.url !== null || faviconCache.expiresAt > now) {
    if (faviconCache.expiresAt > now) return faviconCache.url;
  }
  const url = await resolveFanpageUrl("logo_url");
  faviconCache.url = url;
  faviconCache.expiresAt = now + 60_000;
  return url;
}

const playfair = Playfair_Display({
  variable: "--font-serif",
  subsets: ["latin"],
  display: "swap",
});

const plusJakarta = Plus_Jakarta_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

export async function generateMetadata(): Promise<Metadata> {
  const favicon = await getCachedFavicon();
  const base: Metadata = {
    title: "Mstory.id — Photography & Videography",
    description:
      "Abadikan momen berharga Anda bersama Mstory.id. Photography & Videography profesional di Tasikmalaya. Booking online & kalkulator estimasi mudah.",
    openGraph: {
      title: "Mstory.id — Photography & Videography",
      description:
        "Abadikan momen berharga Anda bersama Mstory.id. Booking online & kalkulator estimasi mudah.",
      type: "website",
    },
  };
  if (favicon) {
    base.icons = {
      icon: [{ url: favicon, type: "image/png" }],
      shortcut: favicon,
      apple: favicon,
    };
  }
  return base;
}

// Atribut yang disisipkan ekstensi browser (Bitdefender/Urban VPN/audio-reader,
// dll.) sebelum React hydrasi menyebabkan mismatch hydration warning.
const EXTENSION_ATTR_STRIP_SCRIPT = `
(function(){
  var ATTRS = [
    "bis_skin_checked",
    "bis_register",
    "data-google-query-id",
    "data-new-gr-c-s-check-loaded",
    "data-gr-ext-installed",
    "data-lt-installed",
    "data-lt-tmp-id"
  ];
  function strip(root) {
    if (!root || !root.removeAttribute) return;
    for (var i = 0; i < ATTRS.length; i++) {
      if (root.hasAttribute(ATTRS[i])) root.removeAttribute(ATTRS[i]);
    }
    var attrs = root.attributes;
    if (attrs) {
      for (var j = attrs.length - 1; j >= 0; j--) {
        var name = attrs[j].name;
        if (name.indexOf("__processed_") === 0 && name.lastIndexOf("__") === name.length - 2) {
          root.removeAttribute(name);
        }
      }
    }
  }
  strip(document.documentElement);
  document.querySelectorAll("[bis_skin_checked],[bis_register],[__processed_]").forEach(strip);
  var obs = new MutationObserver(function(muts){
    for (var k = 0; k < muts.length; k++) {
      var t = muts[k].target;
      if (t && t.nodeType === 1) strip(t);
    }
  });
  obs.observe(document.documentElement, { attributes: true, attributeFilter: ATTRS.concat("__processed_"), subtree: true });
  setTimeout(function(){ obs.disconnect(); }, 5000);
})();
`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="id"
      className={`${playfair.variable} ${plusJakarta.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body
        className="min-h-full bg-[var(--bg)] text-[var(--ink)]"
        suppressHydrationWarning
      >
        <script dangerouslySetInnerHTML={{ __html: EXTENSION_ATTR_STRIP_SCRIPT }} />
        <DynamicFavicon />
        {children}
      </body>
    </html>
  );
}
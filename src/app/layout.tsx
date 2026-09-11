import type { Metadata } from "next";
import { Playfair_Display, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

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

export const metadata: Metadata = {
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
        {children}
      </body>
    </html>
  );
}
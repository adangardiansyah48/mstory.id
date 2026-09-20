"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  BarChart3,
  CalendarDays,
  DollarSign,
  LayoutTemplate,
  LogOut,
  Package,
  Settings,
  Globe,
  Users,
  Handshake,
} from "lucide-react";
import { FinanceTab } from "@/components/admin/finance-tab";
import { cn } from "@/lib/utils";
import Swal from "sweetalert2";
import { BookingTab } from "@/components/admin/booking-tab";
import { PackagesTab } from "@/components/admin/packages-tab";
import { SlaTab } from "@/components/admin/sla-tab";
import { OverviewTab } from "@/components/admin/overview-tab";
import { SettingsTab } from "@/components/admin/settings-tab";
import { WebsiteTab } from "@/components/admin/website-tab";
import { AccountsTab } from "@/components/admin/accounts-tab";
import { VendorsTab } from "@/components/admin/vendors-tab";
import { getSiteSettings, getStoredPublicUrl } from "@/lib/site-settings";

type Tab = "overview" | "bookings" | "packages" | "sla" | "finance" | "website" | "accounts" | "settings" | "vendors";

export function AdminDashboardClient({ email }: { email: string }) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("overview");
  const [refreshKey, setRefreshKey] = useState(0);
  const [adminTheme, setAdminTheme] = useState("CLASSIC");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [logoPos, setLogoPos] = useState({ x: 50, y: 50 });

  useEffect(() => {
    let cancelled = false;
    getSiteSettings()
      .then((data) => {
        if (cancelled) return;
        setAdminTheme(data.theme_admin ?? "CLASSIC");
        setLogoUrl(getStoredPublicUrl(data.logo_url));
        try {
          const u = new URL(getStoredPublicUrl(data.logo_url) ?? "");
          const x = Number(u.searchParams.get("x"));
          const y = Number(u.searchParams.get("y"));
          setLogoPos({
            x: Number.isFinite(x) && x >= 0 && x <= 100 ? x : 50,
            y: Number.isFinite(y) && y >= 0 && y <= 100 ? y : 50,
          });
        } catch {
          /* posisi default */
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSignOut() {
    const confirmed = await Swal.fire({
      icon: "question",
      title: "Keluar dari Dashboard?",
      text: "Anda harus login kembali untuk mengelola booking.",
      showCancelButton: true,
      confirmButtonText: "Ya, Keluar",
      cancelButtonText: "Batal",
      confirmButtonColor: "#dc2626",
    });
    if (!confirmed.isConfirmed) return;

    const supabase = createClient();
    if (!supabase) return;
    await supabase.auth.signOut();
    await Swal.fire({
      icon: "success",
      title: "Berhasil Keluar",
      text: "Sampai jumpa lagi!",
      timer: 1000,
      showConfirmButton: false,
    });
    router.push("/admin/login");
    router.refresh();
  }

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: "overview", label: "Ringkasan", icon: <BarChart3 className="h-4 w-4" /> },
    { key: "bookings", label: "Booking", icon: <CalendarDays className="h-4 w-4" /> },
    { key: "packages", label: "Paket", icon: <Package className="h-4 w-4" /> },
    { key: "sla", label: "SLA Tracker", icon: <Settings className="h-4 w-4" /> },
    { key: "finance", label: "Laporan Keuangan", icon: <DollarSign className="h-4 w-4" /> },
    { key: "website", label: "Website", icon: <Globe className="h-4 w-4" /> },
    { key: "accounts", label: "Akun", icon: <Users className="h-4 w-4" /> },
    { key: "vendors", label: "Vendor", icon: <Handshake className="h-4 w-4" /> },
    { key: "settings", label: "Pengaturan", icon: <LayoutTemplate className="h-4 w-4" /> },
  ];

  return (
    <div
      className="relative mx-auto flex min-h-dvh w-full max-w-7xl flex-col overflow-x-hidden bg-[var(--bg)]"
      data-theme={adminTheme}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
      >
        <div className="absolute -left-24 -top-24 h-96 w-96 rounded-full bg-[#EADFD0]/35 blur-3xl" />
        <div className="absolute right-0 top-1/4 h-[28rem] w-[28rem] rounded-full bg-[#E4D9C8]/40 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-96 w-96 rounded-full bg-[#EFE6D8]/45 blur-3xl" />
      </div>

      <header className="sticky top-0 z-30 border-b border-[var(--line)] bg-[var(--bg)]/85 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-6 py-3">
          <div className="flex items-center gap-3">
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={logoUrl}
                alt="Mstory.id"
                className="h-12 w-12 shrink-0 rounded-full object-contain bg-white p-1 ring-2 ring-[var(--brand)]/30"
                style={{ objectPosition: `${logoPos.x}% ${logoPos.y}%` }}
              />
            ) : (
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[var(--brand)]/15 font-serif text-lg font-bold text-[var(--brand)] ring-2 ring-[var(--brand)]/30">
                M
              </div>
            )}
            <div>
              <h1 className="font-serif text-xl font-semibold text-[var(--ink)]">
                Mstory.id Admin
              </h1>
              <p className="text-xs text-[var(--muted)]">{email}</p>
            </div>
          </div>
          <button
            onClick={handleSignOut}
            className="glass-inset flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold text-[var(--muted)] transition-colors hover:text-red-600"
          >
            <LogOut className="h-4 w-4" />
            Keluar
          </button>
        </div>
        <nav className="mx-auto flex w-full max-w-7xl gap-1.5 overflow-x-auto px-6 pb-2.5">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={cn(
                "flex shrink-0 items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold transition-all",
                tab === t.key
                  ? "bg-[var(--brand)] text-white shadow-[0_4px_20px_-2px_rgba(192,178,158,0.4)]"
                  : "text-[var(--muted)] hover:bg-white/70 hover:text-[var(--ink)]",
              )}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </nav>
      </header>

      <main className="relative mx-auto w-full max-w-7xl flex-1 px-6 py-7">
        <div className={cn(tab !== "overview" && "hidden")}>
          <OverviewTab refreshKey={refreshKey} onNavigate={setTab} />
        </div>
        <div className={cn(tab !== "bookings" && "hidden")}>
          <BookingTab onChanged={() => setRefreshKey((k) => k + 1)} onNavigate={setTab} />
        </div>
        <div className={cn(tab !== "packages" && "hidden")}>
          <PackagesTab />
        </div>
        <div className={cn(tab !== "sla" && "hidden")}>
          <SlaTab />
        </div>
        <div className={cn(tab !== "finance" && "hidden")}>
          <FinanceTab />
        </div>
        <div className={cn(tab !== "website" && "hidden")}>
          <WebsiteTab />
        </div>
        <div className={cn(tab !== "accounts" && "hidden")}>
          <AccountsTab />
        </div>
        <div className={cn(tab !== "vendors" && "hidden")}>
          <VendorsTab />
        </div>
        <div className={cn(tab !== "settings" && "hidden")}>
          <SettingsTab onThemeChanged={(theme) => setAdminTheme(theme)} />
        </div>
      </main>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  BarChart3,
  CalendarDays,
  LayoutTemplate,
  LogOut,
  Package,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { BookingTab } from "@/components/admin/booking-tab";
import { PackagesTab } from "@/components/admin/packages-tab";
import { SlaTab } from "@/components/admin/sla-tab";
import { OverviewTab } from "@/components/admin/overview-tab";
import { SettingsTab } from "@/components/admin/settings-tab";
import { getSiteSettings } from "@/lib/site-settings";

type Tab = "overview" | "bookings" | "packages" | "sla" | "settings";

export function AdminDashboardClient({ email }: { email: string }) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("overview");
  const [refreshKey, setRefreshKey] = useState(0);
  const [adminTheme, setAdminTheme] = useState("CLASSIC");

  useEffect(() => {
    let cancelled = false;
    getSiteSettings()
      .then((data) => {
        if (!cancelled) setAdminTheme(data.theme_admin ?? "CLASSIC");
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSignOut() {
    const supabase = createClient();
    if (!supabase) return;
    await supabase.auth.signOut();
    router.push("/admin/login");
    router.refresh();
  }

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: "overview", label: "Ringkasan", icon: <BarChart3 className="h-4 w-4" /> },
    { key: "bookings", label: "Booking", icon: <CalendarDays className="h-4 w-4" /> },
    { key: "packages", label: "Paket", icon: <Package className="h-4 w-4" /> },
    { key: "sla", label: "SLA Tracker", icon: <Settings className="h-4 w-4" /> },
    { key: "settings", label: "Pengaturan", icon: <LayoutTemplate className="h-4 w-4" /> },
  ];

  return (
    <div
      className="relative flex min-h-dvh flex-col overflow-x-hidden bg-[var(--bg)]"
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
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-3">
          <div>
            <h1 className="font-serif text-lg font-semibold text-[var(--ink)]">
              Mstory.id Admin
            </h1>
            <p className="text-[11px] text-[var(--muted)]">{email}</p>
          </div>
          <button
            onClick={handleSignOut}
            className="glass-inset flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold text-[var(--muted)] transition-colors hover:text-red-600"
          >
            <LogOut className="h-3.5 w-3.5" />
            Keluar
          </button>
        </div>
        <nav className="mx-auto flex w-full max-w-5xl gap-1 overflow-x-auto px-4 pb-2">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={cn(
                "flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold transition-all",
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

      <main className="relative z-10 mx-auto w-full max-w-5xl flex-1 px-4 py-6">
        {tab === "overview" && <OverviewTab refreshKey={refreshKey} onNavigate={setTab} />}
        {tab === "bookings" && (
          <BookingTab onChanged={() => setRefreshKey((k) => k + 1)} onNavigate={setTab} />
        )}
        {tab === "packages" && <PackagesTab />}
        {tab === "sla" && <SlaTab />}
        {tab === "settings" && (
          <SettingsTab onThemeChanged={(theme) => setAdminTheme(theme)} />
        )}
      </main>
    </div>
  );
}
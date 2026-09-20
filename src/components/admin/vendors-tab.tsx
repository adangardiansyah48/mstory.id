"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Pencil, Plus, Trash2, Search } from "lucide-react";
import Swal from "sweetalert2";
import { useAutoRefresh } from "@/lib/use-auto-refresh";

type Vendor = {
  id: number;
  code: string | null;
  name: string;
  display_name: string | null;
  whatsapp: string | null;
  email: string | null;
  fee_per_booking: number;
  is_active: boolean;
};

const EMPTY: Omit<Vendor, "id" | "code"> = {
  name: "",
  display_name: "",
  whatsapp: "",
  email: "",
  fee_per_booking: 200000,
  is_active: true,
};

export function VendorsTab() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 10;
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Vendor | null>(null);
  const [form, setForm] = useState(EMPTY);

  async function loadVendors(silent = false) {
    if (!silent) setLoading(true);
    const supabase = createClient();
    if (!supabase) { setLoading(false); return; }
    const { data, error } = await supabase.from("vendors").select("*").order("created_at", { ascending: false }).limit(200);
    if (error) console.error(error.message);
    else setVendors((data as Vendor[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    const t = window.setTimeout(() => { void loadVendors(); }, 0);
    return () => window.clearTimeout(t);
  }, []);

  useAutoRefresh(async () => { if (vendors.length) await loadVendors(true); }, 10000, { enabled: vendors.length > 0 });

  function startAdd() {
    setEditing(null);
    setForm({ ...EMPTY });
    setShowForm(true);
  }
  function startEdit(v: Vendor) {
    setEditing(v);
    setForm({ name: v.name, display_name: v.display_name ?? "", whatsapp: v.whatsapp ?? "", email: v.email ?? "", fee_per_booking: v.fee_per_booking, is_active: v.is_active });
    setShowForm(true);
  }

  async function save() {
    if (!form.name.trim()) {
      await Swal.fire({ icon: "error", title: "Nama wajib diisi" });
      return;
    }
    const supabase = createClient();
    if (!supabase) return;
    const payload = {
      name: form.name.trim(),
      display_name: (form.display_name ?? "").trim() || form.name.trim(),
      whatsapp: (form.whatsapp ?? "").trim() || null,
      email: (form.email ?? "").trim() || null,
      fee_per_booking: Math.max(0, Number(form.fee_per_booking) || 0),
      is_active: !!form.is_active,
    };
    if (editing) {
      const { error } = await supabase.from("vendors").update(payload).eq("id", editing.id);
      if (error) { await Swal.fire({ icon: "error", title: "Gagal simpan", text: error.message }); return; }
      await Swal.fire({ icon: "success", title: "Vendor diperbarui", timer: 1000, showConfirmButton: false });
    } else {
      const { error } = await supabase.from("vendors").insert(payload);
      if (error) { await Swal.fire({ icon: "error", title: "Gagal tambah", text: error.message }); return; }
      await Swal.fire({ icon: "success", title: "Vendor ditambahkan", timer: 1000, showConfirmButton: false });
    }
    setShowForm(false);
    setEditing(null);
    await loadVendors(true);
  }

  async function delVendor(v: Vendor) {
    const ok = await Swal.fire({
      icon: "warning",
      title: "Hapus vendor?",
      text: `${v.name} (${v.code ?? "tanpa kode"}) — booking lama tidak dihapus, hanya vendor_id diset null.`,
      showCancelButton: true,
      confirmButtonText: "Ya, Hapus",
      cancelButtonText: "Batal",
      confirmButtonColor: "#dc2626",
    });
    if (!ok.isConfirmed) return;
    const supabase = createClient();
    if (!supabase) return;
    const { error } = await supabase.from("vendors").delete().eq("id", v.id);
    if (error) { await Swal.fire({ icon: "error", title: "Gagal hapus", text: error.message }); return; }
    await Swal.fire({ icon: "success", title: "Terhapus", timer: 900, showConfirmButton: false });
    await loadVendors(true);
  }

  async function toggleActive(v: Vendor) {
    const supabase = createClient();
    if (!supabase) return;
    const { error } = await supabase.from("vendors").update({ is_active: !v.is_active }).eq("id", v.id);
    if (error) { await Swal.fire({ icon: "error", text: error.message }); return; }
    setVendors((prev) => prev.map((x) => (x.id === v.id ? { ...x, is_active: !v.is_active } : x)));
  }

  const filtered = vendors.filter((v) => {
    const q = search.trim().toLowerCase();
    return !q || v.name.toLowerCase().includes(q) || (v.code ?? "").toLowerCase().includes(q) || (v.whatsapp ?? "").toLowerCase().includes(q);
  });
  const visible = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  if (loading) return <div className="flex items-center justify-center py-16"><div className="h-8 w-8 animate-spin rounded-full border-[3px] border-[var(--brand)] border-t-transparent" /></div>;

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="font-serif text-lg font-semibold text-[var(--ink)]">Vendor</h2>
        <button onClick={startAdd} className="inline-flex h-11 items-center gap-1.5 rounded-xl bg-[var(--brand)] px-4 text-xs font-bold uppercase tracking-wider text-white shadow-md hover:bg-[var(--brand-hover)]">
          <Plus className="h-4 w-4" /> Tambah Vendor
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted-2)]" />
        <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(0); }} placeholder="Cari nama / kode / WA..." className="h-11 w-full rounded-xl border border-[var(--line)] bg-white pl-9 pr-4 text-sm focus:border-[var(--brand)] focus:outline-none" />
      </div>

      {showForm && (
        <div className="rounded-2xl border border-[var(--line)] bg-white p-6">
          <h3 className="font-serif text-base font-semibold text-[var(--ink)]">{editing ? "Edit Vendor" : "Tambah Vendor"}</h3>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">Nama (unik)</p>
              <input value={form.name} onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))} placeholder="Nama vendor" className="h-11 w-full rounded-xl border border-[var(--line)] bg-white px-4 text-sm focus:border-[var(--brand)] focus:outline-none" />
            </div>
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">Nama tampilan</p>
              <input value={form.display_name ?? ""} onChange={(e) => setForm((s) => ({ ...s, display_name: e.target.value }))} placeholder="Nama di invoice" className="h-11 w-full rounded-xl border border-[var(--line)] bg-white px-4 text-sm focus:border-[var(--brand)] focus:outline-none" />
            </div>
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">WhatsApp</p>
              <input value={form.whatsapp ?? ""} onChange={(e) => setForm((s) => ({ ...s, whatsapp: e.target.value }))} placeholder="0812..." className="h-11 w-full rounded-xl border border-[var(--line)] bg-white px-4 text-sm focus:border-[var(--brand)] focus:outline-none" />
            </div>
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">Fee per booking (Rp)</p>
              <input type="number" value={form.fee_per_booking} onChange={(e) => setForm((s) => ({ ...s, fee_per_booking: Number(e.target.value) }))} className="h-11 w-full rounded-xl border border-[var(--line)] bg-white px-4 text-sm focus:border-[var(--brand)] focus:outline-none" />
            </div>
            <div className="sm:col-span-2">
              <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">Email (opsional)</p>
              <input value={form.email ?? ""} onChange={(e) => setForm((s) => ({ ...s, email: e.target.value }))} className="h-11 w-full rounded-xl border border-[var(--line)] bg-white px-4 text-sm focus:border-[var(--brand)] focus:outline-none" />
            </div>
            <label className="flex items-center gap-2 text-sm font-semibold text-[var(--ink)]">
              <input type="checkbox" checked={!!form.is_active} onChange={(e) => setForm((s) => ({ ...s, is_active: e.target.checked }))} className="accent-[var(--brand)]" />
              Aktif
            </label>
          </div>
          <div className="mt-6 flex items-center gap-3">
            <button onClick={() => { setShowForm(false); setEditing(null); }} className="h-11 rounded-xl border border-[var(--line)] px-5 text-sm font-bold uppercase text-[var(--muted)]">Batal</button>
            <button onClick={save} className="h-11 rounded-xl bg-[var(--brand)] px-5 text-sm font-bold uppercase text-white shadow-lg hover:bg-[var(--brand-hover)]">Simpan</button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {visible.map((v) => (
          <div key={v.id} className="flex items-center justify-between gap-3 rounded-2xl border border-[var(--line)] bg-white px-5 py-4">
            <div className="min-w-0 flex-1">
              <p className="truncate font-mono text-sm text-[var(--ink)]">
                {v.code ?? `VEND-${v.id}`} · {v.name}
                {!v.is_active && <span className="ml-2 rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-bold text-gray-500">Nonaktif</span>}
              </p>
              <p className="truncate text-xs text-[var(--muted-2)]">
                {(v.display_name ?? v.name)} · {v.whatsapp ? `WA ${v.whatsapp}` : "tanpa WA"} · Fee Rp {Number(v.fee_per_booking).toLocaleString("id-ID")}/booking
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => toggleActive(v)} className={`rounded-full border px-3 py-1 text-[10px] font-bold ${v.is_active ? "border-green-200 bg-green-100 text-green-700" : "border-gray-200 bg-gray-100 text-gray-500"}`}>{v.is_active ? "Aktif" : "Off"}</button>
              <button onClick={() => startEdit(v)} className="text-[var(--muted)] hover:text-[var(--ink)]" title="Edit"><Pencil className="h-4 w-4" /></button>
              <button onClick={() => delVendor(v)} className="text-red-400 hover:text-red-600" title="Hapus"><Trash2 className="h-4 w-4" /></button>
            </div>
          </div>
        ))}
      </div>
      {filtered.length > PAGE_SIZE && (
        <div className="flex items-center justify-between gap-3 pt-1">
          <button type="button" onClick={() => setPage(Math.max(0, page - 1))} disabled={page === 0} className="rounded-full border border-[var(--line)] bg-white px-4 py-2 text-xs font-semibold text-[var(--muted)] hover:border-[var(--brand)] disabled:opacity-40">Sebelumnya</button>
          <span className="text-xs font-semibold text-[var(--muted)]">Halaman {page + 1} dari {Math.ceil(filtered.length / PAGE_SIZE)} ({filtered.length} data)</span>
          <button type="button" onClick={() => setPage((p) => p + 1)} disabled={(page + 1) * PAGE_SIZE >= filtered.length} className="rounded-full border border-[var(--line)] bg-white px-4 py-2 text-xs font-semibold text-[var(--muted)] hover:border-[var(--brand)] disabled:opacity-40">Berikutnya</button>
        </div>
      )}
      {filtered.length === 0 && <div className="rounded-2xl border border-[var(--line)] bg-white p-10 text-center text-sm text-[var(--muted)]">Belum ada vendor. Tambah vendor dulu.</div>}
    </div>
  );
}

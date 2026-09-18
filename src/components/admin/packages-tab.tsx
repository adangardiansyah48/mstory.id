"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { clearBookingDataCache } from "@/lib/booking-data";
import { ChevronDown, ChevronUp, Pencil, Plus, Trash2 } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { cn, formatCurrency } from "@/lib/utils";
import Swal from "sweetalert2";
import type { Addon, Category, Package as PackageRow, SubCategory } from "@/lib/types";

type EntityType = "categories" | "packages" | "addons";

type DbClient = NonNullable<ReturnType<typeof createClient>>;

async function insertRowRetry(
  supabase: DbClient,
  table: string,
  payload: Record<string, unknown>,
) {
  const first = await supabase.from(table).insert(payload).select().single();
  if (!first.error) return first;
  if ((first.error as { code?: string }).code !== "23505") return first;
  console.warn("Insert retry triggered:", first.error);
  for (let attempt = 0; attempt < 20; attempt++) {
    const { data: maxRow } = await supabase
      .from(table)
      .select("id")
      .order("id", { ascending: false })
      .limit(1)
      .maybeSingle();
    const nextId = Number((maxRow as { id?: number } | null)?.id ?? 0) + 1 + attempt;
    const retry = await supabase
      .from(table)
      .insert({ ...payload, id: nextId })
      .select()
      .single();
    if (!retry.error) return retry;
    if ((retry.error as { code?: string }).code !== "23505") return retry;
    console.warn("Insert retry attempt", attempt + 1, "failed:", retry.error);
  }
  return first;
}

interface NewPackage {
  id: number;
  sub_category_id: number;
  name: string;
  price: string;
  duration_hours: string;
  crew_info: string;
  inclusions: string;
  dp_value: string;  // Nominal Rupiah
  is_active: boolean;
}

const EMPTY_PACKAGE: NewPackage = {
  id: 0,
  sub_category_id: 0,
  name: "",
  price: "",
  duration_hours: "",
  crew_info: "",
  inclusions: "",
  dp_value: "",
  is_active: true,
};

interface NewAddon {
  id: number;
  name: string;
  price: string;
  is_active: boolean;
}

export function PackagesTab() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [subCategories, setSubCategories] = useState<SubCategory[]>([]);
  const [packages, setPackages] = useState<PackageRow[]>([]);
  const [addons, setAddons] = useState<Addon[]>([]);
  const [loading, setLoading] = useState(true);

  const [expandedCats, setExpandedCats] = useState<Record<number, boolean>>({});
  const [activeSection, setActiveSection] = useState<EntityType>("categories");

  const [newCatName, setNewCatName] = useState("");
  const [newSubName, setNewSubName] = useState("");
  const [newSubCat, setNewSubCat] = useState("");

  const [newPackage, setNewPackage] = useState<NewPackage>({ ...EMPTY_PACKAGE });
  const [editingPackageId, setEditingPackageId] = useState<number | null>(null);

  const [newAddon, setNewAddon] = useState<NewAddon>({
    id: 0,
    name: "",
    price: "",
    is_active: true,
  });
  const [editingAddonId, setEditingAddonId] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const supabase = createClient();
      if (!supabase) {
        setLoading(false);
        return;
      }
      try {
        const [c, s, p, a] = await Promise.all([
          supabase.from("categories").select("*").order("id"),
          supabase.from("sub_categories").select("*").order("id"),
          supabase.from("packages").select("*").order("id"),
          supabase.from("addons").select("*").order("id"),
        ]);
        if (cancelled) return;
        setCategories(c.data ?? []);
        setSubCategories(s.data ?? []);
        setPackages(p.data ?? []);
        setAddons(a.data ?? []);
      } catch (err) {
        console.error(err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const [showCatModal, setShowCatModal] = useState(false);
  const [showSubModal, setShowSubModal] = useState(false);
  const [showPkgModal, setShowPkgModal] = useState(false);
  const [showAddonModal, setShowAddonModal] = useState(false);

  async function addCategory() {
    if (!newCatName.trim()) {
      await Swal.fire({ icon: "error", title: "Nama Kategori Kosong", text: "Nama kategori wajib diisi." });
      return;
    }
    const supabase = createClient();
    if (!supabase) return;
    const { data, error } = await insertRowRetry(supabase, "categories", {
      name: newCatName.trim().toUpperCase(),
    });
    if (error) {
      await Swal.fire({ icon: "error", title: "Gagal Menambah", text: error.message });
      return;
    }
    if (data) {
      setCategories((prev) => [...prev, data]);
      setNewCatName("");
      setShowCatModal(false);
      await Swal.fire({ icon: "success", title: "Kategori Ditambahkan", timer: 1000, showConfirmButton: false });
      clearBookingDataCache();
    }
  }

  async function addSubCategory() {
    if (!newSubName.trim() || !newSubCat) {
      await Swal.fire({ icon: "error", title: "Data Tidak Lengkap", text: "Nama sub-kategori dan kategori induk wajib diisi." });
      return;
    }
    const supabase = createClient();
    if (!supabase) return;
    const { data, error } = await insertRowRetry(supabase, "sub_categories", {
      name: newSubName.trim(),
      category_id: Number(newSubCat),
    });
    if (error) {
      await Swal.fire({ icon: "error", title: "Gagal Menambah", text: error.message });
      return;
    }
    if (data) {
      setSubCategories((prev) => [...prev, data]);
      setNewSubName("");
      setShowSubModal(false);
      await Swal.fire({ icon: "success", title: "Sub-Kategori Ditambahkan", timer: 1000, showConfirmButton: false });
      clearBookingDataCache();
    }
  }

  async function savePackageRow() {
    if (!newPackage.name.trim() || !newPackage.sub_category_id || !newPackage.price) return;
    const supabase = createClient();
    if (!supabase) return;
    const payload = {
      sub_category_id: newPackage.sub_category_id,
      name: newPackage.name.trim(),
      price: Number(newPackage.price),
      duration_hours: newPackage.duration_hours ? Number(newPackage.duration_hours) : null,
      crew_info: newPackage.crew_info.trim() || null,
      inclusions: newPackage.inclusions.trim(),
      dp_value: Number(newPackage.dp_value || 0),
      is_active: newPackage.is_active,
    };

    if (editingPackageId !== null) {
      const { error } = await supabase
        .from("packages")
        .update(payload)
        .eq("id", editingPackageId);
      if (error) {
        await Swal.fire({
          icon: "error",
          title: "Gagal Memperbarui Paket",
          text: error.message,
          confirmButtonColor: "#A8967A",
        });
      } else {
        setPackages((prev) => prev.map((p) => (p.id === editingPackageId ? { ...p, ...payload } : p)),);
        cancelPackageEdit();
        await Swal.fire({
          icon: "success",
          title: "Paket Diperbarui",
          timer: 1000,
          showConfirmButton: false,
        });
        clearBookingDataCache();
      }
      return;
    }

    // Validate numeric fields before insertion
    const priceNum = Number(newPackage.price);
    const dpNum = Number(newPackage.dp_value || 0);
    const durationNum = newPackage.duration_hours ? Number(newPackage.duration_hours) : null;
    if (isNaN(priceNum) || isNaN(dpNum) || (durationNum !== null && isNaN(durationNum))) {
      await Swal.fire({ icon: "error", title: "Data Tidak Valid", text: "Harga, DP, dan durasi harus berupa angka yang valid." });
      return;
    }

    const { data, error } = await insertRowRetry(supabase, "packages", {
      ...payload,
      price: priceNum,
      dp_value: dpNum,
      duration_hours: durationNum,
    });
    if (!error && data) {
      setPackages((prev) => [...prev, data]);
      setNewPackage({ ...EMPTY_PACKAGE });
      await Swal.fire({
        icon: "success",
        title: "Paket Ditambahkan",
        timer: 1000,
        showConfirmButton: false,
      });
      clearBookingDataCache();
    } else if (error) {
      await Swal.fire({
        icon: "error",
        title: "Gagal Menambah",
        text: error.message,
        confirmButtonColor: "#A8967A",
      });
    }
  }

  function startPackageEdit(pkg: PackageRow) {
    setEditingPackageId(pkg.id);
    setShowPkgModal(false);
    setNewPackage({
      id: pkg.id,
      sub_category_id: pkg.sub_category_id,
      name: pkg.name,
      price: String(pkg.price),
      duration_hours: pkg.duration_hours ? String(pkg.duration_hours) : "",
      crew_info: pkg.crew_info ?? "",
      inclusions: pkg.inclusions,
      dp_value: pkg.dp_value != null ? String(pkg.dp_value) : "0",
      is_active: !!pkg.is_active,
    });
  }

  function openAddPackageModal() {
    setEditingPackageId(null);
    setNewPackage({ ...EMPTY_PACKAGE });
    setShowPkgModal(true);
  }

  function cancelPackageEdit() {
    setEditingPackageId(null);
    setShowPkgModal(false);
    setNewPackage({ ...EMPTY_PACKAGE });
  }

  async function saveAddon() {
    if (!newAddon.name.trim() || !newAddon.price) {
      await Swal.fire({ icon: "error", title: "Data Tidak Lengkap", text: "Nama dan harga wajib diisi." });
      return;
    }
    const supabase = createClient();
    if (!supabase) return;
    const priceNum = Number(newAddon.price);
    if (isNaN(priceNum)) {
      await Swal.fire({ icon: "error", title: "Data Tidak Valid", text: "Harga harus berupa angka yang valid." });
      return;
    }
    const payload = {
      name: newAddon.name.trim().toUpperCase(),
      price: priceNum,
      is_active: newAddon.is_active,
    };

    if (editingAddonId !== null) {
      const { error } = await supabase
        .from("addons")
        .update(payload)
        .eq("id", editingAddonId);
      if (error) {
        await Swal.fire({
          icon: "error",
          title: "Gagal Memperbarui Add-on",
          text: error.message,
          confirmButtonColor: "#A8967A",
        });
      } else {
        setAddons((prev) => prev.map((a) => (a.id === editingAddonId ? { ...a, ...payload } : a)),);
        setEditingAddonId(null);
        setNewAddon({ id: 0, name: "", price: "", is_active: true });
        await Swal.fire({
          icon: "success",
          title: "Add-on Diperbarui",
          timer: 1000,
          showConfirmButton: false,
        });
        clearBookingDataCache();
      }
      return;
    }

    const { data, error } = await insertRowRetry(supabase, "addons", payload);
    if (!error && data) {
      setAddons((prev) => [...prev, data]);
      setNewAddon({ id: 0, name: "", price: "", is_active: true });
      await Swal.fire({
        icon: "success",
        title: "Add-on Ditambahkan",
        timer: 1000,
        showConfirmButton: false,
      });
      clearBookingDataCache();
    } else if (error) {
      await Swal.fire({
        icon: "error",
        title: "Gagal Menambah Add-on",
        text: error.message,
        confirmButtonColor: "#A8967A",
      });
    }
  }

  function startAddonEdit(addon: Addon) {
    setEditingAddonId(addon.id);
    setShowAddonModal(false);
    setNewAddon({
      id: addon.id,
      name: addon.name,
      price: String(addon.price),
      is_active: !!addon.is_active,
    });
  }

  function openAddAddonModal() {
    setEditingAddonId(null);
    setNewAddon({ id: 0, name: "", price: "", is_active: true });
    setShowAddonModal(true);
  }

  async function deleteRow(table: string, id: number) {
    const confirmed = await Swal.fire({
      icon: "warning",
      title: "Hapus Item?",
      text: "Item ini akan dihapus permanen. Lanjutkan?",
      showCancelButton: true,
      confirmButtonText: "Ya, Hapus",
      cancelButtonText: "Batal",
      confirmButtonColor: "#dc2626",
    });
    if (!confirmed.isConfirmed) return;
    const supabase = createClient();
    if (!supabase) return;
    const { error } = await supabase.from(table).delete().eq("id", id);
    if (error) {
      console.error(error);
      await Swal.fire({ icon: "error", title: "Gagal Menghapus", text: error.message, confirmButtonColor: "#A8967A" });
      return;
    }
    if (table === "categories") {
      const subsInCat = subCategories.filter((s) => s.category_id === id);
      setCategories((prev) => prev.filter((c) => c.id !== id));
      setSubCategories((prev) => prev.filter((s) => s.category_id !== id));
      setPackages((prev) =>
        prev.filter((p) => !subsInCat.find((s) => s.id === p.sub_category_id))
      );
    } else if (table === "sub_categories") {
      setSubCategories((prev) => prev.filter((s) => s.id !== id));
      setPackages((prev) => prev.filter((p) => p.sub_category_id !== id));
    } else if (table === "packages") {
      setPackages((prev) => prev.filter((p) => p.id !== id));
    } else if (table === "addons") {
      setAddons((prev) => prev.filter((a) => a.id !== id));
    }
    await Swal.fire({ icon: "success", title: "Item Dihapus", timer: 1000, showConfirmButton: false });
    clearBookingDataCache();
  }

  async function toggleActive(table: "packages" | "addons", id: number, is_active: boolean) {
    const supabase = createClient();
    if (!supabase) return;
    const { error } = await supabase
      .from(table)
      .update({ is_active: !is_active })
      .eq("id", id);
    if (error) {
      await Swal.fire({
        icon: "error",
        title: "Gagal Memperbarui Status",
        text: error.message,
        confirmButtonColor: "#A8967A",
      });
    } else {
      if (table === "packages")
        setPackages((prev) => prev.map((p) => (p.id === id ? { ...p, is_active: !is_active } : p)));
      else
        setAddons((prev) => prev.map((a) => (a.id === id ? { ...a, is_active: !is_active } : a)));
      await Swal.fire({
        icon: "success",
        title: "Status Diperbarui",
        timer: 1000,
        showConfirmButton: false,
      });
      clearBookingDataCache();
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-[var(--brand)] border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex gap-2 overflow-x-auto">
        {(
          [
            { key: "categories", label: "Kategori" },
            { key: "packages", label: "Paket" },
            { key: "addons", label: "Add-on" },
          ] as const
        ).map((s) => (
          <button
            key={s.key}
            onClick={() => setActiveSection(s.key)}
            className={cn(
              "shrink-0 rounded-lg px-4 py-2 text-xs font-semibold transition-colors",
              activeSection === s.key
                ? "bg-[var(--ink)] text-white"
                : "bg-white text-[var(--muted)] border border-[var(--line)]",
            )}
          >
            {s.label}
          </button>
        ))}
      </div>

      {activeSection === "categories" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-[var(--muted)]">
              Daftar Kategori
            </h3>
            <button
              onClick={() => setShowCatModal(true)}
              className="inline-flex h-9 items-center gap-1.5 rounded-full bg-[var(--brand)] px-4 text-xs font-bold uppercase tracking-wider text-white shadow-md hover:bg-[var(--brand-hover)]"
            >
              <Plus className="h-3.5 w-3.5" /> Tambah Kategori
            </button>
          </div>

          <div className="space-y-3">
            {categories.map((cat) => (
              <div key={cat.id} className="rounded-2xl border border-[var(--line)] bg-white p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-[var(--ink)]">{cat.name}</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setNewSubCat(String(cat.id));
                        setShowSubModal(true);
                      }}
                      className="inline-flex items-center gap-1 rounded-lg bg-[var(--soft)] px-2.5 py-1 text-xs font-semibold text-[var(--ink)] hover:bg-[var(--line)]"
                    >
                      <Plus className="h-3 w-3" /> Sub-kategori
                    </button>
                    <button
                      onClick={() =>
                        setExpandedCats((prev) => ({
                          ...prev,
                          [cat.id]: !prev[cat.id],
                        }))
                      }
                      className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-[var(--muted)] hover:bg-[var(--soft)]"
                    >
                      {expandedCats[cat.id] ? (
                        <ChevronUp className="h-3.5 w-3.5" />
                      ) : (
                        <ChevronDown className="h-3.5 w-3.5" />
                      )}
                      Lihat
                    </button>
                    <button
                      onClick={() => deleteRow("categories", cat.id)}
                      className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-red-500 hover:bg-red-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {expandedCats[cat.id] && (
                  <div className="mt-3 space-y-2 border-t border-[var(--line)] pt-3">
                    {subCategories
                      .filter((s) => s.category_id === cat.id)
                      .map((sub) => (
                        <div
                          key={sub.id}
                          className="flex items-center justify-between rounded-xl bg-[var(--soft)]/40 px-3 py-2"
                        >
                          <div>
                            <p className="text-xs font-semibold text-[var(--ink)]">{sub.name}</p>
                            <p className="text-[10px] text-[var(--muted)]">
                              {packages.filter((p) => p.sub_category_id === sub.id).length} paket
                            </p>
                          </div>
                          <button
                            onClick={() => deleteRow("sub_categories", sub.id)}
                            className="text-red-400 hover:text-red-600"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {activeSection === "packages" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-[var(--muted)]">
              Daftar Paket
            </h3>
            <button
              onClick={openAddPackageModal}
              className="inline-flex h-9 items-center gap-1.5 rounded-full bg-[var(--brand)] px-4 text-xs font-bold uppercase tracking-wider text-white shadow-md hover:bg-[var(--brand-hover)]"
            >
              <Plus className="h-3.5 w-3.5" /> Tambah Paket
            </button>
          </div>

          <div className="space-y-2">
            {packages.map((pkg) => (
              <div
                key={pkg.id}
                className="flex items-center gap-3 rounded-xl border border-[var(--line)] bg-white px-4 py-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-[var(--ink)]">
                    {pkg.name}
                  </p>
                  <p className="text-[11px] text-[var(--muted)]">
                    {subCategories.find((s) => s.id === pkg.sub_category_id)?.name ?? "Tanpa kategori"}
                    {" · "}
                    {formatCurrency(pkg.price)}
                  </p>
                  <p className="mt-0.5 text-[10px] text-[var(--muted-2)]">
                    DP: {formatCurrency(Number(pkg.dp_value) || 0)}
                  </p>
                </div>
                <button
                  onClick={() => startPackageEdit(pkg)}
                  className="text-[var(--muted)] hover:text-[var(--ink)]"
                  title="Edit paket"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  onClick={() => toggleActive("packages", pkg.id, !!pkg.is_active)}
                  className={cn(
                    "rounded-full px-3 py-1 text-[10px] font-bold transition-colors",
                    pkg.is_active
                      ? "bg-green-100 text-green-700"
                      : "bg-gray-100 text-gray-400",
                  )}
                >
                  {pkg.is_active ? "Aktif" : "Nonaktif"}
                </button>
                <button
                  onClick={() => deleteRow("packages", pkg.id)}
                  className="text-red-400 hover:text-red-600"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeSection === "addons" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-[var(--muted)]">
              Daftar Add-on
            </h3>
            <button
              onClick={openAddAddonModal}
              className="inline-flex h-9 items-center gap-1.5 rounded-full bg-[var(--brand)] px-4 text-xs font-bold uppercase tracking-wider text-white shadow-md hover:bg-[var(--brand-hover)]"
            >
              <Plus className="h-3.5 w-3.5" /> Tambah Add-on
            </button>
          </div>
          <div className="space-y-2">
            {addons.map((addon) => (
              <div
                key={addon.id}
                className="flex items-center gap-3 rounded-xl border border-[var(--line)] bg-white px-4 py-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-[var(--ink)]">{addon.name}</p>
                  <p className="text-[11px] text-[var(--muted)]">{formatCurrency(addon.price)}</p>
                </div>
                <button
                  onClick={() => startAddonEdit(addon)}
                  className="text-[var(--muted)] hover:text-[var(--ink)]"
                  title="Edit add-on"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  onClick={() => toggleActive("addons", addon.id, !!addon.is_active)}
                  className={cn(
                    "rounded-full px-3 py-1 text-[10px] font-bold transition-colors",
                    addon.is_active
                      ? "bg-green-100 text-green-700"
                      : "bg-gray-100 text-gray-400",
                  )}
                >
                  {addon.is_active ? "Aktif" : "Nonaktif"}
                </button>
                <button
                  onClick={() => deleteRow("addons", addon.id)}
                  className="text-red-400 hover:text-red-600"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
      {(editingPackageId !== null || showPkgModal) && (
        <Modal open={true} onClose={cancelPackageEdit}>
          <div className="flex flex-col overflow-hidden">
            <div className="border-b border-white/40 px-6 pb-4 pt-6">
              <h2 className="font-serif text-xl font-semibold text-[var(--ink)]">
                {editingPackageId ? "Edit Paket" : "Tambah Paket"}
              </h2>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-6">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">Nama Paket</p>
                  <input
                    value={newPackage.name}
                    onChange={(e) => setNewPackage({ ...newPackage, name: e.target.value })}
                    placeholder="Nama paket"
                    className="h-11 w-full rounded-xl border border-[var(--line)] bg-white px-3 text-sm focus:border-[var(--brand)] focus:outline-none"
                  />
                </div>
                <div>
                  <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">Harga (Rp)</p>
                  <input
                    type="number"
                    value={newPackage.price}
                    onChange={(e) => setNewPackage({ ...newPackage, price: e.target.value })}
                    placeholder="Harga"
                    className="h-11 w-full rounded-xl border border-[var(--line)] bg-white px-3 text-sm focus:border-[var(--brand)] focus:outline-none"
                  />
                </div>
                <div>
                  <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">Sub Kategori</p>
                  <select
                    value={newPackage.sub_category_id}
                    onChange={(e) => setNewPackage({ ...newPackage, sub_category_id: Number(e.target.value) })}
                    className="h-11 w-full rounded-xl border border-[var(--line)] bg-white px-3 text-sm focus:border-[var(--brand)] focus:outline-none"
                  >
                    <option value={0}>Pilih Sub Kategori...</option>
                    {subCategories.map((s) => (
                      <option key={s.id} value={s.id}>
                        {categories.find((c) => c.id === s.category_id)?.name} - {s.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">Durasi (jam)</p>
                  <input
                    type="number"
                    value={newPackage.duration_hours}
                    onChange={(e) => setNewPackage({ ...newPackage, duration_hours: e.target.value })}
                    placeholder="Durasi"
                    className="h-11 w-full rounded-xl border border-[var(--line)] bg-white px-3 text-sm focus:border-[var(--brand)] focus:outline-none"
                  />
                </div>
                <div>
                  <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">Crew</p>
                  <input
                    value={newPackage.crew_info}
                    onChange={(e) => setNewPackage({ ...newPackage, crew_info: e.target.value })}
                    placeholder="Crew (contoh: 2 photographer)"
                    className="h-11 w-full rounded-xl border border-[var(--line)] bg-white px-3 text-sm focus:border-[var(--brand)] focus:outline-none"
                  />
                </div>
                <div className="sm:col-span-2">
                  <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">Nominal DP (Rp)</p>
                  <input
                    type="number"
                    value={newPackage.dp_value}
                    onChange={(e) => setNewPackage({ ...newPackage, dp_value: e.target.value })}
                    placeholder="Contoh: 150000"
                    className="h-11 w-full rounded-xl border border-[var(--line)] bg-white px-3 text-sm focus:border-[var(--brand)] focus:outline-none"
                  />
                  <p className="mt-1 text-[11px] text-[var(--muted)]">Masukkan nominal tetap DP dalam Rupiah.</p>
                </div>
                <div className="sm:col-span-2">
                  <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">Inclusions</p>
                  <textarea
                    value={newPackage.inclusions}
                    onChange={(e) => setNewPackage({ ...newPackage, inclusions: e.target.value })}
                    placeholder="Isi paket / inclusions"
                    className="h-24 w-full rounded-xl border border-[var(--line)] bg-white px-3 py-2 text-sm focus:border-[var(--brand)] focus:outline-none"
                  />
                </div>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 border-t border-white/40 px-6 py-4">
               <button onClick={cancelPackageEdit} className="h-11 rounded-xl border border-[var(--line)] px-5 text-sm font-bold uppercase text-[var(--muted)]">Batal</button>
               <button onClick={savePackageRow} className="h-11 rounded-xl bg-[var(--brand)] px-5 text-sm font-bold uppercase text-white shadow-lg">Simpan</button>
            </div>
          </div>
        </Modal>
      )}

      {(editingAddonId !== null || showAddonModal) && (
        <Modal open={true} onClose={() => { setEditingAddonId(null); setShowAddonModal(false); }}>
           <div className="flex flex-col overflow-hidden">
            <div className="border-b border-white/40 px-6 pb-4 pt-6">
              <h2 className="font-serif text-xl font-semibold text-[var(--ink)]">
                {editingAddonId ? "Edit Add-on" : "Tambah Add-on"}
              </h2>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-6">
               <div className="space-y-4">
                  <div>
                    <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">Nama Add-on</p>
                    <input
                      value={newAddon.name}
                      onChange={(e) => setNewAddon({ ...newAddon, name: e.target.value })}
                      placeholder="Nama"
                      className="h-11 w-full rounded-xl border border-[var(--line)] bg-white px-3 text-sm focus:border-[var(--brand)] focus:outline-none"
                    />
                  </div>
                  <div>
                    <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">Harga (Rp)</p>
                    <input
                      type="number"
                      value={newAddon.price}
                      onChange={(e) => setNewAddon({ ...newAddon, price: e.target.value })}
                      placeholder="Harga"
                      className="h-11 w-full rounded-xl border border-[var(--line)] bg-white px-3 text-sm focus:border-[var(--brand)] focus:outline-none"
                    />
                  </div>
                  <label className="flex items-center gap-2 text-sm text-[var(--ink)]">
                    <input
                      type="checkbox"
                      checked={newAddon.is_active}
                      onChange={(e) => setNewAddon({ ...newAddon, is_active: e.target.checked })}
                      className="accent-[var(--brand)]"
                    />
                    Aktif
                  </label>
               </div>
            </div>
            <div className="flex items-center justify-end gap-3 border-t border-white/40 px-6 py-4">
               <button onClick={() => { setEditingAddonId(null); setShowAddonModal(false); }} className="h-11 rounded-xl border border-[var(--line)] px-5 text-sm font-bold uppercase text-[var(--muted)]">Batal</button>
               <button onClick={saveAddon} className="h-11 rounded-xl bg-[var(--brand)] px-5 text-sm font-bold uppercase text-white shadow-lg">Simpan</button>
            </div>
          </div>
        </Modal>
      )}

      {showCatModal && (
        <Modal open={true} onClose={() => { setShowCatModal(false); setNewCatName(""); }}>
          <div className="flex flex-col overflow-hidden">
            <div className="border-b border-white/40 px-6 pb-4 pt-6">
              <h2 className="font-serif text-xl font-semibold text-[var(--ink)]">Tambah Kategori</h2>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-6">
              <div>
                <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">Nama Kategori</p>
                <input
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  placeholder="Contoh: WEDDING"
                  className="h-11 w-full rounded-xl border border-[var(--line)] bg-white px-3 text-sm focus:border-[var(--brand)] focus:outline-none"
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 border-t border-white/40 px-6 py-4">
              <button onClick={() => { setShowCatModal(false); setNewCatName(""); }} className="h-11 rounded-xl border border-[var(--line)] px-5 text-sm font-bold uppercase text-[var(--muted)]">Batal</button>
              <button onClick={addCategory} className="h-11 rounded-xl bg-[var(--brand)] px-5 text-sm font-bold uppercase text-white shadow-lg">Simpan</button>
            </div>
          </div>
        </Modal>
      )}

      {showSubModal && (
        <Modal open={true} onClose={() => { setShowSubModal(false); setNewSubName(""); }}>
          <div className="flex flex-col overflow-hidden">
            <div className="border-b border-white/40 px-6 pb-4 pt-6">
              <h2 className="font-serif text-xl font-semibold text-[var(--ink)]">Tambah Sub-Kategori</h2>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-6">
              <div className="space-y-4">
                <div>
                  <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">Kategori Induk</p>
                  <select
                    value={newSubCat}
                    onChange={(e) => setNewSubCat(e.target.value)}
                    className="h-11 w-full rounded-xl border border-[var(--line)] bg-white px-3 text-sm focus:border-[var(--brand)] focus:outline-none"
                  >
                    <option value="">Pilih kategori induk...</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">Nama Sub-Kategori</p>
                  <input
                    value={newSubName}
                    onChange={(e) => setNewSubName(e.target.value)}
                    placeholder="Contoh: PHOTO ONLY"
                    className="h-11 w-full rounded-xl border border-[var(--line)] bg-white px-3 text-sm focus:border-[var(--brand)] focus:outline-none"
                  />
                </div>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 border-t border-white/40 px-6 py-4">
              <button onClick={() => { setShowSubModal(false); setNewSubName(""); }} className="h-11 rounded-xl border border-[var(--line)] px-5 text-sm font-bold uppercase text-[var(--muted)]">Batal</button>
              <button onClick={addSubCategory} className="h-11 rounded-xl bg-[var(--brand)] px-5 text-sm font-bold uppercase text-white shadow-lg">Simpan</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
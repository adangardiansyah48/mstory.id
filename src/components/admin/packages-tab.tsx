"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { ChevronDown, ChevronUp, Package, Pencil, Plus, Trash2, X } from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import type { Addon, Category, Package as PackageRow, SubCategory } from "@/lib/types";

type EntityType = "categories" | "packages" | "addons";

interface NewPackage {
  id: number;
  sub_category_id: number;
  name: string;
  price: string;
  duration_hours: string;
  crew_info: string;
  inclusions: string;
  dp_type: "PERCENTAGE" | "FIXED";
  dp_value: string;
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
  dp_type: "PERCENTAGE",
  dp_value: "50",
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

  async function addCategory() {
    if (!newCatName.trim()) return;
    const supabase = createClient();
    if (!supabase) return;
    const { data, error } = await supabase
      .from("categories")
      .insert({ name: newCatName.trim().toUpperCase() })
      .select()
      .single();
    if (!error && data) {
      setCategories((prev) => [...prev, data]);
      setNewCatName("");
    }
  }

  async function addSubCategory() {
    if (!newSubName.trim() || !newSubCat) return;
    const supabase = createClient();
    if (!supabase) return;
    const { data, error } = await supabase
      .from("sub_categories")
      .insert({ name: newSubName.trim(), category_id: Number(newSubCat) })
      .select()
      .single();
    if (!error && data) {
      setSubCategories((prev) => [...prev, data]);
      setNewSubName("");
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
      dp_type: newPackage.dp_type,
      dp_value: Number(newPackage.dp_value || 0),
      is_active: newPackage.is_active,
    };

    if (editingPackageId !== null) {
      const { error } = await supabase
        .from("packages")
        .update(payload)
        .eq("id", editingPackageId);
      if (!error) {
        setPackages((prev) =>
          prev.map((p) => (p.id === editingPackageId ? { ...p, ...payload } : p)),
        );
        cancelPackageEdit();
      }
      return;
    }

    const { data, error } = await supabase
      .from("packages")
      .insert(payload)
      .select()
      .single();
    if (!error && data) {
      setPackages((prev) => [...prev, data]);
      setNewPackage({ ...EMPTY_PACKAGE });
    }
  }

  function startPackageEdit(pkg: PackageRow) {
    setEditingPackageId(pkg.id);
    setNewPackage({
      id: pkg.id,
      sub_category_id: pkg.sub_category_id,
      name: pkg.name,
      price: String(pkg.price),
      duration_hours: pkg.duration_hours ? String(pkg.duration_hours) : "",
      crew_info: pkg.crew_info ?? "",
      inclusions: pkg.inclusions,
      dp_type: pkg.dp_type ?? "PERCENTAGE",
      dp_value: pkg.dp_value != null ? String(pkg.dp_value) : "50",
      is_active: !!pkg.is_active,
    });
  }

  function cancelPackageEdit() {
    setEditingPackageId(null);
    setNewPackage({ ...EMPTY_PACKAGE });
  }

  async function saveAddon() {
    if (!newAddon.name.trim() || !newAddon.price) return;
    const supabase = createClient();
    if (!supabase) return;
    const payload = {
      name: newAddon.name.trim().toUpperCase(),
      price: Number(newAddon.price),
      is_active: newAddon.is_active,
    };

    if (editingAddonId !== null) {
      const { error } = await supabase
        .from("addons")
        .update(payload)
        .eq("id", editingAddonId);
      if (!error) {
        setAddons((prev) =>
          prev.map((a) => (a.id === editingAddonId ? { ...a, ...payload } : a)),
        );
        setEditingAddonId(null);
        setNewAddon({ id: 0, name: "", price: "", is_active: true });
      }
      return;
    }

    const { data, error } = await supabase
      .from("addons")
      .insert(payload)
      .select()
      .single();
    if (!error && data) {
      setAddons((prev) => [...prev, data]);
      setNewAddon({ id: 0, name: "", price: "", is_active: true });
    }
  }

  function startAddonEdit(addon: Addon) {
    setEditingAddonId(addon.id);
    setNewAddon({
      id: addon.id,
      name: addon.name,
      price: String(addon.price),
      is_active: !!addon.is_active,
    });
  }

  async function deleteRow(table: string, id: number) {
    if (!confirm("Yakin ingin menghapus item ini?")) return;
    const supabase = createClient();
    if (!supabase) return;
    const { error } = await supabase.from(table).delete().eq("id", id);
    if (!error) {
      if (table === "categories") {
        setCategories((prev) => prev.filter((c) => c.id !== id));
        setSubCategories((prev) => prev.filter((s) => s.category_id !== id));
        setPackages((prev) => prev.filter((p) => !subCategories.find((s) => s.category_id === id && s.id === p.sub_category_id)));
      } else if (table === "sub_categories") {
        setSubCategories((prev) => prev.filter((s) => s.id !== id));
        setPackages((prev) => prev.filter((p) => p.sub_category_id !== id));
      } else if (table === "packages") {
        setPackages((prev) => prev.filter((p) => p.id !== id));
      } else if (table === "addons") {
        setAddons((prev) => prev.filter((a) => a.id !== id));
      }
    }
  }

  async function toggleActive(table: "packages" | "addons", id: number, is_active: boolean) {
    const supabase = createClient();
    if (!supabase) return;
    const { error } = await supabase
      .from(table)
      .update({ is_active: !is_active })
      .eq("id", id);
    if (!error) {
      if (table === "packages")
        setPackages((prev) => prev.map((p) => (p.id === id ? { ...p, is_active: !is_active } : p)));
      else
        setAddons((prev) => prev.map((a) => (a.id === id ? { ...a, is_active: !is_active } : a)));
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
          <div className="rounded-2xl border border-[var(--line)] bg-white p-5">
            <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
              <Plus className="h-4 w-4" /> Tambah Kategori
            </h3>
            <div className="mt-3 flex gap-2">
              <input
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                placeholder="Contoh: WEDDING"
                className="h-11 flex-1 rounded-xl border border-[var(--line)] bg-white px-4 text-sm focus:border-[var(--brand)] focus:outline-none"
              />
              <button
                onClick={addCategory}
                className="h-11 rounded-xl bg-[var(--brand)] px-5 text-xs font-bold uppercase tracking-wider text-white hover:bg-[var(--brand-hover)]"
              >
                Tambah
              </button>
            </div>

            <div className="mt-4 space-y-3">
              {categories.map((cat) => (
                <div key={cat.id} className="rounded-xl border border-[var(--soft)] bg-[var(--card)]">
                  <div className="flex items-center justify-between px-4 py-3">
                    <span className="text-sm font-bold text-[var(--ink)]">{cat.name}</span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() =>
                          setExpandedCats((prev) => ({
                            ...prev,
                            [cat.id]: !prev[cat.id],
                          }))
                        }
                        className="flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-semibold text-[var(--muted)] hover:bg-[var(--soft)]"
                      >
                        {expandedCats[cat.id] ? (
                          <ChevronUp className="h-3.5 w-3.5" />
                        ) : (
                          <ChevronDown className="h-3.5 w-3.5" />
                        )}
                        Sub-kategori
                      </button>
                      <button
                        onClick={() => deleteRow("categories", cat.id)}
                        className="flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-semibold text-red-500 hover:bg-red-50"
                      >
                        <Trash2 className="h-3.5 w-3.5" /> Hapus
                      </button>
                    </div>
                  </div>

                  {expandedCats[cat.id] && (
                    <div className="space-y-2 border-t border-[var(--soft)] px-4 py-3">
                      {subCategories
                        .filter((s) => s.category_id === cat.id)
                        .map((sub) => (
                          <div
                            key={sub.id}
                            className="flex items-center justify-between rounded-lg bg-white px-3 py-2"
                          >
                            <div>
                              <p className="text-xs font-semibold text-[var(--ink)]">{sub.name}</p>
                              <p className="text-[10px] text-[var(--muted-2)]">
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
                      <div className="flex gap-2 pt-2">
                        <input
                          value={newSubName}
                          onChange={(e) => setNewSubName(e.target.value)}
                          placeholder={`Sub-kategori untuk ${cat.name}`}
                          className="h-9 flex-1 rounded-lg border border-[var(--line)] bg-white px-3 text-xs focus:border-[var(--brand)] focus:outline-none"
                        />
                        <button
                          onClick={() => {
                            setNewSubCat(String(cat.id));
                            addSubCategory();
                          }}
                          className="h-9 rounded-lg bg-[var(--brand)] px-3 text-[11px] font-bold uppercase text-white hover:bg-[var(--brand-hover)]"
                        >
                          Tambah
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeSection === "packages" && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-[var(--line)] bg-white p-5">
            <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
              <Package className="h-4 w-4" />{" "}
              {editingPackageId ? "Edit Paket" : "Tambah Paket"}
            </h3>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <select
                value={newPackage.sub_category_id}
                onChange={(e) =>
                  setNewPackage({ ...newPackage, sub_category_id: Number(e.target.value) })
                }
                className="h-11 rounded-xl border border-[var(--line)] bg-white px-3 text-sm focus:border-[var(--brand)] focus:outline-none"
              >
                <option value={0}>Pilih sub-kategori...</option>
                {subCategories.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
              <input
                value={newPackage.name}
                onChange={(e) => setNewPackage({ ...newPackage, name: e.target.value })}
                placeholder="Nama paket"
                className="h-11 rounded-xl border border-[var(--line)] bg-white px-3 text-sm focus:border-[var(--brand)] focus:outline-none"
              />
              <input
                value={newPackage.price}
                onChange={(e) => setNewPackage({ ...newPackage, price: e.target.value })}
                placeholder="Harga (Rp)"
                type="number"
                className="h-11 rounded-xl border border-[var(--line)] bg-white px-3 text-sm focus:border-[var(--brand)] focus:outline-none"
              />
              <input
                value={newPackage.duration_hours}
                onChange={(e) => setNewPackage({ ...newPackage, duration_hours: e.target.value })}
                placeholder="Durasi (jam)"
                type="number"
                className="h-11 rounded-xl border border-[var(--line)] bg-white px-3 text-sm focus:border-[var(--brand)] focus:outline-none"
              />
              <input
                value={newPackage.crew_info}
                onChange={(e) => setNewPackage({ ...newPackage, crew_info: e.target.value })}
                placeholder="Crew (contoh: 2 photographer)"
                className="h-11 rounded-xl border border-[var(--line)] bg-white px-3 text-sm focus:border-[var(--brand)] focus:outline-none"
              />
              <div className="flex gap-2">
                <select
                  value={newPackage.dp_type}
                  onChange={(e) =>
                    setNewPackage({
                      ...newPackage,
                      dp_type: e.target.value as NewPackage["dp_type"],
                    })
                  }
                  className="h-11 rounded-xl border border-[var(--line)] bg-white px-3 text-sm focus:border-[var(--brand)] focus:outline-none"
                >
                  <option value="PERCENTAGE">DP % dari total</option>
                  <option value="FIXED">DP nominal Rp</option>
                </select>
                <input
                  value={newPackage.dp_value}
                  onChange={(e) => setNewPackage({ ...newPackage, dp_value: e.target.value })}
                  placeholder={newPackage.dp_type === "PERCENTAGE" ? "%" : "Rp"}
                  type="number"
                  className="h-11 w-28 rounded-xl border border-[var(--line)] bg-white px-3 text-sm focus:border-[var(--brand)] focus:outline-none"
                />
              </div>
              <textarea
                value={newPackage.inclusions}
                onChange={(e) => setNewPackage({ ...newPackage, inclusions: e.target.value })}
                placeholder="Isi paket / inclusions (dipisah koma)"
                className="h-11 rounded-xl border border-[var(--line)] bg-white px-3 py-2 text-sm focus:border-[var(--brand)] focus:outline-none sm:col-span-2"
              />
            </div>
            <div className="mt-3 flex items-center gap-3">
              <label className="flex items-center gap-2 text-xs text-[var(--muted)]">
                <input
                  type="checkbox"
                  checked={newPackage.is_active}
                  onChange={(e) => setNewPackage({ ...newPackage, is_active: e.target.checked })}
                  className="accent-[var(--brand)]"
                />
                Aktif
              </label>
              {editingPackageId !== null && (
                <button
                  onClick={cancelPackageEdit}
                  className="flex h-11 items-center gap-1.5 rounded-xl border border-[var(--line)] px-4 text-xs font-bold uppercase tracking-wider text-[var(--muted)] hover:bg-[var(--soft)]"
                >
                  <X className="h-4 w-4" /> Batal
                </button>
              )}
              <button
                onClick={savePackageRow}
                className="ml-auto h-11 rounded-xl bg-[var(--brand)] px-5 text-xs font-bold uppercase tracking-wider text-white hover:bg-[var(--brand-hover)]"
              >
                {editingPackageId !== null ? "Simpan Perubahan" : "Tambah Paket"}
              </button>
            </div>
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
                    DP:{" "}
                    {pkg.dp_type === "FIXED"
                      ? `Rp ${Number(pkg.dp_value).toLocaleString("id-ID")}`
                      : `${pkg.dp_value}% dari total`}
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
          <div className="rounded-2xl border border-[var(--line)] bg-white p-5">
            <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
              <Plus className="h-4 w-4" />{" "}
              {editingAddonId ? "Edit Add-on" : "Tambah Add-on"}
            </h3>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <input
                value={newAddon.name}
                onChange={(e) => setNewAddon({ ...newAddon, name: e.target.value })}
                placeholder="Nama add-on (contoh: SIRAMAN)"
                className="h-11 rounded-xl border border-[var(--line)] bg-white px-3 text-sm focus:border-[var(--brand)] focus:outline-none"
              />
              <input
                value={newAddon.price}
                onChange={(e) => setNewAddon({ ...newAddon, price: e.target.value })}
                placeholder="Harga"
                type="number"
                className="h-11 rounded-xl border border-[var(--line)] bg-white px-3 text-sm focus:border-[var(--brand)] focus:outline-none"
              />
              <div className="flex gap-2">
                {editingAddonId !== null && (
                  <button
                    onClick={() => {
                      setEditingAddonId(null);
                      setNewAddon({ id: 0, name: "", price: "", is_active: true });
                    }}
                    className="flex h-11 items-center gap-1.5 rounded-xl border border-[var(--line)] px-3 text-xs font-bold uppercase tracking-wider text-[var(--muted)] hover:bg-[var(--soft)]"
                  >
                    <X className="h-4 w-4" /> Batal
                  </button>
                )}
                <button
                  onClick={saveAddon}
                  className="h-11 flex-1 rounded-xl bg-[var(--brand)] px-5 text-xs font-bold uppercase tracking-wider text-white hover:bg-[var(--brand-hover)]"
                >
                  {editingAddonId ? "Simpan" : "Tambah"}
                </button>
              </div>
            </div>
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
    </div>
  );
}
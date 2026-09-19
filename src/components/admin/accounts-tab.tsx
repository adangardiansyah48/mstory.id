"use client";

import { useEffect, useState } from "react";
import { Pencil, Trash2, Plus } from "lucide-react";
import Swal from "sweetalert2";
import { useAutoRefresh } from "@/lib/use-auto-refresh";

interface AdminUser {
  id: string;
  email: string;
  created_at: string;
}

export function AccountsTab() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const [editPassword, setEditPassword] = useState("");
  const [search, setSearch] = useState("");

  async function loadUsers(silent = false) {
    if (!silent && users.length === 0) setLoading(true);
    try {
      const res = await fetch("/api/admin/users");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Gagal load");
      setUsers(json.users ?? []);
    } catch (e) {
      if (!silent) Swal.fire({ icon: "error", title: "Gagal memuat akun", text: (e as Error).message });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const t = window.setTimeout(() => {
      void loadUsers();
    }, 0);
    return () => window.clearTimeout(t);
  }, []);

  useAutoRefresh(
    async () => {
      if (users.length === 0) return;
      await loadUsers(true);
    },
    10000,
    { enabled: users.length > 0 },
  );

  async function addUser() {
    if (!newEmail.trim() || !newPassword) {
      await Swal.fire({ icon: "error", title: "Data Tidak Lengkap", text: "Email dan password wajib diisi." });
      return;
    }
    const res = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: newEmail.trim(), password: newPassword }),
    });
    const json = await res.json();
    if (!res.ok) {
      await Swal.fire({ icon: "error", title: "Gagal menambah akun", text: json.error });
      return;
    }
    await Swal.fire({ icon: "success", title: "Akun dibuat", timer: 1200, showConfirmButton: false });
    setNewEmail("");
    setNewPassword("");
    setShowAddForm(false);
    await loadUsers(true);
  }

  async function saveEdit() {
    if (!editingUser) return;
    if (!editPassword || editPassword.length < 6) {
      await Swal.fire({ icon: "error", title: "Password tidak valid", text: "Minimal 6 karakter." });
      return;
    }
    const res = await fetch("/api/admin/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: editingUser.id, password: editPassword }),
    });
    const json = await res.json();
    if (!res.ok) {
      await Swal.fire({ icon: "error", title: "Gagal ubah password", text: json.error });
      return;
    }
    await Swal.fire({ icon: "success", title: "Password diperbarui", timer: 1200, showConfirmButton: false });
    setEditingUser(null);
    setEditPassword("");
    await loadUsers(true);
  }

  async function deleteUser(id: string, email: string) {
    const ok = await Swal.fire({
      icon: "warning",
      title: "Hapus akun?",
      text: `Hapus ${email}?`,
      showCancelButton: true,
      confirmButtonText: "Ya, Hapus",
      cancelButtonText: "Batal",
      confirmButtonColor: "#dc2626",
    });
    if (!ok.isConfirmed) return;
    const res = await fetch(`/api/admin/users?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    const json = await res.json();
    if (!res.ok) {
      await Swal.fire({ icon: "error", title: "Gagal hapus", text: json.error });
      return;
    }
    await Swal.fire({ icon: "success", title: "Akun dihapus", timer: 1000, showConfirmButton: false });
    await loadUsers(true);
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
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="font-serif text-lg font-semibold text-[var(--ink)]">Manajemen Akun</h2>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cari email..."
          className="h-11 w-full rounded-xl border border-[var(--line)] bg-white px-4 text-sm focus:border-[var(--brand)] focus:outline-none sm:w-72"
        />
        <button
          onClick={() => setShowAddForm(true)}
          className="inline-flex h-11 items-center gap-1.5 rounded-xl bg-[var(--brand)] px-4 text-xs font-bold uppercase tracking-wider text-white shadow-md hover:bg-[var(--brand-hover)]"
        >
          <Plus className="h-4 w-4" /> Tambah Akun
        </button>
      </div>

      {(showAddForm || editingUser) && (
        <div className="rounded-2xl border border-[var(--line)] bg-white p-6">
          <h3 className="font-serif text-base font-semibold text-[var(--ink)]">
            {editingUser ? "Ganti Password" : "Tambah Akun Baru"}
          </h3>
          <div className="mt-4 space-y-4">
            {editingUser ? (
              <div>
                <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">Email</p>
                <input value={editingUser.email} disabled className="h-11 w-full rounded-xl border border-[var(--line)] bg-[var(--soft)] px-4 text-sm text-[var(--muted)]" />
              </div>
            ) : (
              <div>
                <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">Email</p>
                <input
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="admin@example.com"
                  className="h-11 w-full rounded-xl border border-[var(--line)] bg-white px-4 text-sm focus:border-[var(--brand)] focus:outline-none"
                />
              </div>
            )}
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
                {editingUser ? "Password Baru (min 6 karakter)" : "Password (min 6 karakter)"}
              </p>
              <input
                type="password"
                value={editingUser ? editPassword : newPassword}
                onChange={(e) => (editingUser ? setEditPassword(e.target.value) : setNewPassword(e.target.value))}
                placeholder="••••••••"
                className="h-11 w-full rounded-xl border border-[var(--line)] bg-white px-4 text-sm focus:border-[var(--brand)] focus:outline-none"
              />
            </div>
          </div>
          <div className="mt-6 flex items-center gap-3">
            <button
              onClick={() => {
                setShowAddForm(false);
                setEditingUser(null);
                setNewEmail("");
                setNewPassword("");
                setEditPassword("");
              }}
              className="h-11 rounded-xl border border-[var(--line)] px-5 text-sm font-bold uppercase text-[var(--muted)]"
            >
              Batal
            </button>
            <button
              onClick={editingUser ? saveEdit : addUser}
              className="h-11 rounded-xl bg-[var(--brand)] px-5 text-sm font-bold uppercase text-white shadow-lg hover:bg-[var(--brand-hover)] disabled:opacity-50"
            >
              {editingUser ? "Simpan" : "Buat Akun"}
            </button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {(search.trim()
          ? users.filter((u) => u.email.toLowerCase().includes(search.trim().toLowerCase()))
          : users
        ).map((u) => (
          <div key={u.id} className="flex items-center justify-between gap-3 rounded-2xl border border-[var(--line)] bg-white px-5 py-4">
            <div className="min-w-0 flex-1">
              <p className="truncate font-mono text-sm text-[var(--ink)]">{u.email}</p>
              <p className="text-xs text-[var(--muted-2)]">Terdaftar {new Date(u.created_at).toLocaleDateString("id-ID")}</p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => { setEditingUser(u); setEditPassword(""); }} className="text-[var(--muted)] hover:text-[var(--ink)]" title="Ganti password">
                <Pencil className="h-4 w-4" />
              </button>
              <button onClick={() => deleteUser(u.id, u.email)} className="text-red-400 hover:text-red-600" title="Hapus">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {search.trim() && users.filter((u) => u.email.toLowerCase().includes(search.trim().toLowerCase())).length === 0 && (
        <div className="rounded-2xl border border-[var(--line)] bg-white p-10 text-center text-sm text-[var(--muted)]">Tidak ada akun yang cocok.</div>
      )}
      {!search.trim() && users.length === 0 && (
        <div className="rounded-2xl border border-[var(--line)] bg-white p-10 text-center text-sm text-[var(--muted)]">Belum ada akun admin.</div>
      )}
    </div>
  );
}

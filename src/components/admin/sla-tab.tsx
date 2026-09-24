"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Check, ExternalLink, Link as LinkIcon, Trash2, Eye, EyeOff, MessageSquareReply, Pencil, Save, X } from "lucide-react";
import Swal from "sweetalert2";

import { cn, formatShortDate, todayInput } from "@/lib/utils";
import {
  SLA_PRINT_WEEKS,
  SLA_RETOUCH_WEEKS,
  WORKFLOW_STATUS_LABELS,
  WORKFLOW_STEPS,
  getWorkflowStepsForSubCategory,
  isFileOnlySubCategory,
} from "@/lib/types";
import type { WorkflowStatus } from "@/lib/types";
import { useAutoRefresh } from "@/lib/use-auto-refresh";

interface ProjectRow {
  id: number;
  invoice_number: string;
  client_name: string;
  event_date: string;
  status: string;
  client: { full_name: string } | null;
  sub_category_name?: string | null;
  is_file_only?: boolean;
  project_progress: {
    id: number;
    progress_status: WorkflowStatus;
    notes?: string | null;
    drive_link?: string | null;
    expected_date?: string | null;
  }[];
}

interface ProgressPayload {
  booking_id: number;
  progress_status?: WorkflowStatus;
  notes?: string;
  drive_link?: string | null;
  expected_date?: string | null;
}

type TestimonialRow = {
  id: number;
  booking_id: number;
  client_name: string;
  rating: number;
  message: string;
  admin_reply: string | null;
  admin_replied_at?: string | null;
  is_displayed: boolean;
  created_at: string;
};

export function SlaTab() {
  const [rows, setRows] = useState<ProjectRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [workflowFilter, setWorkflowFilter] = useState<WorkflowStatus | "ALL">("ALL");
  const [dateFrom, setDateFrom] = useState(() => todayInput());
  const [dateTo, setDateTo] = useState(() => todayInput());
  const [dateFilterActive, setDateFilterActive] = useState(false);
  const [testimonials, setTestimonials] = useState<Record<number, TestimonialRow>>({});
  const [replyDraft, setReplyDraft] = useState<Record<number, string>>({});
  const [editingReplyId, setEditingReplyId] = useState<number | null>(null);
  const [testiSavingId, setTestiSavingId] = useState<number | null>(null);

  async function loadProjects(showSpinner = true) {
    if (showSpinner) setLoading(true);
    setLoadError(null);
    const supabase = createClient();
    if (!supabase) {
      setLoading(false);
      setLoadError("Supabase belum dikonfigurasi.");
      return;
    }
    const { data: bookings, error: bookingErr } = await supabase
      .from("bookings")
      .select("id, invoice_number, event_date, status, client:clients(full_name), details:booking_details(packages:packages(sub_categories:sub_categories(name)))")
      .in("status", ["LUNAS", "MENUNGGU_PELUNASAN", "MENUNGGU_DP"])
      .order("event_date", { ascending: false })
      .limit(200);

    if (bookingErr) {
      setLoadError(bookingErr.message);
      setLoading(false);
      return;
    }
    if (!bookings || bookings.length === 0) {
      setRows([]);
      setTestimonials({});
      setLoading(false);
      return;
    }
    const ids = bookings.map((b) => b.id);
    const { data: progresses, error: progErr } = await supabase.from("project_progress").select("*").in("booking_id", ids);
    if (progErr) console.error(progErr);

    const progByBooking = new Map<number, (typeof progresses extends (infer U)[] | null ? U : never)>();
    (progresses ?? []).forEach((p: unknown) => {
      const row = p as { booking_id: number };
      progByBooking.set(row.booking_id, p as never);
    });

    let testimonialData: unknown[] | null = null;
    const tRes = await supabase.from("testimonials").select("id, booking_id, client_name, rating, message, admin_reply, admin_replied_at, is_displayed, created_at").in("booking_id", ids);
    if (tRes.error) {
      const code = (tRes.error as { code?: string }).code;
      const msg = tRes.error.message ?? "";
      const isMissing = code === "42P01" || msg.includes("does not exist") || msg.includes("schema cache");
      if (!isMissing) console.error(tRes.error);
      if (isMissing) {
        const fallback = await supabase.from("testimonials").select("id, booking_id, client_name, rating, message, created_at").in("booking_id", ids);
        if (!fallback.error) testimonialData = fallback.data as unknown[];
      }
    } else testimonialData = tRes.data as unknown[];

    const testimonialsMap: Record<number, TestimonialRow> = {};
    (testimonialData ?? []).forEach((t) => {
      const row = t as TestimonialRow;
      testimonialsMap[row.booking_id] = {
        id: row.id,
        booking_id: row.booking_id,
        client_name: row.client_name,
        rating: row.rating,
        message: row.message,
        admin_reply: (row as { admin_reply?: string | null }).admin_reply ?? null,
        admin_replied_at: (row as { admin_replied_at?: string | null }).admin_replied_at ?? null,
        is_displayed: (row as { is_displayed?: boolean }).is_displayed ?? true,
        created_at: row.created_at,
      };
    });

    const STATUS_PRIORITY: Record<string, number> = { LUNAS: 0, MENUNGGU_PELUNASAN: 1, MENUNGGU_DP: 2 };
    let merged: ProjectRow[] = (bookings as unknown as never[]).map((b) => {
      const r = b as unknown as { details?: { packages?: { sub_categories?: { name?: string } } }[] };
      const subName = (r.details?.[0]?.packages?.sub_categories?.name ?? null) as string | null;
      return {
        ...(b as unknown as ProjectRow),
        sub_category_name: subName,
        is_file_only: isFileOnlySubCategory(subName),
        project_progress: progByBooking.has((b as { id: number }).id) ? [progByBooking.get((b as { id: number }).id) as unknown as ProjectRow["project_progress"][number]] : [],
      };
    });
    merged = merged.sort((a, b) => {
      const pa = STATUS_PRIORITY[a.status] ?? 99;
      const pb = STATUS_PRIORITY[b.status] ?? 99;
      if (pa !== pb) return pa - pb;
      const da = new Date(a.event_date ?? "9999-12-31").getTime();
      const db = new Date(b.event_date ?? "9999-12-31").getTime();
      if (db !== da) return db - da;
      return b.id - a.id;
    });
    setRows(merged);
    setTestimonials(testimonialsMap);
    setLoading(false);
  }

  useEffect(() => {
    const t = setTimeout(() => loadProjects(true), 0);
    return () => clearTimeout(t);
  }, []);
  useAutoRefresh(
    async () => {
      if (rows.length === 0) return;
      await loadProjects(false);
    },
    10000,
    { enabled: rows.length > 0 },
  );
  const resetPage = () => setPage(0);

  const PAGE_SIZE = 10;
  const q = search.trim().toLowerCase();
  const filteredRows = rows.filter((r) => {
    const mStatus = workflowFilter === "ALL" || r.project_progress?.[0]?.progress_status === workflowFilter;
    const mQuery = !q || r.invoice_number.toLowerCase().includes(q) || (r.client?.full_name?.toLowerCase() ?? "").includes(q);
    const mDate = !dateFilterActive || ((!dateFrom || !r.event_date || r.event_date >= dateFrom) && (!dateTo || !r.event_date || r.event_date <= dateTo));
    return mStatus && mQuery && mDate;
  });
  const visibleRows = filteredRows.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  function calcDeadline(eventDate: string, weeks: number): string {
    const d = new Date(eventDate + "T00:00:00");
    d.setDate(d.getDate() + weeks * 7);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }

  async function upsertProgress(row: ProjectRow, payload: ProgressPayload) {
    setSavingId(row.id);
    const supabase = createClient();
    if (!supabase) {
      setSavingId(null);
      return;
    }
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) {
      await Swal.fire({ icon: "error", title: "Sesi habis", text: "Silakan login ulang di /admin/login." });
      setSavingId(null);
      return;
    }
    const { data, error } = await supabase.from("project_progress").upsert(payload, { onConflict: "booking_id" }).select().single();
    if (error) {
      await Swal.fire({ icon: "error", title: "Gagal Simpan Progress", text: `${error.message} (${error.code ?? ""})` });
      setSavingId(null);
      return;
    }
    setRows((prev) =>
      prev.map((r) => {
        if (r.id === row.id) {
          return {
            ...r,
            project_progress: [
              {
                id: (data as { id: number }).id ?? r.project_progress?.[0]?.id ?? 0,
                progress_status: (data as { progress_status: WorkflowStatus }).progress_status ?? payload.progress_status ?? "SHOOTING",
                drive_link: (data as { drive_link: string | null }).drive_link ?? payload.drive_link ?? null,
                expected_date: (data as { expected_date: string | null }).expected_date ?? payload.expected_date ?? null,
              },
            ],
          };
        }
        return r;
      }),
    );
    setSavingId(null);
  }

  async function setProgressStatus(row: ProjectRow, status: WorkflowStatus) {
    await upsertProgress(row, {
      booking_id: row.id,
      progress_status: status,
      expected_date: calcDeadline(row.event_date, status === "EDIT" || status === "EDIT_DONE" ? SLA_RETOUCH_WEEKS : SLA_PRINT_WEEKS),
    });
  }

  async function setDriveLink(row: ProjectRow, link: string) {
    if (link.trim() && !/^https?:\/\//i.test(link.trim())) {
      await Swal.fire({ icon: "error", title: "Link tidak valid", text: "Gunakan https://drive.google.com/..." });
      return;
    }
    const currentStatus = row.project_progress?.[0]?.progress_status ?? "SHOOTING";
    const currentExpected = row.project_progress?.[0]?.expected_date ?? calcDeadline(row.event_date, SLA_PRINT_WEEKS);
    await upsertProgress(row, { booking_id: row.id, progress_status: currentStatus, expected_date: currentExpected, drive_link: link.trim() });
    await Swal.fire({ icon: "success", title: "Link Tersimpan", timer: 1300, showConfirmButton: false });
  }

  async function deleteDriveLink(row: ProjectRow) {
    const confirmed = await Swal.fire({
      icon: "warning",
      title: "Hapus Link?",
      text: "Link Google Drive akan dihapus.",
      showCancelButton: true,
      confirmButtonText: "Hapus",
      cancelButtonText: "Batal",
      confirmButtonColor: "#dc2626",
    });
    if (!confirmed.isConfirmed) return;
    const currentStatus = row.project_progress?.[0]?.progress_status ?? "SHOOTING";
    const currentExpected = row.project_progress?.[0]?.expected_date ?? calcDeadline(row.event_date, SLA_PRINT_WEEKS);
    await upsertProgress(row, { booking_id: row.id, progress_status: currentStatus, expected_date: currentExpected, drive_link: null });
    await Swal.fire({ icon: "success", title: "Link Dihapus", timer: 1100, showConfirmButton: false });
  }

  async function patchTestimonial(id: number, patch: Record<string, unknown>) {
    setTestiSavingId(id);
    const res = await fetch("/api/admin/testimonials", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, ...patch }) });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      await Swal.fire({ icon: "error", title: "Gagal", text: json.error ?? "Gagal memperbarui testimoni" });
      setTestiSavingId(null);
      return null;
    }
    setTestiSavingId(null);
    return json.data as TestimonialRow;
  }

  async function handleSaveReply(t: TestimonialRow) {
    const draft = (replyDraft[t.booking_id] ?? t.admin_reply ?? "").trim();
    const updated = await patchTestimonial(t.id, { admin_reply: draft });
    if (!updated) return;
    setTestimonials((prev) => ({ ...prev, [t.booking_id]: { ...t, admin_reply: updated.admin_reply ?? draft, admin_replied_at: updated.admin_replied_at ?? new Date().toISOString() } }));
    setEditingReplyId(null);
    await Swal.fire({ icon: "success", title: draft ? "Balasan tersimpan" : "Balasan dihapus", timer: 1200, showConfirmButton: false });
  }

  async function handleDeleteReply(t: TestimonialRow) {
    const c = await Swal.fire({
      icon: "warning",
      title: "Hapus balasan admin?",
      text: "Balasan akan dihapus, testimoni pelanggan tetap tampil.",
      showCancelButton: true,
      confirmButtonText: "Hapus Balasan",
      cancelButtonText: "Batal",
      confirmButtonColor: "#dc2626",
    });
    if (!c.isConfirmed) return;
    const updated = await patchTestimonial(t.id, { admin_reply: "" });
    if (!updated) return;
    setTestimonials((prev) => ({ ...prev, [t.booking_id]: { ...t, admin_reply: null, admin_replied_at: null } }));
    setReplyDraft((p) => ({ ...p, [t.booking_id]: "" }));
    setEditingReplyId(null);
    await Swal.fire({ icon: "success", title: "Balasan dihapus", timer: 1100, showConfirmButton: false });
  }

  async function handleToggleDisplay(t: TestimonialRow) {
    const updated = await patchTestimonial(t.id, { is_displayed: !t.is_displayed });
    if (!updated) return;
    setTestimonials((prev) => ({ ...prev, [t.booking_id]: { ...t, is_displayed: !t.is_displayed } }));
  }

  async function handleDeleteTestimonial(t: TestimonialRow) {
    const c = await Swal.fire({
      icon: "warning",
      title: "Hapus testimoni?",
      text: "Testimoni pelanggan akan dihapus permanen.",
      showCancelButton: true,
      confirmButtonText: "Hapus",
      cancelButtonText: "Batal",
      confirmButtonColor: "#dc2626",
    });
    if (!c.isConfirmed) return;
    const res = await fetch(`/api/admin/testimonials?id=${t.id}`, { method: "DELETE" });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      await Swal.fire({ icon: "error", title: "Gagal hapus", text: json.error ?? "" });
      return;
    }
    setTestimonials((prev) => {
      const n = { ...prev };
      delete n[t.booking_id];
      return n;
    });
    await Swal.fire({ icon: "success", title: "Terhapus", timer: 1000, showConfirmButton: false });
  }

  async function handleEditTestimonial(t: TestimonialRow) {
    const { value: form } = await Swal.fire({
      title: "Edit testimoni",
      html: `<input id="swal-name" class="swal2-input" placeholder="Nama" value="${t.client_name.replace(/"/g, "&quot;")}"><textarea id="swal-msg" class="swal2-textarea" placeholder="Pesan">${t.message.replace(/</g, "&lt;")}</textarea><input id="swal-rating" type="number" min="1" max="5" class="swal2-input" value="${t.rating}">`,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: "Simpan",
      cancelButtonText: "Batal",
      preConfirm: () => {
        const name = (document.getElementById("swal-name") as HTMLInputElement)?.value ?? "";
        const msg = (document.getElementById("swal-msg") as HTMLTextAreaElement)?.value ?? "";
        const rating = Number((document.getElementById("swal-rating") as HTMLInputElement)?.value);
        if (!name.trim() || !msg.trim()) { Swal.showValidationMessage("Nama & pesan wajib"); return null; }
        if (rating < 1 || rating > 5) { Swal.showValidationMessage("Rating 1-5"); return null; }
        return { client_name: name.trim(), message: msg.trim(), rating };
      },
    });
    if (!form) return;
    const updated = await patchTestimonial(t.id, form);
    if (!updated) return;
    setTestimonials((prev) => ({ ...prev, [t.booking_id]: { ...t, ...form } }));
    await Swal.fire({ icon: "success", title: "Testimoni diperbarui", timer: 1100, showConfirmButton: false });
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-[var(--brand)] border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1">
          <input value={search} onChange={(e) => { setSearch(e.target.value); resetPage(); }} placeholder="Cari invoice / nama..." className="h-10 w-full rounded-xl border border-[var(--line)] bg-white px-3 text-sm text-[var(--ink)] focus:border-[var(--brand)] focus:outline-none" />
        </div>
        <select value={workflowFilter} onChange={(e) => { setWorkflowFilter(e.target.value as WorkflowStatus | "ALL"); resetPage(); }} className="h-10 rounded-xl border border-[var(--line)] bg-white px-3 text-sm text-[var(--ink)] focus:border-[var(--brand)] focus:outline-none">
          <option value="ALL">Semua Tahapan</option>
          {WORKFLOW_STEPS.map((s) => (
            <option key={s} value={s}>{WORKFLOW_STATUS_LABELS[s]}</option>
          ))}
        </select>
        <input type="date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setDateFilterActive(true); resetPage(); }} title="Event dari tanggal" className="h-10 rounded-xl border border-[var(--line)] bg-white px-2.5 text-sm text-[var(--ink)]" />
        <input type="date" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setDateFilterActive(true); resetPage(); }} title="Event sampai tanggal" className="h-10 rounded-xl border border-[var(--line)] bg-white px-2.5 text-sm text-[var(--ink)]" />
        {(dateFrom || dateTo) || dateFilterActive ? (
          <button onClick={() => { setDateFrom(todayInput()); setDateTo(todayInput()); setDateFilterActive(false); resetPage(); }} className="rounded-full border border-[var(--line)] bg-white px-3 py-2 text-xs font-semibold text-[var(--muted)] hover:border-[var(--brand)]">Reset</button>
        ) : null}
      </div>
      <p className="text-xs leading-relaxed text-[var(--muted)]">SLA: Retouch foto maksimal {SLA_RETOUCH_WEEKS} minggu setelah event · Cetak/video maksimal {SLA_PRINT_WEEKS} minggu setelah event.</p>
      {loadError && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-semibold text-red-700">{loadError}</div>}

      {filteredRows.length === 0 ? (
        <div className="rounded-2xl border border-[var(--line)] bg-white p-10 text-center text-sm text-[var(--muted)]">Tidak ada project yang cocok (Lunas / Menunggu Pelunasan / Menunggu DP).</div>
      ) : (
        visibleRows.map((row) => {
          const prog = row.project_progress?.[0];
          const steps = getWorkflowStepsForSubCategory(row.sub_category_name);
          let currentIdx = steps.indexOf(prog?.progress_status ?? "SHOOTING");
          if (currentIdx === -1 && row.is_file_only) {
            const fullIdx = WORKFLOW_STEPS.indexOf(prog?.progress_status as typeof WORKFLOW_STEPS[number]);
            if (fullIdx >= WORKFLOW_STEPS.indexOf("PRINTING")) currentIdx = steps.indexOf("EDIT_DONE");
          }
          const clientName = row.client?.full_name ?? row.client_name;
          const testi = testimonials[row.id];

          return (
            <div key={row.id} className="overflow-hidden rounded-2xl border border-[var(--line)] bg-white">
              <div className="flex items-center justify-between gap-3 border-b border-[var(--soft)] px-4 py-3">
                <div>
                  <p className="text-sm font-bold text-[var(--ink)]">{clientName || "Client"}</p>
                  <p className="font-mono text-[11px] text-[var(--muted)]">{row.invoice_number} · Event {formatShortDate(row.event_date)}{row.sub_category_name ? ` · ${row.sub_category_name}` : ""}{row.is_file_only ? " · FILE ONLY" : ""}</p>
                </div>
                <span className={cn("rounded-full border px-2.5 py-1 text-[10px] font-bold", row.status === "LUNAS" ? "border-green-200 bg-green-100 text-green-700" : row.status === "MENUNGGU_DP" ? "border-orange-200 bg-orange-100 text-orange-700" : "border-blue-200 bg-blue-100 text-blue-700")}>
                  {row.status === "LUNAS" ? "Lunas" : row.status === "MENUNGGU_DP" ? "Menunggu DP" : "Menunggu Pelunasan"}
                </span>
              </div>

              <div className="space-y-4 px-4 py-4">
                <div>
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)]">Progress Pengerjaan</p>
                    <p className="text-[10px] text-[var(--muted-2)]">Estimasi Selesai: {prog?.expected_date ? formatShortDate(prog.expected_date) : formatShortDate(calcDeadline(row.event_date, row.is_file_only ? SLA_RETOUCH_WEEKS : SLA_PRINT_WEEKS))}</p>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-1">
                    {steps.map((s, i) => (
                      <button
                        key={s}
                        onClick={() => setProgressStatus(row, s)}
                        disabled={savingId === row.id || s === "RECEIVED"}
                        className={cn(
                          "flex-1 min-w-[80px] flex flex-col items-center gap-1 rounded-lg border px-1 py-2 text-[10px] font-semibold transition-colors disabled:cursor-not-allowed",
                          s === "RECEIVED" && i <= currentIdx ? "border-emerald-300 bg-emerald-50 text-emerald-700 disabled:opacity-100" : i <= currentIdx && s !== "RECEIVED" ? "border-[var(--brand)] bg-[var(--brand)]/10 text-[var(--muted-2)] disabled:opacity-50" : "border-[var(--line)] bg-white text-[var(--muted-2)] hover:border-[var(--brand)] disabled:opacity-50",
                        )}
                      >
                        {i <= currentIdx && <Check className="h-3 w-3 text-[var(--muted-2)]" />}
                        {WORKFLOW_STATUS_LABELS[s]}
                      </button>
                    ))}
                  </div>
                  <DriveLinkInput key={`${row.id}-${prog?.drive_link ?? ""}-${savingId === row.id ? savingId : "idle"}`} link={prog?.drive_link ?? ""} onSave={(link) => setDriveLink(row, link)} onDelete={() => deleteDriveLink(row)} disabled={savingId === row.id} />
                  {testi ? (
                    <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50/60 p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wider text-amber-800">Testimoni Pelanggan</p>
                          <div className="mt-1 flex items-center gap-2 text-amber-500 text-xs">{"★".repeat(testi.rating)}{"☆".repeat(5 - testi.rating)} <span className={`rounded-full border px-1.5 py-0.5 text-[10px] font-bold ${testi.is_displayed ? "border-green-200 bg-green-50 text-green-700" : "border-zinc-200 bg-zinc-50 text-zinc-600"}`}>{testi.is_displayed ? "Tampil" : "Disembunyikan"}</span></div>
                        </div>
                        <span className="shrink-0 text-[10px] text-amber-700/60">{formatShortDate(testi.created_at)}</span>
                      </div>
                      <p className="mt-2 text-xs text-amber-900 leading-relaxed">{testi.message}</p>
                      <p className="mt-1 text-[10px] text-amber-700/70">— {testi.client_name}</p>
                      {testi.admin_reply ? (
                        <div className="mt-2 rounded-lg border border-[var(--line)] bg-white p-2.5">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted)]">Balasan Admin</p>
                          <p className="mt-1 text-xs leading-relaxed text-[var(--ink)]">{testi.admin_reply}</p>
                          {testi.admin_replied_at && <p className="mt-1 text-[10px] text-[var(--muted-2)]">{formatShortDate(testi.admin_replied_at)}</p>}
                        </div>
                      ) : null}
                      {editingReplyId === testi.id ? (
                        <div className="mt-2 space-y-2">
                          <textarea value={replyDraft[testi.booking_id] ?? testi.admin_reply ?? ""} onChange={(e) => setReplyDraft((p) => ({ ...p, [testi.booking_id]: e.target.value }))} placeholder="Tulis balasan untuk pelanggan..." rows={3} className="w-full rounded-lg border border-[var(--line)] bg-white px-3 py-2 text-xs text-[var(--ink)] placeholder:text-[var(--muted-5)] focus:border-[var(--brand)] focus:outline-none" />
                          <div className="flex gap-2">
                            <button onClick={() => handleSaveReply(testi)} disabled={testiSavingId === testi.id} className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--brand)] px-3 py-2 text-xs font-bold text-white hover:bg-[var(--brand-hover)] disabled:opacity-40"><Save className="h-3.5 w-3.5" />{testi.admin_reply ? "Update balasan" : "Kirim balasan"}</button>
                            <button onClick={() => { setEditingReplyId(null); setReplyDraft((p) => ({ ...p, [testi.booking_id]: testi.admin_reply ?? "" })); }} className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--line)] bg-white px-3 py-2 text-xs font-semibold text-[var(--muted)]"><X className="h-3.5 w-3.5" />Batal</button>
                            {testi.admin_reply && <button onClick={() => handleDeleteReply(testi)} className="ml-auto text-xs font-semibold text-red-600">Hapus balasan</button>}
                          </div>
                        </div>
                      ) : (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          <button onClick={() => { setReplyDraft((p) => ({ ...p, [testi.booking_id]: testi.admin_reply ?? "" })); setEditingReplyId(testi.id); }} className="inline-flex items-center gap-1 rounded-full border border-[var(--line)] bg-white px-2.5 py-1.5 text-[11px] font-semibold text-[var(--muted)] hover:border-[var(--brand)]"><MessageSquareReply className="h-3.5 w-3.5" />{testi.admin_reply ? "Edit balasan" : "Balas"}</button>
                          {testi.admin_reply ? (
                            <button onClick={() => handleDeleteReply(testi)} disabled={testiSavingId === testi.id} className="inline-flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-2.5 py-1.5 text-[11px] font-semibold text-red-600 hover:bg-red-100 disabled:opacity-40"><Trash2 className="h-3.5 w-3.5" />Hapus balasan</button>
                          ) : null}
                          <button onClick={() => handleToggleDisplay(testi)} disabled={testiSavingId === testi.id} className="inline-flex items-center gap-1 rounded-full border border-[var(--line)] bg-white px-2.5 py-1.5 text-[11px] font-semibold text-[var(--muted)] hover:border-[var(--brand)] disabled:opacity-40">{testi.is_displayed ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}{testi.is_displayed ? "Sembunyikan" : "Tampilkan"}</button>
                          <button onClick={() => handleEditTestimonial(testi)} className="inline-flex items-center gap-1 rounded-full border border-[var(--line)] bg-white px-2.5 py-1.5 text-[11px] font-semibold text-[var(--muted)] hover:border-[var(--brand)]"><Pencil className="h-3.5 w-3.5" />Edit</button>
                          <button onClick={() => handleDeleteTestimonial(testi)} className="inline-flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-2.5 py-1.5 text-[11px] font-semibold text-red-600 hover:bg-red-100"><Trash2 className="h-3.5 w-3.5" />Hapus testimoni</button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="mt-2 text-[11px] italic text-[var(--muted-2)]">Belum ada testimoni untuk booking ini.</p>
                  )}
                </div>
              </div>
            </div>
          );
        })
      )}
      {filteredRows.length > PAGE_SIZE ? (
        <div className="flex items-center justify-between gap-3 pt-2">
          <button type="button" onClick={() => setPage(Math.max(0, page - 1))} disabled={page === 0} className="rounded-full border border-[var(--line)] bg-white px-4 py-2 text-xs font-semibold text-[var(--muted)] hover:border-[var(--brand)] disabled:opacity-40">Sebelumnya</button>
          <span className="text-xs font-semibold text-[var(--muted)]">Halaman {page + 1} dari {Math.ceil(filteredRows.length / PAGE_SIZE)} ({filteredRows.length} data)</span>
          <button type="button" onClick={() => setPage((p) => p + 1)} disabled={(page + 1) * PAGE_SIZE >= filteredRows.length} className="rounded-full border border-[var(--line)] bg-white px-4 py-2 text-xs font-semibold text-[var(--muted)] hover:border-[var(--brand)] disabled:opacity-40">Berikutnya</button>
        </div>
      ) : null}
    </div>
  );
}

function DriveLinkInput({ link, onSave, onDelete, disabled }: { link: string; onSave: (link: string) => void; onDelete: () => void; disabled?: boolean }) {
  const [dirty, setDirty] = useState(false);
  const [value, setValue] = useState(link);
  return (
    <div className="mt-2 flex items-center gap-2">
      <div className="relative flex-1">
        <LinkIcon className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--muted-2)]" />
        <input value={value} onChange={(e) => { setValue(e.target.value); setDirty(true); }} placeholder="https://drive.google.com/..." disabled={disabled} className="h-9 w-full rounded-lg border border-[var(--line)] bg-white pl-9 pr-3 text-xs text-[var(--ink)] placeholder:text-[var(--muted-5)] focus:border-[var(--brand)] focus:outline-none disabled:opacity-50" />
      </div>
      {dirty ? (
        <button onClick={() => onSave(value)} disabled={disabled || !value.trim()} className="h-9 shrink-0 rounded-lg bg-[var(--brand)] px-3 text-[11px] font-bold uppercase text-white hover:bg-[var(--brand-hover)] disabled:opacity-40">Simpan</button>
      ) : link ? (
        <>
          <a href={link} target="_blank" rel="noopener noreferrer" className="flex h-9 shrink-0 items-center gap-1 rounded-lg bg-blue-50 px-3 text-[11px] font-semibold text-blue-700 hover:bg-blue-100"><ExternalLink className="h-3 w-3" />Buka</a>
          <button onClick={onDelete} disabled={disabled} title="Hapus link" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 disabled:opacity-40"><Trash2 className="h-3.5 w-3.5" /></button>
        </>
      ) : null}
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Check, ExternalLink, Link as LinkIcon, Trash2 } from "lucide-react";
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
import type {
  WorkflowStatus,
} from "@/lib/types";
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



export function SlaTab() {
  const [rows, setRows] = useState<ProjectRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [workflowFilter, setWorkflowFilter] = useState<WorkflowStatus | "ALL">("ALL");
  const [dateFrom, setDateFrom] = useState(() => todayInput());
  const [dateTo, setDateTo] = useState(() => todayInput());
  const [dateFilterActive, setDateFilterActive] = useState(false);
  const [testimonials, setTestimonials] = useState<Record<number, { client_name: string; rating: number; message: string }>>({});

  async function loadProjects(showSpinner = true) {
    if (showSpinner) setLoading(true);
    const supabase = createClient();
    if (!supabase) {
      setLoading(false);
      return;
    }
    const { data: bookings, error: bookingErr } = await supabase
      .from("bookings")
      .select("id, invoice_number, event_date, status, client:clients(full_name), details:booking_details(packages:packages(sub_categories:sub_categories(name)))")
      .in("status", ["LUNAS", "MENUNGGU_PELUNASAN", "MENUNGGU_DP"])
      .order("event_date", { ascending: false })
      .limit(200);

    if (bookingErr) {
      console.error(bookingErr);
      setLoading(false);
      return;
    }
    if (!bookings || bookings.length === 0) {
      setRows([]);
      setLoading(false);
      return;
    }
    const ids = bookings.map((b) => b.id);
    const { data: progresses, error: progErr } = await supabase
      .from("project_progress")
      .select("*")
      .in("booking_id", ids);

    if (progErr) console.error(progErr);

    const progByBooking = new Map<number, typeof progresses extends (infer U)[] | null ? U : never>();
    (progresses ?? []).forEach((p: unknown) => {
      const row = p as { booking_id: number };
      progByBooking.set(row.booking_id, p as never);
    });

    const testimonialIds = bookings.map((b) => b.id);
    const { data: testimonialData, error: testimonialErr } = await supabase
      .from("testimonials")
      .select("booking_id, client_name, rating, message")
      .in("booking_id", testimonialIds);

    if (testimonialErr) console.error(testimonialErr);

    const testimonialsMap: Record<number, { client_name: string; rating: number; message: string }> = {};
    (testimonialData ?? []).forEach((t) => {
      const row = t as { booking_id: number; client_name: string; rating: number; message: string };
      testimonialsMap[row.booking_id] = row;
    });

    const STATUS_PRIORITY: Record<string, number> = {
      LUNAS: 0,
      MENUNGGU_PELUNASAN: 1,
      MENUNGGU_DP: 2,
    };
    let merged: ProjectRow[] = (bookings as unknown as any[]).map((b) => {
      const subName = (b.details?.[0]?.packages?.sub_categories?.name ?? null) as string | null;
      return {
        ...b,
        sub_category_name: subName,
        is_file_only: isFileOnlySubCategory(subName),
        project_progress: progByBooking.has(b.id) ? [progByBooking.get(b.id) as unknown as ProjectRow["project_progress"][number]] : [],
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
    const mStatus =
      workflowFilter === "ALL" ||
      r.project_progress?.[0]?.progress_status === workflowFilter;
    const mQuery =
      !q ||
      r.invoice_number.toLowerCase().includes(q) ||
      (r.client?.full_name?.toLowerCase() ?? "").includes(q);
    const mDate =
      !dateFilterActive ||
      ((!dateFrom || !r.event_date || r.event_date >= dateFrom) &&
        (!dateTo || !r.event_date || r.event_date <= dateTo));
    return mStatus && mQuery && mDate;
  });
  const visibleRows = filteredRows.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  function calcDeadline(eventDate: string, weeks: number): string {
    const d = new Date(eventDate + "T00:00:00");
    d.setDate(d.getDate() + weeks * 7);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
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

    const { data, error } = await supabase
      .from("project_progress")
      .upsert(payload, { onConflict: "booking_id" })
      .select()
      .single();

    if (error) {
      console.error("Gagal simpan progress:", error);
      await Swal.fire({
        icon: "error",
        title: "Gagal Simpan Progress",
        text: `${error.message} (${error.code ?? ""})`,
      });
      setSavingId(null);
      return;
    }

    setRows((prev) =>
      prev.map((r) => {
        if (r.id === row.id) {
          return {
            ...r,
            project_progress: [{
              id: (data as { id: number }).id ?? r.project_progress?.[0]?.id ?? 0,
              progress_status: (data as { progress_status: WorkflowStatus }).progress_status ?? payload.progress_status ?? "SHOOTING",
              drive_link: (data as { drive_link: string | null }).drive_link ?? payload.drive_link ?? null,
              expected_date: (data as { expected_date: string | null }).expected_date ?? payload.expected_date ?? null,
            }],
          };
        }
        return r;
      })
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
    const currentStatus = row.project_progress?.[0]?.progress_status ?? "SHOOTING";
    const currentExpected = row.project_progress?.[0]?.expected_date ?? calcDeadline(row.event_date, SLA_PRINT_WEEKS);
    await upsertProgress(row, {
      booking_id: row.id,
      progress_status: currentStatus,
      expected_date: currentExpected,
      drive_link: link.trim(),
    });
    await Swal.fire({
      icon: "success",
      title: "Link Tersimpan",
      text: "Link Google Drive berhasil diperbarui.",
      timer: 1500,
      showConfirmButton: false,
    });
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
    await upsertProgress(row, {
      booking_id: row.id,
      progress_status: currentStatus,
      expected_date: currentExpected,
      drive_link: null,
    });
    await Swal.fire({
      icon: "success",
      title: "Link Dihapus",
      timer: 1200,
      showConfirmButton: false,
    });
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
          {WORKFLOW_STEPS.map((s) => (<option key={s} value={s}>{WORKFLOW_STATUS_LABELS[s]}</option>))}
        </select>
<input type="date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setDateFilterActive(true); resetPage(); }} title="Event dari tanggal" className="h-10 rounded-xl border border-[var(--line)] bg-white px-2.5 text-sm text-[var(--ink)]" />
        <input type="date" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setDateFilterActive(true); resetPage(); }} title="Event sampai tanggal" className="h-10 rounded-xl border border-[var(--line)] bg-white px-2.5 text-sm text-[var(--ink)]" />
        {(dateFrom || dateTo) || dateFilterActive ? (
          <button onClick={() => { setDateFrom(todayInput()); setDateTo(todayInput()); setDateFilterActive(false); resetPage(); }} className="rounded-full border border-[var(--line)] bg-white px-3 py-2 text-xs font-semibold text-[var(--muted)] hover:border-[var(--brand)]" title="Reset filter ke hari ini">
            Reset
          </button>
        ) : null}
      </div>
      <p className="text-xs leading-relaxed text-[var(--muted)]">
        SLA: Retouch foto maksimal {SLA_RETOUCH_WEEKS} minggu setelah event ·
        Cetak/video maksimal {SLA_PRINT_WEEKS} minggu setelah event.
      </p>

      {filteredRows.length === 0 ? (
        <div className="rounded-2xl border border-[var(--line)] bg-white p-10 text-center text-sm text-[var(--muted)]">
          Tidak ada project yang cocok (Lunas / Menunggu Pelunasan / Menunggu DP).
        </div>
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

          return (
            <div
              key={row.id}
              className="overflow-hidden rounded-2xl border border-[var(--line)] bg-white"
            >
              <div className="flex items-center justify-between gap-3 border-b border-[var(--soft)] px-4 py-3">
                <div>
                  <p className="text-sm font-bold text-[var(--ink)]">
                    {clientName || "Client"}
                  </p>
                  <p className="font-mono text-[11px] text-[var(--muted)]">
                    {row.invoice_number} · Event {formatShortDate(row.event_date)}{row.sub_category_name ? ` · ${row.sub_category_name}` : ""}{row.is_file_only ? " · FILE ONLY" : ""}
                  </p>
                </div>
                <span
                  className={cn(
                    "rounded-full border px-2.5 py-1 text-[10px] font-bold",
                    row.status === "LUNAS"
                      ? "border-green-200 bg-green-100 text-green-700"
                      : row.status === "MENUNGGU_DP"
                        ? "border-orange-200 bg-orange-100 text-orange-700"
                        : "border-blue-200 bg-blue-100 text-blue-700",
                  )}
                >
                  {row.status === "LUNAS" ? "Lunas" : row.status === "MENUNGGU_DP" ? "Menunggu DP" : "Menunggu Pelunasan"}
                </span>
              </div>

              <div className="space-y-4 px-4 py-4">
                <div>
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)]">
                      Progress Pengerjaan
                    </p>
                    <p className="text-[10px] text-[var(--muted-2)]">
                      Estimasi Selesai:{" "}
                      {prog?.expected_date
                        ? formatShortDate(prog.expected_date)
                        : formatShortDate(calcDeadline(row.event_date, row.is_file_only ? SLA_RETOUCH_WEEKS : SLA_PRINT_WEEKS))}
                    </p>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-1">
                    {steps.map((s, i) => (
                      <button
                        key={s}
                        onClick={() => setProgressStatus(row, s)}
                        disabled={savingId === row.id || s === "RECEIVED"}
                        className={cn(
                          "flex-1 min-w-[80px] flex flex-col items-center gap-1 rounded-lg border px-1 py-2 text-[10px] font-semibold transition-colors disabled:cursor-not-allowed",
                          s === "RECEIVED" && i <= currentIdx
                            ? "border-emerald-300 bg-emerald-50 text-emerald-700 disabled:opacity-100"
                            : i <= currentIdx && s !== "RECEIVED"
                              ? "border-[var(--brand)] bg-[var(--brand)]/10 text-[var(--muted-2)] disabled:opacity-50"
                              : "border-[var(--line)] bg-white text-[var(--muted-2)] hover:border-[var(--brand)] disabled:opacity-50",
                        )}
                      >
                        {i <= currentIdx && <Check className="h-3 w-3 text-[var(--muted-2)]" />}
                        {WORKFLOW_STATUS_LABELS[s]}
                      </button>
                    ))}
                  </div>
                  <DriveLinkInput
                    key={`${row.id}-${prog?.drive_link ?? ""}-${savingId === row.id ? savingId : "idle"}`}
                    link={prog?.drive_link ?? ""}
                    onSave={(link) => setDriveLink(row, link)}
                    onDelete={() => deleteDriveLink(row)}
                    disabled={savingId === row.id}
                  />
                  {testimonials[row.id] && (
                    <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50/60 p-3">
                      <p className="text-xs font-semibold uppercase tracking-wider text-amber-800 mb-1">Testimoni Pelanggan</p>
                      <div className="flex items-center gap-1 text-amber-500 text-xs mb-1">
                        {"★".repeat(testimonials[row.id].rating)}{"☆".repeat(5 - testimonials[row.id].rating)}
                      </div>
                      <p className="text-xs text-amber-900 leading-relaxed">{testimonials[row.id].message}</p>
                      <p className="mt-1 text-[10px] text-amber-700/70">— {testimonials[row.id].client_name}</p>
                    </div>
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

function DriveLinkInput({
  link,
  onSave,
  onDelete,
  disabled,
}: {
  link: string;
  onSave: (link: string) => void;
  onDelete: () => void;
  disabled?: boolean;
}) {
  const [dirty, setDirty] = useState(false);
  const [value, setValue] = useState(link);

  return (
    <div className="mt-2 flex items-center gap-2">
      <div className="relative flex-1">
        <LinkIcon className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--muted-2)]" />
        <input
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setDirty(true);
          }}
          placeholder="https://drive.google.com/..."
          disabled={disabled}
          className="h-9 w-full rounded-lg border border-[var(--line)] bg-white pl-9 pr-3 text-xs text-[var(--ink)] placeholder:text-[var(--muted-5)] focus:border-[var(--brand)] focus:outline-none disabled:opacity-50"
        />
      </div>
      {dirty ? (
        <button
          onClick={() => onSave(value)}
          disabled={disabled || !value.trim()}
          className="h-9 shrink-0 rounded-lg bg-[var(--brand)] px-3 text-[11px] font-bold uppercase text-white hover:bg-[var(--brand-hover)] disabled:opacity-40"
        >
          Simpan
        </button>
      ) : link ? (
        <>
          <a
            href={link}
            target="_blank"
            rel="noopener noreferrer"
            className="flex h-9 shrink-0 items-center gap-1 rounded-lg bg-blue-50 px-3 text-[11px] font-semibold text-blue-700 hover:bg-blue-100"
          >
            <ExternalLink className="h-3 w-3" />
            Buka
          </a>
          <button
            onClick={onDelete}
            disabled={disabled}
            title="Hapus link"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 disabled:opacity-40"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </>
      ) : null}
    </div>
  );
}
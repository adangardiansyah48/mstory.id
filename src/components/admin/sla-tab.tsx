"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Check, ExternalLink, Link as LinkIcon, Trash2 } from "lucide-react";
import Swal from "sweetalert2";

import { cn, formatShortDate } from "@/lib/utils";
import {
  SLA_PRINT_WEEKS,
  SLA_RETOUCH_WEEKS,
  WORKFLOW_STATUS_LABELS,
} from "@/lib/types";
import type {
  WorkflowStatus,
} from "@/lib/types";

interface ProjectRow {
  id: number;
  invoice_number: string;
  client_name: string;
  event_date: string;
  status: string;
  client: { full_name: string } | null;
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

const WORKFLOW_STEPS: WorkflowStatus[] = ["SHOOTING", "EDIT", "PRINTING", "READY", "DELIVERED"];

export function SlaTab() {
  const [rows, setRows] = useState<ProjectRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<number | null>(null);

  async function loadProjects() {
    setLoading(true);
    const supabase = createClient();
    if (!supabase) {
      setLoading(false);
      return;
    }
    const { data, error } = await supabase
      .from("bookings")
      .select(
        `
        id,
        invoice_number,
        event_date,
        status,
        client:clients(full_name),
        project_progress(*)
      `,
      )
      .in("status", ["LUNAS", "MENUNGGU_PELUNASAN"])
      .order("event_date", { ascending: false })
      .limit(200);

    if (error) {
      console.error(error);
    } else {
      setRows((data as unknown as ProjectRow[]) ?? []);
    }
    setLoading(false);
  }

  useEffect(() => {
    const t = setTimeout(loadProjects, 0);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!savingId) {
      const t = setTimeout(loadProjects, 0);
      return () => clearTimeout(t);
    }
  }, [savingId]);

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

    const { error } = await supabase
      .from("project_progress")
      .upsert(payload, { onConflict: "booking_id" });

    if (error) {
      console.error("Gagal simpan progress:", error);
      await Swal.fire({
        icon: "error",
        title: "Gagal Simpan Progress",
        text: error.message || "Pastikan Anda login sebagai Admin.",
      });
    } else {
      // Update local state immediately so UI reflects change instantly
      setRows((prev) =>
        prev.map((r) => {
          if (r.id === row.id) {
            const newProg = [{
              id: r.project_progress?.[0]?.id ?? 0,
              booking_id: row.id,
              progress_status: payload.progress_status ?? r.project_progress?.[0]?.progress_status ?? "SHOOTING",
              drive_link: payload.drive_link !== undefined ? payload.drive_link : r.project_progress?.[0]?.drive_link,
              expected_date: payload.expected_date ?? r.project_progress?.[0]?.expected_date,
            }];
            return { ...r, project_progress: newProg };
          }
          return r;
        })
      );
    }

    setSavingId(null);
  }

  async function setProgressStatus(row: ProjectRow, status: WorkflowStatus) {
    await upsertProgress(row, {
      booking_id: row.id,
      progress_status: status,
      expected_date: calcDeadline(row.event_date, status === "EDIT" ? SLA_RETOUCH_WEEKS : SLA_PRINT_WEEKS),
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
      <p className="text-xs leading-relaxed text-[var(--muted)]">
        SLA: Retouch foto maksimal {SLA_RETOUCH_WEEKS} minggu setelah event ·
        Cetak/video maksimal {SLA_PRINT_WEEKS} minggu setelah event.
      </p>

      {rows.length === 0 ? (
        <div className="rounded-2xl border border-[var(--line)] bg-white p-10 text-center text-sm text-[var(--muted)]">
          Tidak ada project aktif (status LUNAS / MENUNGGU PELUNASAN).
        </div>
      ) : (
        rows.map((row) => {
          const prog = row.project_progress?.[0];
          const currentIdx = WORKFLOW_STEPS.indexOf(prog?.progress_status ?? "SHOOTING");
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
                    {row.invoice_number} · Event {formatShortDate(row.event_date)}
                  </p>
                </div>
                <span
                  className={cn(
                    "rounded-full border px-2.5 py-1 text-[10px] font-bold",
                    row.status === "LUNAS"
                      ? "border-green-200 bg-green-100 text-green-700"
                      : "border-blue-200 bg-blue-100 text-blue-700",
                  )}
                >
                  {row.status === "LUNAS" ? "Lunas" : "Menunggu Pelunasan"}
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
                        : formatShortDate(calcDeadline(row.event_date, SLA_PRINT_WEEKS))}
                    </p>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-1">
                    {WORKFLOW_STEPS.map((s, i) => (
                      <button
                        key={s}
                        onClick={() => setProgressStatus(row, s)}
                        disabled={savingId === row.id}
                        className={cn(
                          "flex-1 min-w-[80px] flex flex-col items-center gap-1 rounded-lg border px-1 py-2 text-[10px] font-semibold transition-colors disabled:opacity-50",
                          i <= currentIdx
                            ? "border-[var(--brand)] bg-[var(--brand)]/10 text-[var(--muted-2)]"
                            : "border-[var(--line)] bg-white text-[var(--muted-2)] hover:border-[var(--brand)]",
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
                </div>
              </div>
            </div>
          );
        })
      )}
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
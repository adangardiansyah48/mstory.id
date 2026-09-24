import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json({ error: "Server belum dikonfigurasi." }, { status: 500 });
  }

  const body = await request.json().catch(() => null);
  const booking_id = Number(body?.booking_id);
  const client_name = String(body?.client_name ?? "").trim() || "Pelanggan";
  const rating = Number(body?.rating);
  const message = String(body?.message ?? "").trim();

  if (!booking_id || !message || rating < 1 || rating > 5) {
    return NextResponse.json({ error: "Data testimoni tidak lengkap." }, { status: 400 });
  }

  const { data: progress } = await admin
    .from("project_progress")
    .select("progress_status")
    .eq("booking_id", booking_id)
    .maybeSingle();

  const status = progress?.progress_status as string | undefined;
  if (status !== "DELIVERED" && status !== "RECEIVED" && status !== "EDIT_DONE") {
    return NextResponse.json(
      { error: "Pesanan belum berstatus Terkirim / Selesai Edit." },
      { status: 400 },
    );
  }

  const { data, error } = await admin
    .from("testimonials")
    .upsert(
      { booking_id, client_name, rating, message, is_displayed: true },
      { onConflict: "booking_id" },
    )
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  await admin
    .from("project_progress")
    .update({ progress_status: "RECEIVED" })
    .eq("booking_id", booking_id);

  return NextResponse.json({ data });
}

export async function GET() {
  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json({ error: "Server belum dikonfigurasi." }, { status: 500 });
  }

  const { data, error } = await admin
    .from("testimonials")
    .select("client_name, rating, message, admin_reply, created_at")
    .eq("is_displayed", true)
    .order("created_at", { ascending: false })
    .limit(12);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data: data ?? [] });
}

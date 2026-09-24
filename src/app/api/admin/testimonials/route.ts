import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

async function requireAuth() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  return user;
}

export async function GET() {
  const user = await requireAuth();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ error: "Service role not configured" }, { status: 500 });

  const { data: rows, error } = await admin
    .from("testimonials")
    .select("id, booking_id, client_name, rating, message, admin_reply, admin_replied_at, is_displayed, created_at, updated_at, bookings!inner(invoice_number, event_date, client:clients(full_name))")
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const normalized = (rows ?? []).map((r: unknown) => {
    const row = r as Record<string, unknown>;
    const b = row.bookings as Record<string, unknown> | null;
    const cl = b?.client as Record<string, unknown> | null;
    return {
      id: row.id,
      booking_id: row.booking_id,
      client_name: row.client_name,
      rating: row.rating,
      message: row.message,
      admin_reply: row.admin_reply ?? null,
      admin_replied_at: row.admin_replied_at ?? null,
      is_displayed: row.is_displayed,
      created_at: row.created_at,
      invoice_number: (b?.invoice_number as string) ?? null,
      event_date: (b?.event_date as string) ?? null,
      booking_client_name: (cl?.full_name as string) ?? null,
    };
  });

  return NextResponse.json({ data: normalized });
}

export async function PATCH(req: Request) {
  const user = await requireAuth();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ error: "Service role not configured" }, { status: 500 });

  const body = await req.json().catch(() => null);
  const id = Number(body?.id);
  if (!id) return NextResponse.json({ error: "ID wajib" }, { status: 400 });

  const patch: Record<string, unknown> = {};
  if (body?.admin_reply !== undefined) {
    const v = String(body.admin_reply ?? "").trim();
    patch.admin_reply = v || null;
    patch.admin_replied_at = v ? new Date().toISOString() : null;
  }
  if (body?.is_displayed !== undefined) patch.is_displayed = Boolean(body.is_displayed);
  if (body?.rating !== undefined) {
    const n = Number(body.rating);
    if (n < 1 || n > 5) return NextResponse.json({ error: "Rating 1-5" }, { status: 400 });
    patch.rating = n;
  }
  if (body?.message !== undefined) {
    const m = String(body.message ?? "").trim();
    if (!m) return NextResponse.json({ error: "Pesan tidak boleh kosong" }, { status: 400 });
    patch.message = m;
  }
  if (body?.client_name !== undefined) {
    const c = String(body.client_name ?? "").trim();
    if (!c) return NextResponse.json({ error: "Nama tidak boleh kosong" }, { status: 400 });
    patch.client_name = c;
  }
  if (Object.keys(patch).length === 0) return NextResponse.json({ error: "Tidak ada perubahan" }, { status: 400 });

  const { data, error } = await admin.from("testimonials").update(patch).eq("id", id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ data });
}

export async function DELETE(req: Request) {
  const user = await requireAuth();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ error: "Service role not configured" }, { status: 500 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "ID wajib" }, { status: 400 });

  const { error } = await admin.from("testimonials").delete().eq("id", Number(id));
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}

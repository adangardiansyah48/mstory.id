import { NextResponse } from "next/server";
import { executeOperation } from "@/lib/db/engine";
import type { DbOperation } from "@/lib/db/types";

export const dynamic = "force-dynamic";

const ALLOWED_TABLES = new Set([
  "categories",
  "sub_categories",
  "packages",
  "addons",
  "clients",
  "vendors",
  "bookings",
  "booking_details",
  "booking_addons",
  "project_progress",
  "profiles",
  "testimonials",
  "linktree_settings",
  "website_settings",
  "website_gallery_items",
  "website_albums",
  "website_album_photos",
  "portfolio_items",
]);

const ALLOWED_RPC = new Set([
  "generate_invoice_number",
  "lookup_bookings",
  "admin_create_user",
]);

export async function POST(request: Request) {
  let op: DbOperation;
  try {
    op = (await request.json()) as DbOperation;
  } catch {
    return NextResponse.json(
      { data: null, error: { message: "Body tidak valid" }, count: null, status: 400, statusText: "Bad Request" },
      { status: 400 },
    );
  }

  if (!op || typeof op !== "object" || !op.kind) {
    return NextResponse.json(
      { data: null, error: { message: "Operasi tidak dikenal" }, count: null, status: 400, statusText: "Bad Request" },
      { status: 400 },
    );
  }

  if (op.kind === "rpc") {
    if (!ALLOWED_RPC.has(op.name)) {
      return NextResponse.json(
        { data: null, error: { message: `RPC tidak diizinkan: ${op.name}` }, count: null, status: 400, statusText: "Bad Request" },
        { status: 400 },
      );
    }
  } else if (!ALLOWED_TABLES.has(op.table)) {
    return NextResponse.json(
      { data: null, error: { message: `Tabel tidak diizinkan: ${op.table}` }, count: null, status: 400, statusText: "Bad Request" },
      { status: 400 },
    );
  }

  const result = await executeOperation(op);
  return NextResponse.json(result, { status: result.error ? 400 : 200 });
}

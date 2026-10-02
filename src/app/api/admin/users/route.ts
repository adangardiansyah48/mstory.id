import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient, isHiddenSuperAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

async function requireAuth() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  return user;
}

async function getUserRole(userId: string) {
  const supabase = await createClient();
  const { data } = await supabase!.from("profiles").select("role").eq("id", userId).maybeSingle();
  return (data?.role as string) || "admin";
}

export async function GET() {
  const user = await requireAuth();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = await getUserRole(user.id);
  // Only superadmin can manage accounts
  if (role !== "superadmin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ error: "Service role not configured" }, { status: 500 });

  const { data, error } = await admin.auth.admin.listUsers();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const filtered = (data.users ?? []).filter((u) => !isHiddenSuperAdmin(u.email));
  return NextResponse.json({ users: filtered });
}

export async function POST(req: Request) {
  const user = await requireAuth();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = await getUserRole(user.id);
  if (role !== "superadmin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ error: "Service role not configured" }, { status: 500 });

  const { email, password, role: newRole } = await req.json();
  if (!email || !password) return NextResponse.json({ error: "Email dan password wajib" }, { status: 400 });
  if (isHiddenSuperAdmin(email)) return NextResponse.json({ error: "Email tidak diperbolehkan" }, { status: 403 });
  if (String(password).length < 6) return NextResponse.json({ error: "Password minimal 6 karakter" }, { status: 400 });

  const allowedRoles = ["superadmin", "admin", "owner"];
  const finalRole = allowedRoles.includes(newRole) ? newRole : "admin";

  const { data, error } = await admin.auth.admin.createUser({
    email: String(email).trim(),
    password: String(password),
    email_confirm: true,
    user_metadata: { role: finalRole },
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ user: data.user });
}

export async function PATCH(req: Request) {
  const user = await requireAuth();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = await getUserRole(user.id);
  if (role !== "superadmin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ error: "Service role not configured" }, { status: 500 });

  const { id, password, role: newRole } = await req.json();
  if (!id || !password) return NextResponse.json({ error: "ID dan password wajib" }, { status: 400 });
  if (String(password).length < 6) return NextResponse.json({ error: "Password minimal 6 karakter" }, { status: 400 });

  const { data: target } = await admin.auth.admin.getUserById(id);
  if (target?.user && isHiddenSuperAdmin(target.user.email)) {
    return NextResponse.json({ error: "Tidak diizinkan mengubah akun ini" }, { status: 403 });
  }

  const { error } = await admin.auth.admin.updateUserById(id, {
    password: String(password),
    user_metadata: newRole ? { role: newRole } : undefined,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  const allowedRoles = ["superadmin", "admin", "owner"];
  if (newRole && allowedRoles.includes(newRole)) {
    await admin.from("profiles").upsert({ id, role: newRole }, { onConflict: "id" });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const user = await requireAuth();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = await getUserRole(user.id);
  if (role !== "superadmin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ error: "Service role not configured" }, { status: 500 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "ID wajib" }, { status: 400 });

  const { data: target } = await admin.auth.admin.getUserById(id);
  if (target?.user && isHiddenSuperAdmin(target.user.email)) {
    return NextResponse.json({ error: "Tidak diizinkan menghapus akun ini" }, { status: 403 });
  }

  const { error } = await admin.auth.admin.deleteUser(id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}

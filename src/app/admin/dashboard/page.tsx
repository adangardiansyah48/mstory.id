import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AdminDashboardClient } from "@/components/admin/admin-dashboard-client";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/admin/login");
  }

  let role: "superadmin" | "admin" | "owner" = "admin";
  if (user.email === "superadmin@mstory.id") {
    role = "superadmin";
  } else {
    const metaRole = user.user_metadata?.role;
    if (metaRole === "superadmin" || metaRole === "admin" || metaRole === "owner") {
      role = metaRole;
    } else {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();
      if (profile?.role) {
        role = profile.role as "superadmin" | "admin" | "owner";
      }
    }
  }

  return <AdminDashboardClient email={user.email ?? ""} userRole={role} />;
}

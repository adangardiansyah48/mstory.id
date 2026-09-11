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

  return <AdminDashboardClient email={user.email ?? ""} />;
}
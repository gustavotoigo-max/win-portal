import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export function getConfiguredAdminEmails() {
  return (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export async function getAdminContext() {
  const authClient = await createClient();
  const { data: userData } = await authClient.auth.getUser();
  const user = userData?.user;

  if (!user) {
    return {
      isAuthenticated: false,
      isAdmin: false,
      user: null,
      userEmail: null,
      role: "sem login"
    };
  }

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("role, email")
    .eq("user_id", user.id)
    .maybeSingle();

  const userEmail = user.email?.toLowerCase() || profile?.email?.toLowerCase() || "";
  const isAdmin = profile?.role === "admin" || getConfiguredAdminEmails().includes(userEmail);

  return {
    isAuthenticated: true,
    isAdmin,
    user,
    userEmail,
    role: profile?.role || "sem perfil"
  };
}

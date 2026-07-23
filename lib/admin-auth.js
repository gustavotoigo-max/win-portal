import { getAuthSession } from "@/lib/auth/server";
import { isDatabaseConfigured, queryOne } from "@/lib/neon/database";

export function getConfiguredAdminEmails() {
  return (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export async function getAdminContext() {
  const session = await getAuthSession();
  const user = session?.user;

  if (!user) {
    return {
      isAuthenticated: false,
      isAdmin: false,
      user: null,
      userEmail: null,
      role: "sem login"
    };
  }

  const profile = isDatabaseConfigured()
    ? await queryOne(
        "select role, email from public.profiles where user_id = $1",
        [user.id]
      )
    : null;

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

import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

const allowedMethods = new Set(["password", "google", "sso", "unknown"]);

export async function recordUserLoginMethod({ user, method = "unknown", provider = null }) {
  if (!user?.id || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return { ok: false, skipped: true };
  }

  const loginMethod = allowedMethods.has(method) ? method : "unknown";
  const admin = createAdminClient();
  const { error } = await admin.from("profiles").upsert(
    {
      user_id: user.id,
      email: user.email,
      login_method: loginMethod,
      login_provider: provider || loginMethod,
      last_login_at: new Date().toISOString()
    },
    { onConflict: "user_id" }
  );

  if (error) {
    console.error("Could not record login method:", error.message);
    return { ok: false, error };
  }

  return { ok: true };
}

import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { encryptLicenseKey, licenseKeyHash } from "@/lib/license-crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function createLicenseKey() {
  const raw = randomUUID().replaceAll("-", "").toUpperCase();
  return `WIN-${raw.slice(0, 4)}-${raw.slice(4, 8)}-${raw.slice(8, 12)}-${raw.slice(12, 16)}`;
}

function createOrderNumber() {
  const date = new Date();
  const stamp = [
    date.getUTCFullYear(),
    String(date.getUTCMonth() + 1).padStart(2, "0"),
    String(date.getUTCDate()).padStart(2, "0"),
    String(date.getUTCHours()).padStart(2, "0"),
    String(date.getUTCMinutes()).padStart(2, "0"),
    String(date.getUTCSeconds()).padStart(2, "0")
  ].join("");
  return `FAKE-${stamp}-${Math.floor(Math.random() * 9000 + 1000)}`;
}

function wantsJson(request) {
  return request.headers.get("accept")?.includes("application/json") ||
    request.headers.get("content-type")?.includes("application/json");
}

function jsonError(code, message, status = 400) {
  return NextResponse.json({ ok: false, code, message }, { status });
}

async function requestContext(request) {
  if (request.headers.get("content-type")?.includes("application/json")) {
    const body = await request.json();
    return { locale: body.locale || "pt", json: true };
  }

  const form = await request.formData();
  return { locale: form.get("locale") || "pt", json: false };
}

async function getRequestUser(request, admin) {
  const authorization = request.headers.get("authorization") || "";
  const token = authorization.startsWith("Bearer ") ? authorization.slice(7) : null;

  if (token) {
    return admin.auth.getUser(token);
  }

  const supabase = await createClient();
  return supabase.auth.getUser();
}

export async function POST(request) {
  const { locale, json } = await requestContext(request);
  const dashboardUrl = (code) => new URL(`/${locale}/dashboard?fakePurchase=${code}`, request.url);

  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    !process.env.SUPABASE_SERVICE_ROLE_KEY
  ) {
    if (json || wantsJson(request)) {
      return jsonError("missing_config", "Supabase configuration is incomplete.", 500);
    }
    return NextResponse.redirect(dashboardUrl("missing_config"), 303);
  }

  const admin = createAdminClient();
  const { data: userData, error: userError } = await getRequestUser(request, admin);

  if (userError || !userData?.user) {
    if (json || wantsJson(request)) {
      return jsonError("auth_required", "Authentication is required.", 401);
    }
    return NextResponse.redirect(new URL(`/${locale}/login`, request.url), 303);
  }

  const user = userData.user;

  const { error: profileError } = await admin.from("profiles").upsert(
    {
      user_id: user.id,
      email: user.email,
      full_name: user.user_metadata?.full_name || null,
      company: user.user_metadata?.company || null,
      preferred_locale: locale
    },
    { onConflict: "user_id" }
  );

  if (profileError) {
    if (json || wantsJson(request)) {
      return jsonError("profile_error", profileError.message, 500);
    }
    return NextResponse.redirect(dashboardUrl("profile_error"), 303);
  }

  const { data: order, error: orderError } = await admin
    .from("orders")
    .insert({
      user_id: user.id,
      order_number: createOrderNumber(),
      status: "paid",
      amount: 0,
      currency: "brl",
      customer_email: user.email
    })
    .select("id")
    .single();

  if (orderError) {
    if (json || wantsJson(request)) {
      return jsonError("order_error", orderError.message, 500);
    }
    return NextResponse.redirect(dashboardUrl("order_error"), 303);
  }

  const licenseKey = createLicenseKey();
  const { data: license, error: licenseError } = await admin
    .from("licenses")
    .insert({
      user_id: user.id,
      order_id: order.id,
      license_key: null,
      license_key_hash: licenseKeyHash(licenseKey),
      license_key_hint: licenseKey.slice(-4),
      license_key_ciphertext: encryptLicenseKey(licenseKey),
      app_id: process.env.LICENSE_APP_ID || "com.winportal.windowssoftware",
      status: "active",
      max_machines: 1,
      offline_allowed: true,
      offline_max_days: 30,
      features: ["core"]
    })
    .select("id")
    .single();

  if (licenseError) {
    if (json || wantsJson(request)) {
      return jsonError("license_error", licenseError.message, 500);
    }
    return NextResponse.redirect(dashboardUrl("license_error"), 303);
  }

  await admin.from("license_events").insert({
    license_id: license.id,
    action: "created",
    notes: "Fake purchase generated from customer dashboard"
  });

  if (json || wantsJson(request)) {
    return NextResponse.json({ ok: true, licenseId: license.id, licenseKey });
  }

  return NextResponse.redirect(dashboardUrl("success"), 303);
}

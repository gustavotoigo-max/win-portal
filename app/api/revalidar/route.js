import { NextResponse } from "next/server";
import { buildLicensePayload, errorResponse, successResponse } from "@/lib/license-crypto";
import { createAdminClient } from "@/lib/supabase/admin";

function isExpired(expiresAt) {
  return expiresAt && new Date(expiresAt) < new Date();
}

function requestIp(request) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null;
}

export async function POST(request) {
  try {
    const body = await request.json();
    const {
      license_id: licenseId,
      activation_id: activationId,
      email,
      machine_id: machineId,
      software_version: softwareVersion,
      system_info: systemInfo
    } = body;

    if (!licenseId || !activationId || !email || !machineId) {
      return NextResponse.json(
        errorResponse("INVALID_REQUEST", "license_id, activation_id, e-mail e Machine ID sao obrigatorios."),
        { status: 400 }
      );
    }

    const admin = createAdminClient();
    const { data: activation, error: activationError } = await admin
      .from("activations")
      .select("id, license_id, machine_id, status")
      .eq("id", activationId)
      .eq("license_id", licenseId)
      .single();

    if (activationError || !activation) {
      return NextResponse.json(errorResponse("INVALID_ACTIVATION", "Ativacao nao encontrada."), {
        status: 404
      });
    }

    if (activation.machine_id !== machineId) {
      return NextResponse.json(errorResponse("MACHINE_MISMATCH", "Machine ID nao confere."));
    }

    const { data: license, error: licenseError } = await admin
      .from("licenses")
      .select("id, user_id, customer_email, license_key_hash, status, expires_at, created_at, app_id, offline_allowed, offline_max_days, features, revoked_at, profiles(email)")
      .eq("id", licenseId)
      .single();

    if (licenseError || !license) {
      return NextResponse.json(errorResponse("INVALID_LICENSE_KEY", "Licenca nao encontrada."), {
        status: 404
      });
    }

    const licenseEmail = license.customer_email || license.profiles?.email;
    if (licenseEmail && licenseEmail.toLowerCase() !== email.toLowerCase()) {
      return NextResponse.json(errorResponse("INVALID_EMAIL", "E-mail nao pertence a licenca."), {
        status: 403
      });
    }

    if (license.status === "revoked" || license.status === "blocked" || activation.status !== "active") {
      return NextResponse.json(errorResponse("LICENSE_REVOKED", "Licenca revogada."));
    }

    if (license.status !== "active") {
      return NextResponse.json(errorResponse("INVALID_LICENSE_STATUS", "Licenca nao esta ativa."));
    }

    if (isExpired(license.expires_at)) {
      return NextResponse.json(errorResponse("LICENSE_EXPIRED", "Licenca expirada."));
    }

    const now = new Date();
    await admin
      .from("activations")
      .update({
        software_version: softwareVersion,
        system_info: systemInfo || {},
        last_seen_at: now.toISOString(),
        last_validated_at: now.toISOString()
      })
      .eq("id", activationId);

    await admin.from("validation_logs").insert({
      license_id: licenseId,
      activation_id: activationId,
      email,
      machine_id: machineId,
      software_version: softwareVersion,
      ip_address: requestIp(request),
      user_agent: request.headers.get("user-agent"),
      result: "ACTIVE"
    });

    const payload = buildLicensePayload({
      license,
      activation,
      email,
      machineId,
      softwareVersion,
      now
    });

    return NextResponse.json(successResponse(payload));
  } catch (error) {
    return NextResponse.json(errorResponse("SERVER_ERROR", error.message), { status: 500 });
  }
}

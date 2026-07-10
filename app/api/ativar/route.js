import { NextResponse } from "next/server";
import {
  buildLicensePayload,
  errorResponse,
  licenseKeyHash,
  successResponse
} from "@/lib/license-crypto";
import { createAdminClient } from "@/lib/supabase/admin";

const DEFAULT_APP_ID = "com.winportal.windowssoftware";

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
      app_id: appId = DEFAULT_APP_ID,
      email,
      license_key: licenseKey,
      machine_id: machineId,
      machine_name: machineName,
      software_version: softwareVersion,
      system_info: systemInfo
    } = body;

    if (!email || !licenseKey || !machineId) {
      return NextResponse.json(
        errorResponse("INVALID_REQUEST", "E-mail, chave e Machine ID sao obrigatorios."),
        { status: 400 }
      );
    }

    if (appId !== (process.env.LICENSE_APP_ID || DEFAULT_APP_ID)) {
      return NextResponse.json(errorResponse("INVALID_APP_ID", "Aplicativo invalido."), {
        status: 403
      });
    }

    const admin = createAdminClient();
    const hash = licenseKeyHash(licenseKey);
    const { data: license, error } = await admin
      .from("licenses")
      .select("id, user_id, customer_email, license_key_hash, status, max_machines, expires_at, created_at, app_id, offline_allowed, offline_max_days, features, revoked_at, profiles(email)")
      .eq("license_key_hash", hash)
      .single();

    if (error || !license) {
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

    const expectedAppId = process.env.LICENSE_APP_ID || DEFAULT_APP_ID;
    const licenseAppId = license.app_id || expectedAppId;
    if (licenseAppId !== appId) {
      return NextResponse.json(errorResponse("LICENSE_APP_MISMATCH", "Licenca pertence a outro aplicativo."), {
        status: 403
      });
    }

    if (license.status === "revoked" || license.status === "blocked") {
      return NextResponse.json(errorResponse("LICENSE_REVOKED", "Licenca revogada."));
    }

    if (license.status !== "active") {
      return NextResponse.json(errorResponse("INVALID_LICENSE_STATUS", "Licenca nao esta ativa."));
    }

    if (isExpired(license.expires_at)) {
      return NextResponse.json(errorResponse("LICENSE_EXPIRED", "Licenca expirada."));
    }

    const { data: activations } = await admin
      .from("activations")
      .select("id, machine_id, status")
      .eq("license_id", license.id);

    const existing = activations?.find((activation) => activation.machine_id === machineId);
    if (!existing && activations?.filter((item) => item.status === "active").length >= license.max_machines) {
      return NextResponse.json(
        errorResponse("ACTIVATION_LIMIT_REACHED", "Limite de ativacoes atingido.")
      );
    }

    let activation = existing;
    const now = new Date();
    if (activation) {
      const { data } = await admin
        .from("activations")
        .update({
          machine_name: machineName,
          software_version: softwareVersion,
          system_info: systemInfo || {},
          last_seen_at: now.toISOString(),
          last_validated_at: now.toISOString(),
          status: "active"
        })
        .eq("id", activation.id)
        .select("id, machine_id")
        .single();
      activation = data;
    } else {
      const { data } = await admin
        .from("activations")
        .insert({
          license_id: license.id,
          machine_id: machineId,
          machine_name: machineName,
          software_version: softwareVersion,
          system_info: systemInfo || {},
          status: "active",
          last_seen_at: now.toISOString(),
          last_validated_at: now.toISOString()
        })
        .select("id, machine_id")
        .single();
      activation = data;
    }

    await admin.from("validation_logs").insert({
      license_id: license.id,
      activation_id: activation.id,
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

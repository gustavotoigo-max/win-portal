import { NextResponse } from "next/server";
import { buildLicensePayload, errorResponse, successResponse } from "@/lib/license-crypto";
import { query, queryOne } from "@/lib/neon/database";
import { getProductBySoftware } from "@/lib/products";

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
      software,
      email,
      machine_id: machineId,
      software_version: softwareVersion,
      system_info: systemInfo
    } = body;

    if (!licenseId || !activationId || !email || !machineId || !software) {
      return NextResponse.json(
        errorResponse("INVALID_REQUEST", "license_id, activation_id, e-mail, Machine ID e software sao obrigatorios."),
        { status: 400 }
      );
    }

    const product = getProductBySoftware(software);
    if (!product) {
      return NextResponse.json(errorResponse("INVALID_SOFTWARE", "Software invalido."), {
        status: 403
      });
    }

    const activation = await queryOne(
      `select id, license_id, machine_id, status
       from public.activations
       where id = $1 and license_id = $2`,
      [activationId, licenseId]
    );

    if (!activation) {
      return NextResponse.json(errorResponse("INVALID_ACTIVATION", "Ativacao nao encontrada."), {
        status: 404
      });
    }

    if (activation.machine_id !== machineId) {
      return NextResponse.json(errorResponse("MACHINE_MISMATCH", "Machine ID nao confere."));
    }

    const license = await queryOne(
      `select l.id, l.user_id, l.customer_email, l.product_id, l.license_key_hash,
              l.status, l.expires_at, l.created_at, l.app_id, l.offline_allowed,
              l.offline_max_days, l.features, l.revoked_at,
              p.email as profile_email
       from public.licenses l
       left join public.profiles p on p.user_id = l.user_id
       where l.id = $1`,
      [licenseId]
    );

    if (!license) {
      return NextResponse.json(errorResponse("INVALID_LICENSE_KEY", "Licenca nao encontrada."), {
        status: 404
      });
    }

    const licenseEmail = license.customer_email || license.profile_email;
    if (licenseEmail && licenseEmail.toLowerCase() !== email.toLowerCase()) {
      return NextResponse.json(errorResponse("INVALID_EMAIL", "E-mail nao pertence a licenca."), {
        status: 403
      });
    }

    if (!license.product_id) {
      return NextResponse.json(errorResponse("LICENSE_PRODUCT_MISSING", "Licenca sem produto vinculado."), {
        status: 403
      });
    }

    if (license.product_id !== product.id) {
      return NextResponse.json(errorResponse("SOFTWARE_MISMATCH", "Licenca pertence a outro software."), {
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
      await query(
        "update public.licenses set status = 'expired' where id = $1 and status = 'active'",
        [license.id]
      );
      return NextResponse.json(errorResponse("LICENSE_EXPIRED", "Licenca expirada."));
    }

    const now = new Date();
    const activationSystemInfo = { ...(systemInfo || {}), software: product.aliases?.[0] || product.name };
    await query(
      `update public.activations
       set software_version = $1, system_info = $2::jsonb,
           last_seen_at = $3, last_validated_at = $3
       where id = $4`,
      [softwareVersion, JSON.stringify(activationSystemInfo), now.toISOString(), activationId]
    );

    await query(
      `insert into public.validation_logs (
         license_id, activation_id, email, machine_id, software_version,
         ip_address, user_agent, result
       ) values ($1, $2, $3, $4, $5, $6, $7, 'ACTIVE')`,
      [
        licenseId,
        activationId,
        email,
        machineId,
        softwareVersion,
        requestIp(request),
        request.headers.get("user-agent")
      ]
    );

    const payload = buildLicensePayload({
      license,
      activation,
      email,
      machineId,
      product,
      softwareVersion,
      now
    });

    return NextResponse.json(successResponse(payload));
  } catch (error) {
    return NextResponse.json(errorResponse("SERVER_ERROR", error.message), { status: 500 });
  }
}

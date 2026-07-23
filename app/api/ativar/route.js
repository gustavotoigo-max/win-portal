import { NextResponse } from "next/server";
import {
  buildLicensePayload,
  errorResponse,
  licenseKeyHash,
  successResponse
} from "@/lib/license-crypto";
import { query, queryOne } from "@/lib/neon/database";
import { getProductBySoftware } from "@/lib/products";

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
      software,
      email,
      license_key: licenseKey,
      machine_id: machineId,
      machine_name: machineName,
      software_version: softwareVersion,
      system_info: systemInfo
    } = body;

    if (!email || !licenseKey || !machineId || !software) {
      return NextResponse.json(
        errorResponse("INVALID_REQUEST", "E-mail, chave, Machine ID e software sao obrigatorios."),
        { status: 400 }
      );
    }

    const product = getProductBySoftware(software);
    if (!product) {
      return NextResponse.json(errorResponse("INVALID_SOFTWARE", "Software invalido."), {
        status: 403
      });
    }

    if (appId !== (process.env.LICENSE_APP_ID || DEFAULT_APP_ID)) {
      return NextResponse.json(errorResponse("INVALID_APP_ID", "Aplicativo invalido."), {
        status: 403
      });
    }

    const hash = licenseKeyHash(licenseKey);
    const license = await queryOne(
      `select l.id, l.user_id, l.customer_email, l.product_id, l.license_key_hash,
              l.status, l.max_machines, l.expires_at, l.created_at, l.app_id,
              l.offline_allowed, l.offline_max_days, l.features, l.revoked_at,
              p.email as profile_email
       from public.licenses l
       left join public.profiles p on p.user_id = l.user_id
       where l.license_key_hash = $1
       limit 1`,
      [hash]
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

    const expectedAppId = process.env.LICENSE_APP_ID || DEFAULT_APP_ID;
    const licenseAppId = license.app_id || expectedAppId;
    if (licenseAppId !== appId) {
      return NextResponse.json(errorResponse("LICENSE_APP_MISMATCH", "Licenca pertence a outro aplicativo."), {
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

    if (license.status === "revoked" || license.status === "blocked") {
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

    const activations = await query(
      "select id, machine_id, status from public.activations where license_id = $1",
      [license.id]
    );

    const existing = activations?.find((activation) => activation.machine_id === machineId);
    if (!existing && activations?.filter((item) => item.status === "active").length >= license.max_machines) {
      return NextResponse.json(
        errorResponse("ACTIVATION_LIMIT_REACHED", "Limite de ativacoes atingido.")
      );
    }

    let activation = existing;
    const now = new Date();
    const activationSystemInfo = { ...(systemInfo || {}), software: product.aliases?.[0] || product.name };
    activation = await queryOne(
      `insert into public.activations (
         license_id, machine_id, machine_name, software_version, system_info,
         status, last_seen_at, last_validated_at
       )
       values ($1, $2, $3, $4, $5::jsonb, 'active', $6, $6)
       on conflict (license_id, machine_id) do update set
         machine_name = excluded.machine_name,
         software_version = excluded.software_version,
         system_info = excluded.system_info,
         last_seen_at = excluded.last_seen_at,
         last_validated_at = excluded.last_validated_at,
         status = 'active'
       returning id, machine_id`,
      [
        license.id,
        machineId,
        machineName,
        softwareVersion,
        JSON.stringify(activationSystemInfo),
        now.toISOString()
      ]
    );

    await query(
      `insert into public.validation_logs (
         license_id, activation_id, email, machine_id, software_version,
         ip_address, user_agent, result
       ) values ($1, $2, $3, $4, $5, $6, $7, 'ACTIVE')`,
      [
        license.id,
        activation.id,
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

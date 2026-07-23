import { NextResponse } from "next/server";
import { licenseKeyHash } from "@/lib/license-crypto";
import { query, queryOne } from "@/lib/neon/database";

export async function POST(request) {
  try {
    const { licenseKey, machineFingerprint, machineName } = await request.json();

    if (!licenseKey || !machineFingerprint) {
      return NextResponse.json(
        { valid: false, reason: "licenseKey and machineFingerprint are required." },
        { status: 400 }
      );
    }

    const license = await queryOne(
      `select id, status, max_machines, expires_at
       from public.licenses
       where license_key_hash = $1 or license_key = $2
       limit 1`,
      [licenseKeyHash(licenseKey), licenseKey]
    );

    if (!license) {
      return NextResponse.json({ valid: false, reason: "not_found" }, { status: 404 });
    }

    if (license.status !== "active") {
      return NextResponse.json({ valid: false, reason: license.status });
    }

    if (license.expires_at && new Date(license.expires_at) < new Date()) {
      await query(
        "update public.licenses set status = 'expired' where id = $1 and status = 'active'",
        [license.id]
      );
      return NextResponse.json({ valid: false, reason: "expired" });
    }

    const machines = await query(
      "select id, machine_fingerprint from public.machines where license_id = $1",
      [license.id]
    );

    const alreadyRegistered = machines?.find(
      (machine) => machine.machine_fingerprint === machineFingerprint
    );

    if (!alreadyRegistered && machines?.length >= license.max_machines) {
      return NextResponse.json({ valid: false, reason: "machine_limit_reached" });
    }

    if (alreadyRegistered) {
      await query(
        "update public.machines set machine_name = $1, last_seen_at = now() where id = $2",
        [machineName, alreadyRegistered.id]
      );
    } else {
      await query(
        `insert into public.machines (
           license_id, machine_fingerprint, machine_name, last_seen_at
         ) values ($1, $2, $3, now())`,
        [license.id, machineFingerprint, machineName]
      );
    }

    await query(
      `insert into public.license_events (license_id, action, notes)
       values ($1, 'validated', $2)`,
      [license.id, machineName || machineFingerprint]
    );

    return NextResponse.json({ valid: true, licenseId: license.id });
  } catch (error) {
    return NextResponse.json({ valid: false, reason: error.message }, { status: 500 });
  }
}

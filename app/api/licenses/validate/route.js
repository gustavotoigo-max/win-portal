import { NextResponse } from "next/server";
import { licenseKeyHash } from "@/lib/license-crypto";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request) {
  try {
    const { licenseKey, machineFingerprint, machineName } = await request.json();

    if (!licenseKey || !machineFingerprint) {
      return NextResponse.json(
        { valid: false, reason: "licenseKey and machineFingerprint are required." },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();
    const { data: hashedLicense, error: hashError } = await supabase
      .from("licenses")
      .select("id, status, max_machines, expires_at")
      .eq("license_key_hash", licenseKeyHash(licenseKey))
      .maybeSingle();
    const { data: plainLicense, error: plainError } = hashedLicense
      ? { data: null, error: null }
      : await supabase
          .from("licenses")
          .select("id, status, max_machines, expires_at")
          .eq("license_key", licenseKey)
          .maybeSingle();
    const license = hashedLicense || plainLicense;
    const error = hashError || plainError;

    if (error || !license) {
      return NextResponse.json({ valid: false, reason: "not_found" }, { status: 404 });
    }

    if (license.status !== "active") {
      return NextResponse.json({ valid: false, reason: license.status });
    }

    if (license.expires_at && new Date(license.expires_at) < new Date()) {
      await supabase
        .from("licenses")
        .update({ status: "expired" })
        .eq("id", license.id)
        .eq("status", "active");
      return NextResponse.json({ valid: false, reason: "expired" });
    }

    const { data: machines } = await supabase
      .from("machines")
      .select("id, machine_fingerprint")
      .eq("license_id", license.id);

    const alreadyRegistered = machines?.find(
      (machine) => machine.machine_fingerprint === machineFingerprint
    );

    if (!alreadyRegistered && machines?.length >= license.max_machines) {
      return NextResponse.json({ valid: false, reason: "machine_limit_reached" });
    }

    if (alreadyRegistered) {
      await supabase
        .from("machines")
        .update({ machine_name: machineName, last_seen_at: new Date().toISOString() })
        .eq("id", alreadyRegistered.id);
    } else {
      await supabase.from("machines").insert({
        license_id: license.id,
        machine_fingerprint: machineFingerprint,
        machine_name: machineName,
        last_seen_at: new Date().toISOString()
      });
    }

    await supabase.from("license_events").insert({
      license_id: license.id,
      action: "validated",
      notes: machineName || machineFingerprint
    });

    return NextResponse.json({ valid: true, licenseId: license.id });
  } catch (error) {
    return NextResponse.json({ valid: false, reason: error.message }, { status: 500 });
  }
}

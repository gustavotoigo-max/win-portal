import crypto from "node:crypto";

const DEFAULT_APP_ID = "com.suaempresa.templateativacao";
const DEFAULT_FEATURES = ["core"];

function serverSecret() {
  return process.env.LICENSE_HMAC_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || "dev-only-secret";
}

function encryptionKey() {
  const source = process.env.LICENSE_ENCRYPTION_KEY || serverSecret();
  return crypto.createHash("sha256").update(source).digest();
}

export function licenseKeyHash(licenseKey) {
  return crypto
    .createHmac("sha256", serverSecret())
    .update(String(licenseKey).trim().toUpperCase())
    .digest("hex");
}

export function encryptLicenseKey(licenseKey) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(licenseKey, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("base64")}.${tag.toString("base64")}.${ciphertext.toString("base64")}`;
}

export function decryptLicenseKey(payload) {
  if (!payload) return null;
  const [ivText, tagText, ciphertextText] = payload.split(".");
  if (!ivText || !tagText || !ciphertextText) return null;

  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    encryptionKey(),
    Buffer.from(ivText, "base64")
  );
  decipher.setAuthTag(Buffer.from(tagText, "base64"));
  const clear = Buffer.concat([
    decipher.update(Buffer.from(ciphertextText, "base64")),
    decipher.final()
  ]);
  return clear.toString("utf8");
}

export function canonicalJson(value) {
  if (Array.isArray(value)) {
    return `[${value.map((item) => canonicalJson(item)).join(",")}]`;
  }

  if (value && typeof value === "object") {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`)
      .join(",")}}`;
  }

  return JSON.stringify(value);
}

function privateKeyObject() {
  const pem = process.env.LICENSE_ED25519_PRIVATE_KEY_PEM?.replaceAll("\\n", "\n");
  if (pem) return crypto.createPrivateKey(pem);

  const base64 = process.env.LICENSE_ED25519_PRIVATE_KEY_BASE64;
  if (base64) {
    return crypto.createPrivateKey({
      key: Buffer.from(base64, "base64"),
      format: "der",
      type: "pkcs8"
    });
  }

  return null;
}

export function signLicensePayload(license) {
  const key = privateKeyObject();
  if (!key) return null;

  return crypto.sign(null, Buffer.from(canonicalJson(license), "utf8"), key).toString("base64");
}

export function buildLicensePayload({
  license,
  activation,
  email,
  machineId,
  softwareVersion,
  now = new Date()
}) {
  return {
    license_id: license.id,
    activation_id: activation.id,
    app_id: license.app_id || process.env.LICENSE_APP_ID || DEFAULT_APP_ID,
    email,
    license_key_sha256: license.license_key_hash,
    machine_id: machineId,
    software_version: softwareVersion,
    issued_at_utc: license.created_at || now.toISOString(),
    last_server_validation_utc: now.toISOString(),
    expires_at_utc: license.expires_at || null,
    revoked: license.status === "revoked" || license.status === "blocked",
    revoked_at_utc: license.revoked_at || null,
    offline_allowed: license.offline_allowed ?? true,
    offline_max_days: license.offline_max_days ?? 30,
    features: license.features || DEFAULT_FEATURES
  };
}

export function successResponse(license) {
  return {
    ok: true,
    status: "ACTIVE",
    message: "Licenca valida.",
    license,
    signature: signLicensePayload(license)
  };
}

export function errorResponse(code, message, status = "DENIED") {
  return {
    ok: false,
    status,
    code,
    message
  };
}

// Gera respostas assinadas exatamente como o portal (lib/license-crypto.js).
import crypto from "node:crypto";
import fs from "node:fs";

function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map((item) => canonicalJson(item)).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

const [,, machineId, outDir, lastValidationIso] = process.argv;
let keys;
const keyFile = `${outDir}/key.json`;
if (fs.existsSync(keyFile)) {
  const k = JSON.parse(fs.readFileSync(keyFile, "utf8"));
  keys = { privateKey: crypto.createPrivateKey({ key: Buffer.from(k.priv, "base64"), format: "der", type: "pkcs8" }), pub: k.pub };
} else {
  const { privateKey, publicKey } = crypto.generateKeyPairSync("ed25519");
  const pub = publicKey.export({ type: "spki", format: "der" }).toString("base64");
  const priv = privateKey.export({ type: "pkcs8", format: "der" }).toString("base64");
  fs.writeFileSync(keyFile, JSON.stringify({ pub, priv }));
  keys = { privateKey, pub };
}

function build(software, productId, email, validation) {
  const license = {
    license_id: "8f0c1a2e-0000-4000-8000-000000000001",
    activation_id: "8f0c1a2e-0000-4000-8000-000000000002",
    app_id: "com.winportal.windowssoftware",
    product_id: productId,
    software,
    email,
    license_key_sha256: "ab".repeat(32),
    machine_id: machineId,
    software_version: "1.0.0",
    issued_at_utc: "2026-10-01T12:00:00.000Z",
    expires_at_utc: null,
    last_validation_utc: validation,
    last_server_validation_utc: validation,
    status: "ACTIVE",
    revoked: false,
    revoked_at_utc: null,
    offline_allowed: true,
    offline_max_days: 30,
    features: ["core", "relatório \"especial\" \\ ç ✓ \n"],
  };
  const signature = crypto.sign(null, Buffer.from(canonicalJson(license), "utf8"), keys.privateKey).toString("base64");
  return { ok: true, status: "ACTIVE", message: "Licenca valida.", license, signature };
}

const now = lastValidationIso || new Date().toISOString();
fs.writeFileSync(`${outDir}/activation.json`, JSON.stringify(build("ImageAnalyzer", "image-analyzer", "cliente.joão@exemplo.com", now)));
fs.writeFileSync(`${outDir}/wrong-product.json`, JSON.stringify(build("PDFAnalyzer", "pdf-analyzer", "cliente.joão@exemplo.com", now)));
fs.writeFileSync(`${outDir}/canonical.txt`, canonicalJson(build("ImageAnalyzer", "image-analyzer", "cliente.joão@exemplo.com", now).license));
fs.writeFileSync(`${outDir}/pub.txt`, keys.pub);

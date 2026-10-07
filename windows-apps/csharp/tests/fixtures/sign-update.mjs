// Gera um manifesto de atualização assinado como o portal (lib/app-updates.js).
import crypto from "node:crypto";
import fs from "node:fs";

function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map((item) => canonicalJson(item)).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

const [,, outDir] = process.argv;
const k = JSON.parse(fs.readFileSync(`${outDir}/key.json`, "utf8"));
const privateKey = crypto.createPrivateKey({ key: Buffer.from(k.priv, "base64"), format: "der", type: "pkcs8" });
const base = "https://github.com/gustavotoigo-max/win-portal/releases/download/complete-solution-v1.2.0";
const manifest = {
  kind: "winportal-update-v1",
  executable: "SolucaoCompleta",
  checked_at_utc: "2026-10-07T19:00:00.000Z",
  latest: {
    version: "1.2.0",
    published_at_utc: "2026-10-07T18:00:00.000Z",
    notes_url: "https://github.com/gustavotoigo-max/win-portal/releases/tag/complete-solution-v1.2.0",
    portable: { name: "SolucaoCompleta.exe", url: `${base}/SolucaoCompleta.exe`, size: 73827341, sha256: "a".repeat(64) },
    installer: { name: "SolucaoCompleta-Setup.exe", url: `${base}/SolucaoCompleta-Setup.exe`, size: 68000000, sha256: "b".repeat(64) }
  }
};
const signature = crypto.sign(null, Buffer.from(canonicalJson(manifest), "utf8"), privateKey).toString("base64");
fs.writeFileSync(`${outDir}/update.json`, JSON.stringify({ manifest, signature }));

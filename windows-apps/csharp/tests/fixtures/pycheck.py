# Usa o código Python original (crypto_utils.py) para cruzar com a versão C#.
import base64, json, sys, types, importlib.util, os
mode = sys.argv[1]
# Por padrão usa a cópia de aplicativos\dwg_cleaner (esta pasta fica em aplicativos\csharp\tests\fixtures).
here = os.path.dirname(os.path.abspath(__file__))
src = os.environ.get("CRYPTO_UTILS_PY") or os.path.join(here, "..", "..", "..", "dwg_cleaner", "activation", "crypto_utils.py")
if not os.path.exists(src):
    src = "/mnt/user-data/uploads/aplicativos/dwg_cleaner/activation/crypto_utils.py"
code = open(src, encoding="utf-8").read()
code = code.replace("from .config import ED25519_PUBLIC_KEY_BASE64", "ED25519_PUBLIC_KEY_BASE64 = open(os.environ['PUBKEY_FILE']).read().strip()")
code = code.replace("from .debug import log_step", "log_step = lambda m: None")
mod = types.ModuleType("crypto_utils"); mod.__dict__["os"] = os
exec(compile(code, src, "exec"), mod.__dict__)
if mode == "verify":
    resp = json.load(open(sys.argv[2], encoding="utf-8"))
    print(mod.verify_ed25519_signature(resp["license"], resp["signature"]))
elif mode == "canonical":
    resp = json.load(open(sys.argv[2], encoding="utf-8"))
    sys.stdout.buffer.write(mod.canonical_json_bytes(resp["license"]))
elif mode == "encrypt":
    resp = json.load(open(sys.argv[2], encoding="utf-8"))
    print(json.dumps(mod.encrypt_json_for_machine(resp, sys.argv[3]), indent=2))
elif mode == "decrypt":
    enc = json.load(open(sys.argv[2], encoding="utf-8"))
    data = mod.decrypt_json_for_machine(enc, sys.argv[3])
    print(mod.verify_ed25519_signature(data["license"], data["signature"]), data["license"]["email"])

# Contrato de ativação site ↔ aplicativos Python

Este documento registra a comunicação entre o portal e os aplicativos Windows
(Python). **Nada aqui pode mudar sem atualizar os aplicativos.** A reconstrução
do site preservou todos os itens abaixo byte a byte: os arquivos
`app/api/ativar/route.js`, `app/api/revalidar/route.js`,
`app/api/licenses/validate/route.js`, `app/api/download/[productId]/route.js`,
`lib/license-crypto.js` e `lib/github-releases.js` não foram alterados.

## Endpoints

| Método | Rota | Uso |
|---|---|---|
| `POST` | `/api/ativar` | Primeira ativação de uma chave numa máquina |
| `POST` | `/api/revalidar` | Revalidação periódica de uma ativação existente |
| `POST` | `/api/licenses/validate` | Endpoint legado (tabela `machines`) |
| `GET` | `/api/download/<product-id>` | Redireciona para o instalador mais recente |

### `POST /api/ativar`

```json
{
  "app_id": "com.winportal.windowssoftware",
  "software": "ImageAnalyzer",
  "email": "cliente@empresa.com",
  "license_key": "WIN-XXXX-XXXX-XXXX-XXXX",
  "machine_id": "id-unico-da-maquina",
  "machine_name": "DESKTOP-01",
  "software_version": "1.0.0",
  "system_info": {}
}
```

Obrigatórios: `email`, `license_key`, `machine_id`, `software`. `app_id` é
opcional (padrão `com.winportal.windowssoftware`, ou `LICENSE_APP_ID`).

Regras, na ordem em que são verificadas:

1. `software` precisa casar com um produto (id, nome, prefixo ou alias,
   comparados sem acento, espaço ou caixa) → senão `INVALID_SOFTWARE` (403).
2. `app_id` precisa ser igual a `LICENSE_APP_ID` → senão `INVALID_APP_ID` (403).
3. A chave é localizada por `HMAC-SHA256(LICENSE_HMAC_SECRET, trim(upper(chave)))`
   em `licenses.license_key_hash` → senão `INVALID_LICENSE_KEY` (404).
4. O e-mail precisa ser o da licença (`customer_email` ou e-mail do perfil) →
   senão `INVALID_EMAIL` (403).
5. `LICENSE_APP_MISMATCH`, `LICENSE_PRODUCT_MISSING`, `SOFTWARE_MISMATCH` (403).
6. Status `revoked`/`blocked` → `LICENSE_REVOKED`; outro status não ativo →
   `INVALID_LICENSE_STATUS`; vencida → `LICENSE_EXPIRED` (todos HTTP 200).
7. Máquina nova com ativações `active` ≥ `max_machines` →
   `ACTIVATION_LIMIT_REACHED` (HTTP 200).
8. Sucesso: upsert em `activations` (por `license_id, machine_id`) e registro em
   `validation_logs`.

### `POST /api/revalidar`

```json
{
  "license_id": "uuid",
  "activation_id": "uuid",
  "software": "ImageAnalyzer",
  "email": "cliente@empresa.com",
  "machine_id": "id-unico-da-maquina",
  "software_version": "1.0.0",
  "system_info": {}
}
```

Erros adicionais: `INVALID_ACTIVATION` (404) se a ativação não existir mais,
`MACHINE_MISMATCH`, e `LICENSE_REVOKED` se a ativação não estiver `active`.

### Resposta de sucesso (ativar e revalidar)

```json
{
  "ok": true,
  "status": "ACTIVE",
  "message": "Licenca valida.",
  "license": {
    "license_id": "...", "activation_id": "...", "app_id": "...",
    "product_id": "image-analyzer", "software": "ImageAnalyzer",
    "email": "...", "license_key_sha256": "...", "machine_id": "...",
    "software_version": "...", "issued_at_utc": "...", "expires_at_utc": null,
    "last_validation_utc": "...", "last_server_validation_utc": "...",
    "status": "ACTIVE", "revoked": false, "revoked_at_utc": null,
    "offline_allowed": true, "offline_max_days": 30, "features": ["core"]
  },
  "signature": "<Ed25519 base64 sobre o JSON canônico de license>"
}
```

O JSON canônico ordena as chaves recursivamente e não tem espaços
(`canonicalJson` em `lib/license-crypto.js`).

### Resposta de erro

```json
{ "ok": false, "status": "DENIED", "code": "INVALID_EMAIL", "message": "..." }
```

## Formato da chave

`WIN-XXXX-XXXX-XXXX-XXXX` (hex maiúsculo). O banco guarda somente o HMAC
(`license_key_hash`), os 4 últimos caracteres (`license_key_hint`) e a chave
cifrada com AES-256-GCM (`license_key_ciphertext`) para exibição ao cliente.
Licenças do ADM e da loja usam o mesmo gerador (`lib/licenses/issue.js`).

## Produtos

O `software` enviado pelo aplicativo é casado com `lib/products.js`. Os campos
`id`, `name`, `orderPrefix`, `releaseAsset` e `aliases` fazem parte do contrato
e não devem ser renomeados. O valor `software` devolvido no payload é sempre
`aliases[0]`.

| product_id | aliases[0] | Asset de release |
|---|---|---|
| image-analyzer | ImageAnalyzer | ImageAnalyzer.exe |
| pdf-analyzer | PDFAnalyzer | PDFAnalyzer.exe |
| firebird-analyzer | FirebirdAnalyzer | FirebirdAnalyzer.exe |
| mysql-analyzer | MySQLAnalyzer | MySQLAnalyzer.exe |
| sector-dbfb-repair | SectorDBFBRepair | SectorDBRepair.exe |
| dwg-cleaner | DWGCleaner | DWGCleaner.exe |
| rename-folder | RenameFolder | RenameFolder.exe |
| mdb-integrity | MDBIntegrity | MDBIntegrity.exe |
| empty-folder-cleaner | EmptyFolderCleaner | EmptyFolders.exe |
| complete-solution | SolucaoCompleta | OfficeCleaner.exe |

## Variáveis de ambiente do contrato

`LICENSE_APP_ID`, `LICENSE_HMAC_SECRET`, `LICENSE_ENCRYPTION_KEY`,
`LICENSE_ED25519_PRIVATE_KEY_PEM` / `LICENSE_ED25519_PRIVATE_KEY_BASE64`.
Trocar qualquer uma invalida as chaves ou assinaturas já emitidas.

## Rotas de página mantidas

Links que podem estar dentro dos aplicativos ou de e-mails já enviados continuam
válidos: `/pt`, `/pt/solucoes/<product-id>`, `/pt/login`, `/pt/cadastro`,
`/pt/dashboard`, `/pt/esqueci-senha`, `/pt/trocar-senha`, `/ADM`. Os
endereços `/en/...` redirecionam para o equivalente em `/pt/...`.

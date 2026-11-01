import Link from "next/link";
import { LicenseKey } from "@/components/account/LicenseKey";
import ReleaseMachineButton from "@/components/account/ReleaseMachineButton";
import NpapActionButton from "@/components/admin/NpapActionButton";
import Icon from "@/components/site/Icon";
import ProductIcon from "@/components/site/ProductIcon";

export default function LicenseCard({ license }) {
  const { product } = license;

  return (
    <article className="license-card">
      <header className="license-card-head">
        <ProductIcon product={product} />
        <div className="license-card-title">
          <h3>{product?.title || "Produto"}</h3>
          <span>Pedido {license.orderNumber} · {license.purchasedAt}</span>
        </div>
        <span className={`status status-${license.status}`}>{license.statusLabel}</span>
      </header>

      <div className="license-card-body">
        {license.server ? (
          <div>
            <span className="field-label">Como entrar</span>
            <p className="muted small">Abra o programa e clique em Entrar pelo navegador. Não precisa de chave.</p>
          </div>
        ) : (
          <div>
            <span className="field-label">Chave de ativação</span>
            <LicenseKey licenseKey={license.key} />
          </div>
        )}

        <dl className="license-facts">
          <div><dt>Validade</dt><dd>{license.validity}</dd></div>
          <div><dt>Computadores</dt><dd>{license.activeMachines} de {license.maxMachines}</dd></div>
        </dl>

        <div className="machines">
          <span className="field-label">Computadores vinculados</span>
          {license.machines.length ? (
            <ul>
              {license.machines.map((machine) => (
                <li key={machine.id}>
                  <Icon name="monitor" size={18} />
                  <div>
                    <strong>{machine.name}</strong>
                    <small>
                      {license.server
                        ? `${machine.status === "blocked" ? "Bloqueado" : machine.inUse ? "Em uso agora" : "Conectado"} · último uso ${machine.lastSeen}`
                        : `${machine.status === "active" ? "Ativo" : "Inativo"}${machine.version ? ` · versão ${machine.version}` : ""} · última validação ${machine.lastSeen}`}
                    </small>
                  </div>
                  {license.server ? (
                    <NpapActionButton
                      endpoint="/api/conta/computadores"
                      body={{ licenseId: license.id, deviceId: machine.id }}
                      label="Liberar"
                      confirmText={`O programa deixará de funcionar em ${machine.name} até entrar de novo. Liberar?`}
                    />
                  ) : license.status === "active" && (
                    <ReleaseMachineButton activationId={machine.id} machineName={machine.name} />
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted small">
              {license.server
                ? "Nenhum computador conectado ainda. Abra o programa e entre pelo navegador."
                : "Nenhum computador ativado ainda. Abra o aplicativo e informe seu e-mail e esta chave."}
            </p>
          )}
        </div>
      </div>

      {product && (
        <footer className="license-card-foot">
          <a className="btn btn-ghost btn-sm" href={product.downloadUrl}>
            <Icon name="download" size={16} /> Baixar instalador
          </a>
          <Link className="link-muted" href={product.pagePath}>Página do produto</Link>
        </footer>
      )}
    </article>
  );
}

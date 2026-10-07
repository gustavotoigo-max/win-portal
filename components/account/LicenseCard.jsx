import Link from "next/link";
import { LicenseKey } from "@/components/account/LicenseKey";
import ReleaseMachineButton from "@/components/account/ReleaseMachineButton";
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
        <div>
          <span className="field-label">Chave de ativação</span>
          <LicenseKey licenseKey={license.key} />
        </div>

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
                      {machine.status === "active" ? "Ativo" : "Inativo"}
                      {machine.version ? ` · versão ${machine.version}` : ""} · última validação {machine.lastSeen}
                    </small>
                  </div>
                  {license.status === "active" && (
                    <ReleaseMachineButton activationId={machine.id} machineName={machine.name} />
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted small">Nenhum computador ativado ainda. Abra o aplicativo e informe seu e-mail e esta chave.</p>
          )}
        </div>
      </div>

      {product && (
        <footer className="license-card-foot">
          <a className="btn btn-ghost btn-sm" href={product.downloadUrl}>
            <Icon name="download" size={16} /> Baixar instalador
          </a>
          <Link className="link-muted" href={`/pt/solucoes/${product.id}`}>Página do produto</Link>
        </footer>
      )}
    </article>
  );
}

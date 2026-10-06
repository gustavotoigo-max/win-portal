import Link from "next/link";
import Icon from "@/components/site/Icon";
import { Brand } from "@/components/site/SiteHeader";

const points = [
  ["key", "Suas chaves de ativação sempre à mão"],
  ["monitor", "Veja e libere os computadores vinculados"],
  ["receipt", "Histórico completo de pedidos"]
];

export default function AuthLayout({ children }) {
  return (
    <div className="auth-shell">
      <aside className="auth-aside">
        <Brand />
        <div>
          <h2>Ferramentas profissionais, licenças sob controle.</h2>
          <ul>
            {points.map(([icon, text]) => (
              <li key={text}><Icon name={icon} size={20} /> {text}</li>
            ))}
          </ul>
        </div>
        <Link className="auth-back" href="/pt">← Voltar para a loja</Link>
      </aside>
      <main className="auth-main">
        <div className="auth-mobile-brand"><Brand /></div>
        {children}
      </main>
    </div>
  );
}

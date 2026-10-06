import Link from "next/link";
import { Brand } from "@/components/site/SiteHeader";
import { getProductPagesByCategory } from "@/lib/product-pages";

export default function SiteFooter() {
  const groups = getProductPagesByCategory().filter((group) => group.key !== "pacote");
  const year = new Date().getFullYear();

  return (
    <footer className="site-footer">
      <div className="container footer-grid">
        <div className="footer-brand">
          <Brand />
          <p>Ferramentas Windows para recuperação de dados, bancos de dados e organização de arquivos.</p>
        </div>
        {groups.map((group) => (
          <div key={group.key}>
            <p className="footer-title">{group.title}</p>
            {group.products.map((product) => (
              <Link href={`/pt/solucoes/${product.id}`} key={product.id}>{product.title}</Link>
            ))}
          </div>
        ))}
        <div>
          <p className="footer-title">Sua conta</p>
          <Link href="/pt/dashboard">Minhas licenças</Link>
          <Link href="/pt/login">Entrar</Link>
          <Link href="/pt/cadastro">Criar conta</Link>
          <Link href="/pt/solucoes/complete-solution">Solução Completa</Link>
        </div>
      </div>
      <div className="container footer-bottom">
        <span>© {year} WinPortal. Todos os direitos reservados.</span>
        <span>Compra em modo de demonstração: nenhum pagamento é processado.</span>
      </div>
    </footer>
  );
}

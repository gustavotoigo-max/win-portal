import Link from "next/link";
import Icon from "@/components/site/Icon";
import ProductIcon from "@/components/site/ProductIcon";
import PageShell from "@/components/site/PageShell";
import ProductCard from "@/components/site/ProductCard";
import { getProductPage } from "@/lib/product-pages";

const highlights = [
  ["shield", "Original intocado", "O programa só lê o arquivo; o resultado é sempre um banco novo."],
  ["database", "Firebird 1.x a 5", "O motor certo para cada banco, escolhido automaticamente."],
  ["repair", "Enxerto de backups", "Backups antigos devolvem setores, estrutura e blobs perdidos."],
  ["monitor", "Controle pela conta", "Entre pelo navegador e libere computadores no painel."]
];

const steps = [
  ["Crie sua conta", "Cadastre-se com e-mail ou com a sua conta Google."],
  ["Ative a licença", "Conclua a compra com o seu cupom. A licença aparece em Minha conta."],
  ["Baixe e entre", "Instale o FbRecovery e confirme o acesso no site, sem chave."],
  ["Recupere o banco", "Abra o .fdb, adicione backups se tiver e gere o banco novo."]
];

const faq = [
  ["Como ativo o FbRecovery?", "Abra o programa e clique para entrar: o navegador abre o site e você confirma com a sua conta. Não há chave para digitar."],
  ["O arquivo original é alterado?", "Nunca. O banco recuperado é sempre um arquivo novo, na pasta que você escolher."],
  ["Meus arquivos ficam guardados?", "Não. O banco é usado apenas durante a análise e a recuperação e é apagado assim que o resultado é baixado."],
  ["Troquei de computador. E agora?", "Em Minha conta, libere o computador antigo e entre no novo. Cada licença vale para 1 computador por vez."],
  ["Preciso de internet?", "Sim, o programa trabalha conectado: confere a licença e faz a análise e a recuperação com a conexão ativa."]
];

export default function HomePage() {
  const product = getProductPage("fbrecovery");

  return (
    <PageShell>
      <section className="hero">
        <div className="container hero-grid">
          <div className="hero-copy">
            <span className="eyebrow eyebrow-light">Recuperação de bancos Firebird</span>
            <h1>Bancos Firebird corrompidos de volta ao trabalho.</h1>
            <p className="lead">
              O FbRecovery examina o .fdb página por página, mostra o que se perdeu e gera um banco novo e utilizável,
              aproveitando backups antigos para trazer de volta o que faltou.
            </p>
            <div className="hero-actions">
              <Link className="btn btn-primary btn-lg" href={product.pagePath}>
                Conhecer o FbRecovery <Icon name="arrow" size={18} />
              </Link>
              <Link className="btn btn-outline-light btn-lg" href="/pt/dashboard">Já tenho conta</Link>
            </div>
          </div>

          <div className="hero-visual" aria-hidden="true">
            <div className="window">
              <div className="window-bar"><span /><span /><span /><em>FbRecovery</em></div>
              <div className="window-body">
                <div className="activation-row">
                  <ProductIcon product={product} />
                  <div>
                    <strong>Vendas Loja.fdb</strong>
                    <small>Firebird 3 · 6 tabelas com perda de páginas</small>
                  </div>
                  <span className="status status-active">Recuperado</span>
                </div>
                <div className="fake-field"><small>Backups doadores</small><span>backup_outubro.fdb</span></div>
                <div className="fake-field"><small>Restaurado</small><span>97,4% dos registros · 100% dos objetos</span></div>
                <div className="fake-progress"><span /></div>
                <p className="fake-ok"><Icon name="check" size={16} /> Todas as tabelas legíveis no banco novo</p>
              </div>
            </div>
            <div className="floating-card">
              <Icon name="monitor" size={18} />
              <div>
                <strong>1 de 1 computador</strong>
                <small>DESKTOP-SUPORTE</small>
              </div>
            </div>
          </div>
        </div>

        <div className="container highlight-row">
          {highlights.map(([icon, title, text]) => (
            <div className="highlight" key={title}>
              <Icon name={icon} />
              <div>
                <strong>{title}</strong>
                <span>{text}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="section" id="produtos">
        <div className="container">
          <div className="section-head">
            <span className="eyebrow">Produto</span>
            <h2>Feito para quem recupera bancos todos os dias</h2>
            <p>Diagnóstico, reparo e enxerto num só programa, com relatório pronto para o cliente.</p>
          </div>
          <div className="product-grid">
            <ProductCard product={product} featured />
          </div>
        </div>
      </section>

      <section className="section" id="como-funciona">
        <div className="container">
          <div className="section-head">
            <span className="eyebrow">Como funciona</span>
            <h2>Da conta à recuperação em quatro passos</h2>
          </div>
          <ol className="steps">
            {steps.map(([title, text], index) => (
              <li key={title}>
                <span className="step-number">{index + 1}</span>
                <h3>{title}</h3>
                <p>{text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="section" id="perguntas">
        <div className="container narrow">
          <div className="section-head center">
            <span className="eyebrow">Dúvidas</span>
            <h2>Perguntas frequentes</h2>
          </div>
          <div className="faq">
            {faq.map(([question, answer]) => (
              <details key={question}>
                <summary>{question}</summary>
                <p>{answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="container">
        <div className="cta-band">
          <h2>Pronto para começar?</h2>
          <p>Crie sua conta, ative a licença e baixe o FbRecovery.</p>
          <div className="hero-actions center">
            <Link className="btn btn-primary btn-lg" href={product.pagePath}>Conhecer o FbRecovery</Link>
            <Link className="btn btn-outline-light btn-lg" href="/pt/cadastro">Criar conta</Link>
          </div>
        </div>
      </section>
    </PageShell>
  );
}

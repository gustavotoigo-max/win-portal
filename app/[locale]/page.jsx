import Link from "next/link";
import Icon from "@/components/site/Icon";
import ProductIcon from "@/components/site/ProductIcon";
import PageShell from "@/components/site/PageShell";
import ProductCard from "@/components/site/ProductCard";
import { formatPrice, getAllProductPages, getProductPage, getProductPagesByCategory } from "@/lib/product-pages";

const highlights = [
  ["bolt", "Ativação em segundos", "Informe e-mail e chave no aplicativo e pronto."],
  ["lock", "Execução local", "Seus arquivos nunca saem do computador."],
  ["key", "Licença vitalícia", "Pagamento único, sem mensalidade."],
  ["monitor", "Controle de computadores", "Libere e troque de máquina pela sua conta."]
];

const steps = [
  ["Escolha a ferramenta", "Compare os produtos e veja o que cada um resolve."],
  ["Conclua a compra", "Crie sua conta e finalize o pedido em poucos cliques."],
  ["Baixe o instalador", "O download da versão mais recente fica na página do produto."],
  ["Ative com sua chave", "Use o e-mail da conta e a chave exibida no painel."]
];

const faq = [
  [
    "Como recebo minha licença?",
    "Assim que o pedido é concluído, a chave aparece no painel Minha conta e também é enviada para o seu e-mail."
  ],
  [
    "Como ativo o software?",
    "Instale o aplicativo, abra a tela de ativação e informe o mesmo e-mail da sua conta junto com a chave WIN-XXXX-XXXX-XXXX-XXXX."
  ],
  [
    "Troquei de computador. E agora?",
    "No painel Minha conta, desvincule o computador antigo e ative a licença no novo. Cada licença vale para 1 computador por vez."
  ],
  [
    "Preciso estar conectado à internet?",
    "Apenas para ativar e revalidar. Depois de ativado, o aplicativo funciona offline por até 30 dias entre validações."
  ],
  [
    "Existe mensalidade?",
    "Não. As licenças vendidas no site são vitalícias, com pagamento único."
  ]
];

export default function HomePage() {
  const groups = getProductPagesByCategory();
  const all = getAllProductPages();
  const bundle = getProductPage("complete-solution");
  const lowest = Math.min(...all.map((product) => product.price));

  return (
    <PageShell>
      <section className="hero">
        <div className="container hero-grid">
          <div className="hero-copy">
            <span className="eyebrow eyebrow-light">Ferramentas profissionais para Windows</span>
            <h1>Recupere, verifique e organize arquivos com ferramentas feitas para quem resolve.</h1>
            <p className="lead">
              Softwares especializados em recuperação de dados, diagnóstico de bancos e organização de arquivos.
              Compre uma vez, ative em segundos e gerencie suas licenças em um só lugar.
            </p>
            <div className="hero-actions">
              <Link className="btn btn-primary btn-lg" href="/pt/solucoes">
                Ver produtos <Icon name="arrow" size={18} />
              </Link>
              <Link className="btn btn-outline-light btn-lg" href="/pt/dashboard">Já tenho licença</Link>
            </div>
            <p className="hero-note">Licenças a partir de {formatPrice(lowest)}, pagamento único.</p>
          </div>

          <div className="hero-visual" aria-hidden="true">
            <div className="window">
              <div className="window-bar"><span /><span /><span /><em>Ativação</em></div>
              <div className="window-body">
                <div className="activation-row">
                  <ProductIcon product={getProductPage("image-analyzer")} size={44} priority />
                  <div>
                    <strong>Image Analyzer</strong>
                    <small>Versão 1.2.0</small>
                  </div>
                  <span className="status status-active">Ativa</span>
                </div>
                <div className="fake-field"><small>E-mail</small><span>voce@empresa.com.br</span></div>
                <div className="fake-field"><small>Chave</small><span className="mono">WIN-7F3A-91C2-44DE-B810</span></div>
                <div className="fake-progress"><span /></div>
                <p className="fake-ok"><Icon name="check" size={16} /> Licença validada neste computador</p>
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
            <span className="eyebrow">Produtos</span>
            <h2>Escolha a ferramenta certa para o trabalho</h2>
            <p>Cada aplicativo resolve uma tarefa específica, com uma interface direta e licença própria.</p>
          </div>

          {groups.filter((group) => group.key !== "pacote").map((group) => (
            <div className="category-block" key={group.key}>
              <div className="category-head">
                <h3>{group.title}</h3>
                <p>{group.description}</p>
              </div>
              <div className="product-grid">
                {group.products.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {bundle && (
        <section className="container">
          <div className="bundle-banner">
            <div>
              <span className="eyebrow eyebrow-light">{bundle.categoryTitle}</span>
              <h2>{bundle.title}</h2>
              <p>{bundle.tagline}</p>
            </div>
            <div className="bundle-price">
              <span>{bundle.priceLabel}</span>
              <small>licença vitalícia</small>
              <Link className="btn btn-light" href={`/pt/solucoes/${bundle.id}`}>Conhecer a Solução Completa</Link>
            </div>
          </div>
        </section>
      )}

      <section className="section" id="como-funciona">
        <div className="container">
          <div className="section-head">
            <span className="eyebrow">Como funciona</span>
            <h2>Da compra à ativação em quatro passos</h2>
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

      <section className="section section-muted">
        <div className="container split">
          <div>
            <span className="eyebrow">Área do cliente</span>
            <h2>Suas licenças sob controle</h2>
            <p className="muted">
              Tudo o que você comprou fica reunido no painel da sua conta, com chaves, computadores vinculados e
              histórico de pedidos.
            </p>
            <ul className="check-list">
              <li><Icon name="check" size={18} /> Copie a chave de ativação sempre que precisar</li>
              <li><Icon name="check" size={18} /> Veja em qual computador cada licença está ativa</li>
              <li><Icon name="check" size={18} /> Desvincule uma máquina para usar em outra</li>
              <li><Icon name="check" size={18} /> Baixe a versão mais recente de cada produto</li>
            </ul>
            <Link className="btn btn-primary" href="/pt/cadastro">Criar minha conta</Link>
          </div>
          <div className="account-preview" aria-hidden="true">
            <div className="preview-license">
              <div className="preview-license-head">
                <ProductIcon product={getProductPage("firebird-analyzer")} size={44} />
                <div>
                  <strong>Firebird Analyzer</strong>
                  <small>Pedido FIREBIRDANALYZER-2026…</small>
                </div>
                <span className="status status-active">Ativa</span>
              </div>
              <div className="preview-key mono">WIN-3C9E-0B7A-5D21-E4F8</div>
              <div className="preview-machines">
                <span><Icon name="monitor" size={16} /> NOTEBOOK-TECNICO</span>
                <em>Desvincular</em>
              </div>
            </div>
            <div className="preview-license dim">
              <div className="preview-license-head">
                <ProductIcon product={getProductPage("empty-folder-cleaner")} size={44} />
                <div>
                  <strong>Empty Folder Cleaner</strong>
                  <small>Nenhum computador ativo</small>
                </div>
                <span className="status status-active">Ativa</span>
              </div>
            </div>
          </div>
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
          <p>Crie sua conta, escolha a ferramenta e ative em poucos minutos.</p>
          <div className="hero-actions center">
            <Link className="btn btn-primary btn-lg" href="/pt/solucoes">Ver produtos</Link>
            <Link className="btn btn-outline-light btn-lg" href="/pt/cadastro">Criar conta</Link>
          </div>
        </div>
      </section>
    </PageShell>
  );
}

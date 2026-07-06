export const locales = ["pt", "en"];
export const defaultLocale = "pt";

export const dictionaries = {
  pt: {
    nav: {
      home: "Home",
      dashboard: "Dashboard",
      signup: "Cadastro",
      login: "Login",
      admin: "ADM"
    },
    common: {
      createAccount: "Criar conta",
      login: "Login",
      signup: "Cadastro",
      ready: "Pronto para comecar?",
      software: "Windows Software"
    },
    home: {
      eyebrow: "Windows Software",
      title: "Venda, entregue e controle licencas de software em um portal seguro.",
      text: "O WinPortal organiza cadastro, pagamento, licencas, maquinas registradas e suporte em uma experiencia moderna para clientes e administradores.",
      welcomeTitle: "Comece do jeito certo",
      welcomeText: "Crie sua conta para comprar licencas ou entre para acompanhar seus pedidos e maquinas registradas.",
      resourcesTitle: "Recursos para vender seu software",
      resources: [
        ["Checkout integrado", "Pagamento via Stripe com confirmacao por webhook e criacao automatica de licencas."],
        ["Licencas por usuario", "Cada cliente acompanha chaves, status, ordem de compra e ultima maquina registrada."],
        ["Painel administrativo", "Administradores podem ativar, revogar e bloquear licencas com historico de auditoria."]
      ],
      howTitle: "Como funciona?",
      howText: "O usuario cria a conta, compra o software, recebe uma licenca e o app Windows valida essa licenca contra a API segura do portal.",
      advantagesTitle: "Vantagens do portal",
      advantages: [
        ["Venda organizada", "Pedidos, usuarios e licencas conectados ao mesmo fluxo."],
        ["Controle de maquinas", "Registre a ultima maquina usada e limite ativacoes por licenca."],
        ["Seguranca", "Validacoes rodam no servidor, com regras de banco e area ADM protegida."],
        ["Escala", "Pronto para portugues, ingles, novos planos e novas licencas."]
      ],
      testimonialsTitle: "Relatos de usuarios",
      testimonials: [
        ["A compra ficou simples e a licenca apareceu no painel em poucos segundos.", "Cliente beta"],
        ["Consigo ver pedidos, maquinas e status sem depender de planilhas.", "Administrador"],
        ["A validacao da licenca deixou o suporte muito mais objetivo.", "Equipe tecnica"]
      ],
      faqTitle: "Perguntas frequentes",
      faq: [
        ["Como a licenca e criada?", "Depois do pagamento confirmado pelo Stripe, um webhook cria a ordem e as licencas no Supabase."],
        ["O software Windows consegue validar a licenca?", "Sim. Ele chama uma API protegida que verifica status, maquina registrada e validade."],
        ["O ADM pode bloquear uma licenca?", "Sim. O painel ADM permite ativar, revogar ou bloquear licencas e registrar eventos."]
      ],
      finalTitle: "Crie sua conta ou acesse o sistema agora."
    },
    auth: {
      loginTitle: "Entrar",
      signupTitle: "Criar conta",
      loginText: "Entre com suas credenciais para acessar o sistema",
      signupText: "Configure seu acesso ao WinPortal",
      name: "Nome completo",
      email: "Email",
      company: "Empresa",
      password: "Senha",
      forgot: "Esqueci minha senha",
      submitLogin: "Entrar",
      submitSignup: "Cadastrar",
      noAccount: "Nao tem uma conta?",
      hasAccount: "Ja tem uma conta?",
      demoNotice: "Quando as variaveis do Supabase estiverem configuradas, este formulario fara login real."
    },
    dashboard: {
      title: "Minhas licencas",
      subtitle: "Acompanhe suas compras, maquinas registradas e status de cada licenca.",
      buy: "Comprar licenca",
      total: "Total",
      active: "Ativas",
      blocked: "Bloqueadas",
      revoked: "Revogadas",
      license: "Licenca",
      status: "Status",
      lastMachine: "Ultima maquina",
      lastSeen: "Ultima validacao",
      order: "Ordem de compra",
      date: "Data",
      note: "Dados de exemplo aparecem ate conectar o Supabase e autenticar usuarios reais."
    },
    admin: {
      title: "Painel ADM",
      subtitle: "Gerencie licencas, pedidos e maquinas registradas.",
      search: "Buscar por email, licenca ou pedido",
      activate: "Ativar",
      revoke: "Revogar",
      block: "Bloquear",
      user: "Usuario",
      license: "Licenca",
      status: "Status",
      machine: "Maquina",
      order: "Pedido",
      actions: "Acoes",
      note: "A interface esta pronta. As acoes chamam APIs que exigem a service role key no ambiente da Vercel."
    }
  },
  en: {
    nav: {
      home: "Home",
      dashboard: "Dashboard",
      signup: "Sign up",
      login: "Login",
      admin: "Admin"
    },
    common: {
      createAccount: "Create account",
      login: "Login",
      signup: "Sign up",
      ready: "Ready to start?",
      software: "Windows Software"
    },
    home: {
      eyebrow: "Windows Software",
      title: "Sell, deliver, and manage software licenses from a secure portal.",
      text: "WinPortal organizes signups, payments, licenses, registered machines, and support in a modern experience for customers and administrators.",
      welcomeTitle: "Start the right way",
      welcomeText: "Create an account to buy licenses or sign in to track orders and registered machines.",
      resourcesTitle: "Features for selling your software",
      resources: [
        ["Integrated checkout", "Stripe payments with webhook confirmation and automatic license creation."],
        ["User licenses", "Each customer can view keys, status, order number, and last registered machine."],
        ["Admin console", "Administrators can activate, revoke, and block licenses with an audit trail."]
      ],
      howTitle: "How does it work?",
      howText: "The user creates an account, buys the software, receives a license, and the Windows app validates it against the secure portal API.",
      advantagesTitle: "Portal benefits",
      advantages: [
        ["Organized sales", "Orders, users, and licenses connected to the same flow."],
        ["Machine control", "Store the last machine used and limit activations per license."],
        ["Security", "Validation runs on the server, with database rules and protected admin access."],
        ["Scalable", "Ready for Portuguese, English, new plans, and more licenses."]
      ],
      testimonialsTitle: "User feedback",
      testimonials: [
        ["The purchase was simple and the license showed up in the dashboard within seconds.", "Beta customer"],
        ["I can see orders, machines, and statuses without spreadsheets.", "Administrator"],
        ["License validation made support much more direct.", "Technical team"]
      ],
      faqTitle: "Frequently asked questions",
      faq: [
        ["How is a license created?", "After Stripe confirms the payment, a webhook creates the order and licenses in Supabase."],
        ["Can the Windows software validate a license?", "Yes. It calls a protected API that checks status, registered machine, and expiration."],
        ["Can an admin block a license?", "Yes. The admin panel can activate, revoke, or block licenses and log events."]
      ],
      finalTitle: "Create an account or access the system now."
    },
    auth: {
      loginTitle: "Sign in",
      signupTitle: "Create account",
      loginText: "Enter your credentials to access the system",
      signupText: "Set up your WinPortal access",
      name: "Full name",
      email: "Email",
      company: "Company",
      password: "Password",
      forgot: "Forgot password",
      submitLogin: "Sign in",
      submitSignup: "Sign up",
      noAccount: "No account yet?",
      hasAccount: "Already have an account?",
      demoNotice: "Once Supabase environment variables are configured, this form will perform real auth."
    },
    dashboard: {
      title: "My licenses",
      subtitle: "Track your purchases, registered machines, and each license status.",
      buy: "Buy license",
      total: "Total",
      active: "Active",
      blocked: "Blocked",
      revoked: "Revoked",
      license: "License",
      status: "Status",
      lastMachine: "Last machine",
      lastSeen: "Last validation",
      order: "Purchase order",
      date: "Date",
      note: "Sample data appears until Supabase is connected and real users are authenticated."
    },
    admin: {
      title: "Admin panel",
      subtitle: "Manage licenses, orders, and registered machines.",
      search: "Search by email, license, or order",
      activate: "Activate",
      revoke: "Revoke",
      block: "Block",
      user: "User",
      license: "License",
      status: "Status",
      machine: "Machine",
      order: "Order",
      actions: "Actions",
      note: "The interface is ready. Actions call APIs that require the service role key in the Vercel environment."
    }
  }
};

export function getDictionary(locale) {
  return dictionaries[locale] || dictionaries[defaultLocale];
}

export function normalizeLocale(locale) {
  return locales.includes(locale) ? locale : defaultLocale;
}

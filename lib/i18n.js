export const locales = ["pt", "en"];
export const defaultLocale = "pt";

export const dictionaries = {
  pt: {
    nav: {
      home: "Home",
      dashboard: "Dashboard",
      signup: "Cadastro",
      login: "Login",
      admin: "ADM",
      logout: "Sair"
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
      text: "O WinPortal organiza cadastro, compras de teste, licencas, maquinas registradas e suporte em uma experiencia moderna para clientes e administradores.",
      welcomeTitle: "Comece do jeito certo",
      welcomeText: "Crie sua conta para gerar uma licenca de teste ou entre para acompanhar seus pedidos e maquinas registradas.",
      resourcesTitle: "Recursos para vender seu software",
      resources: [
        ["Licenca oficial manual", "O administrador gera a key oficial para o e-mail do cliente e envia a chave manualmente."],
        ["Licencas por usuario", "Cada cliente acompanha chaves, status, ordem de compra e ultima maquina registrada."],
        ["Painel administrativo", "Administradores podem ativar, revogar e bloquear licencas com historico de auditoria."]
      ],
      howTitle: "Como funciona?",
      howText: "O administrador cria a licenca oficial para o e-mail do cliente, envia a key, e o cliente ativa o software pela API segura do portal.",
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
        ["Como a licenca e criada?", "Nesta etapa, o administrador informa o e-mail do cliente e gera uma licenca oficial manualmente no painel ADM."],
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
      demoNotice: "Quando as variaveis do Supabase estiverem configuradas, este formulario fara login real.",
      confirmEmailNotice: "Cadastro criado. Confirme seu e-mail antes de entrar, ou desative a confirmacao de e-mail no Supabase durante os testes.",
      emailNotConfirmed: "E-mail ainda nao confirmado. Abra o link enviado pelo Supabase ou desative Confirm email em Authentication > Providers > Email para testes."
    },
    dashboard: {
      title: "Minhas licencas",
      subtitle: "Acompanhe suas compras, maquinas registradas e status de cada licenca.",
      buy: "Gerar licenca oficial",
      generating: "Gerando...",
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
      copy: "Copiar",
      copied: "Copiado",
      clear: "Limpar",
      clearActivation: "Limpar ativacao",
      revoke: "Revogar",
      block: "Bloquear",
      updating: "Salvando...",
      actionError: "Nao foi possivel atualizar a licenca.",
      note: "Use a key gerada nesta lista dentro do software Windows. A maquina sera registrada quando o software validar a licenca.",
      empty: "Nenhuma licenca ainda. Aguarde o administrador criar uma licenca para o seu e-mail.",
      generatedKeyLabel: "Key gerada agora"
    },
    admin: {
      title: "Painel ADM",
      subtitle: "Gerencie licencas, pedidos e maquinas registradas.",
      search: "Buscar por email, licenca ou pedido",
      createLicense: "Gerar licenca oficial",
      manualTitle: "Criacao manual de licenca",
      manualText: "Informe o e-mail do cliente, gere a key oficial e envie essa key manualmente para ativacao no software.",
      customerEmail: "E-mail do cliente",
      maxMachines: "Maquinas",
      creating: "Gerando...",
      createSuccess: "Licenca oficial criada. Copie a key e envie ao cliente.",
      createError: "Nao foi possivel criar a licenca oficial.",
      generatedKey: "Key oficial gerada",
      licensesTitle: "Licencas emitidas",
      activate: "Ativar",
      clearActivation: "Limpar ativacao",
      revoke: "Revogar",
      block: "Bloquear",
      user: "Usuario",
      license: "Licenca",
      status: "Status",
      machine: "Maquina",
      machineName: "Nome da maquina",
      machineId: "Machine ID",
      softwareVersion: "Versao",
      activatedAt: "Ativada em",
      lastSeen: "Ultimo acesso",
      lastValidation: "Ultima validacao",
      lastIp: "Ultimo IP",
      createdAt: "Criada em",
      order: "Pedido",
      actions: "Acoes",
      note: "A interface esta pronta. As acoes chamam APIs que exigem a service role key no ambiente da Vercel.",
      empty: "Nenhuma licenca encontrada."
    }
  },
  en: {
    nav: {
      home: "Home",
      dashboard: "Dashboard",
      signup: "Sign up",
      login: "Login",
      admin: "Admin",
      logout: "Sign out"
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
      text: "WinPortal organizes signups, test purchases, licenses, registered machines, and support in a modern experience for customers and administrators.",
      welcomeTitle: "Start the right way",
      welcomeText: "Create an account to generate a test license or sign in to track orders and registered machines.",
      resourcesTitle: "Features for selling your software",
      resources: [
        ["Manual official license", "An administrator generates the official key for the customer's email and sends the key manually."],
        ["User licenses", "Each customer can view keys, status, order number, and last registered machine."],
        ["Admin console", "Administrators can activate, revoke, and block licenses with an audit trail."]
      ],
      howTitle: "How does it work?",
      howText: "The administrator creates the official license for the customer's email, sends the key, and the customer activates the software through the secure portal API.",
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
        ["How is a license created?", "At this stage, the administrator enters the customer's email and manually generates an official license in the admin panel."],
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
      demoNotice: "Once Supabase environment variables are configured, this form will perform real auth.",
      confirmEmailNotice: "Account created. Confirm your email before signing in, or disable email confirmation in Supabase during testing.",
      emailNotConfirmed: "Email is not confirmed yet. Open the link sent by Supabase or disable Confirm email in Authentication > Providers > Email for testing."
    },
    dashboard: {
      title: "My licenses",
      subtitle: "Track your purchases, registered machines, and each license status.",
      buy: "Generate official license",
      generating: "Generating...",
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
      copy: "Copy",
      copied: "Copied",
      clear: "Clear",
      clearActivation: "Clear activation",
      revoke: "Revoke",
      block: "Block",
      updating: "Saving...",
      actionError: "Could not update the license.",
      note: "Use the generated key in the Windows software. The machine is registered when the software validates the license.",
      empty: "No licenses yet. Wait for an administrator to create a license for your email.",
      generatedKeyLabel: "Key generated now"
    },
    admin: {
      title: "Admin panel",
      subtitle: "Manage licenses, orders, and registered machines.",
      search: "Search by email, license, or order",
      createLicense: "Generate official license",
      manualTitle: "Manual license creation",
      manualText: "Enter the customer email, generate the official key, and send it manually for activation in the software.",
      customerEmail: "Customer email",
      maxMachines: "Machines",
      creating: "Generating...",
      createSuccess: "Official license created. Copy the key and send it to the customer.",
      createError: "Could not create the official license.",
      generatedKey: "Official key generated",
      licensesTitle: "Issued licenses",
      activate: "Activate",
      clearActivation: "Clear activation",
      revoke: "Revoke",
      block: "Block",
      user: "User",
      license: "License",
      status: "Status",
      machine: "Machine",
      machineName: "Machine name",
      machineId: "Machine ID",
      softwareVersion: "Version",
      activatedAt: "Activated at",
      lastSeen: "Last seen",
      lastValidation: "Last validation",
      lastIp: "Last IP",
      createdAt: "Created at",
      order: "Order",
      actions: "Actions",
      note: "The interface is ready. Actions call APIs that require the service role key in the Vercel environment.",
      empty: "No licenses found."
    }
  }
};

export function getDictionary(locale) {
  return dictionaries[locale] || dictionaries[defaultLocale];
}

export function normalizeLocale(locale) {
  return locales.includes(locale) ? locale : defaultLocale;
}

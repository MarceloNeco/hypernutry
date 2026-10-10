/* =====================================================================
   diretrizes-config.js — HyperNutry
   O único arquivo do módulo comum (diretrizes.js) que muda de app para app.
   O HyperNutry já cuida do próprio PT/EN, datas, menu, busca, botão Voltar,
   leitor de rótulos e instalação (sw.js). Do módulo comum entram: o cofre de
   chaves de IA (o mesmo de todos os apps SolverONE) e a regra de rede
   (Wi-Fi ou dados). Sem anúncios, sem login do módulo (ainda não há contas).
   Módulo comum 1.9.0: interruptores e ⚡ Modo DEUS, manutenção, Fundo, Compat e Feedback.
   ===================================================================== */
DGO.iniciar({
  app: 'hypernutry',                        /* gaveta de dados: nunca mude */
  nome: { pt: 'HyperNutry', en: 'HyperNutry' },
  versaoApp: (window.HN && HN.version) || '',
  cor: '#10b981',
  corFundoBarra: '#0f172a',
  idiomaPadrao: 'pt',
  idiomaCompartilhado: true,

  /* as telas do HyperNutry já são bilíngues e formatam as próprias datas */
  seletorIdiomaVisivel: false,
  datasAutomaticas: false,
  varreduraAutomatica: false,
  ignorar: ['#top', '#parts', '#app', '#bn', '#layers'],

  anuncios: { ativo: false, arquivo: '', popup: { ativo: false } },   /* SolverONE não mostra anúncio */
  login: { ativo: false, permitirVisitante: false, permitirPagante: false, permitirAnunciante: false },
  niveis: { ativo: false, arquivo: '' },
  ocr: { ativo: false },                    /* o leitor de rótulos do app usa vendor/tesseract */
  /* arquivos master do RootifyONE (Controle dos apps e ⚡ Modo DEUS): recursos/global.json e recursos/hypernutry.json.
     Desde o módulo 1.6 os interruptores (data-recurso, SolverRecursos/DGO.recursos) são lidos por aqui;
     vazio = nenhum interruptor valeria. Sem internet, vale a última cópia; sem cópia, tudo ligado. */
  fonteCentral: '/solverone-dados/',
  siteBase: '',                             /* módulo 1.7.0: vazio = mesma origem dos apps (solverone.com.br) */
  /* ⚡ Modo DEUS: recurso reservado "app" desligado = tela cheia "Em manutenção" (não pôr manutencao: false aqui) */
  pwa: { ativo: false },                    /* o app já registra o próprio sw.js */
  notificacoes: { ativo: false },

  /* DGO.compat (módulo 1.7.0): o que o HyperNutry usa do aparelho (o quadro "O seu aparelho" só fala disso).
     Bloqueio só se faltar o essencial (fetch, Promise, CSS); faixa de aviso se não der para guardar dados. */
  compat: { bloqueio: true, aviso: true, usa: ['camera', 'armazenamento', 'indexedDB', 'espaco'] },

  /* Trabalho demorado (DGO.fundo, módulo 1.5.0): leitura do rótulo/laudo (OCR) e IA rodam soltos da tela,
     com pílula de andamento. O HyperNutry ainda não tem Inbox, então não há fundo.inbox aqui. */

  /* Feedback dos usuários (DGO.feedback, módulo 1.9.0): 💬 no ☰, em ⚙, na Ajuda e na tela de erro.
     O banco do feedback ainda não existe: supabase vazio = guarda no aparelho e avisa com calma.
     Quando existir, só o endereço e a chave PÚBLICA (publishable/anon); NUNCA a secret nem a service_role. */
  supabase: { url: '', anonKey: '' },
  feedback: {
    ativo: true,
    perguntaDiaria: true,                   /* só aparece quando houver banco e pergunta publicada no RootifyONE */
    /* em que tela a pessoa estava (vai junto com a opinião) */
    tela: function () {
      if (!window.HN || !HN.route) return null;
      var r = HN.route(), id = HN.recursoDaRota ? HN.recursoDaRota(r) : '', n = HN.nav && HN.nav[id || r.name];
      return { tela: (r.parts || []).join('/') || 'home', titulo: n ? HN.tt([n.pt, n.en]) : 'HyperNutry' };
    },
    /* nunca por cima do primeiro uso (boas-vindas/assistente), da câmera ou de uma janela aberta */
    naoPerguntarAgora: function () {
      if (!window.HN || !HN.route) return true;
      var n = HN.route().name;
      return n === 'boasvindas' || n === 'wizard' || (HN.layer && HN.layer.count() > 0);
    }
  },

  ia: {
    ativo: true,
    botaoNaFaixa: false,
    provedorPadrao: 'gemini',               /* grátis e lê fotos (prato) */
    contexto: {
      pt: 'Você ajuda no HyperNutry, um app educativo de alimentação sem passar fome (Saciedade Raiz). Não prescreva dietas, não prometa resultado, não compare com remédios. Para menores de 18, gestantes ou histórico de transtorno alimentar, oriente procurar nutricionista.',
      en: 'You help inside HyperNutry, an educational eating app about fullness without going hungry. Do not prescribe diets, promise results or compare with medicines. For under-18s, pregnancy or eating-disorder history, advise seeing a dietitian.'
    },
    sugestoes: [
      { pt: 'Que lanche dá mais saciedade com poucos ingredientes?', en: 'Which snack is most filling with few ingredients?' },
      { pt: 'Como montar um prato equilibrado sem balança?', en: 'How do I build a balanced plate without a scale?' }
    ]
  },

  rede: { pesado: 'wifi', ia: 'sempre' }
});

/* Modo DEUS: a tela aberta confere de novo os interruptores agora que o módulo leu a cópia guardada,
   e de novo quando chegar arquivo novo do RootifyONE */
if (window.HN && HN.moduloPronto && DGO.recursos) { HN.moduloPronto(); DGO.recursos.aoMudar(HN.conferirRecursos); }

/* o idioma do módulo acompanha o do HyperNutry (a IA responde na mesma língua da tela) */
if (window.HN && DGO.trocarIdioma) { DGO.trocarIdioma(HN.lang); document.addEventListener('hn:idioma', function (e) { DGO.trocarIdioma(e.detail); }); }

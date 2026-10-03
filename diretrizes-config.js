/* =====================================================================
   diretrizes-config.js — HyperNutry
   O único arquivo do módulo comum (diretrizes.js) que muda de app para app.
   O HyperNutry já cuida do próprio PT/EN, datas, menu, busca, botão Voltar,
   leitor de rótulos e instalação (sw.js). Do módulo comum entram: o cofre de
   chaves de IA (o mesmo de todos os apps SolverONE) e a regra de rede
   (Wi-Fi ou dados). Sem anúncios, sem login do módulo (ainda não há contas).
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
  fonteCentral: '',                         /* arquivos master do RootifyONE: ligar quando houver os do HyperNutry */
  pwa: { ativo: false },                    /* o app já registra o próprio sw.js */
  notificacoes: { ativo: false },

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

/* o idioma do módulo acompanha o do HyperNutry (a IA responde na mesma língua da tela) */
if (window.HN && DGO.trocarIdioma) { DGO.trocarIdioma(HN.lang); document.addEventListener('hn:idioma', function (e) { DGO.trocarIdioma(e.detail); }); }

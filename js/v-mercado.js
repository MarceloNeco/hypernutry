/* HyperNutry — Mercado: catálogo de produtos, aditivos e glossário (Parte A, sem cadastro).
 *
 * - HN.adv        glossário em uso: a cópia do app (js/data-aditivos.js) ou a lista mais nova que o
 *                 RootifyONE publicou em /solverone-dados/conteudo/hypernutry/aditivos.json.
 * - HN.analisar() procura aditivos no texto dos ingredientes (pelo número INS e pelos nomes) e nas
 *                 marcas do Open Food Facts, e dá o selo: 🟢 limpo · 🟡 alguns · 🔴 muitos.
 * - HN.cat        catálogo de produtos (localStorage 'catalogo'); fotos pequenas no IndexedDB
 *                 'hypernutry-fotos' (≈15 KB cada) ou só o endereço da foto do Open Food Facts.
 * Tudo funciona sem internet. "Atualizar" (com sinal) busca a lista nova e os dados novos dos produtos.
 */
(function (HN) {
  'use strict';
  var S = HN.S, U = HN.ui, esc = HN.esc, T = HN.T, V = HN.views, A = HN.acts;
  var NIVEL = {
    alto: { e: '🔴', pt: 'Evite quando der', en: 'Avoid when you can', p: 3 },
    medio: { e: '🟡', pt: 'Com moderação', en: 'In moderation', p: 1 },
    baixo: { e: '🟢', pt: 'Tranquilo', en: 'Fine', p: 0 }
  };
  var SELO = {
    limpo: { e: '🟢', pt: 'Sem aditivos de atenção', en: 'No additives to watch', c: 'ok' },
    pouco: { e: '🟡', pt: 'Alguns aditivos', en: 'Some additives', c: 'warn' },
    muito: { e: '🔴', pt: 'Muitos aditivos', en: 'Many additives', c: 'bad' },
    sem: { e: '⚪', pt: 'Sem lista de ingredientes', en: 'No ingredient list', c: '' }
  };
  HN.NIVEL = NIVEL; HN.SELO = SELO;

  /* ================= glossário em uso + índice ================= */
  var idx = null;
  function usar() {
    var c = S.get('aditivosCentral'), b = HN.aditivosBase;
    if (!(c && c.formato === 1 && Array.isArray(c.aditivos) && c.aditivos.length && String(c.versao) > String(b.versao))) return b;
    if (!c.categorias) c.categorias = b.categorias; // lista central sem categorias: usa as do app
    return c;
  }
  HN.adv = function () { if (!idx) indexar(); return idx.g; };
  function nrm(s) { return HN.nrm(s).replace(/[^a-z0-9]+/g, ' ').trim(); }
  function indexar() {
    var g = usar(), byId = {}, byCode = {}, names = [];
    (g.aditivos || []).forEach(function (a) {
      byId[a.id] = a;
      (a.ins || []).forEach(function (c) { byCode[String(c).toLowerCase()] = a; });
      [a.nome.pt.replace(/\(.*?\)/g, ''), a.nome.en.replace(/\(.*?\)/g, '')].concat(a.outros || []).forEach(function (n) { n = nrm(n); if (n.length >= 4) names.push({ n: n, a: a }); });
    });
    names.sort(function (x, y) { return y.n.length - x.n.length; }); // nome mais comprido primeiro ("lecitina de soja" antes de "lecitina")
    idx = { g: g, byId: byId, byCode: byCode, names: names };
  }
  HN.advPorId = function (id) { HN.adv(); return idx.byId[id]; };
  function porCodigo(c) {
    c = String(c).toLowerCase().replace(/\s+/g, '');
    return idx.byCode[c] || idx.byCode[c.replace(/[a-z]+$/, '')] || null; // "471a" → "471"
  }

  /* ================= análise de um texto de ingredientes ================= */
  HN.analisar = function (texto, offTags) {
    HN.adv();
    var achou = {}, lista = [], t = ' ' + nrm(texto || '') + ' ';
    function add(a, via) { if (!a || achou[a.id]) return; achou[a.id] = 1; lista.push({ a: a, via: via }); }
    // 1) números: "INS 211", "ins 412, 415 e 466", "E330", "e-150d"
    var SUF = '(?:\\s?(?:iii|ii|iv|i|v|[a-d])\\b)?', re = new RegExp('\\b(?:ins|e)\\s?(\\d{3,4}' + SUF + '(?:\\s(?:e\\s)?\\d{3,4}' + SUF + ')*)', 'g'), m; // sufixos do INS: 150d, 500ii, 160b
    while ((m = re.exec(t))) { m[1].split(/\s(?:e\s)?(?=\d)/).forEach(function (c) { var a = porCodigo(c); if (a) add(a, 'INS ' + c.replace(/\s/g, '')); }); }
    // 2) nomes ("sorbato de potássio", "glutamato monossódico"...)
    var rest = t;
    idx.names.forEach(function (x) { var p = rest.indexOf(' ' + x.n + ' '); if (p >= 0) { add(x.a, x.n); rest = rest.slice(0, p) + ' ' + rest.slice(p + x.n.length + 1); } });
    // 3) marcas do Open Food Facts ("en:e330")
    (offTags || []).forEach(function (tg) { var mm = /^en:e(\d{3,4}[a-z]{0,3})/.exec(tg); if (mm) add(porCodigo(mm[1]), 'INS ' + mm[1]); });
    var pts = 0, altos = 0;
    lista.forEach(function (x) { var n = NIVEL[x.a.nivel] || NIVEL.medio; pts += n.p; if (x.a.nivel === 'alto') altos++; });
    lista.sort(function (x, y) { return (NIVEL[y.a.nivel] || NIVEL.medio).p - (NIVEL[x.a.nivel] || NIVEL.medio).p; });
    var temTexto = nrm(texto).length > 8 || (offTags && offTags.length);
    var selo = !temTexto ? 'sem' : altos >= 2 || pts >= 6 ? 'muito' : pts >= 1 ? 'pouco' : 'limpo';
    return { lista: lista, pontos: pts, altos: altos, selo: selo };
  };
  HN.seloHtml = function (r, big) { var s = SELO[r.selo]; return '<span class="selo ' + s.c + (big ? ' big' : '') + '">' + s.e + ' ' + HN.tt([s.pt, s.en]) + '</span>'; };
  // bloco "Aditivos encontrados" (usado no rótulo, no código de barras e na ficha do produto)
  HN.aditivosHtml = function (r, curto) {
    if (r.selo === 'sem') return '<p class="small muted">' + T('Sem a lista de ingredientes não dá para saber os aditivos. Tire foto da parte "Ingredientes" do rótulo.', 'Without the ingredient list the additives are unknown. Take a photo of the "Ingredients" part of the label.') + '</p>';
    if (!r.lista.length) return '<p class="small">🟢 ' + T('Nenhum aditivo da nossa lista foi encontrado nos ingredientes.', 'No additive from our list was found in the ingredients.') + '</p>';
    var l = curto ? r.lista.filter(function (x) { return x.a.nivel !== 'baixo'; }).slice(0, 4) : r.lista;
    var h = '<div class="adv-list">' + l.map(function (x) { var a = x.a, n = NIVEL[a.nivel] || NIVEL.medio; return '<button class="adv" data-act="adv-ver" data-arg="' + a.id + '"><span class="adv-n" aria-hidden="true">' + n.e + '</span><span class="grow"><b>' + esc(HN.tt([a.nome.pt, a.nome.en])) + '</b>' + (a.ins.length ? ' <span class="muted small num">INS ' + esc(a.ins[0]) + '</span>' : '') + '<span class="adv-s">' + esc(HN.tt([n.pt, n.en])) + ' · ' + esc(HN.tt([a.porque.pt, a.porque.en])) + '</span></span></button>'; }).join('') + '</div>';
    if (curto && r.lista.length > l.length) h += '<p class="t-caption muted">+ ' + (r.lista.length - l.length) + ' ' + T('tranquilo(s) ou outros — veja na ficha do produto', 'fine or others — see the product page') + '</p>';
    return h;
  };
  A['adv-ver'] = function (id) {
    var a = HN.advPorId(id); if (!a) return; var c = HN.adv().categorias[a.cat] || ['', '', '•'], n = NIVEL[a.nivel] || NIVEL.medio;
    HN.sheet(esc(HN.tt([a.nome.pt, a.nome.en])), '<p><span class="selo ' + (a.nivel === 'alto' ? 'bad' : a.nivel === 'medio' ? 'warn' : 'ok') + '">' + n.e + ' ' + HN.tt([n.pt, n.en]) + '</span> <span class="badge">' + c[2] + ' ' + esc(HN.tt([c[0], c[1]])) + '</span></p>' +
      (a.ins.length ? '<p class="small"><b>' + T('Número no rótulo', 'Number on the label') + ':</b> <span class="num">INS ' + a.ins.map(esc).join(', ') + '</span> <span class="muted">(' + T('na Europa: E', 'in Europe: E') + a.ins[0] + ')</span></p>' : '') +
      '<p><b>' + T('Por quê', 'Why') + ':</b> ' + esc(HN.tt([a.porque.pt, a.porque.en])) + '</p><p><b>' + T('Onde aparece', 'Where it shows up') + ':</b> ' + esc(HN.tt([a.onde.pt, a.onde.en])) + '</p>' +
      (a.outros.length ? '<p class="small muted">' + T('Também escrito como', 'Also written as') + ': ' + a.outros.map(esc).join(', ') + '</p>' : '') +
      '<p class="t-caption muted">' + T('Todos os aditivos da lista são permitidos pela ANVISA nos limites da lei. O alerta ajuda a escolher o produto mais simples; não é diagnóstico.', 'All listed additives are allowed by ANVISA within legal limits. The alert helps you pick the simpler product; it is not a diagnosis.') + '</p>');
  };

  /* ================= atualizar a lista (RootifyONE → solverone-dados) ================= */
  var FONTE = '/solverone-dados/conteudo/hypernutry/aditivos.json';
  HN.advAtualizar = function (manual) {
    if (!navigator.onLine) { if (manual) HN.toast(T('Sem internet agora. O app continua com a lista guardada.', 'No internet now. The app keeps using the saved list.')); return Promise.resolve(false); }
    var ctl = window.AbortController ? new AbortController() : null; setTimeout(function () { if (ctl) ctl.abort(); }, 8000);
    return fetch(FONTE, { cache: 'no-cache', signal: ctl ? ctl.signal : undefined }).then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); }).then(function (j) {
      S.set('aditivosCheck', Date.now());
      if (!j || j.formato !== 1 || !Array.isArray(j.aditivos) || !j.aditivos.length) throw new Error('formato');
      if (String(j.versao) <= String(HN.adv().versao)) { if (manual) HN.toast(T('Você já tem a lista mais nova ✓', 'You already have the newest list ✓')); return false; }
      S.set('aditivosCentral', j); idx = null; if (manual) HN.toast(T('Lista de aditivos atualizada ✓', 'Additive list updated ✓')); return true;
    }).catch(function () { S.set('aditivosCheck', Date.now()); if (manual) HN.toast(T('Não há lista nova publicada. Você continua com a lista do app ✓', 'No newer list published. You keep the app list ✓')); return false; });
  };
  // uma vez por dia, com internet, sem atrapalhar a abertura
  setTimeout(function () { if (navigator.onLine && Date.now() - (S.get('aditivosCheck') || 0) > 864e5) HN.advAtualizar(false); }, 5000);

  /* ================= catálogo ================= */
  var VARIANTES = [['normal', 'Normal / tradicional', 'Regular'], ['light', 'Light', 'Light'], ['zero', 'Zero açúcar', 'Sugar-free'], ['diet', 'Diet', 'Diet'], ['integral', 'Integral', 'Wholegrain'], ['semlactose', 'Sem lactose', 'Lactose-free'], ['semgluten', 'Sem glúten', 'Gluten-free'], ['organico', 'Orgânico', 'Organic'], ['vegano', 'Vegano', 'Vegan'], ['outra', 'Outra', 'Other']];
  var TIPOS = ['Requeijão', 'Iogurte', 'Queijo', 'Leite', 'Pão de forma', 'Biscoito', 'Presunto', 'Peito de peru', 'Salsicha', 'Mortadela', 'Margarina', 'Manteiga', 'Molho de tomate', 'Achocolatado', 'Suco', 'Refrigerante', 'Cereal matinal', 'Granola', 'Macarrão instantâneo', 'Caldo pronto', 'Sorvete', 'Chocolate', 'Geleia', 'Maionese', 'Ketchup', 'Bebida vegetal'];
  var UNID = ['g', 'kg', 'ml', 'L', 'un'];
  HN.cat = {
    list: function () { return S.get('catalogo', []) || []; },
    get: function (id) { return HN.cat.list().filter(function (p) { return p.id === id; })[0] || null; },
    porEan: function (ean) { ean = String(ean || ''); return ean ? HN.cat.list().filter(function (p) { return p.ean === ean; })[0] || null : null; },
    put: function (p) { p.atualizado = Date.now(); var l = HN.cat.list(), ok = false; l = l.map(function (x) { if (x.id === p.id) { ok = true; return p; } return x; }); if (!ok) { p.criado = p.criado || Date.now(); l.push(p); } S.set('catalogo', l); return p; },
    del: function (id) { S.set('catalogo', HN.cat.list().filter(function (p) { return p.id !== id; })); fotoDel(id); },
    analise: function (p) { return HN.analisar(p.ingredientes, p.offTags); }
  };
  function nomeProd(p) { var vn = p.variante && p.variante !== 'normal' ? varNome(p.variante) : ''; if (vn && nrm(p.nome).indexOf(nrm(vn).split(' ')[0]) >= 0) vn = ''; // "Requeijão light" não vira "light · Light"
    return [p.nome, vn, p.tamanho ? HN.num(p.tamanho, p.tamanho % 1 ? 1 : 0) + ' ' + (p.unidade || '') : ''].filter(Boolean).join(' · '); }
  function varNome(v) { var x = VARIANTES.filter(function (o) { return o[0] === v; })[0]; return x ? HN.tt([x[1], x[2]]) : v; }
  HN.prodNome = nomeProd;
  function tipoN(p) { return nrm(p.tipo || ''); }
  function marcasFav() { return S.get('marcasFav', []) || []; }
  function marcaFav(m) { return !!m && marcasFav().indexOf(nrm(m)) >= 0; }
  // opções melhores: mesmo tipo, menos pontos; favoritos e marcas favoritas primeiro
  HN.alternativas = function (p) {
    var t = tipoN(p), r0 = HN.cat.analise(p); if (!t) return [];
    return HN.cat.list().filter(function (x) { return x.id !== p.id && tipoN(x) === t; }).map(function (x) { return { p: x, r: HN.cat.analise(x) }; })
      .filter(function (x) { return x.r.selo !== 'sem' && x.r.pontos < r0.pontos; })
      .sort(function (a, b) { return (b.p.fav ? 1 : 0) - (a.p.fav ? 1 : 0) || (marcaFav(b.p.marca) ? 1 : 0) - (marcaFav(a.p.marca) ? 1 : 0) || a.r.pontos - b.r.pontos; });
  };

  /* ---------- fotos pequenas (IndexedDB) ---------- */
  var DBP = null;
  function fdb() { return new Promise(function (ok, fail) { if (DBP) return ok(DBP); if (!window.indexedDB) return fail(new Error('sem IndexedDB')); var r = indexedDB.open('hypernutry-fotos', 1); r.onupgradeneeded = function () { r.result.createObjectStore('fotos'); }; r.onsuccess = function () { DBP = r.result; ok(DBP); }; r.onerror = function () { fail(r.error); }; }); }
  function ftx(mode, fn) { return fdb().then(function (db) { return new Promise(function (ok, fail) { var t = db.transaction('fotos', mode), st = t.objectStore('fotos'), rq = fn(st); t.oncomplete = function () { ok(rq && rq.result); }; t.onerror = function () { fail(t.error); }; }); }); }
  // reduz para 360 px e WebP (≈10–20 KB); o navegador que não faz WebP grava JPEG
  HN.fotoGuardar = function (id, canvas) {
    var k = Math.min(1, 360 / Math.max(canvas.width, canvas.height)), c = document.createElement('canvas'); c.width = Math.round(canvas.width * k); c.height = Math.round(canvas.height * k);
    var g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); g.drawImage(canvas, 0, 0, c.width, c.height);
    return new Promise(function (ok) { c.toBlob(function (b) { if (b && b.type === 'image/webp') return ok(b); c.toBlob(ok, 'image/jpeg', 0.6); }, 'image/webp', 0.55); })
      .then(function (b) { return ftx('readwrite', function (st) { return st.put(b, id); }).then(function () { return b.size; }); });
  };
  function fotoGet(id) { return ftx('readonly', function (st) { return st.get(id); }).catch(function () { return null; }); }
  function fotoDel(id) { ftx('readwrite', function (st) { return st.delete(id); }).catch(function () { /* sem foto */ }); }
  HN.fotoTotal = function () { return ftx('readonly', function (st) { return st.getAll(); }).then(function (l) { return { n: (l || []).length, bytes: (l || []).reduce(function (s, b) { return s + (b ? b.size : 0); }, 0) }; }).catch(function () { return { n: 0, bytes: 0 }; }); };
  var urls = {};
  // preenche as miniaturas depois de desenhar a tela (foto local > foto do Open Food Facts com internet > emoji)
  function fotos(box) {
    HN.qa('[data-foto]', box).forEach(function (el) {
      var id = el.getAttribute('data-foto'), p = HN.cat.get(id); if (!p) return;
      var put = function (src) { el.innerHTML = '<img src="' + esc(src) + '" alt="" loading="lazy">'; };
      if (urls[id]) return put(urls[id]);
      fotoGet(id).then(function (b) { if (b) { urls[id] = URL.createObjectURL(b); put(urls[id]); } else if (p.imgUrl && navigator.onLine && HN.cfg().fotoProduto !== 'nao') put(p.imgUrl); });
    });
  }

  /* ================= telas ================= */
  var F = { q: '', selo: '', tipo: '', fav: false };
  function cardProd(p) {
    var r = HN.cat.analise(p);
    return '<div class="prod" role="button" tabindex="0" data-act="go" data-arg="/mercado/p/' + esc(p.id) + '"><span class="prod-f" data-foto="' + esc(p.id) + '" aria-hidden="true">🛒</span><span class="grow"><b>' + esc(nomeProd(p)) + '</b><span class="prod-m">' + esc([p.marca, p.fabricante && p.fabricante !== p.marca ? p.fabricante : ''].filter(Boolean).join(' · ')) + (marcaFav(p.marca) ? ' ❤️' : '') + '</span>' + HN.seloHtml(r) + '</span><button class="ib star' + (p.fav ? ' on' : '') + '" data-act="prod-fav" data-arg="' + esc(p.id) + '" aria-pressed="' + !!p.fav + '" aria-label="' + T('Favorito', 'Favourite') + '">' + (p.fav ? '⭐' : '☆') + '</button></div>';
  }
  function listaHtml() {
    var q = nrm(F.q), l = HN.cat.list().filter(function (p) {
      if (F.fav && !p.fav && !marcaFav(p.marca)) return false;
      if (F.tipo && tipoN(p) !== F.tipo) return false;
      if (F.selo && HN.cat.analise(p).selo !== F.selo) return false;
      return !q || nrm([p.nome, p.marca, p.fabricante, p.tipo, p.ean].join(' ')).indexOf(q) >= 0;
    });
    if (!HN.cat.list().length) return '<div class="card center"><p style="font-size:2.2rem;margin:0">🛒</p><p><b>' + T('Seu catálogo ainda está vazio.', 'Your catalogue is still empty.') + '</b></p><p class="small muted">' + T('No mercado, toque em 📷 e aponte para o código de barras, ou tire foto dos ingredientes. O produto fica guardado aqui, e funciona mesmo sem internet.', 'At the store, tap 📷 and point at the barcode, or photograph the ingredients. The product is saved here and works even offline.') + '</p></div>';
    if (!l.length) return '<p class="muted center">' + T('Nada com esse filtro.', 'Nothing with this filter.') + '</p>';
    var grupos = {}, ordem = [];
    l.forEach(function (p) { var k = p.tipo || T('Sem tipo', 'No type'); if (!grupos[k]) { grupos[k] = []; ordem.push(k); } grupos[k].push(p); });
    ordem.sort(function (a, b) { return a.localeCompare(b); });
    return ordem.map(function (k) {
      var ps = grupos[k].sort(function (a, b) { return (b.fav ? 1 : 0) - (a.fav ? 1 : 0) || (marcaFav(b.marca) ? 1 : 0) - (marcaFav(a.marca) ? 1 : 0) || HN.cat.analise(a).pontos - HN.cat.analise(b).pontos; });
      return '<h3 class="mt">' + esc(k) + ' <span class="muted small">(' + ps.length + ')</span></h3><div class="prods">' + ps.map(cardProd).join('') + '</div>';
    }).join('');
  }
  function refreshLista() { var b = HN.q('#prods'); if (b) { b.innerHTML = listaHtml(); fotos(b); } }
  function telaLista() {
    var g = HN.adv(), tipos = {}, mf = marcasFav();
    HN.cat.list().forEach(function (p) { if (p.tipo) tipos[tipoN(p)] = p.tipo; });
    var h = U.title('🏪', T('Produtos do mercado', 'Store products'), T('Veja quem tem muitos aditivos e prefira os mais simples', 'See which have many additives and prefer simpler ones')) +
      '<div class="row wrap mb"><button class="btn grow" data-act="mk-scan">📷 ' + T('Ler produto', 'Scan product') + '</button><button class="btn sec" data-act="prod-edit" data-arg="">＋ ' + T('Cadastrar', 'Add') + '</button><button class="btn sec" data-act="go" data-arg="/mercado/aditivos">📖 ' + T('Glossário', 'Glossary') + '</button></div>' +
      '<div class="card"><input type="search" data-in="mk-q" value="' + esc(F.q) + '" placeholder="' + T('Buscar por nome, marca ou código', 'Search name, brand or code') + '" aria-label="' + T('Buscar produto', 'Search product') + '">' +
      '<div class="chips mt" role="group"><button class="chip' + (!F.selo && !F.fav ? ' on' : '') + '" data-act="mk-f" data-arg="">' + T('Todos', 'All') + '</button><button class="chip' + (F.fav ? ' on' : '') + '" data-act="mk-f" data-arg="fav">⭐ ' + T('Favoritos', 'Favourites') + '</button>' +
      ['limpo', 'pouco', 'muito'].map(function (s) { return '<button class="chip' + (F.selo === s ? ' on' : '') + '" data-act="mk-f" data-arg="' + s + '">' + SELO[s].e + ' ' + HN.tt([SELO[s].pt, SELO[s].en]) + '</button>'; }).join('') + '</div>' +
      (Object.keys(tipos).length > 1 ? '<label class="f" for="mk-tipo">' + T('Tipo de produto', 'Product type') + '</label><select id="mk-tipo" data-in="mk-tipo"><option value="">' + T('Todos os tipos', 'All types') + '</option>' + Object.keys(tipos).sort().map(function (k) { return '<option value="' + esc(k) + '"' + (F.tipo === k ? ' selected' : '') + '>' + esc(tipos[k]) + '</option>'; }).join('') + '</select>' : '') + '</div>' +
      (mf.length ? '<p class="small">❤️ ' + T('Marcas favoritas', 'Favourite brands') + ': ' + mf.map(function (m) { return '<span class="badge">' + esc(m) + '</span>'; }).join(' ') + '</p>' : '') +
      '<div id="prods">' + listaHtml() + '</div>' +
      '<div class="card small mt"><div class="kv"><span>' + T('Lista de aditivos', 'Additive list') + '</span><b>' + g.aditivos.length + ' ' + T('itens · versão', 'items · version') + ' ' + esc(g.versao) + '</b></div><div class="kv"><span>' + T('Fotos guardadas', 'Saved photos') + '</span><b id="mk-fotos">…</b></div>' +
      '<label class="f" for="mk-foto">' + T('Fotos dos produtos', 'Product photos') + '</label><select id="mk-foto" data-in="mk-foto"><option value="pequena"' + (HN.cfg().fotoProduto !== 'nao' ? ' selected' : '') + '>' + T('Guardar pequena (≈15 KB cada, só no celular)', 'Keep small (≈15 KB each, on this phone only)') + '</option><option value="nao"' + (HN.cfg().fotoProduto === 'nao' ? ' selected' : '') + '>' + T('Não guardar fotos', 'Do not keep photos') + '</option></select>' +
      '<button class="btn sec block mt" data-act="mk-sync">🔄 ' + T('Atualizar lista e produtos (precisa de internet)', 'Update list and products (needs internet)') + '</button></div>';
    return h;
  }
  function telaProduto(id) {
    var p = HN.cat.get(id); if (!p) return U.notice('bad', T('Produto não encontrado.', 'Product not found.'));
    var r = HN.cat.analise(p), alt = HN.alternativas(p);
    var h = '<button class="btn ghost sm mb" data-act="go" data-arg="/mercado">← ' + T('Produtos', 'Products') + '</button>' +
      '<div class="card"><div class="row" style="align-items:flex-start"><span class="prod-f big" data-foto="' + esc(p.id) + '" aria-hidden="true">🛒</span><div class="grow"><div class="t-caption muted">' + esc(p.tipo || '') + '</div><h2 style="margin:.1rem 0">' + esc(nomeProd(p)) + '</h2><div class="small">' + esc([p.marca, p.fabricante && p.fabricante !== p.marca ? p.fabricante : ''].filter(Boolean).join(' · ')) + '</div>' + (p.ean ? '<div class="t-caption muted num">▮▯▮ ' + esc(p.ean) + '</div>' : '') + '</div></div>' +
      '<p class="mt">' + HN.seloHtml(r, true) + '</p>' +
      '<div class="row wrap"><button class="btn sm ' + (p.fav ? '' : 'sec') + '" data-act="prod-fav" data-arg="' + esc(p.id) + '">' + (p.fav ? '⭐ ' + T('Favorito', 'Favourite') : '☆ ' + T('Marcar favorito', 'Mark favourite')) + '</button>' + (p.marca ? '<button class="btn sm ' + (marcaFav(p.marca) ? '' : 'sec') + '" data-act="marca-fav" data-arg="' + esc(p.marca) + '">' + (marcaFav(p.marca) ? '❤️ ' + T('Marca favorita', 'Favourite brand') : '🤍 ' + T('Marca favorita?', 'Favourite brand?')) + '</button>' : '') + '</div></div>';
    if (alt.length) h += '<div class="card"><h3>✨ ' + T('Opções melhores do mesmo tipo', 'Better options of the same type') + '</h3><div class="prods">' + alt.slice(0, 4).map(function (x) { return cardProd(x.p); }).join('') + '</div></div>';
    h += '<div class="card"><h3>' + T('Aditivos encontrados', 'Additives found') + ' <span class="muted small">(' + r.lista.length + ')</span></h3>' + HN.aditivosHtml(r) + '</div>';
    if (p.ingredientes) h += '<details class="acc"><summary>' + T('Ingredientes (como no rótulo)', 'Ingredients (as on the label)') + '</summary><div class="small">' + esc(p.ingredientes) + '</div></details>';
    var n = p.nutri || {};
    if (n.kcal != null) h += '<details class="acc"><summary>' + T('Tabela por 100 g/ml', 'Per 100 g/ml') + '</summary><div class="small">' + [['kcal', 'kcal', ''], ['p', T('Proteínas', 'Protein'), ' g'], ['c', T('Carboidratos', 'Carbs'), ' g'], ['acu', T('Açúcares', 'Sugars'), ' g'], ['f', T('Gorduras', 'Fat'), ' g'], ['sat', T('Saturada', 'Saturated'), ' g'], ['fib', T('Fibras', 'Fiber'), ' g'], ['na', T('Sódio', 'Sodium'), ' mg']].filter(function (x) { return n[x[0]] != null; }).map(function (x) { return '<div class="kv"><span>' + x[1] + '</span><b class="num">' + HN.num(n[x[0]], n[x[0]] < 10 && x[0] !== 'na' ? 1 : 0) + x[2] + '</b></div>'; }).join('') + '</div></details>';
    if (p.notas) h += '<p class="small"><b>' + T('Anotações', 'Notes') + ':</b> ' + esc(p.notas) + '</p>';
    h += '<div class="row wrap mt"><button class="btn sec grow" data-act="prod-edit" data-arg="' + esc(p.id) + '">✏️ ' + T('Editar', 'Edit') + '</button><label class="btn sec grow" for="pfoto">📷 ' + T('Foto', 'Photo') + '</label><input id="pfoto" type="file" accept="image/*" capture="environment" class="sr" data-in="prod-foto" data-id="' + esc(p.id) + '">' + (n.kcal != null ? '<button class="btn sec grow" data-act="prod-calc" data-arg="' + esc(p.id) + '">🧮 ' + T('Calculadora', 'Calculator') + '</button>' : '') + '<button class="btn ghost" data-act="prod-del" data-arg="' + esc(p.id) + '" aria-label="' + T('Apagar', 'Delete') + '">🗑</button></div>';
    h += '<p class="t-caption muted mt">' + T('Fonte: ', 'Source: ') + ({ off: 'Open Food Facts', rotulo: T('foto do rótulo', 'label photo'), manual: T('digitado por você', 'typed by you') }[p.fonte] || '—') + ' · ' + HN.fmtDate(p.atualizado || p.criado) + '</p>';
    return h;
  }
  function telaGlossario() {
    var g = HN.adv(), q = nrm(F.gq || ''), cats = g.categorias || {};
    var h = '<button class="btn ghost sm mb" data-act="go" data-arg="/mercado">← ' + T('Produtos', 'Products') + '</button>' + U.title('📖', T('Glossário de aditivos', 'Additive glossary'), T('O que cada um faz e quando vale evitar', 'What each one does and when to avoid it')) +
      '<div class="card small"><p style="margin:0 0 .4rem">' + ['alto', 'medio', 'baixo'].map(function (k) { return NIVEL[k].e + ' <b>' + HN.tt([NIVEL[k].pt, NIVEL[k].en]) + '</b>'; }).join(' · ') + '</p><p class="muted" style="margin:0">' + T('Todos são permitidos pela ANVISA nos limites da lei. O alerta ajuda a preferir o alimento menos processado, como pede o Guia Alimentar brasileiro. Lista versão ', 'All are allowed by ANVISA within legal limits. The alert helps you prefer less processed food, as Brazil\'s Dietary Guidelines advise. List version ') + esc(g.versao) + '.</p></div>' +
      '<input type="search" data-in="gl-q" value="' + esc(F.gq || '') + '" placeholder="' + T('Buscar: nome ou número (ex.: 211, tartrazina)', 'Search: name or number (e.g. 211, tartrazine)') + '" aria-label="' + T('Buscar aditivo', 'Search additive') + '"><div id="glres">' + glossLista(q) + '</div>';
    return h;
  }
  function glossLista(q) {
    var g = HN.adv(), cats = g.categorias || {}, by = {};
    g.aditivos.forEach(function (a) { if (q && nrm([a.nome.pt, a.nome.en, a.outros.join(' '), a.ins.join(' ')].join(' ')).indexOf(q) < 0) return; (by[a.cat] = by[a.cat] || []).push(a); });
    var ks = Object.keys(cats).filter(function (k) { return by[k]; });
    if (!ks.length) return '<p class="muted">' + T('Nada encontrado.', 'Nothing found.') + '</p>';
    return ks.map(function (k) { var c = cats[k]; return '<details class="acc"' + (q ? ' open' : '') + '><summary>' + c[2] + ' ' + esc(HN.tt([c[0], c[1]])) + ' <span class="muted small">(' + by[k].length + ')</span></summary><div><p class="small muted">' + esc(HN.tt([c[3], c[4]])) + '</p><div class="adv-list">' + by[k].map(function (a) { var n = NIVEL[a.nivel] || NIVEL.medio; return '<button class="adv" data-act="adv-ver" data-arg="' + a.id + '"><span class="adv-n" aria-hidden="true">' + n.e + '</span><span class="grow"><b>' + esc(HN.tt([a.nome.pt, a.nome.en])) + '</b>' + (a.ins.length ? ' <span class="muted small num">INS ' + esc(a.ins.slice(0, 3).join(', ')) + '</span>' : '') + '<span class="adv-s">' + esc(HN.tt([a.onde.pt, a.onde.en])) + '</span></span></button>'; }).join('') + '</div></div></details>'; }).join('');
  }
  V.mercado = function (parts) {
    if (parts[1] === 'p') return telaProduto(decodeURIComponent(parts[2] || ''));
    if (parts[1] === 'aditivos') return telaGlossario();
    return telaLista();
  };
  HN.after.mercado = function () {
    var app = HN.q('#app'); fotos(app);
    var b = HN.q('#mk-fotos'); if (b) HN.fotoTotal().then(function (t) { b.textContent = t.n + ' · ' + HN.num(t.bytes / 1024) + ' KB'; });
  };

  /* ---------- ações ---------- */
  HN.ins['mk-q'] = function (v) { F.q = v; refreshLista(); };
  HN.ins['mk-tipo'] = function (v) { F.tipo = v; refreshLista(); };
  HN.ins['gl-q'] = function (v) { F.gq = v; var b = HN.q('#glres'); if (b) b.innerHTML = glossLista(nrm(v)); };
  HN.ins['mk-foto'] = function (v) { HN.setCfg({ fotoProduto: v }); HN.toast(T('Salvo ✓', 'Saved ✓'), 1200); };
  A['mk-f'] = function (v) { if (v === 'fav') { F.fav = !F.fav; } else if (!v) { F.fav = false; F.selo = ''; } else F.selo = F.selo === v ? '' : v; HN.refresh(); };
  A['mk-scan'] = function () { HN.scanModo = 'cod'; A.scan(); };
  A['prod-fav'] = function (id, el, ev) { if (ev) ev.stopPropagation(); var p = HN.cat.get(id); if (!p) return; p.fav = !p.fav; HN.cat.put(p); HN.haptic('leve'); HN.refresh(); };
  A['marca-fav'] = function (m) { var l = marcasFav(), k = nrm(m), i = l.indexOf(k); if (i >= 0) l.splice(i, 1); else l.push(k); S.set('marcasFav', l); HN.refresh(); };
  A['prod-del'] = function (id) { HN.confirm(T('Apagar este produto do catálogo?', 'Delete this product from the catalogue?'), T('Apagar', 'Delete'), { danger: true }).then(function (ok) { if (ok) { HN.cat.del(id); delete urls[id]; HN.go('/mercado'); } }); };
  A['prod-calc'] = function (id) {
    var p = HN.cat.get(id), n = p && p.nutri; if (!n) return;
    var f = HN.registerFood({ id: 'cat_' + p.id, pt: nomeProd(p), group: 'produto', kcal: n.kcal || 0, p: n.p || 0, c: n.c || 0, f: n.f || 0, fib: n.fib || 0, na: n.na || 0, allergens: p.alergenos || [], measures: p.porcao ? [['porção', 'serving', p.porcao]] : [], src: 'CATALOGO' });
    var l = (S.get('produtos', []) || []).filter(function (x) { return x.id !== f.id; }); l.push(f); S.set('produtos', l);
    if (HN.calcAdd) HN.calcAdd(f.id); HN.toast(T('Adicionado à calculadora ✓', 'Added to calculator ✓')); HN.go('/');
  };
  HN.ins['prod-foto'] = function (v, el) {
    var f = el.files && el.files[0], id = el.getAttribute('data-id'); if (!f) return;
    var img = new Image(), u = URL.createObjectURL(f);
    img.onload = function () { var c = document.createElement('canvas'); c.width = img.naturalWidth; c.height = img.naturalHeight; c.getContext('2d').drawImage(img, 0, 0); URL.revokeObjectURL(u); HN.fotoGuardar(id, c).then(function (n) { delete urls[id]; HN.toast(T('Foto guardada', 'Photo saved') + ' (' + HN.num(n / 1024) + ' KB) ✓'); HN.refresh(); }).catch(function () { HN.toast(T('Não consegui guardar a foto neste navegador.', 'Could not save the photo in this browser.')); }); };
    img.src = u;
  };
  // atualizar: lista de aditivos + produtos com código de barras (Open Food Facts), um por vez
  A['mk-sync'] = function () {
    if (!navigator.onLine) { HN.toast(T('Sem internet agora. Tudo continua funcionando com o que está guardado.', 'No internet now. Everything keeps working with what is saved.')); return; }
    var ps = HN.cat.list().filter(function (p) { return p.ean && p.fonte === 'off'; }).slice(0, 60), n = 0, mud = 0;
    HN.toast(T('Atualizando…', 'Updating…'), 1500);
    HN.advAtualizar(false).then(function () {
      return ps.reduce(function (pr, p) { return pr.then(function () { return HN.offBuscar(p.ean).then(function (o) { n++; if (o && (o.ingredientes !== p.ingredientes || String(o.offTags) !== String(p.offTags))) { HN.cat.put(HN.prodDeOff(o, p)); mud++; } }).catch(function () { /* segue */ }); }); }, Promise.resolve());
    }).then(function () { HN.toast(T('Pronto ✓ Lista conferida e ', 'Done ✓ List checked and ') + n + T(' produto(s) conferido(s), ', ' product(s) checked, ') + mud + T(' mudaram.', ' changed.'), 3500); HN.refresh(); });
  };

  /* ---------- produto a partir do Open Food Facts (código de barras) ---------- */
  function adivinharVariante(s) { s = nrm(s); return /\bzero\b/.test(s) ? 'zero' : /\blight\b/.test(s) ? 'light' : /\bdiet\b/.test(s) ? 'diet' : /\bintegral\b/.test(s) ? 'integral' : /sem lactose|zero lactose/.test(s) ? 'semlactose' : /sem gluten/.test(s) ? 'semgluten' : /organico/.test(s) ? 'organico' : 'normal'; }
  function tamanho(q) { var m = /(\d+(?:[.,]\d+)?)\s*(kg|g|ml|l|un)\b/i.exec(q || ''); return m ? { t: +m[1].replace(',', '.'), u: m[2].toLowerCase() === 'l' ? 'L' : m[2].toLowerCase() } : null; }
  HN.prodDeOff = function (o, velho) {
    var p = velho ? JSON.parse(JSON.stringify(velho)) : { id: 'ean_' + o.code, ean: o.code, fav: false, fonte: 'off' };
    var tm = tamanho(o.qtd);
    p.nome = p.nomeManual ? p.nome : (o.nome || p.nome || T('Produto', 'Product') + ' ' + o.code);
    p.marca = p.marcaManual ? p.marca : (o.marca || p.marca || '');
    p.fabricante = p.fabricante || o.dono || '';
    p.tipo = p.tipo || o.tipo || '';
    p.variante = p.variante || adivinharVariante(o.nome + ' ' + o.qtd);
    if (tm && !p.tamanho) { p.tamanho = tm.t; p.unidade = tm.u; }
    p.ingredientes = o.ingredientes || p.ingredientes || ''; p.offTags = o.offTags || [];
    p.nutri = { kcal: o.kcal, p: o.p, c: o.c, f: o.f, fib: o.fib, na: o.na, sat: o.sat, acu: o.acu };
    p.alergenos = o.alergenos || []; p.porcao = o.porcao || p.porcao || 0; if (o.img) p.imgUrl = o.img;
    return p;
  };

  /* ---------- cadastrar / editar (folha) ---------- */
  var ED = null;
  A['prod-edit'] = function (id, el, ev, pre) {
    if (ev && ev.stopPropagation) ev.stopPropagation();
    ED = id ? JSON.parse(JSON.stringify(HN.cat.get(id))) : Object.assign({ id: HN.id(), fonte: 'manual', variante: 'normal', unidade: 'g', fav: false }, pre || {});
    var d = ED, f = function (k, lab, ex, extra) { return '<label class="f" for="pe-' + k + '">' + lab + '</label><input id="pe-' + k + '" type="text" value="' + esc(d[k] || '') + '" placeholder="' + esc(ex) + '"' + (extra || '') + '>'; };
    HN.sheet(id ? T('Editar produto', 'Edit product') : T('Novo produto', 'New product'),
      f('nome', T('Nome do produto', 'Product name'), T('Ex.: Requeijão cremoso', 'E.g. Cream cheese spread')) +
      f('marca', T('Marca', 'Brand'), T('Ex.: Itambé', 'E.g. Itambé')) +
      f('tipo', T('Tipo (para comparar parecidos)', 'Type (to compare similar ones)'), T('Ex.: Requeijão', 'E.g. Cream cheese'), ' list="pe-tipos"') + '<datalist id="pe-tipos">' + TIPOS.concat(HN.cat.list().map(function (p) { return p.tipo; })).filter(function (x, i, a) { return x && a.indexOf(x) === i; }).map(function (t) { return '<option value="' + esc(t) + '">'; }).join('') + '</datalist>' +
      '<label class="f" for="pe-variante">' + T('Versão', 'Version') + '</label><select id="pe-variante">' + VARIANTES.map(function (v) { return '<option value="' + v[0] + '"' + (d.variante === v[0] ? ' selected' : '') + '>' + HN.tt([v[1], v[2]]) + '</option>'; }).join('') + '</select>' +
      '<p class="t-caption muted">' + T('Light, zero ou integral costumam ter outra receita: cadastre cada versão separada.', 'Light, zero or wholegrain usually have a different recipe: add each version separately.') + '</p>' +
      '<div class="row"><div class="grow"><label class="f" for="pe-tamanho">' + T('Tamanho', 'Size') + '</label><input id="pe-tamanho" type="number" inputmode="decimal" min="0" step="any" value="' + esc(d.tamanho || '') + '" placeholder="200"></div><div style="width:6rem"><label class="f" for="pe-unidade">' + T('Unidade', 'Unit') + '</label><select id="pe-unidade">' + UNID.map(function (u) { return '<option' + (d.unidade === u ? ' selected' : '') + '>' + u + '</option>'; }).join('') + '</select></div></div>' +
      f('fabricante', T('Fabricante (se for diferente da marca)', 'Manufacturer (if different from the brand)'), T('Ex.: Laticínios Xis Ltda', 'E.g. Dairy Co.')) +
      f('ean', T('Código de barras (opcional)', 'Barcode (optional)'), '7891234567890', ' inputmode="numeric"') +
      '<label class="f" for="pe-ingredientes">' + T('Ingredientes (copie do rótulo)', 'Ingredients (copy from the label)') + '</label><textarea id="pe-ingredientes" placeholder="' + T('Ex.: leite, creme de leite, sal, estabilizante goma xantana, conservador sorbato de potássio', 'E.g. milk, cream, salt, xanthan gum, potassium sorbate') + '">' + esc(d.ingredientes || '') + '</textarea>' +
      f('notas', T('Anotações (opcional)', 'Notes (optional)'), T('Ex.: o do mercado X é mais barato', 'E.g. cheaper at store X')) +
      '<button class="btn block mt" data-act="prod-save">💾 ' + T('Salvar', 'Save') + '</button>');
  };
  HN.catEditar = function (pre) { A['prod-edit']('', null, null, pre); };
  A['prod-save'] = function () {
    var d = ED, v = function (k) { var e = HN.q('#pe-' + k); return e ? e.value.trim() : ''; };
    var nome = v('nome'); if (!nome) { HN.toast(T('Escreva o nome do produto.', 'Enter the product name.')); HN.q('#pe-nome').focus(); return; }
    var old = HN.cat.get(d.id);
    if (old && old.nome !== nome) d.nomeManual = true; if (old && old.marca !== v('marca')) d.marcaManual = true;
    d.nome = nome; d.marca = v('marca'); d.tipo = v('tipo'); d.variante = v('variante'); d.tamanho = +v('tamanho') || 0; d.unidade = v('unidade'); d.fabricante = v('fabricante'); d.ean = v('ean').replace(/\D/g, ''); d.ingredientes = v('ingredientes'); d.notas = v('notas');
    var dup = d.ean && HN.cat.porEan(d.ean); if (dup && dup.id !== d.id) { HN.toast(T('Já existe um produto com esse código: ', 'A product with this code exists: ') + dup.nome); return; }
    HN.cat.put(d); HN.layer.close(); var id = d.id;
    setTimeout(function () { HN.toast(T('Produto salvo ✓', 'Product saved ✓')); HN.go('/mercado/p/' + encodeURIComponent(id)); }, 80);
  };

  /* ---------- a busca 🔍 também acha aditivos e produtos ---------- */
  var oldIdx = HN.searchIndex;
  HN.searchIndex = function () {
    var out = oldIdx();
    HN.adv().aditivos.forEach(function (a) { out.push({ t: [a.nome.pt, a.nome.en, a.outros.join(' '), a.ins.join(' ')].join(' '), label: HN.tt([a.nome.pt, a.nome.en]), e: (NIVEL[a.nivel] || NIVEL.medio).e, sub: T('Aditivo', 'Additive') + (a.ins.length ? ' · INS ' + a.ins[0] : ''), r: '/mercado/aditivos' }); });
    HN.cat.list().forEach(function (p) { out.push({ t: [p.nome, p.marca, p.tipo, p.ean].join(' '), label: nomeProd(p), e: '🏪', sub: T('Produto', 'Product') + (p.marca ? ' · ' + p.marca : ''), r: '/mercado/p/' + encodeURIComponent(p.id) }); });
    return out;
  };
})(window.HN = window.HN || {});
/* cartões de produto: Enter/Espaço também abrem (são role="button") */
document.addEventListener('keydown', function (e) { if ((e.key === 'Enter' || e.key === ' ') && e.target.matches && e.target.matches('.prod[role=button]')) { e.preventDefault(); e.target.click(); } });

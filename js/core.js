/* HyperNutry — núcleo: idioma, armazenamento, rota, camadas (voltar do celular), menu, busca, ações.
 * Regras do projeto: texto sempre T('pt','en'); permissão/estado num lugar só; nada de pushState espalhado
 * (somente HN.go e HN.layer). Dados de saúde ficam no aparelho (localStorage); nada é enviado a servidor.
 */
(function (HN) {
  'use strict';
  HN.version = '0.4.1';
  var NS = 'hypernutry:';

  /* ---------- utilidades ---------- */
  HN.q = function (s, r) { return (r || document).querySelector(s); };
  HN.qa = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  HN.esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  HN.id = function () { return Date.now().toString(36) + Math.random().toString(36).slice(2, 6); };
  HN.clamp = function (v, a, b) { return Math.min(Math.max(v, a), b); };
  HN.round = function (v, d) { var k = Math.pow(10, d || 0); return Math.round(v * k) / k; };
  var MES = { pt: ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'], en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] };
  // Datas: PT 17/Set/2026 · EN Sep/17/2026
  HN.fmtDate = function (ts, hora) {
    var d = new Date(ts); if (isNaN(d)) return '';
    var dd = ('0' + d.getDate()).slice(-2), m = MES[HN.lang][d.getMonth()], y = d.getFullYear();
    var s = HN.lang === 'pt' ? dd + '/' + m + '/' + y : m + '/' + dd + '/' + y;
    if (hora) s += ' ' + ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2);
    return s;
  };
  HN.dayKey = function (ts) { var d = new Date(ts); return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); };
  HN.today = function () { return HN.dayKey(Date.now()); };
  HN.weekday = function (i) { return HN.lang === 'pt' ? ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'][i] : ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'][i]; };
  HN.num = function (v, d) { if (v == null || isNaN(v)) return '–'; var s = HN.round(v, d == null ? 0 : d).toFixed(d == null ? 0 : d); return HN.lang === 'pt' ? s.replace('.', ',') : s; };
  HN.lang = 'pt';
  HN.T = function (pt, en) { return HN.lang === 'en' && en != null ? en : pt; };
  HN.tt = function (arr) { return HN.lang === 'en' ? arr[1] : arr[0]; };

  /* ---------- armazenamento ---------- */
  var mem = {}, vol = false, loaded = false;
  var S = HN.S = {
    get: function (k, def) {
      if (k in mem) return mem[k];
      if (!vol) { try { var v = localStorage.getItem(NS + k); if (v != null) { mem[k] = JSON.parse(v); return mem[k]; } } catch (e) { /* JSON inválido ou sem acesso: usa padrão */ } }
      return def;
    },
    set: function (k, v) { mem[k] = v; if (!vol) { try { localStorage.setItem(NS + k, JSON.stringify(v)); } catch (e) { HN.toast(HN.T('Sem espaço para guardar. Exporte e limpe dados antigos.', 'No room to save. Export and clear old data.')); } } return v; },
    del: function (k) { delete mem[k]; try { localStorage.removeItem(NS + k); } catch (e) { /* ignora */ } },
    keys: function () { var o = []; try { for (var i = 0; i < localStorage.length; i++) { var k = localStorage.key(i); if (k.indexOf(NS) === 0) o.push(k.slice(NS.length)); } } catch (e) { /* ignora */ } return o; },
    exportAll: function () { var o = { app: 'HyperNutry', versao: HN.version, exportadoEm: new Date().toISOString(), dados: {} }; S.keys().forEach(function (k) { o.dados[k] = S.get(k); }); return o; },
    importAll: function (o) { if (!o || o.app !== 'HyperNutry' || !o.dados) throw new Error('arquivo inválido'); Object.keys(o.dados).forEach(function (k) { S.set(k, o.dados[k]); }); },
    wipe: function () { S.keys().forEach(S.del); mem = {}; try { indexedDB.deleteDatabase('hypernutry'); } catch (e) { /* ignora */ } },
    setVolatile: function (v) { vol = v; if (v) mem = {}; },
    isVolatile: function () { return vol; }
  };
  HN.cfg = function () { return S.get('cfg', {}); };
  HN.setCfg = function (patch) { var c = HN.cfg(); Object.keys(patch).forEach(function (k) { c[k] = patch[k]; }); S.set('cfg', c); return c; };

  /* ---------- alimentos próprios (rótulos lidos) ---------- */
  HN.registerFood = function (o) {
    var f = { id: o.id, pt: o.pt, en: o.en || o.pt, group: o.group || 'ultra', kcal: o.kcal || 0, p: o.p || 0, c: o.c || 0, f: o.f || 0, fib: o.fib || 0, na: o.na || 0, allergens: (o.allergens || []).map(function (a) { return a.replace('*', ''); }), nova: o.nova || 3, measures: o.measures || [], src: o.src || 'CUSTOM_OCR', custom: true };
    f.animal = false; f.dairyEgg = f.allergens.indexOf('leite') >= 0 || f.allergens.indexOf('ovo') >= 0; f.vegan = !f.dairyEgg; f.vegetarian = true;
    f.glutenFree = f.allergens.indexOf('gluten') < 0; f.lactoseFree = f.allergens.indexOf('leite') < 0; f.nutFree = f.allergens.indexOf('castanhas') < 0 && f.allergens.indexOf('amendoim') < 0;
    var k = Math.max(f.kcal, 1), s = 2 * Math.min(f.p / k * 100 / 10, 1) + 1.5 * Math.min(f.fib / k * 100 / 4, 1) + 1.5 * (1 - Math.min(k / 100 / 4, 1)); if (f.nova === 4) s -= 1;
    f.satiety = Math.max(0, Math.min(5, Math.round(s * 10) / 10));
    if (!HN.foods[f.id]) HN.foodList.push(f); else HN.foodList = HN.foodList.map(function (x) { return x.id === f.id ? f : x; });
    HN.foods[f.id] = f; return f;
  };
  HN.loadCustomFoods = function () { (S.get('produtos', []) || []).forEach(HN.registerFood); };
  HN.foodName = function (f) { return HN.lang === 'en' ? f.en : f.pt; };

  /* ---------- perfil ativo ---------- */
  HN.perfis = function () { return S.get('perfis', []); };
  HN.perfil = function () { var l = HN.perfis(), a = S.get('perfilAtivo'); for (var i = 0; i < l.length; i++) if (l[i].id === a) return l[i]; return l[0] || null; };
  HN.idade = function (p) { if (!p || !p.nasc) return p && p.idade != null ? p.idade : null; var n = new Date(p.nasc), h = new Date(), a = h.getFullYear() - n.getFullYear(); if (h < new Date(h.getFullYear(), n.getMonth(), n.getDate())) a--; return a; };
  HN.savePerfil = function (p) { var l = HN.perfis(), ok = false; l = l.map(function (x) { if (x.id === p.id) { ok = true; return p; } return x; }); if (!ok) l.push(p); S.set('perfis', l); if (!S.get('perfilAtivo')) S.set('perfilAtivo', p.id); };
  // números (calorias/metas) só aparecem no modo híbrido e sem sinais de alerta
  HN.perfilCalc = function (p) { p = p || HN.perfil() || {}; return { sexo: p.sexo, peso: +p.peso, altura: +p.altura, idade: HN.idade(p), fator: +p.fator || 1.2, gordura: +p.gordura || 0 }; };
  HN.alertas = function (p) { p = p || HN.perfil(); if (!p) return []; return HN.calc.alertas({ idade: HN.idade(p), historicoTA: p.historicoTA, gestante: p.gestante }); };
  HN.numerosOk = function (p) { p = p || HN.perfil(); return !!p && p.modo === 'hibrido' && HN.alertas(p).length === 0; };

  /* ---------- menu e busca ---------- */
  HN.nav = {
    calc: { r: '/', e: '🧮', pt: 'Calculadora de calorias', en: 'Calorie calculator', k: 'calculadora calorias calcular refeicao kcal macros home inicio calculator calories' },
    acomp: { r: '/acomp', e: '🩺', pt: 'Meu acompanhamento', en: 'My follow-up', k: 'acompanhamento painel saude inicio dashboard follow-up' },
    gostos: { r: '/gostos', e: '😋', pt: 'Gostos e cozinha', en: 'Tastes & kitchen', k: 'gostos preferencias nao gosto evito restricoes eletrodomesticos tastes preferences' },
    diario: { r: '/diario', e: '📝', pt: 'Diário', en: 'Diary', k: 'registrar refeição comi diario meal log food' },
    saciedade: { r: '/saciedade', e: '🥣', pt: 'Saciedade Raiz', en: 'Real Fullness', k: 'saciedade fome sustenta prato proteina fibra fullness hunger plate' },
    intuitivo: { r: '/intuitivo', e: '🧘', pt: 'Fome e emoções', en: 'Hunger & mood', k: 'intuitiva fome saciedade emocao gatilho mindful atencao plena intuitive eating' },
    metas: { r: '/metas', e: '🎯', pt: 'Metas flexíveis', en: 'Flexible goals', k: 'calorias gasto energetico tmb get macros metas calculadora tdee goals' },
    alimentos: { r: '/alimentos', e: '🔎', pt: 'Alimentos (TACO)', en: 'Foods (TACO)', k: 'alimentos taco tbca tabela nutricional buscar substituir food table' },
    planejar: { r: '/planejar', e: '🗓️', pt: 'Cardápio da semana', en: 'Weekly menu', k: 'cardapio semana planejar menu plan meal prep' },
    despensa: { r: '/planejar/despensa', e: '🧺', pt: 'Despensa', en: 'Pantry', k: 'despensa estoque pantry' },
    compras: { r: '/planejar/compras', e: '🛒', pt: 'Lista de compras', en: 'Shopping list', k: 'compras mercado lista shopping groceries' },
    receitas: { r: '/receitas', e: '🍳', pt: 'Receitas', en: 'Recipes', k: 'receitas cozinhar airfryer panela pressao recipes cook' },
    familia: { r: '/familia', e: '👨‍👩‍👧', pt: 'Família e perfis', en: 'Family & profiles', k: 'familia perfis dependentes filhos family profiles' },
    cozinheiro: { r: '/cozinheiro', e: '🧑‍🍳', pt: 'Modo cozinheiro', en: 'Cook mode', k: 'cozinheiro funcionario domestico delegar pdf cook employee' },
    corpo: { r: '/corpo', e: '📏', pt: 'Corpo e bem-estar', en: 'Body & well-being', k: 'peso medidas sono intestino bristol bem estar corpo bioimpedancia body' },
    mercado: { r: '/mercado', e: '🏪', pt: 'Produtos do mercado', en: 'Store products', k: 'mercado produtos marcas aditivos conservantes corantes favoritos catalogo supermercado store products additives brands' },
    aditivos: { r: '/mercado/aditivos', e: '📖', pt: 'Glossário de aditivos', en: 'Additive glossary', k: 'aditivos glossario ingredientes ruins conservante corante adocante ins additives glossary' },
    rotulos: { r: '/rotulos', e: '🏷️', pt: 'Ler rótulo', en: 'Read a label', k: 'rotulo ocr scanner tabela nutricional alergenos label scan allergens' },
    tele: { r: '/tele', e: '🩺', pt: 'Telenutrição', en: 'Telenutrition', k: 'consulta nutricionista teleconsulta documentos exames laudos' },
    planos: { r: '/planos', e: '💎', pt: 'Planos', en: 'Plans', k: 'planos assinatura premium vip gratis preco plans subscription' },
    ajuda: { r: '/ajuda', e: '❓', pt: 'Ajuda', en: 'Help', k: 'ajuda tutorial duvida help' },
    config: { r: '/config', e: '⚙️', pt: 'Configurações', en: 'Settings', k: 'configuracoes idioma tema fonte exportar apagar dados settings language' },
    sobre: { r: '/sobre', e: 'ℹ️', pt: 'Sobre e avisos legais', en: 'About & legal', k: 'sobre avisos legais lgpd termos cfn about legal privacy' }
  };
  HN.menuGroups = [
    [['🧮 Calcular e cozinhar', '🧮 Calculate & cook'], ['calc', 'planejar', 'despensa', 'compras', 'receitas', 'alimentos', 'mercado', 'aditivos', 'rotulos', 'saciedade', 'gostos', 'cozinheiro']],
    [['🩺 Meu acompanhamento (saúde 🔒)', '🩺 My follow-up (health 🔒)'], ['acomp', 'diario', 'intuitivo', 'metas', 'corpo', 'familia', 'tele']],
    [['App', 'App'], ['planos', 'ajuda', 'config', 'sobre']]
  ];
  // a que parte cada tela pertence: A = calcular/cozinhar · B = acompanhamento (exige aceite LGPD) · C = comum
  HN.navShort = { calc: ['Calcular', 'Calculate'], planejar: ['Cardápio', 'Menu'], receitas: ['Receitas', 'Recipes'], compras: ['Compras', 'Shopping'], rotulos: ['Rótulo', 'Label'], mercado: ['Mercado', 'Store'], aditivos: ['Aditivos', 'Additives'], acomp: ['Início', 'Home'], diario: ['Diário', 'Diary'], intuitivo: ['Fome', 'Hunger'], corpo: ['Corpo', 'Body'], metas: ['Metas', 'Goals'], despensa: ['Despensa', 'Pantry'], alimentos: ['Alimentos', 'Foods'], saciedade: ['Saciedade', 'Fullness'], tele: ['Consulta', 'Consult'], familia: ['Família', 'Family'], gostos: ['Gostos', 'Tastes'], cozinheiro: ['Cozinheiro', 'Cook'] };
  HN.partMap = { home: 'A', planejar: 'A', receitas: 'A', receita: 'A', alimentos: 'A', alimento: 'A', rotulos: 'A', mercado: 'A', saciedade: 'A', gostos: 'A', cozinheiro: 'A', acomp: 'B', diario: 'B', intuitivo: 'B', metas: 'B', familia: 'B', corpo: 'B', tele: 'B', wizard: 'B', boasvindas: 'B' };
  HN.partOf = function (name) { return HN.partMap[name] || 'C'; };
  var lastPart = 'A';
  HN.curPart = function () { var p = HN.partOf(cur.name); if (p !== 'C') lastPart = p; return lastPart; };
  HN.homeOf = function () { return HN.curPart() === 'B' ? '/acomp' : '/'; };
  // barra de baixo: até 4 favoritos (2 de cada lado) + câmera fixa no centro
  HN.BAR_MAX = 4;
  HN.defaultBars = { A: ['calc', 'planejar', 'receitas', 'compras'], B: ['acomp', 'diario', 'intuitivo', 'corpo'] };
  HN.barIds = function (part) { part = part || HN.curPart(); var c = HN.cfg(), b = c.bars && c.bars[part]; return (b && b.length ? b : HN.defaultBars[part]).filter(function (i) { return HN.nav[i]; }).slice(0, HN.BAR_MAX); };
  HN.setBar = function (part, list) { var c = HN.cfg(), o = c.bars || {}; o[part] = list ? list.slice(0, HN.BAR_MAX) : null; HN.setCfg({ bars: o }); };

  HN.searchIndex = function () {
    var out = [];
    Object.keys(HN.nav).forEach(function (id) { var n = HN.nav[id]; out.push({ t: n.pt + ' ' + n.en + ' ' + n.k, label: HN.tt([n.pt, n.en]), e: n.e, sub: HN.T('Tela', 'Screen'), r: n.r }); });
    HN.foodList.forEach(function (f) { out.push({ t: f.pt + ' ' + f.en, label: HN.foodName(f), e: '🥕', sub: HN.T('Alimento', 'Food') + ' · ' + f.kcal + ' kcal/100 g', r: '/alimento/' + f.id }); });
    HN.recipeList.forEach(function (r) { out.push({ t: r.pt + ' ' + r.en, label: HN.tt([r.pt, r.en]), e: '🍳', sub: HN.T('Receita', 'Recipe') + ' · ' + r.time + ' min', r: '/receita/' + r.id }); });
    return out;
  };
  function nrm(s) { return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''); }
  HN.nrm = nrm;
  function lev(a, b) { var m = [], i, j; for (i = 0; i <= a.length; i++) m[i] = [i]; for (j = 0; j <= b.length; j++) m[0][j] = j; for (i = 1; i <= a.length; i++) for (j = 1; j <= b.length; j++) m[i][j] = Math.min(m[i - 1][j] + 1, m[i][j - 1] + 1, m[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); return m[a.length][b.length]; }
  HN.search = function (term) {
    var q = nrm(term).trim(); if (!q) return { hits: [], sug: [] };
    var idx = HN.searchIndex(), words = q.split(/\s+/), hits = [], vocab = {};
    idx.forEach(function (it) {
      var n = nrm(it.t), ok = words.every(function (w) { return n.indexOf(w) >= 0; });
      if (ok) { var sc = nrm(it.label).indexOf(q) === 0 ? 0 : nrm(it.label).indexOf(q) > 0 ? 1 : 2; hits.push({ it: it, sc: sc }); }
      n.split(/\s+/).forEach(function (w) { if (w.length > 3) vocab[w] = 1; });
    });
    hits.sort(function (a, b) { return a.sc - b.sc; });
    var sug = [];
    if (!hits.length) {
      sug = Object.keys(vocab).map(function (w) { return { w: w, d: lev(w, q) }; }).filter(function (x) { return x.d <= Math.max(2, Math.floor(q.length / 3)); }).sort(function (a, b) { return a.d - b.d; }).slice(0, 5).map(function (x) { return x.w; });
    }
    return { hits: hits.slice(0, 30).map(function (h) { return h.it; }), sug: sug };
  };

  /* ---------- camadas (gaveta, folha, tela cheia) e botão Voltar ---------- */
  var layers = [], closeAll = null;
  var LY = HN.layer = {
    count: function () { return layers.length; },
    open: function (o) {
      var host = HN.q('#layers'), wrap = document.createElement('div');
      var inner = '';
      if (o.type === 'drawer') inner = '<div class="scrim" data-act="layer-close"></div><aside class="drawer" role="dialog" aria-modal="true" aria-label="' + HN.esc(o.label || 'Menu') + '">' + o.html + '</aside>';
      else if (o.type === 'full') inner = '<section class="full" role="dialog" aria-modal="true" aria-label="' + HN.esc(o.label || '') + '">' + o.html + '</section>';
      else inner = '<div class="scrim" data-act="layer-close"></div><div class="sheet" role="dialog" aria-modal="true" aria-label="' + HN.esc(o.label || '') + '"><div class="grab"></div>' + o.html + '</div>';
      wrap.innerHTML = inner; host.appendChild(wrap);
      var L = { el: wrap, onClose: o.onClose, opener: document.activeElement };
      layers.push(L);
      history.pushState({ layer: layers.length }, '', location.href);
      var f = HN.q('[autofocus]', wrap) || HN.q('button,input,select,textarea', wrap); if (f && o.focus !== false) { try { f.focus({ preventScroll: true }); } catch (e) { /* ignora */ } }
      if (o.after) o.after(wrap);
      return wrap;
    },
    close: function () { if (layers.length) history.back(); },
    _removeTop: function () { var L = layers.pop(); if (!L) return; if (L.el.parentNode) L.el.parentNode.removeChild(L.el); if (L.onClose) L.onClose(); if (L.opener && L.opener.focus) { try { L.opener.focus({ preventScroll: true }); } catch (e) { /* ignora */ } } },
    closeAllThen: function (fn) {
      if (!layers.length) { fn(); return; }
      var n = layers.length, done = false;
      closeAll = function () { if (done) return; done = true; closeAll = null; while (layers.length) LY._removeTop(); fn(); };
      history.go(-n); setTimeout(function () { if (closeAll) closeAll(); }, 400);
    },
    top: function () { return layers.length ? layers[layers.length - 1].el : null; }
  };
  HN.confirm = function (msg, okLabel, opts) {
    opts = opts || {};
    return new Promise(function (res) {
      var settled = false;
      HN.layer.open({
        label: msg, onClose: function () { if (!settled) { settled = true; res(false); } },
        html: '<p style="font-size:1.05rem">' + msg + '</p><div class="row wrap mt"><button class="btn ' + (opts.danger ? 'bad' : '') + ' grow" data-act="confirm-ok">' + HN.esc(okLabel || 'OK') + '</button><button class="btn ghost grow" data-act="layer-close">' + HN.T('Cancelar', 'Cancel') + '</button></div>',
        after: function (el) { el.addEventListener('click', function (e) { if (e.target.closest('[data-act="confirm-ok"]')) { settled = true; res(true); HN.layer.close(); } }); }
      });
    });
  };
  HN.sheet = function (title, html, after) { return HN.layer.open({ label: title, html: '<div class="row"><h2 class="grow">' + title + '</h2><button class="ib" data-act="layer-close" aria-label="' + HN.T('Fechar', 'Close') + '">✕</button></div>' + html, after: after }); };

  /* ---------- toast ---------- */
  var toastT;
  HN.toast = function (msg, ms) {
    var old = HN.q('.toast'); if (old) old.remove();
    var t = document.createElement('div'); t.className = 'toast'; t.setAttribute('role', 'status'); t.textContent = msg; document.body.appendChild(t);
    clearTimeout(toastT); toastT = setTimeout(function () { t.remove(); }, ms || 2600);
  };

  /* ---------- rota ---------- */
  HN.views = {}; HN.after = {}; HN.acts = {}; HN.ins = {};
  var cur = { name: '', parts: [] }, guarded = false;
  HN.route = function () { return cur; };
  function parseHash() { var h = (location.hash || '#/').slice(1); var qi = h.indexOf('?'); var query = {}; if (qi >= 0) { h.slice(qi + 1).split('&').forEach(function (kv) { var p = kv.split('='); query[decodeURIComponent(p[0])] = decodeURIComponent(p[1] || ''); }); h = h.slice(0, qi); } var parts = h.split('/').filter(Boolean); return { name: parts[0] || 'home', parts: parts, query: query }; }
  function isTop(name) { if (name === 'home' || name === 'acomp') return true; return HN.barIds('A').concat(HN.barIds('B')).some(function (id) { return HN.nav[id].r.split('/')[1] === name; }); }
  HN.go = function (route, opt) {
    opt = opt || {};
    var run = function () {
      var target = route.charAt(0) === '/' ? route : '/' + route, tn = target.split('/')[1] || 'home';
      var replace = opt.replace || (cur.name !== 'home' && isTop(cur.name) && isTop(tn));
      if (('#' + target) === location.hash || (target === '/' && (location.hash === '' || location.hash === '#/'))) { HN.render(); return; }
      try { if (replace) history.replaceState({ r: target }, '', '#' + target); else history.pushState({ r: target }, '', '#' + target); } catch (e) { location.hash = target; }
      HN.render();
    };
    HN.layer.closeAllThen(run);
  };
  HN.render = function (keepScroll) {
    var r = parseHash(), name = r.name, view = HN.views[name];
    if (HN.partOf(name) === 'B' && name !== 'boasvindas' && name !== 'wizard' && !HN.cfg().aceite) { // parte de saúde: exige aceite LGPD
      try { history.replaceState({ r: '/boasvindas' }, '', '#/boasvindas'); } catch (e) { /* ignora */ }
      r = parseHash(); name = r.name; view = HN.views[name];
    } else if (HN.partOf(name) === 'B' && name !== 'boasvindas' && name !== 'wizard' && !HN.perfil() && HN.cfg().aceite) {
      try { history.replaceState({ r: '/wizard/1' }, '', '#/wizard/1'); } catch (e) { /* ignora */ }
      r = parseHash(); name = r.name; view = HN.views[name];
    }
    if (!view) { name = 'home'; view = HN.views.home; r = { name: 'home', parts: ['home'], query: {} }; }
    cur = r; var app = HN.q('#app'), y = window.scrollY;
    var html; try { html = view(r.parts, r.query); } catch (e) { console.error(e); html = '<div class="notice bad">' + HN.T('Algo deu errado nesta tela. Volte ao Início.', 'Something went wrong on this screen. Go back Home.') + '</div>'; }
    app.innerHTML = '<div class="view">' + html + '</div>';
    if (HN.after[name]) { try { HN.after[name](r.parts, r.query); } catch (e) { console.error(e); } }
    window.scrollTo(0, keepScroll ? y : 0);
    HN.renderChrome(); document.title = 'HyperNutry' + (name !== 'home' && HN.nav[name] ? ' · ' + HN.tt([HN.nav[name].pt, HN.nav[name].en]) : '');
  };
  HN.refresh = function () { HN.render(true); };

  /* ---------- cabeçalho e barra de baixo ---------- */
  var LOGO = '<svg viewBox="0 0 64 64" aria-hidden="true"><defs><linearGradient id="lg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#22b573"/><stop offset="1" stop-color="#0b6b45"/></linearGradient></defs><rect width="64" height="64" rx="15" fill="url(#lg)"/><path d="M18 46V18M18 32h14M32 18v28" stroke="#fff" stroke-width="6" stroke-linecap="round" fill="none"/><path d="M38 30c0-10 8-15 16-15 0 9-5 16-16 15z" fill="#ffb55a"/></svg>';
  HN.logo = LOGO;
  HN.renderChrome = function () {
    var T = HN.T, name = cur.name, hasProfile = true, inWizard = name === 'wizard' || name === 'boasvindas';
    var top = HN.q('#top');
    top.innerHTML =
      (inWizard || !hasProfile ? '' : '<button class="ib" data-act="menu" aria-label="Menu" aria-expanded="false" aria-haspopup="dialog">☰</button>') +
      '<button class="brand" data-act="home" aria-label="HyperNutry ' + T('Início', 'Home') + '">' + LOGO + '<span>Hyper<b>Nutry</b></span></button><div class="grow"></div>' +
      '<button class="langbtn" data-act="lang" aria-label="' + T('Mudar idioma', 'Change language') + '" title="PT/EN">' + (HN.lang === 'pt' ? 'PT' : 'EN') + '</button>' +
      '<button class="ib" data-act="search" aria-label="' + T('Buscar', 'Search') + '">🔍</button>' +
      '<button class="ib" data-act="help" aria-label="' + T('Ajuda', 'Help') + '">❓</button>' +
      '<button class="ib" data-act="go" data-arg="/config" aria-label="' + T('Configurações', 'Settings') + '">⚙️</button>' +
      '<button class="ib" data-act="home" aria-label="' + T('Início', 'Home') + '"' + (name === 'home' ? ' aria-current="page"' : '') + '>🏠</button>';
    var bn = HN.q('#bn');
    var pn = HN.q('#parts');
    var cp = HN.curPart(); document.documentElement.setAttribute('data-part', cp);
    if (pn) { if (inWizard) pn.classList.add('hide'); else { pn.classList.remove('hide'); var ok = !!HN.cfg().aceite; pn.innerHTML = '<div class="seg' + (cp === 'B' ? ' b' : '') + '"><i aria-hidden="true"></i><button data-act="go" data-arg="/" class="' + (cp === 'A' ? 'on' : '') + '"' + (cp === 'A' ? ' aria-current="true"' : '') + '>🧮 ' + T('Calcular e cozinhar', 'Calculate & cook') + '<span class="tag">' + T('sem cadastro', 'no sign-up') + '</span></button><button data-act="go" data-arg="/acomp" class="' + (cp === 'B' ? 'on' : '') + '"' + (cp === 'B' ? ' aria-current="true"' : '') + '>🩺 ' + T('Meu acompanhamento', 'My follow-up') + '<span class="tag">' + T('saúde · protegido', 'health · protected') + (ok ? '' : ' 🔒') + '</span></button></div>'; } }
    if (inWizard || !hasProfile) { bn.classList.add('hide'); } else {
      bn.classList.remove('hide');
      var btns = HN.barIds(cp).map(function (id) { var n = HN.nav[id], on = (n.r === '/' ? name === 'home' : n.r.split('/')[1] === name && (id !== 'despensa' && id !== 'compras' || cur.parts[1] === n.r.split('/')[2])); return '<button data-act="go" data-arg="' + n.r + '" class="' + (on ? 'on' : '') + '"' + (on ? ' aria-current="page"' : '') + '><span class="e">' + n.e + '</span><span class="l">' + HN.tt(HN.navShort[id] || [n.pt, n.en]) + '</span></button>'; });
      while (btns.length < HN.BAR_MAX) btns.push('<span class="gap" aria-hidden="true"></span>'); // mantém a câmera no centro
      var cam = '<button class="cam" data-act="scan" aria-label="' + T('Câmera: ler rótulo, código de barras, prato ou laudo', 'Camera: scan label, barcode, plate or report') + '"><span class="e">📷</span></button>';
      bn.innerHTML = btns.slice(0, 2).join('') + cam + btns.slice(2).join('');
    }
  };

  /* ---------- ações globais ---------- */
  var A = HN.acts;
  A.go = function (arg) { HN.go(arg); };
  A.home = function () { HN.go(HN.homeOf()); };
  A['layer-close'] = function () { HN.layer.close(); };
  A.lang = function () { HN.setCfg({ lang: HN.lang === 'pt' ? 'en' : 'pt' }); HN.lang = HN.cfg().lang; document.documentElement.lang = HN.lang === 'pt' ? 'pt-BR' : 'en'; HN.render(true); document.dispatchEvent(new CustomEvent('hn:idioma', { detail: HN.lang })); };
  A.help = function () { HN.go('/ajuda'); };
  A.menu = function (arg, el) {
    if (el) el.setAttribute('aria-expanded', 'true');
    var cur2 = cur.name, html = '<div class="dh"><div class="brand" style="cursor:default">' + LOGO + '<span>Hyper<b>Nutry</b></span></div><button class="ib" data-act="layer-close" aria-label="' + HN.T('Fechar menu', 'Close menu') + '">✕</button></div>';
    HN.menuGroups.forEach(function (g) {
      html += '<h4>' + HN.tt(g[0]) + '</h4>';
      g[1].forEach(function (id) { var n = HN.nav[id]; var on = n.r === '/' ? cur2 === 'home' : (cur2 === n.r.split('/')[1] && !(id === 'despensa' || id === 'compras')); html += '<button class="dl ' + (on ? 'on' : '') + '" data-act="drawer-go" data-arg="' + n.r + '"><span class="e">' + n.e + '</span>' + HN.tt([n.pt, n.en]) + '</button>'; });
    });
    html += '<h4>' + HN.T('Mais', 'More') + '</h4><a class="dl" href="https://marceloneco.github.io" target="_blank" rel="noopener" style="text-decoration:none;color:inherit"><span class="e">🌐</span>' + HN.T('Portal de projetos', 'Projects portal') + ' ↗</a>';
    HN.layer.open({ type: 'drawer', label: 'Menu', html: html, onClose: function () { var b = HN.q('[data-act="menu"]'); if (b) b.setAttribute('aria-expanded', 'false'); } });
  };
  A['drawer-go'] = function (arg) { HN.go(arg); };
  A.search = function () {
    var T = HN.T;
    HN.layer.open({ type: 'full', label: T('Buscar', 'Search'), html: '<div class="fh"><button class="ib" data-act="layer-close" aria-label="' + T('Voltar', 'Back') + '">←</button><input type="search" id="q" class="grow" autofocus autocomplete="off" placeholder="' + T('Buscar telas, alimentos, receitas…', 'Search screens, foods, recipes…') + '" data-in="busca"></div><div id="qres" style="padding:.6rem .9rem"><p class="muted">' + T('Digite para buscar. Ex.: "airfryer", "fome", "arroz".', 'Type to search. E.g. "air fryer", "hunger", "rice".') + '</p></div>' });
  };
  HN.ins.busca = function (v) {
    var r = HN.search(v), box = HN.q('#qres'); if (!box) return;
    if (!v.trim()) { box.innerHTML = ''; return; }
    if (!r.hits.length) { box.innerHTML = '<p>' + HN.T('Nada encontrado para', 'Nothing found for') + ' <b>' + HN.esc(v) + '</b>.</p>' + (r.sug.length ? '<p class="muted">' + HN.T('Quem sabe você quis dizer:', 'Maybe you meant:') + '</p><div class="chips">' + r.sug.map(function (w) { return '<button class="chip" data-act="search-term" data-arg="' + HN.esc(w) + '">' + HN.esc(w) + '</button>'; }).join('') + '</div>' : ''); return; }
    box.innerHTML = '<div class="list">' + r.hits.map(function (h) { return '<button class="li" data-act="search-go" data-arg="' + HN.esc(h.r) + '"><span class="e">' + h.e + '</span><span class="grow"><div class="t">' + HN.esc(h.label) + '</div><div class="s">' + HN.esc(h.sub) + '</div></span></button>'; }).join('') + '</div>';
  };
  A['search-term'] = function (w) { var i = HN.q('#q'); if (i) { i.value = w; HN.ins.busca(w); } };
  A['search-go'] = function (arg) { HN.go(arg); };

  /* ---------- vibração curta (haptic) ----------
   * leve = trocar aba/filtro · média = passo da escala de fome · sucesso = leitura reconhecida.
   * navigator.vibrate só existe no Android; no iPhone o site não pode vibrar e nada acontece. */
  var PULSO = { leve: 8, media: 18, sucesso: [12, 40, 18] };
  HN.haptic = function (tipo) {
    var c = HN.cfg(); if (c.semVibrar || c.reduzir || !navigator.vibrate) return;
    try { navigator.vibrate(PULSO[tipo] || PULSO.leve); } catch (e) { /* sem vibração neste aparelho */ }
  };

  /* câmera (botão 📷 do centro): A.scan fica em js/v-scan.js */

  /* ---------- delegação de eventos ---------- */
  document.addEventListener('click', function (e) {
    var el = e.target.closest('[data-act]'); if (!el) return;
    if (el.matches('.chip, .tab, .bn button, .parts button, .cam')) HN.haptic('leve'); else if (el.closest('.scale')) HN.haptic('media');
    var f = A[el.getAttribute('data-act')]; if (f) { if (el.tagName === 'A') { /* link normal */ } f(el.getAttribute('data-arg'), el, e); }
  });
  function inHandler(e) {
    var el = e.target.closest('[data-in]'); if (!el) return;
    var tag = el.tagName, type = (el.type || '').toLowerCase(), live = (tag === 'TEXTAREA' || (tag === 'INPUT' && ['text', 'number', 'search', 'range'].indexOf(type) >= 0));
    if (e.type === 'input' && !live) return; if (e.type === 'change' && live && type !== 'number' && type !== 'range') return;
    var v = type === 'checkbox' ? el.checked : el.value, f = HN.ins[el.getAttribute('data-in')]; if (f) f(v, el, e);
  }
  document.addEventListener('input', inHandler); document.addEventListener('change', inHandler);
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && layers.length) HN.layer.close(); if ((e.key === 'Enter' || e.key === ' ') && e.target.matches && e.target.matches('.card.tap[role=button]')) { e.preventDefault(); e.target.click(); } });

  window.addEventListener('popstate', function (e) {
    if (closeAll) { closeAll(); return; }
    if (layers.length) { LY._removeTop(); return; }
    HN.render();
    if (e.state && e.state.inicio && cur.name === 'home') HN.toast(HN.T('Toque em Voltar de novo para sair do HyperNutry', 'Tap Back again to leave HyperNutry'), 2200);
  });
  document.addEventListener('pointerdown', function () {
    if (guarded) return; guarded = true;
    if (cur.name === 'home' && history.state && history.state.inicio) { try { history.pushState({ guard: 1 }, '', '#/'); } catch (e) { /* ignora */ } }
  }, { once: true });

  /* ---------- aparência ---------- */
  HN.applyCfg = function () {
    var c = HN.cfg(), r = document.documentElement;
    r.setAttribute('data-theme', c.theme === 'claro' ? 'light' : c.theme === 'escuro' ? 'dark' : 'auto');
    if (c.theme !== 'claro' && c.theme !== 'escuro') r.removeAttribute('data-theme');
    r.style.setProperty('--fs', (c.fs || 100) + '%');
    if (c.contraste) r.setAttribute('data-contrast', 'alto'); else r.removeAttribute('data-contrast');
    if (c.sublinhar) r.setAttribute('data-links', 'sub'); else r.removeAttribute('data-links');
    if (c.reduzir) r.setAttribute('data-motion', 'reduzir'); else r.removeAttribute('data-motion');
    if (c.ocultar) r.setAttribute('data-ocultar', ''); else r.removeAttribute('data-ocultar'); // números sensíveis borrados na tela (Corpo, anel do dia)
  };

  /* ---------- partida ---------- */
  HN.start = function () {
    var c = HN.cfg();
    HN.lang = c.lang || ((navigator.language || 'pt').toLowerCase().indexOf('pt') === 0 ? 'pt' : 'en');
    document.documentElement.lang = HN.lang === 'pt' ? 'pt-BR' : 'en';
    HN.applyCfg(); HN.loadCustomFoods();
    var h = location.hash;
    if (!h || h === '#' || h === '#/') { try { history.replaceState({ inicio: 1 }, '', '#/'); } catch (e) { /* ignora */ } }
    HN.render();
    if ('serviceWorker' in navigator && location.protocol.indexOf('http') === 0) navigator.serviceWorker.register('sw.js').catch(function () { /* sem offline nesta visita */ });
  };
})(window.HN = window.HN || {});

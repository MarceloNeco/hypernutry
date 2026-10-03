/* HyperNutry — PARTE A (calcular e cozinhar): calculadora de calorias, gostos e cozinha.
 * Não exige perfil de saúde nem aceite LGPD: nada aqui é enviado a servidor e o cálculo diário não é salvo.
 * Também liga a TACO completa ao resto do app (micronutrientes, restrições unificadas, gostos no cardápio).
 */
(function (HN) {
  'use strict';
  var S = HN.S, C = HN.calc, U = HN.ui, esc = HN.esc, T = HN.T, V = HN.views, A = HN.acts;

  /* ================= gostos e cozinha (Parte A) ================= */
  function gostos() { var g = S.get('gostos', null) || {}; g.restr = g.restr || []; g.equip = g.equip || []; g.curte = g.curte || []; g.evita = g.evita || []; g.pessoas = g.pessoas || 0; g.tempo = g.tempo || 0; return g; }
  function saveGostos(g) { S.set('gostos', g); S.del('cardapio'); } // mudou o gosto → cardápio da semana é refeito
  HN.gostos = gostos;
  // restrições de todas as origens (gostos + perfis de saúde, se houver)
  HN.restrAll = function () { var u = {}, p = HN.perfil(); ((p && p.restricoes) || []).concat(gostos().restr).forEach(function (r) { u[r] = 1; }); return Object.keys(u); };

  var oldCasa = HN.casaPerfil;
  HN.casaPerfil = function (relax) {
    var o = oldCasa(relax), g = gostos(), rs = {};
    (o.restricoes || []).concat(g.restr).forEach(function (r) { if (r !== 'halal') rs[r] = 1; }); o.restricoes = Object.keys(rs);
    if (g.equip.length) o.equipamentos = g.equip; else if (!(o.equipamentos && o.equipamentos.length)) delete o.equipamentos;
    if (!relax && g.tempo) o.tempoMax = g.tempo;
    o.evita = g.evita; o.curte = g.curte; return o;
  };
  var oldPes = HN.pessoas;
  HN.pessoas = function () { return gostos().pessoas || oldPes(); };
  var oldCompat = C.receitaCompativel;
  C.receitaCompativel = function (r, p) {
    if (!oldCompat(r, p)) return false;
    if (p && p.evita && p.evita.length) for (var i = 0; i < r.ing.length; i++) if (p.evita.indexOf(r.ing[i][0]) >= 0) return false;
    return true;
  };

  var LK = { q: '' };
  function likeFoods() { var seen = {}, out = []; HN.recipeList.forEach(function (r) { r.ing.forEach(function (i) { if (!seen[i[0]] && HN.foods[i[0]]) { seen[i[0]] = 1; out.push(HN.foods[i[0]]); } }); }); out.sort(function (a, b) { return HN.nrm(HN.foodName(a)) < HN.nrm(HN.foodName(b)) ? -1 : 1; }); return out; }
  HN.chipFn['gk.restr'] = function (v) { var g = gostos(), i = g.restr.indexOf(v); if (i >= 0) g.restr.splice(i, 1); else g.restr.push(v); saveGostos(g); HN.refresh(); };
  HN.chipFn['gk.equip'] = function (v) { var g = gostos(), i = g.equip.indexOf(v); if (i >= 0) g.equip.splice(i, 1); else g.equip.push(v); saveGostos(g); HN.refresh(); };
  HN.chipFn['gk.tempo'] = function (v) { var g = gostos(); g.tempo = +v; saveGostos(g); HN.refresh(); };
  HN.chipFn['gk.pes'] = function (v) { var g = gostos(); g.pessoas = +v; saveGostos(g); HN.refresh(); };
  A['gk-like'] = function (id) { var g = gostos(), u = g.curte.indexOf(id), d = g.evita.indexOf(id); if (u < 0 && d < 0) g.curte.push(id); else if (u >= 0) { g.curte.splice(u, 1); g.evita.push(id); } else g.evita.splice(d, 1); saveGostos(g); var b = HN.q('[data-act="gk-like"][data-arg="' + id + '"]'); if (b) { b.className = g.curte.indexOf(id) >= 0 ? 'up' : g.evita.indexOf(id) >= 0 ? 'down' : ''; b.setAttribute('aria-label', b.textContent + ': ' + (b.className === 'up' ? T('gosto', 'like') : b.className === 'down' ? T('evito', 'avoid') : T('neutro', 'neutral'))); } cnt(); };
  function cnt() { var g = gostos(), e = HN.q('#gkcnt'); if (e) e.textContent = '👍 ' + g.curte.length + ' · 🚫 ' + g.evita.length; }
  HN.ins['gk-q'] = function (v) { LK.q = v; var q = HN.nrm(v).trim(); HN.qa('.like3 button').forEach(function (b) { b.style.display = !q || HN.nrm(b.textContent).indexOf(q) >= 0 ? '' : 'none'; }); };
  V.gostos = function () {
    var g = gostos(), foods = likeFoods();
    return U.title('😋', T('Gostos e cozinha', 'Tastes & kitchen'), T('Para o cardápio e as receitas serem do seu jeito', 'So menus and recipes fit you')) +
      U.notice('info', T('Tudo aqui fica <b>só no seu aparelho</b> e serve apenas para montar cardápio, receitas e lista de compras. Não é seu perfil de saúde e não pede cadastro.', 'Everything here stays <b>on your device</b> and is only used to build menus, recipes and shopping lists. It is not a health profile and needs no sign-up.')) +
      '<div class="card"><h3>' + T('Quem come?', 'How many people?') + '</h3>' + U.chips('gk.pes', [['1', '1'], ['2', '2'], ['3', '3'], ['4', '4'], ['5', '5+']], String(g.pessoas || ''), false) + '</div>' +
      '<div class="card"><h3>' + T('Restrições e jeitos de comer', 'Restrictions & ways of eating') + '</h3><p class="small muted">' + T('Receitas e cardápio deixam de sugerir o que não combina.', 'Recipes and menus stop suggesting what does not fit.') + '</p>' + U.chips('gk.restr', U.RESTR, g.restr, true) + '</div>' +
      '<div class="card"><h3>' + T('O que tem na sua cozinha?', 'What is in your kitchen?') + '</h3><p class="small muted">' + T('Sem marcar nada = qualquer receita. Marcando, só aparecem receitas que cabem nos seus equipamentos.', 'Nothing ticked = any recipe. Ticked = only recipes that fit your equipment.') + '</p>' + U.chips('gk.equip', Object.keys(HN.equipment).map(function (k) { var e = HN.equipment[k]; return [k, e[0], e[1], e[2]]; }), g.equip, true) + '</div>' +
      '<div class="card"><h3>' + T('Tempo para cozinhar', 'Time to cook') + '</h3>' + U.chips('gk.tempo', [['0', 'Sem limite', 'No limit'], ['15', 'Até 15 min', 'Up to 15 min'], ['30', 'Até 30 min', 'Up to 30 min'], ['45', 'Até 45 min', 'Up to 45 min']], String(g.tempo), false) + '</div>' +
      '<div class="card"><div class="row"><h3 class="grow">' + T('Do que você gosta?', 'What do you like?') + '</h3><span id="gkcnt" class="small muted">👍 ' + g.curte.length + ' · 🚫 ' + g.evita.length + '</span></div><p class="small muted">' + T('Toque para alternar: <b>gosto</b> 👍 → <b>evito</b> 🚫 → neutro. O cardápio prefere o que você curte e nunca usa o que você evita.', 'Tap to cycle: <b>like</b> 👍 → <b>avoid</b> 🚫 → neutral. Menus prefer what you like and never use what you avoid.') + '</p>' +
      '<input type="search" data-in="gk-q" placeholder="' + T('Filtrar…', 'Filter…') + '" autocomplete="off" value="' + esc(LK.q) + '"><div class="like3 mt">' + foods.map(function (f) { var cl = g.curte.indexOf(f.id) >= 0 ? 'up' : g.evita.indexOf(f.id) >= 0 ? 'down' : ''; return '<button class="' + cl + '" data-act="gk-like" data-arg="' + f.id + '">' + esc(HN.foodName(f)) + '</button>'; }).join('') + '</div></div>' +
      '<div class="row wrap"><button class="btn grow" data-act="go" data-arg="/planejar">🗓️ ' + T('Ver meu cardápio', 'See my menu') + '</button></div>';
  };

  /* ================= CALCULADORA DE CALORIAS ================= */
  var st = null;
  function state() { if (!st) { st = S.get('calc', null) || { items: [] }; st.items = (st.items || []).filter(function (i) { return HN.foods[i.food]; }); } return st; }
  function saveSt() { S.set('calc', state()); }
  function gOf(it) { var f = HN.foods[it.food], m = it.u >= 0 && f.measures[it.u]; return Math.max(0, (+it.q || 0) * (m ? m[2] : 1)); }
  function addItem(id, q, u) {
    var f = HN.foods[id], s = state(), ex = s.items.filter(function (i) { return i.food === id; })[0];
    if (ex) { ex.q = Math.round((+ex.q + (ex.u >= 0 ? 1 : 50)) * 100) / 100; } else if (f.measures.length) s.items.push({ food: id, q: q || 1, u: u != null ? u : 0 }); else s.items.push({ food: id, q: q || 100, u: -1 });
    saveSt();
  }
  HN.calcAdd = addItem;
  function micro(items) {
    var keys = ['ca', 'fe', 'mg', 'k', 'zn', 'vc', 'sat', 'col', 'rae'], t = {}, partial = false;
    keys.forEach(function (k) { t[k] = 0; });
    items.forEach(function (it) { var f = HN.foods[it.food], g = gOf(it); if (!f.mi) { partial = true; return; } keys.forEach(function (k) { if (f.mi[k] == null) partial = true; else t[k] += f.mi[k] * g / 100; }); });
    return { t: t, partial: partial };
  }
  function totals() {
    var s = state(), its = s.items.map(function (i) { return { food: i.food, g: gOf(i) }; }), t = C.totais(its), kc = 0, sat = 0, g = 0;
    its.forEach(function (i) { var f = HN.foods[i.food], k = f.kcal * i.g / 100; kc += k; sat += f.satiety * k; g += i.g; });
    return { t: t, g: g, sat: kc > 0 ? sat / kc : 0, mi: micro(its), n: its.length };
  }
  function itemsHtml() {
    var s = state();
    if (!s.items.length) return '<p class="muted center" style="padding:.6rem 0">' + T('Busque um alimento acima ou toque num atalho para começar.', 'Search a food above or tap a shortcut to start.') + '</p>';
    return s.items.map(function (it, i) {
      var f = HN.foods[it.food], g = gOf(it);
      return '<div class="ci" style="flex-wrap:wrap"><div class="nm" style="flex:1 1 100%">' + esc(HN.foodName(f)) + '<div class="small muted">' + HN.num(f.kcal * g / 100) + ' kcal' + (it.u >= 0 ? ' · ' + HN.num(g) + ' g' : '') +  '</div></div><input type="number" inputmode="decimal" min="0" step="any" data-in="ci-q" data-i="' + i + '" value="' + it.q + '" aria-label="' + T('Quantidade', 'Amount') + '"><select data-in="ci-u" class="grow" style="flex:1;max-width:none" data-i="' + i + '" aria-label="' + T('Unidade', 'Unit') + '"><option value="-1"' + (it.u < 0 ? ' selected' : '') + '>g</option>' + f.measures.map(function (m, k) { return '<option value="' + k + '"' + (it.u === k ? ' selected' : '') + '>' + esc(HN.tt([m[0], m[1]])) + '</option>'; }).join('') + '</select><button class="ib" data-act="ci-del" data-arg="' + i + '" aria-label="' + T('Remover', 'Remove') + '">✕</button></div>';
    }).join('');
  }
  function totalsHtml() {
    var x = totals(), t = x.t;
    if (!x.n) return '';
    var kp = t.p * 4, kcc = t.c * 4, kf = t.f * 9, ks = Math.max(kp + kcc + kf, 1), pp = Math.round(kp / ks * 100), pc = Math.round(kcc / ks * 100), pf = Math.max(0, 100 - pp - pc), m = x.mi.t;
    var mr = [['Cálcio', 'Calcium', m.ca, 'mg'], ['Ferro', 'Iron', m.fe, 'mg'], ['Magnésio', 'Magnesium', m.mg, 'mg'], ['Potássio', 'Potassium', m.k, 'mg'], ['Zinco', 'Zinc', m.zn, 'mg'], ['Vitamina C', 'Vitamin C', m.vc, 'mg'], ['Vitamina A (RAE)', 'Vitamin A (RAE)', m.rae, 'mcg'], ['Gordura saturada', 'Saturated fat', m.sat, 'g'], ['Colesterol', 'Cholesterol', m.col, 'mg']];
    return '<div class="card"><div class="row" style="align-items:flex-end"><div><h3 style="margin:0">' + T('Detalhes da refeição', 'Meal details') + '</h3><div class="muted small num">' + HN.num(t.kcal) + ' kcal · ' + HN.num(x.g) + ' g</div></div><div class="grow"></div><div class="right small"><div>' + T('Saciedade', 'Fullness') + '</div>' + U.stars(x.sat) + '</div></div>' +
      '<div class="pbar" role="img" aria-label="' + T('Proteína', 'Protein') + ' ' + pp + '%, ' + T('carboidrato', 'carbs') + ' ' + pc + '%, ' + T('gordura', 'fat') + ' ' + pf + '%"><i style="width:' + pp + '%;background:var(--cyan)"></i><i style="width:' + pc + '%;background:var(--accent)"></i><i style="width:' + pf + '%;background:#ec4899"></i></div>' +
      '<div class="stat" style="grid-template-columns:repeat(3,1fr)"><div><b>' + HN.num(t.p, 1) + ' g</b><span>' + T('proteína', 'protein') + ' · ' + pp + '%</span></div><div><b>' + HN.num(t.c, 1) + ' g</b><span>' + T('carboidratos', 'carbs') + ' · ' + pc + '%</span></div><div><b>' + HN.num(t.f, 1) + ' g</b><span>' + T('gorduras', 'fat') + ' · ' + pf + '%</span></div></div>' +
      '<div class="kv"><span>' + T('Fibras', 'Fiber') + '</span><b>' + HN.num(t.fib, 1) + ' g</b></div><div class="kv"><span>' + T('Sódio', 'Sodium') + '</span><b>' + HN.num(t.na) + ' mg</b></div>' +
      '<details class="acc mt"><summary>' + T('Micronutrientes', 'Micronutrients') + '</summary><div class="small">' + mr.map(function (r) { return '<div class="kv"><span>' + HN.tt([r[0], r[1]]) + '</span><b>' + HN.num(r[2], r[2] < 10 ? 1 : 0) + ' ' + r[3] + '</b></div>'; }).join('') + (x.mi.partial ? '<p class="muted">' + T('Valores parciais: alguns alimentos não têm todos os nutrientes analisados na TACO (ou são de referência).', 'Partial values: some foods lack some analysed nutrients in TACO (or are reference items).') + '</p>' : '') + '</div></details>' +
      '<p class="small muted mt">' + T('Estimativa com base na TACO/UNICAMP; o preparo e a marca mudam os números. Saciedade: índice HyperNutry (0–5), não é medida clínica.', 'Estimate based on TACO/UNICAMP; cooking and brand change the numbers. Fullness: HyperNutry index (0–5), not a clinical measure.') + '</p></div>';
  }
  function resHtml(q) {
    q = HN.nrm(q).trim(); if (!q) return '';
    var words = q.split(/\s+/), hits = HN.foodList.filter(function (f) { var n = HN.nrm(f.pt + ' ' + f.en); return words.every(function (w) { return n.indexOf(w) >= 0; }); });
    hits.sort(function (a, b) { var na = HN.nrm(a.pt), nb = HN.nrm(b.pt), ca = a.taco ? 1 : 0, cb = b.taco ? 1 : 0; if (ca !== cb) return ca - cb; var pa = na.indexOf(words[0]) === 0 ? 0 : 1, pb = nb.indexOf(words[0]) === 0 ? 0 : 1; if (pa !== pb) return pa - pb; return na.length - nb.length; });
    if (!hits.length) return '<p class="muted">' + T('Não achou? ', 'Not found? ') + '<button class="btn sm sec" data-act="food-new">＋ ' + T('Cadastrar alimento', 'Add a food') + '</button></p>';
    return '<div class="list">' + hits.slice(0, 12).map(function (f) { return '<button class="li" data-act="calc-pick" data-arg="' + f.id + '"><span class="e">＋</span><span class="grow"><div class="t">' + esc(HN.foodName(f)) + '</div><div class="s">' + f.kcal + ' kcal/100 g' + (f.measures.length ? ' · ' + esc(HN.tt([f.measures[0][0], f.measures[0][1]])) : '') + '</div></span></button>'; }).join('') + '</div>';
  }
  function refresh() { U.ringUpdate(HN.q('#cring'), ringHtml()); var a = HN.q('#citems'), b = HN.q('#ctot'); if (a) a.innerHTML = itemsHtml(); if (b) b.innerHTML = totalsHtml(); var c = HN.q('#cacts'); if (c) c.style.display = state().items.length ? '' : 'none'; }
  HN.ins.cq = function (v) { var r = HN.q('#cres'); if (r) r.innerHTML = resHtml(v); };
  HN.ins['ci-q'] = function (v, el) { var it = state().items[+el.getAttribute('data-i')]; if (!it) return; it.q = v === '' ? 0 : +v; saveSt(); var b = HN.q('#ctot'); if (b) b.innerHTML = totalsHtml(); U.ringUpdate(HN.q('#cring'), ringHtml()); var nm = el.parentNode.querySelector('.small'); if (nm) { var f = HN.foods[it.food], g = gOf(it); nm.textContent = HN.num(f.kcal * g / 100) + ' kcal' + (it.u >= 0 ? ' · ' + HN.num(g) + ' g' : ''); } };
  HN.ins['ci-u'] = function (v, el) { var it = state().items[+el.getAttribute('data-i')]; if (!it) return; var f = HN.foods[it.food], g = gOf(it); it.u = +v; var m = it.u >= 0 ? f.measures[it.u][2] : 1; it.q = Math.round(g / m * 100) / 100 || (it.u >= 0 ? 1 : 100); saveSt(); refresh(); };
  A['calc-pick'] = function (id) { addItem(id); var q = HN.q('#cq'); if (q) { q.value = ''; HN.q('#cres').innerHTML = ''; } refresh(); };
  A['ci-del'] = function (i) { state().items.splice(+i, 1); saveSt(); refresh(); };
  A['calc-quick'] = function (id) { addItem(id); refresh(); };
  A['calc-clear'] = function () { HN.confirm(T('Limpar a refeição?', 'Clear the meal?'), T('Limpar', 'Clear')).then(function (ok) { if (ok) setTimeout(function () { state().items = []; saveSt(); refresh(); }, 50); }); };
  A['calc-copy'] = function () {
    var x = totals(), t = x.t, txt = 'HyperNutry — ' + T('Refeição', 'Meal') + '\n' + state().items.map(function (i) { return '• ' + U.amountText(i.food, gOf(i)).replace(/^[\d.,]+ g \(/, '(').replace(/^\((\d+) g\)$/, '$1 g') + ' ' + HN.foodName(HN.foods[i.food]); }).join('\n') + '\n= ' + HN.num(t.kcal) + ' kcal · P ' + HN.num(t.p, 1) + ' g · C ' + HN.num(t.c, 1) + ' g · G ' + HN.num(t.f, 1) + ' g · ' + T('fibras', 'fiber') + ' ' + HN.num(t.fib, 1) + ' g';
    var ok = function () { HN.toast(T('Resumo copiado ✓', 'Summary copied ✓')); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(txt).then(ok, function () { HN.toast(txt.slice(0, 80)); }); else HN.toast(T('Seu navegador não permite copiar.', 'Your browser cannot copy.'));
  };
  A['calc-save'] = function () { HN.sheet(T('Salvar refeição', 'Save meal'), '<label class="f" for="mrn">' + T('Nome', 'Name') + '</label><input id="mrn" type="text" autofocus placeholder="' + T('Ex.: Almoço de segunda', 'E.g. Monday lunch') + '"><button class="btn block mt" data-act="calc-save-ok">💾 ' + T('Salvar', 'Save') + '</button>'); };
  A['calc-save-ok'] = function () { var n = HN.q('#mrn').value.trim(); if (!n) { HN.toast(T('Dê um nome.', 'Give it a name.')); return; } var l = S.get('minhasRef', []); l.push({ id: HN.id(), nome: n, items: JSON.parse(JSON.stringify(state().items)) }); S.set('minhasRef', l); HN.layer.close(); setTimeout(function () { HN.toast(T('Refeição salva ✓', 'Meal saved ✓')); }, 100); };
  A['calc-load'] = function () {
    var l = S.get('minhasRef', []);
    HN.sheet(T('Minhas refeições', 'My meals'), l.length ? '<div class="list">' + l.slice().reverse().map(function (m) { return '<div class="li" style="cursor:default"><span class="grow"><div class="t">' + esc(m.nome) + '</div><div class="s">' + m.items.length + ' ' + T('itens', 'items') + '</div></span><button class="btn sm" data-act="calc-load-go" data-arg="' + m.id + '">' + T('Abrir', 'Open') + '</button><button class="ib" data-act="calc-load-del" data-arg="' + m.id + '" aria-label="' + T('Apagar', 'Delete') + '">🗑</button></div>'; }).join('') + '</div>' : '<p class="muted">' + T('Nenhuma refeição salva ainda.', 'No saved meals yet.') + '</p>');
  };
  A['calc-load-go'] = function (id) { var m = S.get('minhasRef', []).filter(function (x) { return x.id === id; })[0]; if (!m) return; state().items = JSON.parse(JSON.stringify(m.items)).filter(function (i) { return HN.foods[i.food]; }); saveSt(); HN.layer.close(); setTimeout(refresh, 80); };
  A['calc-load-del'] = function (id) { S.set('minhasRef', S.get('minhasRef', []).filter(function (x) { return x.id !== id; })); HN.layer.close(); setTimeout(A['calc-load'], 80); };
  A['calc-diary'] = function () {
    if (!HN.cfg().aceite) { HN.toast(T('O diário faz parte do Meu acompanhamento (pede seu aceite).', 'The diary is part of My follow-up (asks for your consent).')); HN.go('/diario/novo'); return; }
    HN.draft = HN.draft || { meal: 'lanche', hb: null, sa: null, items: [], trig: [], note: '' };
    state().items.forEach(function (i) { HN.draft.items.push({ food: i.food, g: Math.round(gOf(i)) }); }); HN.go('/diario/novo');
  };
  A['calc-add'] = function (id) { addItem(id); HN.toast(T('Adicionado à calculadora ✓', 'Added to calculator ✓')); HN.go('/'); };

  /* ---------- necessidade diária (nada é salvo) ---------- */
  var nd = { sexo: 'F', idade: '', peso: '', altura: '', fator: 1.375, obj: 0, gord: '', gest: false, ta: false, preset: 'equilibrado', done: false };
  HN.ins.nd = function (v, el) { var k = el.getAttribute('data-k'); nd[k] = (k === 'fator' || k === 'obj') ? +v : v; if (k === 'sexo' || k === 'fator' || k === 'obj' || k === 'gest' || k === 'ta' || k === 'preset') { if (nd.done) A['nd-go'](); } };
  HN.chipFn['nd.sexo'] = function (v) { nd.sexo = v; HN.qa('[data-act="chip"][data-arg^="nd.sexo|"]').forEach(function (b) { var on = b.getAttribute('data-arg') === 'nd.sexo|' + v; b.classList.toggle('on', on); b.setAttribute('aria-pressed', on); }); if (nd.done) A['nd-go'](); };
  function ndForm() {
    return '<div class="row wrap"><div style="flex:1 1 100%"><label class="f">' + T('Sexo biológico (usado só na equação)', 'Biological sex (used only in the equation)') + '</label>' + U.chips('nd.sexo', [['F', 'Feminino', 'Female'], ['M', 'Masculino', 'Male']], nd.sexo, false) + '</div>' +
      [['idade', 'Idade (anos)', 'Age (years)'], ['peso', 'Peso (kg)', 'Weight (kg)'], ['altura', 'Altura (cm)', 'Height (cm)']].map(function (x) { return '<div style="flex:1 1 6rem"><label class="f" for="nd-' + x[0] + '">' + HN.tt([x[1], x[2]]) + '</label><input id="nd-' + x[0] + '" type="number" inputmode="decimal" data-in="nd" data-k="' + x[0] + '" value="' + esc(nd[x[0]]) + '"></div>'; }).join('') + '</div>' +
      '<label class="f" for="nd-fator">' + T('Atividade física', 'Physical activity') + '</label><select id="nd-fator" data-in="nd" data-k="fator">' + C.activityFactors.map(function (a) { return '<option value="' + a.v + '"' + (a.v === nd.fator ? ' selected' : '') + '>' + esc(HN.tt([a.pt, a.en])) + '</option>'; }).join('') + '</select>' +
      '<label class="f" for="nd-obj">' + T('Ritmo', 'Pace') + '</label><select id="nd-obj" data-in="nd" data-k="obj"><option value="0"' + (nd.obj === 0 ? ' selected' : '') + '>' + T('Manter', 'Maintain') + '</option><option value="-0.1"' + (nd.obj === -0.1 ? ' selected' : '') + '>' + T('Ajuste leve para menos (−10%)', 'Gentle adjustment down (−10%)') + '</option><option value="0.1"' + (nd.obj === 0.1 ? ' selected' : '') + '>' + T('Ajuste leve para mais (+10%)', 'Gentle adjustment up (+10%)') + '</option></select>' +
      '<label class="f" for="nd-gord">' + T('% de gordura corporal (opcional — usa Katch-McArdle)', 'Body fat % (optional — uses Katch-McArdle)') + '</label><input id="nd-gord" type="number" inputmode="decimal" data-in="nd" data-k="gord" value="' + esc(nd.gord) + '" style="max-width:8rem">' +
      '<label class="chk"><input type="checkbox" data-in="nd" data-k="gest" ' + (nd.gest ? 'checked' : '') + '><span class="tx">' + T('Estou grávida ou amamentando', 'I am pregnant or breastfeeding') + '</span></label>' +
      '<label class="chk"><input type="checkbox" data-in="nd" data-k="ta" ' + (nd.ta ? 'checked' : '') + '><span class="tx">' + T('Já tive ou tenho transtorno alimentar', 'I have or had an eating disorder') + '</span></label>' +
      '<button class="btn block mt" data-act="nd-go">' + T('Calcular', 'Calculate') + '</button><div id="ndres" class="mt"></div>';
  }
  A['nd-go'] = function () {
    nd.done = true; var box = HN.q('#ndres'); if (!box) return;
    var p = { sexo: nd.sexo, idade: +nd.idade, peso: +nd.peso, altura: +nd.altura, fator: nd.fator, gordura: +nd.gord || 0 };
    if (!(p.idade > 0 && p.peso > 0 && p.altura > 0)) { box.innerHTML = U.notice('warn', T('Preencha idade, peso e altura.', 'Fill in age, weight and height.')); return; }
    var al = C.alertas({ idade: p.idade, historicoTA: nd.ta, gestante: nd.gest });
    if (al.length) { ndRef = { semNumeros: true }; refresh(); box.innerHTML = U.notice('warn', '🌱 ' + T('Para o seu caso, números de calorias não são o caminho mais seguro. Procure um(a) nutricionista ou médico(a) para um plano feito para você. Aqui você ainda pode usar a calculadora de refeição, receitas e cardápio sem metas numéricas.', 'For your situation, calorie numbers are not the safest path. Please see a dietitian or doctor for a plan made for you. You can still use the meal calculator, recipes and menu without numeric targets.')); return; }
    var metodo = p.gordura > 0 ? 'katch' : 'mifflin', tmb = C.tmb(p, metodo), get = C.get(p, metodo), fx = C.faixa(get, 0.10, nd.obj), piso = C.piso(p.sexo), low = fx.min < piso;
    var mn = Math.max(fx.min, piso), mx = Math.max(fx.max, piso + 100), ce = Math.max(fx.centro, piso), mc = C.macros(ce, C.presetsMacro[nd.preset]);
    ndRef = { kcal: ce, p: mc.p.g, c: mc.c.g, f: mc.f.g, sua: true }; refresh();
    box.innerHTML = '<div class="card" style="margin:0"><div class="stat" style="grid-template-columns:repeat(2,1fr)"><div><b>' + HN.num(tmb) + '</b><span>' + T('kcal/dia em repouso (TMB)', 'kcal/day at rest (BMR)') + '</span></div><div><b>' + HN.num(get) + '</b><span>' + T('kcal/dia com sua atividade', 'kcal/day with your activity') + '</span></div></div>' +
      '<p style="margin:.7rem 0 .2rem">' + T('Faixa de referência para o seu dia:', 'Reference range for your day:') + '</p><div class="kcal-big" style="font-size:1.9rem">' + HN.num(mn) + '–' + HN.num(mx) + ' <span class="small muted" style="font-weight:600">kcal</span></div>' +
      (low ? U.notice('warn', T('Ajustei a faixa para o piso de segurança (' + piso + ' kcal). Abaixo disso só com acompanhamento profissional.', 'I adjusted the range to the safety floor (' + piso + ' kcal). Below that only with professional follow-up.')) : '') +
      '<label class="f" for="nd-preset">' + T('Divisão dos macronutrientes', 'Macronutrient split') + '</label><select id="nd-preset" data-in="nd" data-k="preset">' + Object.keys(C.presetsMacro).map(function (k) { var m = C.presetsMacro[k]; return '<option value="' + k + '"' + (k === nd.preset ? ' selected' : '') + '>' + HN.tt([m.pt, m.en]) + ' (' + m.c + '/' + m.p + '/' + m.f + ')</option>'; }).join('') + '</select>' +
      '<div class="stat" style="grid-template-columns:repeat(3,1fr)"><div><b>' + mc.p.g + ' g</b><span>' + T('proteína', 'protein') + '</span></div><div><b>' + mc.c.g + ' g</b><span>' + T('carboidratos', 'carbs') + '</span></div><div><b>' + mc.f.g + ' g</b><span>' + T('gorduras', 'fat') + '</span></div></div>' +
      '<p class="small muted mt">' + T('Equação: ', 'Equation: ') + (metodo === 'katch' ? 'Katch-McArdle' : 'Mifflin-St Jeor') + ' × ' + T('fator de atividade', 'activity factor') + '. ' + T('É uma <b>estimativa educativa</b> com margem de ±10%: sentir fome e saciedade vem primeiro. Não substitui nutricionista. <b>Nada disso foi salvo.</b>', 'It is an <b>educational estimate</b> with ±10% margin: feeling hunger and fullness comes first. It does not replace a dietitian. <b>None of this was saved.</b>') + '</p></div>';
  };


  /* ---------- anel do Início (Parte A): referência = a faixa calculada nesta visita, ou 2.000 kcal dos rótulos ---------- */
  var ndRef = null; // só na memória: some ao fechar o app
  function ref() { if (ndRef) return ndRef; var m = C.macros(2000, C.presetsMacro.equilibrado); return { kcal: 2000, p: m.p.g, c: m.c.g, f: m.f.g }; }
  function ringHtml() {
    var r = ref(), t = totals().t;
    if (r.semNumeros) return '<p class="small" style="margin:.4rem 0 0;opacity:.9">🌱 ' + T('Sem metas numéricas para você: use a calculadora para conhecer os alimentos, sem anel de calorias.', 'No numeric targets for you: use the calculator to learn about foods, without a calorie ring.') + '</p>';
    return U.ring({ rings: [
      { l: T('Energia', 'Energy'), v: t.kcal, t: r.kcal, c: 'var(--brand)', u: ' kcal' },
      { l: T('Proteína', 'Protein'), v: t.p, t: r.p, c: 'var(--cyan)', u: ' g' },
      { l: T('Carboidratos', 'Carbs'), v: t.c, t: r.c, c: 'var(--accent)', u: ' g' },
      { l: T('Gorduras', 'Fat'), v: t.f, t: r.f, c: '#ec4899', u: ' g' }
    ], center: { big: HN.num(t.kcal), small: 'kcal' }, size: 124, sw: 9, compact: true }) +
      '<p class="t-caption" style="margin:.5rem 0 0;opacity:.85">' + (r.sua ? T('Referência: a faixa que você calculou (não salva).', 'Reference: the range you calculated (not saved).') : T('Referência: 2.000 kcal dos rótulos.', 'Reference: 2,000 kcal label value.')) + ' ' + T('Violeta = faixa tranquila (90–110%), não é meta.', 'Violet = calm range (90–110%), not a target.') + '</p>';
  }
  function greet() { var h = new Date().getHours(); return h < 12 ? T('Bom dia', 'Good morning') : h < 18 ? T('Boa tarde', 'Good afternoon') : T('Boa noite', 'Good evening'); }

  /* ---------- carrossel de receitas por aparelho ---------- */
  var carEq = null; // aparelhos escolhidos no carrossel (começa com os de "Gostos e cozinha")
  function carSel() { if (!carEq) carEq = gostos().equip.slice(); return carEq; }
  function carHtml() {
    var sel = carSel(), cp = HN.casaPerfil ? HN.casaPerfil(true) : {};
    var list = HN.recipeList.filter(function (r) { return C.receitaCompativel(r, cp) && (!sel.length || r.equip.every(function (e) { return sel.indexOf(e) >= 0; })); });
    list.sort(function (a, b) { var ea = a.equip.some(function (e) { return sel.indexOf(e) >= 0; }) ? 0 : 1, eb = b.equip.some(function (e) { return sel.indexOf(e) >= 0; }) ? 0 : 1; return ea - eb || a.time - b.time; });
    var pills = '<div class="car-pills" role="group" aria-label="' + T('Filtrar por aparelho', 'Filter by appliance') + '"><button class="chip' + (sel.length ? '' : ' on') + '" data-act="car-eq" data-arg="" aria-pressed="' + !sel.length + '">' + T('Todos', 'All') + '</button>' +
      Object.keys(HN.equipment).map(function (k) { var e = HN.equipment[k], on = sel.indexOf(k) >= 0; return '<button class="chip' + (on ? ' on' : '') + '" data-act="car-eq" data-arg="' + k + '" aria-pressed="' + on + '"><span aria-hidden="true">' + e[2] + '</span>' + esc(HN.tt([e[0], e[1]])) + '</button>'; }).join('') + '</div>';
    var cards = list.length ? list.map(function (r) {
      var eq = r.equip.length ? r.equip.map(function (e) { return HN.equipment[e][2]; }).join('') : '🥗';
      var tag = r.equip.length ? r.equip.map(function (e) { return HN.tt([HN.equipment[e][0], HN.equipment[e][1]]); }).join(' + ') + ' · ' + r.time + ' min' : T('Sem aparelho', 'No appliance') + ' · ' + r.time + ' min';
      return '<button class="car-card" data-act="go" data-arg="/receita/' + r.id + '"><span class="car-eq" aria-hidden="true">' + eq + '</span><span class="car-t">' + esc(HN.tt([r.pt, r.en])) + '</span><span class="car-s">' + esc(tag) + '</span></button>';
    }).join('') : '<p class="muted small">' + T('Nenhuma receita só com esses aparelhos. Toque em “Todos”.', 'No recipe with only these appliances. Tap “All”.') + '</p>';
    return pills + '<div class="car-row">' + cards + '</div>';
  }
  A['car-eq'] = function (k) {
    var sel = carSel(); if (!k) carEq = []; else { var i = sel.indexOf(k); if (i >= 0) sel.splice(i, 1); else sel.push(k); }
    var box = HN.q('#carousel'); if (box) box.innerHTML = carHtml();
  };

  /* ================= tela inicial (Parte A) ================= */
  V.home = function () {
    var quick = ['arroz_branco', 'feijao_carioca', 'ovo_mexido', 'pao_frances', 'banana', 'frango_grelhado', 'alface', 'leite_integral'].filter(function (id) { return HN.foods[id]; });
    var g = gostos(), unset = !g.pessoas && !g.restr.length && !g.equip.length && !g.curte.length && !g.evita.length;
    var h = '<div class="card hero home-hero"><div class="small" style="opacity:.85">' + HN.fmtDate(Date.now()) + '</div><h1 style="margin:.1rem 0 .1rem">' + greet() + '!</h1><div class="small" style="opacity:.9">🧮 ' + T('Calculadora de calorias · some o que você vai comer', 'Calorie calculator · add up what you will eat') + '</div><div id="cring" class="mt">' + ringHtml() + '</div></div>' +
      '<div class="card"><label class="f" for="cq">' + T('O que você vai comer?', 'What will you eat?') + '</label><input type="search" id="cq" data-in="cq" placeholder="' + T('Buscar entre ' + HN.foodList.length + ' alimentos (ex.: arroz, frango)', 'Search ' + HN.foodList.length + ' foods (e.g. rice, chicken)') + '" autocomplete="off"><div id="cres" class="mt"></div>' +
      '<div class="chips mt">' + quick.map(function (id) { return '<button class="chip" data-act="calc-quick" data-arg="' + id + '">＋ ' + esc(HN.foodName(HN.foods[id])) + '</button>'; }).join('') + '</div></div>' +
      '<div class="card"><h3>' + T('Minha refeição', 'My meal') + '</h3><div id="citems">' + itemsHtml() + '</div>' +
      '<div id="cacts" class="row wrap mt" style="' + (state().items.length ? '' : 'display:none') + '"><button class="btn sec sm" data-act="calc-copy">📋 ' + T('Copiar', 'Copy') + '</button><button class="btn sec sm" data-act="calc-save">💾 ' + T('Salvar', 'Save') + '</button><button class="btn sec sm" data-act="calc-diary">📝 ' + T('Enviar ao diário', 'Send to diary') + '</button><button class="btn ghost sm" data-act="calc-clear">🗑 ' + T('Limpar', 'Clear') + '</button></div>' +
      '<div class="row wrap mt"><button class="btn ghost sm" data-act="calc-load">📂 ' + T('Minhas refeições', 'My meals') + '</button><button class="btn ghost sm" data-act="food-new">＋ ' + T('Novo alimento', 'New food') + '</button></div></div>' +
      '<div id="ctot">' + totalsHtml() + '</div>' +
      '<div class="card"><div class="row"><h3 class="grow" style="margin:0">🍳 ' + T('O que dá para fazer com sua cozinha', 'What your kitchen can make') + '</h3><button class="btn sm sec" data-act="go" data-arg="/receitas">' + T('Todas', 'All') + '</button></div><div id="carousel" class="mt">' + carHtml() + '</div></div>' +
      '<details class="acc card" style="padding:.2rem 1rem"><summary>⚡ ' + T('Quantas calorias eu preciso por dia?', 'How many calories do I need per day?') + '</summary><div class="mt">' + ndForm() + '</div></details>';
    if (unset) h += '<div class="card tap" role="button" tabindex="0" data-act="go" data-arg="/gostos"><div class="row"><span style="font-size:1.6rem">😋</span><div class="grow"><b>' + T('Monte o cardápio do seu jeito', 'Build the menu your way') + '</b><div class="small muted">' + T('Conte o que você gosta, evita e tem na cozinha (30 segundos).', 'Tell us what you like, avoid and have in your kitchen (30 seconds).') + '</div></div><span aria-hidden="true">›</span></div></div>';
    h += '<div class="grid mb">' + ['planejar', 'receitas', 'compras', 'rotulos', 'saciedade', 'alimentos'].map(function (id) { var n = HN.nav[id]; return '<button class="sc" data-act="go" data-arg="' + n.r + '"><span class="e" aria-hidden="true">' + n.e + '</span>' + HN.tt([n.pt, n.en]) + '</button>'; }).join('') + '</div>' +
      '<div class="card tap" role="button" tabindex="0" data-act="go" data-arg="/acomp" style="border-color:var(--brand)"><div class="row"><span style="font-size:1.6rem">🩺</span><div class="grow"><b>' + T('Quer acompanhar fome, sono, medidas e metas?', 'Want to track hunger, sleep, measures and goals?') + '</b><div class="small muted">' + T('O <b>Meu acompanhamento</b> guarda dados de saúde no seu aparelho e pede seu aceite (LGPD) só quando você entra.', '<b>My follow-up</b> keeps health data on your device and asks for your consent (LGPD) only when you enter.') + '</div></div><span aria-hidden="true">›</span></div></div>' + U.legal();
    return h;
  };

  /* ================= TACO nas telas existentes ================= */
  var oldAlim = V.alimento;
  V.alimento = function (parts) {
    var h = oldAlim(parts), f = HN.foods[parts[1]]; if (!f) return h;
    var card = '';
    if (f.mi) {
      var mr = [['Cálcio', 'Calcium', f.mi.ca, 'mg'], ['Ferro', 'Iron', f.mi.fe, 'mg'], ['Magnésio', 'Magnesium', f.mi.mg, 'mg'], ['Potássio', 'Potassium', f.mi.k, 'mg'], ['Zinco', 'Zinc', f.mi.zn, 'mg'], ['Vitamina C', 'Vitamin C', f.mi.vc, 'mg'], ['Vitamina A (RAE)', 'Vitamin A (RAE)', f.mi.rae, 'mcg'], ['Gordura saturada', 'Saturated fat', f.mi.sat, 'g'], ['Colesterol', 'Cholesterol', f.mi.col, 'mg']];
      card = '<div class="card"><h3>' + T('Micronutrientes (por 100 g)', 'Micronutrients (per 100 g)') + '</h3>' + mr.map(function (r) { return '<div class="kv"><span>' + HN.tt([r[0], r[1]]) + '</span><b>' + (r[2] == null ? '–' : HN.num(r[2], r[2] < 10 ? 1 : 0) + ' ' + r[3]) + '</b></div>'; }).join('') + '<p class="small muted">' + T('“–” = não analisado na TACO. Fonte: TACO/UNICAMP.', '“–” = not analysed in TACO. Source: TACO/UNICAMP.') + (f.allergens.length || f.taco ? ' ' + T('Alérgenos estimados pelo nome: confira a embalagem.', 'Allergens estimated from the name: check the package.') : '') + '</p></div>';
    }
    card += '<div class="row wrap"><button class="btn grow" data-act="calc-add" data-arg="' + f.id + '">🧮 ' + T('Adicionar à calculadora', 'Add to calculator') + '</button></div>';
    return h.replace('<div class="row wrap"><button class="btn grow" data-act="food-diary"', card + '<div class="row wrap mt"><button class="btn sec grow" data-act="food-diary"');
  };
})(window.HN = window.HN || {});

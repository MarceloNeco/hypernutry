/* HyperNutry — Cardápio, Despensa, Compras, Receitas, Cozinhar, Família e Modo Cozinheiro. */
(function (HN) {
  'use strict';
  var S = HN.S, C = HN.calc, U = HN.ui, esc = HN.esc, T = HN.T, V = HN.views, A = HN.acts;
  var MEALS4 = ['cafe', 'almoco', 'lanche', 'jantar'];

  /* ---------- perfil da casa: une restrições de todos que comem junto ---------- */
  HN.casaPerfil = function (relax) {
    var l = HN.perfis(), p = HN.perfil() || {}, un = {};
    l.forEach(function (x) { (x.restricoes || []).forEach(function (r) { un[r] = 1; }); });
    var o = { restricoes: Object.keys(un).filter(function (r) { return r !== 'halal'; }), equipamentos: (l.filter(function (x) { return x.principal; })[0] || p).equipamentos || [], tempoMax: relax ? 0 : (p.tempo || 0), habilidade: relax ? 0 : (p.habilidade || 0) };
    return o;
  };
  HN.pessoas = function () { var p = HN.perfil() || {}; return Math.max(p.moradores || 1, HN.perfis().length || 1); };

  /* ---------- cardápio semanal ---------- */
  function weekSeed() { var d = new Date(), y = d.getFullYear(), s = new Date(y, 0, 1); return y * 100 + Math.floor((d - s) / 6048e5); }
  function build(seed) {
    var dias = C.cardapioSemana(HN.casaPerfil(false), seed), loose = C.cardapioSemana(HN.casaPerfil(true), seed + 7);
    dias.forEach(function (d, i) { MEALS4.forEach(function (m) { if (!d[m]) d[m] = loose[i][m]; }); });
    return { seed: seed, dias: dias, feitoEm: Date.now() };
  }
  HN.getCardapio = function () { var c = S.get('cardapio'); if (!c || !c.dias) { c = build(weekSeed()); S.set('cardapio', c); } return c; };
  function recipeOk(r) { var cp = HN.casaPerfil(true); return C.receitaCompativel(r, cp); }

  var PTABS = [['cardapio', 'Cardápio', 'Menu'], ['despensa', 'Despensa', 'Pantry'], ['compras', 'Compras', 'Shopping']];
  V.planejar = function (parts) {
    var tab = parts[1] || 'cardapio', h = U.title('🗓️', T('Planejar a semana', 'Plan the week'), T('Cardápio, despensa e compras conversam entre si', 'Menu, pantry and shopping talk to each other')) + U.tabs('/planejar', PTABS, tab);
    if (tab === 'cardapio') return h + menuTab();
    if (tab === 'despensa') return h + pantryTab();
    return h + shopTab();
  };
  function menuTab() {
    var c = HN.getCardapio(), p = HN.perfil() || {}, h = '', now = (new Date().getDay() + 6) % 7, nums = HN.numerosOk();
    h += '<div class="row wrap mb"><button class="btn sec sm" data-act="menu-regen">🔀 ' + T('Gerar outra semana', 'Generate another week') + '</button><button class="btn sec sm" data-act="go" data-arg="/cozinheiro">🧑‍🍳 ' + T('Enviar ao cozinheiro', 'Send to cook') + '</button></div>';
    if ((p.equipamentos || []).length === 0) h += U.notice('info', T('Você não marcou eletrodomésticos: mostramos receitas que só usam o básico.', 'You did not tick appliances: we show recipes that need only basics.'));
    h += '<div class="week">' + c.dias.map(function (d, i) {
      var tot = 0; var rows = MEALS4.map(function (m) {
        var r = d[m] && HN.recipes[d[m]]; if (r && nums) tot += C.totais(C.escalar(r, 1)).kcal;
        return '<div class="meal"><span class="m">' + U.mealName(m) + '</span>' + (r ? '<button class="name" data-act="go" data-arg="/receita/' + r.id + '">' + esc(HN.tt([r.pt, r.en])) + ' <span class="muted small">· ' + r.time + ' min</span></button><button class="ib" style="width:2rem;height:2rem;font-size:1rem" data-act="swap" data-arg="' + i + '|' + m + '" aria-label="' + T('Trocar', 'Swap') + '">🔄</button>' : '<span class="muted small grow">' + T('sem receita compatível', 'no compatible recipe') + '</span>') + '</div>';
      }).join('');
      return '<div class="day"' + (i === now ? ' style="border-color:var(--brand);box-shadow:0 0 0 2px var(--brand-soft)"' : '') + '><h4>' + HN.weekday(i) + (i === now ? ' · ' + T('hoje', 'today') : '') + (nums ? ' <span class="muted small">≈ ' + HN.num(tot) + ' kcal/' + T('pessoa', 'person') + '</span>' : '') + '</h4>' + rows + '</div>';
    }).join('') + '</div>' + U.notice('info', T('Sugestões flexíveis: troque qualquer refeição por outra que você prefira. Respeita suas restrições, seus eletrodomésticos e o tempo que você tem.', 'Flexible suggestions: swap any meal for another you prefer. Respects your restrictions, appliances and available time.'));
    return h;
  }
  A['menu-regen'] = function () { var c = S.get('cardapio') || {}; S.set('cardapio', build((c.seed || weekSeed()) + 13)); HN.refresh(); HN.toast(T('Nova semana gerada', 'New week generated')); };
  A.swap = function (arg) {
    var p = arg.split('|'), c = HN.getCardapio(), cp = HN.casaPerfil(true), cur = c.dias[+p[0]][p[1]];
    var cand = HN.recipeList.filter(function (r) { return r.meal.indexOf(p[1]) >= 0 && r.id !== cur && C.receitaCompativel(r, cp); });
    HN.sheet(T('Trocar', 'Swap') + ' · ' + U.mealName(p[1]), cand.length ? '<div class="list">' + cand.map(function (r) { return '<button class="li" data-act="swap-do" data-arg="' + arg + '|' + r.id + '"><span class="e">🍳</span><span class="grow"><div class="t">' + esc(HN.tt([r.pt, r.en])) + '</div><div class="s">' + r.time + ' min</div></span></button>'; }).join('') + '</div>' : '<p class="muted">' + T('Sem outra opção compatível.', 'No other compatible option.') + '</p>');
  };
  A['swap-do'] = function (arg) { var p = arg.split('|'), c = HN.getCardapio(); c.dias[+p[0]][p[1]] = p[2]; S.set('cardapio', c); HN.layer.close(); setTimeout(HN.refresh, 30); };

  /* ---------- despensa ---------- */
  function pantryTab() {
    var d = S.get('despensa', {}), ids = Object.keys(d).filter(function (k) { return HN.foods[k]; }), h = '';
    h += '<div class="card"><h3>' + T('O que tem em casa', 'What you have at home') + '</h3><input type="search" id="pq" data-in="pq" placeholder="' + T('Adicionar alimento…', 'Add a food…') + '" autocomplete="off"><div id="pres" class="mt"></div></div>';
    h += '<div class="card"><h3>' + T('Na despensa', 'In the pantry') + ' (' + ids.length + ')</h3>' + (ids.length ? '<div class="list">' + ids.map(function (k) { var f = HN.foods[k]; return '<div class="li" style="cursor:default"><span class="grow"><div class="t">' + esc(HN.foodName(f)) + '</div><div class="s">' + U.amountText(k, d[k]) + '</div></span><button class="ib" data-act="pan-minus" data-arg="' + k + '" aria-label="−">−</button><button class="ib" data-act="pan-plus" data-arg="' + k + '" aria-label="+">＋</button><button class="ib" data-act="pan-del" data-arg="' + k + '" aria-label="' + T('Remover', 'Remove') + '">✕</button></div>'; }).join('') + '</div>' : '<p class="muted small">' + T('Vazia. Adicione o que você já tem para a lista de compras não repetir.', 'Empty. Add what you have so the shopping list does not repeat it.') + '</p>') + '</div>';
    var can = HN.recipeList.filter(function (r) { return r.ing.every(function (i) { return (d[i[0]] || 0) >= i[1]; }); });
    h += '<div class="card"><h3>👩‍🍳 ' + T('Dá para cozinhar agora', 'You can cook right now') + '</h3>' + (can.length ? '<div class="list">' + can.map(function (r) { return '<button class="li" data-act="go" data-arg="/receita/' + r.id + '"><span class="e">🍳</span><span class="grow"><div class="t">' + esc(HN.tt([r.pt, r.en])) + '</div></span>›</button>'; }).join('') + '</div>' : '<p class="muted small">' + T('Nenhuma receita completa com o estoque atual (1 porção).', 'No full recipe with current stock (1 serving).') + '</p>') + '</div>';
    return h;
  }
  HN.ins.pq = function (v) {
    var q = HN.nrm(v).trim(), box = HN.q('#pres'); if (!box) return; if (!q) { box.innerHTML = ''; return; }
    var hits = HN.foodList.filter(function (f) { return HN.nrm(f.pt + ' ' + f.en).indexOf(q) >= 0; }).slice(0, 6);
    box.innerHTML = hits.map(function (f) { return '<button class="li" data-act="pan-add" data-arg="' + f.id + '"><span class="e">＋</span><span class="grow"><div class="t">' + esc(HN.foodName(f)) + '</div></span></button>'; }).join('') || '<p class="small muted">' + T('Não achei.', 'Not found.') + '</p>';
  };
  function pan(k, fn) { var d = S.get('despensa', {}); fn(d); S.set('despensa', d); HN.refresh(); }
  A['pan-add'] = function (id) { pan(id, function (d) { d[id] = (d[id] || 0) + 500; }); };
  A['pan-plus'] = function (id) { pan(id, function (d) { d[id] += 100; }); };
  A['pan-minus'] = function (id) { pan(id, function (d) { d[id] = Math.max(0, d[id] - 100); if (!d[id]) delete d[id]; }); };
  A['pan-del'] = function (id) { pan(id, function (d) { delete d[id]; }); };

  /* ---------- compras ---------- */
  function shopData() {
    var c = HN.getCardapio(), ids = [], avul = S.get('recAvulsas', []);
    c.dias.forEach(function (d) { MEALS4.forEach(function (m) { if (d[m]) ids.push(d[m]); }); });
    return C.listaCompras(ids.concat(avul), HN.pessoas(), S.get('despensa', {}));
  }
  function shopTab() {
    var sec = shopData(), ok = S.get('comprasOk', {}), extra = S.get('comprasExtra', []), h = '', any = false;
    h += '<div class="card"><div class="row wrap"><h3 class="grow">🛒 ' + T('Para ', 'For ') + HN.pessoas() + ' ' + T('pessoa(s), semana toda', 'person(s), whole week') + '</h3></div><p class="small muted">' + T('Já descontamos o que está na despensa. Agrupado por seção do mercado.', 'Pantry already subtracted. Grouped by store section.') + '</p>';
    ['hortifruti', 'acougue', 'refrigerados', 'padaria', 'mercearia'].forEach(function (s) {
      var items = (sec[s] || []).filter(function (i) { return i.need > 0; }); if (!items.length) return; any = true;
      h += '<h4 style="margin:.9rem 0 .2rem">' + HN.tt(HN.shopSectionName[s]) + '</h4>' + items.map(function (i) { var f = HN.foods[i.food]; return '<label class="chk' + (ok[i.food] ? ' done' : '') + '"><input type="checkbox" data-in="shop-ck" data-k="' + i.food + '" ' + (ok[i.food] ? 'checked' : '') + '><span class="tx grow">' + esc(HN.foodName(f)) + '</span><span class="small muted">' + (i.need >= 1000 ? HN.num(i.need / 1000, 2) + ' kg' : i.need + ' g') + '</span></label>'; }).join('');
    });
    if (!any) h += '<p class="muted">' + T('Nada a comprar: a despensa cobre o cardápio. 🎉', 'Nothing to buy: the pantry covers the menu. 🎉') + '</p>';
    h += '<h4 style="margin:.9rem 0 .2rem">' + T('Outros itens', 'Other items') + '</h4>' + extra.map(function (e, i) { return '<div class="chk"><span class="tx grow">' + esc(e) + '</span><button class="ib" data-act="shop-xdel" data-arg="' + i + '" aria-label="' + T('Remover', 'Remove') + '">✕</button></div>'; }).join('') + '<div class="row mt"><input type="text" id="sx" placeholder="' + T('Ex.: papel higiênico', 'E.g. toilet paper') + '"><button class="btn sm" data-act="shop-xadd">＋</button></div></div>';
    h += '<div class="row wrap"><button class="btn sec" data-act="shop-share">📤 ' + T('Compartilhar lista', 'Share list') + '</button><button class="btn sec" data-act="shop-done">✅ ' + T('Comprei os marcados → despensa', 'Bought the ticked → pantry') + '</button></div>';
    return h;
  }
  HN.ins['shop-ck'] = function (v, el) { var ok = S.get('comprasOk', {}), k = el.getAttribute('data-k'); if (v) ok[k] = 1; else delete ok[k]; S.set('comprasOk', ok); el.closest('.chk').classList.toggle('done', v); };
  A['shop-xadd'] = function () { var i = HN.q('#sx'), v = i && i.value.trim(); if (!v) return; var l = S.get('comprasExtra', []); l.push(v.slice(0, 80)); S.set('comprasExtra', l); HN.refresh(); };
  A['shop-xdel'] = function (i) { var l = S.get('comprasExtra', []); l.splice(+i, 1); S.set('comprasExtra', l); HN.refresh(); };
  function shopText() {
    var sec = shopData(), out = 'HyperNutry — ' + T('Lista de compras', 'Shopping list') + ' (' + HN.fmtDate(Date.now()) + ')\n';
    ['hortifruti', 'acougue', 'refrigerados', 'padaria', 'mercearia'].forEach(function (s) { var items = (sec[s] || []).filter(function (i) { return i.need > 0; }); if (!items.length) return; out += '\n' + HN.tt(HN.shopSectionName[s]).toUpperCase() + '\n'; items.forEach(function (i) { out += '☐ ' + HN.foodName(HN.foods[i.food]) + ' — ' + (i.need >= 1000 ? HN.num(i.need / 1000, 2) + ' kg' : i.need + ' g') + '\n'; }); });
    var ex = S.get('comprasExtra', []); if (ex.length) { out += '\n' + T('OUTROS', 'OTHER') + '\n'; ex.forEach(function (e) { out += '☐ ' + e + '\n'; }); }
    return out;
  }
  A['shop-share'] = function () {
    var t = shopText();
    if (navigator.share) navigator.share({ title: 'HyperNutry', text: t }).catch(function () { /* cancelado */ });
    else if (navigator.clipboard) navigator.clipboard.writeText(t).then(function () { HN.toast(T('Lista copiada ✓', 'List copied ✓')); }, function () { U.fileDownload('lista-de-compras.txt', t); });
    else U.fileDownload('lista-de-compras.txt', t);
  };
  A['shop-done'] = function () {
    var ok = S.get('comprasOk', {}), sec = shopData(), d = S.get('despensa', {}), n = 0;
    Object.keys(sec).forEach(function (s) { sec[s].forEach(function (i) { if (ok[i.food] && i.need > 0) { d[i.food] = (d[i.food] || 0) + i.need; n++; } }); });
    S.set('despensa', d); S.del('comprasOk'); HN.refresh(); HN.toast(n + ' ' + T('itens foram para a despensa ✓', 'items moved to the pantry ✓'));
  };

  /* ---------- receitas ---------- */
  var RF = HN.rf = { meal: '', tempo: 0, equip: true, todas: false, q: '' };
  function recipeList() {
    var p = HN.perfil() || {}, cp = HN.casaPerfil(true), q = HN.nrm(RF.q).trim();
    return HN.recipeList.filter(function (r) {
      if (RF.meal && r.meal.indexOf(RF.meal) < 0) return false;
      if (RF.tempo && r.time > RF.tempo) return false;
      if (q && HN.nrm(r.pt + ' ' + r.en).indexOf(q) < 0) return false;
      if (!RF.todas) { var lim = { restricoes: cp.restricoes, equipamentos: RF.equip ? cp.equipamentos : null }; if (!C.receitaCompativel(r, lim)) return false; }
      return true;
    });
  }
  function recipeCards() {
    var l = recipeList(), p = HN.perfil() || {};
    if (!l.length) return '<div class="card center"><p>' + T('Nenhuma receita com esses filtros.', 'No recipes with these filters.') + '</p><button class="btn sec sm" data-act="rf-reset">' + T('Limpar filtros', 'Clear filters') + '</button></div>';
    return l.map(function (r) {
      var have = (p.equipamentos || []), miss = r.equip.filter(function (e) { return have.indexOf(e) < 0; });
      return '<div class="card tap" role="button" tabindex="0" data-act="go" data-arg="/receita/' + r.id + '"><div class="row"><div class="grow"><h3>' + esc(HN.tt([r.pt, r.en])) + '</h3><div class="small muted">⏱ ' + r.time + ' min · ' + [T('fácil', 'easy'), T('médio', 'medium'), T('avançado', 'advanced')][r.skill - 1] + ' · ' + ['R$', 'R$$', 'R$$$'][r.cost - 1] + '</div><div class="chips mt">' + (r.equip.length ? r.equip.map(function (e) { return '<span class="badge' + (miss.indexOf(e) >= 0 ? ' bad' : '') + '">' + HN.equipment[e][2] + ' ' + HN.tt(HN.equipment[e]) + '</span>'; }).join('') : '<span class="badge ok">' + T('sem equipamento', 'no equipment') + '</span>') + (r.vegan ? '<span class="badge ok">🌱 vegano</span>' : r.vegetarian ? '<span class="badge ok">🥗 ' + T('vegetariano', 'vegetarian') + '</span>' : '') + (r.allergens.indexOf('gluten') < 0 ? '<span class="badge">' + T('sem glúten', 'gluten-free') + '</span>' : '') + (r.allergens.indexOf('leite') < 0 ? '<span class="badge">' + T('sem lactose', 'dairy-free') + '</span>' : '') + '</div></div><span class="muted">›</span></div></div>';
    }).join('');
  }
  V.receitas = function () {
    var h = U.title('🍳', T('Receitas', 'Recipes'), HN.recipeList.length + ' ' + T('receitas · funcionam sem internet', 'recipes · work offline')) +
      '<input type="search" id="rq" data-in="rq" value="' + esc(RF.q) + '" placeholder="' + T('Buscar receita…', 'Search recipe…') + '" autocomplete="off">' +
      '<div class="chips mt"><button class="chip' + (!RF.meal ? ' on' : '') + '" data-act="rf-meal" data-arg="">' + T('Todas', 'All') + '</button>' + U.MEALS.slice(0, 4).map(function (m) { return '<button class="chip' + (RF.meal === m[0] ? ' on' : '') + '" data-act="rf-meal" data-arg="' + m[0] + '">' + m[3] + ' ' + HN.tt([m[1], m[2]]) + '</button>'; }).join('') + '</div>' +
      '<div class="chips mt mb">' + [[0, T('Qualquer tempo', 'Any time')], [15, '≤ 15 min'], [30, '≤ 30 min'], [45, '≤ 45 min']].map(function (t) { return '<button class="chip' + (RF.tempo === t[0] ? ' on' : '') + '" data-act="rf-tempo" data-arg="' + t[0] + '">' + t[1] + '</button>'; }).join('') + '<button class="chip' + (RF.equip ? ' on' : '') + '" data-act="rf-equip">🔌 ' + T('Só o que eu tenho', 'Only what I have') + '</button><button class="chip' + (RF.todas ? ' on' : '') + '" data-act="rf-todas">' + T('Ignorar minhas restrições', 'Ignore my restrictions') + '</button></div>' +
      '<div class="row wrap mb"><button class="btn sec sm" data-act="conv">⚖️ ' + T('Conversor de medidas', 'Measure converter') + '</button></div><div id="rcards">' + recipeCards() + '</div>';
    return h;
  };
  function rrefresh() { var b = HN.q('#rcards'); if (b) b.innerHTML = recipeCards(); }
  HN.ins.rq = function (v) { RF.q = v; rrefresh(); };
  A['rf-meal'] = function (m) { RF.meal = m; HN.refresh(); }; A['rf-tempo'] = function (t) { RF.tempo = +t; HN.refresh(); };
  A['rf-equip'] = function () { RF.equip = !RF.equip; HN.refresh(); }; A['rf-todas'] = function () { RF.todas = !RF.todas; HN.refresh(); };
  A['rf-reset'] = function () { RF.meal = ''; RF.tempo = 0; RF.q = ''; RF.equip = false; RF.todas = true; HN.refresh(); };

  var serv = {};
  V.receita = function (parts) {
    var r = HN.recipes[parts[1]]; if (!r) return '<div class="notice bad">' + T('Receita não encontrada.', 'Recipe not found.') + '</div>';
    var n = serv[r.id] || HN.pessoas(), cf = []; (HN.perfil() ? (HN.perfil().restricoes || []) : []).forEach(function (x) { if (r.allergens.indexOf(x) >= 0) cf.push(x); });
    var items = C.escalar(r, n), tot = C.totais(C.escalar(r, 1));
    var h = '<button class="btn ghost sm mb" data-act="go" data-arg="/receitas">← ' + T('Receitas', 'Recipes') + '</button>' + U.title('🍳', esc(HN.tt([r.pt, r.en])), '⏱ ' + r.time + ' min · ' + [T('fácil', 'easy'), T('médio', 'medium'), T('avançado', 'advanced')][r.skill - 1]);
    if (cf.length) h += U.notice('bad', '⚠️ ' + T('Contém algo da sua lista de restrições: ', 'Contains something from your restriction list: ') + '<b>' + cf.map(HN.alergName).join(', ') + '</b>');
    h += '<div class="card"><div class="chips">' + (r.equip.length ? r.equip.map(function (e) { return '<span class="badge">' + HN.equipment[e][2] + ' ' + HN.tt(HN.equipment[e]) + '</span>'; }).join('') : '<span class="badge ok">' + T('sem equipamento', 'no equipment') + '</span>') + r.allergens.map(function (a) { return '<span class="badge warn">' + HN.alergName(a) + '</span>'; }).join('') + '</div>' +
      '<div class="row mt"><b class="grow">' + T('Porções', 'Servings') + '</b><button class="chip' + (n === 2 ? ' on' : '') + '" data-act="serv-set" data-arg="2">2</button><button class="chip' + (n === 4 ? ' on' : '') + '" data-act="serv-set" data-arg="4">4</button><button class="ib" data-act="serv" data-arg="-1" aria-label="−">−</button><b style="min-width:1.5rem;text-align:center">' + n + '</b><button class="ib" data-act="serv" data-arg="1" aria-label="+">＋</button></div></div>';
    h += '<div class="card"><h3>' + T('Ingredientes', 'Ingredients') + '</h3>' + items.map(function (it) { return '<div class="kv"><span>' + esc(HN.foodName(HN.foods[it.food])) + '</span><b class="small">' + U.amountText(it.food, it.g) + '</b></div>'; }).join('') + '<div class="kv"><span class="muted">+</span><span class="small">' + esc(HN.tt(r.extra)) + '</span></div></div>';
    if (HN.numerosOk()) h += '<div class="card"><h3>' + T('Por porção', 'Per serving') + '</h3><div class="stat"><div><b>' + HN.num(tot.kcal) + '</b><span>kcal</span></div><div><b>' + HN.num(tot.p) + ' g</b><span>' + T('proteína', 'protein') + '</span></div><div><b>' + HN.num(tot.fib, 1) + ' g</b><span>' + T('fibra', 'fiber') + '</span></div></div></div>';
    h += '<div class="card"><h3>' + T('Modo de preparo', 'Method') + '</h3>' + r.steps.map(function (s, i) { return '<p><span class="step-n">' + (i + 1) + '</span>' + esc(HN.tt(s)) + '</p>'; }).join('') + '</div>';
    h += '<div class="row wrap"><button class="btn grow acc" data-act="cook" data-arg="' + r.id + '">👩‍🍳 ' + T('Cozinhar passo a passo', 'Cook step by step') + '</button></div><div class="row wrap mt"><button class="btn sec grow" data-act="rec-diary" data-arg="' + r.id + '">📝 ' + T('Comi esta receita', 'I ate this') + '</button><button class="btn sec grow" data-act="rec-shop" data-arg="' + r.id + '">🛒 ' + T('Pôr na lista', 'Add to list') + '</button></div>';
    return h;
  };
  A['serv-set'] = function (n) { serv[HN.route().parts[1]] = +n; HN.refresh(); };
  A.serv = function (d) { var id = HN.route().parts[1], n = Math.max(1, Math.min(20, (serv[id] || HN.pessoas()) + (+d))); serv[id] = n; HN.refresh(); };
  A['rec-diary'] = function (id) { var r = HN.recipes[id]; HN.draft = { meal: r.meal[0], hb: null, sa: null, items: r.ing.map(function (i) { return { food: i[0], g: i[1] }; }), trig: [], note: HN.tt([r.pt, r.en]) }; HN.go('/diario/novo'); };
  A['rec-shop'] = function (id) { var l = S.get('recAvulsas', []); l.push(id); S.set('recAvulsas', l); HN.toast(T('Ingredientes na lista de compras ✓', 'Ingredients on the shopping list ✓')); };

  /* ---------- conversor de medidas ---------- */
  A.conv = function () {
    HN.sheet(T('Conversor de medidas', 'Measure converter'), '<label class="f" for="cv-f">' + T('Alimento', 'Food') + '</label><select id="cv-f" data-in="cv">' + HN.foodList.filter(function (f) { return f.measures.length; }).map(function (f) { return '<option value="' + f.id + '">' + esc(HN.foodName(f)) + '</option>'; }).join('') + '</select><div class="row"><div class="grow"><label class="f" for="cv-q">' + T('Quantidade', 'Amount') + '</label><input id="cv-q" type="number" inputmode="decimal" value="100" min="0" data-in="cv"></div><div class="grow"><label class="f" for="cv-u">' + T('Unidade', 'Unit') + '</label><select id="cv-u" data-in="cv"></select></div></div><div id="cv-out" class="mt"></div>', function (el) { cvUnits(el); cvOut(); });
  };
  function cvUnits(el) { var f = HN.foods[HN.q('#cv-f', el).value], u = HN.q('#cv-u', el); u.innerHTML = '<option value="g">g</option>' + f.measures.map(function (m, i) { return '<option value="' + i + '">' + esc(HN.tt([m[0], m[1]])) + '</option>'; }).join(''); }
  function cvOut() {
    var f = HN.foods[HN.q('#cv-f').value], q = +HN.q('#cv-q').value || 0, u = HN.q('#cv-u').value, g = u === 'g' ? q : q * f.measures[+u][2];
    HN.q('#cv-out').innerHTML = '<div class="kv"><b>g</b><b>' + HN.num(g, 0) + '</b></div>' + f.measures.map(function (m) { return '<div class="kv"><span>' + esc(HN.tt([m[0], m[1]])) + '</span><span>' + HN.num(g / m[2], 2) + '</span></div>'; }).join('') + (HN.numerosOk() ? '<div class="kv"><span>kcal</span><span>' + HN.num(f.kcal * g / 100) + '</span></div>' : '');
  }
  HN.ins.cv = function (v, el) { if (el.id === 'cv-f') cvUnits(HN.layer.top()); cvOut(); };

  /* ---------- cozinhar passo a passo ---------- */
  var cookT = null, wake = null;
  A.cook = function (id) {
    var r = HN.recipes[id], k = 0, left = 0, running = false, n = serv[id] || HN.pessoas();
    var el = HN.layer.open({ type: 'full', label: HN.tt([r.pt, r.en]), onClose: function () { clearInterval(cookT); if (wake) { try { wake.release(); } catch (e) { /* ignora */ } wake = null; } },
      html: '<div class="fh"><button class="ib" data-act="layer-close" aria-label="' + T('Fechar', 'Close') + '">✕</button><b class="grow">' + esc(HN.tt([r.pt, r.en])) + '</b><button class="ib" data-act="layer-close-home" aria-label="' + T('Início', 'Home') + '">🏠</button></div><div style="padding:1rem;max-width:640px;margin:0 auto" id="ck"></div>' });
    if (navigator.wakeLock) { navigator.wakeLock.request('screen').then(function (w) { wake = w; }, function () { /* sem wake lock */ }); }
    function draw() {
      var st = r.steps[k], mins = st[2], body = HN.q('#ck', el); running = false; clearInterval(cookT); left = mins ? Math.round(mins * 60) : 0;
      var eqs = k === 0 ? r.equip.map(function (e) { return HN.equipment[e][2] + ' ' + HN.tt(HN.equipment[e]); }).join(' · ') : '';
      body.innerHTML = '<div class="bar mb"><i style="width:' + ((k + 1) / r.steps.length * 100) + '%"></i></div><p class="muted center">' + T('Passo', 'Step') + ' ' + (k + 1) + '/' + r.steps.length + '</p>' + (k === 0 ? '<div class="notice info">' + (eqs ? '<b>' + T('Você vai usar:', 'You will use:') + '</b> ' + eqs + '<br>' : '') + '<b>' + T('Ingredientes', 'Ingredients') + ' (' + n + '):</b> ' + C.escalar(r, n).map(function (i) { return HN.foodName(HN.foods[i.food]) + ' ' + i.g + ' g'; }).join(', ') + '</div>' : '') + '<p class="step-big">' + esc(HN.tt(st)) + '</p>' + (mins ? '<div class="timer" id="ckt">' + fmt(left) + '</div><button class="btn sec block" data-act="ck-timer" id="ckb">⏱ ' + T('Iniciar cronômetro', 'Start timer') + '</button>' : '') +
        '<div class="row mt2">' + (k > 0 ? '<button class="btn ghost" data-act="ck-prev">←</button>' : '') + '<button class="btn grow" data-act="ck-next">' + (k < r.steps.length - 1 ? T('Próximo passo', 'Next step') + ' →' : T('Terminei! 🎉', 'Done! 🎉')) + '</button></div>';
    }
    function fmt(s) { return ('0' + Math.floor(s / 60)).slice(-2) + ':' + ('0' + (s % 60)).slice(-2); }
    function beep() { try { var ac = new (window.AudioContext || window.webkitAudioContext)(), o = ac.createOscillator(), g = ac.createGain(); o.connect(g); g.connect(ac.destination); o.frequency.value = 880; g.gain.value = .2; o.start(); setTimeout(function () { o.stop(); ac.close(); }, 600); } catch (e) { /* sem som */ } try { navigator.vibrate && navigator.vibrate([200, 100, 200]); } catch (e) { /* ignora */ } }
    el.addEventListener('click', function (e) {
      var b = e.target.closest('[data-act]'); if (!b) return; var a = b.getAttribute('data-act');
      if (a === 'ck-next') { if (k < r.steps.length - 1) { k++; draw(); } else { HN.layer.close(); HN.toast(T('Bom apetite! 🍽️', 'Enjoy your meal! 🍽️')); } }
      if (a === 'ck-prev') { k--; draw(); }
      if (a === 'ck-timer') { if (running) { clearInterval(cookT); running = false; b.textContent = '⏱ ' + T('Continuar', 'Resume'); return; } running = true; b.textContent = '⏸ ' + T('Pausar', 'Pause'); cookT = setInterval(function () { left--; var t = HN.q('#ckt', el); if (t) t.textContent = fmt(Math.max(left, 0)); if (left <= 0) { clearInterval(cookT); running = false; beep(); HN.toast(T('⏰ Tempo!', '⏰ Time!'), 4000); } }, 1000); }
      if (a === 'layer-close-home') { HN.go('/'); }
    });
    draw();
  };
  ['ck-next', 'ck-prev', 'ck-timer', 'layer-close-home'].forEach(function (a) { if (!A[a]) A[a] = function () { /* tratado no painel */ }; });

  /* ---------- família ---------- */
  V.familia = function () {
    var l = HN.perfis(), act = (HN.perfil() || {}).id, h = U.title('👨‍👩‍👧', T('Família e perfis', 'Family & profiles'), T('Quem come na sua casa', 'Who eats at your home')) +
      '<div class="card"><div class="list">' + l.map(function (p) { var age = HN.idade(p); return '<div class="li" style="cursor:default"><span class="e">' + (p.principal ? '🙂' : age != null && age < 12 ? '🧒' : '👤') + '</span><span class="grow"><div class="t">' + esc(p.nome) + (p.id === act ? ' <span class="badge ok">' + T('ativo', 'active') + '</span>' : '') + '</div><div class="s">' + (age != null ? age + ' ' + T('anos', 'yrs') : '') + ((p.restricoes || []).length ? ' · ' + p.restricoes.map(function (r) { return HN.alergName(r); }).join(', ') : '') + '</div></span>' + (p.id !== act ? '<button class="btn sm sec" data-act="fam-act" data-arg="' + p.id + '">' + T('Usar', 'Use') + '</button>' : '') + '<button class="ib" data-act="fam-edit" data-arg="' + p.id + '" aria-label="' + T('Editar', 'Edit') + '">✏️</button></div>'; }).join('') + '</div></div>' +
      '<button class="btn block" data-act="fam-edit" data-arg="">＋ ' + T('Adicionar pessoa', 'Add person') + '</button>' +
      U.notice('info', T('O cardápio e as receitas respeitam as restrições de <b>todos</b> que comem juntos. Dependentes menores de 18 anos nunca veem calorias ou metas.', 'Menus and recipes respect the restrictions of <b>everyone</b> eating together. Dependants under 18 never see calories or goals.')) + '<p class="small muted">' + T('Dados de crianças: tratados só neste aparelho; peça a um responsável para gerenciar (LGPD, art. 14).', 'Children\'s data: handled on this device only; a guardian should manage it (LGPD art. 14).') + '</p>';
    return h;
  };
  A['fam-act'] = function (id) { S.set('perfilAtivo', id); HN.refresh(); HN.toast(T('Perfil ativo trocado', 'Active profile switched')); };
  var famDraft = null;
  A['fam-edit'] = function (id) {
    famDraft = id ? JSON.parse(JSON.stringify(HN.perfis().filter(function (p) { return p.id === id; })[0])) : { id: HN.id(), nome: '', nasc: '', sexo: 'F', restricoes: [], modo: 'intuitivo', moradores: 1 };
    HN.sheet(id ? T('Editar pessoa', 'Edit person') : T('Nova pessoa', 'New person'), famForm(), null);
  };
  function famForm() {
    var d = famDraft; return '<label class="f" for="fn">' + T('Nome', 'Name') + '</label><input id="fn" type="text" data-in="fam" data-k="nome" value="' + esc(d.nome) + '"><label class="f" for="fd">' + T('Nascimento', 'Date of birth') + '</label><input id="fd" type="date" data-in="fam" data-k="nasc" value="' + esc(d.nasc || '') + '" max="' + HN.today() + '"><label class="f">' + T('Alergias e preferências', 'Allergies and preferences') + '</label>' + U.chips('fam.r', U.RESTR, d.restricoes, true) + '<div class="row mt"><button class="btn grow" data-act="fam-save">' + T('Salvar', 'Save') + '</button>' + (!d.principal && HN.perfis().some(function (p) { return p.id === d.id; }) ? '<button class="btn bad" data-act="fam-del">🗑</button>' : '') + '</div>';
  }
  HN.ins.fam = function (v, el) { famDraft[el.getAttribute('data-k')] = v; };
  HN.chipFn['fam.r'] = function (v) { var a = famDraft.restricoes, i = a.indexOf(v); if (i >= 0) a.splice(i, 1); else a.push(v); var top = HN.layer.top(); var f = HN.q('#fn', top).value; famDraft.nome = f; top.querySelector('.sheet').innerHTML = '<div class="grab"></div><div class="row"><h2 class="grow">' + T('Pessoa', 'Person') + '</h2><button class="ib" data-act="layer-close">✕</button></div>' + famForm(); };
  A['fam-save'] = function () {
    if (!famDraft.nome.trim()) { HN.toast(T('Dê um nome.', 'Enter a name.')); return; } if (!famDraft.nasc) { HN.toast(T('Informe o nascimento.', 'Enter the date of birth.')); return; }
    famDraft.equipamentos = famDraft.equipamentos || (HN.perfil() || {}).equipamentos || []; HN.savePerfil(famDraft); S.del('cardapio'); HN.layer.close(); setTimeout(HN.refresh, 40);
  };
  A['fam-del'] = function () { var id = famDraft.id; HN.layer.close(); S.set('perfis', HN.perfis().filter(function (p) { return p.id !== id; })); S.del('cardapio'); setTimeout(HN.refresh, 40); };


  /* ---------- visão da cozinha (blueprint "Kitchen Execution View") ----------
   * Para quem cozinha (funcionária, família): só receitas, porções e aparelhos.
   * Nada de peso, calorias, metas ou saúde — nem do perfil, nem do diário. */
  var KV = { dia: null, custom: false };
  // ajuste do aparelho tirado do próprio preparo: temperatura (°C) e minutos com cronômetro
  HN.applianceSet = function (r) {
    var temp = null, min = 0;
    r.steps.forEach(function (st) { var m = /(\d{2,3})\s*°C/.exec(st[0]); if (m && !temp) temp = +m[1]; if (st[2] && st[2] <= 60) min += st[2]; });
    return r.equip.map(function (e) { var q = HN.equipment[e]; return { e: q[2], nome: HN.tt([q[0], q[1]]), txt: [temp && (e === 'airfryer' || e === 'oven') ? temp + ' °C' : '', min ? min + ' min' : ''].filter(Boolean).join(' · ') }; });
  };
  function kitchenCards() {
    var c = HN.getCardapio(), di = KV.dia, n = CK.pessoas, out = '';
    MEALS4.forEach(function (m) {
      if (CK.meals.indexOf(m) < 0) return; var r = c.dias[di][m] && HN.recipes[c.dias[di][m]]; if (!r) return;
      var eq = HN.applianceSet(r);
      out += '<article class="kc"><div class="kc-h"><span class="kc-m">' + U.mealEmoji(m) + ' ' + U.mealName(m) + '</span><span class="kc-t num">⏱ ' + r.time + ' min</span></div><h3>' + esc(HN.tt([r.pt, r.en])) + '</h3>' +
        (eq.length ? '<div class="kc-eq">' + eq.map(function (x) { return '<span class="kc-ap"><span aria-hidden="true">' + x.e + '</span> ' + esc(x.nome) + (x.txt ? ' <b class="num">' + x.txt + '</b>' : '') + '</span>'; }).join('') + '</div>' : '<div class="kc-eq"><span class="kc-ap">🥗 ' + T('Sem aparelho', 'No appliance') + '</span></div>') +
        '<ul class="kc-ing">' + C.escalar(r, n).map(function (it) { return '<li><span>' + esc(HN.foodName(HN.foods[it.food])) + '</span><b class="num">' + esc(U.amountText(it.food, it.g)) + '</b></li>'; }).join('') + '<li class="muted"><span>+ ' + esc(HN.tt(r.extra)) + '</span></li></ul>' +
        '<details class="kc-steps"><summary>' + T('Modo de preparo', 'Method') + ' (' + r.steps.length + ')</summary><ol>' + r.steps.map(function (st) { return '<li>' + esc(HN.tt(st)) + '</li>'; }).join('') + '</ol></details>' +
        '<button class="btn block" data-act="kv-cook" data-arg="' + r.id + '">👩‍🍳 ' + T('Cozinhar passo a passo', 'Cook step by step') + '</button></article>';
    });
    return out || '<p class="muted">' + T('Nenhuma refeição marcada para este dia. Escolha as refeições na folha abaixo.', 'No meal selected for this day. Pick meals in the sheet below.') + '</p>';
  }
  function kitchenView() {
    if (KV.dia == null) KV.dia = (new Date().getDay() + 6) % 7;
    var n = CK.pessoas, preset = [2, 4, 6];
    return '<section class="card kitchen"><div class="kv-head"><div><div class="t-caption muted">' + T('Visão da cozinha', 'Kitchen view') + '</div><h2 style="margin:0">' + T('Plano da família', 'Family plan') + '</h2></div><span class="badge ok">🛡️ ' + T('sem dados de saúde', 'no health data') + '</span></div>' +
      '<div class="chips mt" role="group" aria-label="' + T('Dia', 'Day') + '">' + [0, 1, 2, 3, 4, 5, 6].map(function (i) { return '<button class="chip' + (KV.dia === i ? ' on' : '') + '" data-act="kv-day" data-arg="' + i + '" aria-pressed="' + (KV.dia === i) + '">' + HN.weekday(i).slice(0, 3) + '</button>'; }).join('') + '</div>' +
      '<div class="kv-por"><b>' + T('Porções', 'Servings') + '</b><div class="seg kv-seg" role="group">' + preset.map(function (p) { var on = !KV.custom && n === p; return '<button class="' + (on ? 'on' : '') + '" data-act="kv-por" data-arg="' + p + '" aria-pressed="' + on + '">' + p + '</button>'; }).join('') + '<button class="' + (KV.custom || preset.indexOf(n) < 0 ? 'on' : '') + '" data-act="kv-custom">' + T('Outro', 'Custom') + '</button></div></div>' +
      (KV.custom || preset.indexOf(n) < 0 ? '<div class="row kv-step"><button class="ib" data-act="ck-pp2" data-arg="-1" aria-label="' + T('Menos uma porção', 'One serving less') + '">−</button><b class="num" style="font-size:1.3rem;min-width:2rem;text-align:center">' + n + '</b><button class="ib" data-act="ck-pp2" data-arg="1" aria-label="' + T('Mais uma porção', 'One more serving') + '">＋</button><span class="small muted">' + T('pessoas', 'people') + '</span></div>' : '') +
      '<div id="kvcards" class="kv-cards">' + kitchenCards() + '</div></section>';
  }
  function kvRefresh() { var k = HN.q('.kitchen'); if (!k) { HN.refresh(); return; } var tmp = document.createElement('div'); tmp.innerHTML = kitchenView(); k.parentNode.replaceChild(tmp.firstChild, k); }
  A['kv-day'] = function (i) { KV.dia = +i; kvRefresh(); };
  A['kv-por'] = function (n) { KV.custom = false; CK.pessoas = +n; kvRefresh(); };
  A['kv-custom'] = function () { KV.custom = true; kvRefresh(); };
  A['ck-pp2'] = function (d) { CK.pessoas = Math.max(1, Math.min(20, CK.pessoas + (+d))); kvRefresh(); };
  A['kv-cook'] = function (id) { serv[id] = CK.pessoas; A.cook(id); };

  /* ---------- modo cozinheiro ---------- */
  var CK = { dias: [0, 1, 2, 3, 4], meals: ['almoco', 'jantar'], pessoas: 0, alerg: true, lista: true };
  V.cozinheiro = function () {
    if (!CK.pessoas) CK.pessoas = HN.pessoas();
    var h = U.title('🧑‍🍳', T('Modo cozinheiro', 'Cook mode'), T('Passe a semana sem expor seus dados', 'Hand over the week without exposing your data')) +
      kitchenView() + '<h2 class="mt2">🖨️ ' + T('Folha para imprimir ou mandar', 'Sheet to print or send') + '</h2>' +
      U.notice('info', T('Gera uma folha com <b>apenas</b> receitas, porções, preparo, conservação e higiene. <b>Nada de peso, calorias, metas ou saúde.</b>', 'Creates a sheet with <b>only</b> recipes, portions, method, storage and hygiene. <b>No weight, calories, goals or health data.</b>')) +
      '<div class="card"><label class="f">' + T('Dias', 'Days') + '</label><div class="chips">' + [0, 1, 2, 3, 4, 5, 6].map(function (i) { return '<button class="chip' + (CK.dias.indexOf(i) >= 0 ? ' on' : '') + '" data-act="ck-day" data-arg="' + i + '">' + HN.weekday(i).slice(0, 3) + '</button>'; }).join('') + '</div><label class="f">' + T('Refeições', 'Meals') + '</label><div class="chips">' + MEALS4.map(function (m) { return '<button class="chip' + (CK.meals.indexOf(m) >= 0 ? ' on' : '') + '" data-act="ck-meal" data-arg="' + m + '">' + U.mealEmoji(m) + ' ' + U.mealName(m) + '</button>'; }).join('') + '</div>' +
      '<div class="row mt"><b class="grow">' + T('Pessoas à mesa', 'People at the table') + '</b><button class="ib" data-act="ck-pp" data-arg="-1" aria-label="−">−</button><b style="min-width:1.5rem;text-align:center">' + CK.pessoas + '</b><button class="ib" data-act="ck-pp" data-arg="1" aria-label="+">＋</button></div>' +
      '<label class="chk"><input type="checkbox" data-in="ck-opt" data-k="alerg" ' + (CK.alerg ? 'checked' : '') + '><span class="tx">' + T('Incluir aviso do que <b>não</b> usar (alergias/restrições, sem citar saúde)', 'Include a list of what <b>not</b> to use (allergies/restrictions, no health mention)') + '</span></label><label class="chk"><input type="checkbox" data-in="ck-opt" data-k="lista" ' + (CK.lista ? 'checked' : '') + '><span class="tx">' + T('Incluir lista de compras da semana', 'Include the week\'s shopping list') + '</span></label></div>' +
      '<div class="row wrap"><button class="btn grow" data-act="ck-print">🖨️ ' + T('Imprimir / PDF', 'Print / PDF') + '</button><button class="btn sec grow" data-act="ck-dl">⬇️ ' + T('Baixar arquivo', 'Download file') + '</button><button class="btn sec grow" data-act="ck-share">📤 ' + T('Compartilhar', 'Share') + '</button></div>' +
      '<p class="small muted mt">' + T('Para PDF: toque em Imprimir e escolha “Salvar como PDF”. Link na web exige servidor (versão futura); por ora, envie o arquivo pelo WhatsApp ou e-mail.', 'For PDF: tap Print and choose “Save as PDF”. A web link needs a server (future version); for now send the file by WhatsApp or e-mail.') + '</p>';
    h += '<button class="fab fab-share" data-act="ck-share" aria-label="' + T('Compartilhar a folha da cozinha (sem dados de saúde)', 'Share the kitchen sheet (no health data)') + '">📤</button>';
    return h;
  }
  A['ck-day'] = function (i) { i = +i; var a = CK.dias, x = a.indexOf(i); if (x >= 0) a.splice(x, 1); else a.push(i); HN.refresh(); };
  A['ck-meal'] = function (m) { var a = CK.meals, x = a.indexOf(m); if (x >= 0) a.splice(x, 1); else a.push(m); HN.refresh(); };
  A['ck-pp'] = function (d) { CK.pessoas = Math.max(1, Math.min(20, CK.pessoas + (+d))); HN.refresh(); };
  HN.ins['ck-opt'] = function (v, el) { CK[el.getAttribute('data-k')] = v; };
  var CONS = [['Lave bem as mãos e os alimentos antes de começar; use tábuas separadas para cru e cozido.', 'Wash hands and food well before starting; use separate boards for raw and cooked.'], ['Cozinhe carnes, aves, peixes e ovos até ficarem bem cozidos por dentro.', 'Cook meat, poultry, fish and eggs until well done inside.'], ['Esfrie e guarde as sobras na geladeira em até 2 horas, em potes fechados. Consuma em até 3 dias.', 'Cool and refrigerate leftovers within 2 hours, in closed containers. Eat within 3 days.'], ['Para congelar: porções individuais, etiqueta com a data, até 3 meses. Descongele na geladeira.', 'To freeze: single portions, date label, up to 3 months. Thaw in the fridge.'], ['Reaqueça até ficar bem quente e fervendo (acima de 70 °C). Não recongele o que já foi descongelado.', 'Reheat until piping hot and boiling (above 70 °C). Do not refreeze what has been thawed.']];
  function sheetHtml() {
    var c = HN.getCardapio(), lang = HN.lang, used = {}, days = '', al = '';
    CK.dias.slice().sort().forEach(function (i) { var rows = ''; MEALS4.forEach(function (m) { if (CK.meals.indexOf(m) < 0) return; var r = c.dias[i][m] && HN.recipes[c.dias[i][m]]; if (r) { used[r.id] = 1; rows += '<li><b>' + U.mealName(m) + ':</b> ' + esc(HN.tt([r.pt, r.en])) + ' (' + r.time + ' min)</li>'; } }); days += '<h3>' + HN.weekday(i) + '</h3><ul>' + rows + '</ul>'; });
    var recs = Object.keys(used).map(function (id) { var r = HN.recipes[id]; return '<section><h2>' + esc(HN.tt([r.pt, r.en])) + '</h2><p><small>⏱ ' + r.time + ' min · ' + (r.equip.length ? HN.applianceSet(r).map(function (x) { return x.nome + (x.txt ? ' (' + x.txt + ')' : ''); }).join(', ') : T('sem equipamento', 'no equipment')) + ' · ' + CK.pessoas + ' ' + T('porções', 'servings') + '</small></p><h4>' + T('Ingredientes', 'Ingredients') + '</h4><ul>' + C.escalar(r, CK.pessoas).map(function (it) { return '<li>' + esc(HN.foodName(HN.foods[it.food])) + ' — ' + esc(U.amountText(it.food, it.g)) + '</li>'; }).join('') + '<li>' + esc(HN.tt(r.extra)) + '</li></ul><h4>' + T('Preparo', 'Method') + '</h4><ol>' + r.steps.map(function (s) { return '<li>' + esc(HN.tt(s)) + '</li>'; }).join('') + '</ol></section>'; }).join('');
    if (CK.alerg) { var rs = {}; HN.perfis().forEach(function (p) { (p.restricoes || []).forEach(function (x) { rs[x] = 1; }); }); var ks = Object.keys(rs).filter(function (x) { return x !== 'halal'; }); if (ks.length) al = '<div class="warn"><b>⚠️ ' + T('Atenção — NÃO usar:', 'Attention — do NOT use:') + '</b> ' + ks.map(function (k) { return k === 'vegano' ? T('produtos de origem animal', 'animal products') : k === 'vegetariano' ? T('carnes e peixes', 'meat and fish') : HN.alergName(k); }).join(', ') + '. ' + T('Confira os rótulos dos industrializados.', 'Check labels of packaged foods.') + '</div>'; }
    var shop = ''; if (CK.lista) { var txt = shopText().split('\n').slice(1).join('<br>'); shop = '<section><h2>' + T('Lista de compras', 'Shopping list') + '</h2><p>' + esc(txt).replace(/&lt;br&gt;/g, '<br>') + '</p></section>'; }
    return '<!doctype html><html lang="' + (lang === 'pt' ? 'pt-BR' : 'en') + '"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>' + T('Cardápio e receitas da semana', 'Weekly menu and recipes') + '</title><style>body{font:16px/1.5 system-ui,sans-serif;max-width:720px;margin:0 auto;padding:16px;color:#0f172a}h1{color:#047857}h2{border-bottom:2px solid #d1fae5;padding-bottom:4px;margin-top:28px}.warn{background:#fff1d6;border-radius:10px;padding:10px 12px;margin:12px 0}section{break-inside:avoid-page}button{padding:10px 16px;border:0;border-radius:10px;background:#047857;color:#fff;font-weight:700}@media print{button{display:none}}small{color:#52665b}</style></head><body><h1>🍽️ ' + T('Cardápio e receitas da semana', 'Weekly menu and recipes') + '</h1><p><small>' + T('Gerado em ', 'Created on ') + HN.fmtDate(Date.now()) + ' · HyperNutry</small></p><button onclick="window.print()">🖨️ ' + T('Imprimir / PDF', 'Print / PDF') + '</button>' + al + days + recs + '<section><h2>' + T('Conservação e higiene', 'Storage and hygiene') + '</h2><ul>' + CONS.map(function (x) { return '<li>' + esc(HN.tt(x)) + '</li>'; }).join('') + '</ul></section>' + shop + '</body></html>';
  }
  A['ck-print'] = function () { var w = window.open('', '_blank'); if (!w) { HN.toast(T('O navegador bloqueou a janela. Use “Baixar arquivo”.', 'The browser blocked the window. Use “Download file”.')); return; } w.document.write(sheetHtml()); w.document.close(); setTimeout(function () { try { w.print(); } catch (e) { /* ignora */ } }, 400); };
  A['ck-dl'] = function () { U.fileDownload('cardapio-da-semana.html', sheetHtml(), 'text/html;charset=utf-8'); };
  A['ck-share'] = function () {
    var html = sheetHtml();
    try { var f = new File([html], 'cardapio-da-semana.html', { type: 'text/html' }); if (navigator.canShare && navigator.canShare({ files: [f] })) { navigator.share({ files: [f], title: 'HyperNutry' }).catch(function () { /* cancelado */ }); return; } } catch (e) { /* sem File */ }
    if (navigator.share) navigator.share({ title: 'HyperNutry', text: shopText() }).catch(function () { /* cancelado */ }); else A['ck-dl']();
  };
  HN.cookSheetHtml = sheetHtml; HN.cookState = CK;
})(window.HN = window.HN || {});

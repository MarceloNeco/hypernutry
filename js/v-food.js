/* HyperNutry — Alimentos (TACO), Saciedade Raiz e Metas flexíveis. */
(function (HN) {
  'use strict';
  var S = HN.S, C = HN.calc, U = HN.ui, esc = HN.esc, T = HN.T, V = HN.views, A = HN.acts;
  var AL = { gluten: ['Glúten', 'Gluten'], leite: ['Leite', 'Milk'], ovo: ['Ovo', 'Egg'], castanhas: ['Castanhas', 'Tree nuts'], amendoim: ['Amendoim', 'Peanut'], soja: ['Soja', 'Soy'], peixe: ['Peixe', 'Fish'], crustaceo: ['Crustáceos', 'Shellfish'] };
  HN.alergName = function (a) { var k = a.replace('*', ''); return (AL[k] ? HN.tt(AL[k]) : k) + (a.indexOf('*') >= 0 ? '*' : ''); };
  function myRestr() { return HN.restrAll ? HN.restrAll() : ((HN.perfil() || {}).restricoes || []); }
  function conflicts(f) {
    var r = myRestr(), out = [];
    f.allergens.forEach(function (a) { if (r.indexOf(a) >= 0) out.push(a); });
    if (r.indexOf('vegano') >= 0 && !f.vegan) out.push('vegano'); if (r.indexOf('vegetariano') >= 0 && !f.vegetarian) out.push('vegetariano');
    return out;
  }
  HN.conflicts = conflicts;
  var sUi = HN.foodUi = { q: '', g: '' };

  /* ---------- Alimentos ---------- */
  function foodRows() {
    var q = HN.nrm(sUi.q).trim(), list = HN.foodList.filter(function (f) { return (!sUi.g || f.group === sUi.g) && (!q || HN.nrm(f.pt + ' ' + f.en).indexOf(q) >= 0); });
    list.sort(function (a, b) { if (!q && !sUi.g && !!a.taco !== !!b.taco) return a.taco ? 1 : -1; return HN.foodName(a) < HN.foodName(b) ? -1 : 1; });
    if (!list.length) return '<p class="muted">' + T('Nada encontrado. Tente outra palavra ou leia um rótulo para cadastrar o produto.', 'Nothing found. Try another word or read a label to add the product.') + '</p>';
    return '<div class="list">' + list.slice(0, 60).map(function (f) {
      var cf = conflicts(f);
      return '<button class="li" data-act="go" data-arg="/alimento/' + f.id + '"><span class="e">' + (f.custom ? '🏷️' : f.nova === 4 ? '📦' : '🥕') + '</span><span class="grow"><div class="t">' + esc(HN.foodName(f)) + (cf.length ? ' <span class="badge bad">⚠ ' + cf.map(HN.alergName).join(', ') + '</span>' : '') + '</div><div class="s">' + HN.tt(HN.foodGroups[f.group] || ['Produto', 'Product']) + ' · ' + f.kcal + ' kcal · ' + U.stars(f.satiety).replace(/<[^>]+>/g, '') + '</div></span>›</button>';
    }).join('') + '</div>' + (list.length > 60 ? '<p class="small muted center">' + T('Mostrando 60 de ', 'Showing 60 of ') + list.length + '. ' + T('Refine a busca.', 'Refine the search.') + '</p>' : '');
  }
  V.alimentos = function () {
    var h = U.title('🔎', T('Alimentos', 'Foods'), HN.foodBase.name + ' · ' + HN.foodList.length + ' ' + T('itens', 'items')) +
      '<input type="search" id="faq" data-in="faq" value="' + esc(sUi.q) + '" placeholder="' + T('Buscar alimento…', 'Search food…') + '" autocomplete="off">' +
      '<div class="chips mt mb" id="fgrp">' + groupChips() + '</div><div id="frows">' + foodRows() + '</div>' +
      U.notice('info', T('Base: <b>TACO/UNICAMP</b> completa (591 itens) + referências com medidas caseiras. Valores por 100 g; o preparo e a marca mudam os números. Alérgenos dos itens TACO são estimados pelo nome: confira a embalagem.', 'Base: full <b>TACO/UNICAMP</b> (591 items) + references with household measures. Per 100 g; cooking and brand change numbers. Allergens of TACO items are estimated from the name: check the package.'));
    return h;
  };
  function groupChips() { var ks = Object.keys(HN.foodGroups); return '<button class="chip' + (!sUi.g ? ' on' : '') + '" data-act="fgrp" data-arg="">' + T('Todos', 'All') + '</button>' + ks.map(function (g) { return '<button class="chip' + (sUi.g === g ? ' on' : '') + '" data-act="fgrp" data-arg="' + g + '">' + HN.tt(HN.foodGroups[g]) + '</button>'; }).join(''); }
  HN.ins.faq = function (v) { sUi.q = v; var b = HN.q('#frows'); if (b) b.innerHTML = foodRows(); };
  A.fgrp = function (g) { sUi.g = g; var b = HN.q('#frows'); if (b) b.innerHTML = foodRows(); var c = HN.q('#fgrp'); if (c) c.innerHTML = groupChips(); };

  var subSt = { key: 'kcal', g: 100 };
  V.alimento = function (parts) {
    var f = HN.foods[parts[1]]; if (!f) return '<div class="notice bad">' + T('Alimento não encontrado.', 'Food not found.') + '</div>';
    var cf = conflicts(f), nums = HN.numerosOk() || true;
    var h = '<button class="btn ghost sm mb" data-act="back-list">← ' + T('Alimentos', 'Foods') + '</button>' + U.title(f.nova === 4 ? '📦' : '🥕', esc(HN.foodName(f)), HN.tt(HN.foodGroups[f.group] || ['Produto', 'Product']) + ' · ' + f.src);
    if (cf.length) h += U.notice('bad', '⚠️ ' + T('Conflita com o seu perfil: ', 'Conflicts with your profile: ') + '<b>' + cf.map(HN.alergName).join(', ') + '</b>. ' + T('Confira o rótulo antes de consumir.', 'Check the label before eating.'));
    h += '<div class="card"><h3>' + T('Por 100 g', 'Per 100 g') + '</h3>' + (HN.numerosOk() || HN.perfil() && HN.perfil().modo === 'hibrido' ? '' : U.notice('info', T('No modo intuitivo os números são apenas informação. Não precisa contar nada.', 'In intuitive mode numbers are just information. No need to count anything.'))) +
      '<div class="stat" style="grid-template-columns:repeat(3,1fr)"><div><b>' + HN.num(f.kcal) + '</b><span>kcal</span></div><div><b>' + HN.num(f.p, 1) + ' g</b><span>' + T('proteína', 'protein') + '</span></div><div><b>' + HN.num(f.c, 1) + ' g</b><span>' + T('carboidratos', 'carbs') + '</span></div></div><div class="stat mt" style="grid-template-columns:repeat(3,1fr)"><div><b>' + HN.num(f.f, 1) + ' g</b><span>' + T('gorduras', 'fat') + '</span></div><div><b>' + HN.num(f.fib, 1) + ' g</b><span>' + T('fibras', 'fiber') + '</span></div><div><b>' + HN.num(f.na) + ' mg</b><span>' + T('sódio', 'sodium') + '</span></div></div></div>';
    h += '<div class="card"><h3>' + T('Saciedade', 'Fullness') + ' ' + U.stars(f.satiety) + '</h3><p class="small muted">' + T('Índice HyperNutry (0–5): mais proteína e fibra, menos densidade de energia e menos processamento = mais saciedade por caloria. É uma estimativa educativa.', 'HyperNutry index (0–5): more protein and fiber, lower energy density and less processing = more fullness per calorie. An educational estimate.') + '</p>' +
      '<div class="chips">' + (f.allergens.length ? f.allergens.map(function (a) { return '<span class="badge warn">' + HN.alergName(a) + '</span>'; }).join('') : '<span class="badge ok">' + T('sem alérgenos comuns', 'no common allergens') + '</span>') + '<span class="badge">NOVA ' + f.nova + '</span></div></div>';
    if (f.measures.length) {
      h += '<div class="card"><h3>' + T('Em medidas caseiras', 'In household measures') + '</h3>' + f.measures.map(function (m) { return '<div class="kv"><span>1 ' + esc(HN.tt([m[0], m[1]])) + ' (' + m[2] + ' g)</span><b>' + (HN.numerosOk() ? HN.num(f.kcal * m[2] / 100) + ' kcal' : HN.num(f.p * m[2] / 100, 1) + ' g ' + T('prot.', 'prot.')) + '</b></div>'; }).join('') + '</div>';
    }
    // substituição
    var key = subSt.key, g0 = subSt.g;
    h += '<div class="card"><h3>🔄 ' + T('Substituir por outro alimento', 'Swap for another food') + '</h3><p class="small muted">' + T('Calcula quanto do substituto equivale ao original no nutriente escolhido.', 'Calculates how much of the substitute matches the original for the chosen nutrient.') + '</p>' +
      '<div class="row"><div class="grow"><label class="f" for="sg">' + T('Quantidade (g)', 'Amount (g)') + '</label><input id="sg" type="number" inputmode="decimal" min="1" value="' + g0 + '" data-in="sub-g"></div><div class="grow"><label class="f" for="sk">' + T('Igualar em', 'Match on') + '</label><select id="sk" data-in="sub-k"><option value="kcal"' + (key === 'kcal' ? ' selected' : '') + '>' + T('Energia', 'Energy') + '</option><option value="p"' + (key === 'p' ? ' selected' : '') + '>' + T('Proteína', 'Protein') + '</option><option value="c"' + (key === 'c' ? ' selected' : '') + '>' + T('Carboidrato', 'Carbs') + '</option><option value="f"' + (key === 'f' ? ' selected' : '') + '>' + T('Gordura', 'Fat') + '</option></select></div></div><div id="subout" class="mt">' + subHtml(f) + '</div></div>';
    h += '<div class="row wrap"><button class="btn grow" data-act="food-diary" data-arg="' + f.id + '">📝 ' + T('Adicionar ao diário', 'Add to diary') + '</button></div>';
    return h;
  };
  function subHtml(f) {
    var p = HN.perfil() || {}, fil = { vegano: (p.restricoes || []).indexOf('vegano') >= 0, semGluten: (p.restricoes || []).indexOf('gluten') >= 0, semLactose: (p.restricoes || []).indexOf('leite') >= 0, semCastanhas: (p.restricoes || []).indexOf('castanhas') >= 0 };
    var subs = C.sugerirSubstitutos(f.id, subSt.key, fil);
    if (!subs.length) return '<p class="small muted">' + T('Sem substitutos do mesmo grupo para esse nutriente.', 'No same-group substitutes for this nutrient.') + '</p>';
    return subs.map(function (s) { var m = C.substituir(f.id, subSt.g, s.id, subSt.key); return '<div class="kv"><span>' + esc(HN.foodName(s)) + '</span><b>' + m + ' g</b></div>'; }).join('') + '<p class="small muted mt">m₂ = m₁ × (nutriente do original ÷ nutriente do substituto)</p>';
  }
  HN.ins['sub-g'] = function (v) { subSt.g = Math.max(1, +v || 100); var f = HN.foods[HN.route().parts[1]], o = HN.q('#subout'); if (o && f) o.innerHTML = subHtml(f); };
  HN.ins['sub-k'] = function (v) { subSt.key = v; var f = HN.foods[HN.route().parts[1]], o = HN.q('#subout'); if (o && f) o.innerHTML = subHtml(f); };
  A['back-list'] = function () { HN.go('/alimentos'); };
  A['food-diary'] = function (id) { HN.draft = HN.draft || { meal: 'lanche', hb: null, sa: null, items: [], trig: [], note: '' }; var f = HN.foods[id]; HN.draft.items.push({ food: id, g: f.measures[0] ? f.measures[0][2] : 100 }); HN.go('/diario/novo'); };

  /* ---------- Saciedade Raiz ---------- */
  var PL = { prot: 'frango_grelhado', veg: 'brocolis', carb: 'arroz_integral', leg: 'feijao_carioca', gord: 'azeite' };
  var PLG = { prot: 100, veg: 150, carb: 100, leg: 90, gord: 8 };
  V.saciedade = function () {
    var cands = HN.foodList.filter(function (f) { return f.kcal > 0 && f.group !== 'ultra' || f.custom; }).sort(function (a, b) { return b.satiety - a.satiety; }).slice(0, 12);
    var h = U.title('🥣', T('Saciedade Raiz', 'Real Fullness'), T('Comer bem sem passar fome', 'Eating well without going hungry')) +
      '<div class="card hero"><p style="font-size:1.1rem;margin:0"><b>' + T('Não precisa passar fome para comer bem.', 'You don\'t have to go hungry to eat well.') + '</b></p><p class="small" style="margin:.4rem 0 0;opacity:.92">' + T('Saciedade vem de comida de verdade: proteína, fibra, volume e tempo de mastigação — e do seu corpo avisando "já deu".', 'Fullness comes from real food: protein, fiber, volume and chewing time — and your body saying "that\'s enough".') + '</p></div>';
    h += '<div class="card"><h3>' + T('Os 4 pilares', 'The 4 pillars') + '</h3><div class="kv"><span>🥩 ' + T('Proteína em toda refeição', 'Protein at every meal') + '</span><span class="muted small">' + T('ovos, frango, peixe, feijão, tofu, iogurte', 'eggs, chicken, fish, beans, tofu, yogurt') + '</span></div><div class="kv"><span>🥦 ' + T('Fibra e vegetais', 'Fiber and vegetables') + '</span><span class="muted small">' + T('metade do prato', 'half the plate') + '</span></div><div class="kv"><span>💧 ' + T('Volume e água', 'Volume and water') + '</span><span class="muted small">' + T('sopas, saladas, frutas inteiras', 'soups, salads, whole fruit') + '</span></div><div class="kv"><span>🐢 ' + T('Ritmo', 'Pace') + '</span><span class="muted small">' + T('20 min, pausas, mastigar', '20 min, pauses, chewing') + '</span></div></div>';
    h += '<div class="card"><h3>🍽️ ' + T('Monte um prato que sustenta', 'Build a plate that lasts') + '</h3><div id="plate">' + plateHtml() + '</div></div>';
    h += '<div class="card"><h3>🏆 ' + T('Alimentos que mais sustentam (por caloria)', 'Foods that fill you most (per calorie)') + '</h3><div class="list">' + cands.map(function (f) { return '<button class="li" data-act="go" data-arg="/alimento/' + f.id + '"><span class="e">🥕</span><span class="grow"><div class="t">' + esc(HN.foodName(f)) + '</div><div class="s">' + U.stars(f.satiety).replace(/<[^>]+>/g, '') + ' ' + HN.num(f.satiety, 1) + '</div></span>›</button>'; }).join('') + '</div></div>';
    h += U.notice('warn', T('Este índice é <b>educativo</b>: não promete perda de peso nem substitui acompanhamento. Se você sente fome intensa o tempo todo, converse com um profissional de saúde.', 'This index is <b>educational</b>: it does not promise weight loss nor replace follow-up. If you feel intense hunger all the time, talk to a health professional.'));
    return h;
  };
  function opts(group, sel, filterFn) { return HN.foodList.filter(filterFn).map(function (f) { return '<option value="' + f.id + '"' + (f.id === sel ? ' selected' : '') + '>' + esc(HN.foodName(f)) + '</option>'; }).join(''); }
  function plateHtml() {
    var rows = [['prot', T('Proteína', 'Protein'), function (f) { return f.group === 'carne' || f.group === 'peixe' || f.group === 'ovo' || f.id === 'tofu'; }], ['veg', T('Vegetais', 'Vegetables'), function (f) { return f.group === 'hortalica'; }], ['carb', T('Carboidrato', 'Carb'), function (f) { return f.group === 'cereal' && f.nova < 3 || f.group === 'tuberculo'; }], ['leg', T('Leguminosa', 'Legume'), function (f) { return f.group === 'leguminosa' && f.id !== 'tofu'; }], ['gord', T('Gordura boa', 'Healthy fat'), function (f) { return f.id === 'azeite' || f.id === 'abacate' || f.group === 'oleaginosa'; }]];
    var h = rows.map(function (r) { return '<label class="f" for="pl-' + r[0] + '">' + r[1] + ' <span class="muted small">(' + PLG[r[0]] + ' g)</span></label><select id="pl-' + r[0] + '" data-in="plate" data-k="' + r[0] + '">' + opts(r[0], PL[r[0]], r[2]) + '</select>'; }).join('');
    var tg = 0, ts = 0, tk = 0, tf = 0, tp = 0; Object.keys(PL).forEach(function (k) { var f = HN.foods[PL[k]], g = PLG[k]; tg += g; ts += f.satiety * g; tk += f.kcal * g / 100; tf += f.fib * g / 100; tp += f.p * g / 100; });
    var sc = ts / tg, verdict = sc >= 3.4 ? ['ok', T('Prato que sustenta 👏', 'A plate that lasts 👏')] : sc >= 2.6 ? ['info', T('Bom! Mais vegetais ou proteína deixam ainda mais saciante.', 'Good! More vegetables or protein would make it even more filling.')] : ['warn', T('Digere rápido. Combine com proteína e fibra.', 'Digests fast. Pair with protein and fiber.')];
    return h + '<div class="mt notice ' + verdict[0] + '"><b>' + verdict[1] + '</b><br>' + T('Índice do prato', 'Plate index') + ': <b>' + HN.num(sc, 1) + '/5</b> · ' + T('proteína', 'protein') + ' ' + HN.num(tp) + ' g · ' + T('fibra', 'fiber') + ' ' + HN.num(tf, 1) + ' g · ' + tg + ' g' + (HN.numerosOk() ? ' · ' + HN.num(tk) + ' kcal' : '') + '</div>';
  }
  HN.ins.plate = function (v, el) { PL[el.getAttribute('data-k')] = v; var b = HN.q('#plate'); if (b) { var y = window.scrollY; b.innerHTML = plateHtml(); window.scrollTo(0, y); } };

  /* ---------- Metas flexíveis ---------- */
  V.metas = function () {
    var p = HN.perfil(), h = U.title('🎯', T('Metas flexíveis', 'Flexible goals'), T('Faixas em vez de números rígidos', 'Ranges instead of rigid numbers'));
    var al = HN.alertas(p);
    if (!HN.numerosOk(p)) {
      var why = al.indexOf('menor') >= 0 ? T('Por segurança, o app não mostra metas numéricas para menores de 18 anos.', 'For safety, the app does not show numeric goals for under-18s.') : al.indexOf('ta') >= 0 ? T('Você nos contou sobre histórico de transtorno alimentar. Por cuidado, números e metas ficam ocultos.', 'You told us about an eating-disorder history. For care, numbers and goals stay hidden.') : al.indexOf('gestante') >= 0 ? T('Gestação e amamentação pedem acompanhamento próprio; metas numéricas ficam ocultas.', 'Pregnancy and breastfeeding need dedicated follow-up; numeric goals stay hidden.') : T('Você está no Modo Intuitivo Integral, sem metas numéricas.', 'You are in Full Intuitive mode, with no numeric goals.');
      return h + '<div class="card"><p style="font-size:1.05rem"><b>' + why + '</b></p><p class="muted small">' + T('Aqui o foco está nos sinais do corpo. Veja “Fome e emoções” e “Saciedade Raiz”.', 'Here the focus is on body signals. See “Hunger & mood” and “Real Fullness”.') + '</p><div class="row wrap"><button class="btn" data-act="go" data-arg="/intuitivo">🧘 ' + T('Fome e emoções', 'Hunger & mood') + '</button>' + (al.length === 0 ? '<button class="btn ghost" data-act="go" data-arg="/config">' + T('Mudar para Híbrido', 'Switch to Hybrid') + '</button>' : '') + '</div></div>' + U.legal();
    }
    var pc = HN.perfilCalc(p);
    if (!(pc.peso && pc.altura)) return h + U.notice('warn', T('Faltam altura e peso no perfil.', 'Height and weight are missing from your profile.')) + '<button class="btn" data-act="go" data-arg="/wizard/1">' + T('Completar perfil', 'Complete profile') + '</button>';
    h += U.legal() + '<div class="card"><label class="f" for="mm">' + T('Equação', 'Equation') + '</label><select id="mm" data-in="metas-m"><option value="mifflin">Mifflin-St Jeor</option><option value="harris">Harris-Benedict (rev.)</option><option value="katch"' + (pc.gordura ? '' : ' disabled') + '>Katch-McArdle ' + (pc.gordura ? '' : '(' + T('precisa de % gordura', 'needs body-fat %') + ')') + '</option></select>' +
      '<label class="f" for="md">' + T('Margem de tolerância', 'Tolerance margin') + ': <b id="mdv"></b></label><input id="md" type="range" min="5" max="20" step="1" data-in="metas-d"><label class="f" for="ma">' + T('Ajuste leve (opcional)', 'Gentle adjustment (optional)') + ': <b id="mav"></b></label><input id="ma" type="range" min="-10" max="10" step="1" data-in="metas-a">' +
      '<p class="small muted">' + T('O ajuste vai de −10% a +10% e é só referência educativa. Para metas de perda ou ganho de peso, procure um nutricionista.', 'The adjustment goes from −10% to +10% and is an educational reference only. For weight loss or gain goals, see a dietitian.') + '</p></div><div id="mout"></div>';
    return h;
  };
  function metasOut() {
    var p = HN.perfil(), pc = HN.perfilCalc(p), m = HN.metasCfg(), r = '', f = C.faixa(C.get(pc, m.metodo), m.delta, m.ajuste), piso = C.piso(pc.sexo), tmbs = ['mifflin', 'harris', 'katch'].map(function (k) { var v = k === 'katch' && !pc.gordura ? null : C.tmb(pc, k); return [k, v]; });
    var low = f.min < piso; if (low) { f.min = Math.max(f.min, piso); f.centro = Math.max(f.centro, piso); if (f.max < f.min) f.max = f.min + 100; }
    r += '<div class="card"><h3>' + T('Gasto energético estimado', 'Estimated energy expenditure') + '</h3><div class="stat"><div><b>' + HN.num(C.tmb(pc, m.metodo)) + '</b><span>TMB kcal</span></div><div><b>' + HN.num(C.get(pc, m.metodo)) + '</b><span>GET kcal</span></div><div><b>×' + HN.num(pc.fator, 3).replace(/0+$/, '') + '</b><span>' + T('atividade', 'activity') + '</span></div></div><div class="small muted mt">' + tmbs.map(function (t) { return t[0] + ': ' + (t[1] == null ? '–' : t[1]); }).join(' · ') + '</div></div>';
    var maxv = f.max * 1.2;
    r += '<div class="card"><h3>' + T('Sua faixa diária', 'Your daily range') + '</h3><p style="font-size:1.4rem;margin:.2rem 0"><b>' + f.min + ' – ' + f.max + '</b> kcal</p><div class="range"><div class="zone" style="left:' + (f.min / maxv * 100) + '%;width:' + ((f.max - f.min) / maxv * 100) + '%"></div></div><p class="small muted mt">' + T('Centro', 'Center') + ' ' + f.centro + ' kcal · ±' + Math.round(f.delta * 100) + '%. ' + T('Oscilar dentro da faixa é normal e não dispara alerta.', 'Swinging inside the range is normal and triggers no alert.') + '</p>' + (low ? U.notice('warn', T('A faixa foi elevada ao piso de segurança do app (' + piso + ' kcal). Valores abaixo disso só com acompanhamento profissional.', 'The range was raised to the app\'s safety floor (' + piso + ' kcal). Lower values only with professional follow-up.')) : '') + '</div>';
    var preset = C.presetsMacro[m.macro] || C.presetsMacro.equilibrado, mac = C.macros(f.centro, preset);
    r += '<div class="card"><h3>' + T('Distribuição de macronutrientes', 'Macronutrient split') + '</h3>' + U.chips('macro', Object.keys(C.presetsMacro).map(function (k) { return [k, C.presetsMacro[k].pt, C.presetsMacro[k].en]; }), m.macro, false) + '<div class="stat mt"><div><b>' + mac.c.g + ' g</b><span>' + T('carboidratos', 'carbs') + ' ' + mac.c.pct + '%</span></div><div><b>' + mac.p.g + ' g</b><span>' + T('proteínas', 'protein') + ' ' + mac.p.pct + '%</span></div><div><b>' + mac.f.g + ' g</b><span>' + T('gorduras', 'fat') + ' ' + mac.f.pct + '%</span></div></div><p class="small muted mt">' + T('Proteína equivale a', 'Protein equals') + ' ' + HN.num(mac.p.g / pc.peso, 1) + ' g/kg. ' + T('Referência geral, não prescrição.', 'General reference, not a prescription.') + '</p></div>';
    r += '<details class="acc"><summary>' + T('Como é calculado', 'How it is calculated') + '</summary><div class="small"><p>Mifflin-St Jeor: TMB = 10·peso + 6,25·altura − 5·idade + 5 (M) / −161 (F).</p><p>Harris-Benedict (rev.): M 88,362 + 13,397·p + 4,799·a − 5,677·i · F 447,593 + 9,247·p + 3,098·a − 4,330·i.</p><p>Katch-McArdle: TMB = 370 + 21,6·massa magra.</p><p>GET = TMB × fator de atividade. Faixa = GET × (1 ± margem).</p></div></details>';
    return r;
  }
  V.metas.__out = metasOut;
  HN.after.metas = function () { if (!HN.numerosOk()) return; var m = HN.metasCfg(); HN.q('#mm').value = m.metodo; HN.q('#md').value = Math.round(m.delta * 100); HN.q('#ma').value = Math.round(m.ajuste * 100); HN.q('#mdv').textContent = '±' + Math.round(m.delta * 100) + '%'; HN.q('#mav').textContent = (m.ajuste > 0 ? '+' : '') + Math.round(m.ajuste * 100) + '%'; HN.q('#mout').innerHTML = metasOut(); };
  function setM(k, v) { var m = HN.metasCfg(); m[k] = v; S.set('metasCfg', m); HN.q('#mdv').textContent = '±' + Math.round(m.delta * 100) + '%'; HN.q('#mav').textContent = (m.ajuste > 0 ? '+' : '') + Math.round(m.ajuste * 100) + '%'; HN.q('#mout').innerHTML = metasOut(); }
  HN.ins['metas-m'] = function (v) { setM('metodo', v); }; HN.ins['metas-d'] = function (v) { setM('delta', +v / 100); }; HN.ins['metas-a'] = function (v) { setM('ajuste', +v / 100); };
  HN.chipFn.macro = function (v) { setM('macro', v); };
})(window.HN = window.HN || {});

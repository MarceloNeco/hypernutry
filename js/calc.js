/* HyperNutry — cálculos (puros, sem tela). Testados em TESTE-hypernutry.html.
 * Fórmulas: Mifflin-St Jeor, Harris-Benedict (revisada, Roza & Shizgal 1984), Katch-McArdle.
 * Tudo é ESTIMATIVA educativa — não é prescrição (Lei 8.234/1991; Res. CFN 599/2018).
 */
(function (HN) {
  'use strict';
  var C = HN.calc = {};

  C.activityFactors = [
    { v: 1.2, pt: 'Sedentário (quase sem exercício)', en: 'Sedentary (little exercise)' },
    { v: 1.375, pt: 'Leve (1–3 dias por semana)', en: 'Light (1–3 days a week)' },
    { v: 1.55, pt: 'Moderado (3–5 dias por semana)', en: 'Moderate (3–5 days a week)' },
    { v: 1.725, pt: 'Intenso (6–7 dias por semana)', en: 'Intense (6–7 days a week)' },
    { v: 1.9, pt: 'Muito intenso (treino pesado + trabalho físico)', en: 'Very intense (hard training + physical job)' }
  ];

  // sexo: 'F' | 'M' (sexo biológico, usado só na equação)
  C.mifflin = function (p) { return 10 * p.peso + 6.25 * p.altura - 5 * p.idade + (p.sexo === 'M' ? 5 : -161); };
  C.harris = function (p) {
    return p.sexo === 'M'
      ? 88.362 + 13.397 * p.peso + 4.799 * p.altura - 5.677 * p.idade
      : 447.593 + 9.247 * p.peso + 3.098 * p.altura - 4.330 * p.idade;
  };
  C.katch = function (p) { // precisa de % de gordura
    if (!(p.gordura > 0 && p.gordura < 70)) return null;
    return 370 + 21.6 * (p.peso * (1 - p.gordura / 100));
  };
  C.tmb = function (p, metodo) {
    var m = metodo || 'mifflin';
    var v = m === 'harris' ? C.harris(p) : m === 'katch' ? C.katch(p) : C.mifflin(p);
    if (v == null) v = C.mifflin(p);
    return Math.round(v);
  };
  C.get = function (p, metodo) { return Math.round(C.tmb(p, metodo) * (p.fator || 1.2)); };

  // Faixa adaptativa: GET × (1 ± delta). ajuste (−0,10…+0,10) é "ajuste leve" educativo.
  C.faixa = function (getKcal, delta, ajuste) {
    var d = Math.min(Math.max(delta == null ? 0.10 : delta, 0.05), 0.20);
    var a = Math.min(Math.max(ajuste || 0, -0.10), 0.10);
    var centro = getKcal * (1 + a);
    return { centro: Math.round(centro), min: Math.round(centro * (1 - d)), max: Math.round(centro * (1 + d)), delta: d, ajuste: a };
  };
  // Piso de segurança: nunca exibir faixa abaixo disso (educativo; abaixo = procurar nutricionista)
  C.piso = function (sexo) { return sexo === 'M' ? 1500 : 1200; };

  // Macros: percentuais (soma 100) → gramas. kcal/g: carb 4, prot 4, gord 9.
  C.presetsMacro = {
    equilibrado: { c: 50, p: 20, f: 30, pt: 'Equilibrado', en: 'Balanced' },
    proteico: { c: 40, p: 30, f: 30, pt: 'Mais proteína (saciedade)', en: 'Higher protein (satiety)' },
    leve_carbo: { c: 35, p: 25, f: 40, pt: 'Menos carboidrato', en: 'Lower carb' }
  };
  C.macros = function (kcal, pc) {
    return {
      c: { pct: pc.c, g: Math.round(kcal * pc.c / 100 / 4) },
      p: { pct: pc.p, g: Math.round(kcal * pc.p / 100 / 4) },
      f: { pct: pc.f, g: Math.round(kcal * pc.f / 100 / 9) }
    };
  };

  // Totais nutricionais de [{food, g}]
  C.totais = function (items) {
    var t = { kcal: 0, p: 0, c: 0, f: 0, fib: 0, na: 0 };
    (items || []).forEach(function (it) {
      var f = HN.foods[it.food] || it.custom; if (!f) return;
      var k = (it.g || 0) / 100;
      t.kcal += f.kcal * k; t.p += f.p * k; t.c += f.c * k; t.f += f.f * k; t.fib += (f.fib || 0) * k; t.na += (f.na || 0) * k;
    });
    Object.keys(t).forEach(function (k) { t[k] = Math.round(t[k] * 10) / 10; });
    return t;
  };

  // Substituição: massa do substituto para igualar o macro-chave (kcal|p|c|f) do original.
  // m2 = m1 × (chave por 100 g do original ÷ chave por 100 g do substituto)
  C.substituir = function (idOrig, gramas, idSub, chave) {
    var a = HN.foods[idOrig], b = HN.foods[idSub];
    if (!a || !b) return null;
    var ka = a[chave], kb = b[chave];
    if (!(kb > 0)) return null;
    return Math.round(gramas * ka / kb);
  };
  C.sugerirSubstitutos = function (idOrig, chave, filtros) {
    var a = HN.foods[idOrig]; if (!a) return [];
    return HN.foodList.filter(function (f) {
      if (f.id === idOrig || f.group !== a.group || !(f[chave] > 0)) return false;
      if (filtros) {
        if (filtros.vegano && !f.vegan) return false;
        if (filtros.semGluten && !f.glutenFree) return false;
        if (filtros.semLactose && !f.lactoseFree) return false;
        if (filtros.semCastanhas && !f.nutFree) return false;
      }
      return true;
    });
  };

  // Medidas caseiras ↔ gramas
  C.paraMedida = function (foodId, g) { // melhor medida para mostrar
    var f = HN.foods[foodId]; if (!f || !f.measures.length) return null;
    var m = f.measures[0], n = g / m[2];
    return { n: Math.round(n * 4) / 4, pt: m[0], en: m[1] };
  };
  C.liquidos = { copo: 200, xicara: 240, colher_sopa: 15, colher_cha: 5 }; // ml

  // Escala de Bristol
  C.bristol = [
    ['Tipo 1 — bolinhas duras', 'Type 1 — hard lumps'], ['Tipo 2 — encaroçado', 'Type 2 — lumpy sausage'],
    ['Tipo 3 — salsicha com rachaduras', 'Type 3 — sausage with cracks'], ['Tipo 4 — salsicha lisa (ideal)', 'Type 4 — smooth sausage (ideal)'],
    ['Tipo 5 — pedaços macios', 'Type 5 — soft blobs'], ['Tipo 6 — pastoso', 'Type 6 — mushy'], ['Tipo 7 — líquido', 'Type 7 — liquid']
  ];

  // Sinais de alerta no perfil (sem diagnóstico): menor de idade, histórico de transtorno alimentar, gestação
  C.alertas = function (p) {
    var a = [];
    if (p.idade != null && p.idade < 18) a.push('menor');
    if (p.historicoTA) a.push('ta');
    if (p.gestante) a.push('gestante');
    return a;
  };
  C.numerosPermitidos = function (p) { return C.alertas(p).length === 0; };

  // Cardápio semanal: escolhe receitas compatíveis (restrições, equipamentos, tempo, habilidade)
  C.receitaCompativel = function (r, perfil) {
    perfil = perfil || {};
    var res = perfil.restricoes || [];
    if (res.indexOf('gluten') >= 0 && r.allergens.indexOf('gluten') >= 0) return false;
    if (res.indexOf('leite') >= 0 && r.allergens.indexOf('leite') >= 0) return false;
    if (res.indexOf('ovo') >= 0 && r.allergens.indexOf('ovo') >= 0) return false;
    if (res.indexOf('castanhas') >= 0 && r.allergens.indexOf('castanhas') >= 0) return false;
    if (res.indexOf('amendoim') >= 0 && r.allergens.indexOf('amendoim') >= 0) return false;
    if (res.indexOf('soja') >= 0 && r.allergens.indexOf('soja') >= 0) return false;
    if (res.indexOf('peixe') >= 0 && r.allergens.indexOf('peixe') >= 0) return false;
    if (res.indexOf('vegano') >= 0 && !r.vegan) return false;
    if (res.indexOf('vegetariano') >= 0 && !r.vegetarian) return false;
    var eq = perfil.equipamentos;
    if (eq) for (var i = 0; i < r.equip.length; i++) if (eq.indexOf(r.equip[i]) < 0) return false;
    if (perfil.tempoMax && r.time > perfil.tempoMax) return false;
    if (perfil.habilidade && r.skill > perfil.habilidade) return false;
    return true;
  };
  // gerador determinístico por semente (mesma semana → mesmo cardápio, até "trocar")
  C.rng = function (seed) { var s = seed >>> 0 || 1; return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; };
  C.cardapioSemana = function (perfil, seed) {
    var rnd = C.rng(seed || 1), dias = [], momentos = ['cafe', 'almoco', 'lanche', 'jantar'];
    var pool = HN.recipeList.filter(function (r) { return C.receitaCompativel(r, perfil); });
    var usadas = {};
    for (var d = 0; d < 7; d++) {
      var dia = {};
      momentos.forEach(function (m) {
        var cand = pool.filter(function (r) { return r.meal.indexOf(m) >= 0; });
        if (!cand.length) { dia[m] = null; return; }
        var novas = cand.filter(function (r) { return !usadas[r.id + m]; });
        var from = novas.length ? novas : cand;
        var pick = from[Math.floor(rnd() * from.length)];
        usadas[pick.id + m] = 1; dia[m] = pick.id;
      });
      dias.push(dia);
    }
    return dias;
  };

  // Lista de compras: soma ingredientes (g) × pessoas, menos despensa; agrupa por seção
  C.listaCompras = function (receitaIds, pessoas, despensa) {
    var tot = {};
    receitaIds.forEach(function (id) {
      var r = HN.recipes[id]; if (!r) return;
      r.ing.forEach(function (i) { tot[i[0]] = (tot[i[0]] || 0) + i[1] * pessoas; });
    });
    var secoes = {};
    Object.keys(tot).forEach(function (fid) {
      var have = (despensa && despensa[fid]) || 0, need = Math.max(0, Math.round(tot[fid] - have));
      var f = HN.foods[fid];
      var sec = HN.shopSectionOverride[fid] || HN.shopSection[f.group] || 'mercearia';
      (secoes[sec] = secoes[sec] || []).push({ food: fid, need: need, total: Math.round(tot[fid]), have: have });
    });
    Object.keys(secoes).forEach(function (s) { secoes[s].sort(function (a, b) { return a.food < b.food ? -1 : 1; }); });
    return secoes;
  };

  // Ajusta porções: fator = pessoas
  C.escalar = function (r, pessoas) { return r.ing.map(function (i) { return { food: i[0], g: Math.round(i[1] * pessoas) }; }); };
})(window.HN = window.HN || {});

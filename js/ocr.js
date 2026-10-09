/* HyperNutry — leitura de rótulos e laudos: pré-processamento, motor OCR (opcional) e PARSERS.
 * Os parsers recebem TEXTO e funcionam sem motor (colar texto, ditado, teclado).
 * O motor (Tesseract.js) fica hospedado em vendor/tesseract e carrega só quando a pessoa pede, e só com
 * confirmação (pacote pesado). Tudo que é lido passa por conferência humana antes de salvar.
 * Limiares de "alto em": ANVISA RDC 429/2020 + IN 75/2020 (sólidos por 100 g | líquidos por 100 ml):
 *   açúcar adicionado ≥ 15 g | ≥ 7,5 g · gordura saturada ≥ 6 g | ≥ 3 g · sódio ≥ 600 mg | ≥ 300 mg.
 */
(function (HN) {
  'use strict';
  var O = HN.ocr = {};

  function norm(s) { return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''); }
  function num(s) { if (s == null) return null; var v = parseFloat(String(s).replace(/\./g, function (m, i, str) { return /,/.test(str) ? '' : m; }).replace(',', '.')); return isFinite(v) ? v : null; }
  function numsIn(line) { var m = line.match(/\d+(?:[.,]\d+)?/g) || []; return m.map(num); }
  O.norm = norm;

  // ---------- Rótulo nutricional (tabela ANVISA) ----------
  var NUT = [
    { k: 'kcal', re: /(valor energetico|energia|calorias)/ },
    { k: 'c', re: /carboidrato/ },
    { k: 'sug', re: /acucares? totais|acucar(es)?\b(?! adicion)/ },
    { k: 'sugAdd', re: /acucares? adicionados?/ },
    { k: 'p', re: /proteina/ },
    { k: 'f', re: /gorduras? totais?|lipidios/ },
    { k: 'sat', re: /gorduras? saturadas?/ },
    { k: 'trans', re: /gorduras? trans/ },
    { k: 'fib', re: /(fibra|fibras) alimentar|fibras?\b/ },
    { k: 'na', re: /sodio/ }
  ];
  var ALERG = [
    ['gluten', /\b(trigo|centeio|cevada|aveia|malte|gluten)\b/], ['leite', /\b(leite|lactose|soro de leite|caseina|manteiga|queijo|iogurte)\b/],
    ['ovo', /\b(ovo|ovos|albumina|gema)\b/], ['castanhas', /\b(castanha|castanhas|amendoa|amendoas|nozes|noz|avela|pistache|macadamia|caju)\b/],
    ['amendoim', /\bamendoim\b/], ['soja', /\b(soja|lecitina de soja)\b/], ['peixe', /\bpeixe|\bpescado/], ['crustaceo', /\b(camarao|crustaceo|crustaceos)\b/]
  ];
  var NOVA4 = /(aroma|corante|maltodextrina|xarope de (glicose|milho)|gordura vegetal hidrogenada|emulsificante|estabilizante|realcador de sabor|glutamato|aspartame|sucralose|acesulfame|ciclamato|inulina isolada|proteina isolada|amido modificado|conservador|antioxidante|acidulante|espessante|lecitina|ins ?\d{3}|e ?\d{3})/g;

  O.parseRotulo = function (texto) {
    var raw = String(texto || ''), lines = raw.split(/\r?\n/), n = norm(raw);
    var out = { porcaoG: null, porcaoTxt: null, liquido: /\bml\b/.test(n) && !/\b\d+\s?g\b/.test(n.split('porcao')[1] || ''), per100: {}, perPorcao: {}, alergenos: [], podeConter: [], ingredientes: '', nova4: [], avisos: [] };
    var mp = n.match(/porcao(?: de)?\s*:?\s*(\d+(?:[.,]\d+)?)\s*(g|ml)/);
    if (mp) { out.porcaoG = num(mp[1]); out.unidade = mp[2]; out.liquido = mp[2] === 'ml'; out.porcaoTxt = mp[1] + ' ' + mp[2]; }
    var hasBoth = /100\s?(g|ml)/.test(n) && /porcao/.test(n);
    lines.forEach(function (ln) {
      var nl = norm(ln);
      for (var i = 0; i < NUT.length; i++) {
        if (!NUT[i].re.test(nl)) continue;
        // não confundir "gorduras saturadas" com "gorduras totais", nem "acucares adicionados" com "totais"
        if (NUT[i].k === 'f' && /saturad|trans/.test(nl)) continue;
        if (NUT[i].k === 'sug' && /adicionad/.test(nl)) continue;
        if (NUT[i].k === 'fib' && /sodio|carboid/.test(nl)) continue;
        var key = NUT[i].k, vals;
        if (key === 'kcal') {
          var mk = nl.match(/(\d+(?:[.,]\d+)?)\s*kcal/g);
          vals = mk ? mk.map(function (x) { return num(x); }) : numsIn(nl).slice(0, 2);
          if (!mk) { // "valor energetico 150 75 4" ou "kj"
            vals = numsIn(nl.replace(/\d+(?:[.,]\d+)?\s*kj/g, ''));
          }
        } else vals = numsIn(nl.replace(/\(.*?\)/g, ''));
        if (!vals.length) break;
        if (hasBoth && vals.length >= 2) { out.per100[key] = vals[0]; out.perPorcao[key] = vals[1]; }
        else if (vals.length >= 1) { out.perPorcao[key] = vals[0]; }
        break;
      }
    });
    // se só tem por porção e sabemos a porção, converte para 100 g (estimativa)
    if (out.porcaoG && Object.keys(out.per100).length === 0 && Object.keys(out.perPorcao).length) {
      Object.keys(out.perPorcao).forEach(function (k) { out.per100[k] = Math.round(out.perPorcao[k] / out.porcaoG * 1000) / 10; });
      out.avisos.push('porcao-convertida');
    } else if (!Object.keys(out.per100).length) out.avisos.push('sem-100g');
    // alergênicos declarados
    var mc = n.match(/(?:alergicos?\s*:?\s*)?contem\s+(?!ingredientes)([^.\n]+)/), mq = n.match(/pode conter\s*([^.\n]+)/);
    var decl = mc ? mc[1] : '', pode = mq ? mq[1] : '';
    ALERG.forEach(function (a) { if (a[1].test(decl)) out.alergenos.push(a[0]); if (a[1].test(pode) && out.alergenos.indexOf(a[0]) < 0) out.podeConter.push(a[0]); });
    // ingredientes
    var mi = raw.match(/ingredientes?\s*:?\s*([\s\S]+?)(?:\n\s*\n|al[eé]rgicos?|cont[eé]m|$)/i);
    if (mi) {
      out.ingredientes = mi[1].replace(/\s+/g, ' ').trim();
      var ni = norm(out.ingredientes);
      ALERG.forEach(function (a) { if (a[1].test(ni) && out.alergenos.indexOf(a[0]) < 0 && out.podeConter.indexOf(a[0]) < 0) out.alergenos.push(a[0] + '*'); });
      var seen = {}, m4; NOVA4.lastIndex = 0;
      while ((m4 = NOVA4.exec(ni))) { if (!seen[m4[1]]) { seen[m4[1]] = 1; out.nova4.push(m4[1]); } }
    }
    out.avaliacao = O.avaliar(out);
    return out;
  };

  // Semáforo educativo (não é nota oficial): alto em açúcar/saturada/sódio + marcadores de ultraprocessado
  O.avaliar = function (r) {
    var liq = !!r.liquido, p = r.per100 || {};
    var lim = liq ? { sug: 7.5, sat: 3, na: 300 } : { sug: 15, sat: 6, na: 600 };
    var sug = p.sugAdd != null ? p.sugAdd : null, usouTotal = false;
    if (sug == null && p.sug != null) { sug = p.sug; usouTotal = true; }
    var altos = [];
    if (sug != null && sug >= lim.sug) altos.push('acucar');
    if (p.sat != null && p.sat >= lim.sat) altos.push('saturada');
    if (p.na != null && p.na >= lim.na) altos.push('sodio');
    var ultra = r.nova4 && r.nova4.length >= 2;
    var nivel = altos.length >= 2 || (altos.length >= 1 && ultra) ? 'vermelho' : (altos.length === 1 || ultra) ? 'amarelo' : 'verde';
    if (!Object.keys(p).length) nivel = 'cinza';
    return { nivel: nivel, altos: altos, ultra: ultra, limites: lim, usouAcucarTotal: usouTotal };
  };

  // ---------- Bioimpedância (InBody e similares) ----------
  var BIO = [
    { k: 'peso', re: /\b(peso|weight)\b(?!.*ideal)/ },
    { k: 'mme', re: /(massa de musculo esqueletico|musculo esqueletico|\bmme\b|\bsmm\b|skeletal muscle)/ },
    { k: 'gordura', re: /(percentual de gordura|porcentagem de gordura|\bpgc\b|\bpbf\b|\bbf%|body fat|% de gordura)/ },
    { k: 'massaGorda', re: /(massa de gordura|\bbfm\b|body fat mass)/ },
    { k: 'act', re: /(agua corporal total|\bact\b|\btbw\b|total body water)/ },
    { k: 'mlg', re: /(massa livre de gordura|\bffm\b|fat free mass)/ },
    { k: 'tmb', re: /(taxa metabolica basal|\btmb\b|\bbmr\b)/ },
    { k: 'gv', re: /(gordura visceral|nivel de gordura visceral|visceral fat)/ }
  ];
  O.parseBio = function (texto) {
    var out = {}, lines = String(texto || '').split(/\r?\n/);
    lines.forEach(function (ln, idx) {
      var nl = norm(ln);
      BIO.forEach(function (b) {
        if (out[b.k] != null || !b.re.test(nl)) return;
        if (b.k === 'gordura' && /massa de gordura/.test(nl) && !/percent|%/.test(nl)) return;
        var after = nl.replace(b.re, ' ');
        var vals = numsIn(after);
        if (!vals.length && lines[idx + 1]) vals = numsIn(norm(lines[idx + 1])); // valor na linha de baixo
        if (vals.length) out[b.k] = vals[0];
      });
    });
    return out;
  };

  // ---------- Motor OCR (hospedado aqui desde a v0.2.3) ----------
  // Arquivos em vendor/tesseract (Tesseract.js 5.1.1 + núcleo LSTM + idiomas por/eng "best_int").
  // Uma leitura baixa ≈5,5 MB (programa + núcleo + 1 idioma), uma vez só: depois fica no cache do aparelho.
  // Se a pasta não existir (cópia antiga do site), cai sozinho para o CDN. A foto nunca sai do aparelho.
  var CDN = 'https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js';
  var BASE = 'vendor/tesseract/', local = false;
  O.motorLocal = BASE + 'tesseract.min.js';
  O.motorMB = 5.5;
  O.motorPronto = function () { return !!window.Tesseract; };
  function load(src) {
    return new Promise(function (ok, fail) { var s = document.createElement('script'); s.src = src; s.crossOrigin = 'anonymous'; s.onload = ok; s.onerror = fail; document.head.appendChild(s); });
  }
  O.carregarMotor = function () {
    if (window.Tesseract) return Promise.resolve();
    return load(O.motorLocal).then(function () { local = true; }).catch(function () { return load(CDN); });
  };
  function abs(p) { return new URL(p, location.href).href; }
  // Pré-processamento no aparelho: reduz, escala de cinza, contraste, binarização simples
  O.preprocessar = function (img, maxLado) {
    var w = img.naturalWidth || img.width, h = img.naturalHeight || img.height, esc = Math.min(1, (maxLado || 1600) / Math.max(w, h));
    var c = document.createElement('canvas'); c.width = Math.round(w * esc); c.height = Math.round(h * esc);
    var x = c.getContext('2d'); x.drawImage(img, 0, 0, c.width, c.height);
    var d = x.getImageData(0, 0, c.width, c.height), p = d.data, soma = 0, i;
    for (i = 0; i < p.length; i += 4) { var g = 0.299 * p[i] + 0.587 * p[i + 1] + 0.114 * p[i + 2]; p[i] = p[i + 1] = p[i + 2] = g; soma += g; }
    var media = soma / (p.length / 4), lim = media * 0.92;
    for (i = 0; i < p.length; i += 4) { var v = p[i] > lim ? 255 : 0; p[i] = p[i + 1] = p[i + 2] = v; }
    x.putImageData(d, 0, 0);
    return c;
  };
  // Tratamento novo (v0.4.5): escala de cinza + "auto-níveis" por percentis, SEM binarizar. Em fundo colorido
  // (lata dourada, rótulo escuro) o corte duro de antes virava ruído e comia as letras pequenas dos ingredientes.
  // Também amplia quando a foto é pequena: o motor lê melhor letras com ≥ 30 px de altura.
  O.preparar = function (img, maxLado) {
    var w = img.naturalWidth || img.width, h = img.naturalHeight || img.height, maior = Math.max(w, h);
    var esc = maior > (maxLado || 2400) ? (maxLado || 2400) / maior : (maior < 1400 ? Math.min(2, 1400 / maior) : 1);
    var c = document.createElement('canvas'); c.width = Math.round(w * esc); c.height = Math.round(h * esc);
    var x = c.getContext('2d'); x.imageSmoothingQuality = 'high'; x.drawImage(img, 0, 0, c.width, c.height);
    var d = x.getImageData(0, 0, c.width, c.height), p = d.data, hist = new Uint32Array(256), i, g;
    for (i = 0; i < p.length; i += 4) { g = (0.299 * p[i] + 0.587 * p[i + 1] + 0.114 * p[i + 2]) | 0; p[i] = g; hist[g]++; }
    var n = p.length / 4, lo = 0, hi = 255, acc = 0;
    for (i = 0; i < 256; i++) { acc += hist[i]; if (acc >= n * 0.02) { lo = i; break; } }
    acc = 0; for (i = 255; i >= 0; i--) { acc += hist[i]; if (acc >= n * 0.02) { hi = i; break; } }
    var k = hi > lo ? 255 / (hi - lo) : 1;
    for (i = 0; i < p.length; i += 4) { g = (p[i] - lo) * k; g = g < 0 ? 0 : g > 255 ? 255 : g; p[i] = p[i + 1] = p[i + 2] = g; }
    x.putImageData(d, 0, 0);
    return c;
  };
  // Nitidez (variância do Laplaciano) — pede nova foto se estiver borrada
  O.nitidez = function (canvas) {
    var w = canvas.width, h = canvas.height, d = canvas.getContext('2d').getImageData(0, 0, w, h).data, s = 0, s2 = 0, n = 0;
    for (var y = 1; y < h - 1; y += 2) for (var x = 1; x < w - 1; x += 2) {
      var i = (y * w + x) * 4, l = 4 * d[i] - d[i - 4] - d[i + 4] - d[i - w * 4] - d[i + w * 4];
      s += l; s2 += l * l; n++;
    }
    var m = s / n; return s2 / n - m * m;
  };
  O.ler = function (canvasOuImg, lang, onProgress) {
    return O.carregarMotor().then(function () {
      var op = { logger: function (m) { if (onProgress && m.progress != null) onProgress(m); } };
      if (local) { op.workerPath = abs(BASE + 'worker.min.js'); op.corePath = abs(BASE); op.langPath = abs(BASE + 'lang'); }
      return window.Tesseract.recognize(canvasOuImg, lang || 'por', op);
    }).then(function (r) { return r.data.text; });
  };
})(window.HN = window.HN || {});

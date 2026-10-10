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
  var NOVA4 = /(aroma|corante|maltodextrina|xarope de (glicose|milho)|gordura vegetal hidrogenada|emulsificante|estabilizante|realcador de sabor|glutamato|aspartame|sucralose|acesulfame|ciclamato|inulina isolada|proteina isolada|amido modificado|conservador|antioxidante|acidulante|espessante|ins ?\d{3}|e ?\d{3})/g; // sem 'lecitina': já conta como 'emulsificante' (era contada duas vezes)

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
    // todos os "contém …" (ex.: "CONTÉM GLÚTEN. ALÉRGICOS: CONTÉM LEITE E DERIVADOS."), não só o primeiro
    var mq = n.match(/pode conter\s*:?\s*([^.\n]+)/), decl = (n.match(/contem\s+(?!ingredientes)[^.\n]+/g) || []).join(' '), pode = mq ? mq[1] : '';
    ALERG.forEach(function (a) { if (a[1].test(decl)) out.alergenos.push(a[0]); if (a[1].test(pode) && out.alergenos.indexOf(a[0]) < 0) out.podeConter.push(a[0]); });
    // ingredientes
    var mi = raw.match(/(?:ingredientes?|\bingr\.)\s*:?\s*([\s\S]+?)(?:\n\s*\n|al[eé]rgicos?|cont[eé]m|$)/i); // "Ingr.:" abreviado também (iogurtes, laticínios)
    // sem a palavra "ingredientes" (ela costuma ficar numa faixa colorida que o leitor não lê): se o texto antes de
    // "alérgicos"/"contém" parece uma lista (vírgulas), é a lista de ingredientes
    if (!mi) { var ant = raw.split(/al[eé]rgicos?|cont[eé]m|pode conter/i)[0] || ''; if ((ant.match(/,/g) || []).length >= 2 && ant.length < 500 && !/kcal|porcao|energetico|carboidrat|%\s*vd/.test(norm(ant)) && O.ingredientesLegiveis(ant).ok) mi = [null, ant.replace(/^[^A-Za-zÀ-ÿ(]+/, '')]; } // só quando o trecho parece texto de verdade (não lixo de leitura)
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
  // Tratamento do recorte da câmera (v0.4.10): escala de cinza + limiar ADAPTATIVO (cada pixel comparado com a média da
  // vizinhança, janela de 1/8 da largura). Em rótulo colorido (lata dourada com letras azuis) o corte global de antes
  // virava ruído: nas fotos reais do Nescau, de 22–68% para 87% de acerto nos ingredientes. Amplia foto pequena
  // (o motor lê melhor letras com ≥ 30 px) e reduz foto enorme (velocidade).
  O.preparar = function (img, maxLado) {
    var w = img.naturalWidth || img.width, h = img.naturalHeight || img.height, maior = Math.max(w, h);
    var esc = maior > (maxLado || 2000) ? (maxLado || 2000) / maior : (maior < 1400 ? Math.min(2, 1400 / maior) : 1);
    var c = document.createElement('canvas'); c.width = Math.round(w * esc); c.height = Math.round(h * esc);
    var x = c.getContext('2d'); x.imageSmoothingQuality = 'high'; x.drawImage(img, 0, 0, c.width, c.height);
    var W = c.width, H = c.height, d = x.getImageData(0, 0, W, H), p = d.data, i, g;
    var cinza = new Uint8ClampedArray(W * H);
    for (i = 0; i < W * H; i++) cinza[i] = 0.299 * p[i * 4] + 0.587 * p[i * 4 + 1] + 0.114 * p[i * 4 + 2];
    // imagem integral: média de qualquer janela em tempo constante
    var I = new Float64Array((W + 1) * (H + 1)), y, xx, s;
    for (y = 1; y <= H; y++) { s = 0; for (xx = 1; xx <= W; xx++) { s += cinza[(y - 1) * W + (xx - 1)]; I[y * (W + 1) + xx] = I[(y - 1) * (W + 1) + xx] + s; } }
    var r = Math.max(6, Math.round(W / 16)), bias = 0.88;
    for (y = 0; y < H; y++) for (xx = 0; xx < W; xx++) {
      var x0 = Math.max(0, xx - r), x1 = Math.min(W, xx + r + 1), y0 = Math.max(0, y - r), y1 = Math.min(H, y + r + 1);
      var m = (I[y1 * (W + 1) + x1] - I[y0 * (W + 1) + x1] - I[y1 * (W + 1) + x0] + I[y0 * (W + 1) + x0]) / ((x1 - x0) * (y1 - y0));
      i = (y * W + xx) * 4; g = cinza[y * W + xx] < m * bias ? 0 : 255; p[i] = p[i + 1] = p[i + 2] = g;
    }
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
  function reconhecer(canvasOuImg, lang, onProgress) {
    return O.carregarMotor().then(function () {
      var op = { logger: function (m) { if (onProgress && m.progress != null) onProgress(m); } };
      if (local) { op.workerPath = abs(BASE + 'worker.min.js'); op.corePath = abs(BASE); op.langPath = abs(BASE + 'lang'); }
      return window.Tesseract.recognize(canvasOuImg, lang || 'por', op);
    }).then(function (r) { return { texto: r.data.text || '', conf: Math.round(r.data.confidence || 0) }; });
  }
  O.ler = function (canvasOuImg, lang, onProgress) { return reconhecer(canvasOuImg, lang, onProgress).then(function (r) { return r.texto; }); };
  // Lê várias versões da mesma foto (ex.: preto e branco adaptativo e tons de cinza) e fica com a de maior confiança.
  // Rótulo curvo, letra pequena e fundo escuro mudam qual tratamento funciona; testar dois custa ~1–2 s a mais.
  O.lerMelhor = function (variantes, lang, onProgress) {
    var lista = (variantes || []).filter(Boolean), melhor = null, i = 0;
    var passo = function () {
      if (i >= lista.length) return Promise.resolve(melhor || { texto: '', conf: 0 });
      var k = i;
      return reconhecer(lista[k], lang, function (m) { if (onProgress) onProgress({ status: m.status, progress: (k + (m.progress || 0)) / lista.length }); }).then(function (r) {
        var q = O.qualidade(r.texto), nota = r.conf + q.plausivel * 30 + Math.min(q.chaves, 4) * 5;
        if (!melhor || nota > melhor.nota) melhor = { texto: r.texto, conf: r.conf, nota: nota };
        i++; return passo();
      }, function () { i++; return passo(); });
    };
    return passo();
  };
  // Tons de cinza com contraste ajustado (sem preto e branco): vai melhor em foto com fundo escuro ou letra fina.
  O.cinza = function (img, maxLado) {
    var w = img.naturalWidth || img.width, h = img.naturalHeight || img.height, maior = Math.max(w, h);
    var esc = maior > (maxLado || 2000) ? (maxLado || 2000) / maior : (maior < 1400 ? Math.min(2, 1400 / maior) : 1);
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
  // A leitura presta? Conta palavras com cara de português e termos de rótulo. Serve para NUNCA dar farol verde
  // com texto ilegível (aconteceu: lixo de leitura virou "lista de ingredientes" e o farol saiu verde).
  var CHAVES = /\b(ingredientes?|ingr|informacao|nutricional|porcao|valor|energetico|kcal|carboidratos?|acucares?|proteinas?|gorduras?|saturadas?|sodio|fibras?|calcio|leite|agua|sal|farinha|oleo|aroma|corante|conservador|emulsificante|estabilizante|alergicos?|contem|gluten|soja|trigo|derivados)\b/g;
  /* Os ingredientes são legíveis? A maioria das palavras tem de ser de alimento ou aditivo conhecido (base de alimentos
     do app + glossário de aditivos + termos comuns de rótulo). Lixo de leitura ("RARO IAN ASAS") não passa. */
  var LEX = null, FIXO = 'agua leite desnatado integral semidesnatado enzima lactase fermento fermentos lacteo lacteos acucar acucares sal farinha trigo enriquecida ferro acido folico milho arroz aveia cevada centeio soja oleo oleos azeite gordura vegetal vegetais hidrogenada interesterificada palma cacau chocolate po manteiga creme soro proteina proteinas amido modificado amidos fecula mandioca batata tomate cebola alho pimenta especiarias condimento condimentos ervas extrato polpa suco fruta frutas morango uva laranja limao banana maca abacaxi coco amendoim castanha castanhas nozes amendoas avela gergelim linhaca chia mel xarope glicose frutose maltodextrina dextrose sacarose lactose cloreto sodio potassio calcio carbonato fosfato citrato bicarbonato vitamina vitaminas minerais mineral zinco magnesio iodo iodado ovo ovos clara gema carne frango bovina suina peixe atum sardinha camarao queijo requeijao iogurte nata gelatina pectina goma gomas xantana guar carragena celulose fibra fibras inulina polidextrose lecitina mono diglicerideos acidos graxos estabilizante estabilizantes espessante espessantes emulsificante emulsificantes conservador conservadores conservante antioxidante antioxidantes acidulante acidulantes regulador acidez corante corantes aromatizante aromatizantes aroma aromas natural naturais artificial artificiais identico realcador sabor edulcorante edulcorantes adocante sucralose aspartame acesulfame ciclamato sacarina estevia glutamato monossodico fermento quimico biologico levedura vinagre malte maltado cultura culturas lactica lacticas bifidobacterias probioticos sorbato benzoato propionato nitrito nitrato metabissulfito caramelo urucum curcuma carmim beterraba clorofila tartrazina'.split(' ');
  function lexico() {
    if (LEX) return LEX; LEX = {};
    FIXO.forEach(function (w) { LEX[w] = 1; });
    (HN.foodList || []).forEach(function (f) { norm(f.pt).split(/[^a-z]+/).forEach(function (w) { if (w.length >= 4) LEX[w] = 1; }); });
    var ad = HN.aditivosBase && HN.aditivosBase.aditivos || [];
    ad.forEach(function (a) { norm((a.nome && a.nome.pt || '') + ' ' + (a.outros || []).join(' ')).split(/[^a-z]+/).forEach(function (w) { if (w.length >= 4) LEX[w] = 1; }); });
    return LEX;
  }
  var PARADA = { com: 1, sem: 1, dos: 1, das: 1, por: 1, para: 1, contem: 1, pode: 1, ingredientes: 1, ingrediente: 1, ingr: 1, tipo: 1 };
  O.ingredientesLegiveis = function (texto) {
    var L = lexico(), ws = norm(texto).split(/[^a-z]+/).filter(function (w) { return w.length >= 3 && !PARADA[w]; }), conhecidas = 0;
    ws.forEach(function (w) { if (L[w] || L[w.replace(/s$/, '')] || (w.length >= 6 && Object.prototype.hasOwnProperty.call(L, w.slice(0, -2)))) conhecidas++; });
    var taxa = ws.length ? conhecidas / ws.length : 0;
    return { ok: ws.length >= 2 && taxa >= 0.5, taxa: Math.round(taxa * 100) / 100, palavras: ws.length };
  };
  O.qualidade = function (texto) {
    var t = String(texto || ''), toks = t.split(/\s+/).map(function (w) { return w.replace(/^[^A-Za-zÀ-ÿ0-9]+|[^A-Za-zÀ-ÿ0-9%]+$/g, ''); }).filter(function (w) { return w.length >= 3 && /[A-Za-zÀ-ÿ]/.test(w); });
    var bons = toks.filter(function (w) { return /^[A-Za-zÀ-ÿ]+$/.test(w) && /[aeiouáéíóúâêôãõà]/i.test(w) && !/([^aeiou\s])\1\1/i.test(w) && !(/[a-zà-ÿ][A-ZÀ-Þ]/.test(w)); }).length;
    var chaves = (norm(t).match(CHAVES) || []).length, plausivel = toks.length ? bons / toks.length : 0;
    return { plausivel: Math.round(plausivel * 100) / 100, chaves: chaves, ruim: !(chaves >= 3 && plausivel >= 0.55) && !(chaves >= 1 && plausivel >= 0.75) };
  };
})(window.HN = window.HN || {});

/* HyperNutry — Corpo e bem-estar, leitor de rótulos / laudos (OCR) e Telenutrição. */
(function (HN) {
  'use strict';
  var S = HN.S, C = HN.calc, U = HN.ui, O = HN.ocr, esc = HN.esc, T = HN.T, V = HN.views, A = HN.acts;
  HN.foodGroups.produto = ['Produtos lidos', 'Scanned products']; HN.shopSection.produto = 'mercearia';

  /* ================= leitor (foto → texto → conferência) ================= */
  var SC = { canvas: null, blur: false, text: '' };
  var SAMPLE_LABEL = 'INFORMAÇÃO NUTRICIONAL\nPorção de 30 g (3 biscoitos)\n100 g   30 g   %VD*\nValor energético (kcal) 470 141 7\nCarboidratos (g) 71 21 7\nAçúcares totais (g) 32 9,6 -\nAçúcares adicionados (g) 30 9 18\nProteínas (g) 6,4 1,9 4\nGorduras totais (g) 18 5,4 8\nGorduras saturadas (g) 8 2,4 12\nGorduras trans (g) 0 0 -\nFibra alimentar (g) 2,1 0,6 2\nSódio (mg) 190 57 3\n\nINGREDIENTES: Farinha de trigo enriquecida, açúcar, gordura vegetal, xarope de glicose, cacau, sal, emulsificante lecitina de soja, aroma artificial de baunilha, corante caramelo.\nALÉRGICOS: CONTÉM GLÚTEN E DERIVADOS DE SOJA. PODE CONTER LEITE.';
  var SAMPLE_BIO = 'InBody 270\nPeso 72,4 kg\nMassa de Músculo Esquelético 28,3 kg\nMassa de Gordura 17,4 kg\nPercentual de Gordura Corporal 24,1 %\nÁgua Corporal Total 38,2 L\nTaxa Metabólica Basal 1520 kcal\nNível de Gordura Visceral 7';
  function widget(kind) {
    return '<div class="card"><h3>📷 ' + (kind === 'bio' ? T('Foto do laudo', 'Report photo') : T('Foto do rótulo', 'Label photo')) + '</h3>' +
      '<p class="small muted">' + T('A foto é tratada no seu aparelho. Para ler a imagem é preciso o motor de leitura (≈5,5 MB só na primeira vez, baixado deste site — a foto não é enviada). Se preferir, cole ou digite o texto abaixo.', 'The photo is handled on your device. Reading the image needs the OCR engine (≈5.5 MB only the first time, from this site — the photo is not uploaded). If you prefer, paste or type the text below.') + '</p>' +
      '<div class="row wrap"><label class="btn sec sm" for="scfile">📷 ' + T('Tirar / escolher foto', 'Take / choose photo') + '</label><input id="scfile" type="file" accept="image/*" capture="environment" class="sr" data-in="sc-file"><button class="btn sec sm" data-act="sc-ocr">🔤 ' + T('Ler a foto', 'Read the photo') + '</button><button class="btn ghost sm" data-act="sc-sample" data-arg="' + kind + '">🧪 ' + T('Exemplo', 'Example') + '</button></div><div id="scprev" class="mt"></div>' +
      '<label class="f" for="sctext">' + T('Texto lido (edite se precisar)', 'Text read (edit if needed)') + '</label><textarea id="sctext" data-in="sc-text" placeholder="' + (kind === 'bio' ? T('Ex.: Percentual de Gordura Corporal 24,1 %', 'E.g.: Percent Body Fat 24.1 %') : T('Cole aqui a tabela nutricional e os ingredientes', 'Paste the nutrition table and ingredients here')) + '">' + esc(SC.text) + '</textarea>' +
      '<button class="btn block mt" data-act="sc-parse" data-arg="' + kind + '">✅ ' + T('Interpretar texto', 'Interpret text') + '</button></div>';
  }
  HN.ins['sc-text'] = function (v) { SC.text = v; };
  // foto (arquivo ou câmera) → confere nitidez → trata para leitura → mostra a prévia
  function useImage(img, opts) {
    try { var small = document.createElement('canvas'), w = img.naturalWidth || img.width, hh = img.naturalHeight || img.height, k = Math.min(1, 900 / Math.max(w, hh)); small.width = Math.round(w * k); small.height = Math.round(hh * k); var x = small.getContext('2d'); x.drawImage(img, 0, 0, small.width, small.height); var d = x.getImageData(0, 0, small.width, small.height), p = d.data; for (var i = 0; i < p.length; i += 4) { var g = .299 * p[i] + .587 * p[i + 1] + .114 * p[i + 2]; p[i] = p[i + 1] = p[i + 2] = g; } x.putImageData(d, 0, 0); SC.blur = O.nitidez(small) < 60; } catch (e) { SC.blur = false; }
    SC.canvas = (opts && opts.recortado) ? O.preparar(img) : O.preprocessar(img, 1600); // recorte da câmera: tratamento suave; foto inteira: o antigo
    var pv = HN.q('#scprev'); if (pv) { pv.innerHTML = '<img src="' + SC.canvas.toDataURL('image/jpeg', .5) + '" alt="' + T('Prévia da foto tratada', 'Preview of processed photo') + '" style="border-radius:12px;border:1px solid var(--line)">' + (SC.blur ? U.notice('warn', T('A foto parece desfocada. Tente de novo com mais luz e o celular firme, ou escolha outra.', 'The photo looks blurry. Try again with more light and a steady phone, or choose another.')) : '<p class="small muted">' + T('Foto pronta. Toque em “Ler a foto”.', 'Photo ready. Tap “Read the photo”.') + '</p>'); }
  }
  HN.ins['sc-file'] = function (v, el) {
    var f = el.files && el.files[0]; if (!f) return; var img = new Image(), url = URL.createObjectURL(f);
    img.onload = function () { useImage(img); URL.revokeObjectURL(url); };
    img.onerror = function () { HN.toast(T('Não consegui abrir essa imagem.', 'Could not open that image.')); };
    img.src = url;
  };
  // foto tirada na tela da câmera (📷): abre a tela certa já com a foto e começa a ler
  var pending = null;
  HN.scanImage = function (kind, canvas, opts) { pending = { kind: kind, canvas: canvas, opts: opts }; HN.go(kind === 'bio' ? '/corpo/exame' : '/rotulos'); };
  function runPending() {
    if (SC.pronto && HN.q('#sctext')) { var pr = SC.pronto; SC.pronto = null; SC.text = pr.txt; HN.q('#sctext').value = pr.txt; if (pr.txt.trim()) A['sc-parse'](pr.kind); return; }
    if (!pending || !HN.q('#scprev')) return; var p = pending; pending = null; SC.text = ''; useImage(p.canvas, p.opts); A['sc-ocr']();
  }
  ['rotulos', 'corpo'].forEach(function (n) { var old = HN.after[n]; HN.after[n] = function (a, b) { if (old) old(a, b); runPending(); }; });
  A['sc-sample'] = function (k) { SC.text = k === 'bio' ? SAMPLE_BIO : SAMPLE_LABEL; var t = HN.q('#sctext'); if (t) t.value = SC.text; };
  A['sc-ocr'] = function () {
    if (!SC.canvas) { HN.toast(T('Escolha uma foto primeiro.', 'Choose a photo first.')); return; }
    var go = function () {
      var pv = HN.q('#scprev'), note = document.createElement('p'); note.className = 'small'; note.id = 'scprog'; note.textContent = T('Preparando o leitor…', 'Preparing the reader…'); if (pv) pv.appendChild(note);
      var kind = HN.q('#rotres') ? 'rot' : 'bio', rota = kind === 'bio' ? '/corpo/exame' : '/rotulos';
      var ler = function (andamento) { return O.ler(SC.canvas, HN.lang === 'pt' ? 'por' : 'eng', function (m) { var n = HN.q('#scprog'); if (n) n.textContent = (m.status === 'recognizing text' ? T('Lendo', 'Reading') : T('Preparando', 'Preparing')) + ' ' + Math.round((m.progress || 0) * 100) + '%'; if (andamento) andamento(m.progress || 0); }); };
      // mostra o resultado na tela certa; se a pessoa foi para outra tela, guarda e a tela mostra ao abrir (HN.after)
      var mostrar = function (txt) {
        SC.text = txt; var t = HN.q('#sctext'), n = HN.q('#scprog');
        if (!t) { SC.pronto = { kind: kind, txt: txt }; HN.go(rota); return; }
        t.value = txt; if (n) n.textContent = txt.trim() ? T('Leitura concluída: resultado abaixo. Se algo saiu errado, corrija o texto e toque em Interpretar.', 'Reading complete: result below. If something came out wrong, fix the text and tap Interpret.') : T('Não achei texto na foto. Aproxime mais, com luz, e tente de novo.', 'No text found in the photo. Get closer, with light, and try again.');
        if (txt.trim()) A['sc-parse'](kind); /* interpreta sozinho: a pessoa quer o farol, não um botão a mais */
      };
      var falhou = function () { var n = HN.q('#scprog'); if (n) n.textContent = T('Não consegui carregar o leitor (sem internet?). Cole ou digite o texto.', 'Could not load the reader (offline?). Paste or type the text.'); };
      if (window.DGO && DGO.tarefa) { // diretriz "tarefas longas": tela acesa, pílula, continua ao navegar, "✅ toque para ver" volta aqui
        DGO.tarefa.iniciar({ id: 'leitura-' + kind, titulo: kind === 'bio' ? T('Lendo o laudo', 'Reading the report') : T('Lendo o rótulo', 'Reading the label'), executar: ler, aindaNaTela: function () { return !!HN.q('#sctext'); }, aoAbrir: mostrar }).catch(falhou);
      } else ler(null).then(mostrar, falhou);
    };
    if (O.motorPronto()) go(); else HN.confirm(T('Para ler a imagem preciso baixar o motor de leitura (≈5,5 MB só na primeira vez). Baixar agora? Em dados móveis isso consome sua franquia.', 'To read the image I need to download the OCR engine (≈5.5 MB only the first time). Download now? On mobile data this uses your allowance.'), T('Baixar e ler', 'Download and read')).then(function (ok) { if (ok) setTimeout(go, 50); });
  };
  A['sc-parse'] = function (kind) {
    var txt = (HN.q('#sctext') || {}).value || SC.text; SC.text = txt; if (!txt.trim()) { HN.toast(T('Sem texto para interpretar.', 'No text to interpret.')); return; }
    if (kind === 'bio') { var b = O.parseBio(txt); HN.bioResult = b; showBio(b); } else { var r = O.parseRotulo(txt); HN.rotResult = r; showRotulo(r); }
  };

  /* ---------- resultado de rótulo ---------- */
  var NUTL = [['kcal', 'Energia (kcal)', 'Energy (kcal)'], ['c', 'Carboidratos (g)', 'Carbs (g)'], ['sug', 'Açúcares totais (g)', 'Total sugars (g)'], ['sugAdd', 'Açúcares adicionados (g)', 'Added sugars (g)'], ['p', 'Proteínas (g)', 'Protein (g)'], ['f', 'Gorduras totais (g)', 'Total fat (g)'], ['sat', 'Gord. saturadas (g)', 'Saturated fat (g)'], ['fib', 'Fibras (g)', 'Fiber (g)'], ['na', 'Sódio (mg)', 'Sodium (mg)']];
  var SEM = { verde: ['Sem alertas relevantes', 'No relevant warnings'], amarelo: ['Atenção', 'Caution'], vermelho: ['Vários alertas', 'Several warnings'], cinza: ['Não consegui avaliar (faltam números)', 'Could not assess (numbers missing)'] };
  /* Farol do produto: junta o que a lista de ingredientes diz (aditivos de atenção, marcadores de ultraprocessado)
     com a tabela, quando há números. Sem ingredientes e sem números: cinza. */
  function farol(r, ad) {
    var a = r.avaliacao, temIngr = !!(r.ingredientes && r.ingredientes.length > 8), ultra = r.nova4.length >= 2, motivos = [];
    if (ad && ad.selo === 'muito') motivos.push(T('vários aditivos de atenção', 'several additives to watch'));
    else if (ad && ad.selo === 'pouco') motivos.push(ad.lista.length + ' ' + T('aditivo(s) de atenção', 'additive(s) to watch'));
    if (r.nova4.length) motivos.push(T('marcadores de ultraprocessado: ', 'ultra-processed markers: ') + r.nova4.join(', '));
    var al = { acucar: T('alto em açúcar', 'high in sugar'), saturada: T('alto em gordura saturada', 'high in saturated fat'), sodio: T('alto em sódio', 'high in sodium') };
    a.altos.forEach(function (x) { motivos.push(al[x]); });
    var nivel;
    if (!temIngr && a.nivel === 'cinza') nivel = 'cinza';
    // regra: 1 marcador cosmético (aroma, corante, emulsificante…) já é "processado com aditivos"; 2 ou mais, ou vários
    // aditivos de atenção, ou tabela no vermelho = ultraprocessado provável
    else if ((ad && ad.selo === 'muito') || a.nivel === 'vermelho' || ultra || (r.nova4.length && ((ad && ad.selo === 'pouco') || a.altos.length))) nivel = 'vermelho';
    else if ((ad && ad.selo === 'pouco') || r.nova4.length || a.nivel === 'amarelo') nivel = 'amarelo';
    else nivel = 'verde';
    var titulo = { verde: T('Sem sinais de ultraprocessado', 'No signs of ultra-processing'), amarelo: T('Atenção: processado com aditivos', 'Caution: processed with additives'), vermelho: T('Ultraprocessado (provável)', 'Ultra-processed (likely)'), cinza: T('Não deu para avaliar', 'Could not assess') }[nivel];
    return { nivel: nivel, titulo: titulo, motivos: motivos, temIngr: temIngr };
  }
  function showRotulo(r) {
    var box = HN.q('#rotres'); if (!box) return; var a = r.avaliacao, mine = HN.restrAll(), cf = r.alergenos.concat(r.podeConter).map(function (x) { return x.replace('*', ''); }).filter(function (x) { return mine.indexOf(x) >= 0; });
    var ad = HN.analisar ? HN.analisar(r.ingredientes) : null, f = farol(r, ad);
    var h = '';
    if (cf.length) h += '<div class="notice bad" role="alert"><b>⚠️ ' + T('Conflita com o seu perfil:', 'Conflicts with your profile:') + ' ' + cf.map(HN.alergName).join(', ') + '</b><br>' + T('Não consuma sem conferir a embalagem.', 'Do not eat without checking the package.') + '</div>';
    h += '<div class="big-sem ' + f.nivel + '"><span class="sem ' + f.nivel + '" style="width:1.6rem;height:1.6rem"></span><div><div>' + f.titulo + '</div>' + (f.motivos.length ? '<div class="small" style="font-weight:500">' + esc(f.motivos.join(' · ')) + '</div>' : (f.nivel === 'cinza' ? '<div class="small" style="font-weight:500">' + T('Não li a lista de ingredientes nem a tabela. Tire a foto mais de perto.', 'I read neither the ingredient list nor the table. Take the photo closer.') + '</div>' : '')) + '</div></div>';
    // aditivos logo abaixo do farol: é o que a pessoa quer ver primeiro
    if (ad) h += '<div class="card mt"><h3>' + T('Aditivos', 'Additives') + ' ' + HN.seloHtml(ad) + '</h3>' + HN.aditivosHtml(ad) + (f.temIngr ? '<p class="small muted">' + T('Ingredientes lidos: ', 'Ingredients read: ') + esc(r.ingredientes.slice(0, 220)) + (r.ingredientes.length > 220 ? '…' : '') + '</p>' : '') + '<button class="btn sec block mt" data-act="rot-cat">🏪 ' + T('Guardar no catálogo do mercado', 'Save to the store catalogue') + '</button></div>';
    var al = { acucar: ['Alto em açúcar adicionado', 'High in added sugar'], saturada: ['Alto em gordura saturada', 'High in saturated fat'], sodio: ['Alto em sódio', 'High in sodium'] };
    h += '<div class="card mt"><h3>' + T('Tabela nutricional', 'Nutrition table') + '</h3>' + (a.nivel === 'cinza' ? '<p class="muted">' + T('Sem números da tabela nesta foto. Para avaliar açúcar, gordura e sódio, tire outra foto só da tabela.', 'No table numbers in this photo. To assess sugar, fat and sodium, take another photo of the table alone.') + '</p>' : a.altos.length ? a.altos.map(function (x) { return '<p>🔺 <b>' + HN.tt(al[x]) + '</b> <span class="muted small">(' + T('limite ANVISA', 'ANVISA limit') + ': ' + (x === 'acucar' ? a.limites.sug + ' g' : x === 'saturada' ? a.limites.sat + ' g' : a.limites.na + ' mg') + ' /100 ' + (r.liquido ? 'ml' : 'g') + ')</span></p>'; }).join('') : '<p class="muted">' + T('Nenhum nutriente acima dos limites de "alto em".', 'No nutrient above the "high in" limits.') + '</p>') + (a.usouAcucarTotal ? '<p class="small muted">' + T('Açúcar adicionado não encontrado: usei açúcares totais como aproximação.', 'Added sugar not found: I used total sugars as an approximation.') + '</p>' : '') +
      (r.nova4.length ? '<p>📦 <b>' + T('Marcadores de ultraprocessado', 'Ultra-processed markers') + ':</b> ' + esc(r.nova4.join(', ')) + (a.ultra ? ' <span class="badge warn">NOVA 4?</span>' : '') + '</p><p class="small muted">' + T('Heurística pela lista de ingredientes — não é classificação oficial.', 'Heuristic from the ingredient list — not an official classification.') + '</p>' : '') + '</div>';
    h += '<div class="card"><h3>' + T('Confira os números (por 100 ' + (r.liquido ? 'ml' : 'g') + ')', 'Check the numbers (per 100 ' + (r.liquido ? 'ml' : 'g') + ')') + '</h3>' + (r.avisos.indexOf('porcao-convertida') >= 0 ? U.notice('info', T('Só achei valores por porção; converti para 100 g pela porção informada.', 'Only per-serving values found; converted to 100 g using the serving size.')) : '') + (r.avisos.indexOf('sem-100g') >= 0 ? U.notice('warn', T('Não achei a tabela. Digite os valores abaixo.', 'Table not found. Type the values below.')) : '') +
      NUTL.map(function (n) { return '<div class="row" style="margin:.3rem 0"><label class="grow small" for="n-' + n[0] + '">' + HN.tt([n[1], n[2]]) + '</label><input id="n-' + n[0] + '" type="number" inputmode="decimal" step="0.1" style="width:6.5rem" value="' + (r.per100[n[0]] != null ? r.per100[n[0]] : '') + '"></div>'; }).join('') +
      '<div class="row" style="margin:.3rem 0"><label class="grow small" for="n-por">' + T('Porção (g ou ml)', 'Serving (g or ml)') + '</label><input id="n-por" type="number" inputmode="decimal" style="width:6.5rem" value="' + (r.porcaoG || '') + '"></div>' +
      '<p class="small muted">' + T('Reconhecimento de texto pode errar: confira com a embalagem antes de salvar.', 'Text recognition can be wrong: check against the package before saving.') + '</p></div>';
    h += '<div class="card"><h3>' + T('Alérgenos', 'Allergens') + '</h3><div class="chips">' + (r.alergenos.length ? r.alergenos.map(function (x) { return '<span class="badge warn">' + T('contém', 'contains') + ' ' + HN.alergName(x) + '</span>'; }).join('') : '<span class="badge ok">' + T('nenhum declarado', 'none declared') + '</span>') + r.podeConter.map(function (x) { return '<span class="badge">' + T('pode conter', 'may contain') + ' ' + HN.alergName(x) + '</span>'; }).join('') + '</div><p class="small muted mt">* ' + T('encontrado nos ingredientes, sem declaração de alérgenos', 'found in ingredients, not declared as an allergen') + '</p>' +
      '<label class="f" for="n-nome">' + T('Nome do produto', 'Product name') + '</label><input id="n-nome" type="text" placeholder="' + T('Ex.: Biscoito recheado', 'E.g. Sandwich cookie') + '"><button class="btn block mt" data-act="rot-save">💾 ' + T('Salvar na minha base', 'Save to my base') + '</button></div>';
    box.innerHTML = h; box.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  // leva o que foi lido no rótulo para o catálogo (ingredientes + tabela), para comparar marcas depois
  A['rot-cat'] = function () {
    var r = HN.rotResult; if (!r || !HN.catEditar) return; var g = function (k) { var e = HN.q('#n-' + k); return e && e.value !== '' ? +e.value : null; };
    HN.catEditar({ nome: (HN.q('#n-nome') || {}).value || '', ingredientes: r.ingredientes || '', fonte: 'rotulo', porcao: +((HN.q('#n-por') || {}).value) || 0, alergenos: r.alergenos || [],
      nutri: { kcal: g('kcal'), p: g('p'), c: g('c'), f: g('f'), fib: g('fib'), na: g('na'), sat: g('sat'), acu: g('sug') } });
  };
  A['rot-save'] = function () {
    var r = HN.rotResult; if (!r) return; var g = function (k) { var v = HN.q('#n-' + k).value; return v === '' ? 0 : +v; }, nome = HN.q('#n-nome').value.trim();
    if (!nome) { HN.toast(T('Dê um nome ao produto.', 'Name the product.')); HN.q('#n-nome').focus(); return; }
    var por = +HN.q('#n-por').value || 0, nova = r.avaliacao.ultra ? 4 : 3;
    var prod = { id: 'p_' + HN.id(), pt: nome, en: nome, group: 'produto', kcal: g('kcal'), p: g('p'), c: g('c'), f: g('f'), fib: g('fib'), na: g('na'), allergens: r.alergenos, nova: nova, measures: por ? [['porção', 'serving', por]] : [], src: 'CUSTOM_OCR' };
    var l = S.get('produtos', []); l.push(prod); S.set('produtos', l); HN.registerFood(prod); HN.toast(T('Produto salvo. Já aparece em Alimentos e no diário.', 'Product saved. It now shows in Foods and the diary.')); HN.go('/alimento/' + prod.id);
  };
  V.rotulos = function () {
    var prods = (S.get('produtos', []) || []), h = U.title('🏷️', T('Ler rótulo', 'Read a label'), T('Tabela nutricional, ingredientes e alérgenos', 'Nutrition table, ingredients and allergens')) + widget('rot') + '<div id="rotres"></div>';
    if (prods.length) h += '<div class="card"><h3>' + T('Meus produtos', 'My products') + '</h3><div class="list">' + prods.slice().reverse().map(function (p) { return '<button class="li" data-act="go" data-arg="/alimento/' + p.id + '"><span class="e">🏷️</span><span class="grow"><div class="t">' + esc(p.pt) + '</div><div class="s">' + p.kcal + ' kcal/100 g</div></span><button class="ib" data-act="prod-del" data-arg="' + p.id + '" aria-label="' + T('Apagar', 'Delete') + '">🗑</button></button>'; }).join('') + '</div></div>';
    h += '<button class="btn sec block" data-act="food-new">＋ ' + T('Cadastrar alimento sem rótulo', 'Add a food without a label') + '</button>';
    return h;
  };
  A['prod-del'] = function (id, el, ev) { ev.stopPropagation(); HN.confirm(T('Apagar este produto?', 'Delete this product?'), T('Apagar', 'Delete'), { danger: true }).then(function (ok) { if (!ok) return; S.set('produtos', (S.get('produtos', []) || []).filter(function (p) { return p.id !== id; })); delete HN.foods[id]; HN.foodList = HN.foodList.filter(function (f) { return f.id !== id; }); setTimeout(HN.refresh, 50); }); };

  /* ---------- laudo de bioimpedância ---------- */
  var BIOL = [['peso', 'Peso (kg)', 'Weight (kg)'], ['mme', 'Massa de músculo esquelético (kg)', 'Skeletal muscle mass (kg)'], ['massaGorda', 'Massa de gordura (kg)', 'Fat mass (kg)'], ['gordura', 'Gordura corporal (%)', 'Body fat (%)'], ['act', 'Água corporal total (L)', 'Total body water (L)'], ['mlg', 'Massa livre de gordura (kg)', 'Fat-free mass (kg)'], ['tmb', 'Taxa metabólica basal (kcal)', 'Basal metabolic rate (kcal)'], ['gv', 'Gordura visceral (nível)', 'Visceral fat (level)']];
  function bioForm(b) { return '<div class="card"><h3>' + T('Confira os valores', 'Check the values') + '</h3>' + BIOL.map(function (n) { return '<div class="row" style="margin:.3rem 0"><label class="grow small" for="b-' + n[0] + '">' + HN.tt([n[1], n[2]]) + '</label><input id="b-' + n[0] + '" type="number" inputmode="decimal" step="0.1" style="width:6.5rem" value="' + (b[n[0]] != null ? b[n[0]] : '') + '"></div>'; }).join('') + '<p class="small muted">' + T('Laudos têm layouts diferentes: valores não reconhecidos ficam em branco. Confira e complete.', 'Reports have different layouts: unrecognised values stay blank. Check and complete.') + '</p></div>'; }
  function readBio() { var o = {}; BIOL.forEach(function (n) { var v = HN.q('#b-' + n[0]).value; if (v !== '') o[n[0]] = +v; }); return o; }
  function showBio(b) { var box = HN.q('#biores'); if (!box) { return; } box.innerHTML = bioForm(b) + '<button class="btn block" data-act="bio-save">💾 ' + T('Salvar no histórico corporal', 'Save to body history') + '</button>'; box.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
  A['bio-save'] = function () { var o = readBio(); if (!Object.keys(o).length) { HN.toast(T('Nenhum valor para salvar.', 'No value to save.')); return; } o.id = HN.id(); o.ts = Date.now(); o.src = 'ocr'; var l = S.get('corpo', []); l.push(o); S.set('corpo', l); HN.toast(T('Salvo no histórico ✓', 'Saved to history ✓')); HN.go('/corpo/medidas'); };
  HN.bioSheet = function (cb) {
    HN.bioCb = cb; HN.sheet(T('Importar de laudo', 'Import from report'), widget('bio') + '<div id="biores"></div><div class="row mt"><button class="btn grow" data-act="bio-use">' + T('Usar estes valores', 'Use these values') + '</button></div>');
  };
  A['bio-use'] = function () { var o = HN.q('#biores') && HN.q('#b-peso') ? readBio() : (HN.bioResult || {}); if (!Object.keys(o).length) { HN.toast(T('Toque em “Interpretar texto” primeiro.', 'Tap “Interpret text” first.')); return; } var cb = HN.bioCb; HN.layer.close(); if (cb) setTimeout(function () { cb(o); }, 80); };


  /* ---------- alimento próprio (quando o alimento não está na base) ---------- */
  A['food-new'] = function () {
    var F = [['kcal', 'Energia (kcal)', 'Energy (kcal)'], ['p', 'Proteínas (g)', 'Protein (g)'], ['c', 'Carboidratos (g)', 'Carbs (g)'], ['f', 'Gorduras (g)', 'Fat (g)'], ['fib', 'Fibras (g)', 'Fiber (g)'], ['na', 'Sódio (mg)', 'Sodium (mg)']];
    HN.sheet(T('Novo alimento', 'New food'), '<p class="small muted">' + T('Não achou na base? Cadastre em 20 segundos (valores por 100 g, da embalagem). Fica só no seu aparelho.', 'Not in the base? Add it in 20 seconds (values per 100 g, from the package). Stays on your device only.') + '</p><label class="f" for="nf-nome">' + T('Nome', 'Name') + '</label><input id="nf-nome" type="text" autofocus>' +
      '<div class="row wrap">' + F.map(function (x) { return '<div style="flex:1 1 7rem"><label class="f" for="nf-' + x[0] + '">' + HN.tt([x[1], x[2]]) + '</label><input id="nf-' + x[0] + '" type="number" inputmode="decimal" step="0.1" min="0"></div>'; }).join('') + '</div>' +
      '<label class="f" for="nf-por">' + T('Porção usual (g) — opcional', 'Usual serving (g) — optional') + '</label><input id="nf-por" type="number" inputmode="decimal" min="0"><button class="btn block mt" data-act="food-new-save">💾 ' + T('Salvar alimento', 'Save food') + '</button>');
  };
  A['food-new-save'] = function () {
    var nome = HN.q('#nf-nome').value.trim(); if (!nome) { HN.toast(T('Dê um nome ao alimento.', 'Name the food.')); return; }
    var g = function (k) { return +HN.q('#nf-' + k).value || 0; }, por = g('por');
    var prod = { id: 'p_' + HN.id(), pt: nome, en: nome, group: 'produto', kcal: g('kcal'), p: g('p'), c: g('c'), f: g('f'), fib: g('fib'), na: g('na'), allergens: [], nova: 3, measures: por ? [['porção', 'serving', por]] : [], src: 'CUSTOM' };
    var l = S.get('produtos', []); l.push(prod); S.set('produtos', l); HN.registerFood(prod); HN.layer.close();
    setTimeout(function () { HN.toast(T('Alimento salvo ✓', 'Food saved ✓')); if (HN.draft && HN.route().name === 'diario') { HN.addDraftFood(prod.id, por || 100); } else HN.refresh(); }, 120);
  };

  /* ================= CORPO ================= */
  /* ---------- resumos das duas visões ---------- */
  function lastOf(l, k) { for (var i = 0; i < l.length; i++) if (l[i][k] != null) return l[i]; return null; } // l: mais novo primeiro
  function prevOf(l, k) { var n = 0; for (var i = 0; i < l.length; i++) if (l[i][k] != null && ++n === 2) return l[i]; return null; }
  function delta(a, b, k, d) { if (!a || !b) return ''; var x = a[k] - b[k]; if (Math.abs(x) < Math.pow(10, -(d || 0))) return ' <span class="muted small">=</span>'; return ' <span class="muted small num">(' + (x > 0 ? '+' : '−') + HN.num(Math.abs(x), d || 0) + ')</span>'; }
  function quantHtml(l, canW) {
    if (!l.length) return '';
    var p = HN.perfil() || {}, tiles = [], c = lastOf(l, 'cintura'), q = lastOf(l, 'quadril'), g = lastOf(l, 'gordura'), w = canW ? lastOf(l, 'peso') : null, m = lastOf(l, 'mme');
    if (c && q && q.quadril) { var rcq = c.cintura / q.quadril, lim = p.sexo === 'M' ? 0.90 : 0.85; tiles.push('<div><b class="num sens">' + HN.num(rcq, 2) + '</b><span>' + T('cintura ÷ quadril', 'waist ÷ hip') + '</span><em>' + T('referência OMS', 'WHO reference') + ' ' + HN.num(lim, 2) + '</em></div>'); }
    if (c) tiles.push('<div><b class="num sens">' + HN.num(c.cintura, 1) + ' cm' + delta(c, prevOf(l, 'cintura'), 'cintura', 1) + '</b><span>' + T('cintura', 'waist') + '</span></div>');
    if (g) tiles.push('<div><b class="num sens">' + HN.num(g.gordura, 1) + '%' + delta(g, prevOf(l, 'gordura'), 'gordura', 1) + '</b><span>' + T('gordura corporal', 'body fat') + '</span></div>');
    if (w && g && w.peso && Math.abs(w.ts - g.ts) < 3 * 864e5) tiles.push('<div><b class="num sens">' + HN.num(w.peso * (1 - g.gordura / 100), 1) + ' kg</b><span>' + T('massa livre de gordura', 'fat-free mass') + '</span></div>');
    else if (m) tiles.push('<div><b class="num sens">' + HN.num(m.mme, 1) + ' kg' + delta(m, prevOf(l, 'mme'), 'mme', 1) + '</b><span>' + T('músculo esquelético', 'skeletal muscle') + '</span></div>');
    if (!tiles.length) return '';
    return '<div class="card"><h3>📊 ' + T('Resumo', 'Summary') + '</h3><div class="stat qstat">' + tiles.join('') + '</div><p class="t-caption muted mt">' + T('Entre parênteses: diferença para o registro anterior. Números ajudam a conversar com a nutricionista; não definem você.', 'In brackets: change since the previous entry. Numbers help the talk with your dietitian; they do not define you.') + '</p></div>';
  }
  function qualHtml(l) {
    var from = HN.dayKey(Date.now() - 6 * 864e5), wk = l.filter(function (x) { return x.day >= from; });
    if (!wk.length) return '';
    var avg = function (k) { var v = wk.filter(function (x) { return x[k] != null; }).map(function (x) { return x[k]; }); return v.length ? v.reduce(function (a, b) { return a + b; }, 0) / v.length : null; };
    var br = wk.filter(function (x) { return x.bristol != null; }), ok = br.filter(function (x) { return x.bristol >= 3 && x.bristol <= 4; }).length;
    var face = function (v) { return v == null ? '–' : v >= 4 ? '😄' : v >= 3 ? '🙂' : v >= 2 ? '😐' : '😕'; };
    return '<div class="card"><h3>🌿 ' + T('Últimos 7 dias', 'Last 7 days') + '</h3><div class="stat"><div><b>' + face(avg('disp')) + '</b><span>' + T('energia', 'energy') + '</span></div><div><b>' + face(avg('sonoQ')) + '</b><span>' + T('sono', 'sleep') + '</span></div><div><b class="num">' + (br.length ? ok + '/' + br.length : '–') + '</b><span>' + T('dias de intestino confortável (Bristol 3–4)', 'comfortable gut days (Bristol 3–4)') + '</span></div></div></div>';
  }

  /* ---------- conquistas sem balança ----------
   * Contam QUALQUER dia dos últimos 30 — nunca "dias seguidos": nada zera, nada de culpa (sem streaks). */
  HN.nsv = function () {
    var since = Date.now() - 30 * 864e5, d30 = HN.dayKey(since);
    var diario = (S.get('diario', []) || []).filter(function (e) { return e.ts >= since; }), sinais = (S.get('sinais', []) || []).filter(function (e) { return e.ts >= since; }), bem = (S.get('bem', []) || []).filter(function (e) { return e.day >= d30; });
    var cnt = function (arr, f) { return arr.filter(f).length; };
    var dias = function (arr) { var u = {}; arr.forEach(function (e) { u[HN.dayKey(e.ts)] = 1; }); return Object.keys(u).length; };
    var rel7 = bem.slice(-7), rel14 = bem.slice(-14, -7), av = function (a) { var v = a.filter(function (x) { return x.relacao != null; }).map(function (x) { return x.relacao; }); return v.length >= 2 ? v.reduce(function (a2, b) { return a2 + b; }, 0) / v.length : null; };
    var a1 = av(rel7), a0 = av(rel14);
    return [
      { id: 'atencao', e: '🧘', n: cnt(diario, function (e) { return e.hb != null || e.sa != null; }), meta: 10, pt: 'Refeições com atenção à fome', en: 'Meals with hunger awareness' },
      { id: 'checkin', e: '🎚️', n: dias(sinais), meta: 7, pt: 'Dias em que você escutou o corpo', en: 'Days you listened to your body' },
      { id: 'sono', e: '😴', n: cnt(bem, function (e) { return e.sonoQ >= 4; }), meta: 7, pt: 'Noites de sono que descansou', en: 'Nights of restful sleep' },
      { id: 'energia', e: '⚡', n: cnt(bem, function (e) { return e.disp >= 4; }), meta: 7, pt: 'Dias com boa disposição', en: 'Days with good energy' },
      { id: 'intestino', e: '🌿', n: cnt(bem, function (e) { return e.bristol >= 3 && e.bristol <= 4; }), meta: 7, pt: 'Dias de intestino confortável', en: 'Comfortable gut days' },
      { id: 'leveza', e: '🌱', n: a1 != null && a0 != null && a1 > a0 + 0.3 ? 1 : 0, meta: 1, pt: 'Relação mais leve com a comida', en: 'Lighter relationship with food' }
    ];
  };
  function nsvHtml() {
    var l = HN.nsv(), got = l.filter(function (x) { return x.n >= x.meta; }), next = l.filter(function (x) { return x.n < x.meta && x.meta > 1; }).sort(function (a, b) { return b.n / b.meta - a.n / a.meta; }).slice(0, Math.max(0, 3 - got.length));
    var card = function (x, on) { return '<div class="nsv' + (on ? ' on' : '') + '"><span class="nsv-e" aria-hidden="true">' + x.e + '</span><b>' + HN.tt([x.pt, x.en]) + '</b><span class="t-caption">' + (on ? (x.meta > 1 ? x.n + ' ' + T('nos últimos 30 dias', 'in the last 30 days') : T('nas últimas semanas', 'in recent weeks')) : x.n + ' ' + T('de', 'of') + ' ' + x.meta + ' · ' + T('qualquer dia conta', 'any day counts')) + '</span>' + (on ? '' : '<i style="--p:' + Math.round(x.n / x.meta * 100) + '%"></i>') + '</div>'; };
    return '<div class="card"><h3>🏅 ' + T('Conquistas sem balança', 'Non-scale victories') + '</h3><div class="nsv-row">' + got.map(function (x) { return card(x, true); }).join('') + next.map(function (x) { return card(x, false); }).join('') + '</div><p class="t-caption muted mt">' + T('Contam os últimos 30 dias, sem precisar ser seguido: um dia fora não apaga nada.', 'They count the last 30 days, no need to be in a row: a day off erases nothing.') + '</p></div>';
  }
  HN.ins['cfg-ocultar'] = function (v) { HN.setCfg({ ocultar: v }); HN.applyCfg(); };
  // toque num número oculto: mostra por 3 s e esconde de novo
  document.addEventListener('click', function (e) { var el = e.target.closest && e.target.closest('.sens, .sens-box'); if (!el || !document.documentElement.hasAttribute('data-ocultar')) return; el.classList.add('peek'); setTimeout(function () { el.classList.remove('peek'); }, 3000); });

  var CTABS = [['bem', '🌿 Como me sinto', '🌿 How I feel'], ['medidas', '📊 Números', '📊 Numbers'], ['exame', '📄 Laudo', '📄 Report']];
  var bd = { disp: null, sonoQ: null, bristol: null, clareza: null, relacao: null, sonoH: '' };
  var EM5 = ['😞', '😕', '😐', '🙂', '😄'];
  function five(name, val) { return '<div class="chips">' + [1, 2, 3, 4, 5].map(function (n) { return '<button class="chip' + (val === n ? ' on' : '') + '" data-act="chip" data-arg="' + name + '|' + n + '" aria-pressed="' + (val === n) + '">' + EM5[n - 1] + ' ' + n + '</button>'; }).join('') + '</div>'; }
  ['disp', 'sonoQ', 'clareza', 'relacao'].forEach(function (k) { HN.chipFn['bd.' + k] = function (v) { bd[k] = +v; HN.refresh(); }; });
  HN.chipFn['bd.bristol'] = function (v) { bd.bristol = +v; HN.refresh(); };
  HN.ins['bd-h'] = function (v) { bd.sonoH = v; };
  V.corpo = function (parts) {
    var tab = parts[1] || 'bem', hid = !!HN.cfg().ocultar, h = U.title('📏', T('Corpo e bem-estar', 'Body & well-being'), T('Evolução que vai além da balança', 'Progress beyond the scale')) +
      '<label class="chk privacy-guard"><input type="checkbox" data-in="cfg-ocultar" ' + (hid ? 'checked' : '') + '><span class="tx">🙈 ' + T('Ocultar números sensíveis em público (toque para espiar)', 'Hide sensitive numbers in public (tap to peek)') + '</span></label>' +
      nsvHtml() +
      '<div class="seg dual" role="tablist">' + CTABS.map(function (t) { var on = t[0] === tab; return '<button role="tab" aria-selected="' + on + '" class="' + (on ? 'on' : '') + '" data-act="go" data-arg="/corpo/' + t[0] + '">' + HN.tt([t[1], t[2]]) + '</button>'; }).join('') + '</div>';
    if (tab === 'bem') {
      var l = S.get('bem', []), today = HN.today(), td = l.filter(function (x) { return x.day === today; })[0];
      if (td && bd.disp == null && !bd._init) { bd = { disp: td.disp, sonoQ: td.sonoQ, bristol: td.bristol, clareza: td.clareza, relacao: td.relacao, sonoH: td.sonoH || '', _init: 1 }; }
      h += qualHtml(l) + '<div class="card"><h3>' + T('Como foi seu dia?', 'How was your day?') + '</h3><label class="f">' + T('Disposição física', 'Physical energy') + '</label>' + five('bd.disp', bd.disp) + '<label class="f">' + T('Qualidade do sono', 'Sleep quality') + '</label>' + five('bd.sonoQ', bd.sonoQ) + '<label class="f" for="bdh">' + T('Horas dormidas', 'Hours slept') + '</label><input id="bdh" type="number" inputmode="decimal" min="0" max="16" step="0.5" value="' + esc(bd.sonoH) + '" data-in="bd-h" style="max-width:8rem"><label class="f">' + T('Clareza mental', 'Mental clarity') + '</label>' + five('bd.clareza', bd.clareza) + '<label class="f">' + T('Como está sua relação com a comida hoje?', 'How is your relationship with food today?') + '</label>' + five('bd.relacao', bd.relacao) + '<label class="f">' + T('Intestino (Escala de Bristol)', 'Bowel (Bristol scale)') + '</label>' + U.chips('bd.bristol', C.bristol.map(function (b, i) { return [String(i + 1), b[0], b[1]]; }), bd.bristol != null ? String(bd.bristol) : null, false) + '<button class="btn block mt" data-act="bd-save">' + T('Salvar o dia', 'Save the day') + ' ✓</button></div>';
      var days = [], i; for (i = 13; i >= 0; i--) days.push(HN.dayKey(Date.now() - i * 864e5));
      var by = {}; l.forEach(function (x) { by[x.day] = x; });
      if (l.length >= 2) {
        var ser = function (k, name, color) { return { name: name, color: color, values: days.map(function (d) { return by[d] && by[d][k] != null ? by[d][k] : null; }) }; };
        h += '<div class="card"><h3>' + T('Últimos 14 dias', 'Last 14 days') + '</h3>' + U.line({ aria: T('Bem-estar nos últimos 14 dias', 'Well-being in the last 14 days'), labels: days.map(function (d) { return d.slice(8); }), min: 1, max: 5, series: [ser('disp', T('disposição', 'energy'), '#e8590c'), ser('sonoQ', T('sono', 'sleep'), '#4263eb'), ser('clareza', T('clareza', 'clarity'), '#9c36b5'), ser('relacao', T('relação c/ comida', 'food relationship'), '#168a5c')] }) + '</div>';
        var avg = function (arr, k) { var v = arr.filter(function (x) { return x[k] != null; }).map(function (x) { return x[k]; }); return v.length ? v.reduce(function (a, b) { return a + b; }, 0) / v.length : null; };
        var rec = l.filter(function (x) { return x.day >= days[7]; }), prev = l.filter(function (x) { return x.day >= days[0] && x.day < days[7]; });
        if (rec.length >= 2 && prev.length >= 2) { var a1 = avg(rec, 'relacao'), a0 = avg(prev, 'relacao'); if (a1 != null && a0 != null) h += U.notice(a1 > a0 + .3 ? 'ok' : 'info', (a1 > a0 + .3 ? '🌱 ' + T('Sua relação com a comida está melhorando nos últimos dias.', 'Your relationship with food has been improving lately.') : T('Sua relação com a comida está estável. Oscilar é normal.', 'Your relationship with food is steady. Fluctuating is normal.'))); }
      } else h += U.notice('info', T('Com 2 ou mais dias registrados aparece o gráfico de evolução.', 'With 2 or more days logged, the progress chart appears.'));
    }
    if (tab === 'medidas') {
      var al = HN.alertas(), canW = al.indexOf('ta') < 0 && al.indexOf('menor') < 0, l2 = S.get('corpo', []).slice().sort(function (a, b) { return b.ts - a.ts; }), wOn = !!HN.cfg().mostrarPeso && canW;
      h += U.notice('info', T('Sem fotos de “antes e depois”: o Código de Ética do nutricionista (CFN 599/2018) não permite usá-las para atribuir resultados.', 'No “before and after” photos: the dietitian code of ethics (CFN 599/2018) does not allow using them to attribute results.'));
      h += '<div class="card"><h3>' + T('Novo registro', 'New entry') + '</h3>' + (canW ? '<label class="chk"><input type="checkbox" data-in="show-w" ' + (wOn ? 'checked' : '') + '><span class="tx">' + T('Quero registrar peso (opcional)', 'I want to log weight (optional)') + '</span></label>' : '<p class="small muted">' + T('Por cuidado, o app não pede peso no seu perfil.', 'For care, the app does not ask for weight on your profile.') + '</p>') +
        '<div class="row wrap">' + [['peso', 'Peso (kg)', 'Weight (kg)', wOn], ['cintura', 'Cintura (cm)', 'Waist (cm)', true], ['quadril', 'Quadril (cm)', 'Hip (cm)', true], ['abdomen', 'Abdômen (cm)', 'Abdomen (cm)', true], ['braco', 'Braço (cm)', 'Arm (cm)', true], ['coxa', 'Coxa (cm)', 'Thigh (cm)', true], ['gordura', '% gordura', 'Body fat %', true]].filter(function (x) { return x[3]; }).map(function (x) { return '<div style="flex:1 1 7rem"><label class="f" for="m-' + x[0] + '">' + HN.tt([x[1], x[2]]) + '</label><input id="m-' + x[0] + '" type="number" inputmode="decimal" step="0.1"></div>'; }).join('') + '</div><button class="btn block mt" data-act="med-save">' + T('Salvar medidas', 'Save measures') + '</button></div>';
      h += quantHtml(l2, canW);
      if (l2.length) {
        var keys = ['cintura', 'peso', 'quadril', 'abdomen', 'braco', 'coxa', 'gordura'].filter(function (k) { return k !== 'peso' || canW; });
        var key = HN.medKey && keys.indexOf(HN.medKey) >= 0 ? HN.medKey : 'cintura', pts = l2.slice().reverse().filter(function (x) { return x[key] != null; });
        h += '<div class="card sens-box"><h3>' + T('Evolução', 'Progress') + '</h3><div class="chips mb">' + keys.map(function (k) { return '<button class="chip' + (k === key ? ' on' : '') + '" data-act="med-key" data-arg="' + k + '">' + k + '</button>'; }).join('') + '</div>' + (pts.length >= 2 ? U.line({ aria: key, labels: pts.map(function (x) { return HN.fmtDate(x.ts).slice(0, 6); }), min: Math.floor(Math.min.apply(null, pts.map(function (x) { return x[key]; }))) - 1, max: Math.ceil(Math.max.apply(null, pts.map(function (x) { return x[key]; }))) + 1, series: [{ name: key, color: '#168a5c', values: pts.map(function (x) { return x[key]; }) }] }) : '<p class="small muted">' + T('Registre ao menos 2 vezes para ver o gráfico.', 'Log at least twice to see the chart.') + '</p>') + '</div>';
        h += '<div class="card sens-box"><h3>' + T('Histórico', 'History') + '</h3><div class="list">' + l2.slice(0, 20).map(function (x) { return '<div class="li" style="cursor:default"><span class="grow"><div class="t">' + HN.fmtDate(x.ts) + (x.src === 'ocr' ? ' <span class="badge">OCR</span>' : '') + '</div><div class="s">' + BIOL.concat([['cintura', 'Cintura', 'Waist'], ['quadril', 'Quadril', 'Hip'], ['abdomen', 'Abdômen', 'Abdomen'], ['braco', 'Braço', 'Arm'], ['coxa', 'Coxa', 'Thigh']]).filter(function (n) { return x[n[0]] != null && (n[0] !== 'peso' || canW); }).map(function (n) { return HN.tt([n[1], n[2]]).split(' (')[0] + ' ' + x[n[0]]; }).join(' · ') + '</div></div><button class="ib" data-act="med-del" data-arg="' + x.id + '" aria-label="' + T('Apagar', 'Delete') + '">🗑</button></div>'; }).join('') + '</div></div>';
      }
    }
    if (tab === 'exame') {
      h += U.notice('info', T('Leia a folha de bioimpedância (InBody e similares) ou laudos. Os campos reconhecidos preenchem o histórico sem digitação. Sempre confira.', 'Read the bioimpedance sheet (InBody and similar) or reports. Recognised fields fill the history without typing. Always check.')) + widget('bio') + '<div id="biores"></div>';
    }
    return h;
  };
  A['bd-save'] = function () {
    if (bd.disp == null && bd.sonoQ == null && bd.clareza == null && bd.relacao == null && bd.bristol == null) { HN.toast(T('Marque ao menos um item.', 'Tick at least one item.')); return; }
    var l = S.get('bem', []).filter(function (x) { return x.day !== HN.today(); }); l.push({ day: HN.today(), disp: bd.disp, sonoQ: bd.sonoQ, sonoH: bd.sonoH, bristol: bd.bristol, clareza: bd.clareza, relacao: bd.relacao }); l.sort(function (a, b) { return a.day < b.day ? -1 : 1; }); S.set('bem', l.slice(-400)); HN.toast(T('Dia salvo ✓', 'Day saved ✓')); HN.refresh();
  };
  HN.ins['show-w'] = function (v) { HN.setCfg({ mostrarPeso: v }); HN.refresh(); };
  A['med-key'] = function (k) { HN.medKey = k; HN.refresh(); };
  A['med-save'] = function () { var o = { id: HN.id(), ts: Date.now() }, n = 0; ['peso', 'cintura', 'quadril', 'abdomen', 'braco', 'coxa', 'gordura'].forEach(function (k) { var e = HN.q('#m-' + k); if (e && e.value !== '') { o[k] = +e.value; n++; } }); if (!n) { HN.toast(T('Preencha ao menos um campo.', 'Fill at least one field.')); return; } var l = S.get('corpo', []); l.push(o); S.set('corpo', l); HN.toast(T('Medidas salvas ✓', 'Measures saved ✓')); HN.refresh(); };
  A['med-del'] = function (id) { S.set('corpo', S.get('corpo', []).filter(function (x) { return x.id !== id; })); HN.refresh(); };

  /* ================= TELENUTRIÇÃO ================= */
  var DB = null;
  function idb() { return new Promise(function (ok, fail) { if (DB) return ok(DB); if (S.isVolatile() || !window.indexedDB) return fail(new Error('sem IndexedDB')); var r = indexedDB.open('hypernutry', 1); r.onupgradeneeded = function () { r.result.createObjectStore('docs', { keyPath: 'id' }); }; r.onsuccess = function () { DB = r.result; ok(DB); }; r.onerror = function () { fail(r.error); }; }); }
  function tx(mode, fn) { return idb().then(function (db) { return new Promise(function (ok, fail) { var t = db.transaction('docs', mode), st = t.objectStore('docs'), rq = fn(st); t.oncomplete = function () { ok(rq && rq.result); }; t.onerror = function () { fail(t.error); }; }); }); }
  V.tele = function () {
    var ped = S.get('telePedidos', []), h = U.title('🩺', T('Telenutrição', 'Telenutrition'), T('Acompanhamento com nutricionista', 'Follow-up with a dietitian'));
    h += U.notice('info', T('<b>Em preparação.</b> A sala de vídeo criptografada e o prontuário eletrônico serão ativados quando a nutricionista responsável concluir o cadastro (e-Nutricionista) e a infraestrutura segura, conforme a Resolução CFN nº 760/2023. Por ora você já pode pedir um horário, guardar documentos e exportar seu diário.', '<b>In preparation.</b> The encrypted video room and e-record will be enabled once the responsible dietitian completes registration (e-Nutricionista) and secure infrastructure, per CFN Resolution 760/2023. For now you can request a slot, keep documents and export your diary.'));
    h += '<div class="card"><h3>📅 ' + T('Pedir um horário', 'Request a slot') + '</h3><label class="f" for="tm">' + T('Motivo', 'Reason') + '</label><select id="tm"><option value="inicial">' + T('Primeira consulta', 'First consultation') + '</option><option value="retorno">' + T('Retorno', 'Follow-up') + '</option><option value="duvida">' + T('Dúvida pontual', 'Quick question') + '</option></select><label class="f" for="tj">' + T('Melhor período', 'Best time of day') + '</label><select id="tj"><option value="manha">' + T('Manhã', 'Morning') + '</option><option value="tarde">' + T('Tarde', 'Afternoon') + '</option><option value="noite">' + T('Noite', 'Evening') + '</option></select><label class="f" for="to">' + T('Observação', 'Note') + '</label><textarea id="to" style="min-height:4rem"></textarea><button class="btn block mt" data-act="tele-req">' + T('Registrar pedido', 'Register request') + '</button><p class="small muted mt">' + T('O pedido fica salvo neste aparelho até a integração com a agenda da profissional ser ligada.', 'The request is stored on this device until integration with the dietitian\'s agenda is switched on.') + '</p>' + (ped.length ? '<div class="list mt">' + ped.slice().reverse().map(function (p) { return '<div class="li" style="cursor:default"><span class="e">📅</span><span class="grow"><div class="t">' + esc(p.motivo) + ' · ' + esc(p.janela) + '</div><div class="s">' + HN.fmtDate(p.ts) + ' · ' + T('aguardando integração', 'awaiting integration') + '</div></span></div>'; }).join('') + '</div>' : '') + '</div>';
    h += '<div class="card"><h3>📤 ' + T('Exportar meu diário alimentar', 'Export my food diary') + '</h3><p class="small muted">' + T('Gera um arquivo para levar à consulta. Você escolhe com quem compartilhar.', 'Creates a file to bring to a consultation. You choose who to share it with.') + '</p><div class="row wrap"><button class="btn sec sm" data-act="exp-csv">CSV</button><button class="btn sec sm" data-act="exp-json">JSON</button></div></div>';
    h += '<div class="card"><h3>📁 ' + T('Documentos clínicos', 'Clinical documents') + '</h3><p class="small muted">' + T('Exames e laudos ficam só neste aparelho. Criptografia local com senha está no roadmap.', 'Tests and reports stay on this device only. Local password encryption is on the roadmap.') + '</p><label class="btn sec sm" for="docf">＋ ' + T('Anexar documento', 'Attach document') + '</label><input id="docf" type="file" accept="image/*,application/pdf" class="sr" data-in="doc-file"><div id="docs" class="mt"></div></div>';
    h += '<details class="acc"><summary>' + T('O que a lei diz', 'What the rules say') + '</summary><div class="small"><p>' + T('Prescrição dietética individualizada e diagnóstico nutricional são atividades privativas do nutricionista (Lei 8.234/1991). Telenutrição segue a Res. CFN 760/2023: cadastro ativo no e-Nutricionista e prontuário eletrônico seguro. Este app é de apoio e educação: não prescreve.', 'Individual dietary prescription and nutritional diagnosis are restricted to dietitians (Law 8,234/1991). Telenutrition follows CFN Res. 760/2023: active e-Nutricionista registration and a secure e-record. This app supports and educates: it does not prescribe.') + '</p></div></details>';
    return h;
  };
  HN.after.tele = function () { listDocs(); };
  function listDocs() {
    var box = HN.q('#docs'); if (!box) return;
    if (S.isVolatile()) { box.innerHTML = '<p class="small muted">' + T('Indisponível no modo visitante.', 'Unavailable in guest mode.') + '</p>'; return; }
    tx('readonly', function (st) { return st.getAll(); }).then(function (all) { box.innerHTML = (all && all.length) ? '<div class="list">' + all.sort(function (a, b) { return b.ts - a.ts; }).map(function (d) { return '<div class="li" style="cursor:default"><span class="e">' + (d.type.indexOf('pdf') >= 0 ? '📄' : '🖼️') + '</span><span class="grow"><div class="t">' + esc(d.name) + '</div><div class="s">' + HN.fmtDate(d.ts) + ' · ' + HN.num(d.size / 1024) + ' KB</div></span><button class="btn sm sec" data-act="doc-open" data-arg="' + d.id + '">' + T('Abrir', 'Open') + '</button><button class="ib" data-act="doc-del" data-arg="' + d.id + '" aria-label="' + T('Apagar', 'Delete') + '">🗑</button></div>'; }).join('') + '</div>' : '<p class="small muted">' + T('Nenhum documento.', 'No documents.') + '</p>'; }, function () { box.innerHTML = '<p class="small muted">' + T('Armazenamento de arquivos indisponível neste navegador.', 'File storage unavailable in this browser.') + '</p>'; });
  }
  HN.ins['doc-file'] = function (v, el) {
    var f = el.files && el.files[0]; if (!f) return; if (f.size > 15 * 1024 * 1024) { HN.toast(T('Arquivo grande demais (máx. 15 MB).', 'File too large (max 15 MB).')); return; }
    tx('readwrite', function (st) { return st.put({ id: HN.id(), name: f.name, type: f.type || 'application/octet-stream', size: f.size, ts: Date.now(), blob: f }); }).then(function () { HN.toast(T('Documento guardado ✓', 'Document saved ✓')); listDocs(); }, function () { HN.toast(T('Não consegui guardar o arquivo.', 'Could not store the file.')); });
  };
  A['doc-open'] = function (id) { tx('readonly', function (st) { return st.get(id); }).then(function (d) { if (d) { var u = URL.createObjectURL(d.blob); window.open(u, '_blank'); setTimeout(function () { URL.revokeObjectURL(u); }, 60000); } }); };
  A['doc-del'] = function (id) { HN.confirm(T('Apagar este documento?', 'Delete this document?'), T('Apagar', 'Delete'), { danger: true }).then(function (ok) { if (ok) tx('readwrite', function (st) { return st.delete(id); }).then(function () { setTimeout(listDocs, 60); }); }); };
  A['tele-req'] = function () { var l = S.get('telePedidos', []); l.push({ ts: Date.now(), motivo: HN.q('#tm').selectedOptions[0].text, janela: HN.q('#tj').selectedOptions[0].text, obs: HN.q('#to').value.slice(0, 300) }); S.set('telePedidos', l); HN.toast(T('Pedido registrado ✓', 'Request registered ✓')); HN.refresh(); };
  A['exp-json'] = function () { U.fileDownload('hypernutry-diario.json', JSON.stringify({ app: 'HyperNutry', exportadoEm: new Date().toISOString(), diario: S.get('diario', []) }, null, 2), 'application/json'); };
  A['exp-csv'] = function () {
    var q = function (s) { return '"' + String(s == null ? '' : s).replace(/"/g, '""') + '"'; }, rows = [['data', 'refeicao', 'alimentos', 'fome_antes', 'saciedade_depois', 'motivos', 'energia_2h', 'digestao_2h', 'nota'].join(',')];
    (S.get('diario', []) || []).forEach(function (e) { rows.push([q(HN.dayKey(e.ts)), q(e.meal), q((e.items || []).map(function (i) { return (HN.foods[i.food] ? HN.foods[i.food].pt : i.food) + ' ' + i.g + 'g'; }).join('; ')), e.hb == null ? '' : e.hb, e.sa == null ? '' : e.sa, q((e.trig || []).join('; ')), e.congr ? e.congr.energia : '', e.congr ? e.congr.digest : '', q(e.note)].join(',')); });
    U.fileDownload('hypernutry-diario.csv', '﻿' + rows.join('\n'), 'text/csv;charset=utf-8');
  };
})(window.HN = window.HN || {});

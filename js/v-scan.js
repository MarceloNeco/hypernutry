/* HyperNutry — câmera (botão 📷 do centro da barra): visor em tela cheia com 4 modos.
 *   rot   Rótulo nutricional → foto → OCR no aparelho (tela Ler rótulo)
 *   cod   Código de barras   → leitura no aparelho (BarcodeDetector) → só o número vai ao Open Food Facts
 *   prato Prato/refeição 🔒  → foto de referência no diário (com IA configurada, reconhece os alimentos)
 *   bio   Laudo de bioimpedância 🔒 → foto → OCR no aparelho (Corpo › Laudos)
 * A câmera só é pedida quando a pessoa toca no 📷, e é desligada ao fechar o visor.
 */
(function (HN) {
  'use strict';
  var S = HN.S, esc = HN.esc, T = HN.T, A = HN.acts;
  var MODES = [
    { id: 'rot', e: '🏷️', pt: 'Rótulo', en: 'Label' },
    { id: 'cod', e: '▮▯▮', pt: 'Código', en: 'Barcode' },
    { id: 'prato', e: '🍽️', pt: 'Prato', en: 'Plate', b: true },
    { id: 'bio', e: '📄', pt: 'Laudo', en: 'Report', b: true }
  ];
  var st = { mode: null, stream: null, loop: null, busy: false };

  /* ---------- Open Food Facts ---------- */
  var OFF_AL = { 'en:gluten': 'gluten', 'en:milk': 'leite', 'en:eggs': 'ovo', 'en:nuts': 'castanhas', 'en:peanuts': 'amendoim', 'en:soybeans': 'soja', 'en:fish': 'peixe', 'en:crustaceans': 'crustaceo' };
  function alerg(tags) { var o = []; (tags || []).forEach(function (t) { var k = OFF_AL[t]; if (k && o.indexOf(k) < 0) o.push(k); }); return o; }
  HN.offBuscar = function (code) {
    var url = 'https://world.openfoodfacts.org/api/v2/product/' + encodeURIComponent(code) + '.json?fields=code,product_name,product_name_pt,product_name_en,brands,brand_owner,generic_name_pt,generic_name,categories,quantity,nutriments,allergens_tags,traces_tags,serving_quantity,nova_group,ingredients_text_pt,ingredients_text,additives_tags,image_front_small_url';
    var ctl = window.AbortController ? new AbortController() : null, to = setTimeout(function () { if (ctl) ctl.abort(); }, 9000);
    return fetch(url, ctl ? { signal: ctl.signal } : {}).then(function (r) { clearTimeout(to); if (!r.ok && r.status !== 404) throw new Error('http ' + r.status); return r.json(); }).then(function (j) {
      if (!j || j.status !== 1 || !j.product) return null;
      var p = j.product, n = p.nutriments || {}, num = function (k) { var v = n[k]; return v == null || isNaN(+v) ? null : +v; };
      var na = num('sodium_100g'); if (na == null && num('salt_100g') != null) na = num('salt_100g') / 2.5;
      return {
        code: code, nome: (HN.lang === 'en' ? p.product_name_en : p.product_name_pt) || p.product_name || p.product_name_pt || p.product_name_en || '', marca: (p.brands || '').split(',')[0].trim(), qtd: p.quantity || '',
        kcal: num('energy-kcal_100g') != null ? num('energy-kcal_100g') : (num('energy_100g') != null ? num('energy_100g') / 4.184 : null),
        p: num('proteins_100g'), c: num('carbohydrates_100g'), f: num('fat_100g'), fib: num('fiber_100g'), na: na == null ? null : na * 1000,
        sat: num('saturated-fat_100g'), acu: num('sugars_100g'), alergenos: alerg(p.allergens_tags), tracos: alerg(p.traces_tags), porcao: +p.serving_quantity || 0, nova: +p.nova_group || 0,
        ingredientes: (p.ingredients_text_pt || p.ingredients_text || '').trim(), offTags: p.additives_tags || [], dono: p.brand_owner || '', img: p.image_front_small_url || '',
        tipo: (p.generic_name_pt || p.generic_name || String(p.categories || '').split(',').pop() || '').trim()
      };
    });
  };
  function salvarProduto(o) {
    var id = 'off_' + o.code, nome = (o.nome || T('Produto', 'Product') + ' ' + o.code) + (o.marca ? ' (' + o.marca + ')' : '');
    var prod = { id: id, pt: nome, en: nome, group: 'produto', kcal: Math.round(o.kcal || 0), p: o.p || 0, c: o.c || 0, f: o.f || 0, fib: o.fib || 0, na: Math.round(o.na || 0), allergens: o.alergenos, nova: o.nova || 3, measures: o.porcao ? [['porção', 'serving', o.porcao]] : [], src: 'OFF' };
    var l = (S.get('produtos', []) || []).filter(function (x) { return x.id !== id; }); l.push(prod); S.set('produtos', l); HN.registerFood(prod);
    return prod;
  }

  /* ---------- visor ---------- */
  function badge(m) {
    if (m === 'cod') return '🛡️ ' + T('Lido no aparelho · só o número vai ao Open Food Facts', 'Read on device · only the number goes to Open Food Facts');
    if (m === 'prato') return HN.iaVisao && HN.iaVisao.pronta() ? '☁️ ' + T('A foto vai para a IA da sua chave', 'The photo goes to your AI key') : '🛡️ ' + T('A foto fica só no aparelho', 'The photo stays on your device');
    return '🛡️ ' + T('Processado no aparelho (nada vai para a nuvem)', 'Processed on your device (nothing goes to the cloud)');
  }
  function hint(m) {
    return { rot: T('Enquadre a tabela ou os ingredientes, sem chegar perto demais. Toque na imagem para focar e depois no botão.', 'Frame the table or ingredients, not too close. Tap the image to focus, then the button.'), cod: T('Aponte para o código de barras, a uns 15 cm. Embaçou? Toque na imagem para focar ou em 🔄 para trocar de câmera.', 'Point at the barcode, about 15 cm away. Blurry? Tap the image to focus or 🔄 to switch camera.'), prato: T('Enquadre o prato de cima e toque no botão.', 'Frame the plate from above and tap the button.'), bio: T('Enquadre a folha do laudo inteira e toque no botão.', 'Frame the whole report sheet and tap the button.') }[m];
  }
  function locked(m) { var md = MODES.filter(function (x) { return x.id === m; })[0]; return md.b && !HN.cfg().aceite; }
  function body() {
    var m = st.mode, lk = locked(m), canDetect = 'BarcodeDetector' in window;
    var h = '<div class="scan-top"><button class="ib" data-act="layer-close" aria-label="' + T('Fechar câmera', 'Close camera') + '">✕</button><div class="grow scan-badge" id="scbadge">' + badge(m) + '</div><span id="sccam" class="scan-tools"></span></div>' +
      '<div class="scan-frame' + (m === 'cod' ? ' wide' : '') + '" aria-hidden="true"><i class="c1"></i><i class="c2"></i><i class="c3"></i><i class="c4"></i><b class="laser"></b></div>' +
      '<p class="scan-hint" id="schint">' + (lk ? '🔒 ' + T('Este modo fica no Meu acompanhamento e pede o aceite de privacidade (LGPD).', 'This mode lives in My follow-up and needs the privacy consent (LGPD).') : hint(m)) + '</p>' +
      '<div id="scard"></div>' +
      '<div class="scan-bottom">' +
      (lk ? '<button class="btn block" data-act="go" data-arg="/acomp">🩺 ' + T('Entrar no Meu acompanhamento', 'Enter My follow-up') + '</button>' :
        m === 'cod' ? '<div class="row scan-code"><input id="sccode" type="text" inputmode="numeric" autocomplete="off" placeholder="' + T('ou digite o número', 'or type the number') + '" aria-label="' + T('Número do código de barras', 'Barcode number') + '"><button class="btn sm" data-act="scan-code">' + T('Buscar', 'Look up') + '</button></div>' + (canDetect ? '' : '<p class="scan-hint small">' + T('Este navegador não lê código de barras sozinho (o iPhone ainda não deixa). Digite o número que fica embaixo das barras.', 'This browser cannot read barcodes by itself (iPhone does not allow it yet). Type the number under the bars.') + '</p>') :
        '<div class="row" style="justify-content:center;gap:1.2rem"><label class="ib scan-gal" for="scgal" title="' + T('Escolher da galeria', 'Choose from gallery') + '" aria-label="' + T('Escolher da galeria', 'Choose from gallery') + '">🖼️</label><input id="scgal" type="file" accept="image/*" class="sr" data-in="scan-gal"><button class="shutter" data-act="scan-shot" aria-label="' + T('Tirar foto', 'Take photo') + '"></button><span style="width:2.5rem"></span></div>') +
      '<div class="seg scan-modes" role="tablist">' + MODES.map(function (x) { return '<button role="tab" data-act="scan-mode" data-arg="' + x.id + '" class="' + (x.id === m ? 'on' : '') + '" aria-selected="' + (x.id === m) + '">' + HN.tt([x.pt, x.en]) + (x.b ? ' 🔒' : '') + '</button>'; }).join('') + '</div></div>';
    return h;
  }
  function paint() { var el = HN.q('#scanui'); if (el) el.innerHTML = body(); ferramentas(); var v = HN.q('#scvideo'); if (v) v.classList.toggle('dim', locked(st.mode)); startLoop(); }
  function stop() { clearInterval(st.loop); st.loop = null; if (st.stream) { st.stream.getTracks().forEach(function (t) { t.stop(); }); st.stream = null; } }
  function startLoop() {
    clearInterval(st.loop); st.loop = null;
    if (st.mode !== 'cod' || !('BarcodeDetector' in window) || !st.stream) return;
    var det; try { det = new window.BarcodeDetector({ formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e'] }); } catch (e) { return; }
    st.loop = setInterval(function () {
      var v = HN.q('#scvideo'); if (!v || st.busy || v.readyState < 2) return;
      det.detect(v).then(function (r) { if (r && r.length && !st.busy) lookup(r[0].rawValue); }).catch(function () { /* quadro sem leitura */ });
    }, 280);
  }
  function card(html) { var c = HN.q('#scard'), ui = HN.q('#scanui'); if (c) { c.innerHTML = html ? '<div class="scan-card">' + html + '</div>' : ''; } if (ui) ui.classList.toggle('has-card', !!html); }
  // cartão do produto lido: selo de aditivos, alertas, alergias e atalhos (o produto já fica no catálogo)
  function cardProduto(p, o, offline) {
    st.last = o; st.lastId = p.id;
    var r = HN.cat.analise(p), alt = HN.alternativas(p), mine = HN.restrAll ? HN.restrAll() : [];
    var cf = (o ? o.alergenos.concat(o.tracos) : p.alergenos || []).filter(function (a) { return mine.indexOf(a) >= 0; });
    var n = p.nutri || {}, v = function (x, d) { return x == null ? '–' : HN.num(x, d || 0); };
    card((cf.length ? '<div class="notice bad" role="alert">⚠️ <b>' + T('Conflita com suas restrições:', 'Conflicts with your restrictions:') + ' ' + cf.map(HN.alergName).join(', ') + '</b></div>' : '') +
      '<div class="row" style="align-items:flex-start"><div class="grow"><div class="t-caption muted">' + esc(p.marca || '') + (p.tipo ? ' · ' + esc(p.tipo) : '') + '</div><h3 style="margin:.1rem 0">' + esc(HN.prodNome(p)) + '</h3></div><div class="right"><div class="t-display" style="font-size:1.5rem">' + v(n.kcal) + '</div><div class="t-caption muted">kcal/100 g</div></div></div>' +
      '<p style="margin:.3rem 0">' + HN.seloHtml(r, true) + '</p>' + HN.aditivosHtml(r, true) +
      (alt.length ? '<p class="small">✨ <b>' + alt.length + ' ' + T('opção(ões) com menos aditivos no seu catálogo', 'option(s) with fewer additives in your catalogue') + '</b> — ' + esc(HN.prodNome(alt[0].p)) + '</p>' : '') +
      '<p class="t-caption muted">' + (offline ? '📴 ' + T('Sem internet: dados guardados no seu catálogo.', 'Offline: data saved in your catalogue.') : T('Dados do Open Food Facts (feito por voluntários): confira com a embalagem. Guardado no seu catálogo ✓', 'Open Food Facts data (made by volunteers): check the package. Saved in your catalogue ✓')) + '</p>' +
      '<div class="row wrap"><button class="btn grow" data-act="scan-ficha">📋 ' + T('Ver ficha', 'See details') + '</button>' + (n.kcal != null ? '<button class="btn sec" data-act="scan-add">🧮</button>' : '') + '<button class="btn ghost sm" data-act="scan-again">' + T('Ler outro', 'Scan another') + '</button></div>');
  }
  function lookup(code) {
    code = String(code || '').replace(/\D/g, ''); if (code.length < 8) { HN.toast(T('Número incompleto (8 a 14 dígitos).', 'Incomplete number (8 to 14 digits).')); return; }
    st.busy = true; HN.haptic('sucesso');
    var salvo = HN.cat && HN.cat.porEan(code);
    if (!navigator.onLine) {
      if (salvo) { cardProduto(salvo, null, true); return; }
      card('<p>📵 ' + T('Sem internet e este produto ainda não está no seu catálogo. O número é ', 'Offline and this product is not in your catalogue yet. The number is ') + '<b class="num">' + code + '</b>. ' + T('Leia a foto do rótulo (funciona sem internet).', 'Read the label photo (works offline).') + '</p><div class="row"><button class="btn sec sm grow" data-act="scan-mode" data-arg="rot">🏷️ ' + T('Ler rótulo', 'Read label') + '</button><button class="btn ghost sm" data-act="scan-again">' + T('Ler outro', 'Scan another') + '</button></div>'); return;
    }
    card('<p class="center">🔎 ' + T('Procurando', 'Looking up') + ' <b class="num">' + code + '</b>…</p>');
    HN.offBuscar(code).then(function (o) {
      if (!o) {
        if (salvo) { cardProduto(salvo, null, false); return; }
        st.novoEan = code;
        card('<p>' + T('O código ', 'Code ') + '<b class="num">' + code + '</b> ' + T('não está no Open Food Facts. Cadastre você mesmo: tire foto dos ingredientes ou digite.', 'is not on Open Food Facts. Add it yourself: photograph the ingredients or type them.') + '</p><div class="row wrap"><button class="btn sm grow" data-act="scan-mode" data-arg="rot">🏷️ ' + T('Foto do rótulo', 'Label photo') + '</button><button class="btn sec sm" data-act="scan-novo">✏️ ' + T('Digitar', 'Type it') + '</button><button class="btn ghost sm" data-act="scan-again">' + T('Ler outro', 'Scan another') + '</button></div>'); return;
      }
      var p = HN.cat.put(HN.prodDeOff(o, salvo)); cardProduto(p, o, false);
    }).catch(function () { if (salvo) { cardProduto(salvo, null, true); return; } card('<p>⚠️ ' + T('Não consegui consultar agora. Tente de novo ou leia a foto do rótulo.', 'Could not look it up now. Try again or read the label photo.') + '</p><div class="row"><button class="btn sm grow" data-act="scan-again">' + T('Tentar de novo', 'Try again') + '</button></div>'); });
  }
  A['scan-ficha'] = function () { if (st.lastId) HN.go('/mercado/p/' + encodeURIComponent(st.lastId)); };
  A['scan-novo'] = function () { var ean = st.novoEan; HN.layer.closeAllThen(function () { HN.catEditar({ ean: ean }); }); };

  function grab() {
    var v = HN.q('#scvideo'), track = st.stream && st.stream.getVideoTracks()[0];
    var fromVideo = function () { var c = document.createElement('canvas'); c.width = v.videoWidth; c.height = v.videoHeight; c.getContext('2d').drawImage(v, 0, 0); return Promise.resolve(c); };
    if (!v || !v.videoWidth) return Promise.reject(new Error('sem vídeo'));
    // foto cheia (não o quadro do vídeo) quando o aparelho deixa: fica mais nítida para ler
    if (track && window.ImageCapture) { try { return new window.ImageCapture(track).takePhoto().then(function (b) { return createImageBitmap(b); }).then(function (bm) { var c = document.createElement('canvas'); c.width = bm.width; c.height = bm.height; c.getContext('2d').drawImage(bm, 0, 0); return c; }).catch(fromVideo); } catch (e) { /* cai para o quadro */ } }
    return fromVideo();
  }
  function usePhoto(canvas) {
    var m = st.mode; HN.haptic('sucesso');
    if (m === 'rot' || m === 'bio') { HN.scanImage(m === 'bio' ? 'bio' : 'rot', canvas); return; }
    if (m === 'prato') {
      var k = Math.min(1, 480 / Math.max(canvas.width, canvas.height)), t = document.createElement('canvas'); t.width = Math.round(canvas.width * k); t.height = Math.round(canvas.height * k); t.getContext('2d').drawImage(canvas, 0, 0, t.width, t.height);
      HN.draft = HN.draft || (HN.draftNew ? HN.draftNew() : { items: [] }); HN.draft.photo = t.toDataURL('image/jpeg', .7);
      if (HN.iaVisao && HN.iaVisao.pronta()) { HN.draft.photoNote = T('Reconhecendo com a IA…', 'Recognising with AI…'); HN.go('/diario/novo'); var n = 0; (function quandoAbrir() { if (HN.route().name === 'diario' && !HN.layer.count()) HN.iaVisao.prato(canvas); else if (n++ < 40) setTimeout(quandoAbrir, 100); })(); } // espera o visor fechar e o diário abrir antes de pedir confirmação
      else { HN.draft.photoNote = T('Foto de referência (não é guardada). Para reconhecer os alimentos sozinho, configure a IA em ⚙ Configurações.', 'Reference photo (not stored). To recognise foods automatically, set up AI in ⚙ Settings.'); HN.go('/diario/novo'); }
    }
  }
  A['scan-shot'] = function () { if (st.busy) return; st.busy = true; grab().then(usePhoto).catch(function () { st.busy = false; HN.toast(T('Não consegui tirar a foto. Use 🖼️ para escolher da galeria.', 'Could not take the photo. Use 🖼️ to pick from the gallery.')); }); };
  HN.ins['scan-gal'] = function (v, el) {
    var f = el.files && el.files[0]; if (!f) return; var img = new Image(), url = URL.createObjectURL(f);
    img.onload = function () { var c = document.createElement('canvas'); c.width = img.naturalWidth; c.height = img.naturalHeight; c.getContext('2d').drawImage(img, 0, 0); URL.revokeObjectURL(url); usePhoto(c); };
    img.onerror = function () { HN.toast(T('Não consegui abrir essa imagem.', 'Could not open that image.')); };
    img.src = url;
  };
  A['scan-mode'] = function (m) { st.mode = m; st.busy = false; paint(); var tr = st.stream && st.stream.getVideoTracks()[0]; if (tr) ajustarFoco(tr); };
  A['scan-again'] = function () { st.busy = false; card(''); };
  A['scan-code'] = function () { var i = HN.q('#sccode'); if (i) lookup(i.value); };
  A['scan-add'] = function () { if (!st.last && st.lastId && A['prod-calc']) { A['prod-calc'](st.lastId); return; } var o = st.last; if (!o) return; var p = salvarProduto(o); if (HN.calcAdd) HN.calcAdd(p.id); HN.toast(T('Adicionado à calculadora ✓', 'Added to calculator ✓')); HN.go('/'); };
  document.addEventListener('keydown', function (e) { if (e.key === 'Enter' && e.target && e.target.id === 'sccode') { e.preventDefault(); A['scan-code'](); } });


  /* ---------- câmera: escolher a lente certa, foco automático, tocar para focar, lanterna ----------
   * Celular com várias câmeras atrás (Samsung, Motorola…) às vezes abre a grande-angular ou a macro, que não
   * focam de perto: a imagem fica embaçada para sempre. Por isso: escolhemos a câmera principal pelo nome,
   * ligamos o foco contínuo quando o aparelho oferece, tocar na imagem pede foco naquele ponto, e o 🔄 troca
   * de câmera (a escolha fica guardada). Abaixo de ~10 cm nenhuma câmera foca: a dica pede para afastar. */
  var cams = [], caps = {};
  function traseiras() { return cams.filter(function (d) { return !/front|frontal|user|selfie|facing front/i.test(d.label); }); }
  function principal(l) {
    var boas = l.filter(function (d) { return !/wide|ultra|grande|tele|macro|depth|profund|infra|ir\b/i.test(d.label); });
    var n = function (d) { var m = /(\d+)/.exec(d.label); return m ? +m[1] : 99; };
    return (boas.length ? boas : l).slice().sort(function (a, b) { return n(a) - n(b); })[0] || null;
  }
  function abrirCamera(id, primeira) {
    if (st.stream) { st.stream.getTracks().forEach(function (t) { t.stop(); }); st.stream = null; }
    var v = { width: { ideal: 1920 }, height: { ideal: 1080 } };
    if (id) v.deviceId = { exact: id }; else v.facingMode = { ideal: 'environment' };
    navigator.mediaDevices.getUserMedia({ video: v, audio: false }).then(function (s) {
      if (!HN.q('#scvideo')) { s.getTracks().forEach(function (t) { t.stop(); }); return; } // visor já fechado
      st.stream = s; var vid = HN.q('#scvideo'); vid.srcObject = s; vid.play().catch(function () { /* autoplay bloqueado: o toque seguinte libera */ });
      var tr = s.getVideoTracks()[0];
      return navigator.mediaDevices.enumerateDevices().then(function (ds) {
        cams = ds.filter(function (d) { return d.kind === 'videoinput'; });
        // primeira vez sem câmera escolhida: se o navegador abriu uma lente secundária, troca pela principal
        var atual = (tr.getSettings && tr.getSettings().deviceId) || '', p = principal(traseiras());
        if (primeira && !id && p && p.deviceId && atual && p.deviceId !== atual && traseiras().length > 1) { abrirCamera(p.deviceId, false); return; }
        st.camId = atual; ajustarFoco(tr); ferramentas(); startLoop();
      });
    }).catch(function (e) {
      if (id) { HN.setCfg({ camId: '' }); abrirCamera(null, true); return; } // câmera guardada sumiu: volta ao padrão
      var hh = HN.q('#schint'); if (!hh) return;
      hh.textContent = e && e.name === 'NotAllowedError' ? T('A câmera foi bloqueada. Toque no cadeado 🔒 ao lado do endereço → Câmera → Permitir. Enquanto isso, use 🖼️ ou digite o código.', 'Camera is blocked. Tap the lock 🔒 next to the address → Camera → Allow. Meanwhile, use 🖼️ or type the code.') : T('Não achei uma câmera. Use 🖼️ (galeria) ou digite o código.', 'No camera found. Use 🖼️ (gallery) or type the code.');
    });
  }
  function aplicar(tr, c) { try { return tr.applyConstraints({ advanced: [c] }).catch(function () { /* o aparelho recusou: segue como está */ }); } catch (e) { return Promise.resolve(); } }
  function ajustarFoco(tr) {
    caps = (tr && tr.getCapabilities) ? tr.getCapabilities() : {};
    var fm = caps.focusMode || [];
    if (fm.indexOf('continuous') >= 0) aplicar(tr, { focusMode: 'continuous' });
    // um pouco de zoom deixa segurar o celular mais longe (a 15–20 cm a câmera foca); só onde existe zoom
    if (caps.zoom && caps.zoom.max >= 1.5 && (st.mode === 'cod' || st.mode === 'rot')) aplicar(tr, { zoom: Math.min(st.mode === 'cod' ? 2 : 1.5, caps.zoom.max) });
  }
  // toque na imagem: foco naquele ponto (onde o aparelho deixa) e volta ao contínuo depois
  function focarEm(ev) {
    var tr = st.stream && st.stream.getVideoTracks()[0], vid = HN.q('#scvideo'); if (!tr || !vid || !vid.videoWidth) return;
    var r = vid.getBoundingClientRect(), k = Math.max(r.width / vid.videoWidth, r.height / vid.videoHeight), dw = vid.videoWidth * k, dh = vid.videoHeight * k;
    var x = HN.clamp((ev.clientX - r.left - (r.width - dw) / 2) / dw, 0, 1), y = HN.clamp((ev.clientY - r.top - (r.height - dh) / 2) / dh, 0, 1);
    var anel = document.createElement('span'); anel.className = 'scan-foco'; anel.style.left = (ev.clientX - r.left) + 'px'; anel.style.top = (ev.clientY - r.top) + 'px';
    var ui = HN.q('#scanui'); if (ui) { ui.appendChild(anel); setTimeout(function () { anel.remove(); }, 900); }
    var fm = caps.focusMode || [], c = {};
    if (caps.pointsOfInterest) c.pointsOfInterest = [{ x: x, y: y }];
    if (fm.indexOf('single-shot') >= 0) c.focusMode = 'single-shot'; else if (fm.indexOf('manual') >= 0 && fm.indexOf('continuous') >= 0) c.focusMode = 'manual';
    aplicar(tr, c).then(function () { setTimeout(function () { if (fm.indexOf('continuous') >= 0) aplicar(tr, { focusMode: 'continuous' }); }, 1500); });
  }
  function ferramentas() {
    var box = HN.q('#sccam'); if (!box) return;
    box.innerHTML = (caps.torch ? '<button class="ib" data-act="scan-luz" aria-pressed="' + !!st.luz + '" aria-label="' + T('Lanterna', 'Torch') + '">' + (st.luz ? '💡' : '🔦') + '</button>' : '') +
      (traseiras().length > 1 ? '<button class="ib" data-act="scan-trocar" aria-label="' + T('Trocar de câmera (se a imagem estiver embaçada)', 'Switch camera (if the image is blurry)') + '">🔄</button>' : '');
  }
  A['scan-luz'] = function () { var tr = st.stream && st.stream.getVideoTracks()[0]; if (!tr) return; st.luz = !st.luz; aplicar(tr, { torch: st.luz }); ferramentas(); };
  A['scan-trocar'] = function () {
    var l = traseiras(); if (l.length < 2) return; var i = l.map(function (d) { return d.deviceId; }).indexOf(st.camId), prox = l[(i + 1) % l.length];
    HN.setCfg({ camId: prox.deviceId }); st.luz = false; abrirCamera(prox.deviceId, false);
    HN.toast(T('Câmera ', 'Camera ') + ((i + 1) % l.length + 1) + T(' de ', ' of ') + l.length + T(' — fica guardada se a imagem ficar nítida.', ' — kept for next time if the image is sharp.'), 2600);
  };
  // toque na imagem (fora dos botões e campos) = focar ali
  document.addEventListener('click', function (e) { if (!e.target.closest || !e.target.closest('.scan-ui')) return; if (e.target.closest('button, input, label, a, .scan-card, .scan-modes, .scan-bottom, .scan-top')) return; focarEm(e); });

  // o 📷 abre o visor; a parte atual decide o modo inicial
  A.scan = function () {
    st.mode = HN.scanModo || st.mode || (HN.curPart() === 'B' ? 'prato' : 'cod'); HN.scanModo = null; st.busy = false;
    HN.layer.open({ type: 'full', label: T('Câmera', 'Camera'), focus: false,
      html: '<div class="scan"><video id="scvideo" playsinline muted autoplay></video><div id="scanui" class="scan-ui"></div></div>',
      onClose: stop,
      after: function () {
        paint();
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { var hh = HN.q('#schint'); if (hh) hh.textContent = T('Este navegador não abre a câmera aqui. Use 🖼️ (galeria) ou digite o código.', 'This browser cannot open the camera here. Use 🖼️ (gallery) or type the code.'); return; }
        abrirCamera(HN.cfg().camId || null, true);
      } });
  };
})(window.HN = window.HN || {});

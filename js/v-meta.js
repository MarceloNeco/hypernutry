/* HyperNutry — Planos, Configurações, Ajuda e Sobre. */
(function (HN) {
  'use strict';
  var S = HN.S, U = HN.ui, esc = HN.esc, T = HN.T, V = HN.views, A = HN.acts;

  /* ================= PLANOS ================= */
  V.planos = function () {
    var rows = [
      [['Diário, saciedade, metas, alimentos, receitas, cardápio, lista, rótulos, corpo', 'Diary, fullness, goals, foods, recipes, menu, list, labels, body'], 1, 1, 1],
      [['Dados só no aparelho + exportar/apagar', 'On-device data + export/delete'], 1, 1, 1],
      [['Sincronizar entre aparelhos (nuvem)', 'Sync across devices (cloud)'], 0, 1, 1],
      [['Código de barras (Open Food Facts)', 'Barcode (Open Food Facts)'], 0, 1, 1],
      [['Registro por foto do prato (IA)', 'Meal photo logging (AI)'], 0, 0, 1],
      [['Vários perfis na casa (Família)', 'Several household profiles (Family)'], 0, 0, 1],
      [['Telenutrição com nutricionista', 'Telenutrition with dietitian'], 0, 0, 1]
    ];
    return U.title('💎', T('Planos', 'Plans'), T('Proposta — ainda não ativa', 'Proposal — not active yet')) +
      U.notice('info', T('<b>Hoje o HyperNutry é 100% gratuito e sem anúncios.</b> Esta tela mostra a <b>proposta</b> de níveis para o futuro, só para você avaliar. Nada é cobrado; contas e pagamentos dependem de decisão e de servidor.', '<b>Today HyperNutry is 100% free and ad-free.</b> This screen shows the <b>proposed</b> future tiers for you to evaluate. Nothing is charged; accounts and payments depend on a decision and a server.')) +
      '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>' + T('Recurso', 'Feature') + '</th><th>' + T('Visitante', 'Guest') + '</th><th>' + T('Membro', 'Member') + '</th><th>Premium</th></tr></thead><tbody>' + rows.map(function (r) { return '<tr><th scope="row">' + esc(HN.tt(r[0])) + '</th>' + [1, 2, 3].map(function (k) { return '<td>' + (r[k] ? '✓' : '–') + '</td>'; }).join('') + '</tr>'; }).join('') + '</tbody></table></div>' +
      '<div class="card"><h3>' + T('Princípios', 'Principles') + '</h3><ul><li>' + T('O básico para comer bem nunca fica atrás de paywall — “nutrição fácil, ao alcance de todos”.', 'The basics of eating well never sit behind a paywall — “easy nutrition, within everyone\'s reach”.') + '</li><li>' + T('Sem venda casada de suplementos e sem promessa de resultado (CFN 599/2018).', 'No tied supplement sales and no results promises (CFN 599/2018).') + '</li><li>' + T('Preço e plano serão definidos antes do lançamento comercial.', 'Pricing and plans will be set before the commercial launch.') + '</li></ul></div>';
  };

  /* ================= CONFIG ================= */
  HN.ins['cfg-theme'] = function (v) { HN.setCfg({ theme: v }); HN.applyCfg(); };
  HN.ins['cfg-fs'] = function (v) { HN.setCfg({ fs: +v }); HN.applyCfg(); var o = HN.q('#fsv'); if (o) o.textContent = v + '%'; };
  ['contraste', 'sublinhar', 'reduzir'].forEach(function (k) { HN.ins['cfg-' + k] = function (v) { var o = {}; o[k] = v; HN.setCfg(o); HN.applyCfg(); }; });
  HN.ins['cfg-import'] = function (v, el) {
    var f = el.files && el.files[0]; if (!f) return; var r = new FileReader();
    r.onload = function () { try { var o = JSON.parse(r.result); HN.confirm(T('Importar vai <b>substituir</b> dados iguais deste aparelho. Continuar?', 'Import will <b>replace</b> matching data on this device. Continue?'), T('Importar', 'Import')).then(function (ok) { if (ok) { try { S.importAll(o); HN.loadCustomFoods(); HN.lang = HN.cfg().lang || HN.lang; HN.applyCfg(); HN.toast(T('Dados importados ✓', 'Data imported ✓')); setTimeout(function () { HN.go('/'); }, 100); } catch (e) { HN.toast(T('Arquivo não é do HyperNutry.', 'File is not from HyperNutry.')); } } }); } catch (e) { HN.toast(T('Arquivo ilegível.', 'Unreadable file.')); } };
    r.readAsText(f);
  };
  V.config = function () {
    var c = HN.cfg(), p = HN.perfil(), bp = HN.cfgBarPart || 'A', bar = HN.barIds(bp);
    var h = U.title('⚙️', T('Configurações', 'Settings'));
    h += '<div class="card"><h3>' + T('Aparência e acessibilidade', 'Appearance & accessibility') + '</h3><label class="f" for="th">' + T('Tema', 'Theme') + '</label><select id="th" data-in="cfg-theme"><option value="auto"' + (!c.theme || c.theme === 'auto' ? ' selected' : '') + '>' + T('Automático (segue o aparelho)', 'Automatic (follows device)') + '</option><option value="claro"' + (c.theme === 'claro' ? ' selected' : '') + '>' + T('Claro', 'Light') + '</option><option value="escuro"' + (c.theme === 'escuro' ? ' selected' : '') + '>' + T('Escuro', 'Dark') + '</option></select>' +
      '<label class="f" for="fs">' + T('Tamanho do texto', 'Text size') + ' <b id="fsv">' + (c.fs || 100) + '%</b></label><input id="fs" type="range" min="85" max="150" step="5" value="' + (c.fs || 100) + '" data-in="cfg-fs">' +
      '<label class="chk"><input type="checkbox" data-in="cfg-contraste" ' + (c.contraste ? 'checked' : '') + '><span class="tx">' + T('Alto contraste', 'High contrast') + '</span></label><label class="chk"><input type="checkbox" data-in="cfg-sublinhar" ' + (c.sublinhar ? 'checked' : '') + '><span class="tx">' + T('Sublinhar links', 'Underline links') + '</span></label><label class="chk"><input type="checkbox" data-in="cfg-reduzir" ' + (c.reduzir ? 'checked' : '') + '><span class="tx">' + T('Reduzir animações', 'Reduce motion') + '</span></label>' +
      '<label class="f">' + T('Idioma', 'Language') + '</label><button class="btn sec sm" data-act="lang">' + (HN.lang === 'pt' ? '🇧🇷 Português → English' : '🇺🇸 English → Português') + '</button></div>';
    h += '<div class="card"><h3>' + T('Barra de baixo (até 5 favoritos)', 'Bottom bar (up to 5 favourites)') + '</h3><div class="chips mb"><button class="chip' + (bp === 'A' ? ' on' : '') + '" data-act="bar-part" data-arg="A">🧮 ' + T('Calcular e cozinhar', 'Calculate & cook') + '</button><button class="chip' + (bp === 'B' ? ' on' : '') + '" data-act="bar-part" data-arg="B">🩺 ' + T('Meu acompanhamento', 'My follow-up') + '</button></div><p class="small muted">' + T('Escolha o que fica à mão. Tudo continua no menu ☰.', 'Choose what stays at hand. Everything stays in the ☰ menu.') + '</p><div class="list">' + bar.map(function (id, i) { var n = HN.nav[id]; return '<div class="li" style="cursor:default"><span class="e">' + n.e + '</span><span class="grow t">' + HN.tt([n.pt, n.en]) + '</span><button class="ib" data-act="bar-up" data-arg="' + i + '" aria-label="' + T('Subir', 'Move up') + '"' + (i === 0 ? ' disabled' : '') + '>↑</button><button class="ib" data-act="bar-down" data-arg="' + i + '" aria-label="' + T('Descer', 'Move down') + '"' + (i === bar.length - 1 ? ' disabled' : '') + '>↓</button><button class="ib" data-act="bar-rm" data-arg="' + id + '" aria-label="' + T('Remover', 'Remove') + '">✕</button></div>'; }).join('') + '</div>' +
      (bar.length < 5 ? '<label class="f" for="baradd">' + T('Adicionar', 'Add') + '</label><select id="baradd" data-in="bar-add"><option value="">…</option>' + Object.keys(HN.nav).filter(function (id) { return bar.indexOf(id) < 0; }).map(function (id) { return '<option value="' + id + '">' + HN.nav[id].e + ' ' + esc(HN.tt([HN.nav[id].pt, HN.nav[id].en])) + '</option>'; }).join('') + '</select>' : '') + '<button class="btn ghost sm mt" data-act="bar-reset">' + T('Restaurar padrão', 'Restore default') + '</button></div>';
    if (p) h += '<div class="card"><h3>' + T('Meu perfil', 'My profile') + '</h3><p>' + esc(p.nome || '') + ' · ' + (p.modo === 'hibrido' ? T('Híbrido Adaptativo', 'Adaptive Hybrid') : T('Intuitivo Integral', 'Whole Intuitive')) + '</p><div class="row wrap"><button class="btn sec sm" data-act="go" data-arg="/wizard/1">' + T('Refazer o perfil', 'Redo profile') + '</button><button class="btn sec sm" data-act="go" data-arg="/familia">' + T('Família e perfis', 'Family & profiles') + '</button></div></div>';
    h += '<div class="card"><h3>' + T('Meus dados (LGPD)', 'My data (LGPD)') + '</h3><p class="small muted">' + T('Tudo fica só neste aparelho. Você pode levar, trazer e apagar.', 'Everything stays on this device only. You can take, bring and delete it.') + '</p><div class="row wrap"><button class="btn sec sm" data-act="data-export">📤 ' + T('Exportar tudo (JSON)', 'Export all (JSON)') + '</button><label class="btn sec sm" for="impf">📥 ' + T('Importar', 'Import') + '</label><input id="impf" type="file" accept="application/json,.json" class="sr" data-in="cfg-import"></div><p class="small muted mt">' + (c.ultimoBackup ? T('Último backup: ', 'Last backup: ') + HN.fmtDate(c.ultimoBackup) : T('Você ainda não fez backup.', 'You have not made a backup yet.')) + '</p><div id="stor" class="small muted"></div><button class="btn bad block mt" data-act="data-wipe">🗑 ' + T('Apagar todos os meus dados', 'Delete all my data') + '</button></div>';
    h += '<div class="card"><h3>' + T('Versão', 'Version') + '</h3><p>HyperNutry <b>v' + HN.version + '</b> · ' + HN.fmtDate(Date.now()) + '</p><button class="btn ghost sm" data-act="check-update">🔄 ' + T('Buscar atualização', 'Check for updates') + '</button><details class="acc mt"><summary>' + T('Novidades', 'What\'s new') + '</summary><div id="news" class="small"></div></details></div>';
    return h;
  };
  HN.after.config = function () {
    var box = HN.q('#stor'); if (box && navigator.storage && navigator.storage.estimate) navigator.storage.estimate().then(function (e) { box.textContent = T('Uso do aparelho: ', 'Device usage: ') + HN.num((e.usage || 0) / 1048576, 1) + ' MB' + (e.quota ? ' / ' + HN.num(e.quota / 1048576, 0) + ' MB' : ''); }, function () { });
    var nw = HN.q('#news'); if (nw) fetch('versoes.json', { cache: 'no-cache' }).then(function (r) { return r.json(); }).then(function (j) { nw.innerHTML = (j.versoes || []).map(function (v) { return '<p><b>v' + esc(v.v) + '</b> · ' + esc(v.data) + '<br>' + esc(HN.tt([v.pt, v.en])) + '</p>'; }).join(''); }).catch(function () { nw.textContent = T('Indisponível offline.', 'Unavailable offline.'); });
  };
  function setBar(l) { HN.setBar(HN.cfgBarPart || 'A', l); HN.refresh(); }
  A['bar-part'] = function (p) { HN.cfgBarPart = p; HN.refresh(); };
  A['bar-up'] = function (i) { i = +i; var l = HN.barIds(HN.cfgBarPart || 'A'); if (i > 0) { var t = l[i]; l[i] = l[i - 1]; l[i - 1] = t; setBar(l); } };
  A['bar-down'] = function (i) { i = +i; var l = HN.barIds(HN.cfgBarPart || 'A'); if (i < l.length - 1) { var t = l[i]; l[i] = l[i + 1]; l[i + 1] = t; setBar(l); } };
  A['bar-rm'] = function (id) { var l = HN.barIds(HN.cfgBarPart || 'A').filter(function (x) { return x !== id; }); if (!l.length) { HN.toast(T('Deixe ao menos 1 item.', 'Keep at least 1 item.')); return; } setBar(l); };
  HN.ins['bar-add'] = function (v) { if (!v) return; var l = HN.barIds(HN.cfgBarPart || 'A'); if (l.length < 5 && l.indexOf(v) < 0) { l.push(v); setBar(l); } };
  A['bar-reset'] = function () { HN.setBar(HN.cfgBarPart || 'A', null); HN.refresh(); };
  A['data-export'] = function () { HN.setCfg({ ultimoBackup: Date.now() }); var d = new Date(), n = 'HYPERNUTRY dados ' + HN.dayKey(d) + '.json'; U.fileDownload(n, JSON.stringify(S.exportAll(), null, 2), 'application/json'); HN.toast(T('Arquivo gerado ✓', 'File created ✓')); };
  A['data-wipe'] = function () {
    HN.confirm(T('Apagar <b>todos</b> os seus dados deste aparelho? Não dá para desfazer. Dica: exporte antes.', 'Delete <b>all</b> your data from this device? This cannot be undone. Tip: export first.'), T('Apagar tudo', 'Delete everything'), { danger: true }).then(function (ok) { if (!ok) return; setTimeout(function () { S.wipe(); S.setVolatile(false); HN.go('/boasvindas', { replace: true }); location.reload(); }, 60); });
  };
  A['check-update'] = function () {
    if (!('serviceWorker' in navigator)) { HN.toast(T('Sem suporte offline neste navegador.', 'No offline support in this browser.')); return; }
    navigator.serviceWorker.getRegistration().then(function (r) { if (!r) { location.reload(); return; } r.update().then(function () { HN.toast(T('Atualizando…', 'Updating…')); setTimeout(function () { location.reload(); }, 900); }); });
  };

  /* ================= AJUDA ================= */
  V.ajuda = function () {
    var q = [
      ['Preciso contar calorias?', 'Do I have to count calories?', 'Não. No Modo Intuitivo Integral não há metas numéricas: você registra fome, saciedade e como se sentiu. No Híbrido aparecem faixas flexíveis (nunca um número rígido).', 'No. In Whole Intuitive mode there are no numeric targets: you log hunger, fullness and how you felt. Hybrid shows flexible ranges (never a rigid number).'],
      ['O que é Saciedade Raiz?', 'What is Real Fullness?', 'É montar refeições que sustentam: proteína, fibras, volume (água e vegetais) e comer com calma. Veja o ranking de alimentos e o montador de prato em “Saciedade Raiz”. É alimentação — não remédio e não promete emagrecimento.', 'Building meals that keep you full: protein, fibre, volume (water and vegetables) and eating slowly. See the food ranking and plate builder in “Real Fullness”. It is food — not medicine, and no weight-loss promise.'],
      ['Como leio um rótulo?', 'How do I read a label?', 'Em “Ler rótulo”, tire uma foto (ou cole o texto da tabela). Confira os números, veja o semáforo e os alérgenos e salve o produto na sua base.', 'In “Read a label”, take a photo (or paste the table text). Check the numbers, see the traffic light and allergens and save the product to your base.'],
      ['Meus dados estão seguros?', 'Is my data safe?', 'Tudo fica só neste aparelho. Nada é enviado a servidores. Você pode exportar e apagar em Configurações.', 'Everything stays on this device. Nothing is sent to servers. You can export and delete in Settings.'],
      ['Como instalo no celular?', 'How do I install it on my phone?', 'Android (Chrome): menu ⋮ → “Instalar app”. iPhone (Safari): botão Compartilhar → “Adicionar à Tela de Início”. Depois funciona também sem internet.', 'Android (Chrome): ⋮ menu → “Install app”. iPhone (Safari): Share → “Add to Home Screen”. It then also works offline.'],
      ['O app substitui o nutricionista?', 'Does it replace a dietitian?', 'Não. É uma ferramenta educativa e de organização. Para dieta individual, doenças ou gestação, procure nutricionista/médico.', 'No. It is an educational and organisation tool. For individual diets, illness or pregnancy, see a dietitian/doctor.']
    ];
    return U.title('❓', T('Ajuda', 'Help')) + U.legal() + '<div class="card">' + q.map(function (x) { return '<details class="acc"><summary>' + T(x[0], x[1]) + '</summary><p>' + T(x[2], x[3]) + '</p></details>'; }).join('') + '</div>' +
      '<div class="card"><h3>' + T('Atalhos', 'Shortcuts') + '</h3><div class="row wrap"><button class="btn sec sm" data-act="go" data-arg="/diario/novo">📝 ' + T('Registrar refeição', 'Log a meal') + '</button><button class="btn sec sm" data-act="go" data-arg="/rotulos">🏷️ ' + T('Ler rótulo', 'Read label') + '</button><button class="btn sec sm" data-act="go" data-arg="/saciedade">🥣 ' + T('Saciedade Raiz', 'Real Fullness') + '</button></div></div>';
  };

  /* ================= SOBRE ================= */
  V.sobre = function () {
    var a = HN.cfg().aceite;
    return U.title('ℹ️', T('Sobre e avisos legais', 'About & legal'), 'HyperNutry v' + HN.version) +
      '<div class="card"><p>' + T('<b>HyperNutry</b> — nutrição fácil, ao alcance de todos. Saciedade de verdade, sem passar fome; sem culpa, sem conta obrigatória e sem fórmula mágica.', '<b>HyperNutry</b> — easy nutrition, within everyone\'s reach. Real fullness without going hungry; no guilt, no mandatory math and no magic formula.') + '</p></div>' +
      U.legal() +
      '<div class="card"><h3>' + T('Regras que seguimos', 'Rules we follow') + '</h3><ul><li>' + T('<b>Sem promessas de resultado</b> e sem fotos de antes e depois (Res. CFN 599/2018).', '<b>No results promises</b> and no before/after photos (CFN Res. 599/2018).') + '</li><li>' + T('<b>Sem comparar com medicamentos</b> nem prescrever dieta individual (Lei 8.234/1991).', '<b>No drug comparisons</b> and no individual diet prescription (Law 8,234/1991).') + '</li><li>' + T('<b>Dados de saúde só no aparelho</b> (LGPD art. 5º II e 11).', '<b>Health data on-device only</b> (LGPD arts. 5 II and 11).') + '</li><li>' + T('Alertas “alto em” seguem a RDC ANVISA 429/2020; “ultraprocessado” é uma heurística, não classificação oficial.', '“High in” warnings follow ANVISA RDC 429/2020; “ultra-processed” is a heuristic, not an official classification.') + '</li><li>' + T('Sem números de calorias para menores de 18, histórico de transtorno alimentar ou gestação.', 'No calorie numbers for under-18s, eating-disorder history or pregnancy.') + '</li><li>' + T('<b>Sem sequências, sem “alimentos proibidos”, sem cores de culpa.</b> Perder um dia não zera nada.', '<b>No streaks, no “forbidden foods”, no guilt colours.</b> Missing a day resets nothing.') + '</li><li>' + T('<b>Tudo o que é básico é grátis</b> (inclusive exportar e apagar seus dados) e <b>sem anúncios</b>.', '<b>All the basics are free</b> (including exporting and deleting your data) and <b>ad-free</b>.') + '</li></ul></div>' +
      '<div class="card"><h3>' + T('Dados e créditos', 'Data & credits') + '</h3><p class="small">' + T('Composição de alimentos: TACO completa (NEPA/Unicamp, 4ª ed. ampliada), em formato aberto, mais referências com medidas caseiras; valores por 100 g, sujeitos a conferência. Leitura de imagem: Tesseract (Apache-2.0), carregada sob demanda.', 'Food composition: full TACO (NEPA/Unicamp, expanded 4th ed.) in open format, plus references with household measures; per 100 g, subject to checking. Image reading: Tesseract (Apache-2.0), loaded on demand.') + '</p>' + (a ? '<p class="small muted">' + T('Aceite registrado em ', 'Consent recorded on ') + HN.fmtDate(a.data, true) + '</p>' : '') + '</div>';
  };

  /* lembrete gentil de backup na Início (quem tem dados e não exporta há 30 dias) */
  V.acomp = (function (orig) { return function (p, q) {
    var h = orig(p, q), c = HN.cfg(), n = (S.get('diario', []) || []).length;
    if (!S.isVolatile() && n >= 5 && Date.now() - (c.ultimoBackup || 0) > 30 * 864e5) h += '<div class="card tap" role="button" tabindex="0" data-act="go" data-arg="/config"><div class="row"><span style="font-size:1.5rem">💾</span><div class="grow"><b>' + T('Guarde uma cópia dos seus dados', 'Keep a copy of your data') + '</b><div class="small muted">' + T('Seus dados ficam só neste aparelho. Toque para exportar (grátis, 10 segundos).', 'Your data stays on this device only. Tap to export (free, 10 seconds).') + '</div></div></div></div>';
    return h;
  }; })(V.acomp);
})(window.HN = window.HN || {});

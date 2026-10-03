/* HyperNutry — pecinhas de tela reutilizáveis (HTML em texto). */
(function (HN) {
  'use strict';
  var esc = HN.esc, T = function (a, b) { return HN.T(a, b); };
  var U = HN.ui = {};
  HN.chipFn = {}; // nome → função(valor, el)

  // opts: [[valor, pt, en, emoji?]]
  U.chips = function (name, opts, sel, multi) {
    var s = multi ? (sel || []) : [sel];
    return '<div class="chips" role="' + (multi ? 'group' : 'radiogroup') + '">' + opts.map(function (o) {
      var on = s.indexOf(o[0]) >= 0;
      return '<button type="button" class="chip' + (on ? ' on' : '') + '" data-act="chip" data-arg="' + esc(name + '|' + o[0]) + '" aria-pressed="' + on + '">' + (o[3] ? '<span aria-hidden="true">' + o[3] + '</span>' : '') + esc(HN.tt([o[1], o[2] || o[1]])) + '</button>';
    }).join('') + '</div>';
  };
  HN.acts.chip = function (arg, el) { var i = arg.indexOf('|'), n = arg.slice(0, i), v = arg.slice(i + 1); if (HN.chipFn[n]) HN.chipFn[n](v, el); };

  U.scale = function (name, val, lo, hi) {
    var h = '<div class="scale" role="radiogroup">';
    for (var i = 1; i <= 10; i++) h += '<button type="button" data-act="scale" data-arg="' + name + '|' + i + '" class="' + (val === i ? 'on' : '') + '" aria-pressed="' + (val === i) + '">' + i + '</button>';
    return h + '</div><div class="scale-lab"><span>' + esc(lo || '') + '</span><span>' + esc(hi || '') + '</span></div>';
  };
  HN.acts.scale = function (arg) { var p = arg.split('|'); if (HN.chipFn[p[0]]) HN.chipFn[p[0]](+p[1]); };

  /* Anel adaptativo (blueprint "Adaptive Balance Ring"): um anel por nutriente, sem meta rígida.
   * O círculo inteiro = 125% da referência; a faixa 90–110% aparece em violeta suave. Dentro dela o anel
   * fica violeta (zona tranquila); acima de 110% fica sálvia (neutro) — nunca vermelho, nada de punição.
   * rings: [{ l: rótulo, v: valor, t: referência, c: cor, u: unidade }]; center: { big, small } */
  U.ring = function (o) {
    var size = o.size || 168, sw = o.sw || 11, gap = 4, cx = size / 2, FULL = 1.25, svg = '', leg = '';
    o.rings.forEach(function (r, i) {
      var rad = cx - sw / 2 - i * (sw + gap), C = 2 * Math.PI * rad, pct = r.t > 0 ? r.v / r.t : 0;
      var frac = Math.min(pct, FULL) / FULL, zone = pct >= 0.9 && pct <= 1.1 ? 'in' : pct > 1.1 ? 'over' : 'under';
      var col = zone === 'in' ? 'var(--violet)' : zone === 'over' ? 'var(--sage)' : r.c;
      var b0 = 0.9 / FULL * C, b1 = 1.1 / FULL * C;
      svg += '<circle cx="' + cx + '" cy="' + cx + '" r="' + rad + '" class="rg-track" stroke-width="' + sw + '"/>' +
        '<circle cx="' + cx + '" cy="' + cx + '" r="' + rad + '" class="rg-band" stroke-width="' + sw + '" stroke-dasharray="0 ' + b0.toFixed(1) + ' ' + (b1 - b0).toFixed(1) + ' ' + C.toFixed(1) + '"/>' +
        '<circle cx="' + cx + '" cy="' + cx + '" r="' + rad + '" class="rg-val' + (zone === 'in' ? ' glow' : '') + '" stroke="' + col + '" stroke-width="' + sw + '" style="stroke-dasharray:' + (frac * C).toFixed(1) + ' ' + C.toFixed(1) + ';opacity:' + (frac > 0 ? 1 : 0) + '"/>';
      leg += '<div class="rg-leg"><i style="background:' + r.c + '"></i><span class="grow">' + esc(r.l) + '</span><b class="num">' + HN.num(r.v) + '</b><span class="muted num">/' + HN.num(r.t) + (r.u || '') + '</span>' + (zone === 'in' ? ' <span class="rg-ok" title="' + esc(T('na faixa tranquila (90–110%)', 'in the calm range (90–110%)')) + '">✓</span>' : '') + '</div>';
    });
    var aria = o.rings.map(function (r) { return r.l + ' ' + HN.num(r.v) + ' / ' + HN.num(r.t) + (r.u || ''); }).join(', ');
    return '<div class="ring-wrap' + (o.compact ? ' compact' : '') + '"><div class="ring" style="width:' + size + 'px;height:' + size + 'px"><svg viewBox="0 0 ' + size + ' ' + size + '" role="img" aria-label="' + esc(aria) + '">' + svg + '</svg>' +
      (o.center ? '<div class="rg-c"><div class="t-display">' + o.center.big + '</div><div class="t-caption muted">' + o.center.small + '</div></div>' : '') + '</div><div class="rg-legend">' + leg + '</div></div>';
  };

  // Atualiza um anel já desenhado sem recomeçar a animação: o arco "escorre" até o novo valor (transição CSS).
  U.ringUpdate = function (box, html) {
    if (!box) return; var old = box.querySelectorAll('.rg-val'), tmp = document.createElement('div'); tmp.innerHTML = html;
    var neu = tmp.querySelectorAll('.rg-val');
    if (!old.length || old.length !== neu.length) { box.innerHTML = html; return; }
    for (var i = 0; i < old.length; i++) { old[i].style.animation = 'none'; old[i].setAttribute('style', neu[i].getAttribute('style') + ';animation:none'); old[i].setAttribute('stroke', neu[i].getAttribute('stroke')); old[i].setAttribute('class', neu[i].getAttribute('class')); }
    ['.rg-c', '.rg-legend', '.t-caption'].forEach(function (sel) { var a = box.querySelector(sel), b = tmp.querySelector(sel); if (a && b) a.innerHTML = b.innerHTML; });
    var sv = box.querySelector('svg'), sn = tmp.querySelector('svg'); if (sv && sn) sv.setAttribute('aria-label', sn.getAttribute('aria-label'));
  };

  /* Escala de fome deslizante 1–10 com rostinho que muda e vibração média a cada número. */
  U.FACES = ['😫', '😫', '😟', '😕', '😐', '😌', '🙂', '😊', '😮‍💨', '😵'];
  U.slider = function (name, val, lo, hi) {
    var v = val || 5;
    return '<div class="hs" data-name="' + name + '"><div class="hs-face" aria-hidden="true">' + U.FACES[v - 1] + '</div><div class="hs-num num">' + (val ? v : '–') + '<span class="muted">/10</span></div>' +
      '<input type="range" min="1" max="10" step="1" value="' + v + '" data-in="hs-' + name + '" aria-label="' + esc(T('Fome agora, de 1 (faminto) a 10 (muito cheio)', 'Hunger now, from 1 (starving) to 10 (stuffed)')) + '" aria-valuetext="' + v + '" style="--p:' + ((v - 1) / 9 * 100) + '%">' +
      '<div class="scale-lab"><span>' + esc(lo || '') + '</span><span>' + esc(hi || '') + '</span></div></div>';
  };
  // move o rosto/número na hora; avisa quem pediu só depois de soltar (evita salvar a cada passo)
  U.sliderMove = function (el) {
    var v = +el.value, box = el.closest('.hs'); if (!box) return v;
    if (+el.getAttribute('data-last') !== v) { HN.haptic('media'); el.setAttribute('data-last', v); var f = box.querySelector('.hs-face'); f.textContent = U.FACES[v - 1]; f.classList.remove('bump'); void f.offsetWidth; f.classList.add('bump'); }
    box.querySelector('.hs-num').innerHTML = v + '<span class="muted">/10</span>'; el.setAttribute('aria-valuetext', v); el.style.setProperty('--p', ((v - 1) / 9 * 100) + '%');
    return v;
  };

  U.stars = function (n, max) { max = max || 5; var f = Math.round(n), s = ''; for (var i = 1; i <= max; i++) s += i <= f ? '★' : '☆'; return '<span class="stars" aria-label="' + HN.num(n, 1) + ' / ' + max + '">' + s + '</span>'; };
  U.bar = function (pct) { return '<div class="bar" role="img" aria-label="' + Math.round(pct) + '%"><i style="width:' + HN.clamp(pct, 0, 100) + '%"></i></div>'; };
  U.title = function (e, t, sub) { return '<div class="page-title"><span class="em" aria-hidden="true">' + e + '</span><div><h1>' + t + '</h1>' + (sub ? '<div class="muted small">' + sub + '</div>' : '') + '</div></div>'; };
  U.tabs = function (base, list, cur) { return '<div class="tabs" role="tablist">' + list.map(function (t) { return '<button role="tab" class="tab' + (t[0] === cur ? ' on' : '') + '" aria-selected="' + (t[0] === cur) + '" data-act="go" data-arg="' + base + '/' + t[0] + '">' + HN.tt([t[1], t[2]]) + '</button>'; }).join('') + '</div>'; };
  U.notice = function (kind, html) { return '<div class="notice ' + kind + '" role="note">' + html + '</div>'; };
  U.legal = function () { return U.notice('info', '⚠️ ' + T('Ferramenta educativa e de organização alimentar. Não substitui consulta com nutricionista ou médico, nem faz diagnóstico ou prescrição.', 'Educational and food-organisation tool. It does not replace a dietitian or doctor, nor diagnose or prescribe.')); };

  // barras horizontais: rows [{l, v, max, txt}]
  U.hbars = function (rows) {
    return '<div class="bars">' + rows.map(function (r) { var m = r.max || 1; return '<div class="b"><span class="l">' + esc(r.l) + '</span><div class="bar"><i style="width:' + HN.clamp(r.v / m * 100, 0, 100) + '%"></i></div><span class="v">' + esc(r.txt != null ? r.txt : r.v) + '</span></div>'; }).join('') + '</div>';
  };
  // linhas: {labels:[], series:[{name,color,values:[n|null]}], min, max}
  U.line = function (o) {
    var W = 300, H = 130, pl = 24, pr = 8, pt = 8, pb = 22, n = o.labels.length, min = o.min, max = o.max;
    var x = function (i) { return pl + (n <= 1 ? (W - pl - pr) / 2 : i * (W - pl - pr) / (n - 1)); }, y = function (v) { return pt + (1 - (v - min) / (max - min)) * (H - pt - pb); };
    var s = '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + esc(o.aria || '') + '" style="width:100%;height:auto">';
    for (var g = 0; g <= 4; g++) { var gv = min + (max - min) * g / 4, gy = y(gv); s += '<line x1="' + pl + '" x2="' + (W - pr) + '" y1="' + gy + '" y2="' + gy + '" stroke="currentColor" opacity=".12"/><text x="' + (pl - 4) + '" y="' + (gy + 3) + '" font-size="8" text-anchor="end" fill="currentColor" opacity=".6">' + Math.round(gv) + '</text>'; }
    o.labels.forEach(function (l, i) { if (n <= 8 || i % Math.ceil(n / 7) === 0) s += '<text x="' + x(i) + '" y="' + (H - 6) + '" font-size="8" text-anchor="middle" fill="currentColor" opacity=".7">' + esc(l) + '</text>'; });
    o.series.forEach(function (se) {
      var pts = [], seg = [];
      se.values.forEach(function (v, i) { if (v == null) { if (seg.length) pts.push(seg); seg = []; } else seg.push([x(i), y(v)]); }); if (seg.length) pts.push(seg);
      pts.forEach(function (sg) { if (sg.length > 1) s += '<polyline fill="none" stroke="' + se.color + '" stroke-width="2.2" stroke-linejoin="round" points="' + sg.map(function (p) { return p[0] + ',' + p[1]; }).join(' ') + '"/>'; sg.forEach(function (p) { s += '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="3" fill="' + se.color + '"/>'; }); });
    });
    s += '</svg>';
    if (o.series.length > 1 || o.series[0].name) s += '<div class="row wrap small" style="justify-content:center">' + o.series.map(function (se) { return '<span><i style="display:inline-block;width:.8rem;height:.8rem;border-radius:50%;background:' + se.color + ';vertical-align:-1px"></i> ' + esc(se.name) + '</span>'; }).join('') + '</div>';
    return s;
  };

  U.MEALS = [['cafe', 'Café da manhã', 'Breakfast', '☕'], ['almoco', 'Almoço', 'Lunch', '🍽️'], ['lanche', 'Lanche', 'Snack', '🍎'], ['jantar', 'Jantar', 'Dinner', '🌙'], ['ceia', 'Ceia', 'Late snack', '🥛']];
  U.mealName = function (id) { for (var i = 0; i < U.MEALS.length; i++) if (U.MEALS[i][0] === id) return HN.tt([U.MEALS[i][1], U.MEALS[i][2]]); return id; };
  U.mealEmoji = function (id) { for (var i = 0; i < U.MEALS.length; i++) if (U.MEALS[i][0] === id) return U.MEALS[i][3]; return '🍴'; };
  U.TRIGGERS = [['fome', 'Fome física', 'Physical hunger', '🍽️'], ['habito', 'Hábito/horário', 'Habit/time', '⏰'], ['social', 'Social/companhia', 'Social', '👥'], ['tedio', 'Tédio', 'Boredom', '😐'], ['estresse', 'Estresse', 'Stress', '😤'], ['ansiedade', 'Ansiedade', 'Anxiety', '😰'], ['tristeza', 'Tristeza', 'Sadness', '😔'], ['comemoracao', 'Comemoração', 'Celebration', '🎉'], ['cansaco', 'Cansaço', 'Tiredness', '😴'], ['vontade', 'Vontade de algo específico', 'Craving', '🍫']];
  U.trigName = function (id) { for (var i = 0; i < U.TRIGGERS.length; i++) if (U.TRIGGERS[i][0] === id) return HN.tt([U.TRIGGERS[i][1], U.TRIGGERS[i][2]]); return id; };
  U.RESTR = [['gluten', 'Glúten (celíaca/sensibilidade)', 'Gluten (celiac/sensitivity)', '🌾'], ['leite', 'Leite/lactose', 'Milk/lactose', '🥛'], ['ovo', 'Ovo', 'Egg', '🥚'], ['castanhas', 'Castanhas e nozes', 'Tree nuts', '🌰'], ['amendoim', 'Amendoim', 'Peanut', '🥜'], ['soja', 'Soja', 'Soy', '🫘'], ['peixe', 'Peixe', 'Fish', '🐟'], ['crustaceo', 'Crustáceos', 'Shellfish', '🦐'], ['vegetariano', 'Vegetariano', 'Vegetarian', '🥗'], ['vegano', 'Vegano', 'Vegan', '🌱'], ['halal', 'Halal', 'Halal', '☪️']];
  U.foodLabel = function (f) { return HN.foodName(f); };
  U.amountText = function (foodId, g) { var f = HN.foods[foodId], m = f && f.measures[0]; if (!m) return Math.round(g) + ' g'; var n = Math.round(g / m[2] * 4) / 4, t = String(n); if (HN.lang === 'pt') t = t.replace('.', ','); return t + ' ' + HN.tt([m[0], m[1]]) + ' (' + Math.round(g) + ' g)'; };
  U.sem = function (nivel) { return '<span class="sem ' + nivel + '" aria-hidden="true"></span>'; };
  U.fileDownload = function (name, text, mime) { var b = new Blob([text], { type: mime || 'text/plain;charset=utf-8' }), a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = name; document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 800); };
})(window.HN = window.HN || {});

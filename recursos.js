/* =====================================================================
   recursos.js — interruptores do RootifyONE para apps SEM o módulo comum
   (cópia avulsa; o master fica no repositório rootify-one, como o tarefas.js).
   Mesmo jeito do DGO.recursos do diretrizes.js ≥ 1.6.0:

     <script src="recursos.js" data-app="omnilife-one"></script>   (antes do código do app)

     SolverRecursos.ligado('assistone', true)    → false se o dono desligou no RootifyONE
     SolverRecursos.valor('assistone.dicas', true)
     SolverRecursos.aoMudar(function (desligados) { … })   → chegou arquivo novo: redesenhe
     <div data-recurso="assistone">                → some sozinho quando desligado (vários: "ia voz")

   Lê recursos/global.json e recursos/<app>.json em <origem>/solverone-dados/ (o app vence o
   global). Rede primeiro (4 s), senão a última cópia guardada, senão o padrão do código.
   Relê ao voltar para o app (no máximo a cada 5 min). Se o diretrizes.js ≥ 1.6.0 estiver na
   página, só repassa para o DGO.recursos (nada em dobro). Nunca derruba o app.
   O app também publica recursos-do-app.json na raiz, dizendo o que obedece.
   Id reservado "app" (Modo DEUS): desligado = tela cheia "Em manutenção" (mensagem no comportamento
   "app.mensagem", {pt,en} ou texto) com "Tentar de novo". Não vale para o RootifyONE.
   ===================================================================== */
(function (raiz) {
  'use strict';
  if (raiz.SolverRecursos) return;
  var d = document;
  var eu = d.currentScript;
  var APP = (eu && eu.getAttribute('data-app')) || '';
  var FONTE = (eu && eu.getAttribute('data-fonte')) || (raiz.location.origin + '/solverone-dados/');
  if (FONTE.charAt(FONTE.length - 1) !== '/') FONTE += '/';
  var ARQS = ['recursos/global.json', 'recursos/' + APP + '.json'];
  var mem = {}, ouvintes = [], ultima = 0, estilo = null;

  function dgo() { return raiz.DGO && raiz.DGO.recursos && raiz.DGO.recursos.aoMudar ? raiz.DGO.recursos : null; }
  function chave(n) { return 'dgo:' + APP + ':central:' + n; }
  function guardado(n) {
    if (mem[n]) return mem[n];
    try { var v = JSON.parse(raiz.localStorage.getItem(chave(n)) || 'null'); if (v) mem[n] = v; return v; } catch (e) { return null; }
  }
  function juntar() {
    var g = guardado(ARQS[0]) || {}, a = guardado(ARQS[1]) || {};
    return { recursos: Object.assign({}, g.recursos || {}, a.recursos || {}), comportamentos: Object.assign({}, g.comportamentos || {}, a.comportamentos || {}) };
  }
  function desligados() {
    var r = juntar().recursos;
    return Object.keys(r).filter(function (k) { return /^[a-z0-9._-]+$/i.test(k) && r[k] && r[k].ligado === false; });
  }
  function aplicar() {
    var off = desligados();
    try {
      if (!estilo || !estilo.parentNode) { estilo = d.createElement('style'); estilo.id = 'solver-interruptores'; (d.head || d.documentElement).appendChild(estilo); }
      estilo.textContent = off.length ? off.map(function (id) { return '[data-recurso~="' + id + '"]'; }).join(',') + '{display:none !important}' : '';
      d.documentElement.setAttribute('data-dgo-desligados', off.join(' '));
    } catch (e) {}
    try { manutencao(off); } catch (e2) {}
    return off;
  }

  /* ---- Manutenção (Modo DEUS, 10/Out/2026): id reservado "app" desligado = o app inteiro fora do ar,
     com tela cheia "Em manutenção", a mensagem do comportamento "app.mensagem" ({pt,en} ou texto) e
     "Tentar de novo". O RootifyONE nunca se bloqueia; data-manutencao="nao" no <script> também desliga. ---- */
  var telaMan = null;
  function emIngles() {
    var l = '';
    try { l = d.documentElement.getAttribute('lang') || JSON.parse(raiz.localStorage.getItem('dgo:global:idioma') || '""') || navigator.language || ''; } catch (e) { l = navigator.language || ''; }
    return String(l).toLowerCase().indexOf('en') === 0;
  }
  function manutencao(off) {
    var vale = APP && APP !== 'rootify-one' && !(eu && eu.getAttribute('data-manutencao') === 'nao');
    if (!vale || off.indexOf('app') === -1) {
      if (telaMan) { if (telaMan.parentNode) telaMan.remove(); telaMan = null; try { d.documentElement.removeAttribute('data-dgo-manutencao'); d.documentElement.style.overflow = ''; } catch (e) {} }
      return;
    }
    if (!d.body) { d.addEventListener('DOMContentLoaded', function () { manutencao(desligados()); }); return; }
    var en = emIngles(), L = function (pt, e) { return en ? e : pt; };
    var m = juntar().comportamentos['app.mensagem'];
    if (m && typeof m === 'object') m = (en ? m.en : m.pt) || m.pt || m.en || '';
    m = m ? String(m) : L('Estamos ajustando o app. Volte daqui a pouco.', 'We are tuning the app. Please come back in a little while.');
    if (telaMan && telaMan.parentNode) { var mx = d.getElementById('dgo-manutencao-msg'); if (mx) mx.textContent = m; return; }   /* já aberta: só a mensagem */
    function no(tag, css, txt) { var n = d.createElement(tag); if (css) n.style.cssText = css; if (txt) n.textContent = txt; return n; }
    var tela = no('div', 'position:fixed;top:0;left:0;right:0;bottom:0;z-index:2147483646;background:#f8fafc;color:#0f172a;overflow:auto;display:flex;align-items:center;justify-content:center;padding:1.5rem 1rem;font:17px/1.55 system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;text-align:center;');
    tela.id = 'dgo-manutencao'; tela.setAttribute('role', 'alertdialog'); tela.setAttribute('aria-modal', 'true'); tela.setAttribute('aria-labelledby', 'dgo-manutencao-tit');
    var caixa = no('div', 'max-width:32rem;'), ic = no('div', 'font-size:3rem;line-height:1;', '🛠️'); ic.setAttribute('aria-hidden', 'true');
    var tit = no('h1', 'font-size:1.6rem;margin:.6rem 0;', L('Em manutenção', 'Under maintenance')); tit.id = 'dgo-manutencao-tit';
    var msg = no('p', 'margin:0;', m); msg.id = 'dgo-manutencao-msg';
    var bt = no('button', 'margin-top:1.2rem;min-height:48px;padding:.6rem 1.4rem;font:inherit;font-weight:700;border:0;border-radius:12px;background:#0ea5e9;color:#fff;cursor:pointer;', L('Tentar de novo', 'Try again'));
    bt.type = 'button'; bt.id = 'dgo-manutencao-tentar';
    var aviso = no('p', 'min-height:1.4em;color:#475569;margin:.8rem 0 0;'); aviso.setAttribute('aria-live', 'polite');
    bt.addEventListener('click', function () {
      bt.disabled = true; bt.textContent = L('Conferindo…', 'Checking…'); aviso.textContent = '';
      atualizar().then(function () {
        var off2 = aplicar();
        if (off2.indexOf('app') !== -1) { bt.disabled = false; bt.textContent = L('Tentar de novo', 'Try again'); aviso.textContent = L('Ainda em manutenção. Tente mais tarde.', 'Still under maintenance. Please try later.'); }
      });
    });
    [ic, tit, msg, bt, aviso].forEach(function (n) { caixa.appendChild(n); });
    tela.appendChild(caixa); d.body.appendChild(tela); telaMan = tela;
    try { d.documentElement.setAttribute('data-dgo-manutencao', '1'); d.documentElement.style.overflow = 'hidden'; } catch (e) {}
    setTimeout(function () { try { bt.focus(); } catch (e) {} }, 30);
  }
  function ler(n) {
    var ctrl = raiz.AbortController ? new AbortController() : null, prazo = setTimeout(function () { if (ctrl) ctrl.abort(); }, 4000);
    return fetch(FONTE + n, { cache: 'no-cache', signal: ctrl ? ctrl.signal : undefined }).then(function (r) {
      clearTimeout(prazo);
      if (r.status === 404) return null;
      if (!r.ok) throw new Error('http-' + r.status);
      return r.json();
    }).then(function (j) {
      if (!j) return false;
      var mudou = JSON.stringify(guardado(n) || null) !== JSON.stringify(j);
      mem[n] = j; try { raiz.localStorage.setItem(chave(n), JSON.stringify(j)); } catch (e) {}
      return mudou;
    }).catch(function () { clearTimeout(prazo); return false; });
  }
  function atualizar() {
    if (!APP || !raiz.fetch) return Promise.resolve();
    ultima = Date.now();
    return Promise.all(ARQS.map(ler)).then(function (r) {
      if (r.some(Boolean)) { var off = aplicar(); ouvintes.slice().forEach(function (fn) { try { fn(off); } catch (e) {} }); }
    });
  }

  var API = {
    ligado: function (id, padrao) {
      var x = dgo(); if (x) return x.ligado(id, padrao);
      var r = juntar().recursos[id]; return r && typeof r.ligado === 'boolean' ? r.ligado : (padrao !== false);
    },
    valor: function (id, padrao) {
      var x = dgo(); if (x) return x.valor(id, padrao);
      var c = juntar().comportamentos; return c[id] === undefined ? padrao : c[id];
    },
    desligados: function () { var x = dgo(); return x ? x.desligados() : desligados(); },
    aoMudar: function (fn) {
      var x = dgo(); if (x) return x.aoMudar(fn);
      if (typeof fn === 'function') ouvintes.push(fn);
      return function () { ouvintes = ouvintes.filter(function (f) { return f !== fn; }); };
    },
    atualizar: function () { return dgo() ? Promise.resolve() : atualizar(); },
    app: APP
  };
  raiz.SolverRecursos = API;

  /* some na hora com o que estava desligado na última cópia (sem piscar ao abrir) */
  if (!dgo()) aplicar();
  /* o módulo comum pode carregar depois deste arquivo: decide no próximo ciclo */
  setTimeout(function () {
    if (dgo()) { if (estilo && estilo.parentNode) estilo.remove(); return; }
    atualizar();
    d.addEventListener('visibilitychange', function () {
      if (d.visibilityState === 'visible' && Date.now() - ultima > 300000) atualizar();
    });
  }, 0);
})(window);

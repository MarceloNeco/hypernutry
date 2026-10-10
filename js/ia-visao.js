/* HyperNutry — reconhecer o prato pela foto, com a IA da chave da própria pessoa.
 * A chave mora no cofre do módulo comum (DGO.ia, igual em todos os apps SolverONE): aqui só
 * perguntamos qual provedor serve para "visão" e mandamos a foto. Antes de enviar, a pessoa
 * confirma (é dado de saúde indo para fora do aparelho). O resultado vira itens do diário para
 * conferir — nada é salvo sem ela tocar em Salvar.
 */
(function (HN) {
  'use strict';
  var T = HN.T, ok = false;
  function dgo() { return window.DGO && window.DGO.ia ? window.DGO : null; }
  // interruptor "ia" do RootifyONE → Controle dos apps (recursos.js): desligado = a foto fica só no aparelho
  HN.iaLigada = function () { return !window.SolverRecursos || SolverRecursos.ligado('ia', true); };
  function prov() { var D = dgo(); if (!HN.iaLigada()) return ''; try { return D ? D.ia.provedorPara('visao') : ''; } catch (e) { return ''; } }
  var NOMES = { gemini: 'Google Gemini', openai: 'OpenAI', mistral: 'Mistral', anthropic: 'Anthropic' };
  var BASE = { openai: 'https://api.openai.com/v1', mistral: 'https://api.mistral.ai/v1' };
  var PROMPT = 'Liste os alimentos visíveis neste prato com uma estimativa de gramas de cada um. Responda SOMENTE com JSON no formato {"itens":[{"nome":"arroz branco cozido","gramas":120}]}. Use nomes simples em português do Brasil, como na tabela TACO (ex.: "feijão carioca cozido", "peito de frango grelhado", "alface"). Se não houver comida, responda {"itens":[]}.';

  function b64(canvas) { var k = Math.min(1, 768 / Math.max(canvas.width, canvas.height)), c = document.createElement('canvas'); c.width = Math.round(canvas.width * k); c.height = Math.round(canvas.height * k); c.getContext('2d').drawImage(canvas, 0, 0, c.width, c.height); return c.toDataURL('image/jpeg', 0.7); }
  function falha(r) { return r.text().then(function (t) { var e = new Error(t.slice(0, 300)); e.status = r.status; throw e; }); }
  function chamar(p, chave, modelo, dataUrl) {
    var data = dataUrl.split(',')[1];
    if (p === 'gemini') {
      return fetch('https://generativelanguage.googleapis.com/v1beta/models/' + encodeURIComponent(modelo) + ':generateContent', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': chave },
        body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: PROMPT }, { inline_data: { mime_type: 'image/jpeg', data: data } }] }], generationConfig: { responseMimeType: 'application/json' } }) })
        .then(function (r) { return r.ok ? r.json() : falha(r); }).then(function (j) { var c = j.candidates && j.candidates[0]; return ((c && c.content && c.content.parts) || []).map(function (x) { return x.text || ''; }).join(''); });
    }
    if (p === 'anthropic') {
      return fetch('https://api.anthropic.com/v1/messages', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-api-key': chave, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' },
        body: JSON.stringify({ model: modelo, max_tokens: 600, messages: [{ role: 'user', content: [{ type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: data } }, { type: 'text', text: PROMPT }] }] }) })
        .then(function (r) { return r.ok ? r.json() : falha(r); }).then(function (j) { return (j.content || []).map(function (x) { return x.text || ''; }).join(''); });
    }
    // formato OpenAI (OpenAI, Mistral)
    return fetch(BASE[p] + '/chat/completions', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + chave },
      body: JSON.stringify({ model: modelo, max_tokens: 600, messages: [{ role: 'user', content: [{ type: 'text', text: PROMPT }, { type: 'image_url', image_url: { url: dataUrl } }] }] }) })
      .then(function (r) { return r.ok ? r.json() : falha(r); }).then(function (j) { return (j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content) || ''; });
  }
  // nome dito pela IA → alimento da base (TACO primeiro, nome mais curto que contém as palavras)
  HN.acharAlimento = function (nome) {
    var ws = HN.nrm(nome).split(/[^a-z0-9]+/).filter(function (w) { return w.length > 2; }); if (!ws.length) return null;
    var best = null, bs = 0;
    HN.foodList.forEach(function (f) {
      var n = HN.nrm(f.pt), hit = ws.filter(function (w) { return n.indexOf(w) >= 0; }).length; if (!hit || n.indexOf(ws[0]) < 0) return; // a 1ª palavra (o alimento em si) tem de bater
      var cru = /\bcru(a|s)?\b/.test(n) && !/\bcru/.test(ws.join(' ')); // prato pronto: preferir a versão cozida
      var sc = hit / ws.length - n.length / 400 + (f.taco ? 0.02 : 0) - (cru ? 0.3 : 0);
      if (sc > bs) { bs = sc; best = f; }
    });
    return bs >= 0.5 ? best : null;
  };
  function ler(txt) { var m = String(txt || '').replace(/```(json)?/g, '').match(/\{[\s\S]*\}/); if (!m) return []; try { var o = JSON.parse(m[0]); return Array.isArray(o.itens) ? o.itens : []; } catch (e) { return []; } }
  function nota(t) { if (HN.draft) HN.draft.photoNote = t; if (HN.route().name === 'diario') HN.refresh(); }

  HN.iaVisao = {
    pronta: function () { return !!prov(); },
    nome: function () { var p = prov(); return NOMES[p] || p; },
    prato: function (canvas) {
      var D = dgo(), p = prov(); if (!D || !p) return;
      if (!BASE[p] && p !== 'gemini' && p !== 'anthropic') { nota(T('A IA escolhida para fotos não é suportada aqui. Use Gemini, OpenAI, Mistral ou Anthropic no cofre de chaves.', 'The AI chosen for photos is not supported here. Use Gemini, OpenAI, Mistral or Anthropic in the key vault.')); return; }
      var go = function () {
        if (!D.rede.podeUsarIA()) { nota(T('A IA está marcada para usar só no Wi-Fi ou não há internet. Registre à mão por enquanto.', 'AI is set to Wi-Fi only or there is no internet. Log by hand for now.')); return; }
        nota(T('Reconhecendo com a IA…', 'Recognising with AI…'));
        chamar(p, D.ia.chavePara('visao'), D.ia.modelo(p), b64(canvas)).then(function (txt) {
          var itens = ler(txt), achou = [], nao = [];
          itens.forEach(function (it) { var f = HN.acharAlimento(it.nome || ''), g = Math.max(5, Math.min(800, Math.round(+it.gramas || 100))); if (f) { HN.draft.items.push({ food: f.id, g: g }); achou.push(HN.foodName(f)); } else if (it.nome) nao.push(it.nome); });
          HN.haptic('sucesso');
          nota(itens.length ? T('A IA sugeriu: ', 'AI suggested: ') + (achou.join(', ') || '—') + '. ' + (nao.length ? T('Não achei na base: ', 'Not in the base: ') + nao.join(', ') + '. ' : '') + T('Confira e ajuste as quantidades: é uma estimativa.', 'Check and adjust the amounts: it is an estimate.') : T('A IA não reconheceu comida nesta foto. Registre à mão.', 'AI found no food in this photo. Log by hand.'));
        }).catch(function (e) { nota('⚠️ ' + (D.ia.explicarErro ? D.ia.explicarErro(e) : T('A IA não respondeu.', 'AI did not answer.'))); });
      };
      if (ok) { go(); return; }
      HN.confirm(T('A foto do prato vai para ' + HN.iaVisao.nome() + ', usando a sua chave, para reconhecer os alimentos. O HyperNutry não guarda a foto. Enviar?', 'The plate photo goes to ' + HN.iaVisao.nome() + ', using your key, to recognise the foods. HyperNutry does not store the photo. Send it?'), T('Enviar', 'Send')).then(function (s) { if (s) { ok = true; go(); } else nota(T('Foto não enviada. Registre à mão.', 'Photo not sent. Log by hand.')); });
    }
  };
  // chegou arquivo novo de interruptores: redesenha as telas que mostram a IA
  if (window.SolverRecursos) SolverRecursos.aoMudar(function () { var n = HN.route && HN.route().name; if (n === 'config' || n === 'diario') HN.refresh(); });
})(window.HN = window.HN || {});

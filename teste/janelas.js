/* Teste automático: janelas do HyperNutry pela janela comum (janela.js) + chaves de IA no cofre (cofre.js).
   Só valores de mentira (PIN e chave inventados). Roda em 390 px e em 1280 px, com câmera falsa do Chromium.
   Cada janela: trava a página de trás, não rola ao arrastar fora, fecha pelo ✕, Esc, Voltar e toque fora
   (arrastar de dentro para fora não fecha), com texto digitado pergunta "Descartar?" e com busca não pergunta,
   uma janela por vez, a confirmação curta abre por cima e fecha junto, o aviso (toast) aparece dentro da janela.
   Também: chave antiga que passa para o cofre, PIN ao abrir e ao recarregar, tranca ao sair do app,
   "✓ guardado" / "Mostrar a chave guardada", painel da digital em Configurações.
   Uso (na raiz do repositório):
     python3 -m http.server 8099 &
     NODE_PATH=/opt/node22/lib/node_modules BASE=http://localhost:8099 node teste/janelas.js */
const { chromium } = require('playwright');
const BASE = process.env.BASE || 'http://localhost:8099';
const PIN = 'pin-de-mentira-789';
const CHAVE = 'gsk_chave_de_mentira_para_o_teste_000111222';

const falhas = [];
let total = 0;
const conferir = (ok, msg) => { total++; if (!ok) falhas.push(msg); else process.stdout.write('  ✓ ' + msg + '\n'); };

async function rodar(browser, nome, viewport) {
  console.log('\n=== ' + nome + ' ===');
  const ctx = await browser.newContext({ serviceWorkers: 'block', viewport, locale: 'pt-BR', reducedMotion: 'reduce', permissions: ['camera'] });
  await ctx.route(url => !url.href.startsWith(BASE), r => r.fulfill({ status: 404, headers: { 'access-control-allow-origin': '*' }, body: 'nao' }));
  await ctx.route(BASE + '/fora/index.html', r => r.fulfill({ status: 200, contentType: 'text/html',
    body: '<!doctype html><title>fora</title><script src="/janela.js"></script><script src="/cofre.js"></script><p>outro app</p>' }));
  const page = await ctx.newPage();
  const erros = [], consoles = [];
  page.on('pageerror', e => erros.push(e.message));
  page.on('console', m => consoles.push(m.text()));
  const ev = (f, a) => page.evaluate(f, a);
  const pausa = ms => page.waitForTimeout(ms);
  const largura = viewport.width;

  const abertas = () => ev(() => document.querySelectorAll('dialog.sj[open]').length);
  const travada = () => ev(() => getComputedStyle(document.documentElement).overflow === 'hidden');
  const dialogo = sel => page.waitForSelector('dialog.sj[open]' + (sel || ''), { timeout: 8000 }).catch(async e => {
    const est = await ev(() => ({ abertas: [...document.querySelectorAll('dialog.sj')].map(d => d.className + (d.open ? ' [aberta]' : '')), quantas: SolverJanela.quantas(), esperando: SolverJanela.esperando(), nivel: (history.state && history.state.sjNivel) || 0 }));
    throw new Error('esperava a janela ' + sel + ' e só havia ' + JSON.stringify(est));
  });
  const vazio = async () => { for (let i = 0; i < 25; i++) { if (await abertas() === 0 && await ev(() => HN.layer.count()) === 0) return true; await pausa(100); } return false; };
  const iniciar = async (hash) => {
    await page.goto(BASE + '/index.html' + (hash || '')); await page.waitForFunction(() => window.HN && window.DGO && DGO.versao && window.SolverJanela); await pausa(500);
  };

  /* bateria de saídas de uma janela. o.fora = ponto na parte escura (omitido: tela cheia, sem parte escura) */
  async function bateria(titulo, abrir, o) {
    o = o || {};
    const y0 = await ev(() => scrollY);
    await abrir(); await dialogo(o.sel);
    conferir(await abertas() === 1 && await ev(() => HN.layer.count()) === 1, titulo + ': abre como janela comum (1 aberta)');
    conferir(await travada(), titulo + ': a página de trás fica travada (sem rolagem)');
    if (o.fora) {
      await page.mouse.move(o.fora[0], o.fora[1]); await page.mouse.wheel(0, 600); await pausa(150);
      conferir(await ev(() => scrollY) === y0, titulo + ': arrastar fora não rola a página de trás');
      await page.mouse.move(o.dentro[0], o.dentro[1]); await page.mouse.down(); await page.mouse.move(o.fora[0], o.fora[1], { steps: 4 }); await page.mouse.up(); await pausa(200);
      conferir(await abertas() === 1, titulo + ': arrastar de dentro para fora NÃO fecha');
    }
    await page.keyboard.press('Escape');
    conferir(await vazio(), titulo + ': Esc fecha');
    conferir(await ev(() => scrollY) === y0, titulo + ': a página volta exatamente onde estava');
    if (o.fora) {
      await abrir(); await dialogo(o.sel);
      await page.mouse.click(o.fora[0], o.fora[1]);
      conferir(await vazio(), titulo + ': toque na parte escura fecha');
    }
    await abrir(); await dialogo(o.sel);
    const url0 = page.url();
    await page.goBack();
    conferir(await vazio() && page.url() === url0, titulo + ': Voltar do celular fecha e não sai da tela');
    if (o.botao) {
      await abrir(); await dialogo(o.sel);
      await page.click('dialog.sj[open] ' + o.botao);
      conferir(await vazio(), titulo + ': o botão da janela (' + o.botao + ') fecha');
    }
  }

  /* ------------------------------------------------------------------ início */
  await iniciar('');
  conferir(await ev(() => DGO.versao) === '1.11.0' && await ev(() => SolverJanela.versao) === '1.0.1' && await ev(() => SolverCofre.versao) === '1.4.0',
    'módulo 1.11.0, janela.js 1.0.1 e cofre.js 1.4.0 carregados');
  conferir(await ev(() => !document.getElementById('layers') && document.querySelectorAll('.scrim').length === 0), 'não sobrou o antigo #layers nem o .scrim');

  await bateria('Menu ☰ (gaveta)', () => ev(() => document.querySelector('[data-act="menu"]').click()), { sel: '.hn-drawer', fora: [largura - 5, 500], dentro: [100, 300], botao: '.dh [data-act="layer-close"]' });
  await ev(() => document.querySelector('[data-act="menu"]').click()); await dialogo('.hn-drawer');
  conferir(await ev(() => document.querySelector('.dh [data-act="layer-close"]') === document.activeElement || !!document.querySelector('dialog.hn-drawer').contains(document.activeElement)), 'Menu ☰: o foco vai para dentro da gaveta');
  await page.keyboard.press('Escape'); await vazio();
  conferir(await ev(() => document.querySelector('[data-act="menu"]').getAttribute('aria-expanded')) === 'false', 'Menu ☰: aria-expanded volta a false');

  /* busca: tela cheia, sem parte escura; digitar na busca NÃO pergunta "Descartar?" */
  await bateria('Busca 🔍', () => ev(() => document.querySelector('[data-act="search"]').click()), { sel: '.hn-full', botao: '[data-act="layer-close"]' });
  await ev(() => document.querySelector('[data-act="search"]').click()); await dialogo('.hn-full');
  await page.fill('dialog.sj[open] #q', 'arroz'); await pausa(300);
  conferir(await ev(() => document.querySelectorAll('#qres .li').length) > 0, 'Busca: digitar acha resultados');
  await page.keyboard.press('Escape');
  conferir(await vazio() && await ev(() => !document.querySelector('dialog.sj-pergunta')), 'Busca: com texto digitado, Esc fecha direto (não pergunta "Descartar?")');

  /* menu → ir para outra tela: fecha e navega (uma janela por vez, sem sobra no histórico) */
  await ev(() => document.querySelector('[data-act="menu"]').click()); await dialogo('.hn-drawer');
  await ev(() => document.querySelector('dialog.sj[open] [data-act="drawer-go"][data-arg="/receitas"]').click());
  await page.waitForFunction(() => location.hash === '#/receitas'); await vazio();
  conferir(await ev(() => HN.route().name) === 'receitas' && await ev(() => (history.state && history.state.sjNivel) || 0) === 0, 'Menu ☰ → Receitas: a gaveta fecha, a tela muda e o histórico fica sem sobra');

  /* ------------------------------------------------------------------ folhas (sheet) */
  await iniciar('');
  await ev(() => window.scrollTo(0, 0));
  await bateria('Conversor (folha)', () => ev(() => HN.acts.conv()), { sel: '.hn-sheet', fora: [largura / 2, 40], dentro: [largura / 2, 700], botao: '[data-act="layer-close"]' });
  await ev(() => HN.acts.conv()); await dialogo('.hn-sheet'); await pausa(200);
  await page.fill('dialog.sj[open] #cv-q', '250'); await page.keyboard.press('Escape');
  conferir(await vazio() && await ev(() => !document.querySelector('dialog.sj-pergunta')), 'Conversor: calculadora, com número digitado fecha direto (temTexto:false)');

  /* folha com campo: "Descartar?" */
  await ev(() => HN.acts['calc-save']()); await dialogo('.hn-sheet'); await pausa(200);
  await page.click('dialog.sj[open] [data-act="calc-save-ok"]'); await pausa(300);
  const toast = await ev(() => { const t = document.querySelector('.toast'); if (!t) return null; const r = t.getBoundingClientRect(); const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return { dentro: !!t.closest('dialog.sj'), visivel: hit === t || t.contains(hit), texto: t.textContent }; });
  conferir(toast && toast.dentro && toast.visivel && /nome/i.test(toast.texto), 'o aviso (toast) "Dê um nome." aparece DENTRO da janela aberta, visível');
  await page.fill('dialog.sj[open] #mrn', 'Almoço de mentira');
  await page.keyboard.press('Escape'); await pausa(250);
  conferir(await ev(() => !!document.querySelector('dialog.sj-pergunta[open]')) && await abertas() === 2, 'Folha com texto digitado: Esc pergunta "Descartar o que você digitou?" (por cima)');
  await page.click('[data-sj=continuar]'); await pausa(250);
  conferir(await abertas() === 1 && await ev(() => document.querySelector('#mrn').value) === 'Almoço de mentira', 'Continuar mantém a folha e o texto');
  await page.mouse.click(largura / 2, 40); await pausa(250);
  conferir(await ev(() => !!document.querySelector('dialog.sj-pergunta[open]')), 'toque fora também pergunta');
  await page.click('[data-sj=descartar]');
  conferir(await vazio(), 'Descartar fecha a pergunta e a folha juntas');
  /* salvar (botão do app) fecha sem perguntar */
  await ev(() => HN.acts['calc-save']()); await dialogo('.hn-sheet'); await pausa(200);
  await page.fill('dialog.sj[open] #mrn', 'Meu almoço');
  await page.click('dialog.sj[open] [data-act="calc-save-ok"]');
  conferir(await vazio() && await ev(() => JSON.parse(localStorage.getItem('hypernutry:minhasRef') || '[]').length) === 1, 'Salvar pelo botão do app fecha sem perguntar "Descartar?" e guarda');

  /* ------------------------------------------------------------------ confirmação curta */
  await ev(() => { window.res1 = 'esperando'; HN.confirm('Apagar de mentira?', 'Apagar', { danger: true }).then(v => { window.res1 = v; }); }); await dialogo('.hn-sheet');
  conferir(await ev(() => document.querySelector('dialog.sj[open]').getAttribute('role')) === 'alertdialog' && await abertas() === 1, 'Confirmação aberta da página: janela normal (alertdialog)');
  await page.keyboard.press('Escape'); await vazio();
  conferir(await ev(() => window.res1) === false, 'Esc em "Apagar?" responde não');
  /* por cima de outra janela */
  await ev(() => HN.acts['calc-save']()); await dialogo('.hn-sheet'); await pausa(200);
  await page.fill('dialog.sj[open] #mrn', 'texto na folha');
  await ev(() => { window.res2 = 'esperando'; HN.confirm('Apagar por cima?', 'Apagar', { danger: true }).then(v => { window.res2 = v; }); }); await pausa(300);
  conferir(await abertas() === 2 && await ev(() => document.querySelector('dialog.sj[open]:last-of-type, dialog.sj[open]') !== null), 'Confirmação pedida de dentro de uma janela abre POR CIMA (2 abertas)');
  await page.keyboard.press('Escape'); await pausa(300);
  conferir(await abertas() === 1 && await ev(() => window.res2) === false && await ev(() => document.querySelector('#mrn').value) === 'texto na folha', 'Esc fecha só a confirmação; a folha continua com o texto, sem "Descartar?"');
  await ev(() => { window.res3 = 'esperando'; HN.confirm('Apagar de novo?', 'Apagar').then(v => { window.res3 = v; }); }); await pausa(300);
  await ev(() => HN.layer.closeAllThen(function () { window.fechouTudo = true; })); await pausa(500);
  conferir(await vazio() && await ev(() => window.fechouTudo === true && window.res3 === false), 'Fechar a janela de baixo fecha junto a confirmação, e o app segue');
  await page.click('[data-act="calc-clear"]').catch(() => {});
  await ev(() => { window.res4 = 'esperando'; HN.confirm('Confirmar?', 'Sim').then(v => { window.res4 = v; }); }); await dialogo('.hn-sheet');
  await page.click('dialog.sj[open] [data-act="confirm-ok"]'); await vazio();
  conferir(await ev(() => window.res4) === true, '"Sim" da confirmação responde sim e fecha');

  /* uma janela por vez: a segunda espera a primeira */
  await ev(() => { HN.acts.conv(); HN.acts.conv(); }); await pausa(300);
  conferir(await abertas() === 1 && await ev(() => SolverJanela.esperando()) === 1, 'Uma janela por vez: a segunda espera a primeira fechar');
  await page.keyboard.press('Escape'); await pausa(500); await page.keyboard.press('Escape'); await vazio();

  /* ------------------------------------------------------------------ telas cheias: mindful e cozinhar */
  await iniciar('#/acomp');
  const mf = await ev(() => typeof HN.acts.mf === 'function');
  if (mf) {
    await bateria('Atenção plena (tela cheia)', () => ev(() => HN.acts.mf(0)), { sel: '.hn-full', botao: '[data-act="layer-close"]' });
  }
  await iniciar('');
  await bateria('Cozinhar passo a passo (tela cheia)', () => ev(() => HN.acts.cook(Object.keys(HN.recipes)[0])), { sel: '.hn-full', botao: '[data-act="layer-close"]' });

  /* ------------------------------------------------------------------ câmera (tela cheia) */
  await iniciar('');
  await bateria('Câmera (tela cheia)', () => ev(() => HN.acts.scan()), { sel: '.hn-full', botao: '[data-act="layer-close"]' });
  await ev(() => HN.acts.scan()); await dialogo('.hn-full');
  await page.waitForFunction(() => { const v = document.getElementById('scvideo'); return v && v.srcObject; }, null, { timeout: 8000 }).catch(() => {});
  const ligou = await ev(() => { const v = document.getElementById('scvideo'); return !!(v && v.srcObject); });
  await page.keyboard.press('Escape'); await vazio();
  conferir(!ligou || await ev(() => !document.getElementById('scvideo')), 'Câmera: ao fechar a janela o vídeo sai da tela (a câmera é desligada pelo onClose)');

  /* ------------------------------------------------------------------ inglês */
  await iniciar('');
  await ev(() => HN.setCfg({ lang: 'en' })); await page.reload(); await page.waitForFunction(() => window.HN && window.SolverJanela); await pausa(400);
  await ev(() => { window.res5 = 'esperando'; HN.confirm('Delete this?', 'Delete').then(v => { window.res5 = v; }); }); await dialogo('.hn-sheet');
  conferir(/Cancel/.test(await ev(() => document.querySelector('dialog.sj[open]').textContent)), 'Inglês: a confirmação vem com "Cancel"');
  await page.keyboard.press('Escape'); await vazio();
  await ev(() => HN.setCfg({ lang: 'pt' }));

  /* ------------------------------------------------------------------ chaves de IA: antiga → cofre, PIN, "✓ guardado" */
  await iniciar('');
  await ev(c => { localStorage.setItem('dgo:global:chaves-ia', JSON.stringify({ gemini: c })); }, CHAVE);
  await page.reload(); await page.waitForFunction(() => window.DGO && DGO.versao);
  await page.waitForSelector('dialog#solver-cofre[open]', { timeout: 8000 });
  conferir(await ev(() => !!document.querySelector('dialog#solver-cofre.sj')) && await travada(), 'Chave antiga em texto aberto: o app pede para criar o PIN do cofre (janela comum, página travada)');
  const pins = await page.$$('#solver-cofre input[type=password]');
  await pins[0].fill(PIN); await pins[1].fill(PIN); await page.click('#solver-cofre button[type=submit]');
  await page.waitForFunction(() => SolverCofre.aberto() && SolverCofre.tem('ia:gemini'), null, { timeout: 15000 });
  conferir(true, 'A chave antiga passou para o cofre (SolverCofre.tem("ia:gemini"))');
  await pausa(500); await page.keyboard.press('Escape').catch(() => {}); await pausa(200);
  const abertos = await ev(c => { const r = []; for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if ((localStorage.getItem(k) || '').indexOf(c) !== -1) r.push(k); } for (let i = 0; i < sessionStorage.length; i++) { const k = sessionStorage.key(i); if ((sessionStorage.getItem(k) || '').indexOf(c) !== -1) r.push('s:' + k); } return r; }, CHAVE);
  conferir(abertos.filter(k => k !== 'dgo:global:chaves-ia').length === 0, 'A chave não está em texto aberto em nenhum lugar do app (só a cópia compartilhada "manter" do cofre, para os apps antigos: ' + JSON.stringify(abertos) + ')');

  /* Configurações: painel da digital e tela das chaves */
  await ev(() => HN.go('/config')); await page.waitForFunction(() => document.getElementById('hn-cofre-digital') && document.getElementById('hn-cofre-digital').textContent.trim().length > 0, null, { timeout: 8000 }).catch(() => {});
  conferir(await ev(() => { const p = document.getElementById('hn-cofre-digital'); return !!p && p.textContent.trim().length > 0 && !p.closest('dialog'); }), 'Configurações: o painel da digital (SolverCofre.painelDigital) aparece');
  await ev(() => document.querySelector('[data-act="ia-cofre"]').click()); await dialogo('.dgo-modal'); await pausa(500);
  const cab = await page.$('dialog.sj[open] .dgo-prov-cab:has-text("Gemini")');
  if (cab && await cab.getAttribute('aria-expanded') !== 'true') { await cab.click(); await pausa(400); }
  const tela = await ev(() => { const m = document.querySelector('dialog.sj[open] .dgo-cofre'); const i = m && m.querySelector('input[data-sj-texto]');
    return { achou: !!m, valor: i ? i.value : 'sem', guardado: m ? /✓ guardado/.test(m.textContent) : false,
      mostrar: m ? !!Array.from(m.querySelectorAll('button')).find(b => /Mostrar a chave guardada/.test(b.textContent)) : false,
      texto: m ? m.textContent.indexOf('gsk_chave_de_mentira') !== -1 : true }; });
  conferir(tela.achou && tela.valor === '' && !tela.texto, 'Chaves de IA: a chave guardada NÃO aparece no campo nem na tela');
  conferir(tela.guardado && tela.mostrar, 'Chaves de IA: "✓ guardado" e "Mostrar a chave guardada"');
  conferir(await ev(() => !!document.querySelector('dialog.sj[open] details.dgo-guia, dialog.sj[open] .dgo-guia')), 'Chaves de IA: o guia "como conseguir a chave" é seção que abre DENTRO da janela');
  await page.click('dialog.sj[open] button:has-text("Mostrar a chave guardada")');
  await page.waitForSelector('dialog#solver-cofre[open]', { timeout: 8000 });
  conferir(!(await ev(() => SolverCofre.aberto())), '"Mostrar a chave" tranca o cofre e pede o PIN');
  await page.fill('#solver-cofre input[type=password]', PIN); await page.click('#solver-cofre button[type=submit]');
  await page.waitForFunction(() => SolverCofre.aberto(), null, { timeout: 15000 }); await pausa(500);
  await page.keyboard.press('Escape'); await vazio();

  /* proteger: PIN ao recarregar com chave guardada; sair do app tranca */
  await page.reload();
  await page.waitForSelector('dialog#solver-cofre[open]', { timeout: 8000 }).catch(() => {});
  conferir(await ev(() => !!document.querySelector('dialog#solver-cofre[open]')), 'Recarregar com chave guardada pede o PIN (proteger: true)');
  await page.fill('#solver-cofre input[type=password]', PIN); await page.click('#solver-cofre button[type=submit]');
  await page.waitForFunction(() => SolverCofre.aberto(), null, { timeout: 15000 }); await pausa(300);
  await page.goto(BASE + '/fora/index.html'); await pausa(800);
  conferir(!(await ev(() => SolverCofre.aberto())), 'Sair do app (ir para outro endereço) tranca o cofre');
  await page.goto(BASE + '/index.html'); await page.waitForFunction(() => window.DGO && DGO.versao);
  await page.waitForSelector('dialog#solver-cofre[open]', { timeout: 8000 }).catch(() => {});
  conferir(await ev(() => !!document.querySelector('dialog#solver-cofre[open]')), 'Voltar ao app pede o PIN de novo');
  await page.mouse.click(5, 5); await pausa(300);
  conferir(await vazio(), 'a janela do PIN fecha tocando fora ("Agora não")');

  conferir(!consoles.concat(erros).some(a => a.indexOf(PIN) !== -1 || a.indexOf(CHAVE) !== -1), 'nenhum PIN ou chave aparece no console');
  if (erros.length) falhas.push(nome + ': erros de página: ' + erros.join(' | '));
  await ctx.close();
}

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME || undefined, args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'] });
  /* a página de conferência que o repositório já tinha */
  const pg = await browser.newPage();
  await pg.goto(BASE + '/TESTE-hypernutry.html');
  const saida = await pg.evaluate(() => document.getElementById('o').textContent);
  conferir(saida.indexOf('FALHOU') === -1 && saida.indexOf('OK') !== -1, 'TESTE-hypernutry.html (conferência que já existia): ' + saida.split('\n').length + ' testes, nenhum falhou');
  await pg.close();
  await rodar(browser, 'celular 390 px', { width: 390, height: 780 });
  await rodar(browser, 'computador 1280 px', { width: 1280, height: 800 });
  await browser.close();
  if (falhas.length) { console.log('\nFALHOU (' + falhas.length + ' de ' + total + '):\n - ' + falhas.join('\n - ')); process.exit(1); }
  console.log('\nOK: ' + total + ' conferências — janelas do HyperNutry pela janela comum e chaves de IA no cofre.');
})().catch(e => { console.error('Erro no teste:', e.message); process.exit(1); });

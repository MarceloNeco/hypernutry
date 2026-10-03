/* HyperNutry — boas-vindas, wizards de anamnese, Início, Diário e Nutrição Intuitiva. */
(function (HN) {
  'use strict';
  var S = HN.S, C = HN.calc, U = HN.ui, esc = HN.esc, T = HN.T, V = HN.views, A = HN.acts;

  var SCALE_HINT = function (v) {
    if (v <= 2) return T('Fome intensa. Coma algo que sustente (proteína + fibra), devagar.', 'Intense hunger. Eat something that lasts (protein + fiber), slowly.');
    if (v <= 4) return T('Boa hora de comer: o corpo está pedindo.', 'Good time to eat: your body is asking.');
    if (v <= 6) return T('Fome leve ou neutro. Se não for hora, espere um pouco e volte a checar.', 'Mild hunger or neutral. If it is not time, wait a bit and check again.');
    if (v <= 8) return T('Satisfeito. Pode parar por aqui, sem pressa.', 'Satisfied. You can stop here, no rush.');
    return T('Bem cheio. Sem culpa: só observe como você se sente.', 'Very full. No guilt: just notice how you feel.');
  };
  HN.scaleHint = SCALE_HINT;
  var LO = function () { return T('1 faminto', '1 starving'); }, HI = function () { return T('10 muito cheio', '10 stuffed'); };

  /* ================= BOAS-VINDAS ================= */
  V.boasvindas = function () {
    var d = HN.draftWelcome || (HN.draftWelcome = { a: false, b: false });
    return '<div class="center" style="padding-top:.6rem"><div style="width:84px;margin:0 auto .6rem">' + HN.logo + '</div><h1 style="font-size:1.9rem">Hyper<span style="color:var(--brand)">Nutry</span></h1>' +
      '<p style="font-size:1.1rem;font-weight:600">' + T('Nutrição fácil, ao alcance de todos.', 'Easy nutrition, within everyone\'s reach.') + '</p>' +
      '<p class="muted">' + T('Saciedade de verdade, sem passar fome. Sem culpa, sem fórmula mágica.', 'Real fullness, without going hungry. No guilt, no magic formula.') + '</p></div>' +
      '<div class="card mt2"><h3>' + T('Antes de começar', 'Before you start') + '</h3>' + U.legal() +
      '<label class="chk"><input type="checkbox" data-in="wel-a" ' + (d.a ? 'checked' : '') + '><span class="tx">' + T('Entendo que o HyperNutry é educativo e não substitui nutricionista nem médico.', 'I understand HyperNutry is educational and does not replace a dietitian or doctor.') + '</span></label>' +
      '<label class="chk"><input type="checkbox" data-in="wel-b" ' + (d.b ? 'checked' : '') + '><span class="tx">' + T('Autorizo o uso dos meus dados de saúde <b>somente neste aparelho</b> (LGPD, art. 11, I). Nada é enviado a servidores. Posso exportar ou apagar tudo quando quiser.', 'I authorize use of my health data <b>on this device only</b> (LGPD art. 11, I). Nothing is sent to servers. I can export or delete everything any time.') + '</span></label>' +
      '<details class="acc mt"><summary>' + T('Como seus dados são tratados', 'How your data is handled') + '</summary><div class="small">' +
      '<p>' + T('<b>Dados:</b> medidas, hábitos, saúde e o que você registra. <b>Finalidade:</b> personalizar sugestões. <b>Onde ficam:</b> só neste aparelho (armazenamento do navegador). <b>Fotos de rótulos e laudos</b> são lidas no próprio aparelho; o motor de leitura, se precisar baixar, só baixa o programa — a foto não é enviada.', '<b>Data:</b> measurements, habits, health and what you log. <b>Purpose:</b> personalise suggestions. <b>Where:</b> this device only (browser storage). <b>Photos of labels and reports</b> are read on the device; if the reading engine must be downloaded, only the program is downloaded — the photo is not uploaded.') + '</p>' +
      '<p>' + T('<b>Seus direitos:</b> exportar (JSON), corrigir e apagar — em Configurações. <b>Menores de 18:</b> peça a um responsável para acompanhar. <b>Controlador:</b> será identificado antes do lançamento comercial.', '<b>Your rights:</b> export (JSON), correct and delete — in Settings. <b>Under 18:</b> ask a guardian to help. <b>Controller:</b> will be identified before commercial launch.') + '</p></div></details>' +
      '<button class="btn block mt" data-act="wel-go">' + T('Começar meu perfil', 'Start my profile') + ' →</button>' +
      '<button class="btn ghost block mt" data-act="go" data-arg="/">← ' + T('Voltar para a calculadora (não pede dados)', 'Back to the calculator (asks for no data)') + '</button><button class="btn ghost block mt" data-act="wel-demo">' + T('Só quero olhar (não salva nada)', 'Just looking (saves nothing)') + '</button></div>';
  };
  HN.ins['wel-a'] = function (v) { HN.draftWelcome.a = v; }; HN.ins['wel-b'] = function (v) { HN.draftWelcome.b = v; };
  A['wel-go'] = function () {
    var d = HN.draftWelcome || {}; if (!d.a || !d.b) { HN.toast(T('Marque as duas caixas para continuar.', 'Tick both boxes to continue.')); return; }
    HN.setCfg({ aceite: { versao: '1.0', data: new Date().toISOString(), saude: true } }); HN.go('/wizard/1', { replace: true });
  };
  A['wel-demo'] = function () {
    S.setVolatile(true); S.set('cfg', { lang: HN.lang, aceite: { versao: 'demo', data: new Date().toISOString() }, demo: true });
    HN.savePerfil({ id: 'demo', nome: T('Visitante', 'Guest'), nasc: '1990-06-15', sexo: 'F', altura: 165, peso: 65, fator: 1.375, modo: 'hibrido', restricoes: [], equipamentos: ['stove', 'microwave', 'blender'], moradores: 2, tempo: 45, habilidade: 2, alergias: [] });
    HN.toast(T('Modo visitante: nada será salvo ao fechar.', 'Guest mode: nothing is saved when you close.')); HN.go('/acomp', { replace: true });
  };

  /* ================= WIZARD ================= */
  var EQ = ['stove', 'oven', 'airfryer', 'microwave', 'blender', 'pressure', 'eletric', 'processor'];
  function wd() { var d = S.get('wizDraft'); if (!d) { var p = HN.perfil(); d = p ? JSON.parse(JSON.stringify(p)) : { modo: null, restricoes: [], equipamentos: [], diag: [], hist: [], modalidades: [], moradores: 1 }; S.set('wizDraft', d); } return d; }
  function setWd(k, v) { var d = wd(); d[k] = v; S.set('wizDraft', d); }
  HN.ins.wiz = function (v, el) { var k = el.getAttribute('data-k'), t = el.getAttribute('data-t'); setWd(k, t === 'n' ? (v === '' ? null : +v) : v); if (k === 'nasc' || k === 'sexo') HN.refresh(); };
  function toggle(key, v) { var d = wd(), a = d[key] || [], i = a.indexOf(v); if (i >= 0) a.splice(i, 1); else a.push(v); d[key] = a; S.set('wizDraft', d); HN.refresh(); }
  ['restricoes', 'diag', 'hist', 'modalidades'].forEach(function (k) { HN.chipFn['wz.' + k] = function (v) { toggle(k, v); }; });
  HN.chipFn['wz.one'] = function (v) { var p = v.split(':'); setWd(p[0], isNaN(+p[1]) ? p[1] : +p[1]); HN.refresh(); };
  HN.chipFn['wz.bool'] = function (v) { var p = v.split(':'); setWd(p[0], p[1] === '1'); HN.refresh(); };
  A.eq = function (id) { toggle('equipamentos', id); };
  A['wmode'] = function (m) { setWd('modo', m); HN.refresh(); };
  function one(key, opts, d) { return U.chips('wz.one', opts.map(function (o) { return [key + ':' + o[0], o[1], o[2], o[3]]; }), key + ':' + d[key], false); }
  function yn(key, d) { return U.chips('wz.bool', [[key + ':1', 'Sim', 'Yes'], [key + ':0', 'Não', 'No']], key + ':' + (d[key] ? 1 : 0), false); }

  V.wizard = function (parts) {
    var s = HN.clamp(+parts[1] || 1, 1, 5), d = wd(), age = d.nasc ? HN.idade(d) : null, h = '';
    h += '<div class="wiz-top"><div class="row small muted"><b>' + T('Passo', 'Step') + ' ' + s + '/5 — ' + [T('Biometria', 'Biometrics'), T('Estilo de vida', 'Lifestyle'), T('Saúde e alergias', 'Health & allergies'), T('Rotina e cozinha', 'Routine & kitchen'), T('Seu modo', 'Your mode')][s - 1] + '</b></div><div class="wiz-dots mt">' + [1, 2, 3, 4, 5].map(function (i) { return '<i class="' + (i <= s ? 'on' : '') + '"></i>'; }).join('') + '</div></div>';
    if (s === 1) {
      h += '<div class="card"><h2>' + T('Vamos nos conhecer', 'Let\'s get to know you') + '</h2><p class="muted small">' + T('Só o necessário. Você pode pular o que não quiser informar.', 'Only what is needed. Skip anything you prefer not to share.') + '</p>' +
        '<label class="f" for="w-nome">' + T('Como quer ser chamado(a)?', 'What should we call you?') + '</label><input id="w-nome" type="text" data-in="wiz" data-k="nome" value="' + esc(d.nome || '') + '" autocomplete="nickname">' +
        '<label class="f" for="w-nasc">' + T('Data de nascimento', 'Date of birth') + '</label><input id="w-nasc" type="date" data-in="wiz" data-k="nasc" value="' + esc(d.nasc || '') + '" max="' + HN.today() + '">' +
        '<label class="f">' + T('Sexo biológico (usado só nas equações)', 'Biological sex (used only in equations)') + '</label>' + one('sexo', [['F', 'Feminino', 'Female'], ['M', 'Masculino', 'Male']], d) +
        '<label class="f">' + T('Identidade de gênero (opcional)', 'Gender identity (optional)') + '</label>' + one('genero', [['mulher', 'Mulher', 'Woman'], ['homem', 'Homem', 'Man'], ['nb', 'Não-binário', 'Non-binary'], ['nd', 'Prefiro não dizer', 'Prefer not to say']], d) +
        '<div class="row mt"><div class="grow"><label class="f" for="w-alt">' + T('Altura (cm)', 'Height (cm)') + '</label><input id="w-alt" type="number" inputmode="decimal" data-in="wiz" data-k="altura" data-t="n" value="' + (d.altura || '') + '"></div><div class="grow"><label class="f" for="w-peso">' + T('Peso (kg) — opcional', 'Weight (kg) — optional') + '</label><input id="w-peso" type="number" inputmode="decimal" data-in="wiz" data-k="peso" data-t="n" value="' + (d.peso || '') + '"></div></div>' +
        '<label class="f" for="w-fat">' + T('% de gordura corporal (se souber)', 'Body-fat % (if known)') + '</label><input id="w-fat" type="number" inputmode="decimal" data-in="wiz" data-k="gordura" data-t="n" value="' + (d.gordura || '') + '">' +
        '<button class="btn sec sm mt" data-act="wiz-bio">📷 ' + T('Importar de foto de laudo (InBody)', 'Import from a report photo (InBody)') + '</button>' +
        '<label class="f" for="w-fator">' + T('Atividade física na semana', 'Weekly physical activity') + '</label><select id="w-fator" data-in="wiz" data-k="fator" data-t="n">' + C.activityFactors.map(function (a) { return '<option value="' + a.v + '"' + (+d.fator === a.v ? ' selected' : '') + '>' + HN.tt([a.pt, a.en]) + '</option>'; }).join('') + '</select>' +
        (age != null && age < 18 ? '<div class="mt">' + U.notice('warn', T('Menor de 18 anos: peça a um responsável para acompanhar. Por segurança, o app não mostra calorias nem metas numéricas.', 'Under 18: ask a guardian to help. For safety, the app does not show calories or numeric goals.')) + '</div>' : '') + '</div>';
    }
    if (s === 2) {
      h += '<div class="card"><h2>' + T('Como é o seu dia a dia', 'What your day looks like') + '</h2>' +
        '<label class="f">' + T('Bebida alcoólica', 'Alcohol') + '</label>' + one('alcool', [['nunca', 'Nunca', 'Never'], ['as_vezes', 'Às vezes', 'Sometimes'], ['frequente', 'Frequente', 'Often']], d) +
        '<label class="f">' + T('Tabagismo', 'Smoking') + '</label>' + one('tabaco', [['nao', 'Não fumo', 'Non-smoker'], ['ex', 'Ex-fumante', 'Ex-smoker'], ['sim', 'Fumo', 'Smoker']], d) +
        '<label class="f" for="w-sono">' + T('Horas de sono por noite', 'Hours of sleep per night') + '</label><input id="w-sono" type="number" inputmode="decimal" min="0" max="14" step="0.5" data-in="wiz" data-k="sono" data-t="n" value="' + (d.sono || '') + '">' +
        '<label class="f">' + T('O que você pratica?', 'What do you practise?') + '</label>' + U.chips('wz.modalidades', [['caminhada', 'Caminhada', 'Walking', '🚶'], ['musculacao', 'Musculação', 'Weights', '🏋️'], ['corrida', 'Corrida', 'Running', '🏃'], ['bike', 'Bicicleta', 'Cycling', '🚴'], ['natacao', 'Natação', 'Swimming', '🏊'], ['yoga', 'Yoga/Pilates', 'Yoga/Pilates', '🧘'], ['futebol', 'Futebol/esportes', 'Team sports', '⚽'], ['danca', 'Dança', 'Dance', '💃'], ['nenhuma', 'Nenhuma por enquanto', 'None for now', '🛋️']], d.modalidades, true) + '</div>';
    }
    if (s === 3) {
      h += '<div class="card"><h2>' + T('Saúde, alergias e preferências', 'Health, allergies and preferences') + '</h2>' +
        U.notice('warn', T('Alergia grave? <b>Sempre confira o rótulo.</b> O app ajuda, mas não substitui a leitura da embalagem.', 'Severe allergy? <b>Always check the label.</b> The app helps but does not replace reading the package.')) +
        '<label class="f">' + T('Alergias, intolerâncias e preferências', 'Allergies, intolerances and preferences') + '</label>' + U.chips('wz.restricoes', U.RESTR, d.restricoes, true) +
        '<label class="f">' + T('Diagnósticos que você já recebeu', 'Diagnoses you have received') + '</label>' + U.chips('wz.diag', [['has', 'Hipertensão', 'Hypertension'], ['dm', 'Diabetes', 'Diabetes'], ['dislip', 'Colesterol/triglicerídeos altos', 'High cholesterol/triglycerides'], ['celiaca', 'Doença celíaca', 'Celiac disease'], ['renal', 'Doença renal', 'Kidney disease'], ['outro', 'Outro', 'Other']], d.diag, true) +
        '<label class="f">' + T('Histórico na família', 'Family history') + '</label>' + U.chips('wz.hist', [['has', 'Hipertensão', 'Hypertension'], ['dm', 'Diabetes', 'Diabetes'], ['cardio', 'Doença do coração', 'Heart disease'], ['obesidade', 'Obesidade', 'Obesity']], d.hist, true) +
        ((d.diag || []).length ? '<div class="mt">' + U.notice('info', T('Com diagnóstico, o ideal é seguir a orientação de quem acompanha você. O app mostra apenas informações gerais.', 'With a diagnosis, follow your care team. The app only shows general information.')) + '</div>' : '') +
        '<label class="f">' + T('Você tem ou já teve transtorno alimentar (anorexia, bulimia, compulsão)?', 'Do you have or have you had an eating disorder (anorexia, bulimia, binge eating)?') + '</label>' + yn('historicoTA', d) +
        (d.historicoTA ? '<div class="mt">' + U.notice('info', T('Obrigado por contar. Vamos esconder calorias, metas e balança e usar só o modo intuitivo. Se puder, mantenha acompanhamento profissional.', 'Thank you for telling us. We will hide calories, goals and scale and use intuitive mode only. If possible, keep professional follow-up.')) + '</div>' : '') +
        (d.sexo === 'F' ? '<label class="f">' + T('Está gestante ou amamentando?', 'Pregnant or breastfeeding?') + '</label>' + yn('gestante', d) + (d.gestante ? '<div class="mt">' + U.notice('info', T('Gestação e amamentação exigem acompanhamento próprio. Metas numéricas ficam ocultas.', 'Pregnancy and breastfeeding need dedicated follow-up. Numeric goals stay hidden.')) + '</div>' : '') : '') + '</div>';
    }
    if (s === 4) {
      h += '<div class="card"><h2>' + T('Sua cozinha e sua rotina', 'Your kitchen and routine') + '</h2>' +
        '<label class="f">' + T('Quem prepara as refeições?', 'Who prepares meals?') + '</label>' + one('quem', [['eu', 'Eu mesmo(a)', 'Me'], ['cozinheira', 'Cozinheiro(a)/funcionário(a)', 'A cook/employee'], ['familia', 'Alguém da família', 'Family member'], ['delivery', 'Mais delivery/pronto', 'Mostly delivery/ready']], d) +
        '<label class="f">' + T('Tempo por dia para cozinhar', 'Time per day to cook') + '</label>' + one('tempo', [['15', '15 min', '15 min'], ['30', '30 min', '30 min'], ['45', '45 min', '45 min'], ['90', '1h ou mais', '1h or more']], { tempo: String(d.tempo || '') }) +
        '<label class="f">' + T('Orçamento mensal de compras (faixa)', 'Monthly grocery budget (range)') + '</label>' + one('orcamento', [['baixo', 'Até R$ 600', 'Up to R$ 600'], ['medio', 'R$ 600–1.500', 'R$ 600–1,500'], ['alto', 'Acima de R$ 1.500', 'Over R$ 1,500']], d) +
        '<label class="f">' + T('Habilidade na cozinha', 'Cooking skill') + '</label>' + one('habilidade', [['1', 'Iniciante', 'Beginner'], ['2', 'Me viro bem', 'Comfortable'], ['3', 'Avançado(a)', 'Advanced']], { habilidade: String(d.habilidade || '') }) +
        '<label class="f" for="w-mor">' + T('Quantas pessoas comem em casa?', 'How many people eat at home?') + '</label><input id="w-mor" type="number" inputmode="numeric" min="1" max="12" data-in="wiz" data-k="moradores" data-t="n" value="' + (d.moradores || 1) + '">' +
        '<label class="f">' + T('O que você tem na cozinha?', 'What do you have in the kitchen?') + '</label><div class="icons">' + EQ.map(function (id) { var e = HN.equipment[id], on = (d.equipamentos || []).indexOf(id) >= 0; return '<button type="button" class="ico' + (on ? ' on' : '') + '" data-act="eq" data-arg="' + id + '" aria-pressed="' + on + '"><span class="e" aria-hidden="true">' + e[2] + '</span>' + HN.tt([e[0], e[1]]) + '</button>'; }).join('') + '</div></div>';
    }
    if (s === 5) {
      var blocked = HN.alertas({ nasc: d.nasc, historicoTA: d.historicoTA, gestante: d.gestante }).length > 0, noData = !(d.peso && d.altura);
      var hyDis = blocked || noData;
      if (hyDis && d.modo === 'hibrido') d.modo = null;
      h += '<div class="card"><h2>' + T('Como você quer usar o HyperNutry?', 'How do you want to use HyperNutry?') + '</h2><p class="muted small">' + T('Dá para trocar a qualquer momento em Configurações.', 'You can switch anytime in Settings.') + '</p>' +
        '<button class="mode' + (d.modo === 'intuitivo' ? ' on' : '') + '" data-act="wmode" data-arg="intuitivo"><h3>🧘 ' + T('Modo Intuitivo Integral', 'Full Intuitive mode') + '</h3><div class="small">' + T('Foco nos sinais do corpo (fome, saciedade, emoções) e em reconstruir a relação com a comida. <b>Sem metas de calorias e sem contar nada.</b>', 'Focus on body signals (hunger, fullness, emotions) and rebuilding your relationship with food. <b>No calorie targets, no counting.</b>') + '</div></button>' +
        '<button class="mode' + (d.modo === 'hibrido' ? ' on' : '') + (hyDis ? ' dis' : '') + '" data-act="wmode" data-arg="hibrido"><h3>⚖️ ' + T('Modo Híbrido Adaptativo', 'Adaptive Hybrid mode') + '</h3><div class="small">' + T('Diário intuitivo + metas em <b>faixas flexíveis</b> (nunca um número rígido) e conta de macros como referência.', 'Intuitive diary + goals in <b>flexible ranges</b> (never one rigid number) and macros as a reference.') + '</div>' + (hyDis ? '<div class="small mt" style="color:var(--warn)">' + (blocked ? T('Indisponível para menores de 18, gestantes ou com histórico de transtorno alimentar.', 'Unavailable for under-18s, pregnancy or eating-disorder history.') : T('Informe altura e peso no passo 1 para liberar.', 'Enter height and weight in step 1 to unlock.')) + '</div>' : '') + '</button></div>';
    }
    h += '<div class="row mt2">' + (s > 1 ? '<button class="btn ghost" data-act="wiz-prev" data-arg="' + s + '">←</button>' : '') + '<button class="btn grow" data-act="wiz-next" data-arg="' + s + '">' + (s === 5 ? T('Concluir', 'Finish') + ' ✓' : T('Continuar', 'Continue') + ' →') + '</button></div>' +
      (s < 5 ? '<p class="center small muted mt">' + T('Suas respostas ficam salvas se você sair agora.', 'Your answers are saved if you leave now.') + '</p>' : '');
    return h;
  };
  A['wiz-bio'] = function () { if (HN.bioSheet) HN.bioSheet(function (v) { if (v.peso) setWd('peso', v.peso); if (v.gordura) setWd('gordura', v.gordura); HN.refresh(); HN.toast(T('Valores importados. Confira os campos.', 'Values imported. Please check the fields.')); }); };
  A['wiz-prev'] = function (s) { HN.go('/wizard/' + (+s - 1), { replace: true }); };
  A['wiz-next'] = function (s) {
    s = +s; var d = wd();
    if (s === 1) {
      if (!d.nasc) { HN.toast(T('Informe a data de nascimento.', 'Enter your date of birth.')); return; }
      if (!d.sexo) { HN.toast(T('Escolha o sexo biológico (usado só nas equações).', 'Choose biological sex (used only in equations).')); return; }
      var age = HN.idade(d); if (age < 0 || age > 110) { HN.toast(T('Data de nascimento inválida.', 'Invalid date of birth.')); return; }
      if (d.altura && (d.altura < 50 || d.altura > 250)) { HN.toast(T('Altura fora do esperado (50–250 cm).', 'Height out of range (50–250 cm).')); return; }
      if (d.peso && (d.peso < 15 || d.peso > 400)) { HN.toast(T('Peso fora do esperado.', 'Weight out of range.')); return; }
    }
    if (s < 5) { HN.go('/wizard/' + (s + 1), { replace: true }); return; }
    if (!d.modo) { HN.toast(T('Escolha um modo para continuar.', 'Choose a mode to continue.')); return; }
    var p = HN.perfil(); d.id = p ? p.id : HN.id(); d.nome = d.nome || T('Você', 'You'); d.tempo = d.tempo ? +d.tempo : 45; d.habilidade = d.habilidade ? +d.habilidade : 2; d.equipamentos = d.equipamentos || []; d.moradores = d.moradores || 1; d.principal = true;
    HN.savePerfil(d); S.set('perfilAtivo', d.id); S.del('wizDraft'); S.del('cardapio'); HN.setCfg({ wizardOk: true });
    HN.toast(T('Perfil pronto! Bem-vindo(a) 🌱', 'Profile ready! Welcome 🌱')); HN.go('/acomp', { replace: true });
  };

  /* ================= INÍCIO ================= */
  var TIPS = [
    ['Comece o prato pelos vegetais e pela proteína: eles seguram a fome por mais tempo.', 'Start your plate with vegetables and protein: they hold hunger longer.'],
    ['Pause os talheres entre as garfadas. A saciedade leva uns 20 minutos para chegar.', 'Put your cutlery down between bites. Fullness takes about 20 minutes to arrive.'],
    ['Nenhum alimento é proibido. Permissão para comer tira o poder da "vontade incontrolável".', 'No food is forbidden. Permission to eat takes the power out of "uncontrollable cravings".'],
    ['Feijão + arroz + salada é uma combinação brasileira completa e que sustenta.', 'Beans + rice + salad is a complete, filling Brazilian combo.'],
    ['Beba água ao longo do dia. Às vezes a sede se parece com fome.', 'Drink water through the day. Sometimes thirst looks like hunger.'],
    ['Cheque a fome de 1 a 10 antes de comer. Ideal: começar por volta de 3–4 e parar por volta de 6–7.', 'Check hunger 1–10 before eating. Ideal: start around 3–4 and stop around 6–7.'],
    ['Dormir bem ajuda o apetite. Veja como foi seu sono em Corpo e bem-estar.', 'Sleeping well helps appetite. See your sleep in Body & well-being.']
  ];
  function todayEntries() { var k = HN.today(); return (S.get('diario', []) || []).filter(function (e) { return HN.dayKey(e.ts) === k; }); }
  HN.todayEntries = todayEntries;
  HN.metasCfg = function () { return S.get('metasCfg', { metodo: 'mifflin', delta: 0.10, ajuste: 0, macro: 'equilibrado' }); };
  HN.faixaHoje = function (p) {
    if (!HN.numerosOk(p)) return null; var pc = HN.perfilCalc(p); if (!(pc.peso && pc.altura && pc.idade != null)) return null;
    var m = HN.metasCfg(), g = C.get(pc, m.metodo); var f = C.faixa(g, m.delta, m.ajuste); var piso = C.piso(pc.sexo); f.piso = piso; f.abaixoPiso = f.min < piso; if (f.min < piso) { f.min = piso; if (f.centro < piso) f.centro = piso; } f.get = g; return f;
  };

  V.acomp = function () {
    var p = HN.perfil(); if (!p || !HN.cfg().aceite) return V.boasvindas();
    var ents = todayEntries(), h = '', now = new Date(), nome = p.nome ? p.nome.split(' ')[0] : '';
    var greet = now.getHours() < 12 ? T('Bom dia', 'Good morning') : now.getHours() < 18 ? T('Boa tarde', 'Good afternoon') : T('Boa noite', 'Good evening');
    h += '<div class="card hero"><div class="row"><div class="grow"><div class="small" style="opacity:.85">' + HN.fmtDate(now) + '</div><h1 style="margin:.1rem 0">' + greet + (nome ? ', ' + esc(nome) : '') + '!</h1><div class="small" style="opacity:.9">' + (p.modo === 'hibrido' ? '⚖️ ' + T('Modo Híbrido', 'Hybrid mode') : '🧘 ' + T('Modo Intuitivo', 'Intuitive mode')) + (S.isVolatile() ? ' · ' + T('visitante', 'guest') : '') + '</div></div><button class="btn sm" style="background:#fff;color:#0d6b47" data-act="go" data-arg="/diario/novo">＋ ' + T('Registrar', 'Log') + '</button></div></div>';
    // check-in de fome
    var last = (S.get('sinais', []) || []).slice(-1)[0], lastTxt = last ? '<div class="small muted mt">' + T('Último check-in: ', 'Last check-in: ') + last.v + '/10 · ' + HN.fmtDate(last.ts, true) + '</div>' : '';
    h += '<div class="card"><h3>🍽️ ' + T('Como está sua fome agora?', 'How hungry are you right now?') + '</h3>' + U.slider('ck', HN.ckVal || null, LO(), HI()) + '<div id="ckmsg" class="small mt" style="min-height:1.4rem">' + (HN.ckVal ? SCALE_HINT(HN.ckVal) : T('Arraste até o número que combina com agora. Ao soltar, fica salvo. Não existe resposta errada.', 'Drag to the number that fits right now. It saves when you let go. There is no wrong answer.')) + '</div>' + lastTxt + '</div>';
    // resumo do dia
    h += '<div class="card"><h3>' + T('Seu dia', 'Your day') + '</h3>';
    var fx = HN.faixaHoje(p);
    if (fx) {
      var tot = C.totais([].concat.apply([], ents.map(function (e) { return e.items || []; }))), mcfg = HN.metasCfg(), mc = C.macros(fx.centro, C.presetsMacro[mcfg.macro] || C.presetsMacro.equilibrado);
      h += U.ring({ rings: [
        { l: T('Energia', 'Energy'), v: tot.kcal, t: fx.centro, c: 'var(--brand)', u: ' kcal' },
        { l: T('Proteína', 'Protein'), v: tot.p, t: mc.p.g, c: 'var(--cyan)', u: ' g' },
        { l: T('Carboidratos', 'Carbs'), v: tot.c, t: mc.c.g, c: 'var(--accent)', u: ' g' },
        { l: T('Gorduras', 'Fat'), v: tot.f, t: mc.f.g, c: '#ec4899', u: ' g' }
      ], center: { big: HN.num(tot.kcal), small: T('de ', 'of ') + fx.min + '–' + fx.max } }) +
        '<p class="small muted mt">' + (tot.kcal === 0 ? T('Nada registrado ainda. A faixa é só uma referência — sentir fome e saciedade vem primeiro.', 'Nothing logged yet. The range is just a reference — feeling hunger and fullness comes first.') : tot.kcal < fx.min ? T('Abaixo da faixa por enquanto: ainda dá tempo, e tudo bem variar.', 'Below the range so far: there is time, and variation is fine.') : tot.kcal <= fx.max ? T('Dentro da faixa tranquila (anel violeta). Escute sua saciedade.', 'Within the calm range (violet ring). Listen to your fullness.') : T('Acima da faixa hoje. Tudo bem: um dia não define nada. Amanhã é outro dia.', 'Above the range today. That is fine: one day defines nothing.')) + '</p>';
    } else {
      var hb = ents.filter(function (e) { return e.hb != null; }), sa = ents.filter(function (e) { return e.sa != null; });
      var avg = function (a, k) { return a.length ? HN.num(a.reduce(function (s, e) { return s + e[k]; }, 0) / a.length, 1) : '–'; };
      h += '<div class="stat"><div><b>' + ents.length + '</b><span>' + T('refeições hoje', 'meals today') + '</span></div><div><b>' + avg(hb, 'hb') + '</b><span>' + T('fome média antes', 'avg hunger before') + '</span></div><div><b>' + avg(sa, 'sa') + '</b><span>' + T('saciedade depois', 'fullness after') + '</span></div></div>' +
        '<p class="small muted mt">' + (ents.length ? T('Sem números de calorias aqui, de propósito. O que importa é como você se sentiu.', 'No calorie numbers here, on purpose. What matters is how you felt.') : T('Registre uma refeição quando quiser: o que comeu e como se sentiu.', 'Log a meal when you like: what you ate and how you felt.')) + '</p>';
    }
    h += '</div>';
    // pendentes de congruência
    var pend = (S.get('diario', []) || []).filter(function (e) { return !e.congr && e.ts < Date.now() - 2 * 3600e3 && e.ts > Date.now() - 24 * 3600e3; });
    if (pend.length) h += '<div class="card tap" role="button" tabindex="0" data-act="go" data-arg="/intuitivo/congruencia"><div class="row"><span style="font-size:1.6rem">🔁</span><div class="grow"><b>' + T('Como você se sentiu depois de comer?', 'How did you feel after eating?') + '</b><div class="small muted">' + pend.length + ' ' + T('refeição(ões) para avaliar (energia e digestão)', 'meal(s) to rate (energy and digestion)') + '</div></div>›</div></div>';
    // atalhos
    var sc = ['diario', 'saciedade', 'receitas', 'planejar', 'rotulos', 'compras', 'corpo', 'metas'];
    h += '<div class="grid mb">' + sc.map(function (id) { var n = HN.nav[id]; return '<button class="sc" data-act="go" data-arg="' + n.r + '"><span class="e" aria-hidden="true">' + n.e + '</span>' + HN.tt([n.pt, n.en]) + '</button>'; }).join('') + '</div>';
    // sugestão do dia
    if (HN.getCardapio) {
      var cd = HN.getCardapio(), di = (now.getDay() + 6) % 7, dia = cd.dias[di], rows = '';
      U.MEALS.slice(0, 4).forEach(function (m) { var rid = dia[m[0]], r = rid && HN.recipes[rid]; if (r) rows += '<button class="li" data-act="go" data-arg="/receita/' + r.id + '"><span class="e">' + m[3] + '</span><span class="grow"><div class="t">' + esc(HN.tt([r.pt, r.en])) + '</div><div class="s">' + U.mealName(m[0]) + ' · ' + r.time + ' min</div></span>›</button>'; });
      if (rows) h += '<div class="card"><div class="row"><h3 class="grow">🗓️ ' + T('Cardápio de hoje', 'Today\'s menu') + '</h3><button class="btn sm sec" data-act="go" data-arg="/planejar">' + T('Semana', 'Week') + '</button></div><div class="list">' + rows + '</div></div>';
    }
    h += '<div class="card"><h3>💡 ' + T('Dica do dia', 'Tip of the day') + '</h3><p style="margin:0">' + HN.tt(TIPS[Math.floor(Date.now() / 864e5) % TIPS.length]) + '</p></div>';
    h += '<div class="card small"><div class="kv"><span>' + T('Base de alimentos', 'Food base') + '</span><b>' + HN.foodBase.count + ' ' + T('itens', 'items') + ' · ' + HN.foodBase.name + '</b></div><div class="kv"><span>' + T('Funciona sem internet', 'Works offline') + '</span><b>' + (('serviceWorker' in navigator) ? '✅' : '⚠️') + ' · ' + (navigator.onLine ? T('conectado', 'online') : T('sem conexão', 'offline')) + '</b></div><div class="kv"><span>' + T('Versão', 'Version') + '</span><b>' + HN.version + '</b></div></div>' + U.legal();
    return h;
  };
  var ckT;
  HN.ins['hs-ck'] = function (v, el, e) {
    var n = HN.ui.sliderMove(el), m = HN.q('#ckmsg'); if (m) m.textContent = SCALE_HINT(n);
    if (e.type === 'change') { clearTimeout(ckT); ckT = setTimeout(function () { HN.chipFn.ck(n); }, 600); } // teclado gera vários "change": junta num só registro
  };
  HN.chipFn.ck = function (v) {
    var l = S.get('sinais', []); l.push({ ts: Date.now(), v: v }); S.set('sinais', l.slice(-500)); HN.ckVal = v;
    HN.qa('.scale button').forEach(function (b) { var on = b.getAttribute('data-arg') === 'ck|' + v; b.classList.toggle('on', on); b.setAttribute('aria-pressed', on); });
    var m = HN.q('#ckmsg'); if (m) m.textContent = SCALE_HINT(v); HN.toast(T('Check-in salvo ✓', 'Check-in saved ✓'), 1400);
  };

  /* ================= DIÁRIO ================= */
  function draftNew() { return { meal: guessMeal(), hb: null, sa: null, items: [], trig: [], mood: '', note: '' }; }
  function guessMeal() { var h = new Date().getHours(); return h < 10 ? 'cafe' : h < 14 ? 'almoco' : h < 17 ? 'lanche' : h < 22 ? 'jantar' : 'ceia'; }
  V.diario = function () {
    var l = (S.get('diario', []) || []).slice().sort(function (a, b) { return b.ts - a.ts; }), days = {}, order = [];
    l.forEach(function (e) { var k = HN.dayKey(e.ts); if (!days[k]) { days[k] = []; order.push(k); } days[k].push(e); });
    var h = U.title('📝', T('Diário', 'Diary'), T('O que você comeu e como se sentiu', 'What you ate and how you felt')) + '<button class="btn block mb" data-act="go" data-arg="/diario/novo">＋ ' + T('Registrar refeição', 'Log a meal') + '</button>';
    if (!order.length) h += '<div class="card center"><p style="font-size:2rem;margin:0">🍽️</p><p>' + T('Nenhuma refeição registrada ainda.', 'No meals logged yet.') + '</p></div>';
    order.slice(0, 14).forEach(function (k) {
      var es = days[k].sort(function (a, b) { return a.ts - b.ts; }), d = new Date(es[0].ts);
      h += '<div class="card"><h3>' + HN.fmtDate(d) + (k === HN.today() ? ' · ' + T('hoje', 'today') : '') + '</h3><div class="list">';
      es.forEach(function (e) {
        var names = (e.items || []).map(function (it) { var f = HN.foods[it.food]; return f ? HN.foodName(f) : it.food; }).join(', ') || esc(e.note || '');
        var kc = HN.numerosOk() ? ' · ' + HN.num(C.totais(e.items).kcal) + ' kcal' : '';
        h += '<button class="li" data-act="entry" data-arg="' + e.id + '"><span class="e">' + U.mealEmoji(e.meal) + '</span><span class="grow"><div class="t">' + U.mealName(e.meal) + ' <span class="muted small">' + ('0' + d.getHours()).slice(-2) + ':' + ('0' + new Date(e.ts).getMinutes()).slice(-2) + '</span></div><div class="s">' + esc(names) + kc + '</div><div class="s">' + (e.hb != null ? T('fome ', 'hunger ') + e.hb : '') + (e.sa != null ? ' → ' + T('saciedade ', 'fullness ') + e.sa : '') + '</div></span>›</button>';
      });
      h += '</div></div>';
    });
    return h;
  };
  A.entry = function (id) {
    var e = (S.get('diario', []) || []).filter(function (x) { return x.id === id; })[0]; if (!e) return;
    var tot = C.totais(e.items), rows = (e.items || []).map(function (it) { var f = HN.foods[it.food]; return '<div class="kv"><span>' + esc(f ? HN.foodName(f) : it.food) + '</span><span>' + U.amountText(it.food, it.g) + '</span></div>'; }).join('');
    HN.sheet(U.mealName(e.meal) + ' · ' + HN.fmtDate(e.ts, true),
      rows + (HN.numerosOk() ? '<p class="mt"><b>' + HN.num(tot.kcal) + ' kcal</b> · P ' + HN.num(tot.p) + ' g · C ' + HN.num(tot.c) + ' g · G ' + HN.num(tot.f) + ' g</p>' : '') +
      '<div class="kv"><span>' + T('Fome antes', 'Hunger before') + '</span><b>' + (e.hb != null ? e.hb + '/10' : '–') + '</b></div><div class="kv"><span>' + T('Saciedade depois', 'Fullness after') + '</span><b>' + (e.sa != null ? e.sa + '/10' : '–') + '</b></div>' +
      '<div class="kv"><span>' + T('Motivo', 'Reason') + '</span><b>' + ((e.trig || []).map(U.trigName).join(', ') || '–') + '</b></div>' + (e.congr ? '<div class="kv"><span>' + T('2 h depois', '2 h later') + '</span><b>' + T('energia', 'energy') + ' ' + e.congr.energia + '/5 · ' + T('digestão', 'digestion') + ' ' + e.congr.digest + '/5</b></div>' : '') + (e.note ? '<p class="mt">' + esc(e.note) + '</p>' : '') +
      '<div class="row mt"><button class="btn bad sm" data-act="entry-del" data-arg="' + id + '">🗑 ' + T('Apagar', 'Delete') + '</button></div>');
  };
  A['entry-del'] = function (id) { HN.layer.close(); S.set('diario', (S.get('diario', []) || []).filter(function (x) { return x.id !== id; })); HN.refresh(); HN.toast(T('Registro apagado.', 'Entry deleted.')); };

  V['diario-novo'] = null;
  V.diario = (function (orig) { return function (parts, q) { if (parts[1] === 'novo') return newEntry(); return orig(parts, q); }; })(V.diario);
  function newEntry() {
    var d = HN.draft = HN.draft || draftNew(), nums = HN.numerosOk(), tot = C.totais(d.items);
    var h = U.title('📝', T('Registrar refeição', 'Log a meal')) + '<div class="card"><label class="f">' + T('Qual refeição?', 'Which meal?') + '</label>' + U.chips('dm', U.MEALS.map(function (m) { return [m[0], m[1], m[2], m[3]]; }), d.meal, false) + '</div>';
    h += '<div class="card"><h3>1. ' + T('Fome antes de comer', 'Hunger before eating') + '</h3>' + U.scale('dhb', d.hb, LO(), HI()) + (d.hb ? '<p class="small mt">' + SCALE_HINT(d.hb) + '</p>' : '') + '</div>';
    h += '<div class="card"><h3>2. ' + T('O que você comeu?', 'What did you eat?') + '</h3><input type="search" id="fq" data-in="fq" placeholder="' + T('Buscar alimento (ex.: arroz)', 'Search food (e.g. rice)') + '" autocomplete="off"><div id="fres" class="mt"></div>' +
      '<div class="row wrap mt"><button class="btn sec sm" data-act="dm-recipe">🍳 ' + T('Usar uma receita', 'Use a recipe') + '</button><button class="btn sec sm" data-act="dm-recent">🕘 ' + T('Recentes', 'Recent') + '</button><button class="btn sec sm" data-act="dm-again">🔁 ' + T('Repetir a última', 'Repeat the last one') + '</button><button class="btn sec sm" data-act="food-new">＋ ' + T('Novo alimento', 'New food') + '</button></div><div class="mt" id="ditems">' + itemsHtml(d, nums, tot) + '</div></div>';
    h += '<div class="card"><h3>3. ' + T('Por que você comeu?', 'Why did you eat?') + '</h3><p class="small muted">' + T('Pode marcar mais de um. Sem julgamento.', 'You can pick several. No judgement.') + '</p>' + U.chips('dt', U.TRIGGERS, d.trig, true) + '</div>';
    h += '<div class="card"><h3>4. ' + T('Saciedade depois', 'Fullness after') + '</h3>' + U.scale('dsa', d.sa, LO(), HI()) + (d.sa ? '<p class="small mt">' + SCALE_HINT(d.sa) + '</p>' : '<p class="small muted mt">' + T('Pode preencher agora ou editar depois.', 'Fill now or edit later.') + '</p>') + '</div>';
    h += '<div class="card"><label class="f" for="dnote">' + T('Anotação (opcional)', 'Note (optional)') + '</label><textarea id="dnote" data-in="dnote" placeholder="' + T('Como foi? Onde estava? Com quem?', 'How was it? Where were you? With whom?') + '">' + esc(d.note) + '</textarea></div>';
    h += '<div class="row"><button class="btn ghost" data-act="dm-cancel">' + T('Cancelar', 'Cancel') + '</button><button class="btn grow" data-act="dm-save">' + T('Salvar refeição', 'Save meal') + ' ✓</button></div>';
    return h;
  }
  function itemsHtml(d, nums, tot) {
    if (!d.items.length) return '<p class="small muted">' + T('Nenhum alimento adicionado ainda.', 'No foods added yet.') + '</p>';
    var h = d.items.map(function (it, i) { var f = HN.foods[it.food]; return '<div class="row" style="padding:.35rem 0;border-bottom:1px dashed var(--line)"><div class="grow"><b>' + esc(HN.foodName(f)) + '</b><div class="small muted">' + U.amountText(it.food, it.g) + (nums ? ' · ' + HN.num(f.kcal * it.g / 100) + ' kcal' : '') + '</div></div><button class="ib" data-act="it-minus" data-arg="' + i + '" aria-label="−">−</button><button class="ib" data-act="it-plus" data-arg="' + i + '" aria-label="+">＋</button><button class="ib" data-act="it-del" data-arg="' + i + '" aria-label="' + T('Remover', 'Remove') + '">✕</button></div>'; }).join('');
    return h + (nums ? '<p class="mt"><b>' + HN.num(tot.kcal) + ' kcal</b> · P ' + HN.num(tot.p) + ' · C ' + HN.num(tot.c) + ' · G ' + HN.num(tot.f) + '</p>' : '');
  }
  function stepG(foodId) { var f = HN.foods[foodId]; return f && f.measures[0] ? f.measures[0][2] : 25; }
  function refreshItems() { var d = HN.draft, box = HN.q('#ditems'); if (box) box.innerHTML = itemsHtml(d, HN.numerosOk(), C.totais(d.items)); }
  function addFood(id, g) { var d = HN.draft, ex = d.items.filter(function (i) { return i.food === id; })[0]; if (ex) ex.g += g || stepG(id); else d.items.push({ food: id, g: g || stepG(id) }); refreshItems(); }
  HN.chipFn.dm = function (v) { HN.draft.meal = v; HN.refresh(); };
  HN.chipFn.dhb = function (v) { HN.draft.hb = v; HN.refresh(); };
  HN.chipFn.dsa = function (v) { HN.draft.sa = v; HN.refresh(); };
  HN.chipFn.dt = function (v) { var a = HN.draft.trig, i = a.indexOf(v); if (i >= 0) a.splice(i, 1); else a.push(v); HN.refresh(); };
  HN.ins.dnote = function (v) { HN.draft.note = v; };
  HN.ins.fq = function (v) {
    var box = HN.q('#fres'); if (!box) return; var q = HN.nrm(v).trim(); if (!q) { box.innerHTML = ''; return; }
    var hits = HN.foodList.filter(function (f) { return HN.nrm(f.pt + ' ' + f.en).indexOf(q) >= 0; }).slice(0, 8);
    box.innerHTML = hits.length ? hits.map(function (f) { return '<button class="li" data-act="it-add" data-arg="' + f.id + '"><span class="e">＋</span><span class="grow"><div class="t">' + esc(HN.foodName(f)) + '</div><div class="s">' + U.amountText(f.id, stepG(f.id)) + (HN.numerosOk() ? ' · ' + HN.num(f.kcal * stepG(f.id) / 100) + ' kcal' : '') + '</div></span></button>'; }).join('') : '<p class="small muted">' + T('Não achei. Tente outra palavra, ou cadastre pelo leitor de rótulos.', 'Not found. Try another word, or add it through the label reader.') + '</p>';
  };
  A['it-add'] = function (id) { addFood(id); var i = HN.q('#fq'); if (i) { i.value = ''; HN.q('#fres').innerHTML = ''; } HN.toast(T('Adicionado', 'Added'), 900); };
  A['it-plus'] = function (i) { var it = HN.draft.items[+i]; it.g += stepG(it.food); refreshItems(); };
  A['it-minus'] = function (i) { var it = HN.draft.items[+i], s = stepG(it.food); it.g = Math.max(s, it.g - s); refreshItems(); };
  A['it-del'] = function (i) { HN.draft.items.splice(+i, 1); refreshItems(); };
  HN.addDraftFood = function (id, g) { if (HN.draft) addFood(id, g); };
  A['dm-again'] = function () {
    var d = HN.draft, l = (S.get('diario', []) || []).slice().reverse(), e = l.filter(function (x) { return x.meal === d.meal && x.items && x.items.length; })[0] || l.filter(function (x) { return x.items && x.items.length; })[0];
    if (!e) { HN.toast(T('Ainda não há refeição anterior.', 'No previous meal yet.')); return; }
    e.items.forEach(function (it) { if (HN.foods[it.food]) addFood(it.food, it.g); }); HN.toast(T('Última refeição copiada — ajuste as porções.', 'Last meal copied — adjust portions.'));
  };
  A['dm-recent'] = function () {
    var seen = {}, rec = []; (S.get('diario', []) || []).slice().reverse().forEach(function (e) { (e.items || []).forEach(function (it) { if (!seen[it.food] && HN.foods[it.food]) { seen[it.food] = 1; rec.push(it); } }); });
    HN.sheet(T('Alimentos recentes', 'Recent foods'), rec.length ? '<div class="list">' + rec.slice(0, 20).map(function (it) { return '<button class="li" data-act="it-add-close" data-arg="' + it.food + '|' + it.g + '"><span class="e">＋</span><span class="grow"><div class="t">' + esc(HN.foodName(HN.foods[it.food])) + '</div><div class="s">' + U.amountText(it.food, it.g) + '</div></span></button>'; }).join('') + '</div>' : '<p class="muted">' + T('Ainda não há recentes.', 'No recents yet.') + '</p>');
  };
  A['it-add-close'] = function (arg) { var p = arg.split('|'); HN.layer.close(); addFood(p[0], +p[1]); };
  A['dm-recipe'] = function () {
    HN.sheet(T('Usar uma receita (1 porção)', 'Use a recipe (1 serving)'), '<div class="list">' + HN.recipeList.map(function (r) { return '<button class="li" data-act="dm-recipe-pick" data-arg="' + r.id + '"><span class="e">🍳</span><span class="grow"><div class="t">' + esc(HN.tt([r.pt, r.en])) + '</div><div class="s">' + r.time + ' min</div></span></button>'; }).join('') + '</div>');
  };
  A['dm-recipe-pick'] = function (id) { var r = HN.recipes[id]; HN.layer.close(); r.ing.forEach(function (i) { addFood(i[0], i[1]); }); HN.toast(T('Receita adicionada (1 porção)', 'Recipe added (1 serving)')); };
  A['dm-cancel'] = function () { HN.draft = null; HN.go('/diario'); };
  A['dm-save'] = function () {
    var d = HN.draft; if (!d.items.length && !d.note) { HN.toast(T('Adicione ao menos um alimento ou uma anotação.', 'Add at least one food or a note.')); return; }
    var l = S.get('diario', []) || []; l.push({ id: HN.id(), ts: Date.now(), meal: d.meal, items: d.items, hb: d.hb, sa: d.sa, trig: d.trig, note: d.note }); S.set('diario', l);
    HN.draft = null; HN.toast(T('Refeição salva ✓', 'Meal saved ✓')); HN.go('/diario', { replace: true });
  };

  /* ================= NUTRIÇÃO INTUITIVA ================= */
  var ITABS = [['sinais', 'Sinais', 'Signals'], ['gatilhos', 'Gatilhos', 'Triggers'], ['congruencia', 'Corpo e comida', 'Body & food'], ['mindful', 'Atenção plena', 'Mindful']];
  V.intuitivo = function (parts) {
    var tab = parts[1] || 'sinais', h = U.title('🧘', T('Fome e emoções', 'Hunger & mood'), T('Aprender a ouvir o corpo', 'Learning to listen to your body')) + U.tabs('/intuitivo', ITABS, tab);
    var l = S.get('diario', []) || [];
    if (tab === 'sinais') {
      var withHb = l.filter(function (e) { return e.hb != null; }), withSa = l.filter(function (e) { return e.sa != null; });
      h += '<div class="card"><h3>' + T('A escala de 1 a 10', 'The 1–10 scale') + '</h3><div class="small"><div class="kv"><span>1–2</span><span>' + T('Faminto, tontura, irritação', 'Starving, dizzy, irritable') + '</span></div><div class="kv"><span>3–4</span><span>' + T('Fome clara: boa hora de começar', 'Clear hunger: good time to start') + '</span></div><div class="kv"><span>5</span><span>' + T('Neutro', 'Neutral') + '</span></div><div class="kv"><span>6–7</span><span>' + T('Satisfeito: boa hora de parar', 'Satisfied: good time to stop') + '</span></div><div class="kv"><span>8–10</span><span>' + T('Cheio demais, desconforto', 'Overfull, uncomfortable') + '</span></div></div></div>';
      if (withHb.length < 3) h += U.notice('info', T('Registre algumas refeições com fome antes/depois para ver seus padrões aqui.', 'Log a few meals with hunger before/after to see your patterns here.'));
      else {
        var keys = [], map = {}; for (var i = 6; i >= 0; i--) { var dk = HN.dayKey(Date.now() - i * 864e5); keys.push(dk); map[dk] = { hb: [], sa: [] }; }
        l.forEach(function (e) { var k = HN.dayKey(e.ts); if (map[k]) { if (e.hb != null) map[k].hb.push(e.hb); if (e.sa != null) map[k].sa.push(e.sa); } });
        var av = function (a) { return a.length ? a.reduce(function (s, x) { return s + x; }, 0) / a.length : null; };
        h += '<div class="card"><h3>' + T('Últimos 7 dias', 'Last 7 days') + '</h3>' + U.line({ aria: T('Fome antes e saciedade depois', 'Hunger before and fullness after'), labels: keys.map(function (k) { return k.slice(8); }), min: 1, max: 10, series: [{ name: T('fome antes', 'hunger before'), color: '#e8590c', values: keys.map(function (k) { return av(map[k].hb); }) }, { name: T('saciedade depois', 'fullness after'), color: '#168a5c', values: keys.map(function (k) { return av(map[k].sa); }) }] }) + '</div>';
        var late = withHb.filter(function (e) { return e.hb >= 8; }).length, hungry = withHb.filter(function (e) { return e.hb <= 2; }).length, over = withSa.filter(function (e) { return e.sa >= 9; }).length, ideal = withHb.filter(function (e) { return e.hb >= 3 && e.hb <= 5; }).length;
        var ins = [];
        ins.push(T('Você começou ', 'You started ') + ideal + T(' de ', ' of ') + withHb.length + T(' refeições com fome "ideal" (3–5).', ' meals at "ideal" hunger (3–5).'));
        if (hungry / withHb.length >= .3) ins.push(T('Muitas refeições começaram com fome intensa. Um lanche que sustenta no meio da tarde pode ajudar a chegar menos faminto.', 'Many meals began with intense hunger. A filling snack mid-afternoon may help you arrive less starving.'));
        if (late / withHb.length >= .3) ins.push(T('Várias refeições começaram sem muita fome. Tudo bem — só observe se foi hábito, horário ou emoção.', 'Several meals began without much hunger. That is fine — just notice if it was habit, schedule or emotion.'));
        if (withSa.length && over / withSa.length >= .3) ins.push(T('Você terminou bem cheio com frequência. Experimente pausar os talheres na metade e checar a fome (veja Atenção plena).', 'You often ended very full. Try pausing halfway and checking hunger (see Mindful).'));
        h += '<div class="card"><h3>' + T('O que os registros sugerem', 'What your logs suggest') + '</h3>' + ins.map(function (t) { return '<p>• ' + t + '</p>'; }).join('') + '<p class="small muted">' + T('São observações, não avaliações.', 'These are observations, not judgements.') + '</p></div>';
      }
    }
    if (tab === 'gatilhos') {
      var cnt = {}, tot = 0; l.forEach(function (e) { (e.trig || []).forEach(function (t) { cnt[t] = (cnt[t] || 0) + 1; tot++; }); });
      if (!tot) h += U.notice('info', T('Marque "por que você comeu" ao registrar refeições para ver seus gatilhos.', 'Mark "why you ate" when logging meals to see your triggers.'));
      else {
        var rows = Object.keys(cnt).sort(function (a, b) { return cnt[b] - cnt[a]; }).map(function (t) { return { l: U.trigName(t), v: cnt[t], max: Math.max.apply(null, Object.keys(cnt).map(function (k) { return cnt[k]; })), txt: cnt[t] }; });
        h += '<div class="card"><h3>' + T('Motivos mais frequentes', 'Most frequent reasons') + '</h3>' + U.hbars(rows) + '</div>';
        var emo = ['estresse', 'ansiedade', 'tristeza', 'tedio', 'cansaco'].reduce(function (s, k) { return s + (cnt[k] || 0); }, 0), phys = cnt.fome || 0;
        h += '<div class="card"><h3>' + T('Fome física × emoção', 'Physical hunger × emotion') + '</h3><div class="stat" style="grid-template-columns:repeat(2,1fr)"><div><b>' + phys + '</b><span>' + T('por fome física', 'physical hunger') + '</span></div><div><b>' + emo + '</b><span>' + T('por emoção/cansaço', 'emotion/tiredness') + '</span></div></div><p class="small mt">' + (emo > phys ? T('Comer por emoção é humano. Se quiser, teste uma pausa de 5 minutos antes (veja "Surfar a vontade" em Atenção plena) e veja o que muda.', 'Eating for emotion is human. If you like, try a 5-minute pause first (see "Ride the craving" in Mindful) and see what changes.') : T('A maior parte veio de fome física — ótimo sinal de conexão com o corpo.', 'Most came from physical hunger — a great sign of connection with your body.')) + '</p></div>';
      }
    }
    if (tab === 'congruencia') {
      var pend = l.filter(function (e) { return !e.congr && e.ts < Date.now() - 2 * 3600e3 && e.ts > Date.now() - 48 * 3600e3; });
      h += '<div class="card"><h3>' + T('Como você se sentiu depois?', 'How did you feel afterwards?') + '</h3>';
      if (!pend.length) h += '<p class="muted small">' + T('Nada pendente. Duas horas depois de uma refeição, volte aqui para avaliar energia e digestão.', 'Nothing pending. Two hours after a meal, come back to rate energy and digestion.') + '</p>';
      pend.slice(-5).reverse().forEach(function (e) {
        var nm = (e.items || []).map(function (it) { return HN.foods[it.food] ? HN.foodName(HN.foods[it.food]) : ''; }).slice(0, 3).join(', ');
        h += '<div class="card" style="box-shadow:none"><b>' + U.mealEmoji(e.meal) + ' ' + U.mealName(e.meal) + '</b> <span class="small muted">' + HN.fmtDate(e.ts, true) + '</span><div class="small muted">' + esc(nm) + '</div>' +
          '<label class="f">' + T('Energia (1 sem energia … 5 muita)', 'Energy (1 drained … 5 lots)') + '</label><div class="chips">' + [1, 2, 3, 4, 5].map(function (n) { return '<button class="chip" data-act="cg" data-arg="' + e.id + '|e|' + n + '">' + n + '</button>'; }).join('') + '</div>' +
          '<label class="f">' + T('Digestão (1 desconforto … 5 ótima)', 'Digestion (1 uncomfortable … 5 great)') + '</label><div class="chips">' + [1, 2, 3, 4, 5].map(function (n) { return '<button class="chip" data-act="cg" data-arg="' + e.id + '|d|' + n + '">' + n + '</button>'; }).join('') + '</div></div>';
      });
      h += '</div>';
      var rated = l.filter(function (e) { return e.congr; });
      if (rated.length >= 3) {
        var gm = {}; rated.forEach(function (e) { (e.items || []).forEach(function (it) { var f = HN.foods[it.food]; if (!f) return; var g = f.group; gm[g] = gm[g] || { n: 0, e: 0, d: 0 }; gm[g].n++; gm[g].e += e.congr.energia; gm[g].d += e.congr.digest; }); });
        var rr = Object.keys(gm).filter(function (g) { return gm[g].n >= 2; }).map(function (g) { return { g: g, e: gm[g].e / gm[g].n, d: gm[g].d / gm[g].n }; }).sort(function (a, b) { return (b.e + b.d) - (a.e + a.d); });
        h += '<div class="card"><h3>' + T('Corpo e comida: o que cai bem', 'Body & food: what sits well') + '</h3>' + (rr.length ? U.hbars(rr.map(function (x) { return { l: HN.tt(HN.foodGroups[x.g]), v: (x.e + x.d) / 2, max: 5, txt: HN.num((x.e + x.d) / 2, 1) }; })) + '<p class="small muted">' + T('Média de energia e digestão nas refeições que incluíram o grupo.', 'Average energy and digestion in meals that included the group.') + '</p>' : '<p class="small muted">' + T('Mais registros e já aparece.', 'A few more logs and it appears.') + '</p>') + '</div>';
      }
    }
    if (tab === 'mindful') {
      h += U.notice('info', T('Exercícios curtos e opcionais. Podem ser lidos em voz alta (toque em 🔊).', 'Short, optional exercises. They can be read aloud (tap 🔊).')) + '<div class="list card">' + MINDFUL.map(function (m, i) { return '<button class="li" data-act="mf" data-arg="' + i + '"><span class="e">' + m.e + '</span><span class="grow"><div class="t">' + HN.tt(m.n) + '</div><div class="s">' + HN.tt(m.d) + ' · ' + Math.round(m.steps.reduce(function (s, x) { return s + x[2]; }, 0) / 60) + ' min</div></span>›</button>'; }).join('') + '</div>';
    }
    return h;
  };
  A.cg = function (arg) {
    var p = arg.split('|'), l = S.get('diario', []) || [];
    l.forEach(function (e) { if (e.id === p[0]) { e.congr = e.congr || { ts: Date.now() }; if (p[1] === 'e') e.congr.energia = +p[2]; else e.congr.digest = +p[2]; if (e.congr.energia && e.congr.digest) e.congr.ts = Date.now(); } });
    S.set('diario', l);
    var all = l.filter(function (e) { return e.id === p[0]; })[0]; if (all.congr.energia && all.congr.digest) { HN.toast(T('Anotado ✓', 'Noted ✓')); HN.refresh(); } else { HN.qa('[data-arg^="' + p[0] + '|' + p[1] + '|"]').forEach(function (b) { b.classList.toggle('on', b.getAttribute('data-arg') === arg); }); }
  };
  var MINDFUL = [
    { e: '⚓', n: ['Âncora de 1 minuto antes de comer', '1-minute anchor before eating'], d: ['Respire e cheque a fome', 'Breathe and check hunger'], steps: [
      [['Apoie os pés no chão e solte os ombros.', 'Plant your feet and drop your shoulders.'], 'in', 12],
      [['Respire fundo 3 vezes: inspire pelo nariz contando até 4, solte pela boca contando até 6.', 'Take 3 deep breaths: in through the nose for 4, out through the mouth for 6.'], 'br', 30],
      [['Qual é a sua fome de 1 a 10 agora? Só observe, sem julgar.', 'What is your hunger from 1 to 10 right now? Just notice, no judging.'], 'ck', 12],
      [['Olhe o prato: cores, cheiros. Agora pode começar.', 'Look at your plate: colours, smells. Now you can begin.'], 'go', 6]] },
    { e: '🐢', n: ['Comer devagar (20 min)', 'Slow eating (20 min)'], d: ['Pausas guiadas durante a refeição', 'Guided pauses during the meal'], steps: [
      [['Primeira garfada: mastigue devagar e perceba o sabor.', 'First bite: chew slowly and notice the flavour.'], 'a', 60],
      [['Pouse os talheres. Respire. Engula antes de pegar mais comida.', 'Put the cutlery down. Breathe. Swallow before taking more.'], 'b', 120],
      [['Meio da refeição: de 1 a 10, como está a fome agora?', 'Halfway: from 1 to 10, how is your hunger now?'], 'c', 180],
      [['Continue no seu ritmo. O sabor ainda está tão bom quanto na primeira garfada?', 'Continue at your pace. Is the taste still as good as the first bite?'], 'd', 420],
      [['Cheque a saciedade. Se está satisfeito (6–7), pode parar sem culpa.', 'Check fullness. If satisfied (6–7), you can stop without guilt.'], 'e', 60]] },
    { e: '🖐️', n: ['Cinco sentidos', 'Five senses'], d: ['Prestar atenção em tudo no prato', 'Notice everything on the plate'], steps: [
      [['Veja: 3 cores diferentes no prato.', 'See: 3 different colours on the plate.'], 's1', 20], [['Cheire: que aroma chega primeiro?', 'Smell: which aroma arrives first?'], 's2', 20], [['Toque: temperatura e textura com o garfo ou as mãos.', 'Touch: temperature and texture with the fork or hands.'], 's3', 20],
      [['Ouça: o som de mastigar, de cortar.', 'Hear: the sound of chewing, of cutting.'], 's4', 20], [['Prove: uma garfada, de olhos fechados se quiser.', 'Taste: one bite, eyes closed if you like.'], 's5', 40]] },
    { e: '🌊', n: ['Surfar a vontade (5 min)', 'Ride the craving (5 min)'], d: ['Para uma vontade forte que apareceu agora', 'For a strong urge that just showed up'], steps: [
      [['Pare e respire. Vontade é uma onda: sobe, chega ao pico e desce.', 'Pause and breathe. A craving is a wave: it rises, peaks and falls.'], 'w1', 30],
      [['Onde você sente a vontade no corpo? Descreva em silêncio.', 'Where do you feel the urge in your body? Describe it silently.'], 'w2', 60],
      [['Pergunte: é fome física, ou é outra coisa (cansaço, tédio, emoção)?', 'Ask: is it physical hunger or something else (tiredness, boredom, emotion)?'], 'w3', 60],
      [['Se for fome, coma — com permissão. Se for emoção, você pode comer também, mas agora com consciência.', 'If it is hunger, eat — with permission. If it is emotion, you may still eat, but now with awareness.'], 'w4', 90]] }
  ];
  A.mf = function (i) { runMindful(+i); };
  var mfTimer = null;
  function speak(txt) {
    if (!('speechSynthesis' in window)) { HN.toast(T('Seu navegador não tem leitura em voz alta.', 'Your browser has no read-aloud.')); return; }
    try { window.speechSynthesis.cancel(); setTimeout(function () { var u = new SpeechSynthesisUtterance(txt); u.lang = HN.lang === 'pt' ? 'pt-BR' : 'en-US'; window.speechSynthesis.speak(u); }, 60); } catch (e) { /* sem voz */ }
  }
  HN.speak = speak;
  function runMindful(i) {
    var m = MINDFUL[i], k = 0, left = 0;
    var el = HN.layer.open({ type: 'full', label: HN.tt(m.n), onClose: function () { clearInterval(mfTimer); try { window.speechSynthesis.cancel(); } catch (e) { /* ignora */ } }, html: '<div class="fh"><button class="ib" data-act="layer-close" aria-label="' + T('Fechar', 'Close') + '">✕</button><b class="grow">' + esc(HN.tt(m.n)) + '</b></div><div style="padding:1rem;max-width:640px;margin:0 auto" id="mfbody"></div>' });
    function show() {
      var st = m.steps[k]; left = st[2]; var body = HN.q('#mfbody', el);
      body.innerHTML = '<p class="muted center">' + T('Passo', 'Step') + ' ' + (k + 1) + '/' + m.steps.length + '</p><p class="step-big center" style="min-height:8rem">' + esc(HN.tt(st[0])) + '</p><div class="timer" id="mft">' + fmt(left) + '</div><div class="row mt2"><button class="btn ghost" data-act="mf-say" aria-label="' + T('Ler em voz alta', 'Read aloud') + '">🔊</button><button class="btn grow" data-act="mf-next">' + (k < m.steps.length - 1 ? T('Próximo', 'Next') + ' →' : T('Concluir', 'Finish') + ' ✓') + '</button></div>';
      clearInterval(mfTimer); mfTimer = setInterval(function () { left--; var t = HN.q('#mft', el); if (t) t.textContent = fmt(Math.max(left, 0)); if (left <= 0) { clearInterval(mfTimer); try { navigator.vibrate && navigator.vibrate(120); } catch (e) { /* ignora */ } } }, 1000);
    }
    function fmt(s) { return ('0' + Math.floor(s / 60)).slice(-2) + ':' + ('0' + (s % 60)).slice(-2); }
    el.addEventListener('click', function (e) {
      if (e.target.closest('[data-act="mf-next"]')) { if (k < m.steps.length - 1) { k++; show(); } else { HN.layer.close(); HN.toast(T('Muito bem 🌱', 'Well done 🌱')); } }
      if (e.target.closest('[data-act="mf-say"]')) speak(HN.tt(m.steps[k][0]));
    });
    show();
  }
  A['mf-next'] = function () { /* tratado no próprio painel */ }; A['mf-say'] = function () { /* idem */ };
})(window.HN = window.HN || {});

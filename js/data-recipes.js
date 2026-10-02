/* HyperNutry — receitas de exemplo. Quantidades são POR PORÇÃO (1 pessoa) e escalam para a casa.
 * equip = TODOS os equipamentos exigidos. meal = momentos em que serve. skill 1–3. cost 1–3 (R$ a R$$$).
 * extra = itens "a gosto" fora da base (sal, temperos).
 * steps: [pt, en, minutos-de-cronômetro (opcional)]
 */
(function (HN) {
  'use strict';
  HN.equipment = {
    stove: ['Fogão', 'Stove', '🔥'], oven: ['Forno', 'Oven', '♨️'], airfryer: ['Airfryer', 'Air fryer', '🍟'],
    microwave: ['Micro-ondas', 'Microwave', '📡'], blender: ['Liquidificador', 'Blender', '🌀'],
    pressure: ['Panela de pressão', 'Pressure cooker', '🥘'], eletric: ['Panela elétrica', 'Electric cooker', '🍲'],
    processor: ['Processador', 'Food processor', '⚙️']
  };
  var R = [
    { id: 'omelete', pt: 'Omelete de legumes', en: 'Veggie omelette', meal: ['cafe', 'jantar'], time: 12, skill: 1, cost: 1, equip: ['stove'],
      ing: [['ovo_mexido', 110], ['tomate', 40], ['cebola', 15], ['abobrinha', 30], ['azeite', 3]], extra: ['Sal e orégano a gosto', 'Salt and oregano to taste'],
      steps: [['Pique o tomate, a cebola e a abobrinha em cubinhos.', 'Dice the tomato, onion and zucchini.'],
        ['Bata os ovos crus com uma pitada de sal.', 'Beat the raw eggs with a pinch of salt.'],
        ['Aqueça o azeite em frigideira antiaderente em fogo médio e refogue os legumes.', 'Heat the oil in a nonstick pan over medium heat and sauté the vegetables.', 3],
        ['Despeje os ovos, tampe e cozinhe em fogo baixo até firmar. Dobre ao meio.', 'Pour in the eggs, cover and cook on low until set. Fold in half.', 4]] },
    { id: 'prato_base', pt: 'Arroz, feijão e frango grelhado com salada', en: 'Rice, beans, grilled chicken and salad', meal: ['almoco', 'jantar'], time: 40, skill: 2, cost: 2, equip: ['stove'],
      ing: [['arroz_branco', 120], ['feijao_carioca', 120], ['frango_grelhado', 100], ['alface', 40], ['tomate', 60], ['azeite', 5]], extra: ['Sal, alho e limão a gosto', 'Salt, garlic and lemon to taste'],
      steps: [['Tempere o frango com sal, alho e limão e deixe descansar 10 minutos.', 'Season the chicken with salt, garlic and lemon and rest 10 minutes.', 10],
        ['Grelhe o frango em frigideira bem quente, 5 a 6 minutos de cada lado, até não ficar rosado por dentro.', 'Grill the chicken in a hot pan, 5–6 minutes per side, until no longer pink inside.', 12],
        ['Monte o prato: metade salada, um quarto arroz e feijão, um quarto proteína.', 'Build the plate: half salad, a quarter rice and beans, a quarter protein.'],
        ['Tempere a salada com azeite, limão e sal.', 'Dress the salad with oil, lemon and salt.']] },
    { id: 'frango_airfryer', pt: 'Frango e batata-doce na airfryer', en: 'Air-fryer chicken and sweet potato', meal: ['almoco', 'jantar'], time: 30, skill: 1, cost: 2, equip: ['airfryer'],
      ing: [['frango_grelhado', 110], ['batata_doce', 150], ['brocolis', 80], ['azeite', 4]], extra: ['Sal, páprica e pimenta-do-reino a gosto', 'Salt, paprika and black pepper to taste'],
      steps: [['Corte a batata-doce em cubos e o frango em tiras. Misture com azeite, sal e páprica.', 'Cube the sweet potato and cut the chicken in strips. Toss with oil, salt and paprika.'],
        ['Pré-aqueça a airfryer a 180 °C por 3 minutos.', 'Preheat the air fryer to 180 °C (360 °F) for 3 minutes.', 3],
        ['Coloque a batata-doce e asse 10 minutos. Agite o cesto.', 'Add the sweet potato and cook 10 minutes. Shake the basket.', 10],
        ['Acrescente o frango e cozinhe mais 12 minutos, agitando na metade.', 'Add the chicken and cook 12 more minutes, shaking halfway.', 12],
        ['Sirva com brócolis cozido no vapor ou micro-ondas.', 'Serve with steamed or microwaved broccoli.']] },
    { id: 'salada_grao', pt: 'Salada de grão-de-bico', en: 'Chickpea salad', meal: ['almoco', 'jantar', 'lanche'], time: 10, skill: 1, cost: 1, equip: [],
      ing: [['grao_bico', 120], ['tomate', 60], ['pepino', 60], ['cebola', 15], ['azeite', 5]], extra: ['Limão, sal e salsinha a gosto', 'Lemon, salt and parsley to taste'],
      steps: [['Escorra e lave o grão-de-bico cozido.', 'Drain and rinse the cooked chickpeas.'],
        ['Pique tomate, pepino e cebola.', 'Chop tomato, cucumber and onion.'],
        ['Misture tudo com azeite, limão e sal. Pode comer na hora ou gelada.', 'Mix everything with oil, lemon and salt. Eat now or chilled.']] },
    { id: 'overnight', pt: 'Aveia da noite com banana e iogurte', en: 'Overnight oats with banana and yogurt', meal: ['cafe', 'lanche'], time: 5, skill: 1, cost: 1, equip: [],
      ing: [['aveia', 30], ['iogurte_natural', 170], ['banana', 80], ['chia', 6]], extra: ['Canela a gosto', 'Cinnamon to taste'],
      steps: [['Em um pote, misture aveia, iogurte e chia.', 'In a jar, mix oats, yogurt and chia.'],
        ['Tampe e deixe na geladeira por pelo menos 4 horas (ou de um dia para o outro).', 'Cover and refrigerate for at least 4 hours (or overnight).', 240],
        ['Na hora de comer, cubra com banana fatiada e canela.', 'When serving, top with sliced banana and cinnamon.']] },
    { id: 'sopa_lentilha', pt: 'Sopa de lentilha com legumes', en: 'Lentil and vegetable soup', meal: ['almoco', 'jantar'], time: 35, skill: 1, cost: 1, equip: ['pressure'],
      ing: [['lentilha', 150], ['cenoura', 50], ['batata_cozida', 80], ['couve', 20], ['cebola', 20], ['azeite', 4]], extra: ['Sal, alho e louro a gosto; água o bastante para cobrir', 'Salt, garlic and bay leaf; enough water to cover'],
      steps: [['Refogue cebola e alho no azeite na panela de pressão aberta.', 'Sauté onion and garlic in oil in the open pressure cooker.', 3],
        ['Junte lentilha, cenoura e batata em cubos, louro, sal e água para cobrir.', 'Add lentils, diced carrot and potato, bay leaf, salt and water to cover.'],
        ['Feche e cozinhe 15 minutos após pegar pressão. Espere a pressão sair sozinha.', 'Close and cook 15 minutes after it reaches pressure. Let the pressure release naturally.', 15],
        ['Abra, acrescente a couve picada e mexa por 2 minutos. Sirva quente.', 'Open, add chopped collards and stir for 2 minutes. Serve hot.', 2]] },
    { id: 'tilapia_forno', pt: 'Tilápia assada com legumes', en: 'Baked tilapia with vegetables', meal: ['almoco', 'jantar'], time: 35, skill: 2, cost: 2, equip: ['oven'],
      ing: [['tilapia', 130], ['abobrinha', 80], ['tomate', 60], ['cebola', 20], ['azeite', 6], ['arroz_integral', 100]], extra: ['Limão, sal, alho e ervas a gosto', 'Lemon, salt, garlic and herbs'],
      steps: [['Pré-aqueça o forno a 200 °C.', 'Preheat the oven to 200 °C (400 °F).', 10],
        ['Tempere os filés com limão, sal e alho. Fatie os legumes.', 'Season the fillets with lemon, salt and garlic. Slice the vegetables.'],
        ['Disponha legumes e peixe em assadeira com azeite.', 'Arrange vegetables and fish in a tray with oil.'],
        ['Asse 18 a 20 minutos, até o peixe se desfazer facilmente com o garfo.', 'Bake 18–20 minutes until the fish flakes easily with a fork.', 19],
        ['Sirva com arroz integral.', 'Serve with brown rice.']] },
    { id: 'vitamina', pt: 'Vitamina de banana com aveia', en: 'Banana oat smoothie', meal: ['cafe', 'lanche'], time: 5, skill: 1, cost: 1, equip: ['blender'],
      ing: [['leite_integral', 200], ['banana', 80], ['aveia', 20], ['pasta_amendoim', 10]], extra: ['Gelo a gosto', 'Ice to taste'],
      steps: [['Coloque todos os ingredientes no liquidificador.', 'Put all ingredients in the blender.'],
        ['Bata por 1 minuto até ficar liso. Sirva na hora.', 'Blend 1 minute until smooth. Serve right away.', 1]] },
    { id: 'panqueca_banana', pt: 'Panqueca de banana e aveia', en: 'Banana oat pancakes', meal: ['cafe', 'lanche'], time: 15, skill: 1, cost: 1, equip: ['stove'],
      ing: [['banana', 120], ['ovo_mexido', 55], ['aveia', 30], ['azeite', 2]], extra: ['Canela e uma pitada de sal', 'Cinnamon and a pinch of salt'],
      steps: [['Amasse a banana e misture com o ovo cru, a aveia e a canela.', 'Mash the banana and mix with the raw egg, oats and cinnamon.'],
        ['Aqueça frigideira antiaderente untada com um fio de azeite.', 'Heat a nonstick pan with a drizzle of oil.', 1],
        ['Despeje colheradas e doure 2 minutos de cada lado.', 'Spoon in batter and brown 2 minutes per side.', 4]] },
    { id: 'escondidinho', pt: 'Escondidinho de carne com batata-doce', en: 'Beef and sweet potato bake', meal: ['almoco', 'jantar'], time: 50, skill: 2, cost: 2, equip: ['stove', 'oven'],
      ing: [['batata_doce', 180], ['carne_moida', 100], ['cebola', 25], ['tomate', 40], ['azeite', 4], ['queijo_mussarela', 15]], extra: ['Sal, alho e cheiro-verde', 'Salt, garlic and herbs'],
      steps: [['Cozinhe a batata-doce em água até ficar macia e amasse com sal.', 'Boil the sweet potato until soft and mash with salt.', 15],
        ['Refogue cebola e alho no azeite, junte a carne moída e o tomate. Cozinhe até secar.', 'Sauté onion and garlic in oil, add ground beef and tomato. Cook until dry.', 10],
        ['Em refratário, monte uma camada de carne e cubra com o purê. Polvilhe queijo.', 'In a dish, layer the beef and cover with the mash. Sprinkle cheese.'],
        ['Leve ao forno a 200 °C por 15 minutos, até gratinar.', 'Bake at 200 °C (400 °F) for 15 minutes until golden.', 15]] },
    { id: 'tofu_mexido', pt: 'Tofu mexido com legumes (vegano)', en: 'Tofu scramble with vegetables (vegan)', meal: ['cafe', 'almoco', 'jantar'], time: 15, skill: 1, cost: 2, equip: ['stove'],
      ing: [['tofu', 150], ['tomate', 50], ['cebola', 20], ['brocolis', 50], ['azeite', 5], ['arroz_integral', 100]], extra: ['Cúrcuma, sal e pimenta a gosto', 'Turmeric, salt and pepper'],
      steps: [['Esfarele o tofu com as mãos.', 'Crumble the tofu by hand.'],
        ['Refogue cebola, tomate e brócolis picados no azeite.', 'Sauté chopped onion, tomato and broccoli in oil.', 4],
        ['Junte o tofu, a cúrcuma e o sal. Mexa por 5 minutos.', 'Add the tofu, turmeric and salt. Stir for 5 minutes.', 5],
        ['Sirva com arroz integral.', 'Serve with brown rice.']] },
    { id: 'iogurte_frutas', pt: 'Iogurte com frutas e chia', en: 'Yogurt with fruit and chia', meal: ['cafe', 'lanche'], time: 3, skill: 1, cost: 1, equip: [],
      ing: [['iogurte_natural', 170], ['morango', 80], ['banana', 50], ['chia', 8]], extra: ['Mel a gosto (opcional)', 'Honey to taste (optional)'],
      steps: [['Coloque o iogurte em uma tigela.', 'Put the yogurt in a bowl.'], ['Cubra com frutas picadas e chia.', 'Top with chopped fruit and chia.']] },
    { id: 'feijao_pressao', pt: 'Feijão de panela de pressão', en: 'Pressure-cooker beans', meal: ['almoco', 'jantar'], time: 45, skill: 1, cost: 1, equip: ['pressure'],
      ing: [['feijao_carioca', 180], ['cebola', 15], ['alho', 4], ['azeite', 4]], extra: ['Sal e louro; água para cobrir (feijão já de molho)', 'Salt and bay leaf; water to cover (beans pre-soaked)'],
      steps: [['Deixe o feijão de molho por 8 horas e descarte a água.', 'Soak the beans 8 hours and discard the water.'],
        ['Refogue cebola e alho no azeite; junte o feijão, louro e água.', 'Sauté onion and garlic in oil; add beans, bay leaf and water.', 3],
        ['Feche e cozinhe 25 minutos após pegar pressão. Espere sair a pressão.', 'Close and cook 25 minutes after it reaches pressure. Let it release.', 25],
        ['Abra, ajuste o sal e deixe apurar 5 minutos.', 'Open, adjust the salt and simmer 5 minutes.', 5]] },
    { id: 'ovo_caneca', pt: 'Ovo mexido na caneca', en: 'Mug scrambled eggs', meal: ['cafe', 'lanche'], time: 4, skill: 1, cost: 1, equip: ['microwave'],
      ing: [['ovo_mexido', 110], ['tomate', 30], ['pao_integral', 50]], extra: ['Sal e orégano', 'Salt and oregano'],
      steps: [['Quebre 2 ovos em uma caneca, junte tomate picado e sal; misture.', 'Break 2 eggs into a mug, add chopped tomato and salt; mix.'],
        ['Micro-ondas por 40 segundos, mexa e mais 40 segundos.', 'Microwave 40 seconds, stir, then 40 more seconds.', 1.5],
        ['Sirva com pão integral.', 'Serve with whole-wheat bread.']] },
    { id: 'atum_salada', pt: 'Salada de atum com batata e ovo', en: 'Tuna, potato and egg salad', meal: ['almoco', 'jantar'], time: 20, skill: 1, cost: 2, equip: ['stove'],
      ing: [['atum', 80], ['batata_cozida', 150], ['ovo_cozido', 50], ['alface', 50], ['tomate', 60], ['azeite', 5]], extra: ['Limão e sal', 'Lemon and salt'],
      steps: [['Cozinhe batata e ovo em água fervente (ovo: 10 min; batata: até ficar macia).', 'Boil potato and egg (egg: 10 min; potato: until soft).', 12],
        ['Corte em pedaços e misture com atum escorrido, alface e tomate.', 'Cut up and mix with drained tuna, lettuce and tomato.'],
        ['Tempere com azeite, limão e sal.', 'Dress with oil, lemon and salt.']] },
    { id: 'suco_fruta_pao', pt: 'Pão integral com queijo e fruta', en: 'Whole-wheat bread with cheese and fruit', meal: ['cafe', 'lanche'], time: 5, skill: 1, cost: 1, equip: [],
      ing: [['pao_integral', 50], ['queijo_minas', 40], ['mamao', 150]], extra: ['Café ou chá sem açúcar, se quiser', 'Coffee or tea without sugar, if you like'],
      steps: [['Fatie o queijo e monte sobre o pão.', 'Slice the cheese and place on the bread.'], ['Sirva com o mamão em fatias.', 'Serve with sliced papaya.']] },
    { id: 'carne_batata', pt: 'Patinho grelhado com purê de mandioca e couve', en: 'Grilled beef with cassava mash and collards', meal: ['almoco', 'jantar'], time: 35, skill: 2, cost: 3, equip: ['stove'],
      ing: [['patinho_grelhado', 100], ['mandioca', 150], ['couve', 40], ['azeite', 5]], extra: ['Sal, alho e pimenta', 'Salt, garlic and pepper'],
      steps: [['Cozinhe a mandioca até desmanchar, amasse com um fio de azeite e sal.', 'Boil the cassava until it falls apart, mash with a drizzle of oil and salt.', 20],
        ['Tempere o bife e grelhe em frigideira bem quente, 3 a 4 minutos por lado.', 'Season the steak and grill in a very hot pan, 3–4 minutes per side.', 8],
        ['Refogue a couve em tiras finas com alho por 2 minutos.', 'Sauté thin collard strips with garlic for 2 minutes.', 2]] }
  ];
  HN.recipes = {};
  R.forEach(function (r) {
    // tags derivadas dos ingredientes: seguro p/ alérgenos, vegano etc.
    var al = {}, vegan = true, veg = true;
    r.ing.forEach(function (i) {
      var f = HN.foods[i[0]];
      if (!f) throw new Error('Receita ' + r.id + ': alimento inexistente ' + i[0]);
      f.allergens.forEach(function (a) { al[a] = 1; });
      if (!f.vegan) vegan = false;
      if (!f.vegetarian) veg = false;
    });
    r.allergens = Object.keys(al); r.vegan = vegan; r.vegetarian = veg;
    HN.recipes[r.id] = r;
  });
  HN.recipeList = R;
})(window.HN = window.HN || {});

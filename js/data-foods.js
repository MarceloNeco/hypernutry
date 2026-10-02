/* HyperNutry — base de alimentos de REFERÊNCIA (por 100 g).
 * Valores arredondados, baseados na TACO/UNICAMP (4ª ed.) e, quando a TACO não traz o item,
 * em tabelas internacionais (marcado src:'REF'). NÃO é a tabela oficial completa:
 * a importação integral TACO/TBCA está no roadmap (ver ARQUITETURA.md).
 * Formato: [id, pt, en, grupo, kcal, prot, carb, gord, fibra, sodio_mg, alergenos, nova, medidas, src]
 * medidas: [[rótulo pt, rótulo en, gramas], ...]
 */
(function (HN) {
  'use strict';
  var A = function (s) { return s ? s.split(',') : []; };
  var raw = [
    // cereais e tubérculos
    ['arroz_branco', 'Arroz branco cozido', 'White rice, cooked', 'cereal', 128, 2.5, 28.1, 0.2, 1.6, 1, '', 1, [['colher de servir', 'serving spoon', 60], ['escumadeira', 'ladle', 90]], 'TACO'],
    ['arroz_integral', 'Arroz integral cozido', 'Brown rice, cooked', 'cereal', 124, 2.6, 25.8, 1.0, 2.7, 1, '', 1, [['colher de servir', 'serving spoon', 60]], 'TACO'],
    ['macarrao', 'Macarrão cozido', 'Pasta, cooked', 'cereal', 102, 3.4, 19.9, 0.5, 1.3, 1, 'gluten', 1, [['pegador', 'tongs', 110], ['prato fundo', 'bowl', 220]], 'TACO'],
    ['pao_frances', 'Pão francês', 'French bread roll', 'cereal', 300, 8.0, 58.6, 3.1, 2.3, 648, 'gluten', 3, [['unidade (50 g)', 'roll (50 g)', 50], ['fatia', 'slice', 25]], 'TACO'],
    ['pao_integral', 'Pão integral de forma', 'Whole-wheat sandwich bread', 'cereal', 253, 9.4, 49.9, 3.7, 6.9, 506, 'gluten', 3, [['fatia', 'slice', 25]], 'TACO'],
    ['aveia', 'Aveia em flocos', 'Rolled oats', 'cereal', 394, 13.9, 66.6, 8.5, 9.1, 5, 'gluten', 1, [['colher de sopa', 'tablespoon', 10], ['xícara', 'cup', 80]], 'TACO'],
    ['batata_cozida', 'Batata inglesa cozida', 'Potato, boiled', 'tuberculo', 52, 1.2, 11.9, 0.0, 1.3, 2, '', 1, [['unidade média', 'medium', 130], ['colher de servir', 'serving spoon', 55]], 'TACO'],
    ['batata_doce', 'Batata-doce cozida', 'Sweet potato, boiled', 'tuberculo', 77, 0.6, 18.4, 0.1, 2.2, 9, '', 1, [['unidade média', 'medium', 130], ['fatia', 'slice', 40]], 'TACO'],
    ['mandioca', 'Mandioca cozida', 'Cassava, boiled', 'tuberculo', 125, 0.6, 30.1, 0.3, 1.6, 1, '', 1, [['pedaço', 'piece', 80]], 'TACO'],
    ['pipoca', 'Pipoca estourada (sem óleo)', 'Popcorn, air-popped', 'cereal', 387, 13.0, 78.0, 4.5, 14.5, 8, '', 1, [['xícara', 'cup', 8]], 'REF'],
    // leguminosas
    ['feijao_carioca', 'Feijão carioca cozido', 'Pinto beans, cooked', 'leguminosa', 76, 4.8, 13.6, 0.5, 8.5, 2, '', 1, [['concha', 'ladle', 90], ['colher de servir', 'serving spoon', 50]], 'TACO'],
    ['feijao_preto', 'Feijão preto cozido', 'Black beans, cooked', 'leguminosa', 77, 4.5, 14.0, 0.5, 8.4, 2, '', 1, [['concha', 'ladle', 90]], 'TACO'],
    ['lentilha', 'Lentilha cozida', 'Lentils, cooked', 'leguminosa', 93, 6.3, 16.3, 0.5, 7.9, 2, '', 1, [['concha', 'ladle', 90]], 'REF'],
    ['grao_bico', 'Grão-de-bico cozido', 'Chickpeas, cooked', 'leguminosa', 164, 8.9, 27.4, 2.6, 7.6, 7, '', 1, [['colher de servir', 'serving spoon', 45]], 'REF'],
    ['tofu', 'Tofu', 'Tofu', 'leguminosa', 76, 8.0, 1.9, 4.8, 0.3, 7, 'soja', 2, [['fatia', 'slice', 60]], 'REF'],
    // carnes, peixes, ovos
    ['frango_grelhado', 'Peito de frango grelhado', 'Chicken breast, grilled', 'carne', 159, 32.0, 0.0, 2.5, 0.0, 50, '', 1, [['filé médio', 'medium fillet', 100]], 'TACO'],
    ['frango_cozido', 'Peito de frango cozido', 'Chicken breast, boiled', 'carne', 163, 31.5, 0.0, 3.2, 0.0, 45, '', 1, [['filé médio', 'medium fillet', 100], ['colher de servir (desfiado)', 'serving spoon (shredded)', 35]], 'TACO'],
    ['patinho_grelhado', 'Patinho grelhado', 'Lean beef (round), grilled', 'carne', 219, 35.9, 0.0, 7.3, 0.0, 55, '', 1, [['bife médio', 'medium steak', 100]], 'TACO'],
    ['carne_moida', 'Carne moída refogada', 'Ground beef, sautéed', 'carne', 212, 26.7, 0.0, 10.9, 0.0, 60, '', 1, [['colher de servir', 'serving spoon', 50]], 'TACO'],
    ['lombo_suino', 'Lombo suíno assado', 'Pork loin, roasted', 'carne', 210, 27.0, 0.0, 11.0, 0.0, 60, '', 1, [['fatia', 'slice', 60]], 'REF'],
    ['tilapia', 'Tilápia grelhada', 'Tilapia, grilled', 'peixe', 128, 26.0, 0.0, 2.6, 0.0, 52, 'peixe', 1, [['filé', 'fillet', 120]], 'REF'],
    ['sardinha', 'Sardinha em lata', 'Canned sardines', 'peixe', 208, 24.6, 0.0, 11.5, 0.0, 400, 'peixe', 2, [['lata (pequena)', 'small can', 85]], 'REF'],
    ['atum', 'Atum em lata (natural)', 'Canned tuna (water)', 'peixe', 116, 26.0, 0.0, 0.8, 0.0, 330, 'peixe', 2, [['lata (pequena)', 'small can', 80]], 'REF'],
    ['salmao', 'Salmão grelhado', 'Salmon, grilled', 'peixe', 208, 22.0, 0.0, 13.0, 0.0, 60, 'peixe', 1, [['filé', 'fillet', 120]], 'REF'],
    ['ovo_cozido', 'Ovo cozido', 'Egg, boiled', 'ovo', 146, 13.3, 0.6, 9.5, 0.0, 146, 'ovo', 1, [['unidade', 'unit', 50]], 'TACO'],
    ['ovo_mexido', 'Ovo mexido', 'Scrambled egg', 'ovo', 187, 11.0, 1.5, 14.5, 0.0, 180, 'ovo', 1, [['unidade (1 ovo)', 'unit (1 egg)', 55]], 'REF'],
    // laticínios
    ['leite_integral', 'Leite integral', 'Whole milk', 'laticinio', 61, 3.2, 4.7, 3.3, 0.0, 50, 'leite', 1, [['copo', 'glass', 200], ['xícara', 'cup', 240]], 'TACO'],
    ['leite_desnatado', 'Leite desnatado', 'Skim milk', 'laticinio', 35, 3.4, 4.9, 0.1, 0.0, 50, 'leite', 1, [['copo', 'glass', 200]], 'TACO'],
    ['iogurte_natural', 'Iogurte natural integral', 'Plain yogurt, whole', 'laticinio', 51, 4.1, 1.9, 3.0, 0.0, 70, 'leite', 1, [['pote', 'pot', 170], ['colher de sopa', 'tablespoon', 20]], 'TACO'],
    ['iogurte_desnatado', 'Iogurte natural desnatado', 'Plain yogurt, nonfat', 'laticinio', 41, 3.8, 5.8, 0.3, 0.0, 60, 'leite', 1, [['pote', 'pot', 170]], 'TACO'],
    ['queijo_minas', 'Queijo minas frescal', 'Fresh minas cheese', 'laticinio', 264, 17.4, 3.2, 20.2, 0.0, 31, 'leite', 2, [['fatia', 'slice', 30]], 'TACO'],
    ['queijo_mussarela', 'Queijo mussarela', 'Mozzarella', 'laticinio', 330, 22.6, 3.0, 25.2, 0.0, 373, 'leite', 2, [['fatia', 'slice', 20]], 'TACO'],
    ['ricota', 'Ricota', 'Ricotta', 'laticinio', 140, 12.6, 3.8, 8.1, 0.0, 280, 'leite', 2, [['fatia', 'slice', 40]], 'TACO'],
    ['manteiga', 'Manteiga', 'Butter', 'gordura', 726, 0.4, 0.1, 82.0, 0.0, 579, 'leite', 1, [['colher de chá', 'teaspoon', 5], ['colher de sopa', 'tablespoon', 14]], 'TACO'],
    // frutas
    ['banana', 'Banana prata', 'Banana', 'fruta', 98, 1.3, 26.0, 0.1, 2.0, 0, '', 1, [['unidade', 'unit', 80]], 'TACO'],
    ['maca', 'Maçã', 'Apple', 'fruta', 56, 0.3, 15.2, 0.0, 1.3, 0, '', 1, [['unidade', 'unit', 130]], 'TACO'],
    ['laranja', 'Laranja pera', 'Orange', 'fruta', 37, 1.0, 8.9, 0.1, 0.8, 0, '', 1, [['unidade', 'unit', 180]], 'TACO'],
    ['mamao', 'Mamão papaia', 'Papaya', 'fruta', 40, 0.5, 10.4, 0.1, 1.0, 3, '', 1, [['fatia', 'slice', 150]], 'TACO'],
    ['manga', 'Manga', 'Mango', 'fruta', 72, 0.4, 19.4, 0.2, 1.6, 2, '', 1, [['unidade pequena', 'small', 180]], 'TACO'],
    ['abacate', 'Abacate', 'Avocado', 'fruta', 96, 1.2, 6.0, 8.4, 6.3, 0, '', 1, [['colher de sopa', 'tablespoon', 30]], 'TACO'],
    ['uva', 'Uva', 'Grapes', 'fruta', 53, 0.7, 13.6, 0.2, 0.9, 1, '', 1, [['cacho pequeno', 'small bunch', 100]], 'TACO'],
    ['melancia', 'Melancia', 'Watermelon', 'fruta', 33, 0.9, 8.1, 0.0, 0.1, 0, '', 1, [['fatia', 'slice', 200]], 'TACO'],
    ['morango', 'Morango', 'Strawberry', 'fruta', 30, 0.9, 6.8, 0.3, 1.7, 1, '', 1, [['xícara', 'cup', 150]], 'TACO'],
    ['abacaxi', 'Abacaxi', 'Pineapple', 'fruta', 48, 0.9, 12.3, 0.1, 1.0, 1, '', 1, [['fatia', 'slice', 75]], 'TACO'],
    // hortaliças
    ['tomate', 'Tomate', 'Tomato', 'hortalica', 15, 1.1, 3.1, 0.2, 1.2, 4, '', 1, [['unidade média', 'medium', 120]], 'TACO'],
    ['alface', 'Alface crespa', 'Lettuce', 'hortalica', 11, 1.3, 1.7, 0.2, 1.8, 7, '', 1, [['prato de sobremesa', 'side plate', 40]], 'TACO'],
    ['cenoura', 'Cenoura crua', 'Carrot, raw', 'hortalica', 34, 1.3, 7.7, 0.2, 3.2, 3, '', 1, [['unidade média', 'medium', 70]], 'TACO'],
    ['brocolis', 'Brócolis cozido', 'Broccoli, cooked', 'hortalica', 25, 2.1, 4.4, 0.5, 3.4, 4, '', 1, [['ramo', 'floret', 30], ['colher de servir', 'serving spoon', 40]], 'TACO'],
    ['couve', 'Couve refogada', 'Collard greens, sautéed', 'hortalica', 90, 1.7, 8.7, 6.6, 5.7, 12, '', 1, [['colher de servir', 'serving spoon', 30]], 'TACO'],
    ['abobrinha', 'Abobrinha cozida', 'Zucchini, cooked', 'hortalica', 15, 1.1, 3.0, 0.2, 1.0, 1, '', 1, [['colher de servir', 'serving spoon', 50]], 'TACO'],
    ['chuchu', 'Chuchu cozido', 'Chayote, cooked', 'hortalica', 19, 0.4, 4.8, 0.0, 1.0, 1, '', 1, [['colher de servir', 'serving spoon', 50]], 'TACO'],
    ['pepino', 'Pepino', 'Cucumber', 'hortalica', 10, 0.9, 2.0, 0.0, 1.1, 2, '', 1, [['unidade média', 'medium', 200]], 'TACO'],
    ['beterraba', 'Beterraba cozida', 'Beet, cooked', 'hortalica', 32, 1.3, 7.2, 0.1, 1.9, 40, '', 1, [['unidade média', 'medium', 80]], 'TACO'],
    ['cebola', 'Cebola', 'Onion', 'hortalica', 39, 1.7, 8.9, 0.1, 2.2, 1, '', 1, [['unidade média', 'medium', 110]], 'TACO'],
    ['alho', 'Alho', 'Garlic', 'hortalica', 113, 7.0, 23.9, 0.2, 4.3, 5, '', 1, [['dente', 'clove', 4]], 'TACO'],
    // oleaginosas, sementes, gorduras
    ['azeite', 'Azeite de oliva', 'Olive oil', 'gordura', 884, 0.0, 0.0, 100.0, 0.0, 0, '', 2, [['colher de sopa', 'tablespoon', 13], ['colher de chá', 'teaspoon', 4]], 'TACO'],
    ['castanha_para', 'Castanha-do-pará', 'Brazil nut', 'oleaginosa', 643, 14.5, 15.1, 63.5, 7.9, 1, 'castanhas', 1, [['unidade', 'unit', 4]], 'TACO'],
    ['amendoim', 'Amendoim torrado', 'Roasted peanuts', 'oleaginosa', 600, 26.0, 21.0, 49.0, 8.0, 5, 'amendoim', 1, [['punhado', 'handful', 30]], 'REF'],
    ['pasta_amendoim', 'Pasta de amendoim', 'Peanut butter', 'oleaginosa', 588, 25.0, 20.0, 50.0, 6.0, 17, 'amendoim', 2, [['colher de sopa', 'tablespoon', 16]], 'REF'],
    ['amendoa', 'Amêndoa', 'Almond', 'oleaginosa', 579, 21.0, 22.0, 50.0, 12.5, 1, 'castanhas', 1, [['punhado', 'handful', 28]], 'REF'],
    ['chia', 'Chia', 'Chia seeds', 'oleaginosa', 486, 16.5, 42.0, 31.0, 34.0, 16, '', 1, [['colher de sopa', 'tablespoon', 12]], 'REF'],
    ['linhaca', 'Linhaça', 'Flaxseed', 'oleaginosa', 534, 18.0, 29.0, 42.0, 27.0, 30, '', 1, [['colher de sopa', 'tablespoon', 10]], 'REF'],
    // doces, bebidas
    ['mel', 'Mel', 'Honey', 'doce', 309, 0.4, 84.0, 0.0, 0.0, 6, '', 2, [['colher de sopa', 'tablespoon', 21], ['colher de chá', 'teaspoon', 7]], 'TACO'],
    ['acucar', 'Açúcar refinado', 'Sugar', 'doce', 387, 0.3, 99.5, 0.0, 0.0, 1, '', 2, [['colher de sopa', 'tablespoon', 15], ['colher de chá', 'teaspoon', 5]], 'TACO'],
    ['choc_amargo', 'Chocolate amargo 70%', 'Dark chocolate 70%', 'doce', 598, 7.8, 46.0, 43.0, 11.0, 20, 'leite', 3, [['quadradinho', 'square', 10]], 'REF'],
    ['suco_laranja', 'Suco de laranja natural', 'Orange juice, fresh', 'bebida', 45, 0.7, 10.4, 0.2, 0.2, 1, '', 1, [['copo', 'glass', 200]], 'TACO'],
    ['refri_cola', 'Refrigerante tipo cola', 'Cola soda', 'bebida', 37, 0.0, 9.5, 0.0, 0.0, 6, '', 4, [['lata', 'can', 350]], 'TACO'],
    ['cafe', 'Café (sem açúcar)', 'Coffee (no sugar)', 'bebida', 2, 0.1, 0.4, 0.0, 0.0, 2, '', 1, [['xícara', 'cup', 50]], 'TACO'],
    // ultraprocessados (para contraste educativo)
    ['biscoito_recheado', 'Biscoito recheado', 'Sandwich cookie', 'ultra', 471, 6.4, 71.0, 18.0, 2.1, 190, 'gluten,leite,soja', 4, [['unidade', 'unit', 12]], 'REF'],
    ['salgadinho', 'Salgadinho de milho', 'Corn snack', 'ultra', 520, 6.0, 60.0, 29.0, 3.0, 700, '', 4, [['pacote pequeno', 'small bag', 50]], 'REF'],
    ['macarrao_instantaneo', 'Macarrão instantâneo (preparado)', 'Instant noodles (prepared)', 'ultra', 440, 9.0, 60.0, 18.0, 2.5, 1700, 'gluten', 4, [['pacote', 'pack', 85]], 'REF'],
    ['presunto', 'Presunto', 'Ham (deli)', 'ultra', 110, 16.0, 1.5, 4.5, 0.0, 1100, '', 4, [['fatia', 'slice', 15]], 'REF']
  ];

  var foods = {}, list = [];
  raw.forEach(function (r) {
    var f = {
      id: r[0], pt: r[1], en: r[2], group: r[3], kcal: r[4], p: r[5], c: r[6], f: r[7], fib: r[8], na: r[9],
      allergens: A(r[10]), nova: r[11], measures: r[12], src: r[13]
    };
    // derivados: animal / vegetariano / vegano
    f.animal = ['carne', 'peixe'].indexOf(f.group) >= 0 || f.id === 'presunto';
    f.dairyEgg = ['laticinio', 'ovo'].indexOf(f.group) >= 0 || f.allergens.indexOf('leite') >= 0 || f.id === 'mel';
    f.vegan = !f.animal && !f.dairyEgg;
    f.vegetarian = !f.animal;
    f.glutenFree = f.allergens.indexOf('gluten') < 0;
    f.lactoseFree = f.allergens.indexOf('leite') < 0;
    f.nutFree = f.allergens.indexOf('castanhas') < 0 && f.allergens.indexOf('amendoim') < 0;
    // Índice HyperNutry de saciedade (0–5): proteína, fibra e baixa densidade energética; ultraprocessado penaliza.
    var k = Math.max(f.kcal, 1);
    var pk = f.p / k * 100, fk = f.fib / k * 100, ed = k / 100;
    var s = 2 * Math.min(pk / 10, 1) + 1.5 * Math.min(fk / 4, 1) + 1.5 * (1 - Math.min(ed / 4, 1));
    if (f.nova === 4) s -= 1;
    f.satiety = Math.max(0, Math.min(5, Math.round(s * 10) / 10));
    foods[f.id] = f; list.push(f);
  });

  HN.foods = foods;
  HN.foodList = list;
  HN.foodBase = { name: 'TACO/UNICAMP 4ª ed. (referência parcial)', version: 'ref-1', count: list.length };
  HN.foodGroups = {
    cereal: ['Cereais e pães', 'Grains & bread'], tuberculo: ['Tubérculos', 'Tubers'], leguminosa: ['Leguminosas', 'Legumes'],
    carne: ['Carnes', 'Meats'], peixe: ['Peixes', 'Fish'], ovo: ['Ovos', 'Eggs'], laticinio: ['Laticínios', 'Dairy'],
    fruta: ['Frutas', 'Fruits'], hortalica: ['Hortaliças', 'Vegetables'], gordura: ['Óleos e gorduras', 'Oils & fats'],
    oleaginosa: ['Oleaginosas e sementes', 'Nuts & seeds'], doce: ['Doces', 'Sweets'], bebida: ['Bebidas', 'Drinks'], ultra: ['Ultraprocessados', 'Ultra-processed']
  };
  // seção do supermercado (lista de compras)
  HN.shopSection = {
    cereal: 'mercearia', tuberculo: 'hortifruti', leguminosa: 'mercearia', carne: 'acougue', peixe: 'acougue', ovo: 'refrigerados',
    laticinio: 'refrigerados', fruta: 'hortifruti', hortalica: 'hortifruti', gordura: 'mercearia', oleaginosa: 'mercearia',
    doce: 'mercearia', bebida: 'mercearia', ultra: 'mercearia'
  };
  HN.shopSectionName = {
    hortifruti: ['Hortifrúti', 'Produce'], mercearia: ['Mercearia', 'Pantry'], acougue: ['Açougue e peixaria', 'Meat & fish'],
    refrigerados: ['Refrigerados', 'Refrigerated'], padaria: ['Padaria', 'Bakery']
  };
  HN.shopSectionOverride = { pao_frances: 'padaria', pao_integral: 'padaria' };
})(window.HN = window.HN || {});

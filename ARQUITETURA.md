# HyperNutry — arquitetura (briefing para qualquer IA ou pessoa que for mexer)

PWA em JavaScript/HTML/CSS puros. Sem framework, sem build. Tudo em `window.HN`. Dados só no aparelho (localStorage, prefixo `hypernutry:`; documentos em IndexedDB).

## Arquivos (ordem de carga no index.html)
- `js/data-foods.js` ~65 alimentos por 100 g (base TACO de referência) + sinalizadores (vegano, glúten, saciedade…).
- `js/data-recipes.js` equipamentos e 16 receitas.
- `js/calc.js` (`HN.calc`) fórmulas (Mifflin, Harris, Katch), faixas flexíveis, macros, substituição, cardápio, lista de compras, alertas de segurança.
- `js/ocr.js` (`HN.ocr`) interpreta texto de rótulo e de bioimpedância; carrega Tesseract.js sob demanda (CDN) — não está embutido.
- `js/core.js` utilidades, armazenamento `HN.S`, perfil, menu, busca, camadas (botão Voltar), roteador, `HN.start()`.
- `js/ui.js` peças de tela (chips, escala, gráficos SVG).
- `js/v-*.js` telas: home (boas-vindas, assistente, diário, fome e emoções), food (alimentos, saciedade, metas), plan (cardápio, despensa, compras, receitas, família, cozinheiro), body (corpo, rótulos, telenutrição), meta (planos, config, ajuda, sobre).
- `sw.js` offline (rede primeiro). `manifest.json`, `img/`, `versoes.json`.

## Regras do projeto
- Texto sempre `T('pt','en')`; em listas use `[pt,en]` + `HN.tt` (idioma é lido na hora de desenhar, nunca na carga).
- Ações por `data-act` (`HN.acts`), campos por `data-in` (`HN.ins`). Navegação só por `HN.go` e `HN.layer` (cada camada tem entrada no histórico).
- Números de calorias nunca aparecem para menor de 18, histórico de transtorno alimentar, gestação ou sem dados (`HN.numerosOk`).
- Sem promessa de resultado, sem antes/depois, sem comparar com medicamento, sem prescrição (CFN 599/2018, Lei 8.234/1991).
- Nenhum segredo no repositório.

## Onde mudar o quê
Novo alimento: `data-foods.js`. Nova receita: `data-recipes.js`. Benchmark: NÃO é tela do app; é o briefing `BENCHMARK.md` (insumo de produto). Nova tela: `HN.views.<nome>` + entrada em `HN.nav`.
Ao mudar arquivos, aumente `V` em `sw.js` e `HN.version` em `core.js`.

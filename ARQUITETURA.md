# HyperNutry — arquitetura (briefing para qualquer IA ou pessoa que for mexer)

PWA em JavaScript/HTML/CSS puros. Sem framework, sem build. Tudo em `window.HN`. Dados só no aparelho (localStorage, prefixo `hypernutry:`; documentos em IndexedDB).

## Arquivos (ordem de carga no index.html)
- `js/data-foods.js` ~65 alimentos por 100 g (base TACO de referência) + sinalizadores (vegano, glúten, saciedade…).
- `js/data-taco.js` TACO completa (591 itens, micronutrientes); alérgenos estimados pelo nome.
- `js/data-recipes.js` equipamentos e 16 receitas.
- `js/calc.js` (`HN.calc`) fórmulas (Mifflin, Harris, Katch), faixas flexíveis, macros, substituição, cardápio, lista de compras, alertas de segurança.
- `js/ocr.js` (`HN.ocr`) interpreta texto de rótulo e de bioimpedância; carrega Tesseract.js sob demanda (CDN) — não está embutido.
- `js/core.js` utilidades, armazenamento `HN.S`, perfil, menu, busca, camadas (botão Voltar), roteador, `HN.start()`.
- `js/v-calc.js` PARTE A: calculadora de calorias, gostos e cozinha; liga TACO/restrições/gostos às telas existentes.
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

## Duas partes do app
- **A · 🧮 Calcular e cozinhar** (abre primeiro, sem cadastro nem aceite): calculadora, cardápio/despensa/compras, receitas, alimentos, rótulos, Saciedade Raiz, gostos.
- **B · 🩺 Meu acompanhamento** (dados de saúde): diário, fome e emoções, metas, corpo, família/perfis, telenutrição. **O aceite LGPD só é pedido ao entrar aqui** (guarda em `HN.render` via `HN.partMap`).
- Telas comuns: planos, ajuda, config, sobre. Barra de baixo e menu mudam conforme a parte (`HN.barIds(parte)`).
- Parte A nunca lê peso/altura salvos; a calculadora diária não salva nada. Restrições/gostos da Parte A ficam em `gostos` (só no aparelho) e se somam às do perfil (`HN.restrAll`).

## Design system (desde a v0.2.1)
Tudo em `css/style.css`, como variáveis no `:root` (claro) e repetidas para o escuro (`data-theme="dark"` e `prefers-color-scheme`).
- **Superfícies:** Alabastro `#F8FAFC` (claro) · Obsidiana `#0F172A` (escuro); cartões `--card`.
- **Destaques:** Esmeralda `--brand #10B981 → --brand-2 #059669` (Parte A, ações) · Âmbar `--accent #F59E0B` · Ciano `--cyan #06B6D4` (água/foco) · Violeta `--violet #8B5CF6` / `--violet-strong #7C3AED` (Parte B e faixa de tolerância) · Sálvia `--sage #94A3B8` (neutro de saciedade).
- **Contraste (não quebrar):** cor viva é para **preencher**. Texto colorido usa `--brand-tx` (verde escuro no claro, verde claro no escuro). Botão esmeralda/âmbar leva texto escuro (`--brand-ink`, `--accent-ink`), nunca branco.
- **Vidro:** `--glass` (65–70%) no cabeçalho, seletor das partes, folhas; `--glass-bar` (88–90%) na barra de baixo, para os rótulos lerem bem. Vira sólido sem suporte a `backdrop-filter`, com `prefers-reduced-transparency` e em alto contraste.
- **Tipografia:** fonte do sistema (SF Pro no iPhone, Roboto no Android; nada baixado). `.t-display` 36pt para números do dia, `.t-title` 24pt, corpo 16pt/1.5, `.t-caption` 12pt. Números com `tabular-nums` (não "pulam").
- **Movimento:** `--ease` `cubic-bezier(.4,0,.2,1)` e `--spring` (folhas, chips). Tudo some com "Reduzir animações" ou `prefers-reduced-motion`.
- **Vibração:** `HN.haptic('leve'|'media'|'sucesso')`. Só Android (o iPhone não deixa site vibrar). Desligável em Configurações (`cfg.semVibrar`) e desligada com "Reduzir animações".
- **Cromo:** `<html data-part="A|B">` diz em que parte a pessoa está. Seletor das partes = pílula segmentada (A esmeralda "sem cadastro", B violeta "saúde · protegido 🔒"). Barra de baixo flutuante: até 4 favoritos (`HN.BAR_MAX`, 2 de cada lado) + **📷 câmera fixa no centro** (`data-act="scan"`).
- **Sem sequência de dias (streak)** em lugar nenhum: é princípio do app (decisão de 03/Out/2026).

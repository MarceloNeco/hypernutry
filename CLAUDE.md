# HyperNutry — contexto para o Claude Code

Leia antes de mexer: `ARQUITETURA.md` (código e design system) e `BENCHMARK.md` (insumo de produto, não é tela do app).

## Quem é o usuário
- Marcelo (GitHub: MarceloNeco), **não é desenvolvedor**, fala português. Instruções sempre passo a passo, nível iniciante.
- **Regra zero** (diretrizes SolverONE): antes de aplicar diretriz global ainda não implementada aqui, listar e confirmar com ele. Nada em silêncio.
- Sem anúncios. **Nunca** segredo/token no repositório (é público).
- Entrega: **branch + Pull Request**; ele revisa e clica em Merge (decisão de 03/Out/2026).
- Zip, quando pedido: `HYPERNUTRY vX.Y.Z dd-Mmm-aaaa HHhMMm.zip`, arquivos soltos na raiz.

## Produto
- PWA de nutrição fácil: "sem passar fome", **Saciedade Raiz** (nunca "mounjaro raiz": sem alegação de medicamento).
- **Parte A · 🧮 Calcular e cozinhar** (sem cadastro, sem LGPD): calculadora, cardápio, receitas, despensa, compras, rótulo, código de barras, modo cozinheiro, vídeos e organização da cozinha.
- **Parte B · 🩺 Meu acompanhamento 🔒** (exige aceite LGPD): diário, fome/saciedade e humor, medidas, metas, foto do prato, laudo de bioimpedância.
- Segurança: números ocultos para menor de 18, histórico de transtorno alimentar ou gestação. Sem antes/depois, sem promessa de resultado, sem streaks.

## Decisões do blueprint mobile (03/Out/2026)
- Sem sequência de dias; conquistas sem balança celebram o que aconteceu, sem zerar.
- Foto do prato usa a IA da chave da pessoa (nuvem), com aviso claro. Selo "lido no aparelho" só em rótulo, código de barras e laudo.
- Barra de baixo: 📷 fixa no centro + até 4 favoritos configuráveis.
- Topo no padrão SolverONE (☰ · nome · PT · ❓ 🔍 ⚙ 🏠); saudação vai no primeiro cartão do Início.

## Escopo da v0.3 (em entregas separadas) — concluído em 03/Out/2026
1. Base visual (v0.2.1) ✔ 2. Inícios A/B com anéis e faixa de tolerância, carrossel por aparelho, escala de fome (v0.2.2) ✔ 3. Câmera: código de barras (Open Food Facts), OCR hospedado, laudo InBody, foto do prato (v0.2.3 ✔; reconhecimento do prato por IA depende do cofre de IA da entrega 6) 4. Modo cozinheiro (v0.2.4 ✔) 5. Medidas e conquistas sem balança (v0.2.5 ✔) 6. Diretrizes SolverONE: módulo comum instalado (v0.3.0 ✔) com cofre de IA e rede; reconhecimento do prato por IA ligado.

## Diretrizes SolverONE ainda NÃO aplicadas (regra zero: confirmar com ele antes)
- 🔐 Cifrar dados de saúde no aparelho (AES-GCM com senha/PIN) — a diretriz pede "dado sensível cifrado sempre"; hoje é localStorage simples. **Prioridade.**
- 👤 Conta e login (apelido + e-mail + senha, biometria), sessão que não cai no F5, voltar ao mesmo lugar após entrar.
- 📴 "Usar sem internet" nas Configurações (salvar no aparelho, criar atalho, passo no wizard).
- 📬 Inbox de recados (recados.json do RootifyONE) e notificações/lembretes.
- 🗂️ Arquivos master do RootifyONE (`fonteCentral`: versão mínima, termos versionados).
- 🗓️ Novidades consolidadas por dia em Configurações (seção recolhida).
- ♿ Ler a tela em voz alta (TTS), falar em vez de digitar (STT), botões ± nos campos de valor.
- 🧩 Faixa do topo do módulo (PT|EN + ✨ chat de IA) e Assist ONE (central de ajuda).
- 📱 Quadro de compatibilidade do aparelho; vários arquivos de uma vez (laudos/PDF); telemetria com consentimento.
- ▮▯▮ Código de barras no iPhone (leitor hospedado, ex.: ZXing), hoje só digitando o número.

## A cada release
Subir a versão em `js/core.js` (`HN.version`), `sw.js` (`V`), `versoes.json` (data e hora de Brasília). Testar em 390×844 e 320 px (sem rolagem lateral), claro e escuro, e abrir `TESTE-hypernutry.html`.

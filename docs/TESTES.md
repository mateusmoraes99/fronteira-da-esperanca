# Testes técnicos

O jogo foi avaliado com **30 casos de teste**, elaborados a partir dos requisitos funcionais e executados no Chromium com [Playwright](https://playwright.dev/). Destes, 26 rodam automaticamente e 4 dependem de execução manual. Os testes não envolvem pessoas: verificam se o software funciona como especificado. A avaliação com participantes é uma etapa separada da pesquisa.

## Como executar

```bash
npm install
npx playwright install chromium   # apenas na primeira vez
npm run build                     # gera o index.html a ser testado
npm test                          # roda as três etapas abaixo
```

| Script | O que faz | Saída em `testes/resultados/` |
|---|---|---|
| [`testes.js`](../testes/testes.js) | 24 testes funcionais, de compatibilidade, desempenho e regressão | `resultados.json` e capturas de tela |
| [`scan_es.js`](../testes/scan_es.js) | Joga uma partida completa em espanhol e coleta todos os textos exibidos | `textos_vistos_es.json`, `restos_portugues_es.json` |
| [`testes_es.js`](../testes/testes_es.js) | 6 testes de localização (usa o resultado da varredura) | `resultados_es.json` e capturas de tela |

Para testar outro arquivo local ou guardar os resultados em outra pasta, use as variáveis `GAME` (endereço `file://` do jogo) e `OUT` (pasta de saída):

```bash
GAME=file:///caminho/para/outro/index.html OUT=/tmp/resultados node testes/testes.js
```

## Histórico

A bateria foi executada em três momentos:

1. **Primeira execução**: 16 dos 24 casos então existentes passaram, 3 falharam e 5 ficaram pendentes. As falhas foram: a janela de Opções e a de Recordes abriam atrás do menu inicial, e no celular o cabeçalho e o painel do dia ficavam cortados.
2. **Após as correções** (regressão): 20 passaram, nenhum falhou e 4 dependem de execução manual.
3. **Após a inclusão do espanhol**: a bateria foi repetida com o mesmo resultado, e os 6 testes de localização passaram.

## Resultados atuais

### Funcionais

| ID | Teste | Situação | Resultado obtido |
|---|---|---|---|
| TF01 | Iniciar uma partida nova | ✅ Passou | Prólogo abriu (PRÓLOGO), "Continuar" avançou as falas (0→1), "Pular" levou à tela "Como atender no balcão" e daí ao painel do Dia 1 com R$ 10.000, vagas 100, equipe 100, reputação 80 e pressão 0. |
| TF02 | Atalhos de teclado | ✅ Passou | Setas trocaram a pessoa no balcão (ok); E examinou (ok); M abriu o Manual (ok); P pausou e retomou (ok); carimbos pelo teclado: 1:Acolhido!, 4:Encaminhado ao trabalho; Espaço fechou o dia e abriu o relatório (ok). |
| TF03 | Fluxo de atendimento em 3 passos | ✅ Passou | Antes do exame: passo 1 destacado, 3 papéis lacrados, guia do 1º caso visível e carimbos esmaecidos. Clicar no lacre revelou os documentos (Engenheiro eletricista, Engenharia elétrica ✔), passou ao passo 2 e descontou 2 de equipe. Marcar uma linha registrou 1 marcação e passou ao passo 3; clicar de novo desmarcou. "Nada suspeito" levou ao passo 3 e liberou os carimbos (Trabalho: "Qualificação comprovada ✔"). Observação: os carimbos esmaecidos continuam clicáveis antes do exame, o que permite decidir sem examinar (comportamento previsto: o exame é opcional). |
| TF04 | Telas e janelas | ✅ Passou | Manual abriu e fechou sem trocar o caso (ok); "Painel do dia" voltou ao painel e "Iniciar dia" voltou ao atendimento com um caso em aberto no balcão (ok); pausa exibiu a tela de pausa e bloqueou o teclado (ok); cronômetro parado durante a pausa (30s,30s → 30s,30s) e voltou a correr depois (28s,28s). |
| TF05 | Dificuldade | ✅ Passou | Acolhendo a Família Pérez: facil: custo base 9/9 → descontou orçamento 6 e vagas 6 (esperado 6/6); normal: custo base 9/9 → descontou orçamento 9 e vagas 9 (esperado 9/9); dificil: custo base 9/9 → descontou orçamento 13 e vagas 13 (esperado 13/13). O carimbo mostrou os mesmos valores antes da decisão. |
| TF06 | Demais opções | ✅ Passou | A tela de Opções abriu visível pelo menu. As 4 opções foram desligadas e continuaram desligadas após recarregar a página. Desligadas: textos de lei ocultos (ok), animações desativadas (ok), decisão sem tela de consequência (ok), cronômetro no dia 4 com 0 caso(s) urgente(s) e 0 cronômetro(s). Ligadas de novo: leis visíveis, animações ativas, tela de consequência exibida e 0 cronômetro(s) ativo(s). |
| TF07 | Recursos ao Acolher e Encaminhar | ✅ Passou | Acolher a Família Pérez (crítico) descontou orçamento 9, vagas 9 e equipe 7, iguais aos custos do caso (9/9/7). Encaminhar o Eng. Salazar (estável) não alterou recursos. Encaminhar o Sr. Gutiérrez (grave) reduziu a reputação em 8. Encaminhar o Sr. Montoya (crítico) pediu confirmação (sim) e, confirmado, registrou 1 pessoa perdida e reputação −20. |
| TF08 | Carimbo Trabalho | ✅ Passou | Eng. Salazar (qualificado, documentos ok): "Encaminhado ao trabalho", empregos 0→1. Sra. Quintero (qualificada, com sinais de aliciamento, sem exame e sem denúncia): "Sinais ignorados", conduta −8, reputação −5, empregos inalterados (sim). Família Pérez (crítico) bloqueado: sim; Jovens Ramírez (menores) bloqueado: sim. |
| TF09 | Carimbo Denunciar | ✅ Passou | Adolescente Torres: 3 sinais reais marcados → "Denúncia acionada", denúncias 0→1, provas 0→1, reputação 80→88. Eng. Salazar (sem sinais) → "Denúncia infundada": reputação −10, pontos 39→24, conduta −12; o caso continuou aberto (sim). |
| TF10 | Pressão e eventos de crise | ✅ Passou | Com equipe 63 a pressão exibida foi 37% (100 − equipe). Em 5000 inícios de dia simulados ocorreram 2152 eventos (43.0%, esperado cerca de 45%). No evento "🌧️ Chuva Torrencial", a opção "Mobilizar equipe" aplicou equipe 80→65 e reputação 70→80. |
| TF11 | Casos da história nos dias certos | ✅ Passou | Fila gerada 20 vezes para cada dia; o caso da história apareceu sempre no dia certo e só nele. Exemplo: 1:Eng. Salazar (2 na fila); 2:Enf. Carolina Ruiz (2 na fila); 3:Sra. Quintero (3 na fila); 4:Família Arias (3 na fila); 5:Rapazes do Contratante (4 na fila); 6:— (4 na fila); 7:Yusmary (15) e o “tio” (5 na fila); 8:— (5 na fila); 9:— (5 na fila); 10:— (6 na fila). |
| TF12 | Fim de jogo | ✅ Passou | Partida completa de 10 dias jogada automaticamente: relatório final exibido ("PARABÉNS!", dias 10 / 10, nota S – Gestor Humanitário Exemplar, 2761 pontos, 38 atendimentos, 25 empregos, 5 denúncias, 0 perdidos). Zerando orçamento e vagas: epílogo "Portas fechadas" e relatório com "COLAPSO". |
| TF13 | Som | ✅ Passou | Examinar documentos gerou 2 tom(ns) sintetizado(s); o botão de som mudou para "🔇" e, desligado, nenhum som foi gerado (0); religado, os sons voltaram (2). Erros no console: 0. |
| TF14 | Continuar a partida | ✅ Passou | Partida salva automaticamente no início do dia 3. Após uma decisão no meio do dia, a página foi recarregada: o botão "Continuar" ficou ativo e a partida voltou ao início do dia 3 com os mesmos recursos e pontos do começo do dia (211 pts). A decisão tomada no meio do dia não foi mantida, comportamento previsto pelo jogo ("Progresso do dia não será salvo"). Observação: ao usar "Menu" e "Continuar" no meio do dia, os pontos já obtidos foram mantidos (241 → 241), mas a fila do dia foi sorteada de novo, com 3 de 3 pessoas para atender; isso permite repetir atendimentos do mesmo dia. |
| TF15 | Recordes | ✅ Passou | Ao fim da partida o recorde foi gravado (1 registro) e o save da partida foi apagado. Após recarregar, a tela de Recordes mostrou a pontuação; "Apagar recordes" removeu os registros (0 restantes). |

### Compatibilidade

| ID | Teste | Situação | Resultado obtido |
|---|---|---|---|
| TC01 | Google Chrome (computador) | ✅ Passou | Executado no Chromium 153.0.8010.12 (mesmo motor do Google Chrome), em 1366×768: partida completa de 10 dias com 0 erro(s) do jogo no console e sem rolagem horizontal. A única mensagem de erro foi a falha ao baixar a fonte Inter do Google Fonts, porque o ambiente de teste não tem internet; nesse caso o navegador usa uma fonte do sistema e o jogo funciona normalmente. |
| TC02 | Mozilla Firefox (computador) | ⏳ Manual | Firefox não disponível no ambiente usado; executar manualmente. |
| TC03 | Microsoft Edge (computador) | ⏳ Manual | Edge não disponível no ambiente usado; executar manualmente (usa o mesmo motor Chromium do TC01). |
| TC04 | Celular Android (Chrome) | ⏳ Manual | Emulação do Pixel 7 no Chromium: o toque no lacre examinou os documentos (ok), largura do conteúdo 412px para tela de 412px, 0 erro(s). Falta confirmar em um celular real pelo link do itch.io. |
| TC05 | Resoluções de tela | ✅ Passou | 1920x1080: 5/5 carimbos alcançáveis, 9/9 itens do cabeçalho na tela, título inteiro, painel do dia com 3 coluna(s) e largura 1920px; 1366x768: 5/5 carimbos alcançáveis, 9/9 itens do cabeçalho na tela, título inteiro, painel do dia com 3 coluna(s) e largura 1366px; 768x1024: 5/5 carimbos alcançáveis, 8/8 itens do cabeçalho na tela, título inteiro, painel do dia com 1 coluna(s) e largura 768px; 390x844: 5/5 carimbos alcançáveis, 8/8 itens do cabeçalho na tela, título inteiro, painel do dia com 1 coluna(s) e largura 390px. |
| TC06 | Versão publicada no itch.io | ⏳ Manual | O itch.io não é acessível a partir do ambiente usado; executar manualmente pelo link público. |

Os testes marcados como *Manual* dependem de navegadores ou aparelhos que não existem no ambiente automatizado: abrir o jogo no Firefox, no Edge, em um celular Android real e pela página do itch.io, e jogar ao menos um dia completo.

### Desempenho e regressão

| ID | Teste | Situação | Resultado obtido |
|---|---|---|---|
| TD01 | Tempo de carregamento | ✅ Passou | Arquivo único de 848 KB, sem cache, média de 3 carregamentos: sem limitação: primeira tela em 0.00 s e carregamento completo em 0.28 s; 4G (9 Mbps, 170 ms): primeira tela em 0.45 s e carregamento completo em 0.97 s; 3G rápido (1,6 Mbps, 560 ms): primeira tela em 0.92 s e carregamento completo em 4.93 s. |
| TD02 | Partida completa de 10 dias | ✅ Passou | Partida completa (38 atendimentos) em 30 s de jogo automatizado, sem travamentos nem erros. Memória JavaScript após coleta de lixo: 9.5 MB no início e 9.5 MB no fim. |
| TR01 | Refazer os testes que falharam | ✅ Passou | Nenhum teste falhou, então não houve correção a repetir. A bateria automatizada pode ser executada de novo a cada nova versão do jogo. |

### Localização (espanhol)

| ID | Teste | Situação | Resultado obtido |
|---|---|---|---|
| TL01 | Seletor de idioma | ✅ Passou | O jogo abre em português; "Español" trocou o menu ("▶ Nuevo Juego →", título "Frontera de la Esperanza"), a escolha continuou após recarregar e "Português" voltou ao original ("▶ Novo Jogo →"). |
| TL02 | Textos traduzidos em uma partida completa | ✅ Passou | Partida completa em espanhol, com menu, opções, recordes, prólogo, manual, todos os dias, eventos, cenas e relatório final: 1129 textos diferentes exibidos e 0 restos em português (a única palavra em português é o botão "Português" do seletor). |
| TL03 | Regras do jogo em espanhol | ✅ Passou | Ing. Salazar: "Derivado al trabajo" (empleos 1); Adolescente Torres com sinais marcados: "Denuncia activada" (denuncias 1); Familia Pérez sem sinais: "Denuncia infundada". Erros: 0. |
| TL04 | Saves e recordes separados por idioma | ✅ Passou | Com uma partida salva em português, o menu em espanhol mostrou "Sin partida guardada" e não misturou as partidas. A partida em espanhol foi salva em um registro próprio, e a de português continuou guardada. |
| TL05 | Valores e datas | ✅ Passou | O painel em espanhol mostra o orçamento como "R$ 10.000" (o abrigo fica no Brasil, por isso a moeda é o real) e o dia como "Día 1 / 10". Os nomes das leis e órgãos brasileiros (CONARE, PF, Carteira de Trabalho) foram mantidos, com explicação em espanhol. |
| TL06 | Textos em espanhol cabem na tela | ✅ Passou | 1366x768: cabeçalho inteiro na tela (0 fora), 5/5 carimbos alcançáveis, 0 rótulo(s) cortado(s), sem rolagem horizontal; 390x844: cabeçalho inteiro na tela (0 fora), 5/5 carimbos alcançáveis, 0 rótulo(s) cortado(s), sem rolagem horizontal. |

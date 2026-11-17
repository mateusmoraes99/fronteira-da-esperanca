# Regras do jogo

Este documento descreve as regras implementadas em [`src/jogo.js`](../src/jogo.js): recursos, custos, pontos, conduta e nota final.

## Recursos do abrigo

Todos os recursos vão de 0 a 100%.

| Recurso | Início | O que consome | Observação |
|---|---|---|---|
| 💰 Orçamento | 100 | Acolher, Assistência, Denunciar | Exibido em reais (100% = R$ 10.000) |
| 🏠 Vagas (abrigo) | 100 | Acolher, Assistência, Denunciar | Perde 3 por dia naturalmente |
| 👥 Equipe | 100 | Toda ação (exame, decisões) | Varia de −4 a +1 por dia |
| ⭐ Reputação | 80 | Erros (casos perdidos, denúncias infundadas) | Sobe com acertos |

A **pressão operacional** exibida no painel é `100 − equipe`.

A partida termina em **colapso** quando orçamento e vagas chegam a zero ao mesmo tempo. Avisos aparecem quando o orçamento ou as vagas zeram, a equipe fica abaixo de 10 ou a reputação abaixo de 20.

## O dia de trabalho

- **Fila do dia**: 2 pessoas nos dias 1–2, 3 nos dias 3–4, 4 nos dias 5–6 e 5 ou 6 a partir do dia 7. Os casos da história aparecem sempre no dia certo; os demais são sorteados.
- **Casos urgentes**: a partir do dia 4, casos críticos têm um cronômetro de 30 s (pode ser desligado nas Opções). Se o tempo acabar, a pessoa é perdida.
- **Fim do dia**: só é possível com a fila vazia. Aparece o relatório do dia; nos dias pares o jogador escolhe 1 entre 3 **melhorias**.
- **Novo dia**: abre com a cena da história daquele dia e, depois dela, há 45% de chance de um **evento de crise** com escolha.

## Custos e pontos de cada ação

Cada caso tem custos próprios `b` (orçamento), `ab` (vagas) e `t` (equipe) e uma pontuação base `pts`. A dificuldade multiplica os custos: fácil × 0,7, normal × 1,0 e difícil × 1,4.

| Ação | Custo | Pontos |
|---|---|---|
| 🔎 Examinar | 2 de equipe | 0 (dá +1 de conduta) |
| ✅ Acolher | `b`, `ab`, `t` inteiros | `pts` |
| 🤝 Assistência | metade de `b`, `ab`, `t` | `pts × 0,5` |
| ➡️ Encaminhar | nenhum | 0 |
| 💼 Trabalho | 3 de equipe (+ parte de `b`/`ab` em casos graves e moderados) | `pts × qualificação × documento` |
| 🚨 Denunciar | 30% de `b`, 40% de `ab`, 4 de equipe | `pts × 1,4 × qualidade das marcações` |

**Combo**: acertos seguidos multiplicam os pontos (3 seguidos = ×1,5; 5 seguidos = ×2).

### Encaminhar

- Caso **crítico**: o jogo pede confirmação; confirmado, a pessoa é perdida e a reputação cai 20.
- Caso **grave**: a reputação cai 8.

### Trabalho

- Bloqueado para casos **críticos** (primeiro a saúde) e para **menores de idade** (ECA).
- Bloqueado se o jogador marcou sinais de risco e ainda não denunciou.
- Fator de qualificação: × 1,5 com qualificação comprovável, × 0,7 sem.
- Fator de documento: válido × 1,0; vencido × 0,8; sem documento × 0,7. Sem examinar: × 0,7 (válido) ou × 0,35 (outros).
- Quando dá certo: +4 de reputação, +3 de orçamento e +4 de conduta.

### Denunciar

- **Com fundamento** (o caso tem sinais reais de exploração): reputação +8 (+10 se crítico) e conduta +12 (ou +6 se poucas marcações), menos 3 por marcação errada.
- **Sem fundamento**: "denúncia infundada", com reputação −10, conduta −12 e pontos −15. O caso continua aberto.

### Sinais ignorados

Se o caso tinha sinais de exploração e o jogador decide qualquer outra coisa sem denunciar, perde 8 de conduta e 5 de reputação.

## Conduta

A **conduta** (`G.etica`, de 0 a 100, começa em 50) mede *como* o jogador decide, e não apenas *quanto* pontua. Ela sobe com exame de documentos, marcações corretas, denúncias fundamentadas e encaminhamentos ao trabalho, e cai com denúncias infundadas, marcações de preconceito e sinais ignorados.

## Nota final

```
máximo_esperado = soma(pts de todos os casos) × 10 dias × 0,35
pct = min(1, pontos / (máximo_esperado × 1,1)) × (0,55 + 0,45 × min(1, conduta / 70))
```

| Nota | pct | Título |
|---|---|---|
| S | ≥ 55% | Gestor Humanitário Exemplar |
| A | ≥ 40% | Coordenador Dedicado |
| B | ≥ 28% | Gestor em Desenvolvimento |
| C | ≥ 18% | Atuação Insuficiente |
| D | < 18% | Sistema em Colapso |

Assim, quem pontua muito mas com conduta baixa recebe no máximo 55% do aproveitamento dos pontos.

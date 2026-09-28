# Sprint 1 · Burndown

> Parte do [fechamento da Sprint 1](README.md). Tabelas de origem e leitura do burndown.

![Burndown da Sprint 1](burndown.svg)

## 9. Burndown da Sprint 1

### 9.1 Tabela de issues com datas (fonte do burndown)

| # | Criada | Fechada | Dias em aberto |
|---|---|---|---|
| #2 | 2026-08-31 | 2026-09-01 | 1 |
| #3 | 2026-09-01 | 2026-09-07 | 6 |
| #4 | 2026-09-01 | 2026-09-07 | 6 |
| #5 | 2026-09-01 | 2026-09-01 | 0 |
| #6 | 2026-09-01 | 2026-09-14 | 13 |
| #7 | 2026-09-01 | 2026-09-07 | 6 |
| #8 | 2026-09-01 | 2026-09-01 | 0 |
| #9 | 2026-09-01 | 2026-09-02 | 1 |
| #10 | 2026-09-01 | 2026-09-01 | 0 |
| #11 | 2026-09-01 | 2026-09-07 | 6 |
| #12 | 2026-09-01 | 2026-09-08 | 7 |
| #13 | 2026-09-01 | 2026-09-07 | 6 |
| #14 | 2026-09-01 | 2026-09-08 | 7 |
| #15 | 2026-09-01 | 2026-09-08 | 7 |
| #16 | 2026-09-01 | *(aberta)* | 13+ |
| #17 | 2026-09-01 | 2026-09-14 | 13 |
| #18 | 2026-09-01 | *(aberta)* | 13+ |
| #19 | 2026-09-01 | *(aberta)* | 13+ |
| #23 | 2026-09-01 | *(aberta)* | 13+ |
| #24 | 2026-09-01 | *(aberta)* | 13+ |
| #38 | 2026-09-12 | 2026-09-12 | 0 |
| #40 | 2026-09-12 | 2026-09-12 | 0 |
| #42 | 2026-09-14 | *(aberta)* | 0+ |

### 9.2 Série do burndown (data → issues abertas restantes)

Calculada a partir da tabela acima. "Criadas até" mostra o escopo acumulado; "abertas" é a linha do burndown.

| Data | Criadas até a data | **Abertas (restantes)** | Fechadas acumuladas |
|---|---|---|---|
| 2026-08-31 | 1 | **1** | 0 |
| 2026-09-01 | 20 | **16** | 4 |
| 2026-09-02 | 20 | **15** | 5 |
| 2026-09-03 | 20 | **15** | 5 |
| 2026-09-04 | 20 | **15** | 5 |
| 2026-09-05 | 20 | **15** | 5 |
| 2026-09-06 | 20 | **15** | 5 |
| 2026-09-07 | 20 | **10** | 10 |
| 2026-09-08 | 20 | **7** | 13 |
| 2026-09-09 | 20 | **7** | 13 |
| 2026-09-10 | 20 | **7** | 13 |
| 2026-09-11 | 20 | **7** | 13 |
| 2026-09-12 | 22 | **7** | 15 |
| 2026-09-13 | 22 | **7** | 15 |
| 2026-09-14 | 23 | **6** | 17 |

### 9.3 Leitura do burndown

- **10/08 a 30/08:** período sem issues abertas no board. A Sprint 1 começou oficialmente em 10/08, mas o backlog só foi estruturado em 31/08 (issue #2), com o grosso das issues (#3-#24) criado em 01/09. O trabalho anterior a isso existiu no repositório (commits de 26/08 e 29/08 de `frevisto`), mas não estava rastreado por issue.
- **01/09:** pico de escopo — 20 issues criadas e 4 já fechadas no mesmo dia (#5 Backend base, #8 Arquitetura, #10 Convenções de Git, e #2).
- **02/09 a 06/09:** platô de 15 issues abertas. Trabalho em andamento (Motor de Decisão, Evolution API, modelo LLM), sem fechamentos — fase de implementação longa.
- **07/09:** maior queda da sprint, de 15 para 10 abertas (fecharam #3, #4, #7, #11, #13). Foi o dia de maior volume de merges.
- **08/09:** nova queda para 7 abertas (#12, #14, #15).
- **09/09 a 13/09:** platô de 7 abertas. Dois bugs (#38, #40) foram abertos e fechados no mesmo dia 12/09, sem alterar o saldo.
- **14/09 (último dia da sprint):** fecha em **6 abertas**, com #6 e #17 fechadas e #42 (bug externo) aberta.

**Padrão observado:** o burndown é escalonado, não linear — o trabalho se concentrou em dois dias de fechamento em massa (07/09 e 08/09) e num empurrão final no último dia (14/09). Isso indica lotes grandes de trabalho sendo concluídos de uma vez, e não entrega contínua.

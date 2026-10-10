# Sprint 2 · Burndown

> Parte do [acompanhamento da Sprint 2](README.md). Dados até **10/10/2026**; a sprint termina em 19/10.

![Burndown da Sprint 2](burndown.svg)

## 1. Issues da sprint com datas (fonte do burndown)

Datas no fuso de Brasília. As 17 issues novas foram criadas em 28/09; a #16 veio da Sprint 1 e recebeu a label `SPRINT 2` em 28/09.

| # | Tamanho | Entrou na sprint | Fechada | Status no board |
|---|---|---|---|---|
| #16 | M | 28/09 | *(aberta)* | Ready |
| #50 | P | 28/09 | 28/09 | Done |
| #51 | M | 28/09 | 10/10 | Done |
| #52 | G | 28/09 | 28/09 | Done |
| #53 | M | 28/09 | 09/10 | Done |
| #54 | M | 28/09 | *(aberta)* | Ready |
| #55 | G | 28/09 | *(aberta)* | Ready (reprovada) |
| #56 | G | 28/09 | *(aberta)* | Ready (reprovada) |
| #57 | M | 28/09 | *(aberta)* | Ready |
| #58 | M | 28/09 | 28/09 | Done |
| #60 | M | 28/09 | *(aberta)* | Ready (reprovada) |
| #61 | P | 28/09 | 28/09 | Done |
| #81 | M | 28/09 | 10/10 | Done |
| #82 | P | 28/09 | 10/10 | Done |
| #83 | M | 28/09 | *(aberta)* | Ready |
| #84 | P | 28/09 | *(aberta)* | Ready |
| #85 | M | 28/09 | *(aberta)* | Ready |
| #86 | M | 28/09 | *(aberta)* | Ready |

## 2. Série do burndown (data → issues abertas restantes)

A linha ideal vai de 18 em 28/09 a 0 em 19/10 (21 dias, cerca de 0,86 issue por dia).

| Data | Fechadas no dia | **Abertas (restantes)** | Ideal | Diferença |
|---|---|---|---|---|
| 28/09 | 4 (#50, #52, #58, #61) | **14** | 18,0 | 4 à frente |
| 29/09 | 0 | **14** | 17,1 | 3 à frente |
| 30/09 | 0 | **14** | 16,3 | 2 à frente |
| 01/10 | 0 | **14** | 15,4 | 1 à frente |
| 02/10 | 0 | **14** | 14,6 | em dia |
| 03/10 | 0 | **14** | 13,7 | em dia |
| 04/10 | 0 | **14** | 12,9 | 1 atrás |
| 05/10 | 0 | **14** | 12,0 | 2 atrás |
| 06/10 | 0 | **14** | 11,1 | 3 atrás |
| 07/10 | 0 | **14** | 10,3 | 4 atrás |
| 08/10 | 0 | **14** | 9,4 | 5 atrás |
| 09/10 | 1 (#53) | **13** | 8,6 | 4 atrás |
| 10/10 | 3 (#51, #81, #82) | **10** | 7,7 | 2 atrás |

## 3. Leitura do burndown

- **15/09 a 27/09:** a sprint começou oficialmente em 15/09, mas o backlog só foi criado em 28/09. Esses 13 dias não aparecem no gráfico.
- **28/09:** backlog de 18 issues criado e 4 fechadas no mesmo dia (migrations, seed, estrutura do frontend e CI). A sprint começou à frente da linha ideal.
- **29/09 a 08/10:** platô de 10 dias em 14 abertas, sem nenhum fechamento. A #53 (WhatsApp Cloud API) estava em andamento desde 02/10, e #16 e #57, já desbloqueadas, não foram iniciadas. Nesse período a sprint passou de 4 issues à frente para 5 atrás.
- **09/10 e 10/10:** 4 fechamentos em dois dias (#53, #51, #82, #81) reduziram o atraso para cerca de 2 issues.

**Padrão observado:** igual à Sprint 1, o burndown é em degraus, com fechamentos concentrados em poucos dias e um platô longo no meio. Para zerar até 19/10 é preciso fechar cerca de 1,1 issue por dia daqui em diante. Hoje nenhuma das 10 abertas está em andamento, e 8 delas dependem da #16 ou da #57.

# Sprint 3 — ProconChat Jacareí

> Fechamento da Sprint 3 do projeto ABP do 6º DSM (Fatec Jacareí, 2026-2), em parceria com o PROCON de Jacareí-SP.
> Período da Sprint 3 conforme cronograma oficial: **20/10/2026 a 23/11/2026**.
> Repositório: `Steel-Hard/ProconChat_Jacarei` · branch de integração: `develop` · board: GitHub Project #2 da org `Steel-Hard`.
> Retrato de **22/11/2026**, dia em que a lista de issues com a etiqueta `SPRINT 3` foi conferida no GitHub. A entrega final (Review Meeting) é em 23/11/2026.

---

## Arquivos

| Arquivo | Conteúdo |
|---|---|
| [README.md](README.md) | Placar, tarefas concluídas com datas, tarefas em aberto, itens fora da sprint e riscos |

**Burndown: pendente.** Não há registro de quando cada issue foi para "In progress" no board, e quase todas têm a etiqueta `SPRINT 3` desde a criação (28/09 e 19/10). Sem esses dados, uma curva diária seria inventada, então o gráfico não foi gerado.

---

## 1. Placar em 22/11

| Item | Valor |
|---|---|
| Issues com a etiqueta `SPRINT 3` | **27** |
| Concluídas com entrega | **22** |
| Fechadas sem entrega própria | **2 unificadas** (#122 na #121 e #120 na #118), **1 de validação sem roteiro nem resultado no GitHub** (#121) e **1 de organização, sem código** (#159, Feira de Projetos) |
| Em aberto | **1** (#70, a issue de fechamento, aberta neste retrato) |

27 = 22 concluídas com entrega + #121 + #159 + #122 + #120 + #70.

Por tamanho (o tamanho declarado no corpo de cada issue, nas 22 concluídas com entrega):

| Tamanho | Concluídas |
|---|---|
| P | 6 (#65, #68, #69, #87, #127, #129) |
| M | 16 (#18, #59, #62, #63, #64, #66, #67, #88, #118, #119, #123, #124, #125, #126, #128, #164) |

Entradas no meio da sprint:

- **#159** (Feira de Projetos): etiqueta `SPRINT 3` em 17/11.
- **#164** (interruptor do aviso de cancelamento): criada e etiquetada em 18/11.
- **#18** (teste ponta a ponta): veio da Sprint 1 (criada em 01/09) e recebeu a etiqueta `SPRINT 3` em 28/09, junto com as demais; foi concluída em 22/11.

---

## 2. Tarefas concluídas

Horários no fuso de Brasília. **Início** é o primeiro commit com `[#N]` na `develop` (o histórico de status do board não registra "In progress"), e o trabalho real pode ter começado antes. **Fim** é o fechamento da issue. As colunas de responsável vêm do campo de responsáveis da issue.

| # | Tarefa | Tamanho | Responsável | Início | Fim | PR |
|---|---|---|---|---|---|---|
| #62 | Backend: contas de funcionários e permissões granulares | M | felipe-sant | 20/10 19:54 | 22/10 15:29 | #130 |
| #87 | Backend: atribuir, corrigir registro, observações e calendário semanal | P | felipe-sant | 22/10 15:41 | 22/10 23:49 | #132 |
| #123 | Frontend: tela de Usuários | M | felipe-sant | 23/10 00:12 | 24/10 12:02 | #133 |
| #64 | Backend: API de Horários de atendimento e cálculo de vagas | M | Nickaqui | 22/10 23:16 | 24/10 15:20 | #131 |
| #125 | Frontend: tela de Horários de atendimento | M | felipe-sant | 24/10 16:39 | 24/10 21:51 | #135, #136 |
| #67 | Backend: cancelamento pela equipe, aviso ao cidadão e modelos da Meta | M | felipe-sant | 31/10 20:29 | 31/10 22:42 | #141 |
| #59 | Bot: retorno de quem já tem agendamento (remarcar e cancelar) | M | felipe-sant | 01/11 11:19 | 01/11 13:17 | #142 |
| #88 | Backend e Gateway: estado do número, falhas de entrega e histórico de alterações | M | felipe-sant | 01/11 15:48 | 01/11 18:55 | #143, #144 |
| #69 | LGPD: política de privacidade, retenção e pedidos do titular | P | felipe-sant | 01/11 19:53 | 02/11 12:12 | #145 |
| #66 | Complemento por IA no fluxo, com identificação | M | felipe-sant | 02/11 12:48 | 02/11 14:56 | #146, #147, #148, #149 |
| #63 | Backend: API de Conteúdo do chatbot | M | Nickaqui | 27/10 20:21 | 05/11 19:16 | #138 |
| #68 | Backend: consultas de Relatórios mínimos | P | Nickaqui | 26/10 20:59 | 05/11 23:20 | #137 |
| #129 | Frontend: estado do número, falhas de entrega e histórico na tela de WhatsApp | P | frevisto | 04/11 19:58 | 06/11 12:50 | #150 |
| #65 | Tela de Documentos para atendimento presencial | P | felipe-sant, claudsaints | 17/11 11:28 | 17/11 17:32 | #151, #160 |
| #126 | Frontend: calendário semanal, atribuir, corrigir registro e observações | M | felipe-sant, claudsaints | 15/11 16:33 | 17/11 19:19 | #155, #161 |
| #127 | Frontend: cancelar agendamento e modelos de mensagem na tela de WhatsApp | P | felipe-sant, claudsaints | 17/11 21:11 | 17/11 23:04 | #154, #163 |
| #164 | Interruptor para ligar e desligar o aviso de cancelamento ao cidadão | M | felipe-sant | 17/11 23:06 | 18/11 08:25 | #165 |
| #128 | Frontend: tela de Relatórios mínimos | M | claudsaints | 18/11 10:08 | 18/11 11:29 | #157 |
| #118 | Guias em PDF: configurar o bot (passagem para o PROCON) e documento do software | M | felipe-sant | 20/11 22:00 | 20/11 23:34 | #171 |
| #124 | Frontend: tela de Conteúdo do chatbot | M | felipe-sant | 20/11 23:45 | 21/11 14:40 | #172 |
| #119 | Manual em PDF das telas do painel | M | felipe-sant | 21/11 15:38 | 21/11 18:30 | #175 |
| #18 | Teste end-to-end do fluxo principal | M | felipe-sant | 22/11 16:01 | 22/11 16:58 | #177 |

> O PR de cada issue foi identificado pelo número `[#N]` no título e, nos PR sem esse número (#136, #151, #154, #155 e #157), pelo conteúdo. Alguns PR são correções da mesma issue (#144, #149, #160, #161, #163).

### Fechadas sem entrega própria

| # | Tarefa | Situação |
|---|---|---|
| #121 | Validação com usuários: teste de usabilidade e confirmação dos fluxos decisórios | Fechada em 16/11 como concluída. O único comentário na issue é "EM PROGRESSO", sem roteiro nem resultado. Segundo o registro do usuário em 22/11/2026, o professor aceitou e recomendou o fluxo atual, com botões, e o PROCON validou e aprovou o fluxo antes do desenvolvimento |
| #122 | Confirmar com professor e PROCON a interpretação de fluxos decisórios | Unificada na #121 (fechada em 19/10 como não planejada) |
| #120 | Documento em PDF do software: visão geral, requisitos e instalação | Unificada na #118 (fechada em 19/10 como não planejada); o documento do software saiu na #118 |
| #159 | Feira de Projetos: o que precisamos entregar e organizar até 19/11 | Organização da Feira, sem código; fechada em 21/11 |

### Fora da sprint

Issues sem a etiqueta `SPRINT 3`, a maioria com a etiqueta `Extra`, tratadas durante o período:

| # | Tarefa | Situação |
|---|---|---|
| #134 | Agendar mudança dos horários de atendimento para valer a partir de uma data | Concluída (PR #139, 31/10) |
| #74 | Lembrete ao cidadão antes do atendimento | Concluída (PR #156, 21/11) |
| #75 | Modal de conflitos ao alterar a agenda | Concluída (PR #169, 22/11) |
| #77 | Bloqueio de parte do dia na agenda | Concluída (PR #176, 22/11) |
| #78 | Marcadores de horário e endereço nas respostas | Concluída (PR #173, 22/11) |
| #71 | Dashboard | Descartado por decisão do grupo |
| #72 | Tela de Sessões | Descartada por decisão do grupo (PR #168 fechado sem merge) |
| #73 | Relatórios completos e exportação PDF/Excel/CSV | Não entregue: a exportação e os gráficos extras ficam como bônus. Os relatórios mínimos saíram nas #68 e #128 |
| #76 | Outras conversas do mesmo número | Não entregue (fechada como não planejada) |

---

## 3. Tarefas em aberto

- **#70** Documentação final: README, arquitetura, rastreabilidade e fechamento da Sprint 3. É a issue que gera este documento.
- Nenhuma issue de lacuna foi aberta: a conferência da rastreabilidade não deixou requisito parcial ([rastreabilidade](../../desafio/rastreabilidade.md)).

---

## 4. Riscos e o que ficou de fora

1. **Telas descartadas:** Dashboard (#71) e Sessões (#72) foram descartados por decisão do grupo, e a tela inicial leva a Agendamentos.
2. **Exportação de relatórios não entregue:** a exportação em PDF, Excel e CSV e os gráficos extras são bônus da #73 e nunca foram pedidos; os relatórios mínimos (#68, #128) cumprem o RF06.
3. **Fechamentos concentrados no fim:** 9 das 22 entregas fecharam entre 17/11 e 22/11, incluindo os PDFs, a tela de Conteúdo e o teste ponta a ponta.
4. **Concentração:** das 22 entregas, 14 têm só felipe-sant como responsável, 3 só Nickaqui (#63, #64, #68), 1 só frevisto (#129), 1 só claudsaints (#128) e 3 dividem felipe-sant e claudsaints (#65, #126, #127).
5. **Divergências entre as regras e o painel** estão em tratamento na #174.
6. **Início tardio de itens de documentação:** os guias em PDF e o teste ponta a ponta começaram nos últimos três dias.

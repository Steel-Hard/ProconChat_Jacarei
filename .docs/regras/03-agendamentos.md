# Agendamentos

## Para que serve

Ver e organizar os atendimentos presenciais que o chatbot marcou, e encontrar o agendamento de quem chega ao balcão.

## Quem acessa

**Ver agendamentos.** As ações de gerenciar (ex.: "Assumir") só aparecem para quem tem **Gerenciar agendamentos**.

## Como um agendamento nasce e muda

Ver [decisão 006](../decisoes/006-ciclo-de-vida-do-agendamento.md).

| Status | Significa |
|---|---|
| **Pendente** | O chatbot criou o agendamento. Ninguém assumiu ainda |
| **Confirmado** | Um funcionário assumiu, ou foi atribuído a alguém |
| **Atendido** | O cidadão foi atendido |
| **Não compareceu** | O horário passou e o cidadão não veio |
| **Cancelado** | Cancelado pelo cidadão, no chatbot, ou pela equipe, no painel |

- **Quem cria agendamentos é sempre o chatbot.** O painel não cria.
- **Remarcar é só pelo cidadão**, no chatbot. O painel não muda a data de um agendamento.

## O que a tela mostra

### Busca

Campo "Nome do titular, protocolo ou CPF completo":

- **nome:** a partir de 2 letras, sem diferenciar acentos nem maiúsculas;
- **protocolo:** a partir de 2 caracteres, pelo começo do protocolo;
- **CPF:** só com os **11 dígitos**. O sistema compara o CPF digitado com o guardado sem nunca exibi-lo. Com menos de 11 dígitos, a tela avisa "Para buscar por CPF, digite os 11 dígitos".

A busca procura **em todos os períodos, status e responsáveis**, ignorando os filtros. Com um único resultado, **Enter abre o agendamento**. **Esc limpa a busca.** O uso típico é na recepção, quando o cidadão chega.

### Filtros

- **Status**, em chips com contagem: Todos, Pendentes, Confirmados, Atendidos, Não compareceu, Cancelados, e o chip **Aguardando registro** (confirmados cujo horário já passou sem registro), em destaque.
- **Período** (só na lista): Todos, Hoje, Esta semana, **Próximos (padrão)** e Anteriores a hoje.
- **Responsável:** Todos, Sem responsável, Atribuídos a mim, ou um funcionário específico.

### Lista

Colunas: protocolo, titular (com CPF mascarado), categoria e pergunta de origem, data e hora, representante (Sim/Não), responsável ("Sem responsável" em destaque) e status. Na linha de um pendente aparece **"Assumir"** para quem gerencia agendamentos.

- **20 por página**, com "Anterior" e "Próxima".
- **Agendamentos mantidos fora da grade** após uma mudança de horários mostram o selo "Fora da grade atual".

**Ordenação:**

- Os títulos **Titular, Data e hora, Responsável e Status** são clicáveis: o primeiro clique ordena de forma crescente, o segundo de forma decrescente, com uma seta (▲/▼). Em telas estreitas, isso vira o seletor "Ordenar por".
- Sem escolha do usuário, a ordem padrão segue a precedência do chip de status sobre o período (o chip de status manda; o período "Todos" não o anula):

  | Filtro / Chip ativo | Ordem padrão |
  |---|---|
  | Pendentes, Confirmados, Aguardando registro (mesmo com período Todos), ou períodos Hoje, Esta semana, Próximos (sem chip de status terminal) | Mais próximo primeiro (ASC) |
  | Atendidos, Não compareceu, Cancelados (mesmo com período Todos), ou período Anteriores a hoje | Mais recente primeiro (DESC) |
  | Chip de status Todos (ou sem chip) com período Todos, e resultados de busca | Ordem mista: os próximos primeiro (mais próximo no topo), depois os passados (mais recente primeiro) |

- O chip de status tem precedência sobre o período selecionado: com o período Todos, Cancelados, Atendidos e Não compareceu saem do mais recente para o mais antigo; Pendentes, Confirmados e Aguardando registro saem do mais próximo para o mais distante. A ordem mista só é aplicada quando o chip "Todos" estiver ativo ou durante uma busca.
- Empates são desfeitos por data e hora. Na ordenação crescente por responsável, "Sem responsável" vem primeiro.
- Mudar filtro, busca ou período volta a ordenação ao padrão e a lista à página 1.

### Calendário semanal

- Mostra **só os dias e horários configurados** em Horários de atendimento.
- Cada horário mostra os agendamentos (protocolo e nome curto, na cor do status).
- **"N vagas livres"** aparece **só** onde o chatbot realmente pode oferecer o horário: dentro da janela, depois da antecedência mínima, fora de bloqueios e não no passado.
- Datas bloqueadas aparecem marcadas.
- Navegação: semana anterior, próxima, "Esta semana".

## O que dá para fazer

| Ação | Quem | Regra |
|---|---|---|
| Buscar, filtrar, ordenar, abrir o detalhe | Ver agendamentos | — |
| **Assumir** um pendente direto da lista | Gerenciar agendamentos | O agendamento vai para Confirmado com a pessoa como responsável |

As demais ações ficam no [Detalhe do agendamento](04-detalhe-do-agendamento.md).

## O que não existe de propósito

| O que não existe | Por quê |
|---|---|
| Criar agendamento pelo painel | O RF07 pede que o chatbot agende. Isso garante que todo agendamento tem origem, motivo e documentos enviados |
| Remarcar pelo painel | Só o cidadão pode, porque só ele sabe a nova data em que pode comparecer. O painel não conseguiria avisá-lo da nova data de forma confiável |
| Coluna de telefone | O telefone nunca aparece no painel ([decisão 002](../decisoes/002-lgpd-dados-pessoais.md)) |
| Conferir o CPF no balcão | Avaliado e descartado pelo grupo. A busca pelo CPF completo cumpre o papel de achar o agendamento |

## Relações

- [Detalhe do agendamento](04-detalhe-do-agendamento.md): todas as ações sobre um agendamento.
- [Horários de atendimento](08-horarios-de-atendimento.md): define dias, horários e vagas do calendário.

## Estado da tela

- **Lista:** construída pela #85 (busca, chips, filtros de Período e Responsável, ordenação, paginação e "Assumir"). O filtro por um funcionário específico em "Responsável" espera a lista de funcionários da #62.
- **Calendário semanal:** ainda não existe; fica com a #87. Até lá, o botão "Lista / Calendário semanal" não aparece.

# 007 — Agenda de atendimento configurável

- **Status:** Aceita
- **Data:** 26 e 27/09/2026
- **Requisitos:** RF07, RF08

## Contexto

Para o chatbot agendar sozinho (RF07), ele precisa saber quais horários existem. O time não conhece a operação do PROCON em detalhe, então tudo que depende dela precisa ser configurável pela própria equipe.

## Decisão

1. **A disponibilidade é da unidade, não de cada funcionário.** O responsável é definido depois, quando alguém assume o agendamento ([006](006-ciclo-de-vida-do-agendamento.md)).
2. **O que é configurável (tela Horários de atendimento):**
   - grade semanal: dias de atendimento e até 3 faixas de horário por dia;
   - duração de cada atendimento e número de vagas simultâneas por horário;
   - **janela de agendamento**: até quantos dias à frente o chatbot oferece horários;
   - **antecedência mínima**, em "dias úteis", que aqui significa **dias com atendimento configurado e não bloqueados**;
   - **limite de espera para alerta**: o Dashboard avisa quando o próximo horário livre passa desse prazo;

     > **Estado em 2026-11-22:** a tela de Dashboard foi descartada pelo grupo e não existe no painel, então nenhuma tela avisa a partir desse prazo. Ele continua salvo na tela de Horários, onde o campo diz "Prazo de espera considerado longo para o próximo horário livre." Ver a [decisão 013](013-telas-de-sessoes-e-dashboard-descartadas.md).

   - **datas bloqueadas**, do dia inteiro ou de um período;
   - **dados da unidade** (endereço e complemento), usados nas mensagens;
   - **lembrete** (liga/desliga e quantas horas antes).
3. **"Agenda lotada" é definido pela janela:** não haver nenhum horário livre dentro dela. Nesse caso, o chatbot informa ao cidadão que não há horários disponíveis no momento.
4. **Validações das faixas:** fim depois do início, sem sobreposição no mesmo dia, e comportando pelo menos um atendimento com a duração configurada.
5. **Mudanças que afetam agendamentos já existentes** (data bloqueada, faixa removida, duração alterada, vagas reduzidas) abrem, ao salvar, a lista dos agendamentos afetados com duas opções:
   - **manter**: continuam válidos, com o selo "Fora da grade atual";
   - **cancelar e avisar os cidadãos**, com o motivo "Unidade fechada nesta data" ou "Outro motivo".
6. **Todas as alterações ficam pendentes até "Salvar"**, com "Descartar" e o registro de quem alterou e quando. Esse padrão vale para todas as telas de configuração.
7. **Marcadores de horário e endereço no Conteúdo (#78):** para evitar que respostas como "Qual é o horário e o endereço do PROCON?" fiquem desatualizadas quando a agenda mudar, o texto da resposta aceita os marcadores `{endereco}` e `{horarios}`, preenchidos pelo sistema no envio e na prévia de Conteúdo com os valores da configuração vigente hoje. A tela de Horários mantém o aviso para revisar perguntas que ainda citem essas informações em texto fixo.

## Consequências

- Novas tabelas ou colunas de configuração para grade, bloqueios, janela, lembrete e dados da unidade.
- A verificação de conflitos precisa rodar **no servidor** ao salvar.
- O cancelamento em massa reaproveita o envio de avisos de [005](005-mensagens-ao-cidadao.md).
- A configuração continua única por data, mas pode ter versões com data de início: a [decisão 012](012-horarios-agendados.md) complementa esta com as mudanças de horários agendadas.

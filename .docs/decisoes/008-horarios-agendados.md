# 008 — Mudanças de horários com data de início

- **Status:** Aceita
- **Data:** 27/10/2026
- **Requisitos:** Issue #134

## Contexto

A ADR 007 descreve uma configuração única para a agenda. Alterá-la hoje pode
invalidar agendamentos que já foram feitos para datas futuras, mesmo quando a
equipe pretende mudar os horários somente a partir de uma data posterior.

## Decisão

1. A configuração existente em `ScheduleSettings`, `ScheduleRanges` e
   `BlockedDates` continua sendo a configuração-base, preservando instalações
   e seeds atuais.
2. Cada mudança agendada é um snapshot integral da configuração, guardado em
   `ScheduleChanges` com uma `effective_from` única, data local inclusiva,
   autor e horário da última alteração.
3. Para uma data de atendimento, vale o snapshot com a maior
   `effective_from` menor ou igual à data. Se não houver snapshot aplicável,
   vale a configuração-base.
4. Uma mudança agendada afeta somente agendamentos na sua vigência: da data de
   início até o dia anterior à próxima mudança. Agendamentos anteriores não
   são conflitos; conflitos dentro da vigência continuam bloqueando a gravação.
5. Uma mudança pode ser editada ou cancelada somente antes da sua data de início.
   Ao salvar uma configuração para hoje, ela passa a valer imediatamente e não
   remove mudanças futuras já agendadas.
6. A prévia, a oferta de horários e a revalidação da reserva usam a configuração
   efetiva para cada data. A reserva continua revalidada dentro da transação do
   banco para evitar corrida com uma alteração de agenda.

## Consequências

- A tela de Horários precisa identificar a configuração vigente, permitir
  escolher uma data de início e listar/editar/cancelar mudanças futuras.
- A prévia mensal precisa resolver a configuração por dia.
- O backend deve validar conflitos somente na vigência afetada, sem relaxar as
  validações para a grade ativa nessa data.
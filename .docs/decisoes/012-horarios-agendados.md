# 012 — Mudanças de horários com data de início

- **Status:** Aceita
- **Data:** 27/10/2026, revista em 31/10/2026
- **Requisitos:** Issue #134 (relacionada a RF07 e RF08 pela decisão 007)

## Contexto

A decisão 007 descreve uma configuração única para a agenda. Alterá-la hoje pode
invalidar agendamentos que já foram feitos para datas futuras, mesmo quando a
equipe pretende mudar os horários somente a partir de uma data posterior.

## Decisão

1. A configuração existente em `ScheduleSettings`, `ScheduleRanges` e
   `BlockedDates` continua sendo a configuração-base, preservando instalações
   e seeds atuais.
2. Cada mudança agendada é uma cópia integral da configuração (grade, duração,
   vagas, janela, antecedência, alerta de espera, endereço, lembrete e datas
   bloqueadas), guardada em `ScheduleChanges` com uma `effective_from` única,
   data local inclusiva, autor e horário da última alteração.
3. Para uma data de atendimento, vale a cópia com a maior `effective_from`
   menor ou igual à data. Se não houver cópia aplicável, vale a
   configuração-base.
4. Uma mudança agendada afeta somente agendamentos na sua vigência: da data de
   início até o dia anterior à próxima mudança. Agendamentos anteriores não
   são conflitos; conflitos dentro da vigência continuam recusando a gravação
   e o cancelamento (`409 SCHEDULE_CONFLICTS`). A prévia salva aponta, para
   cada versão, os agendamentos da própria vigência que ela não comporta.
5. Uma mudança pode ser editada ou cancelada somente antes da sua data de
   início. O cancelamento apaga a linha de `ScheduleChanges`, sem trilha de
   quem cancelou: a configuração da agenda já é regravada a cada salvamento, e
   a regra "nada é excluído" vale para conteúdo, contas, observações e
   agendamentos.
6. Salvar "a configuração de hoje" quando a versão vigente é uma mudança que já
   começou grava uma cópia nova com `effective_from` igual a hoje (ou substitui
   a de hoje, se ela já existir). A cópia que começou antes fica intacta. Se a
   versão vigente for a configuração-base, ela é atualizada como antes.
   Salvar a configuração de hoje não remove mudanças futuras.
7. Como cada versão tem cópia própria das datas bloqueadas, um bloqueio novo só
   é aceito dentro da vigência da versão salva. Um bloqueio novo com data de
   hoje em diante e fora dela é recusado com `400` no campo
   (`blockedDates.N.date`): "Esta data segue a mudança de dd/mm. Bloqueie lá."
   ou, antes do início de uma mudança, "Esta data vem antes do início desta
   mudança (dd/mm). Bloqueie na configuração que vale nessa data." Bloqueios
   que já estavam na cópia de referência (a própria versão, ou a versão
   copiada ao criar a mudança) continuam aceitos. A checagem roda dentro da
   transação do salvamento, depois da trava `schedule_config`, para enxergar
   uma mudança gravada por outro salvamento concorrente. A tela avisa que as
   mudanças agendadas têm cópia própria dos horários, das datas bloqueadas e
   do endereço.
8. Janela de agendamento, antecedência mínima e alerta de espera vêm da versão
   vigente **hoje**, porque descrevem o momento da oferta. Grade, duração,
   vagas, datas bloqueadas e endereço vêm da versão de cada dia. Os dias úteis
   da antecedência são contados com a grade de cada dia.
9. A prévia, a oferta de horários e a revalidação da reserva usam a versão de
   cada data. A reserva continua revalidada dentro da transação do banco, com
   a trava consultiva `schedule_config` compartilhada; salvar e cancelar uma
   mudança pegam a mesma trava exclusiva, como o `PUT /api/v1/schedule`.
10. A checagem de responsável com outro agendamento sobreposto (assumir,
    atribuir, corrigir registro) usa a duração da versão vigente na data do
    agendamento. O lote de contas (`PATCH /api/v1/users`) ainda usa a duração
    da versão vigente hoje para todos os agendamentos do lote; a correção por
    agendamento fica para uma issue própria.

## Consequências

- A tela de Horários identifica a configuração vigente (com "Valendo desde
  dd/mm/aaaa" quando ela é uma mudança já iniciada), permite escolher uma data
  de início, lista as mudanças futuras e permite editar e cancelar cada uma,
  com diálogo de confirmação.
- A prévia mensal resolve a versão por dia.
- O backend valida conflitos somente na vigência afetada, sem relaxar as
  validações para a grade ativa nessa data.
- Dívida: a cópia em `ScheduleChanges.config` não tem versão de formato. Se o
  formato de `ScheduleConfigInput` mudar (por exemplo, com o bloqueio de parte
  do dia da #77), cópias antigas podem ficar sem campos e vão precisar de
  migração de dados.

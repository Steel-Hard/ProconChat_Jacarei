# 006 — Ciclo de vida do agendamento

- **Status:** Aceita
- **Data:** 26 e 27/09/2026
- **Requisitos:** RF07, RF08

## Contexto

O RF07 pede que o chatbot agende um atendimento presencial quando a resposta não resolve a dúvida, e o RF08 pede uma interface para gerenciar esses agendamentos. O schema da Sprint 1 tinha só `SCHEDULED`, `CANCELED` e `ATTENDED`, além de uma coluna `professional` (advogado/atendente).

## Decisão

### Estados

```
Pendente ──assumir/atribuir──▶ Confirmado ──▶ Atendido
    │                              │      └──▶ Não compareceu
    └──────────────┬───────────────┘
                   ▼
               Cancelado
```

1. **Quem cria o agendamento é sempre o chatbot**, como **Pendente** e sem responsável, num horário livre da agenda ([007](007-agenda-configuravel.md)). O painel não cria agendamentos.
2. **Um funcionário assume o agendamento**, ou atribui a outro, e ele passa a **Confirmado**. Só podem ser responsáveis contas ativas com "Gerenciar agendamentos".
3. **"Marcar como atendido" só existe a partir do dia do atendimento.** Num pendente, marcar como atendido **assume automaticamente** para quem clicou.
4. **"Não compareceu" só existe depois do horário.**
5. **"Corrigir registro"** desfaz um Atendido ou um Não compareceu e volta ao **estado anterior**: Pendente, se não havia responsável; Confirmado, se havia.
6. **Cancelar:**
   - pelo cidadão, no chatbot, a qualquer momento;
   - pela equipe, só **antes** do horário, com motivo obrigatório e aviso ao cidadão ([005](005-mensagens-ao-cidadao.md)).

   Cancelado é definitivo: para voltar, o cidadão agenda de novo.
7. **Remarcar é só pelo cidadão, no chatbot.** O protocolo continua o mesmo, o histórico registra "de X para Y" e, se estava Confirmado, **volta a Pendente sem responsável**, porque o responsável assumiu aquele dia e horário.
8. **A coluna `professional` sai.** A distinção advogado/atendente não é usada; o responsável é uma pessoa.

### Dados do agendamento

- **Nome e CPF são do titular.** O agendamento indica se **um representante comparece** em nome dele. Nesse caso, a lista de documentos é outra.
- **O motivo do agendamento é gravado na criação:** "a pergunta exige atendimento presencial" ou "o cidadão respondeu que a dúvida não foi resolvida".
- **A lista de documentos enviada ao cidadão é guardada no agendamento.** Mudanças posteriores na configuração não alteram agendamentos já criados.
- **Ligação com a sessão de origem** (`session_id`), para mostrar a linha do tempo da conversa.
- **O protocolo** é exibido como os 8 primeiros caracteres do `appointment_code`.

### Registros

- **Observações internas** ficam numa tabela própria (`AppointmentNotes`): autor, data e texto. Não podem ser editadas nem apagadas. A coluna `notes` atual sai.
- **Histórico de eventos** numa tabela própria: criado, assumido, atribuído, remarcado, lembrete enviado, aviso enviado ou com falha, cancelado, registrado, corrigido.
- **Agendamentos que ficaram fora da grade** por mudança de configuração, e foram mantidos, recebem o selo "Fora da grade atual" ([007](007-agenda-configuravel.md)).

## Consequências

- Migration do enum de status (novos `PENDING` e `NO_SHOW`) e das colunas `assigned_user_id`, `by_representative`, `reason`, `cpf_masked`, telefone criptografado, `session_id` e lista de documentos enviada.
- Novas tabelas de observações e de eventos do agendamento.
- **Descartado:** conferir o CPF no balcão pelo painel ([002](002-lgpd-dados-pessoais.md)).

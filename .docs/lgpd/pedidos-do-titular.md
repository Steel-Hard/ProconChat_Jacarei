# Pedidos do titular

Procedimento manual para atender os pedidos de acesso e de exclusão de dados pessoais feitos por cidadãos que usaram o ProconChat ([decisão 002](../decisoes/002-lgpd-dados-pessoais.md), issue #69). Não há ferramenta no painel para isso.

## Canal

O pedido chega pelo **e-mail de contato para pedidos do titular**, cadastrado pelo Admin na aba **Privacidade** da tela de WhatsApp ([regra da tela](../regras/11-whatsapp.md#privacidade)). Esse e-mail aparece na página pública `/privacidade`, nas seções "Seus direitos e como pedir" e "Contato". Se o e-mail não estiver cadastrado, a página mostra "Informação ainda não cadastrada": cadastre-o antes de divulgar a página.

## Identificação

Antes de mostrar ou apagar qualquer dado, confirme que quem pede é o titular (ou alguém com procuração dele):

- peça nome completo, CPF e o número de telefone usado no WhatsApp;
- confira o documento com foto (e a procuração, quando for um representante) por um canal oficial do PROCON, de preferência no atendimento presencial;
- nunca envie dados por e-mail a um endereço que não foi confirmado.

## Acesso (o que temos sobre a pessoa)

| Dado | Onde procurar | Quem procura |
|---|---|---|
| Agendamentos (nome, CPF mascarado, data, status, histórico) | Painel, tela **Agendamentos**, busca pelo **CPF com 11 dígitos** ([regra da tela](../regras/03-agendamentos.md)). O sistema compara o hash do CPF e nunca mostra o CPF completo | Quem tem a permissão de ver agendamentos |
| Conversas (passos percorridos, sem texto digitado) | Tabelas `Sessions` e `ConversationEvents`, pelo `phone_hash` | Equipe técnica |

O `phone_hash` é o HMAC-SHA256 do número com o `PHONE_HASH_SECRET` do servidor, sobre o número como o WhatsApp o informa (só dígitos, com o 55 e o DDD). A equipe técnica calcula o hash no servidor, sem registrar o número em log nem em arquivo, e consulta:

```sql
SELECT s.id, s.status, s.outcome, s.started_at, s.ended_at
FROM Sessions s
WHERE s.phone_hash = $1
ORDER BY s.started_at;

SELECT e.session_id, e.type, e.category_id, e.question_id, e.created_at
FROM ConversationEvents e
JOIN Sessions s ON s.id = e.session_id
WHERE s.phone_hash = $1
ORDER BY e.created_at;
```

O texto digitado pelo cidadão **não existe no sistema** e não entra na resposta. O telefone do agendamento é guardado criptografado e já foi apagado se o horário do atendimento passou.

## Exclusão (anonimização)

O pedido de exclusão é atendido por **anonimização**, feita pela equipe técnica com SQL **revisado por uma segunda pessoa** antes de rodar:

1. Encontre os agendamentos do titular pela busca por CPF no painel.
   Se algum ainda vai acontecer (Pendente ou Confirmado, com horário futuro), **cancele-o antes** pelo botão **"Cancelar agendamento"** no detalhe, escolhendo **"A pedido do cidadão"**. Confira a prévia da mensagem antes de confirmar. O horário volta a ficar livre e o cidadão recebe o aviso pelo WhatsApp. Se o aviso falhar, ou se o histórico não registrar o resultado do envio, use **"Tentar novamente"** no histórico quando o painel indicar que o reenvio está disponível. Confirme no histórico que aparece **"Cidadão avisado pelo WhatsApp"** antes de continuar; depois da anonimização não há mais telefone para reenviar. Um agendamento futuro ainda ativo não é anonimizado: se não for cancelado, o SQL abaixo o deixa de fora e ele continua com nome e CPF. Se o titular quiser ser atendido mesmo assim, deixe o agendamento acontecer e faça a anonimização depois do horário.
2. Encontre os ids das conversas do titular pelo `phone_hash` (seção Acesso). Só entram conversas já terminadas (`status <> 'IN_PROGRESS'`). A conversa que criou um agendamento futuro ainda ativo também fica de fora: sem o `phone_hash`, o cidadão não acharia mais o agendamento no bot e não conseguiria remarcar nem cancelar. Ela entra numa rodada posterior deste procedimento, depois que o horário do atendimento passar (ou pela anonimização automática por prazo).
3. Rode, numa transação, só sobre esses ids. As colunas são as mesmas da anonimização automática e precisam passar nas regras do banco (`chk_appointments_anonymized` e `chk_sessions_anonymized`):

```sql
BEGIN;
UPDATE Appointments
SET name = 'Titular removido', cpf_hash = NULL, cpf_masked = NULL, phone_encrypted = NULL, anonymized_at = now()
WHERE id = ANY($1::bigint[]) AND anonymized_at IS NULL
  AND (status NOT IN ('PENDING', 'CONFIRMED') OR appointment_datetime <= now());
UPDATE Sessions
SET phone_hash = NULL, anonymized_at = now()
WHERE id = ANY($2::bigint[]) AND anonymized_at IS NULL AND status <> 'IN_PROGRESS'
  AND NOT EXISTS (
    SELECT 1
    FROM Appointments a
    WHERE a.session_id = Sessions.id
      AND a.anonymized_at IS NULL
      AND a.status IN ('PENDING', 'CONFIRMED')
      AND a.appointment_datetime > now()
  );
COMMIT;
```

4. Confira no painel que os agendamentos mostram "Titular removido" e "CPF removido", e compare a contagem de linhas alteradas de cada `UPDATE` com o número de ids que você passou. Uma contagem menor tem dois motivos possíveis:
   - o id já estava anonimizado (`anonymized_at IS NULL` o deixa de fora), e não há nada a fazer;
   - no `UPDATE Appointments`, o agendamento ainda é futuro e ativo: cancele-o (passo 1) e rode de novo. No `UPDATE Sessions`, a conversa está em andamento ou criou um agendamento futuro ativo (passo 2): rode de novo depois que ela terminar ou que o horário do atendimento passar, ou deixe para a anonimização automática por prazo.

Limites da anonimização (diga isso na resposta ao titular):

- o **CPF** é removido (hash e versão mascarada) dos agendamentos anonimizados;
- as **observações internas** dos agendamentos (`AppointmentNotes`) não podem ser alteradas nem apagadas, por regra do banco. Elas são escritas pela equipe e não devem conter dados do cidadão;
- as **conversas** anonimizadas perdem o `phone_hash` e ficam só com os passos percorridos, sem texto digitado; elas alimentam os relatórios agregados. Uma conversa em andamento não pode ser anonimizada: espere ela terminar;
- as **cópias de segurança** guardam o estado anterior por até 7 dias ([deploy](../infra/deploy.md)), e depois são apagadas;
- além do pedido do titular, a **anonimização automática por prazo** (quando ligada na aba Privacidade) faz o mesmo com conversas e agendamentos que passaram do prazo ([decisão 002](../decisoes/002-lgpd-dados-pessoais.md#anonimização-por-prazo)).

## Prazo de resposta

Responda em até **15 dias**, contados do pedido, como prevê a LGPD (Lei 13.709/2018, art. 19, II) para a resposta completa. Se o PROCON adotar outro prazo, troque-o aqui.

## Registro

Guarde, fora do sistema e pelo canal oficial do PROCON, a data do pedido, a forma de identificação, o que foi feito e a data da resposta. Não registre o CPF completo nem o telefone nesse controle.

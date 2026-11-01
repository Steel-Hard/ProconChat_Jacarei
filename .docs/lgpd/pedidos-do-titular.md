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

1. Encontre os ids dos agendamentos do titular pela busca por CPF no painel (ou pelo `cpf_hash`, calculado com o `CPF_HASH_SECRET`).
2. Rode, numa transação, só sobre esses ids:

```sql
BEGIN;
UPDATE Appointments
SET name = 'Titular removido', phone_encrypted = NULL
WHERE id = ANY($1::bigint[]);
COMMIT;
```

3. Confira no painel que os agendamentos mostram "Titular removido".

Limites da anonimização (diga isso na resposta ao titular):

- o **CPF** continua guardado só como hash e na versão mascarada (`***.456.789-**`), que não permitem recuperar o número;
- as **observações internas** dos agendamentos (`AppointmentNotes`) não podem ser alteradas nem apagadas, por regra do banco. Elas são escritas pela equipe e não devem conter dados do cidadão;
- as **conversas** continuam ligadas só ao `phone_hash`, com os passos percorridos e sem texto digitado; elas alimentam os relatórios agregados;
- as **cópias de segurança** guardam o estado anterior por até 7 dias ([deploy](../infra/deploy.md)), e depois são apagadas;
- a exclusão ou anonimização automática por prazo ainda não existe (issue nova, ver a seção Retenção da decisão 002).

## Prazo de resposta

Responda em até **15 dias**, contados do pedido, como prevê a LGPD (Lei 13.709/2018, art. 19, II) para a resposta completa. Se o PROCON adotar outro prazo, troque-o aqui.

## Registro

Guarde, fora do sistema e pelo canal oficial do PROCON, a data do pedido, a forma de identificação, o que foi feito e a data da resposta. Não registre o CPF completo nem o telefone nesse controle.

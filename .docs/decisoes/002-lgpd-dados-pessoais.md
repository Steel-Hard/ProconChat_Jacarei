# 002 — Tratamento de dados pessoais

- **Status:** Aceita
- **Data:** 01/09/2026 (hash do telefone), complementada em 26 e 27/09/2026 e em 01/11/2026 (retenção, aviso de privacidade e pedidos do titular, issue #69)
- **Requisitos:** RNF03 (LGPD)

## Contexto

O chatbot lida com telefone, nome e CPF de cidadãos. O desafio exige conformidade com a LGPD e restringe o uso de serviços externos por proteção de dados (RP05).

## Decisão

| Dado | Como é guardado | Quem vê |
|---|---|---|
| **Texto digitado pelo cidadão** | **Não é guardado.** Só os passos percorridos | Ninguém |
| **Telefone (sessão)** | `phone_hash` (HMAC com `PHONE_HASH_SECRET`) | Ninguém. Nunca é exibido nem enviado ao navegador |
| **Telefone (agendamento)** | Criptografado (reversível), só para enviar avisos. **Apagado quando chega o horário do agendamento** (ver Retenção) | Ninguém. Usado só pelo backend para enviar mensagens |
| **CPF** | `cpf_hash` + versão mascarada gravada na criação (`***.456.789-**`) | Painel mostra só a versão mascarada |
| **Nome do titular** | Texto, porque a equipe precisa identificar a pessoa no balcão | Quem tem permissão de ver agendamentos |

Regras adicionais:

1. **Nome e CPF são sempre do titular** (o consumidor lesado), mesmo quando outra pessoa comparece em nome dele.
2. **A busca por CPF compara hashes**: a recepção digita os 11 dígitos, o sistema calcula o hash e procura. O CPF completo nunca aparece.
3. **Sessões do mesmo cidadão podem ser ligadas pelo `phone_hash`** ("Outras conversas deste número" na tela de Sessões). A consulta é feita no backend, que **nunca devolve o hash** ao front.
4. **Relatórios e exportações contêm só dados agregados**, sem nome, CPF ou protocolo.
5. **O cidadão é informado**, no momento do agendamento, de que receberá avisos naquele número. Não há consentimento separado, porque a base legal é a execução do serviço que ele mesmo pediu.
6. **Segredos de integração** (token da Meta, App Secret) são guardados criptografados no banco, com uma chave-mestra que fica no `.env`.
7. **Descartado:** conferir o CPF no balcão digitando-o no painel. O grupo avaliou e decidiu que não agrega ao produto.

## Consequências

- `Appointments` ganha colunas de CPF mascarado e telefone criptografado.
- `PHONE_HASH_SECRET` **não deve ser trocado sem motivo**: trocar quebra a ligação entre sessões antigas e novas.
- **Pendências, com o destino de cada uma (01/11/2026, issue #69):**
  - **RNF09: política de retenção.** O apagamento do telefone está decidido e implementado (seção Retenção). Os prazos de sessões, eventos e agendamentos ficam no texto livre "Prazos de guarda" da aba Privacidade, e a exclusão ou anonimização automática por prazo vai para uma issue nova.
  - **Aviso de privacidade:** rodapé curto na lista de categorias (#88) e link na saudação quando a configuração de privacidade está preenchida (#69).
  - **Procedimento para pedidos do titular:** manual, descrito em [pedidos do titular](../lgpd/pedidos-do-titular.md) (seção Pedidos do titular).
  - **Mensagens pela Meta:** a política de privacidade pública diz que, com a Cloud API, as mensagens passam pelos servidores da Meta.

## Retenção

Complementada em 01/11/2026 (issue #69).

- **"Quando o agendamento termina" quer dizer quando o horário do agendamento chega** (`appointment_datetime <= agora`), em qualquer status. Antes do horário, o telefone ainda serve para o reenvio do aviso de cancelamento e para o lembrete. Depois do horário, nada no sistema lê o telefone. Um Pendente ou Confirmado que ninguém marcou também terminou: exigir status final deixaria esse telefone guardado para sempre.
- O backend roda uma **varredura a cada 60 segundos** que apaga o telefone criptografado dos agendamentos cujo horário chegou. Ela não muda mais nada no agendamento e não registra evento. A primeira execução depois do deploy apaga de uma vez os telefones dos agendamentos já passados.
- O reenvio do aviso de cancelamento confere o horário antes do telefone: depois do horário, a recusa é "O horário do atendimento já passou e o aviso não serve mais", e não a falta de telefone.
- Os **backups diários são guardados por 7 dias** ([deploy](../infra/deploy.md)). Um telefone apagado continua num dump por menos de 7 dias, e a política de privacidade diz isso.
- Os prazos de **sessões, eventos e agendamentos** ficam no texto "Prazos de guarda" que o Admin cadastra na aba Privacidade da tela de WhatsApp e que aparece na página pública. A exclusão ou anonimização automática por prazo **não está implementada** e vai para uma issue nova: ela esbarra na chave estrangeira `Appointments.session_id` sem cascade, nas observações imutáveis de `AppointmentNotes` e nos relatórios sobre `ConversationEvents`.

## Aviso de privacidade

- A lista de categorias tem o rodapé curto "Orientação informativa · Dados tratados conforme a LGPD" (#88).
- A **política de privacidade** é a página pública `/privacidade` do painel, aberta sem login. Ela lê os dados cadastrados na aba Privacidade da tela de WhatsApp (controlador, encarregado, e-mail, atendimento presencial e prazos) e mostra "Informação ainda não cadastrada" no que estiver vazio.
- A saudação do bot leva a linha "Saiba como tratamos seus dados: <PUBLIC_BASE_URL>/privacidade" só quando o nome do controlador e o e-mail de contato estão preenchidos e o servidor tem `PUBLIC_BASE_URL`. A linha é texto fixo, sem LLM.

## Pedidos do titular

- O titular pede **acesso** ou **exclusão** dos próprios dados pelo e-mail cadastrado na aba Privacidade. O atendimento é **manual**, sem ferramenta no painel, e segue o [procedimento de pedidos do titular](../lgpd/pedidos-do-titular.md).
- A exclusão é feita por **anonimização**: o nome do agendamento vira "Titular removido" e o telefone é apagado, por SQL revisado pela equipe técnica.
- **As mensagens passam pela Meta**: com a Cloud API, o conteúdo trocado com o bot trafega pelos servidores da Meta, e a política de privacidade informa isso.

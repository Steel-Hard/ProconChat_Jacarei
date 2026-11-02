# 002 — Tratamento de dados pessoais

- **Status:** Aceita
- **Data:** 01/09/2026 (hash do telefone), complementada em 26 e 27/09/2026, em 01/11/2026 (retenção, aviso de privacidade e pedidos do titular, issue #69) e em 02/11/2026 (anonimização por prazo, #69, D3)
- **Requisitos:** RNF03 (LGPD)

## Contexto

O chatbot lida com telefone, nome e CPF de cidadãos. O desafio exige conformidade com a LGPD e restringe o uso de serviços externos por proteção de dados (RP05).

## Decisão

| Dado | Como é guardado | Quem vê |
|---|---|---|
| **Texto digitado pelo cidadão** | **Não é guardado.** Só os passos percorridos | Ninguém |
| **Telefone (sessão)** | `phone_hash` (HMAC com `PHONE_HASH_SECRET`). **Removido (`NULL`) quando a conversa é anonimizada** (ver Retenção) | Ninguém. Nunca é exibido nem enviado ao navegador |
| **Telefone (agendamento)** | Criptografado (reversível), só para enviar avisos. **Apagado quando chega o horário do agendamento** (ver Retenção) | Ninguém. Usado só pelo backend para enviar mensagens |
| **CPF** | `cpf_hash` + versão mascarada gravada na criação (`***.456.789-**`). **Removidos (`NULL`) quando o agendamento é anonimizado** (ver Retenção) | Painel mostra só a versão mascarada, ou "CPF removido" |
| **Nome do titular** | Texto, porque a equipe precisa identificar a pessoa no balcão. **Vira "Titular removido" na anonimização** | Quem tem permissão de ver agendamentos |

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
  - **RNF09: política de retenção.** Decidida e implementada (seção Retenção): o telefone do agendamento é apagado no horário, e conversas e agendamentos são anonimizados por prazo quando o Admin liga a anonimização automática na aba Privacidade (02/11/2026, #69, D3).
  - **Aviso de privacidade:** rodapé curto na lista de categorias (#88) e link na saudação quando a configuração de privacidade está preenchida (#69).
  - **Procedimento para pedidos do titular:** manual, descrito em [pedidos do titular](../lgpd/pedidos-do-titular.md) (seção Pedidos do titular).
  - **Mensagens pela Meta:** a política de privacidade pública diz que, com a Cloud API, as mensagens passam pelos servidores da Meta.

## Retenção

Complementada em 01/11/2026 (issue #69).

- **"Quando o agendamento termina" quer dizer quando o horário do agendamento chega** (`appointment_datetime <= agora`), em qualquer status. Antes do horário, o telefone ainda serve para o reenvio do aviso de cancelamento e para o lembrete. Depois do horário, nada no sistema lê o telefone. Um Pendente ou Confirmado que ninguém marcou também terminou: exigir status final deixaria esse telefone guardado para sempre.
- O backend roda uma **varredura a cada 60 segundos** que apaga o telefone criptografado dos agendamentos cujo horário chegou. Ela não muda mais nada no agendamento e não registra evento. A primeira execução depois do deploy apaga de uma vez os telefones dos agendamentos já passados.
- O reenvio do aviso de cancelamento confere o horário antes do telefone: depois do horário, a recusa é "O horário do atendimento já passou e o aviso não serve mais", e não a falta de telefone.
- Os **backups diários são guardados por 7 dias** ([deploy](../infra/deploy.md)). Um telefone apagado continua num dump por menos de 7 dias, e a política de privacidade diz isso.
- O texto "Prazos de guarda" da aba Privacidade continua como texto livre para outros prazos que a página pública deve mostrar.

### Anonimização por prazo

Complementada em 02/11/2026 (#69, D3).

- **Anonimizar, não apagar.** Conversas (`Sessions`) e agendamentos (`Appointments`) têm o dado pessoal removido e as linhas ficam. Apagar esbarraria na chave estrangeira `Appointments.session_id` sem cascade, nas observações imutáveis de `AppointmentNotes`, no histórico de `AppointmentEvents` e nos relatórios sobre `ConversationEvents` (que caem em cascata com a sessão).
- **Conversa anonimizada:** `phone_hash = NULL` e `anonymized_at` com o instante da varredura. Status, desfecho, etapas, datas e categoria continuam.
- **Agendamento anonimizado:** `name = 'Titular removido'`, `cpf_hash`, `cpf_masked` e `phone_encrypted` nulos e `anonymized_at` preenchido. Status, data, pergunta, documentos, responsável, histórico e observações continuam. O painel mostra "Titular removido" e "CPF removido".
- **Sem prazo próprio:** `ConversationEvents`, `AppointmentEvents`, `OutboundMessages` e `AuditLog` não guardam dado do cidadão e ficam como estão. As observações (`AppointmentNotes`) também ficam: são imutáveis por regra do banco e não devem conter dado do cidadão.
- **Prazos** (configuráveis na aba Privacidade da tela de WhatsApp):

| Dado | Prazo padrão | Faixa aceita | Conta a partir de |
|---|---|---|---|
| Ligação da conversa ao número (`Sessions.phone_hash`) | 90 dias | 30 a 1825 | fim da conversa (`ended_at`, ou a última interação quando não há `ended_at`) |
| Nome e CPF do agendamento | 365 dias | 90 a 1825 | data do atendimento, em qualquer status |
| Telefone do agendamento | no horário do atendimento | — | ver acima |
| Eventos e observações | sem prazo | — | sem dado pessoal depois da anonimização |
| Cópias de segurança | 7 dias | — | [deploy](../infra/deploy.md) |

- **Vínculo da conversa com o agendamento:** a conversa que gerou um agendamento só é anonimizada quando todos os agendamentos que ela gerou já passaram do prazo de agendamento. Assim o cidadão continua achando e gerenciando o próprio agendamento pelo WhatsApp. A conversa de retorno, ligada ao agendamento só pelo evento, segue o prazo normal.
- **Salvaguardas:**
  - nada acontece até o Admin ligar a "Anonimização automática" na aba Privacidade (vem desligada);
  - ao ligar, ou ao reduzir um prazo, o painel mostra quantas conversas e quantos agendamentos já passaram do prazo e pede confirmação;
  - a varredura roda a cada 1 hora e trata no máximo 500 linhas por tabela por execução, do mais antigo para o mais novo;
  - o log da varredura leva só as contagens e, na falha, só o código do erro;
  - a anonimização não tem volta, e a migration `20` não pode ser revertida depois que existe linha anonimizada. Confirme um backup recente antes de ligar o interruptor em homologação ou produção.
- **Fundamentação legal dos prazos: a conferir.** A proposta relacionou os números a dispositivos da LGPD (art. 6º, III, art. 12 e art. 16) e do Código de Defesa do Consumidor (arts. 26 e 27). Essas citações **ainda não foram conferidas** pela equipe e não valem como fundamentação até a conferência.

## Aviso de privacidade

- A lista de categorias tem o rodapé curto "Orientação informativa · Dados tratados conforme a LGPD" (#88).
- A **política de privacidade** é a página pública `/privacidade` do painel, aberta sem login. Ela lê os dados cadastrados na aba Privacidade da tela de WhatsApp (controlador, encarregado, e-mail, atendimento presencial e prazos) e mostra "Informação ainda não cadastrada" no que estiver vazio.
- A saudação do bot leva a linha "Saiba como tratamos seus dados: <PUBLIC_BASE_URL>/privacidade" só quando o nome do controlador e o e-mail de contato estão preenchidos e o servidor tem `PUBLIC_BASE_URL`. A linha é texto fixo, sem LLM.

## Pedidos do titular

- O titular pede **acesso** ou **exclusão** dos próprios dados pelo e-mail cadastrado na aba Privacidade. O atendimento é **manual**, sem ferramenta no painel, e segue o [procedimento de pedidos do titular](../lgpd/pedidos-do-titular.md).
- A exclusão é feita por **anonimização**, com as mesmas colunas da anonimização por prazo (nome "Titular removido", CPF e telefone nulos, `anonymized_at`), por SQL revisado pela equipe técnica.
- **As mensagens passam pela Meta**: com a Cloud API, o conteúdo trocado com o bot trafega pelos servidores da Meta, e a política de privacidade informa isso.

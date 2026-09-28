# Detalhe do agendamento

## Para que serve

Ver tudo sobre um agendamento e registrar o que aconteceu com ele.

## Quem acessa

**Ver agendamentos** vê tudo, só para leitura, com o aviso "Sua conta pode apenas visualizar agendamentos". As ações exigem **Gerenciar agendamentos**.

## O que a tela mostra

### Cabeçalho

Protocolo, status e selos, quando for o caso:
- **"Comparece por representante"**;
- **"Remarcado pelo cidadão"**;
- **"Fora da grade atual"**.

Abaixo: nome do titular, data e hora por extenso, e "Criado pelo chatbot em [data e hora]".

### Dados do agendamento

| Campo | Observação |
|---|---|
| Titular e CPF do titular | CPF sempre mascarado |
| Data e hora, status, responsável | "Sem responsável" quando pendente |
| Comparecimento | "Titular comparece" ou "Comparece por representante" |
| **Motivo do agendamento** | "A pergunta exige atendimento presencial" ou "O cidadão respondeu que a dúvida não foi resolvida". **Gravado quando o agendamento foi criado**: não muda se alguém editar a pergunta depois |
| Data original | Só aparece se o cidadão remarcou |
| Origem no chatbot | Categoria → pergunta |

**Nome e CPF são sempre do titular** (o consumidor lesado). Quando comparece um representante, a tela avisa: "Nome e CPF acima são sempre do titular; confira os documentos exigidos para representante."

### Documentos solicitados pelo chatbot

- A **lista que foi enviada ao cidadão** quando o agendamento foi criado: a do grupo (titular ou representante) mais os "Documentos úteis para esta dúvida" da pergunta.
- **Essa lista não muda** se a configuração de Documentos mudar depois. Quando a configuração atual for diferente, a tela avisa: "A configuração atual de documentos é diferente desta lista. O cidadão foi orientado a trazer os itens abaixo."

### Linha do tempo da conversa de origem

Os **passos** que o cidadão percorreu no chatbot, na ordem, com horário: início, categoria, pergunta, resposta entregue (com o rótulo **"Gerado com auxílio de IA"** quando for o caso), "A dúvida foi resolvida?" ou "A pergunta exige atendimento presencial", agendamento oferecido, quem vai comparecer, aviso de que receberá mensagens neste número, e agendamento criado.

- O sistema **não guarda o texto que o cidadão digitou**, e a tela diz isso.
- O código da sessão vira link para a tela de Sessões **só para quem tem Ver sessões**.

### Observações internas

- Lista de observações com autor, data e hora. **Não podem ser editadas nem apagadas.**
- Quem gerencia agendamentos pode escrever uma nova. O campo diz "Visível apenas para a equipe do PROCON".
- Observações **nunca** são enviadas ao cidadão.

### Histórico

Todos os eventos do agendamento, do mais recente para o mais antigo: criado, assumido, atribuído, remarcado (de → para), voltou a Pendente, lembrete enviado, cancelado (com motivo), cidadão avisado ou falha ao avisar, registrado, registro corrigido, mantido fora da grade.

Uma falha ao avisar o cidadão aparece em destaque, com **"Tentar novamente"**.

## O que dá para fazer

As ações aparecem conforme o status e o momento:

| Ação | Quando aparece | O que acontece |
|---|---|---|
| **Assumir para mim** | Pendente | Vira Confirmado, com você como responsável |
| **Atribuir a outro funcionário** | Pendente ou Confirmado | Lista só contas **ativas** com Gerenciar agendamentos. Vira Confirmado |
| **Marcar como atendido** | Pendente ou Confirmado, **a partir do dia do atendimento** (antes disso aparece "disponível a partir do dia do atendimento") | Vira Atendido. **Num pendente, assume automaticamente** para quem clicou e registra os dois eventos |
| **Marcar como não compareceu** | Pendente ou Confirmado, **depois do horário** | Vira Não compareceu. Num pendente, também assume para quem clicou |
| **Corrigir registro** | Atendido ou Não compareceu | Volta ao **estado anterior**: Pendente se não havia responsável, Confirmado se havia |
| **Cancelar agendamento** | Pendente ou Confirmado, **antes do horário** | Abre o modal de cancelamento (abaixo). Depois do horário, a tela explica que não é possível cancelar e que o caso é "Não compareceu" |

### Modal de cancelamento

1. **Motivo obrigatório**, de uma lista fixa:

   | Motivo | Frase enviada ao cidadão |
   |---|---|
   | Unidade fechada nesta data | "a unidade estará fechada nesta data" |
   | A pedido do cidadão | "cancelamento solicitado por você" |
   | Agendamento duplicado | "foi identificado outro agendamento em seu nome" |
   | Outro motivo | "não será possível realizar o atendimento neste horário" |

2. **Prévia exata da mensagem** que o cidadão receberá:
   > "Olá, [primeiro nome]. Seu agendamento [protocolo] no PROCON Jacareí, marcado para [dd/mm] às [hh:mm], foi cancelado. Motivo: [frase]. Para agendar novamente, envie uma mensagem para este número."
3. A explicação de que as mensagens seguem modelos fixos e por isso podem ser enviadas a qualquer momento antes do horário.
4. **Observação interna** opcional, que não é enviada ao cidadão.
5. Botão **"Cancelar e avisar o cidadão"**. O horário volta a ficar disponível no chatbot. **Não pode ser desfeito.**

## O que não existe de propósito

| O que não existe | Por quê |
|---|---|
| Alterar data ou horário | Remarcação é só pelo cidadão, no chatbot |
| Reabrir um cancelado | O cidadão já foi avisado. Para voltar, ele agenda de novo pelo chatbot |
| Mensagem livre ao cidadão | Todas as mensagens seguem modelos fixos ([regras gerais](00-regras-gerais.md#6-mensagens-enviadas-ao-cidadão)) |
| Editar ou apagar observações | Preserva o registro do que a equipe anotou |
| Conferir CPF no balcão | Avaliado e descartado pelo grupo |

## Relações

- [Decisão 006](../decisoes/006-ciclo-de-vida-do-agendamento.md) (estados e dados) e [decisão 005](../decisoes/005-mensagens-ao-cidadao.md) (avisos).
- A linha do tempo usa os mesmos passos da tela de [Sessões](07-sessoes.md).

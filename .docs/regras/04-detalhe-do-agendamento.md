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
| Titular e CPF do titular | CPF sempre mascarado. No agendamento anonimizado por prazo, "Titular removido" e "CPF removido" ([decisão 002](../decisoes/002-lgpd-dados-pessoais.md#anonimização-por-prazo)) |
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

Os eventos de aviso ao cidadão têm estes rótulos: **"Cidadão avisado do cancelamento"**, **"Lembrete enviado"**, **"Falha ao avisar o cidadão do cancelamento"** e **"Falha ao avisar o cidadão do lembrete"**.

Uma falha ao avisar o cidadão aparece em destaque. O botão **"Tentar novamente"** aparece **só na falha do cancelamento**; a falha do lembrete fica em destaque, sem botão, porque reenviar um lembrete perto ou depois do horário gera custo e pode chegar fora de hora.

Quando o cancelamento é feito mas o aviso ao cidadão falha, o aviso persistente na caixa "Ações" diz: "Agendamento [protocolo] cancelado, mas o aviso ao cidadão falhou. Use "Tentar novamente" no histórico."

Quando o cancelamento é feito com o **aviso desligado**, o aviso persistente na caixa "Ações" diz: "Agendamento [protocolo] cancelado. O cidadão não foi avisado pelo sistema: avise por outro meio." Essa faixa (e as dos casos de falha e de falta de telefone, acima) **não some ao recarregar**: fica enquanto o agendamento estiver Cancelado sem que o cidadão tenha sido avisado. O Histórico registra **"Aviso ao cidadão desativado: cidadão não avisado pelo sistema"**, em estilo neutro (não é falha) e sem "Tentar novamente"; se o Admin ligar o aviso depois, esses eventos não viram reenvio. Se o cancelamento teve **falha de aviso antes** de o aviso ser desligado e a equipe vê o agendamento depois, o botão **"Tentar novamente" some** e a faixa diz: "Agendamento [protocolo] cancelado. O aviso ao cidadão falhou e o aviso por WhatsApp está desligado: avise por outro meio." **Essas faixas de aviso ao cidadão (aviso desligado, falha e falta de telefone) não aparecem quando o horário do atendimento já passou**: "avise por outro meio" sobre um atendimento que já aconteceu é ruído. O Histórico continua mostrando os eventos. Quando a Meta recusa o envio por falta de forma de pagamento (erro 131042), o Histórico diz "A conta da Meta está sem forma de pagamento".

Quando o aviso não pode ser enviado por **falta de telefone** do cidadão, o aviso persistente na caixa "Ações" diz: "Agendamento [protocolo] cancelado, mas o cidadão não pôde ser avisado: não há telefone disponível para o envio." Nesse caso não há reenvio possível: o Histórico mostra **"Falha ao avisar o cidadão do cancelamento"** **sem o botão "Tentar novamente"**, e a tela nunca diz que o cidadão foi avisado.

## O que dá para fazer

As ações aparecem conforme o status e o momento:

| Ação | Quando aparece | O que acontece |
|---|---|---|
| **Assumir para mim** | Pendente | Vira Confirmado, com você como responsável |
| **Atribuir a outro funcionário** | Pendente ou Confirmado | Lista só contas **ativas** com Gerenciar agendamentos. Vira Confirmado |
| **Marcar como atendido** | Pendente ou Confirmado, **a partir do dia do atendimento** (antes disso aparece "disponível a partir do dia do atendimento") | Vira Atendido. **Num pendente, assume automaticamente** para quem clicou e registra os dois eventos |
| **Marcar como não compareceu** | Pendente ou Confirmado, **depois do horário** | Vira Não compareceu. Num pendente, também assume para quem clicou |
| **Corrigir registro** | Atendido ou Não compareceu | Volta ao **estado anterior**: Pendente se não havia responsável, Confirmado se havia |
| **Cancelar agendamento** | Pendente ou Confirmado, **antes do horário** | Abre o modal de cancelamento (abaixo). Depois do horário, a tela explica que não é possível cancelar e que o caso deve ser registrado como atendido ou não compareceu |

Quando **Corrigir registro** devolve o agendamento a Pendente sem responsável porque o responsável anterior está ocupado ou não pode mais assumir, a tela mostra um **aviso** dizendo isso, com quantos funcionários estão livres no horário. O aviso **fica visível na caixa "Ações"** até a próxima ação ou até a pessoa sair da tela.

### Modal de cancelamento

1. **Motivo obrigatório**, de uma lista fixa:

   | Motivo | Frase enviada ao cidadão |
   |---|---|
   | Unidade fechada nesta data | "a unidade estará fechada nesta data" |
   | A pedido do cidadão | "cancelamento solicitado por você" |
   | Agendamento duplicado | "foi identificado outro agendamento em seu nome" |
   | Outro motivo | "não será possível realizar o atendimento neste horário" |

**Com o aviso de cancelamento ligado** (tela de WhatsApp, [decisão 005](../decisoes/005-mensagens-ao-cidadao.md)), os itens 2 e 3 e o botão do item 5 valem como descritos. **Com o aviso desligado (padrão)**, não há prévia nem a explicação dos modelos fixos: o modal mostra o quadro "O aviso por WhatsApp está desligado. O cidadão não será avisado pelo sistema. Avise por outro meio." e o botão se chama **"Cancelar agendamento"**. O motivo continua obrigatório, a observação interna continua opcional e o telefone do cidadão nunca aparece. O subtítulo do modal diz: "[nome] · [data] às [hora]. O horário volta a ficar disponível no chatbot. O cidadão não será avisado pelo sistema. Esta ação não pode ser desfeita." **Se a configuração do aviso não puder ser lida**, o modal **não deixa confirmar** e mostra "Não foi possível verificar o aviso ao cidadão. Tente de novo." com o botão **"Tentar de novo"**. Enquanto a configuração carrega, o modal mostra "Verificando o aviso ao cidadão…" e, nos dois casos, **não mostra** "Mensagem que o cidadão receberá", "Modelo fixo" nem a dica dos modelos fixos. Tudo isso para a equipe não cancelar achando que o cidadão será avisado. Com o aviso ligado e um problema conhecido na conta da Meta (lista, frases e janela de tempo em [regras 11](11-whatsapp.md#aviso-de-cancelamento-ao-cidadão); o modal só mostra os problemas detectados pelos códigos de erro já recebidos, não o estado dos modelos, que só o Admin lê), o modal mostra antes uma faixa "O aviso pode não chegar: [motivo]", mas permite cancelar; se o envio falhar, segue o fluxo de falha descrito no Histórico.

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

## Estado da tela

- **Construído pela #86:** cabeçalho com selos, dados do agendamento, documentos enviados pelo chatbot, linha do tempo da conversa de origem, histórico e as ações "Assumir para mim", "Marcar como atendido" e "Marcar como não compareceu", cada uma com confirmação. Antes do horário, "Marcar como não compareceu" também mostra "disponível depois do horário do atendimento". O erro de uma ação aparece na caixa "Ações" até a próxima ação.
- **Atribuir a outro funcionário, observações internas e corrigir registro:** integrados à API #87, com a permissão por ação (`PERMISSION_REQUIRED` em `available_actions`) e a regra de horário por pessoa (`ASSIGNEE_BUSY` também em "Assumir para mim" e no assumir automático). Observações podem ser acrescentadas pela equipe, mas não editadas nem apagadas.
- **Cancelar agendamento** e **"Tentar novamente"** foram integrados à tela na #127. O modal exige um motivo, mostra a prévia devolvida pelo backend (a mesma mensagem enviada ao cidadão), aceita observação interna opcional e confirma o cancelamento irreversível. A ação só aparece antes do horário; depois dele a tela explica que o caso deve ser registrado como atendido ou não compareceu. O botão de reenvio segue `available_actions.retry_cancellation_notice`, e não a existência de um evento de falha no histórico: ele também aparece quando o cancelamento não deixou evento de aviso (#67).
- **Código da sessão com link para Sessões:** fica com a #72. A API ainda não devolve o código `S-XXXXXX`, então a tela não mostra a sessão.
- A linha do tempo vazia e a falha ao lê-la aparecem com o mesmo texto ("Os passos desta conversa não estão disponíveis."), porque a API responde igual nos dois casos.

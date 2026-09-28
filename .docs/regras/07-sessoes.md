# Sessões

## Para que serve

Consultar as conversas do chatbot, uma a uma: que caminho o cidadão percorreu e como a conversa terminou. É **somente leitura**.

## Quem acessa

**Ver sessões.**

## O que é uma sessão

Uma conversa de um cidadão com o chatbot, do início até o desfecho. **Uma sessão sem interação por 30 minutos é encerrada como Abandonada**, e a próxima mensagem abre uma sessão nova ([decisão 008](../decisoes/008-fluxo-da-conversa-e-desfechos.md)).

**O sistema registra só os passos percorridos, nunca o texto que o cidadão digitou.** A tela diz isso.

## O que a tela mostra

### Busca

Por **código da sessão** ou **protocolo do agendamento**. Buscar por um protocolo encontra tanto a conversa que criou o agendamento quanto as conversas de retorno em que ele foi remarcado ou cancelado. A busca ignora os filtros.

### Filtros

- **Período:** os mesmos de Relatórios (7/30/90 dias, Mês atual, Mês anterior, Personalizado).
- **Categoria.**
- **Desfecho**, em chips com contagem e as mesmas cores de Relatórios: Resolvida sem agendamento, Terminou em agendamento, Fora do escopo do PROCON, Sem horário disponível na janela, Não quis agendar, Remarcou ou cancelou agendamento existente, Abandonada, Em andamento.

### Lista

Colunas: código e início, desfecho (e, para as sessões em andamento, a **etapa atual**), categoria e pergunta finais, e agendamento (protocolo com "Criado", "Remarcou" ou "Cancelou", ou "Não"). **20 por página**, da mais recente para a mais antiga.

### Detalhe da sessão (janela)

**Linha do tempo** com os passos e horários:

| Passo | Detalhe |
|---|---|
| Início da conversa | O cidadão recebeu a saudação com a menção ao caráter orientativo |
| Categoria escolhida, Pergunta escolhida | — |
| Resposta entregue | Com o rótulo **"Gerado com auxílio de IA"** quando houve complemento |
| Complemento por IA indisponível | Quando a IA falhou: o cidadão recebeu só o texto oficial (sem rótulo de IA) |
| A pergunta exige atendimento presencial | Nesse caso o chatbot não pergunta se a dúvida foi resolvida |
| A dúvida foi resolvida? | Com a resposta do cidadão: Sim ou Não |
| Agendamento oferecido | Com o motivo |
| Não havia horário disponível / O cidadão preferiu não agendar | Desfechos sem agendamento |
| Escolheu quem vai comparecer | Titular ou representante |
| Informado de que receberá avisos neste número | Lembrete e cancelamento |
| Agendamento criado | Protocolo, data e hora, com link para o agendamento |
| Consultou o agendamento → Remarcou / Cancelou | Em conversas de retorno. Na remarcação: "Mesmo protocolo. Se estava Confirmado, voltou a Pendente sem responsável" |
| Parou em [etapa] | Em sessões abandonadas, com os mesmos nomes de etapa de Relatórios |
| Aguardando o cidadão | Em sessões em andamento, com a etapa atual |

**Outras conversas deste número:** lista das outras sessões do mesmo cidadão (código, data e desfecho), com link. A tela explica: "Identificadas pelo mesmo número de WhatsApp, que não é exibido nem armazenado de forma legível."

Os links para agendamentos só aparecem para quem tem **Ver agendamentos**.

## O que não existe de propósito

| O que não existe | Por quê |
|---|---|
| Texto das mensagens do cidadão | Não é guardado ([decisão 002](../decisoes/002-lgpd-dados-pessoais.md)) |
| Telefone do cidadão | Nunca aparece no painel. A ligação entre sessões é feita pelo sistema, sem expor o número |
| Assumir ou responder a conversa | Não há atendimento humano pelo chat ([decisão 011](../decisoes/011-atendimento-humano-no-chat-nao-adotado.md)) |
| Editar ou excluir sessões | Sessões são registros do que aconteceu |

## Relações

- Desfechos e etapas: [decisão 008](../decisoes/008-fluxo-da-conversa-e-desfechos.md). Os números agregados ficam em [Relatórios](05-relatorios.md).
- A mesma linha do tempo aparece no [Detalhe do agendamento](04-detalhe-do-agendamento.md).

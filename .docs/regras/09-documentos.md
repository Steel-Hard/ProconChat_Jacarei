# Documentos para atendimento presencial

## Para que serve

Definir **quais documentos o cidadão deve levar** ao atendimento presencial. O chatbot envia essa lista quando cria o agendamento.

## Quem acessa

**Configurar documentos para atendimento presencial.**

## Estado da tela

**Construída (issue #65).** Permite a edição das listas de documentos do titular e do representante, refletindo nos próximos agendamentos.

## Como funciona

Existem **dois grupos**, porque às vezes quem comparece não é o próprio consumidor (ex.: um filho no lugar de um pai idoso):

| Grupo | Exemplo de itens |
|---|---|
| **Quando o próprio titular comparece** | RG ou outro documento oficial com foto; CPF; comprovante de endereço; comprovante da reclamação (nota fiscal, contrato, fatura ou protocolo) |
| **Quando um representante comparece em nome do titular** | RG e CPF do titular (cópia); RG ou outro documento oficial com foto do representante; autorização assinada pelo titular ou procuração; comprovante da reclamação |

O chatbot pergunta **quem vai comparecer** e envia a lista do grupo certo, **somada aos "Documentos úteis para esta dúvida"** da pergunta ([Conteúdo](06-conteudo.md)).

**As alterações valem só para os próximos agendamentos.** Os já criados mantêm a lista que foi enviada ao cidadão na época. A tela diz isso no topo.

## O que dá para fazer

Em cada grupo:
- **adicionar** um item (Enter confirma);
- **editar** um item direto na lista, clicando no texto ou em "Editar" (Enter confirma, Esc cancela);
- **reordenar** (↑↓), já que a ordem é a do WhatsApp;
- **remover**.

Regras:
- **Segue o padrão de salvar** ([regras gerais](00-regras-gerais.md#3-salvar-descartar-e-registrar-quem-alterou)), com "Última alteração por [nome] em [data]".
- **Contador de alterações:** em Documentos, item novo, item removido e item editado contam 1 cada, e mudar só a ordem conta 1 por grupo.
- **Limite:** no máximo **10 itens por grupo**. A tela avisa e impede o 11º.
- **Item repetido no mesmo grupo:** a tela avisa e impede quando o item é igual a outro do grupo, ignorando acento e maiúscula.
- **Grupo vazio:** a tela alerta "Nenhum documento será pedido quando [o titular / um representante] comparecer. O cidadão pode chegar sem o necessário para o atendimento." **Permite salvar mesmo assim.**

## Prévia da mensagem de confirmação do agendamento

Com os seletores **"Quem comparece"** (titular ou representante) e **"Pergunta de exemplo"**, a tela mostra a mensagem que o cidadão recebe logo depois de escolher o horário:

> **Agendamento realizado**
> Protocolo: [protocolo]
> Data e hora: [dia, dd/mm às hh:mm]
> Endereço: [endereço da unidade] ([complemento], quando houver)
> Leve ao atendimento: *(ou, para representante: "A pessoa que comparecer em seu nome deve levar:")*
> • [documentos do grupo]
> Documentos úteis para esta dúvida:
> • [documentos da pergunta]
> Você receberá neste número avisos sobre este agendamento, como um lembrete [N] horas antes do atendimento e o aviso em caso de cancelamento.

- O título é **"Agendamento realizado"**, e não "confirmado", para não confundir com o status interno **Confirmado** do painel (que significa que um funcionário assumiu).
- **A frase sobre avisos acompanha o que está ligado** (lembrete em [Horários de atendimento](08-horarios-de-atendimento.md); aviso de cancelamento na tela de [WhatsApp](11-whatsapp.md), desligado por padrão, [decisão 005](../decisoes/005-mensagens-ao-cidadao.md)). A prévia usa a mesma função do bot, então mostra a frase da combinação atual:

  | Lembrete | Aviso de cancelamento | Frase |
  |---|---|---|
  | Ligado | Ligado | "Você receberá neste número avisos sobre este agendamento, como um lembrete [N] horas antes do atendimento e o aviso em caso de cancelamento." |
  | Ligado | Desligado | "Você receberá neste número avisos sobre este agendamento, como um lembrete [N] horas antes do atendimento." |
  | Desligado | Ligado | "Você receberá neste número avisos sobre este agendamento, como o aviso em caso de cancelamento." |
  | Desligado | Desligado | **Sem a frase**: a mensagem termina nos documentos, sem a linha em branco que a precederia. |

  Com [N] igual a 1, o texto é "1 hora" (e não "1 horas").
- **Pergunta de exemplo:** lista **todas as perguntas ativas**, na ordem da tela [Conteúdo](06-conteudo.md). Sem perguntas ativas, a tela mostra um estado vazio.
- **Protocolo e data** da prévia são fixos e aparecem rotulados como **exemplo**.
- **Itens repetidos** entre o grupo e a pergunta aparecem destacados, com a dica "Este item também está nos documentos da pergunta". Um item é repetido quando é igual ao outro, ignorando acento e maiúscula, ou quando um está contido no outro por palavras inteiras (por exemplo, "RG" e "RG ou outro documento oficial com foto").
- A prévia vem pronta do servidor, montada pela mesma função que gera a mensagem do bot, e a tela não interpreta o texto.
- A prévia avisa quando está mostrando alterações ainda não salvas, ou quando a pergunta escolhida não tem documentos.

## O que não existe de propósito

| O que não existe | Por quê |
|---|---|
| Documentos por categoria | Os documentos específicos ficam em cada pergunta, em "Documentos úteis para esta dúvida" |
| Alterar a lista de agendamentos já criados | O cidadão já recebeu a lista; mudar depois causaria confusão no balcão |

## Relações

- Endereço e lembrete: [Horários de atendimento](08-horarios-de-atendimento.md).
- A lista enviada aparece no [Detalhe do agendamento](04-detalhe-do-agendamento.md).
- [Decisão 005](../decisoes/005-mensagens-ao-cidadao.md) e [decisão 006](../decisoes/006-ciclo-de-vida-do-agendamento.md).

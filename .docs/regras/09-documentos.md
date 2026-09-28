# Documentos para atendimento presencial

## Para que serve

Definir **quais documentos o cidadão deve levar** ao atendimento presencial. O chatbot envia essa lista quando cria o agendamento.

## Quem acessa

**Configurar documentos para atendimento presencial.**

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
- **Grupo vazio:** a tela alerta "Nenhum documento será pedido quando [o titular / um representante] comparecer. O cidadão pode chegar sem o necessário para o atendimento." **Permite salvar mesmo assim.**

## Prévia da mensagem de confirmação do agendamento

Com os seletores **"Quem comparece"** (titular ou representante) e **"Pergunta de exemplo"**, a tela mostra a mensagem que o cidadão recebe logo depois de escolher o horário:

> **Agendamento realizado**
> Protocolo: [protocolo]
> Data e hora: [dia, dd/mm às hh:mm]
> Endereço: [endereço da unidade]
> [Documentos do grupo]
> Documentos úteis para esta dúvida: [documentos da pergunta]
> Você receberá neste número avisos sobre este agendamento, como um lembrete [N] horas antes do atendimento e o aviso em caso de cancelamento.
> Se precisar remarcar ou cancelar, responda a esta mensagem.

- O título é **"Agendamento realizado"**, e não "confirmado", para não confundir com o status interno **Confirmado** do painel (que significa que um funcionário assumiu).
- Se o lembrete estiver desligado, a frase sobre avisos cita só o aviso de cancelamento.
- **Itens repetidos** entre o grupo e a pergunta aparecem destacados, com a dica "Este item também está nos documentos da pergunta".
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

# Guia: modelos de mensagem na Meta

Fora da janela de 24 horas da conversa, o WhatsApp só deixa a empresa escrever para o cidadão com um
**modelo aprovado pela Meta** ([decisão 005](../decisoes/005-mensagens-ao-cidadao.md)). O chatbot usa
dois modelos: o **aviso de cancelamento** (issue #67) e o **lembrete do atendimento** (issue #74).

Este guia mostra como cadastrar os dois no WhatsApp Manager da conta do número da equipe. A aprovação
leva de horas a dias, então cadastre os modelos assim que a conta estiver pronta.

**Custo:** cada mensagem de modelo enviada pela Cloud API é cobrada pela Meta. Cadastrar e aprovar o
modelo não é cobrado; o envio de cada aviso ou lembrete é.

## Regras que não podem mudar

- O **nome** e o **idioma** são constantes no código (`MODELO_AVISO_CANCELAMENTO` e
  `MODELO_LEMBRETE_ATENDIMENTO`, em `src/backend/services/messageFormatter.service.ts`). Se o modelo
  for cadastrado com outro nome ou idioma, o envio falha e o histórico do agendamento mostra a falha.
- O **corpo** cadastrado precisa ser **idêntico, caractere por caractere**, ao deste guia. A prévia que
  a equipe vê no painel é montada a partir da constante do código. Se o corpo na Meta for diferente, o
  cidadão recebe um texto diferente da prévia.
- Para mudar o texto de um modelo, mude a constante, este guia e as regras da tela juntos e cadastre um
  modelo novo. A Meta não deixa editar o corpo de um modelo aprovado sem nova análise.

## Como cadastrar um modelo

1. Entre no [WhatsApp Manager](https://business.facebook.com/wa/manage/) com uma conta que administre a
   conta do WhatsApp Business do número da equipe.
2. Abra **Ferramentas da conta → Modelos de mensagem** e clique em **Criar modelo**.
3. Escolha a categoria **Utilidade**. Os dois modelos tratam de um atendimento que o cidadão já marcou.
   Não use Marketing.
4. Preencha o **nome** e o **idioma** da tabela do modelo, exatamente como estão.
5. Em **Corpo**, cole o texto do bloco do modelo. As variáveis são `{{1}}`, `{{2}}`, e assim por diante, na
   ordem do texto.
6. Preencha os **exemplos** de cada variável com os valores da tabela. A Meta usa os exemplos para
   analisar o modelo. Nunca use nome, telefone ou protocolo de um cidadão real.
7. Não adicione cabeçalho, rodapé nem botões.
8. Envie para análise.

## Modelo 1: aviso de cancelamento

| Campo     | Valor                        |
| --------- | ---------------------------- |
| Nome      | `aviso_cancelamento`         |
| Idioma    | Português (BR), `pt_BR`      |
| Categoria | Utilidade                    |
| Situação  | Enviado para análise na Meta |

Corpo:

```text
Olá, {{1}}. Seu agendamento {{2}} no PROCON Jacareí, marcado para {{3}} às {{4}}, foi cancelado. Motivo: {{5}}. Para agendar novamente, envie uma mensagem para este número.
```

| Variável | O que entra                                                                | Exemplo                               |
| -------- | -------------------------------------------------------------------------- | ------------------------------------- |
| `{{1}}`  | Primeiro nome do cidadão                                                   | `Maria`                               |
| `{{2}}`  | Protocolo (8 primeiros caracteres do código do agendamento, em maiúsculas) | `1A2B3C4D`                            |
| `{{3}}`  | Data do atendimento, `dd/mm`, horário de Brasília                          | `05/11`                               |
| `{{4}}`  | Hora do atendimento, `hh:mm`, horário de Brasília                          | `14:00`                               |
| `{{5}}`  | Frase do motivo escolhido pela equipe                                      | `a unidade estará fechada nesta data` |

As frases do motivo (`{{5}}`) são fixas, as mesmas do
[detalhe do agendamento](../regras/04-detalhe-do-agendamento.md):

- Unidade fechada: `a unidade estará fechada nesta data`
- A pedido do cidadão: `cancelamento solicitado por você`
- Agendamento duplicado: `foi identificado outro agendamento em seu nome`
- Outro: `não será possível realizar o atendimento neste horário`

## Modelo 2: lembrete do atendimento

| Campo     | Valor                   |
| --------- | ----------------------- |
| Nome      | `lembrete_atendimento`  |
| Idioma    | Português (BR), `pt_BR` |
| Categoria | Utilidade               |
| Situação  | A cadastrar             |

Corpo, tirado da prévia em [Horários de atendimento](../regras/08-horarios-de-atendimento.md#lembrete-ao-cidadão):

```text
Olá, {{1}}. Lembrete do seu atendimento no PROCON Jacareí: {{2}}, {{3}}, às {{4}} (protocolo {{5}}). Endereço: {{6}}. Traga: {{7}}. Se não puder comparecer, remarque ou cancele respondendo a esta mensagem.
```

| Variável | O que entra                                                           | Exemplo                                |
| -------- | --------------------------------------------------------------------- | -------------------------------------- |
| `{{1}}`  | Primeiro nome do cidadão                                              | `Maria`                                |
| `{{2}}`  | Dia da semana do atendimento                                          | `quinta-feira`                         |
| `{{3}}`  | Data do atendimento, `dd/mm`                                          | `05/11`                                |
| `{{4}}`  | Hora do atendimento, `hh:mm`                                          | `14:00`                                |
| `{{5}}`  | Protocolo                                                             | `1A2B3C4D`                             |
| `{{6}}`  | Endereço da unidade, com o complemento entre parênteses quando houver | `Rua do Procon, 100 (Sala 1)`          |
| `{{7}}`  | Documentos enviados na confirmação, numa linha só                     | `RG ou CNH; comprovante de residência` |

Para a issue #74, que vai enviar o lembrete: a Meta recusa variável vazia, com quebra de linha, com
tabulação ou com mais de 4 espaços seguidos. Por isso a lista de documentos (`{{7}}`) precisa ir numa
linha só, com os itens separados por `; `, e o complemento do endereço só entra em `{{6}}` quando
existir. O gateway já recusa parâmetros fora dessas regras (rota interna
`POST /internal/whatsapp/messages/template`).

## Conferir a aprovação

- **Pela API do painel:** `GET /api/v1/whatsapp/settings/templates`, só para o Admin, devolve o status
  de cada modelo na Meta (`APPROVED`, `PENDING`, `REJECTED`, `NOT_FOUND` ou `OTHER`, com o valor bruto
  da Meta em `metaStatus`). A tela de WhatsApp vai mostrar esse status com a issue #127.
- **No WhatsApp Manager:** a lista de modelos mostra a situação de cada um e o motivo de uma rejeição.

Enquanto o aviso de cancelamento não for aprovado, todo aviso falha e o histórico do agendamento mostra
`CITIZEN_NOTIFICATION_FAILED`. Isso é esperado. Depois da aprovação, a equipe usa "Tentar novamente"
(`POST /api/v1/appointments/:id/cancellation-notice/retry`) nos cancelamentos que ainda estão antes
do horário.

Depois da aprovação, confira o corpo exibido no WhatsApp Manager contra o bloco deste guia e receba um
aviso de teste no número da equipe.

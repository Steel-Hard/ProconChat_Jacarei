# Conteúdo do chatbot

## Para que serve

Manter as categorias e perguntas que o cidadão navega no WhatsApp, com as respostas oficiais do PROCON.

## Quem acessa

**Gerenciar conteúdo do chatbot.**

## Como o conteúdo funciona

- O cidadão **escolhe uma categoria** e **depois uma pergunta**, tocando nas opções. É uma lista em dois níveis, **não uma árvore** com ramificações ([decisão 001](../decisoes/001-fluxo-guiado-por-categorias.md)).
- **A ordem das listas na tela é a ordem que o cidadão vê** no WhatsApp.
- **Nada é excluído, só desativado.**

No topo, um bloco **FIXO** mostra o aviso obrigatório, que não é configurável:

> "Esta é uma orientação automatizada de caráter informativo. Ela não é vinculante e não substitui o atendimento jurídico ou administrativo formal do PROCON Jacareí."

## Categorias

A coluna da esquerda lista as categorias em ordem. Cada uma mostra:
- a posição;
- o **título curto** (em negrito, é o que aparece no WhatsApp) e o nome completo;
- quantas perguntas tem e quantas estão ativas;
- o estado: **Ativa**, **Inativa**, ou **Ativa · oculta no chatbot**. Esta última aparece quando a categoria está ativa mas **não tem nenhuma pergunta ativa**. Nesse caso ela não aparece para o cidadão.

**Ações:** reordenar (↑↓), **Nova categoria**, **Editar categoria**, **Ativar/Desativar**.

**Formulário da categoria:**

| Campo | Regra |
|---|---|
| Título curto | **Obrigatório, até 24 caracteres**, com contador. É o limite das listas do WhatsApp |
| Nome | Obrigatório e **único** (sem diferenciar acentos nem maiúsculas) |
| Descrição | Resumo dos assuntos da categoria |

Uma categoria nova é criada **ativa, no fim da lista**.

## Perguntas

A área da direita lista as perguntas da categoria selecionada, em ordem. Cada uma mostra:
- a posição;
- o título curto, a descrição curta e o texto completo;
- o estado (Ativa/Inativa) e os selos **"Exige atendimento presencial"** ou **"Fora do escopo do PROCON"**;
- a base legal e a quantidade de documentos úteis;
- **"Última alteração por [nome] em [data]"**.

**Ações:** reordenar (↑↓), **Ativar/Desativar**, **Editar**, **Nova pergunta**.

### Busca

Campo que procura no texto da pergunta ou da resposta **em todas as categorias**, mostrando a categoria de cada resultado. Durante a busca, as setas de reordenar somem.

### Listas com mais de 10 itens

O WhatsApp mostra no máximo 10 itens por lista. Com mais de 10 itens ativos (categorias, ou perguntas numa categoria), **o chatbot mostra a lista em páginas**:
- página 1: 9 itens + "Ver mais opções";
- páginas do meio: 8 itens + "Voltar" + "Ver mais opções";
- última página: até 9 itens + "Voltar".

A tela mostra essa informação e marca, com um separador **"Página 2 no WhatsApp"**, onde cada página começa. É informação, não erro: listas curtas são mais fáceis para o cidadão.

### Formulário da pergunta

| Campo | Regra |
|---|---|
| Título curto (lista do WhatsApp) | **Obrigatório, até 24 caracteres**, com contador |
| Descrição curta | Opcional, até 72 caracteres |
| Texto da pergunta | Obrigatório |
| Resposta | Obrigatória, **até 3.000 caracteres**, com contador. **A partir de 1.000**, alerta: "Respostas longas ficam difíceis de ler no celular" |
| Base legal | Ex.: "CDC, art. 49" |
| Documentos úteis para esta dúvida | Lista de itens, que são somados à lista de documentos do agendamento |
| Exige atendimento presencial | Com nota explicativa. O chatbot **oferece agendamento direto**, sem perguntar se a dúvida foi resolvida |
| Fora do escopo do PROCON | A resposta orienta a procurar outro órgão. **Nunca oferece agendamento** |
| Permitir complemento por IA nesta pergunta | Ligada por padrão. Desligada: o chatbot envia só o texto oficial |
| Pergunta ativa no chatbot | — |

Regras entre os campos:
- **"Exige atendimento presencial" e "Fora do escopo" são mutuamente exclusivos.** Marcar um desabilita o outro.
- **Perguntas fora do escopo nunca usam IA.** A opção fica desligada e desabilitada.
- Ao editar uma pergunta existente, aparece a orientação: **"Para mudar o assunto da pergunta, desative-a e crie uma nova, para não alterar o histórico dos relatórios."**

### "Ver como o cidadão recebe"

Prévia no estilo WhatsApp:

1. A **lista da categoria**, com a pergunta editada em negrito e "Ver mais opções ›" quando houver paginação.
2. **O balão da resposta:** texto oficial, base legal, documentos úteis, o exemplo do complemento por IA com o rótulo "Gerado com auxílio de IA" (quando permitido) e, **no fim do mesmo balão, o aviso de caráter não vinculante**.
3. **Um balão separado** com o passo seguinte:
   - "A sua dúvida foi resolvida?" (Sim/Não), para perguntas comuns;
   - a oferta de agendamento (Agendar / Agora não), para as que exigem atendimento presencial;
   - a orientação de encaminhamento, para as fora do escopo.

## O que não existe de propósito

| O que não existe | Por quê |
|---|---|
| Excluir categoria ou pergunta | Os relatórios e o histórico das conversas apontam para elas |
| Árvore de decisão com ramificações | O modelo segue o material do PROCON, que é um FAQ ([decisão 001](../decisoes/001-fluxo-guiado-por-categorias.md)) |
| Editar o aviso de caráter não vinculante | É obrigatório (RNF04) e tem um texto único no sistema |
| Mover pergunta para outra categoria | Não foi pedido. Para mudar, desative e crie na outra categoria |

## Relações

- Se horário ou endereço da unidade mudarem em [Horários de atendimento](08-horarios-de-atendimento.md), revise as perguntas que citam essas informações. A tela de Horários avisa isso.
- Complemento por IA: [decisão 009](../decisoes/009-complemento-por-llm.md).

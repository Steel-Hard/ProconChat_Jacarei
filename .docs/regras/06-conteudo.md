# Conteúdo do chatbot

## Para que serve

Manter as categorias e perguntas que o cidadão navega no WhatsApp, com as respostas oficiais do PROCON.

## Quem acessa

**Gerenciar conteúdo do chatbot** (`content.manage` ou Administrador).

## Estado da tela

**API no backend pronta (`GET/POST/PUT/PATCH /api/v1/content/*`, issue #63); tela no frontend na Sprint 3.** O conteúdo inicial vem da carga idempotente do sistema (`db/seeds/content.seed.ts`) e qualquer item editado pelo painel passa a ter `updated_by` preenchido, sendo preservado em execuções seguintes do seed.

## Como o conteúdo funciona

- O cidadão **escolhe uma categoria** e **depois uma pergunta**, tocando nas opções. É uma lista em dois níveis, **não uma árvore** com ramificações ([decisão 001](../decisoes/001-fluxo-guiado-por-categorias.md)).
- **A ordem das listas na tela é a ordem que o cidadão vê** no WhatsApp.
- **Nada é excluído, só desativado.**

No topo, um bloco **FIXO** mostra o aviso obrigatório, que não é configurável:

> "Esta é uma orientação automatizada de caráter informativo. Ela não é vinculante e não substitui o atendimento jurídico ou administrativo formal do PROCON Jacareí."

O topo também mostra **"Última alteração por [nome] em [data]"** do item (categoria ou pergunta) alterado mais recentemente pelo painel. Se nenhum item tiver autor, mostra **"Ainda não alterado pelo painel"**.

## Alterações pendentes e Salvar

A tela segue o padrão das telas de configuração ([regras gerais, §3](00-regras-gerais.md#3-salvar-descartar-e-registrar-quem-alterou)):

- Criar, editar, ativar/desativar e reordenar **só ficam pendentes** até **"Salvar alterações"**. Enquanto houver pendências aparece **"N alterações não salvas"**, com a lista do que mudou ao passar o mouse ou tocar. **"Descartar"** desfaz todas.
- O contador compara com o que está gravado: um item novo conta uma vez, mesmo editado depois; reordenar a mesma lista várias vezes conta uma; uma mudança que volta ao valor gravado deixa de contar.
- Sair da tela com pendências **não gera aviso**, igual a Horários e Documentos.
- O servidor grava cada item separadamente, então o Salvar envia as alterações uma a uma. Se uma falhar, o envio para: o que já foi gravado fica gravado, a tela recarrega, o que faltou continua pendente e um novo Salvar não cria de novo o que já foi criado.
- Falha depois de alguma gravação: **"Algumas alterações foram salvas e outras não. Revise o que ainda está pendente e salve de novo."**, com quantas foram salvas e quantas faltam. Falha já na primeira gravação: **"Não foi possível salvar. Nenhuma alteração foi gravada. Tente de novo."**
- Duas pessoas editando ao mesmo tempo: **vale o último Salvar**. Se a reordenação for recusada porque o conteúdo mudou nesse meio tempo, a tela recarrega, mostra o erro e mantém pendente o que não foi gravado.

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
| Título curto | **Obrigatório, até 24 caracteres**, com contador. É o limite das listas do WhatsApp. Não aceita quebra de linha nem tabulação |
| Nome completo | Obrigatório, **até 150 caracteres** e **único** (sem diferenciar acentos, maiúsculas nem espaços nas pontas), comparado com todas as categorias, gravadas ou novas, ativas ou inativas. Nome repetido mostra "Já existe uma categoria com este nome". Não aceita quebra de linha nem tabulação |
| Descrição | Opcional, até 500 caracteres. Resumo dos assuntos da categoria |

Uma categoria nova é criada **ativa, no fim da lista**.

## Perguntas

A área da direita lista as perguntas da categoria selecionada, em ordem. Cada uma mostra:
- a posição;
- o título curto, a descrição curta e o texto completo;
- o estado (Ativa/Inativa) e os selos **"Exige atendimento presencial"** ou **"Fora do escopo do PROCON"**;
- a base legal e a quantidade de documentos úteis;
- **"Última alteração por [nome] em [data]"**. Itens sem autor (carga inicial) mostram **"Carga inicial do sistema"**, sem data. Pergunta ainda não salva não mostra essa linha.

**Ações:** reordenar (↑↓), **Ativar/Desativar**, **Editar**, **Nova pergunta**.

Uma pergunta nova entra **no fim da lista** da categoria, **ativa** e com **"Permitir complemento por IA"** ligada.

### Busca

Campo que procura no texto da pergunta, no texto da resposta e no título curto **em todas as categorias**, sem diferenciar maiúsculas nem acentos, mostrando a categoria de cada resultado. A busca considera as alterações ainda não salvas. Durante a busca, as setas de reordenar somem.

### Listas com mais de 10 itens

O WhatsApp mostra no máximo 10 itens por lista. Com mais de 10 itens ativos (categorias, ou perguntas numa categoria), **o chatbot mostra a lista em páginas**:
- página 1: 9 itens + "Ver mais opções";
- páginas do meio: 8 itens + "Voltar" + "Ver mais opções";
- última página: até 9 itens + "Voltar".

A tela mostra essa informação e marca, com um separador **"Página N no WhatsApp"**, no início de cada página a partir da segunda. Só itens ativos contam (nas categorias, só as ativas que têm pergunta ativa). É informação, não erro: listas curtas são mais fáceis para o cidadão.

### Formulário da pergunta

| Campo | Regra |
|---|---|
| Título curto (lista do WhatsApp) | **Obrigatório, até 24 caracteres**, com contador. Não aceita quebra de linha nem tabulação |
| Descrição curta | Opcional, até 72 caracteres. Não aceita quebra de linha nem tabulação |
| Texto da pergunta | Obrigatório, **até 500 caracteres**, com contador sempre visível |
| Resposta | Obrigatória, **até 3.000 caracteres**, com contador. **A partir de 1.000**, alerta: "Respostas longas ficam difíceis de ler no celular", que não impede salvar |
| Base legal | Opcional, até 500 caracteres. Ex.: "CDC, art. 49" |
| Documentos úteis para esta dúvida | Lista opcional de até 30 itens, cada um obrigatório e de até 255 caracteres. São somados à lista de documentos do agendamento. Um documento repetido na mesma pergunta (sem diferenciar acentos nem maiúsculas) mostra o aviso "Este documento já está na lista." e **não impede salvar** |
| Exige atendimento presencial | O chatbot **oferece agendamento direto**, sem perguntar se a dúvida foi resolvida. Tem uma observação opcional sobre o atendimento presencial (até 500 caracteres), que só existe com a opção marcada e é descartada se ela for desmarcada |
| Fora do escopo do PROCON | A resposta orienta a procurar outro órgão. **Nunca oferece agendamento** |
| Permitir complemento por IA nesta pergunta | Ligada por padrão. Desligada: o chatbot envia só o texto oficial |
| Pergunta ativa no chatbot | Convive com "Ativar/Desativar" da lista e mexe no mesmo valor. No formulário, a mudança só vale quando o formulário é confirmado |

Regras entre os campos:
- **"Exige atendimento presencial" e "Fora do escopo" são mutuamente exclusivos.** Marcar um desabilita o outro.
- **Perguntas fora do escopo nunca usam IA.** A opção fica desligada e desabilitada. Ao desmarcar "Fora do escopo", a IA volta ligada.
- Ao editar uma pergunta existente, aparece a orientação: **"Para mudar o assunto da pergunta, desative-a e crie uma nova, para não alterar o histórico dos relatórios."** Não é possível mover uma pergunta para outra categoria.

### "Ver como o cidadão recebe"

Prévia no estilo WhatsApp, com o que está no formulário, **mesmo antes de salvar**. Não grava nada e não gera IA de verdade (usa texto de exemplo). Os textos, rótulos e botões da prévia são os que o bot envia e chegam pela API; o painel não escreve nem inventa esses textos.

1. A **lista da categoria**, com a pergunta editada em negrito e a navegação de página quando houver paginação.
2. **Com "Permitir complemento por IA" ligada, um balão único** com a explicação escrita pela IA (exemplo), a base legal, os documentos, "O que fazer agora", o aviso de caráter não vinculante, a pergunta do passo seguinte com os botões e o rótulo "Gerado com auxílio de IA" no rodapé desse balão ([decisão 009](../decisoes/009-complemento-por-llm.md), item 6). Com a IA ligada, a prévia mostra também a alternativa **"Se a IA estiver indisponível"**, com os balões 3 e 4.
3. **Com a opção desligada, nas perguntas dentro do escopo, o balão da resposta oficial**, com os mesmos blocos que o bot envia: Categoria, Pergunta, Base legal, Resposta, Documentos necessários, "O que fazer agora", a linha de atendimento presencial quando houver e, **no fim do mesmo balão, o aviso de caráter não vinculante**. É também o que o cidadão recebe quando a IA não pode ser usada. Perguntas fora do escopo: pendente (D-U-05).
4. **Depois do balão oficial, um balão separado** com o passo seguinte:
   - a pergunta de se a dúvida foi resolvida (Sim/Não), para perguntas comuns;
   - a oferta de agendamento, com os botões **"Agendar presencial"** (decisão do usuário, vale mesmo antes do alinhamento com o bot) e "Agora não", para as que exigem atendimento presencial;
   - fora do escopo: pendente (D-U-05).

Uma pergunta numa **categoria nova ainda não salva** mostra só a lista, com o aviso "Esta categoria ainda não foi salva. Salve para que o cidadão a veja." e "A prévia completa fica disponível depois de salvar".

**Pendente (alinhamento da prévia com o bot, D-U-04, D-U-05 e D-U-06 da especificação da #124):** texto exato do balão com IA, textos do passo seguinte, rótulos de navegação da lista, tratamento das perguntas fora do escopo e se a observação sobre o atendimento presencial aparece ao cidadão. Até a decisão, vale o que a API devolve, exceto o botão "Agendar presencial", que já está decidido.

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

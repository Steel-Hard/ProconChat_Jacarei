# Conteúdo do chatbot

## Para que serve

Manter as categorias e perguntas que o cidadão navega no WhatsApp, com as respostas oficiais do PROCON.

## Quem acessa

**Gerenciar conteúdo do chatbot** (`content.manage` ou Administrador).

## Estado da tela

**Pronta (API no backend na issue #63, tela no painel na issue #124).** O conteúdo inicial vem da carga idempotente do sistema (`db/seeds/content.seed.ts`) e qualquer item editado pelo painel passa a ter `updated_by` preenchido, sendo preservado em execuções seguintes do seed.

## Como o conteúdo funciona

- O cidadão **escolhe uma categoria** e **depois uma pergunta**, tocando nas opções. É uma lista em dois níveis, **não uma árvore** com ramificações ([decisão 001](../decisoes/001-fluxo-guiado-por-categorias.md)).
- **A ordem das listas na tela é a ordem que o cidadão vê** no WhatsApp.
- **Nada é excluído, só desativado.**

No topo, um bloco fixo, sem botão, campo ou ação de edição e sem selo, mostra o aviso obrigatório. Antes do texto vem o rótulo **"Aviso obrigatório, ao final de todas as respostas:"** e, depois dele, a nota **"Este aviso não é configurável."**. Entre o rótulo e a nota, só o texto oficial do aviso:

> "Esta é uma orientação automatizada de caráter informativo. Ela não é vinculante e não substitui o atendimento jurídico ou administrativo formal do PROCON Jacareí."

Categorias e perguntas ficam em duas caixas lado a lado, com filetes só dentro da caixa de perguntas. "Salvar alterações", "Descartar" e o contador, assim como a última alteração, continuam no topo da tela, sem barra fixa.

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

A coluna da esquerda lista as categorias em ordem, de forma compacta. Cada uma mostra:
- a posição;
- o **título curto** (em negrito, é o que aparece no WhatsApp) e o nome completo;
- quantas perguntas tem e quantas estão ativas;
- o estado, em um selo à direita: **Ativa**, **Inativa**, ou **Ativa · oculta no chatbot**. Esta última aparece quando a categoria está ativa mas **não tem nenhuma pergunta ativa**. Nesse caso ela não aparece para o cidadão, e o selo tem um ícone "i" com a dica "Categorias só aparecem ao cidadão quando têm ao menos uma pergunta ativa" (ao passar o mouse, focar pelo teclado ou tocar).

**Ações na linha:** só as setas de reordenar (↑↓), empilhadas. Clicar, tocar ou acionar a linha pelo teclado seleciona a categoria. **Nova categoria** continua disponível na coluna de categorias.

**Ações no cabeçalho da categoria selecionada** (painel de perguntas, que mostra o nome e o estado dela): **Editar categoria**, **Desativar categoria** (ou **Ativar categoria**, quando ela está inativa) e **Nova pergunta**, nessa ordem. Ativar/desativar muda só o rascunho e não muda o estado das perguntas. Durante a busca, o cabeçalho continua completo, com "Editar categoria" e "Desativar categoria"; só "Nova pergunta" fica desabilitada, com uma dica explicando o motivo. Sem nenhuma categoria, o cabeçalho não aparece e a tela mostra o estado vazio com "Nova categoria".

**Formulário da categoria** (abre num diálogo central estreito, ver "Formulários"):

| Campo | Regra |
|---|---|
| Título curto | **Obrigatório, até 24 caracteres**, com contador. É o limite das listas do WhatsApp. Não aceita quebra de linha nem tabulação |
| Nome completo | Obrigatório, **até 150 caracteres** e **único** (sem diferenciar acentos, maiúsculas nem espaços nas pontas), comparado com todas as categorias, gravadas ou novas, ativas ou inativas. Nome repetido mostra "Já existe uma categoria com este nome". Não aceita quebra de linha nem tabulação |
| Descrição | Opcional, até 500 caracteres. Resumo dos assuntos da categoria |

Uma categoria nova é criada **ativa, no fim da lista**.

## Perguntas

A área da direita lista as perguntas da categoria selecionada, em ordem. Abaixo do cabeçalho da categoria vem a busca, e depois a lista. Cada pergunta mostra:
- a posição;
- o título curto, em negrito, com a descrição curta ao lado, e o texto completo abaixo;
- o estado (Ativa/Inativa) e os selos **"Exige atendimento presencial"** (tom lilás) ou **"Fora do escopo do PROCON"** (tom âmbar);
- a base legal e a quantidade de documentos úteis;
- **"Última alteração por [nome] em [data]"**. Itens sem autor (carga inicial) mostram **"Carga inicial do sistema"**, sem data. Pergunta ainda não salva não mostra essa linha.

**Ações na linha:** reordenar (↑↓, fora da busca), **Desativar** (ou **Ativar**, na pergunta inativa) e **Editar**, nessa ordem. **Nova pergunta** fica no cabeçalho da categoria selecionada.

Uma pergunta nova entra **no fim da lista** da categoria, **ativa** e com **"Permitir complemento por IA"** ligada. A equipe pode desmarcar **"Pergunta ativa no chatbot"** antes de salvar, e a pergunta nasce inativa.

O que ainda não foi salvo leva um selo, um por item: **"Não salva"** no item novo e **"Alteração não salva"** no item existente com mudança pendente. O selo some se a mudança for desfeita.

### Busca

Campo, dentro do painel de perguntas, logo abaixo do cabeçalho da categoria, com o botão **Limpar** enquanto houver termo. Procura no texto da pergunta, no texto da resposta e no título curto **em todas as categorias**, sem diferenciar maiúsculas nem acentos, mostrando a categoria de cada resultado. A busca considera as alterações ainda não salvas. Durante a busca, as setas de reordenar somem.

### Listas com mais de 10 itens

O WhatsApp mostra no máximo 10 itens por lista. Com mais de 10 itens ativos (categorias, ou perguntas numa categoria), **o chatbot mostra a lista em páginas**:
- página 1: 9 itens + "Ver mais opções";
- páginas do meio: 8 itens + "Voltar" + "Ver mais opções";
- última página: até 9 itens + "Voltar".

A tela mostra essa informação e marca, com um separador **"Página N no WhatsApp"**, no início de cada página a partir da segunda. Só itens ativos contam (nas categorias, só as ativas que têm pergunta ativa). É informação, não erro: listas curtas são mais fáceis para o cidadão.

### Formulários

O formulário da **pergunta** abre num **painel lateral**, com rodapé fixo: **Cancelar**, **Salvar pergunta** (que só leva os valores ao rascunho) e **Ver como o cidadão recebe**. No celular o painel ocupa a largura da tela.

O formulário da **categoria** abre num **diálogo central estreito**, com **Cancelar** e **Salvar categoria**.

Nos dois, o foco fica dentro do formulário, o fundo não recebe foco nem clique e não rola, e o Esc e o Cancelar pedem confirmação quando há mudanças.

### Formulário da pergunta

| Campo | Regra |
|---|---|
| Título curto (lista do WhatsApp) | **Obrigatório, até 24 caracteres**, com contador. Não aceita quebra de linha nem tabulação |
| Descrição curta | Opcional, até 72 caracteres. Não aceita quebra de linha nem tabulação |
| Texto da pergunta | Obrigatório, **até 500 caracteres**, com contador sempre visível |
| Resposta | Obrigatória, **até 3.000 caracteres**, com contador. **A partir de 1.000**, alerta: "Respostas longas ficam difíceis de ler no celular", que não impede salvar. Aceita os marcadores `{endereco}` e `{horarios}`, substituídos automaticamente no envio pelo bot e na prévia pelo endereço (com complemento entre parênteses, quando houver) e pelos horários de atendimento da configuração vigente hoje (#78) |
| Base legal | Opcional, até 500 caracteres. Ex.: "CDC, art. 49" |
| Documentos úteis para esta dúvida | Lista opcional de até 30 itens, cada um obrigatório e de até 255 caracteres. Adicionar com o campo vazio não acrescenta nada e mostra o aviso "Informe o documento.". São somados à lista de documentos do agendamento. Um documento repetido na mesma pergunta (sem diferenciar acentos nem maiúsculas) mostra o aviso "Este documento já está na lista." e **não impede salvar** |
| Exige atendimento presencial | O chatbot **oferece agendamento direto**, sem perguntar se a dúvida foi resolvida. Tem uma observação opcional sobre o atendimento presencial (até 500 caracteres), que o cidadão recebe na resposta, só existe com a opção marcada e é descartada se ela for desmarcada |
| Fora do escopo do PROCON | A resposta orienta a procurar outro órgão. **Nunca oferece agendamento** |
| Permitir complemento por IA nesta pergunta | Ligada por padrão. Desligada: o chatbot envia só o texto oficial |
| Pergunta ativa no chatbot | Convive com "Ativar/Desativar" da linha da pergunta e mexe no mesmo valor. No formulário, a mudança só vale quando o formulário é confirmado |

Regras entre os campos:
- **"Exige atendimento presencial" e "Fora do escopo" são mutuamente exclusivos.** Marcar um desabilita o outro.
- **Perguntas fora do escopo nunca usam IA.** A opção fica desligada e desabilitada. Ao desmarcar "Fora do escopo", a IA volta ligada.
- O botão **Cancelar** do formulário, assim como a tecla Esc, pede confirmação quando há mudanças no formulário.
- Ao editar uma pergunta existente, aparece a orientação: **"Para mudar o assunto da pergunta, desative-a e crie uma nova, para não alterar o histórico dos relatórios."** Não é possível mover uma pergunta para outra categoria.

### "Ver como o cidadão recebe"

Prévia no estilo WhatsApp, em uma **janela própria em formato de celular**, aberta por cima do painel do formulário, com o que está no formulário, **mesmo antes de salvar**. Os botões das mensagens aparecem em duas colunas. Ao abrir, o foco vai para a janela e o painel por trás fica bloqueado. O Esc fecha só a prévia, e o foco volta ao botão "Ver como o cidadão recebe". Não há balão verde nem horário nos balões. Não grava nada e não gera IA de verdade (usa texto de exemplo). **Os textos, botões e a ordem dos balões são exatamente os que o bot envia**, montados pelo mesmo código que monta as mensagens do bot. O painel não guarda cópia desses textos.

1. A **lista da categoria**, como o bot envia: cabeçalho "Escolha uma das perguntas abaixo:", botão "Ver perguntas", linhas com título curto e descrição curta, com a pergunta editada em negrito, e as linhas "Voltar opções" e "Ver mais opções" quando houver outra página.
2. **Com "Permitir complemento por IA" ligada, um balão único** com a explicação escrita pela IA (texto de exemplo), a base legal, os documentos, "O que fazer agora", a linha de atendimento presencial quando houver, o aviso de caráter não vinculante, a pergunta do passo seguinte com os botões e o rótulo "Gerado com auxílio de IA" no rodapé desse balão ([decisão 009](../decisoes/009-complemento-por-llm.md), item 6). Com a IA ligada, a prévia mostra também a alternativa **"Se a IA estiver indisponível"**, com os balões 3 e 4.
3. **Com a opção desligada, o balão da resposta oficial**, com os mesmos blocos que o bot envia: Categoria, Pergunta, Base legal, Resposta, Documentos necessários, "O que fazer agora", a linha de atendimento presencial quando houver e, **no fim do mesmo balão, o aviso de caráter não vinculante**. É também o que o cidadão recebe quando a IA não pode ser usada.
4. **Depois do balão oficial, um balão separado** com o passo seguinte:
   - perguntas comuns: "A dúvida foi resolvida?", com os botões "Sim" e "Não";
   - perguntas que exigem atendimento presencial: "Deseja agendar um atendimento presencial no PROCON Jacareí?", com os botões "Agendar presencial" e "Agora não".

**Pergunta fora do escopo:** o balão oficial traz a resposta escrita pela equipe, a base legal e os documentos úteis (quando houver) e o aviso no fim, **sem "O que fazer agora:"**. Depois vem um balão separado, sem botões e sem oferta de agendamento, com a frase "Como esta demanda não compete ao PROCON, dirija-se ao órgão indicado na orientação acima portando seus documentos e comprovantes para atendimento especializado." Não usa IA.

**Observação sobre o atendimento presencial:** quando a pergunta exige atendimento presencial e a observação está preenchida, o cidadão a recebe no balão da resposta (oficial e com IA), logo depois da linha "Esta situação pode exigir atendimento presencial no PROCON Jacareí para andamento formal.", na forma "Sobre o atendimento presencial: [observação]". Não é repetida na oferta de agendamento e não é enviada à IA. Observação vazia não gera linha.

Se, com o complemento por IA, o balão com IA passaria de **1.024 caracteres** (limite do WhatsApp para mensagens com botões), a prévia avisa: "Com o complemento por IA, esta mensagem passaria de 1.024 caracteres. Neste caso o bot envia só a resposta oficial." O texto do aviso vem da API.

Uma pergunta numa **categoria nova ainda não salva** mostra só a lista, com o aviso "Esta categoria ainda não foi salva. Salve para que o cidadão a veja." e "A prévia completa fica disponível depois de salvar". Nesse caso a lista sai do rascunho, sem os rótulos do bot (cabeçalho, botão e navegação).

## O que não existe de propósito

| O que não existe | Por quê |
|---|---|
| Excluir categoria ou pergunta | Os relatórios e o histórico das conversas apontam para elas |
| Árvore de decisão com ramificações | O modelo segue o material do PROCON, que é um FAQ ([decisão 001](../decisoes/001-fluxo-guiado-por-categorias.md)) |
| Editar o aviso de caráter não vinculante | É obrigatório (RNF04) e tem um texto único no sistema |
| Mover pergunta para outra categoria | Não foi pedido. Para mudar, desative e crie na outra categoria |

## Relações

- Se horário ou endereço da unidade mudarem em [Horários de atendimento](08-horarios-de-atendimento.md), as respostas que usam os marcadores `{horarios}` e `{endereco}` refletem automaticamente os novos valores; perguntas com horário ou endereço escritos em texto fixo continuam precisando de revisão manual.
- Complemento por IA: [decisão 009](../decisoes/009-complemento-por-llm.md).

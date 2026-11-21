# Tela de Conteúdo do chatbot no painel (#124)

> Status: em-andamento
> Tipo: funcionalidade
> Tamanho: grande
> Branch: feat/124-tela-conteudo-v2
> Criada em: 2026-11-20

## Objetivo

Hoje as categorias, perguntas e respostas que o cidadão navega no WhatsApp só podem ser alteradas pela carga inicial do sistema (seed). A tela de Conteúdo vai permitir que a equipe do PROCON mantenha esse material pelo painel: criar, editar, ativar/desativar e reordenar categorias e perguntas, buscar em todo o conteúdo, ver onde começa cada página da lista no WhatsApp e ver uma prévia de como o cidadão recebe a resposta.

Por decisão do usuário, a tela segue o padrão das telas de configuração (Horários, Documentos): as alterações ficam pendentes até "Salvar alterações", com contador de alterações não salvas e "Descartar". Hoje o item "Conteúdo" do menu leva a uma página "Em construção." e nunca aparece para quem só tem essa permissão.

## Regras

| ID | Regra | Fonte |
|---|---|---|
| RN-01 | Só acessa a tela quem tem a permissão "Gerenciar conteúdo do chatbot" ou a conta Admin. Sem permissão, o item não aparece no menu. A validação final é sempre no servidor. | product-owner; regras gerais §2 |
| RN-02 | Nada é excluído, só ativado ou desativado. A ordem das listas na tela é a ordem que o cidadão vê no WhatsApp. | product-owner; regra de Conteúdo |
| RN-03 | O topo da tela mostra um bloco fixo, que não pode ser editado, com o aviso (RNF04): "Esta é uma orientação automatizada de caráter informativo. Ela não é vinculante e não substitui o atendimento jurídico ou administrativo formal do PROCON Jacareí." | product-owner; regras gerais §7 |
| RN-04 | Toda alteração (criar, editar, ativar/desativar, reordenar) fica pendente até "Salvar alterações". Enquanto houver pendências aparece "N alterações não salvas", com a lista do que mudou ao passar o mouse ou tocar. "Descartar" desfaz todas as pendências. A regra geral do painel passa a incluir Conteúdo entre as telas de configuração. Sair da tela com pendências não gera aviso, igual a Horários e Documentos. | usuário (decisão confirmada) |
| RN-05 | O contador compara com o que está gravado, e não conta ações: há uma entrada por item novo (criado e depois editado continua sendo uma só), uma por item existente com algum campo diferente, uma por item cujo estado mudou e uma por lista reordenada (reordenar a mesma lista várias vezes conta uma). Uma mudança que volta ao valor gravado deixa de contar, e voltar à ordem gravada deixa de contar. | product-owner |
| RN-06 | O servidor grava cada item separadamente, então o Salvar envia as alterações uma a uma. Se uma falhar, o envio para ali, o que já foi gravado fica gravado e deixa de contar como pendente, a tela recarrega, o que faltou continua pendente e um novo Salvar nunca cria de novo um item que já foi criado. | product-owner |
| RN-07 | Mensagens do Salvar com falha. Falha depois de alguma gravação: "Algumas alterações foram salvas e outras não. Revise o que ainda está pendente e salve de novo.", acompanhada de quantas alterações foram salvas e quantas faltam. Falha já na primeira gravação: "Não foi possível salvar. Nenhuma alteração foi gravada. Tente de novo." | product-owner |
| RN-08 | Duas pessoas editando ao mesmo tempo: vale o último Salvar. Se a reordenação for recusada porque o servidor mudou nesse meio tempo, a tela recarrega e mostra o erro. | usuário |
| RN-09 | A lista de categorias mostra a posição, o título curto (em negrito), o nome completo, quantas perguntas a categoria tem e quantas estão ativas, e o estado: "Ativa", "Inativa" ou "Ativa · oculta no chatbot". O último estado aparece quando a categoria está ativa e não tem nenhuma pergunta ativa. | product-owner |
| RN-10 | Uma categoria nova é criada ativa, no fim da lista. | product-owner |
| RN-11 | Formulário da categoria: título curto obrigatório, até 24 caracteres, com contador. Nome completo obrigatório, até 150 caracteres, único sem diferenciar acentos nem maiúsculas. Nome repetido mostra "Já existe uma categoria com este nome". Descrição opcional, até 500 caracteres. Título curto e nome não aceitam quebra de linha nem tabulação. | product-owner; limites e caracteres da API |
| RN-12 | Ações na lista de categorias: reordenar (↑↓), "Nova categoria", "Editar categoria", "Ativar/Desativar". | product-owner |
| RN-13 | A lista de perguntas da categoria selecionada mostra a posição, o título curto, a descrição curta, o texto da pergunta, o estado (Ativa/Inativa), os selos "Exige atendimento presencial" ou "Fora do escopo do PROCON", a base legal, a quantidade de documentos úteis e "Última alteração por [nome] em [data]", com data no formato dd/mm/aaaa. Itens sem autor (carga inicial) mostram "Carga inicial do sistema", sem data, porque a API não informa a data de criação. | product-owner; regras gerais §9 |
| RN-14 | O topo da tela mostra a última alteração do item alterado mais recentemente pelo painel, entre categorias e perguntas: "Última alteração por [nome] em [data]". Se nenhum item tiver autor, mostra "Ainda não alterado pelo painel". | product-owner |
| RN-15 | Uma pergunta nova entra no fim da lista da categoria, nasce ativa e com "Permitir complemento por IA" ligada. | product-owner |
| RN-16 | Formulário da pergunta: título curto obrigatório, até 24 caracteres, com contador. Descrição curta opcional, até 72 caracteres. Texto da pergunta obrigatório, até 500 caracteres, com contador sempre visível. Resposta obrigatória, até 3.000 caracteres, com contador. A partir de 1.000 caracteres aparece o alerta "Respostas longas ficam difíceis de ler no celular", que não impede salvar. Título curto e descrição curta não aceitam quebra de linha nem tabulação. | product-owner; limites e caracteres da API |
| RN-17 | Base legal: opcional, até 500 caracteres (ex.: "CDC, art. 49"). Documentos úteis para esta dúvida: lista opcional de até 30 itens, cada um com texto obrigatório de até 255 caracteres. Observação sobre o atendimento presencial: opcional, até 500 caracteres, só existe quando "Exige atendimento presencial" está marcada. | regra de Conteúdo; limites da API |
| RN-18 | Documento útil repetido na mesma pergunta, sem diferenciar acentos nem maiúsculas, gera o aviso "Este documento já está na lista." e não impede salvar. | usuário |
| RN-19 | "Exige atendimento presencial" e "Fora do escopo do PROCON" são mutuamente exclusivos: marcar um desabilita o outro. | product-owner |
| RN-20 | Pergunta fora do escopo nunca usa IA: "Permitir complemento por IA" fica desligada e desabilitada. Ao desmarcar "Fora do escopo", a IA volta ligada. | product-owner |
| RN-21 | Ao editar uma pergunta existente aparece a orientação "Para mudar o assunto da pergunta, desative-a e crie uma nova, para não alterar o histórico dos relatórios.". Não é possível mover uma pergunta para outra categoria. | product-owner |
| RN-22 | O campo "Pergunta ativa no chatbot" do formulário e a ação "Ativar/Desativar" da lista convivem e mexem no mesmo valor pendente. No formulário, a mudança só vale quando o formulário é confirmado. | product-owner |
| RN-23 | A busca procura no texto da pergunta, no texto da resposta e no título curto, em todas as categorias, sem diferenciar acentos nem maiúsculas, considera as alterações não salvas e mostra a categoria de cada resultado. Durante a busca as setas de reordenar somem. Para isso, a tela carrega as perguntas de todas as categorias ao abrir. | product-owner; usuário (carga) |
| RN-24 | Com mais de 10 itens ativos numa lista, o WhatsApp mostra a lista em páginas: página 1 com 9 itens e "Ver mais opções"; páginas do meio com 8 itens, "Voltar" e "Ver mais opções"; última página com até 9 itens e "Voltar". A tela marca o início de cada página a partir da segunda com o separador "Página N no WhatsApp". Só itens ativos contam (nas categorias, só as ativas com pergunta ativa). É informação, não erro. | product-owner |
| RN-25 | "Ver como o cidadão recebe" mostra uma prévia no estilo WhatsApp com o que está no formulário, mesmo antes de salvar, sem gravar nada e sem gerar IA de verdade (usa texto de exemplo). | product-owner |
| RN-26 | Os textos, rótulos, botões e formatos da prévia são os que o bot realmente envia e chegam ao painel pela prévia da API. O painel não escreve nem inventa cópia desses textos. Onde a prévia da API diverge do bot, vale o que está em "Prévia: API x bot real" e nas Dúvidas. | usuário |
| RN-27 | Composição da prévia: (1) a lista da categoria, com a pergunta em negrito e a navegação de página quando houver; (2) com IA ligada, o balão único com IA, como o bot envia; (3) com IA desligada, o balão da resposta oficial com o aviso no fim; (4) depois dele, o balão do passo seguinte com os botões. Com IA ligada, a prévia também mostra a alternativa "Se a IA estiver indisponível", com os balões (3) e (4). O botão de aceitar a oferta de agendamento é "Agendar presencial". Fora do escopo: ver D-U-05. | product-owner; usuário (botão); decisão 009 |
| RN-28 | Pergunta numa categoria nova ainda não salva: a lista (1) sai do rascunho, com o aviso "Esta categoria ainda não foi salva. Salve para que o cidadão a veja.". Como a prévia da API exige categoria gravada, os balões (2) a (4) não aparecem e a prévia mostra "A prévia completa fica disponível depois de salvar". | product-owner |

## Critérios de aceite

Acesso e menu

- CA-01 QUANDO uma conta sem "Gerenciar conteúdo do chatbot" e que não é Admin usa o painel ENTÃO o sistema DEVE esconder "Conteúdo" do menu e, se o endereço da tela for aberto direto, DEVE repetir o que as outras telas sem permissão fazem hoje: página não encontrada, se a conta tem alguma outra tela pronta permitida; aviso de "sem acesso", se a conta não tem nenhuma tela pronta permitida. (RN-01)
- CA-02 QUANDO uma conta com "Gerenciar conteúdo do chatbot", ou a Admin, abre o painel ENTÃO o sistema DEVE mostrar "Conteúdo" no grupo Chatbot do menu e abrir a tela de Conteúdo, e não mais "Em construção.". (RN-01)
- CA-03 QUANDO uma conta que só tem "Gerenciar conteúdo do chatbot" entra no painel ENTÃO o sistema DEVE levá-la direto para a tela de Conteúdo, e não para o aviso de "sem acesso". (RN-01)
- CA-04 QUANDO alguém abre a tela de Usuários ENTÃO a permissão "Gerenciar conteúdo do chatbot" DEVE passar a aparecer entre as permissões que podem ser marcadas, porque a tela ficou pronta. (RN-01)
- CA-05 QUANDO quem tem a permissão vê o aviso de revisar o Conteúdo na tela de Horários ENTÃO o link "Revisar Conteúdo →" DEVE aparecer e abrir a tela de Conteúdo. (RN-01)
- CA-06 QUANDO o servidor recusa uma chamada por falta de permissão durante o uso ou no Salvar ENTÃO o sistema DEVE mostrar a mensagem de sem permissão e não DEVE dar como gravado o que não foi. (RN-01, RN-06)

Bloco fixo e última alteração

- CA-07 QUANDO a tela abre ENTÃO o topo DEVE mostrar o bloco fixo com o texto do aviso exatamente igual ao de RN-03, sem nenhum botão, campo ou ação de edição. (RN-03)
- CA-08 QUANDO há itens alterados pelo painel ENTÃO o topo DEVE mostrar "Última alteração por [nome] em [data]" do item com a alteração mais recente entre categorias e perguntas. QUANDO nenhum item tem autor ENTÃO DEVE mostrar "Ainda não alterado pelo painel". (RN-14)

Alterações pendentes, Salvar e Descartar

- CA-09 QUANDO qualquer alteração é feita (criar, editar, ativar/desativar, reordenar) ENTÃO o sistema não DEVE gravar nada no servidor, DEVE mostrar "N alterações não salvas" e, ao passar o mouse ou tocar, a lista do que mudou. (RN-04)
- CA-10 QUANDO uma alteração volta ao valor gravado (↑ seguido de ↓ no mesmo item, desativar e ativar de novo, editar e voltar ao texto gravado, reordenar e voltar à ordem gravada) ENTÃO ela DEVE deixar de contar, e o contador DEVE zerar quando tudo voltar ao estado gravado. (RN-05)
- CA-11 QUANDO um item é criado e depois editado antes de salvar ENTÃO ele DEVE contar uma vez só. QUANDO a mesma lista é reordenada várias vezes ENTÃO DEVE contar uma vez só. (RN-05)
- CA-12 QUANDO "Descartar" é acionado ENTÃO o sistema DEVE desfazer todas as pendências, inclusive categorias e perguntas novas ainda não salvas, e voltar ao estado gravado. (RN-04)
- CA-13 QUANDO não há alterações pendentes ENTÃO "Salvar alterações" DEVE ficar desabilitado e "Descartar" não DEVE aparecer. (RN-04)
- CA-14 QUANDO "Salvar alterações" termina sem erro ENTÃO tudo DEVE estar gravado na ordem e com os estados do rascunho, o contador DEVE zerar, um aviso de sucesso DEVE aparecer e as listas DEVEM mostrar os dados atualizados do servidor, inclusive a nova "Última alteração". (RN-04, RN-02)
- CA-15 QUANDO o Salvar está em andamento ENTÃO "Salvar alterações" e "Descartar" DEVEM ficar desabilitados e um segundo clique não DEVE enviar nada de novo. (RN-04)
- CA-16 QUANDO uma gravação falha depois de outras terem dado certo ENTÃO o sistema DEVE parar o envio, recarregar, mostrar "Algumas alterações foram salvas e outras não. Revise o que ainda está pendente e salve de novo." com quantas alterações foram salvas e quantas faltam, tirar do contador o que já foi gravado e manter pendente o que faltou. (RN-06, RN-07)
- CA-17 QUANDO a primeira gravação do Salvar falha ENTÃO o sistema DEVE mostrar "Não foi possível salvar. Nenhuma alteração foi gravada. Tente de novo." e manter todas as pendências. (RN-07)
- CA-18 QUANDO, depois de uma falha parcial, "Salvar alterações" é acionado de novo ENTÃO nenhuma categoria ou pergunta já criada na tentativa anterior DEVE ser criada outra vez. (RN-06)
- CA-19 QUANDO outra categoria é selecionada ou uma busca é feita ENTÃO as alterações pendentes das outras categorias DEVEM continuar no rascunho e no contador. (RN-04)
- CA-20 QUANDO o rascunho tem algum item com campo inválido ENTÃO "Salvar alterações" não DEVE enviar nada e o sistema DEVE apontar o item com problema. (RN-11, RN-16, RN-17)
- CA-21 QUANDO a reordenação é recusada porque outra pessoa mudou o conteúdo nesse meio tempo ENTÃO a tela DEVE recarregar, mostrar o erro e manter pendente o que não foi gravado. (RN-08)
- CA-22 QUANDO a pessoa sai da tela com alterações pendentes ENTÃO o sistema não DEVE mostrar aviso, igual a Horários e Documentos. (RN-04)

Categorias

- CA-23 QUANDO a lista de categorias aparece ENTÃO cada linha DEVE mostrar posição, título curto em negrito, nome completo, quantidade de perguntas e de perguntas ativas e o estado, calculados com as alterações pendentes. (RN-09)
- CA-24 QUANDO uma categoria está ativa e não tem nenhuma pergunta ativa (contando as alterações pendentes) ENTÃO o estado DEVE ser "Ativa · oculta no chatbot". (RN-09)
- CA-25 QUANDO uma categoria nova é confirmada no formulário ENTÃO ela DEVE aparecer no fim da lista, ativa, como alteração pendente. (RN-10)
- CA-26 QUANDO o título curto da categoria fica vazio ou passa de 24 caracteres ENTÃO o sistema DEVE mostrar o erro e não aceitar o formulário; com exatamente 24 DEVE aceitar. O contador DEVE mostrar quantos caracteres foram usados do limite de 24. (RN-11)
- CA-27 QUANDO o nome completo fica vazio, passa de 150 caracteres ou é igual ao de outra categoria, gravada ou nova, ativa ou inativa, sem diferenciar acentos, maiúsculas e espaços nas pontas (ex.: "Contratos" e "contrátos ") ENTÃO o sistema DEVE mostrar o erro, com "Já existe uma categoria com este nome" no caso de repetição, e não aceitar o formulário. (RN-11)
- CA-28 QUANDO título curto ou nome contêm quebra de linha ou tabulação, ou a descrição passa de 500 caracteres ENTÃO o sistema DEVE mostrar o erro e não aceitar o formulário. A descrição vazia DEVE ser aceita. (RN-11)
- CA-29 QUANDO "Ativar/Desativar" é acionado numa categoria ENTÃO o estado DEVE mudar só no rascunho e as perguntas dela não DEVEM mudar de estado. (RN-02, RN-12)
- CA-30 QUANDO ↑ ou ↓ é acionado ENTÃO a categoria DEVE trocar de lugar com a vizinha. A primeira não DEVE ter ↑ e a última não DEVE ter ↓. Depois de salvar, a ordem gravada DEVE ser a da tela. (RN-02, RN-12)
- CA-31 QUANDO não existe nenhuma categoria ENTÃO a tela DEVE mostrar um estado vazio com a ação "Nova categoria". (RN-12)

Perguntas

- CA-32 QUANDO uma categoria é selecionada ENTÃO a área de perguntas DEVE listar as perguntas dela na ordem, cada uma com os dados de RN-13. Pergunta ainda não salva não DEVE mostrar a linha de última alteração. Pergunta sem autor DEVE mostrar "Carga inicial do sistema". (RN-13)
- CA-33 QUANDO uma pergunta nova é confirmada no formulário ENTÃO ela DEVE entrar no fim da lista da categoria selecionada, ativa e com IA ligada, como alteração pendente. (RN-15)
- CA-34 QUANDO o título curto da pergunta fica vazio ou passa de 24 caracteres, a descrição curta passa de 72, o texto da pergunta fica vazio ou passa de 500, ou a resposta fica vazia ou passa de 3.000 ENTÃO o sistema DEVE mostrar o erro e não aceitar o formulário. Nos limites exatos (24, 72, 500, 3.000) DEVE aceitar. O contador do texto da pergunta DEVE estar sempre visível. (RN-16)
- CA-35 QUANDO a resposta tem 999 caracteres ENTÃO o alerta não DEVE aparecer; com 1.000 ou mais DEVE aparecer "Respostas longas ficam difíceis de ler no celular", sem impedir de confirmar. O contador DEVE mostrar quantos caracteres foram usados do limite de 3.000. (RN-16)
- CA-36 QUANDO a base legal passa de 500 caracteres, a lista de documentos passa de 30 itens, um documento fica vazio ou passa de 255 caracteres, ou a observação presencial passa de 500 ENTÃO o sistema DEVE mostrar o erro e não aceitar o formulário. (RN-17)
- CA-37 QUANDO um documento útil igual a outro da mesma pergunta é informado (ex.: "Nota fiscal" e "nota físcal") ENTÃO o sistema DEVE mostrar "Este documento já está na lista." e DEVE aceitar o formulário e o Salvar. (RN-18)
- CA-38 QUANDO "Exige atendimento presencial" é marcada ENTÃO "Fora do escopo do PROCON" DEVE ficar desabilitada, e o contrário também. Desmarcar libera a outra. (RN-19)
- CA-39 QUANDO "Fora do escopo do PROCON" é marcada ENTÃO "Permitir complemento por IA" DEVE ficar desligada e desabilitada. QUANDO é desmarcada ENTÃO a IA DEVE voltar habilitada e ligada. (RN-20)
- CA-40 QUANDO "Exige atendimento presencial" é desmarcada ENTÃO a observação sobre o atendimento presencial DEVE sumir e não DEVE ser gravada. (RN-17)
- CA-41 QUANDO uma pergunta existente é aberta para edição ENTÃO o formulário DEVE mostrar a orientação de RN-21 com o texto exato e não DEVE oferecer troca de categoria. Ao criar uma pergunta nova, a orientação não DEVE aparecer. (RN-21)
- CA-42 QUANDO "Ativar/Desativar" é acionado na lista ENTÃO o campo "Pergunta ativa no chatbot" DEVE mostrar o novo valor ao abrir o formulário. QUANDO o campo é mudado no formulário ENTÃO a lista só DEVE mudar depois de o formulário ser confirmado; se o formulário for fechado sem confirmar, nada muda. (RN-22)
- CA-43 QUANDO ↑ ou ↓ é acionado numa pergunta ENTÃO ela DEVE trocar de lugar com a vizinha dentro da categoria, com as mesmas regras de primeira e última de CA-30. (RN-02)
- CA-44 QUANDO a categoria selecionada não tem perguntas ENTÃO a área DEVE mostrar um estado vazio com a ação "Nova pergunta". (RN-13)

Busca

- CA-45 QUANDO um termo é digitado na busca ENTÃO o sistema DEVE listar as perguntas de todas as categorias cujo texto da pergunta, texto da resposta ou título curto contém o termo, sem diferenciar acentos nem maiúsculas (ex.: "devolucao" encontra "Devolução"), considerando as alterações pendentes, e cada resultado DEVE mostrar a categoria. (RN-23)
- CA-46 QUANDO há busca em andamento ENTÃO as setas de reordenar não DEVEM aparecer. Ao limpar a busca, a lista da categoria selecionada DEVE voltar com as setas. (RN-23)
- CA-47 QUANDO a busca não encontra nada ENTÃO a tela DEVE mostrar uma mensagem de nenhum resultado. (RN-23)

Páginas do WhatsApp

- CA-48 QUANDO uma lista tem até 10 itens ativos ENTÃO nenhum separador DEVE aparecer. (RN-24)
- CA-49 QUANDO uma lista tem 11 itens ativos ENTÃO o separador "Página 2 no WhatsApp" DEVE aparecer antes do 10º item ativo. Com 18 ativos DEVE haver um separador só (antes do 10º). Com 19 ativos DEVEM aparecer "Página 2 no WhatsApp" antes do 10º e "Página 3 no WhatsApp" antes do 18º. (RN-24)
- CA-50 QUANDO há itens inativos entre os ativos, ou categorias ocultas no chatbot ENTÃO eles não DEVEM contar para as páginas nem receber separador. (RN-24)
- CA-51 QUANDO a ordem ou o estado muda no rascunho ENTÃO os separadores DEVEM ser recalculados na hora. Separador nunca DEVE bloquear o Salvar nem aparecer como erro. (RN-24)

Prévia "Ver como o cidadão recebe"

- CA-52 QUANDO "Ver como o cidadão recebe" é acionado no formulário de uma pergunta válida ENTÃO o sistema DEVE mostrar a prévia com o conteúdo atual do formulário, mesmo não salvo, sem gravar nada e sem mudar o contador. (RN-25)
- CA-53 QUANDO a prévia aparece ENTÃO a lista da categoria (1) DEVE mostrar os itens da página do WhatsApp em que a pergunta está, na ordem e com os estados do rascunho, com a pergunta em negrito e a indicação de que há página seguinte quando houver. Os rótulos da navegação dependem de D-U-04. (RN-27)
- CA-54 QUANDO a IA está desligada e a pergunta está dentro do escopo ENTÃO a prévia DEVE mostrar o balão da resposta oficial exatamente com o texto montado pela prévia da API, que usa o mesmo formato do bot (Categoria, Pergunta, Base legal, Resposta, Documentos necessários, O que fazer agora, linha de atendimento presencial quando houver, aviso no fim), e depois o balão do passo seguinte com os botões. (RN-26, RN-27)
- CA-55 QUANDO a pergunta exige atendimento presencial ENTÃO o botão de aceitar a oferta na prévia DEVE ser "Agendar presencial", ao lado de "Agora não". (RN-27)
- CA-56 QUANDO a IA está ligada ENTÃO a prévia DEVE mostrar o balão com IA com o rótulo "Gerado com auxílio de IA" no rodapé e, além dele, a alternativa "Se a IA estiver indisponível" com os balões (3) e (4). O conteúdo exato do balão com IA depende de D-U-04. (RN-26, RN-27)
- CA-57 QUANDO a prévia mostra o aviso ENTÃO o texto DEVE ser exatamente o de RN-03 e DEVE vir da prévia da API. (RN-03, RN-26)
- CA-58 QUANDO a pergunta está numa categoria nova ainda não salva ENTÃO a prévia DEVE mostrar só a lista (1) montada com o rascunho, o aviso "Esta categoria ainda não foi salva. Salve para que o cidadão a veja." e "A prévia completa fica disponível depois de salvar", sem chamar a prévia da API. (RN-28)
- CA-59 QUANDO o formulário tem campo inválido ENTÃO a prévia não DEVE ser pedida e o sistema DEVE indicar que é preciso corrigir os campos. (RN-25)
- CA-60 QUANDO o servidor não consegue montar a prévia ENTÃO a área da prévia DEVE mostrar uma mensagem de erro, sem mexer no rascunho. (RN-25)
- CA-61 QUANDO os textos da prévia são conferidos no código do painel ENTÃO não DEVE existir cópia escrita no painel de textos que o bot envia, exceto os que D-U-04 autorizar. (RN-26)

Carregamento e erros

- CA-62 QUANDO a tela está carregando ENTÃO DEVE mostrar a indicação de carregamento. QUANDO a carga falha ENTÃO DEVE mostrar mensagem de erro, sem listas nem barra de salvar. (RN-04)
- CA-63 QUANDO o servidor recusa no Salvar algo que a tela aceitou ENTÃO o sistema DEVE mostrar a mensagem do servidor junto do item com problema. Nome repetido DEVE aparecer como "Já existe uma categoria com este nome". (RN-06, RN-11)

Celular e computador

- CA-64 QUANDO a tela é aberta no celular ENTÃO categorias, perguntas, formulários e prévia DEVEM ficar empilhados em uma coluna, sem rolagem horizontal, com a barra de alterações, as setas e os botões acessíveis pelo toque. (RN-04, RN-12)
- CA-65 QUANDO o painel é aberto em tamanho de computador ENTÃO o menu e as demais telas DEVEM continuar como antes, com a única diferença de o item "Conteúdo" abrir a tela nova. (RN-01)

Qualidade

- CA-66 QUANDO os limites e as obrigatoriedades da tela são comparados com os da API ENTÃO todos DEVEM ser iguais aos da tabela em "Divergências entre a regra e a API". (RN-11, RN-16, RN-17)
- CA-67 QUANDO o projeto sobe pelo Docker (compose) ENTÃO o serviço do painel DEVE ser construído sem erro e a tela de Conteúdo DEVE abrir para quem tem a permissão. (RN-01)

## Critérios de sucesso

- A equipe do PROCON consegue criar, editar, ativar/desativar e reordenar categorias e perguntas pelo painel, e o cidadão vê o resultado no WhatsApp depois do Salvar, sem depender do seed.
- Nenhuma falha de Salvar deixa item duplicado nem esconde o que ficou sem gravar.
- A prévia mostra o que o bot envia, sem textos inventados no painel.
- Os testes automáticos cobrem regras de campo, contador, páginas do WhatsApp, busca, plano de Salvar com falha parcial, prévia e acesso. A suíte completa, o lint, a checagem de tipos e o build passam, inclusive no Docker.

## Fora do escopo

- Excluir categoria ou pergunta: os relatórios e o histórico apontam para elas (regra de Conteúdo).
- Árvore de decisão com ramificações (decisão 001).
- Editar o aviso de caráter não vinculante (RNF04).
- Mover pergunta para outra categoria: para mudar, desativa-se e cria-se outra.
- Qualquer mudança na API de Conteúdo ou no bot. Por isso não existe "salvar tudo de uma vez" no servidor, e a tela trabalha com as gravações item a item (RN-06). As divergências da prévia com o bot ficam registradas e, se for preciso mudar a API, isso vira outra issue (D-U-04).
- Avisar ao sair da tela com alterações pendentes (decisão do usuário, RN-04).
- Controle de edição simultânea: vale o último Salvar (RN-08).
- Gerar IA de verdade na prévia.

## Divergências entre a regra e a API

A API (#63) foi usada como referência das validações. A tabela mostra os valores que a tela vai usar.

| Campo | Regra de Conteúdo | API | Tela vai usar |
|---|---|---|---|
| Título curto da categoria | obrigatório, até 24 | obrigatório, até 24, sem quebra de linha/tabulação | igual à API |
| Nome da categoria | obrigatório, único | "Nome completo", obrigatório, até 150, sem quebra de linha/tabulação, único sem acento/maiúscula | igual à API |
| Descrição da categoria | "resumo dos assuntos" | opcional, até 500 | igual à API |
| Título curto da pergunta | obrigatório, até 24 | obrigatório, até 24, sem quebra de linha/tabulação | igual à API |
| Descrição curta | opcional, até 72 | opcional, até 72, sem quebra de linha/tabulação | igual à API |
| Texto da pergunta | obrigatório | obrigatório, até 500 | igual à API, com contador (decisão do PO) |
| Resposta | obrigatória, até 3.000, alerta a partir de 1.000 | igual | igual |
| Base legal | exemplo "CDC, art. 49" | opcional, até 500 | igual à API |
| Documentos úteis | lista de itens | até 30 itens, cada um obrigatório e até 255; aceita repetidos | igual à API, com aviso de repetido (RN-18) |
| Observação presencial | "com nota explicativa" | opcional, até 500, descartada se não for presencial | igual à API |
| IA em fora do escopo | desligada e desabilitada | recusa IA ligada em fora do escopo | igual |
| Pergunta nova ativa | não diz | ativa por padrão | ativa (decisão do PO) |

Outras divergências encontradas:

1. A §3 das regras gerais colocava Conteúdo entre as "telas de operação". O usuário confirmou Salvar/Descartar, e a regra geral vai ser atualizada (K2). A memória do time (regras gerais do painel) ainda traz a versão antiga.
2. A mensagem de nome repetido da API diz "Já existe uma categoria com este título", mas o campo único é o nome completo. A tela mostra "Já existe uma categoria com este nome" (decisão do PO).
3. A API não tem "Última alteração" geral da tela: a tela calcula pelo item mais recente (RN-14). A API também não informa a data de criação, por isso "Carga inicial do sistema" aparece sem data. Contas não são excluídas no painel, então item sem autor é sempre carga inicial. O padrão do painel para autor removido é "Conta removida" (histórico do agendamento), e ele não se aplica aqui.
4. Busca: a da API só olha o que está gravado. A tela busca no rascunho (RN-23).
5. A prévia da API monta a lista (1) com as perguntas gravadas, e não com o rascunho. A tela monta essa lista com o rascunho e a regra de páginas (CA-53).
6. A prévia da API exige categoria gravada (RN-28).

## Prévia: API x bot real

Conferido no código do bot (formatador de mensagens, fluxo da conversa e motor de decisão) e na prévia da API.

| Ponto | Bot real envia | Prévia da API devolve | Situação |
|---|---|---|---|
| P1 Balão oficial, IA desligada, dentro do escopo | Texto com "Categoria:", "Pergunta:", "Base legal:", "Resposta:", "Documentos necessários: a, b" (por vírgula), "O que fazer agora:" com o texto do caso, linha "Esta situação pode exigir atendimento presencial no PROCON Jacareí para andamento formal." quando presencial, e o aviso | o mesmo texto, montado pelo mesmo formatador | bate: a prévia mostra esse texto como veio |
| P2 Passo seguinte, pergunta comum | botões com o texto "A dúvida foi resolvida?" e "Sim" / "Não" | texto "A sua dúvida foi resolvida?", botões "Sim" / "Não" e, no texto formatado, a versão numerada "A dúvida foi resolvida? 1. Sim 2. Não" | diverge no texto da pergunta (D-U-04) |
| P3 Passo seguinte, presencial | botões com o texto "Deseja agendar um atendimento presencial no PROCON Jacareí?" e "Agendar presencial" / "Agora não" | "Para este caso é necessário atendimento presencial no PROCON Jacareí.", "Deseja agendar um horário?", botões "Agendar atendimento" / "Agora não" | diverge no texto e no botão. O usuário decidiu o botão "Agendar presencial" (D-U-04) |
| P4 Observação presencial | não é enviada em nenhuma mensagem | vem no balão da oferta | diverge (D-U-06) |
| P5 Balão com IA | uma mensagem: texto da IA, depois bloco com "Base legal:", "Documentos necessários:", "O que fazer agora:" e a linha presencial, depois o aviso e a pergunta final, com botões e rodapé "Gerado com auxílio de IA" | só o texto de exemplo da IA, o rótulo, o aviso e os campos soltos; não devolve o bloco do formato IA nem o texto de "O que fazer agora" separado | o painel não consegue montar sem copiar rótulos e frases do bot (D-U-04) |
| P6 Lista da categoria | cabeçalho "Escolha uma das perguntas abaixo:", botão "Ver perguntas", linhas com título curto e descrição curta, navegação "Voltar opções" e "Ver mais opções" | linhas e a indicação de que há mais opções, sem nenhum rótulo de navegação | o painel precisa dos rótulos (D-U-04). A regra fala em "Ver mais opções ›" e "Voltar" |
| P7 Fora do escopo | uma mensagem só: a resposta escrita pela equipe é trocada por "Esta dúvida está fora do escopo de atendimento do PROCON via WhatsApp.", sem documentos, "O que fazer agora:" com "Como esta demanda não compete ao PROCON, dirija-se ao órgão indicado na orientação acima portando seus documentos e comprovantes para atendimento especializado.", aviso; sem balão separado e sem botões | o texto formatado usa a resposta e os documentos da equipe e manda à parte "Esta dúvida não faz parte do atendimento do PROCON Jacareí. Procure o órgão indicado acima.", frase que o bot não envia | conflito entre bot, prévia da API, regra e resposta do PO (D-U-05) |

## Desenho

### Peças

- Contrato com a API: tipos que espelham as respostas da API de Conteúdo e uma fatia da camada de dados do painel com todas as chamadas: retrato completo, criar e editar categoria, ativar/desativar categoria, reordenar categorias, criar e editar pergunta, ativar/desativar pergunta, reordenar perguntas da categoria e prévia da pergunta (`/api/v1/content/...`). Todas as respostas vêm em `{ data }`.
- Rascunho (funções puras): estado desejado completo, e não um registro de ações.
- Regras derivadas (funções puras): páginas do WhatsApp, "oculta no chatbot", contagens, validação de campos, unicidade do nome, documento repetido, busca, lista de alterações e última alteração do topo.
- Plano de Salvar (função pura) e o executor do plano (hook).
- Montagem da prévia (função pura): lista (1) a partir do rascunho e balões a partir da resposta da prévia da API.
- Componentes visuais: bloco fixo, listas, separador, formulários, campo de documentos e prévia estilo WhatsApp. Classes de estilo entregues pela designer.
- Hook da página, que liga carga, rascunho, busca, seleção, prévia e Salvar, e a página.

### Carga

Ao abrir, um único endpoint da camada de dados busca a lista de categorias e, em seguida, as perguntas de cada categoria em paralelo (uma chamada por categoria, decisão do usuário), e devolve o retrato completo. É um endpoint só porque não dá para usar um número variável de hooks de consulta. O resultado é o "retrato do servidor". As contagens, o estado oculto e as páginas que a API calcula não são usados na tela, que recalcula tudo a partir do rascunho. A API serve como referência nos testes.

As gravações (criar, editar, ativar/desativar, reordenar) não invalidam o retrato automaticamente. Quem pede a recarga, uma única vez no fim do plano (com sucesso ou com falha), é o executor do Salvar. Assim, o retrato não muda no meio do Salvar.

### Formato do rascunho

- Cada categoria e cada pergunta tem uma chave: o id real, se já existe no servidor, ou uma chave provisória (`nova-1`, `nova-2`...), se foi criada só no rascunho.
- O rascunho guarda a lista ordenada de categorias, com campos e estado, e, para cada chave de categoria, a lista ordenada de perguntas, com todos os campos do formulário e o estado.
- Sem alterações, o rascunho é derivado do retrato do servidor. "Descartar" volta a esse estado.
- Diferente de Documentos, onde o rascunho é descartado quando chega um retrato novo do servidor, aqui o rascunho sobrevive à recarga e é reaplicado sobre o retrato novo. Ele só é descartado depois de um Salvar sem nenhuma falha ou de "Descartar".
- O formulário aberto trabalha numa cópia própria. Só ao confirmar o formulário os valores, inclusive "Pergunta ativa no chatbot", vão para o rascunho (RN-22).
- Lista de alterações (contador): compara rascunho e retrato e segue RN-05. Gera uma entrada por item novo, uma por item existente com algum campo diferente, uma por item cujo estado mudou e uma por lista (de categorias ou de perguntas de uma categoria) cuja ordem dos itens existentes mudou.

### Validação

Mesmas regras da API (tabela de divergências): espaços nas pontas são ignorados no limite, e quebra de linha ou tabulação é recusada onde a API recusa. Unicidade do nome com a mesma normalização da API: remove espaços nas pontas, remove acentos (decomposição NFD sem as marcas) e passa para minúsculas. A comparação é feita contra todas as categorias do rascunho, menos a própria. Documento repetido usa a mesma normalização, mas é só aviso (RN-18). O formulário só leva os dados ao rascunho quando é válido. O Salvar valida o rascunho inteiro antes de enviar qualquer coisa.

### Plano de Salvar e ordem das chamadas

O plano é montado pela diferença entre o rascunho e o retrato e é executado em sequência, nunca em paralelo, porque as reordenações exigem a lista completa de ids:

1. Criar as categorias novas, na ordem do rascunho. Cada criação devolve o id real, que entra num mapa chave provisória → id. A categoria nova nasce ativa: se ela foi desativada no rascunho, o passo 2 inclui a desativação.
2. Categorias existentes: quem teve campo alterado recebe a edição completa com o estado junto; quem só mudou de estado recebe só a ativação/desativação.
3. Criar as perguntas novas, com a categoria já trocada pelo id real, com o estado do rascunho e na ordem do rascunho dentro de cada categoria.
4. Perguntas existentes: edição completa com o estado junto, ou só a ativação/desativação, como no passo 2.
5. Reordenar categorias, só se a ordem do rascunho for diferente da ordem que o servidor terá depois do passo 1 (a ordem gravada, com as novas no fim, na ordem de criação). A lista vai com todas as categorias, inclusive inativas e novas, já com ids reais.
6. Reordenar as perguntas de cada categoria em que a ordem do rascunho for diferente da que o servidor terá depois do passo 3, com todas as perguntas da categoria.

Na criação e na edição de pergunta, "Permitir complemento por IA", "Exige atendimento presencial", "Fora do escopo" e a observação presencial vão sempre explícitos. Se a IA for omitida, a API a liga por padrão.

### Falha parcial

- O executor para na primeira chamada que falhar.
- O mapa de ids já criados é aplicado ao rascunho: os itens novos que foram gravados passam a ter o id real. É isso que impede duplicar no próximo Salvar (CA-18).
- O retrato do servidor é buscado de novo. A diferença é recalculada: o que foi gravado sai do contador e o que faltou continua pendente.
- Quantas alterações foram salvas e quantas faltam: o tamanho da lista de alterações antes do Salvar menos o tamanho depois da recarga, e o tamanho depois da recarga.
- Se nenhuma chamada deu certo, a mensagem é a de falha na primeira gravação (RN-07). Senão, a de falha parcial, com as quantidades, mais o item da falha e a mensagem do servidor.
- Categorias ou perguntas que existem no servidor e não estão no rascunho (criadas por outra pessoa nesse meio tempo) entram no fim da lista correspondente do rascunho (RN-08).
- Sem permissão (403) mostra a mensagem de sem permissão. Sessão expirada segue o tratamento que o painel já tem.

### Prévia

- Só para formulário de pergunta válido. Os dados atuais do formulário são enviados à prévia da API, que não grava nada. Vai junto o id da pergunta, quando ela já existe, e o id da categoria. A chamada espera uma pausa curta na digitação, como em Documentos.
- Categoria ainda sem id: a prévia da API não é chamada (RN-28).
- A lista (1) é montada na tela com o rascunho da categoria, já com o formulário aplicado, e a regra de páginas.
- Balão oficial (3): mostra o texto formatado do balão de resposta que a API devolve (P1), sem montar nada no painel.
- Passo seguinte (4): mostra o texto e os botões que a API devolve, com o botão de aceitar a oferta "Agendar presencial" (decisão do usuário). Os textos que divergem do bot (P2, P3) seguem a resposta de D-U-04.
- Com IA ligada: balão com IA (conteúdo exato conforme D-U-04, P5) e, em seguida, a alternativa "Se a IA estiver indisponível" com os balões (3) e (4). A alternativa usa os mesmos dados que a API já devolve, sem chamada extra.
- Fora do escopo: conforme D-U-05 (P7).
- O aviso e o rótulo "Gerado com auxílio de IA" vêm da resposta da API. Só o bloco fixo do topo usa o arquivo de textos da tela, com teste do texto exato.

### Textos fixos da tela

Todos ficam no arquivo de textos da tela, criado completo em T2: título "Conteúdo do chatbot", aviso (RN-03), "Nova categoria", "Editar categoria", "Nova pergunta", "Editar", "Ativar", "Desativar", "Ativa", "Inativa", "Ativa · oculta no chatbot", "Exige atendimento presencial", "Fora do escopo do PROCON", "Permitir complemento por IA nesta pergunta", "Pergunta ativa no chatbot", "Respostas longas ficam difíceis de ler no celular", orientação de RN-21, "Página {n} no WhatsApp", "Ver como o cidadão recebe", "Se a IA estiver indisponível", "Esta categoria ainda não foi salva. Salve para que o cidadão a veja.", "A prévia completa fica disponível depois de salvar", "Já existe uma categoria com este nome", "Este documento já está na lista.", "Carga inicial do sistema", "Ainda não alterado pelo painel", "Algumas alterações foram salvas e outras não. Revise o que ainda está pendente e salve de novo.", "Não foi possível salvar. Nenhuma alteração foi gravada. Tente de novo.", os rótulos dos campos de RN-11, RN-16 e RN-17, as mensagens de erro dos limites e as de carga, sucesso e sem permissão. "Salvar alterações", "Descartar", o contador e "Última alteração por [nome] em [data]" já existem nos textos comuns. Os textos dos balões da prévia não entram aqui: vêm da API (RN-26), salvo o que D-U-04 autorizar. As tarefas que mostram textos dependem de T2 e usam só as chaves criadas lá. Se faltar algum texto, ele é acrescentado em T17, T18 ou T20, que rodam em sequência, para que tarefas em paralelo não editem o mesmo arquivo.

## Plano de execução

Gates do projeto (rodar a partir da raiz da worktree):

- Gate rápido: `cd src/frontend && npx vitest run <arquivos de teste da tarefa>`
- Gate completo: `cd src/frontend && npm run lint && npm run typecheck && npm run test:run`
- Gate build: `cd src/frontend && npm run build && cd ../.. && docker compose build frontend`
- Gate doc: conferir que os links relativos abrem e que o texto bate com a spec, com o código e com as decisões registradas

Fases:

- Fase 1 (paralelo): T1 [P] · T2 [P] · M1 [P] · K1 [P] · K2 [P]
- Fase 2 (paralelo, depois de T1 e T2; componentes também depois de M1): T3 [P] · T4 [P] · T5 [P] · T6 [P] · T7 [P] · T8 [P] · T9 [P] · T10 [P] · T11 [P] · T12 [P] · T14 [P]
- Fase 3 (paralelo): T13 [P] (depois de T12) · T15 [P] (depois de T3) · T16 [P] (depois de T5 e T7)
- Fase 4: T17 (depois de T2, T4, T5, T6, T8, T15, T16)
- Fase 5: T18 (depois de T9 a T14 e T17)
- Fase 6: T20 (depois de T18 e das respostas de D-U-04, D-U-05 e D-U-06)
- Fase 7 (paralelo): T19 [P] · M2 [P] · K3 [P]

Regras para todas as tarefas de código: nunca escrever comentários; TDD em lógica e comportamento (o teste citado em "Teste" é escrito e falha antes do código); no máximo 5 passos; um commit atômico por tarefa no padrão `Feat :sparkles: [#124] <descrição no imperativo>`; nunca alterar teste para fazê-lo passar.

## Tarefas

### T1 [P] Contrato com a API de Conteúdo
- O quê: tipos do frontend que espelham a API de Conteúdo e o rascunho, os limites de campo, a normalização de comparação e a fatia de dados com todas as chamadas, incluindo o endpoint único que devolve o retrato completo (categorias e perguntas de todas elas). As gravações não invalidam tags.
- Onde: `src/frontend/src/types/content/*.types.ts` (um tipo por arquivo: categoria, pergunta, envelope, entradas de escrita, entrada e resultado da prévia, estado do rascunho, item do rascunho, passo do plano de Salvar, resultado do Salvar, modelo dos balões da prévia); `src/frontend/src/utils/content/contentLimits.ts`; `src/frontend/src/utils/content/normalizeComparisonText.ts`; `src/frontend/src/store/api/content.api.ts`; `src/frontend/src/store/api.ts` (tagTypes `ContentCategories`, `ContentQuestions`); testes em `src/frontend/src/store/api/test/content.api.test.tsx` e `src/frontend/src/utils/content/test/normalizeComparisonText.test.ts`.
- Dev: Itadori (dev-frontend)
- Depende de: nada
- Reaproveita: padrão de `store/api/documents.api.ts` (injectEndpoints, `unwrap` do `{ data }`, `keepUnusedDataFor: 0` na prévia); tipos do backend como referência (`src/backend/types/content.types.ts`, `src/backend/schemas/content.schema.ts`); `normalizeComparisonText` do repositório do backend como referência.
- Atende: RN-02, RN-11, RN-16, RN-17, RN-23, CA-66
- Passos: (1) testes da fatia de dados (URL, método, corpo e `{ data }` de cada endpoint; retrato completo) e da normalização; (2) tipos; (3) limites e normalização; (4) fatia de dados e tagTypes; (5) gate e commit `Feat :sparkles: [#124] Adiciona o contrato da API de Conteúdo no painel`.
- Pronto quando: cada endpoint chama a rota e o método certos e devolve o `data`; o retrato completo faz uma chamada de categorias e uma de perguntas por categoria; nenhuma gravação dispara nova busca do retrato; `normalizeComparisonText(" Contrátos ")` é igual a `normalizeComparisonText("contratos")`; os limites batem com a tabela de divergências; gate rápido e gate completo passam.
- Teste: unitário. Falha primeiro o teste que espera a criação de categoria em POST `/api/v1/content/categories` devolvendo o `data`.
- Gate: rápido e completo
- Modelo: padrao
- Status: feita (gate completo: lint, typecheck e test:run passam, 229 arquivos e 1828 testes; 13 testes novos escritos primeiro)

### T2 [P] Menu, rota, página base e textos
- O quê: liberar "Conteúdo" no menu e na rota com uma página base (título e bloco fixo do aviso), registrar o arquivo de textos completo da tela, criar o separador "Página N no WhatsApp" usado pelas duas listas e ajustar os testes que esperavam a tela como não pronta.
- Onde: `src/frontend/src/navigation/navItemsReady.ts`; `src/frontend/src/routers/routes.tsx`; `src/frontend/src/pages/Content.page.tsx`; `src/frontend/src/components/ContentPageBreak.tsx` (com teste em `components/test/ContentPageBreak.test.tsx`); `src/frontend/src/locales/pt-BR/content.json`; `src/frontend/src/i18n/resources.ts`; testes `navigation/test/firstAllowedPath.test.ts` (linhas 12 e 32), `navigation/test/canAccess.test.ts`, `routers/test/RequireAccess.test.tsx` (caso de `/conteudo`), `routers/test/routes.test.tsx` (`underConstructionRoutes`), `i18n/test/resources.test.ts`, novo `pages/test/Content.page.test.tsx`.
- Dev: Itadori (dev-frontend)
- Depende de: nada
- Reaproveita: `UnderConstruction` continua para Sessões; padrão lazy de `routes.tsx`; `ScheduleContentNotice` (o link passa a aparecer sozinho). As classes de estilo de M1 para o bloco fixo e o separador são ligadas em T18, se M1 ainda não tiver terminado.
- Atende: RN-01, RN-03, RN-24, CA-01, CA-02, CA-03, CA-04, CA-05, CA-07, CA-65
- Observação: os testes listados em "Onde" registram o comportamento antigo de "tela não pronta". Atualizá-los para o novo comportamento faz parte da entrega e não conta como "alterar teste para passar". Se o gate completo derrubar outro teste pelo mesmo motivo, avise a orchestrator em vez de editar em silêncio.
- Passos: (1) ajustar os testes para o novo comportamento (conta só com conteúdo vai para `/conteudo`, a rota abre a tela, o aviso aparece com o texto exato) e ver que falham; (2) `content.json` com todos os textos de "Textos fixos da tela" e registro em `resources.ts`; (3) página base com título e bloco fixo, e separador; (4) `navItemsReady.content = true` e rota lazy; (5) gate e commit `Feat :sparkles: [#124] Libera a tela de Conteúdo no menu com o aviso fixo`.
- Pronto quando: quem tem só "Gerenciar conteúdo do chatbot" cai em `/conteudo`; sem permissão, `/conteudo` se comporta como em CA-01; a página mostra o aviso exato sem ação de edição; a permissão aparece na tela de Usuários; `content.json` tem todos os textos fixos listados, inclusive os de Salvar, prévia, documento repetido e última alteração; gate completo passa.
- Teste: integração. Falha primeiro o teste de `firstAllowedPath` que espera `/conteudo` para quem só tem `content.manage`.
- Gate: completo
- Modelo: padrao
- Status: feita (gate completo: lint, typecheck e test:run passam, 231 arquivos e 1835 testes; testes antigos de 'tela não pronta' atualizados: firstAllowedPath, RequireAccess, routes, readyPermissionKeys, sidebarNavGroups, useLogin; testes escritos primeiro e vistos falhar; commit 7da44c9)

### T3 [P] Páginas do WhatsApp e estado oculto
- O quê: função pura que, para uma lista ordenada e um critério de "visível", devolve para cada item a página do WhatsApp e o separador "Página N no WhatsApp" no primeiro item de cada página a partir da segunda, mais a função de "oculta no chatbot" e as contagens da categoria.
- Onde: `src/frontend/src/utils/content/whatsappPages.ts`, `src/frontend/src/utils/content/categoryVisibility.ts`, testes em `src/frontend/src/utils/content/test/`.
- Dev: Itadori (dev-frontend)
- Depende de: T1
- Reaproveita: regra de `paginarItens` e `buildWhatsappPageMap` do backend como referência (até 10 numa página; senão 9, 8... e a última com até 9).
- Atende: RN-09, RN-24, CA-24, CA-48, CA-49, CA-50, CA-51
- Passos: (1) testes com 10, 11, 18, 19 e 27 ativos, inativos intercalados e categoria ativa sem pergunta ativa; (2) páginas; (3) visibilidade e contagens; (4) gate; (5) commit `Feat :sparkles: [#124] Calcula as páginas do WhatsApp e as categorias ocultas no painel`.
- Pronto quando: 11 ativos dão separador no 10º; 18 dão um separador; 19 dão separadores no 10º e no 18º; inativos ficam sem página; gate rápido passa.
- Teste: unitário. Falha primeiro o caso de 19 itens ativos.
- Gate: rápido
- Modelo: economico
- Status: feita (gate rápido: 12 testes passam; teste de 19 itens escrito primeiro; commit 5f42df4)

### T4 [P] Validação de categoria e pergunta
- O quê: funções puras que validam os campos da categoria e da pergunta com as regras da API, incluindo a unicidade do nome no rascunho, as regras entre campos e o aviso (não bloqueante) de documento repetido.
- Onde: `src/frontend/src/utils/content/validateCategoryDraft.ts`, `src/frontend/src/utils/content/validateQuestionDraft.ts`, `src/frontend/src/utils/content/duplicateDocuments.ts`, testes em `src/frontend/src/utils/content/test/`.
- Dev: Itadori (dev-frontend)
- Depende de: T1, T2
- Reaproveita: `contentLimits` e `normalizeComparisonText` de T1; chaves de mensagem do `content.json` de T2.
- Atende: RN-11, RN-16, RN-17, RN-18, RN-19, RN-20, CA-26, CA-27, CA-28, CA-34, CA-36, CA-37, CA-66
- Passos: (1) testes de cada limite exato e limite + 1, quebra de linha, tabulação, nome repetido com acento/maiúscula/espaços, presencial + fora do escopo, fora do escopo + IA, "Nota fiscal" e "nota físcal" gerando aviso sem erro; (2) categoria; (3) pergunta e documento repetido; (4) gate; (5) commit `Feat :sparkles: [#124] Valida categorias e perguntas do Conteúdo como a API`.
- Pronto quando: todos os casos da tabela de divergências passam com o mesmo resultado da API; documento repetido aparece como aviso e não como erro; gate rápido passa.
- Teste: unitário. Falha primeiro "nome 'contrátos ' repetido de 'Contratos' é recusado".
- Gate: rápido
- Modelo: padrao
- Status: feita (gate rápido: 37 testes passam; teste de nome repetido escrito primeiro; commit 57e02ce)

### T5 [P] Operações do rascunho
- O quê: funções puras que derivam o rascunho do retrato do servidor e aplicam criar, editar, ativar/desativar e mover para cima ou para baixo em categorias e perguntas, com chaves provisórias para itens novos, a regra de IA ao marcar e desmarcar "Fora do escopo", a aplicação do mapa chave provisória → id real e a reaplicação sobre um retrato novo.
- Onde: `src/frontend/src/utils/content/contentDraft.ts` (ou um arquivo por operação em `utils/content/draft/`), testes em `src/frontend/src/utils/content/test/`.
- Dev: Itadori (dev-frontend)
- Depende de: T1
- Reaproveita: ideia de `freshState` e `swap` de `useDocumentsDraft`.
- Atende: RN-02, RN-04, RN-06, RN-10, RN-15, RN-20, RN-22, CA-12, CA-16, CA-18, CA-25, CA-29, CA-30, CA-33, CA-39, CA-42, CA-43
- Passos: (1) testes: categoria nova no fim e ativa, pergunta nova no fim, ativa e com IA, desmarcar fora do escopo religa a IA, mover nas pontas não faz nada, desativar categoria não mexe nas perguntas, mapa de ids troca as chaves provisórias inclusive na categoria das perguntas, reaplicar o rascunho sobre um retrato novo mantém o que ficou pendente; (2) derivação e criação; (3) edição, estado, regra de IA e mover; (4) mapa de ids, reaplicação sobre retrato novo e inclusão de itens do servidor que faltam no rascunho; (5) gate e commit `Feat :sparkles: [#124] Monta o rascunho das alterações de Conteúdo`.
- Pronto quando: todas as operações devolvem novo estado sem mutar o anterior; gate rápido passa.
- Teste: unitário. Falha primeiro "categoria nova entra no fim, ativa, com chave provisória".
- Gate: rápido
- Modelo: padrao
- Status: feita (gate rápido: 17 testes passam; commit d3328bc)

### T6 [P] Lista de alterações não salvas e última alteração
- O quê: funções puras que comparam rascunho e retrato e devolvem a lista de alterações para a barra comum, conforme RN-05, e que escolhem a última alteração do topo conforme RN-14.
- Onde: `src/frontend/src/utils/content/contentChanges.ts`, `src/frontend/src/utils/content/latestContentChange.ts`, testes em `src/frontend/src/utils/content/test/`.
- Dev: Itadori (dev-frontend)
- Depende de: T1
- Reaproveita: `changesOf` de `useDocumentsDraft` como referência; `UnsavedChangesBar` recebe `string[]`; tipo `LastChange` de `types/settings`.
- Atende: RN-05, RN-14, CA-08, CA-09, CA-10, CA-11
- Passos: (1) testes: sem diferença dá lista vazia; ↑ e ↓ dá vazio; desativar e ativar dá vazio; item novo editado dá uma entrada; reordenar a mesma lista várias vezes dá uma entrada; voltar à ordem gravada dá vazio; topo escolhe o item mais recente com autor e devolve "nenhum" quando ninguém tem autor; (2) comparação de campos e estado; (3) comparação de ordem; (4) última alteração e gate; (5) commit `Feat :sparkles: [#124] Lista as alterações não salvas do Conteúdo`.
- Pronto quando: os casos de CA-10 e CA-11 passam; gate rápido passa.
- Teste: unitário. Falha primeiro "mover para cima e para baixo não conta alteração".
- Gate: rápido
- Modelo: padrao
- Status: feita (gate rápido: 14 testes passam; commit 4e19ee0)

### T7 [P] Plano de Salvar
- O quê: função pura que, a partir do retrato e do rascunho, devolve a lista ordenada de passos do Salvar descrita no Desenho.
- Onde: `src/frontend/src/utils/content/buildContentSavePlan.ts`, teste em `src/frontend/src/utils/content/test/buildContentSavePlan.test.ts`.
- Dev: Itadori (dev-frontend)
- Depende de: T1
- Reaproveita: nada específico.
- Atende: RN-02, RN-06, CA-14, CA-30, CA-43
- Passos: (1) testes: ordem dos 6 grupos, só estado gera ativação e não edição, categoria nova desativada gera criar e desativar, pergunta nova em categoria nova usa a chave provisória, nova no fim não gera reordenação, ordem trocada gera reordenação com todos os ids, criação e edição de pergunta levam IA, presencial, fora do escopo e observação sempre explícitos; (2) criações; (3) edições e estados; (4) reordenações; (5) gate e commit `Feat :sparkles: [#124] Monta o plano de gravação do Conteúdo`.
- Pronto quando: sem alterações o plano é vazio; os casos acima passam; gate rápido passa.
- Teste: unitário. Falha primeiro "pergunta nova em categoria nova vem depois da criação da categoria e aponta a chave provisória".
- Gate: rápido
- Modelo: padrao
- Status: feita (gate rápido: 8 testes passam; tipo ContentSavePlanStep passou a usar chaves em vez de ids, resolvidas pelo executor; commit 13e5271)

### T8 [P] Busca no rascunho
- O quê: função pura que busca o termo no texto da pergunta, na resposta e no título curto de todas as perguntas do rascunho, sem acento nem maiúscula, devolvendo cada resultado com a sua categoria, na ordem das categorias e das perguntas.
- Onde: `src/frontend/src/utils/content/searchContentQuestions.ts`, teste em `src/frontend/src/utils/content/test/searchContentQuestions.test.ts`.
- Dev: Itadori (dev-frontend)
- Depende de: T1
- Reaproveita: `normalizeComparisonText` de T1.
- Atende: RN-23, CA-45, CA-47
- Passos: (1) testes: "devolucao" acha "Devolução" na resposta, acha pelo título curto, termo vazio não busca, sem resultado devolve vazio, resultado traz a categoria; (2) implementação; (3) gate; (4) commit `Feat :sparkles: [#124] Busca perguntas no rascunho do Conteúdo`.
- Pronto quando: os casos passam; gate rápido passa.
- Teste: unitário. Falha primeiro "devolucao acha Devolução".
- Gate: rápido
- Modelo: economico
- Status: feita (gate rápido: 6 testes passam; commit ab180bb)

### T9 [P] Componente da lista de categorias
- O quê: lista de categorias com posição, título curto em negrito, nome completo, contagens, estado, separador de página, setas e ações, recebendo tudo pronto por props.
- Onde: `src/frontend/src/components/ContentCategoryList.tsx`, `src/frontend/src/components/ContentCategoryRow.tsx`, testes em `src/frontend/src/components/test/`.
- Dev: Itadori (dev-frontend)
- Depende de: T1, T2, M1
- Reaproveita: `StatusBadge`, `EmptyState`, `ContentPageBreak` e `content.json` de T2, estilos de M1.
- Atende: RN-09, RN-12, RN-24, CA-23, CA-24, CA-30, CA-31, CA-50
- Passos: (1) testes: dados da linha, estado oculto, primeira sem ↑ e última sem ↓, separador onde a prop manda, vazio com "Nova categoria"; (2) linha; (3) lista e separador; (4) gate; (5) commit `Feat :sparkles: [#124] Adiciona a lista de categorias do Conteúdo`.
- Pronto quando: os testes passam; gate rápido passa.
- Teste: unitário de componente. Falha primeiro "a primeira categoria não tem ↑".
- Gate: rápido
- Modelo: economico
- Status: feita (gate rápido: 8 testes passam; commit cda3775)

### T10 [P] Componente da lista de perguntas
- O quê: lista de perguntas com os dados de RN-13, selos, separador, setas que somem na busca, categoria em cada resultado de busca, linha de última alteração ("Carga inicial do sistema" sem autor, nada em item não salvo) e estado vazio.
- Onde: `src/frontend/src/components/ContentQuestionList.tsx`, `src/frontend/src/components/ContentQuestionRow.tsx`, testes em `src/frontend/src/components/test/`.
- Dev: Itadori (dev-frontend)
- Depende de: T1, T2, M1
- Reaproveita: `Seal`, `StatusBadge`, `EmptyState`, `formatDate`, texto de `lastChangeNote` do `common.json`, `ContentPageBreak` de T2, estilos de M1.
- Atende: RN-13, RN-23, RN-24, CA-32, CA-44, CA-46
- Passos: (1) testes: linha completa com "Última alteração por Ana em 05/11/2026", item sem autor com "Carga inicial do sistema", item novo sem linha de alteração, selos, setas ausentes em modo busca, categoria visível no resultado, vazio com "Nova pergunta"; (2) linha; (3) lista; (4) gate; (5) commit `Feat :sparkles: [#124] Adiciona a lista de perguntas do Conteúdo`.
- Pronto quando: os testes passam; gate rápido passa.
- Teste: unitário de componente. Falha primeiro "em modo busca não há setas".
- Gate: rápido
- Modelo: economico
- Status: feita (gate rápido: 11 testes passam; commit 90d49df)

### T11 [P] Formulário da categoria
- O quê: formulário de categoria (nova e edição) com título curto com contador, nome completo e descrição, mostrando os erros recebidos por props e devolvendo os valores ao confirmar.
- Onde: `src/frontend/src/components/ContentCategoryForm.tsx`, teste em `src/frontend/src/components/test/ContentCategoryForm.test.tsx`.
- Dev: Itadori (dev-frontend)
- Depende de: T1, T2, M1
- Reaproveita: `ConfirmDialog` ou o padrão de painel lateral definido por M1; campos de texto existentes (`ScheduleTextField` como referência).
- Atende: RN-11, CA-26, CA-27, CA-28
- Passos: (1) testes: contador "24/24", erro mostrado junto do campo, "Já existe uma categoria com este nome" quando a prop manda, confirmar chama o callback com os valores; (2) campos e contador; (3) erros e confirmação; (4) gate; (5) commit `Feat :sparkles: [#124] Adiciona o formulário de categoria do Conteúdo`.
- Pronto quando: os testes passam; gate rápido passa.
- Teste: unitário de componente. Falha primeiro "contador mostra 24/24 com 24 caracteres".
- Gate: rápido
- Modelo: economico
- Status: feita (gate rápido: 6 testes passam; inclui ContentFormDialog e ContentTextField; commit 527533a)

### T12 [P] Campo de documentos úteis
- O quê: campo de lista para "Documentos úteis para esta dúvida", que permite adicionar, editar, remover e reordenar itens, com limite de 30 itens de até 255 caracteres e aviso "Este documento já está na lista." para repetidos, sem bloquear.
- Onde: `src/frontend/src/components/ContentDocumentsField.tsx`, teste em `src/frontend/src/components/test/ContentDocumentsField.test.tsx`.
- Dev: Itadori (dev-frontend)
- Depende de: T1, T2, M1
- Reaproveita: `DocumentGroup` e `DocumentItem` como referência de interação (lá o repetido é bloqueado; aqui é só aviso).
- Atende: RN-17, RN-18, CA-36, CA-37
- Passos: (1) testes: adicionar, remover, item vazio recusado, 31º item recusado, 256 caracteres recusado, repetido sem acento/maiúscula entra com aviso; (2) implementação; (3) gate; (4) commit `Feat :sparkles: [#124] Adiciona o campo de documentos úteis da pergunta`.
- Pronto quando: os testes passam; gate rápido passa.
- Teste: unitário de componente. Falha primeiro "documento repetido entra na lista com o aviso".
- Gate: rápido
- Modelo: economico
- Status: feita (gate rápido: 8 testes passam; commit 1fa9962)

### T13 [P] Formulário da pergunta
- O quê: formulário de pergunta (nova e edição) com contadores (inclusive o do texto da pergunta, sempre visível), alerta de 1.000 caracteres, exclusividade presencial/fora do escopo, bloqueio da IA em fora do escopo e religação ao desmarcar, observação presencial, documentos, "Pergunta ativa no chatbot" valendo só ao confirmar, orientação de edição e botão "Ver como o cidadão recebe".
- Onde: `src/frontend/src/components/ContentQuestionForm.tsx`, teste em `src/frontend/src/components/test/ContentQuestionForm.test.tsx`.
- Dev: Itadori (dev-frontend)
- Depende de: T12
- Reaproveita: `ContentDocumentsField` de T12; estilos de M1.
- Atende: RN-15, RN-16, RN-17, RN-19, RN-20, RN-21, RN-22, CA-34, CA-35, CA-38, CA-39, CA-40, CA-41, CA-42
- Passos: (1) testes: contador do texto da pergunta visível, alerta com 1.000 e sem alerta com 999, marcar presencial desabilita fora do escopo e vice-versa, fora do escopo desliga e desabilita a IA e desmarcar religa, observação some ao desmarcar presencial, orientação só na edição, sem campo de categoria, fechar sem confirmar não devolve nada; (2) campos e contadores; (3) regras entre campos; (4) gate; (5) commit `Feat :sparkles: [#124] Adiciona o formulário de pergunta do Conteúdo`.
- Pronto quando: os testes passam; gate rápido passa.
- Teste: unitário de componente. Falha primeiro "marcar Fora do escopo desliga e desabilita a IA".
- Gate: rápido
- Modelo: padrao
- Status: feita (gate rápido: 12 testes passam; commit dbb3845)

### T14 [P] Componente da prévia estilo WhatsApp
- O quê: componente que desenha a lista (1), o balão oficial, o balão do passo seguinte com botões, o espaço do balão com IA e a alternativa "Se a IA estiver indisponível", a partir do modelo de balões de T1, com estados de carregando, erro, "corrija os campos" e categoria não salva. Os textos dos balões são os que vêm no modelo (originados da API), nunca uma cópia no componente.
- Onde: `src/frontend/src/components/ContentPreview.tsx` (e subcomponentes `ContentPreviewList.tsx`, `ContentPreviewBubble.tsx`), testes em `src/frontend/src/components/test/`.
- Dev: Itadori (dev-frontend)
- Depende de: T1, T2, M1
- Reaproveita: `WhatsAppMessageBubble` e o estilo da prévia de `DocumentsPreview` como referência; estilos de M1.
- Atende: RN-25, RN-26, RN-27, RN-28, CA-53, CA-54, CA-56, CA-57, CA-58, CA-59, CA-60
- Passos: (1) testes: pergunta em negrito, indicação de próxima página só com a flag, balão oficial mostra o texto do modelo sem alteração, rótulo de IA no rodapé, alternativa "Se a IA estiver indisponível" com os balões oficial e de passo seguinte, categoria não salva mostra só a lista e os dois avisos; (2) lista; (3) balões e alternativa; (4) gate; (5) commit `Feat :sparkles: [#124] Adiciona a prévia estilo WhatsApp do Conteúdo`.
- Pronto quando: os testes passam; gate rápido passa.
- Teste: unitário de componente. Falha primeiro "com IA ligada aparece a alternativa Se a IA estiver indisponível".
- Gate: rápido
- Modelo: padrao
- Status: feita (gate rápido: 11 testes passam; reajustada ao contrato botMessages no commit f697c45; commit original 6b60a5f)

### T15 [P] Montagem da prévia
- O quê: funções puras que montam a lista (1) a partir do rascunho da categoria com o formulário aplicado e a regra de páginas, e convertem a resposta da prévia da API no modelo de balões de T1: balão oficial com o texto formatado da API, passo seguinte com texto e botões da API e o botão de aceitar a oferta "Agendar presencial", alternativa "Se a IA estiver indisponível" quando a IA está ligada, e o caso de categoria não salva sem chamada à API. Balão com IA e fora do escopo ficam como a API devolve até T20.
- Onde: `src/frontend/src/utils/content/buildPreviewList.ts`, `src/frontend/src/utils/content/buildPreviewBubbles.ts`, testes em `src/frontend/src/utils/content/test/`.
- Dev: Itadori (dev-frontend)
- Depende de: T1, T3
- Reaproveita: `whatsappPages` de T3; tipos de prévia de T1.
- Atende: RN-24, RN-26, RN-27, RN-28, CA-53, CA-54, CA-55, CA-56, CA-57, CA-58
- Passos: (1) testes: pergunta na página 2 mostra a página 2 com indicação de mais opções só se houver página 3, pergunta inativa no rascunho continua na própria prévia, balão oficial igual ao texto formatado da API, oferta com "Agendar presencial", IA ligada gera também a alternativa, categoria sem id gera só lista e avisos; (2) lista; (3) balões; (4) gate; (5) commit `Feat :sparkles: [#124] Monta a prévia do Conteúdo a partir do rascunho`.
- Pronto quando: os testes passam; gate rápido passa.
- Teste: unitário. Falha primeiro "o balão oficial é exatamente o texto formatado devolvido pela API".
- Gate: rápido
- Modelo: padrao
- Status: feita (gate rápido: 20 testes passam; usa direto o contrato botMessages da B1, sem ler answerBubble/nextStepBubble; commit 490b27b)

### T16 [P] Executor do Salvar
- O quê: hook que executa o plano de T7 em sequência, guarda o mapa de ids criados, para na primeira falha, aplica o mapa ao rascunho, recarrega o retrato do servidor uma única vez no fim (sucesso ou falha), sem descartar o rascunho em caso de falha, e devolve o resultado (sucesso; falha na primeira gravação; falha parcial com quantas foram salvas, quantas faltam, o item e a mensagem; sem permissão), com trava contra clique duplo.
- Onde: `src/frontend/src/pages/hooks/useContentSave.ts`, `src/frontend/src/utils/content/contentSaveErrorOf.ts`, testes em `src/frontend/src/pages/hooks/test/useContentSave.test.tsx`.
- Dev: Itadori (dev-frontend)
- Depende de: T5, T7
- Reaproveita: padrão de `useScheduleSave` (trava `inFlight`) e de `documentsSaveErrorOf`; `HttpError`; fatia de dados de T1.
- Atende: RN-06, RN-07, RN-08, CA-06, CA-14, CA-15, CA-16, CA-17, CA-18, CA-21, CA-63
- Passos: (1) testes com o servidor simulado: sucesso chama na ordem do plano; falha no 1º passo devolve "nenhuma gravada"; falha no 3º passo para ali, devolve o mapa dos dois primeiros e as quantidades; depois da recarga o que faltou continua pendente; novo Salvar depois da falha não cria de novo; reordenação recusada recarrega e mostra o erro; 409 vira "Já existe uma categoria com este nome"; 403 vira sem permissão; (2) execução sequencial e mapa; (3) parada, recarga, quantidades e erros; (4) gate; (5) commit `Feat :sparkles: [#124] Grava o rascunho do Conteúdo passo a passo com falha parcial`.
- Pronto quando: os testes passam, inclusive o de não duplicar; gate rápido passa.
- Teste: integração do hook. Falha primeiro "depois de falha parcial, o segundo Salvar não recria a categoria já criada".
- Gate: rápido
- Modelo: padrao
- Status: feita (gate rápido: 12 testes passam entre executor e hook; commit e829597)

### T17 Hook da página de Conteúdo
- O quê: hook que carrega o retrato completo, guarda o rascunho, a seleção, a busca e o formulário aberto (com cópia própria até confirmar), calcula contagens, estados, separadores, alterações, última alteração do topo e validação, pede a prévia com pausa na digitação (sem pedir em categoria não salva) e chama o Salvar, escolhendo a mensagem de RN-07.
- Onde: `src/frontend/src/pages/hooks/useContent.ts` (e, se passar de um tamanho razoável, `useContentDraft.ts` e `useContentPreview.ts`), testes em `src/frontend/src/pages/hooks/test/`.
- Dev: Itadori (dev-frontend)
- Depende de: T2, T4, T5, T6, T8, T15, T16
- Reaproveita: `useDebouncedValue`, `PREVIEW_DEBOUNCE_MS`, `skipToken`, `useToast`; padrão de `useDocuments`.
- Atende: RN-04, RN-07, RN-09, RN-14, RN-22, RN-23, RN-24, RN-25, RN-28, CA-08, CA-09, CA-12, CA-13, CA-16, CA-17, CA-19, CA-20, CA-42, CA-45, CA-46, CA-51, CA-52, CA-58, CA-59, CA-62
- Passos: (1) testes: carga com uma chamada por categoria, trocar de categoria mantém pendências, busca ativa esconde reordenação, Salvar com item inválido não chama o servidor, prévia não é pedida com formulário inválido nem em categoria não salva e não muda o contador, mensagem de falha parcial traz as quantidades; (2) carga e rascunho; (3) derivados e busca; (4) prévia e Salvar; (5) gate e commit `Feat :sparkles: [#124] Liga carga, rascunho, busca, prévia e gravação do Conteúdo`.
- Pronto quando: os testes passam; gate rápido passa.
- Teste: integração do hook. Falha primeiro "trocar de categoria mantém as alterações pendentes da anterior".
- Gate: rápido
- Modelo: padrao
- Status: feita (gate rápido: 10 testes passam; commit 7edd13b)

### T18 Montagem da página e testes da tela
- O quê: página completa com cabeçalho, última alteração do topo, barra de alterações não salvas, bloco fixo, busca, coluna de categorias, área de perguntas, formulários e prévia, nos tamanhos de computador e de celular, e os testes de integração da tela.
- Onde: `src/frontend/src/pages/Content.page.tsx`, `src/frontend/src/pages/test/Content.page.test.tsx` (e arquivos `Content.*.test.tsx` por assunto, como `Content.save.test.tsx`).
- Dev: Itadori (dev-frontend)
- Depende de: T9, T10, T11, T12, T13, T14, T17
- Reaproveita: `UnsavedChangesBar`, `LastChangeNote`, estilos de M1, padrão de `Documents.page.tsx`.
- Atende: CA-07, CA-08, CA-09, CA-12, CA-14, CA-16, CA-17, CA-22, CA-25, CA-33, CA-45, CA-52, CA-62, CA-64, CA-65, CA-67
- Passos: (1) testes de tela: criar categoria e pergunta, editar, reordenar, salvar e ver a ordem gravada; descartar; falha parcial com a mensagem e as quantidades e novo Salvar sem duplicar; falha na primeira gravação; busca; prévia com aviso exato; topo com "Ainda não alterado pelo painel" quando ninguém tem autor; (2) montagem do layout; (3) ligação com o hook; (4) gate completo; (5) commit `Feat :sparkles: [#124] Monta a tela de Conteúdo do chatbot`.
- Pronto quando: os testes de tela passam; gate completo passa.
- Teste: integração. Falha primeiro "criar categoria, criar pergunta nela e salvar grava as duas na ordem".
- Gate: completo
- Modelo: padrao
- Status: feita (gate completo: lint, typecheck, test:run e prettier passam, 253 arquivos e 2018 testes; 12 testes de tela; commit 5f82fbb)

### T20 Ajuste da prévia conforme o bot real
- O quê: completar o balão com IA, os textos do passo seguinte, a navegação da lista e o caso fora do escopo conforme as respostas de D-U-04, D-U-05 e D-U-06, sem inventar texto.
- Onde: `src/frontend/src/utils/content/buildPreviewBubbles.ts`, `src/frontend/src/utils/content/buildPreviewList.ts`, `src/frontend/src/components/ContentPreview*.tsx` e testes correspondentes.
- Dev: Itadori (dev-frontend)
- Depende de: T18; respostas de D-U-04, D-U-05 e D-U-06
- Reaproveita: T14 e T15; código do bot como referência (formatador de mensagens).
- Atende: RN-26, RN-27, CA-53, CA-56, CA-61
- Passos: (1) testes com o resultado decidido para P2 a P7; (2) lista; (3) balões; (4) gate completo; (5) commit `Feat :sparkles: [#124] Alinha a prévia do Conteúdo ao que o bot envia`.
- Pronto quando: cada ponto P2 a P7 está como foi decidido; nenhum texto do bot copiado sem autorização; gate completo passa.
- Teste: unitário e de componente. Falha primeiro o teste do ponto P5 conforme a decisão.
- Gate: completo
- Modelo: padrao
- Status: em-andamento. Evidência parcial: o painel já consome só `botMessages` e envia `listRows` desde T14/T15 (commits f697c45 e 490b27b), e os tipos antigos de `answerBubble`/`nextStepBubble` já saíram do frontend. Falta conferir a tela com a API depois de B2, B3 e B4 (fora do escopo em dois balões e linha da observação presencial, que o painel mostra como vêm) e fechar com o gate completo

### T19 [P] Verificação final no Docker
- O quê: rodar a suíte completa e o build do painel, também pelo compose, e conferir a tela aberta no container.
- Onde: nenhum arquivo, a não ser correções pontuais que o build apontar.
- Dev: Itadori (dev-frontend)
- Depende de: T18, T20
- Reaproveita: `compose.yaml` (serviço `frontend`).
- Atende: CA-65, CA-67
- Passos: (1) gate completo; (2) gate build; (3) subir o compose e abrir `/conteudo` com uma conta com a permissão; (4) registrar a evidência no Status; (5) commit só se houver correção, `Feat :sparkles: [#124] Ajusta o build da tela de Conteúdo`.
- Pronto quando: gate completo e gate build passam; a tela abre no container.
- Teste: nenhum novo.
- Gate: build
- Modelo: economico
- Status: pendente

### M1 [P] Desenho visual da tela
- O quê: decisões de layout e estados visuais da tela, entregues como descrição para o Itadori e como os arquivos de estilo da tela: bloco fixo do aviso, última alteração do topo, colunas de categorias e perguntas, linha de lista com selos e estado, separador "Página N no WhatsApp", setas, busca e resultados com categoria, formulários (painel ou diálogo), campo de documentos com aviso de repetido, contadores e alerta, prévia estilo WhatsApp (lista, balões, botões, rótulo de IA, alternativa "Se a IA estiver indisponível", aviso de categoria não salva), estados de carregando, vazio, erro, salvando, falha parcial e falha total, e comportamento no celular.
- Onde: `src/frontend/src/styles/pages/content.module.css`, `src/frontend/src/styles/components/contentLists.module.css`, `contentForms.module.css`, `contentPreview.module.css`.
- Dev: Miwa (designer)
- Depende de: nada
- Reaproveita: estilos de Documentos e Horários (`documents.module.css`, `schedule.module.css`, `unsavedChangesBar.module.css`, `whatsappMessageBubble.module.css`), tokens de cor e espaçamento existentes.
- Atende: RN-03, RN-09, RN-13, RN-24, RN-27, RN-28, CA-07, CA-64, CA-65
- Observação: se a Miwa só descrever as decisões, sem escrever os arquivos de estilo, os estilos passam para T9 a T14 e T18.
- Passos: (1) estudar as telas de configuração existentes; (2) definir layout de computador e de celular; (3) definir estados e componentes visuais; (4) escrever os arquivos de estilo com nomes de classe por componente; (5) entregar a descrição e commit `Feat :sparkles: [#124] Adiciona os estilos da tela de Conteúdo`.
- Pronto quando: cada componente de T9 a T14 e T18 tem classes definidas; o celular empilha sem rolagem horizontal; `cd src/frontend && npm run format:check` passa.
- Teste: nenhum.
- Gate: `cd src/frontend && npm run format:check`
- Modelo: padrao
- Status: pendente

### M2 [P] Revisão visual
- O quê: conferir a tela pronta em computador e celular contra M1 e devolver ajustes ao Itadori.
- Onde: nenhum arquivo.
- Dev: Miwa (designer)
- Depende de: T18, T20
- Reaproveita: M1.
- Atende: CA-64, CA-65
- Passos: (1) abrir em computador; (2) abrir em celular; (3) conferir estados; (4) listar ajustes; (5) registrar no Status.
- Pronto quando: nenhum ajuste em aberto ou ajustes repassados.
- Teste: nenhum.
- Gate: revisão visual
- Modelo: padrao
- Status: pendente

### K1 [P] Regras de Conteúdo na documentação
- O quê: atualizar a regra de Conteúdo com o padrão de alterações pendentes (Salvar/Descartar, contador conforme RN-05, sem aviso ao sair), o Salvar parcial e suas mensagens, último Salvar vale, rótulos e limites dos campos vindos da API, aviso de documento repetido, IA ao desmarcar fora do escopo, pergunta nova ativa, campo ativo valendo ao confirmar, última alteração do topo e "Carga inicial do sistema", prévia com textos do bot, botão "Agendar presencial", alternativa "Se a IA estiver indisponível" e categoria não salva. O que depende de D-U-04, D-U-05 e D-U-06 fica marcado como pendente.
- Onde: `.docs/regras/06-conteudo.md` (seções "Categorias", "Perguntas", "Formulário da pergunta", "Ver como o cidadão recebe").
- Dev: Kusakabe (dev-doc)
- Depende de: aprovação da spec
- Reaproveita: texto atual da regra.
- Atende: RN-04 a RN-08, RN-11, RN-13 a RN-18, RN-20, RN-22, RN-26 a RN-28
- Passos: (1) ler a spec aprovada; (2) atualizar campos e limites; (3) acrescentar o padrão de Salvar e a prévia; (4) gate doc; (5) commit `Docs :bulb: [#124] Atualiza as regras da tela de Conteúdo`.
- Pronto quando: os limites batem com a tabela; nenhuma regra inventada; gate doc ok.
- Teste: nenhum.
- Gate: doc
- Modelo: economico
- Status: feita. Evidência: gate doc ok, limites conferidos com a tabela de divergências, links do 06-conteudo.md abrem; commits 5ec069f e b76ec76; revisada pela Nanami

### K2 [P] Regra geral de Salvar e Descartar
- O quê: incluir Conteúdo entre as telas de configuração em "Salvar, descartar e registrar quem alterou" e tirá-lo da frase das telas de operação, conforme decisão confirmada pelo usuário.
- Onde: `.docs/regras/00-regras-gerais.md` §3.
- Dev: Kusakabe (dev-doc)
- Depende de: aprovação da spec
- Reaproveita: texto atual do §3.
- Atende: RN-04
- Passos: (1) editar o §3; (2) conferir os links; (3) gate doc; (4) commit `Docs :bulb: [#124] Inclui Conteúdo no padrão de salvar e descartar`.
- Pronto quando: o §3 lista Conteúdo entre as telas de configuração e não entre as de operação; gate doc ok.
- Teste: nenhum.
- Gate: doc
- Modelo: economico
- Status: feita. Evidência: gate doc ok, §3 lista Conteúdo entre as telas de configuração e não entre as de operação; commits e9e2d1c e 6de3f02; revisada pela Nanami

### K3 [P] Estado da tela e índices
- O quê: atualizar "Estado da tela" da regra de Conteúdo (tela pronta no painel, #124), o índice das regras e a linha do painel no README.
- Onde: `.docs/regras/06-conteudo.md` ("Estado da tela"), `.docs/regras/README.md` (linha de 06-conteudo, hoje "Pendente (#63)"), `README.md` (linha "Painel web").
- Dev: Kusakabe (dev-doc)
- Depende de: T18, K1
- Reaproveita: formato das outras telas prontas nos mesmos arquivos.
- Atende: critérios de sucesso
- Passos: (1) conferir a tela pronta; (2) atualizar "Estado da tela"; (3) atualizar índice e README; (4) gate doc; (5) commit `Docs :bulb: [#124] Registra a tela de Conteúdo como pronta`.
- Pronto quando: os três arquivos dizem que a tela está pronta; links ok.
- Teste: nenhum.
- Gate: doc
- Modelo: economico
- Status: pendente

## Dúvidas

### Para o product-owner

Nenhuma.

### Para o usuário

- D-U-04 A prévia da API diverge do bot real nos pontos P2, P3, P5 e P6 (ver "Prévia: API x bot real"). Sem mudar a API, o painel não consegue mostrar o balão com IA, os textos do passo seguinte e a navegação da lista como o bot envia sem escrever cópia desses textos. Opções: (a) abrir uma issue separada para a prévia da API devolver as mensagens exatas do bot, usando os mesmos formatadores, e até lá mostrar só o que a API devolve; (b) autorizar o painel a guardar cópia exata dos rótulos do bot que faltam (texto da pergunta de resolução, texto da oferta, "Ver mais opções", "Voltar opções", cabeçalho e botão da lista, rótulos do bloco com IA), com teste comparando com o código do bot; (c) mostrar o que a API devolve mesmo divergente. Qual?
- D-U-05 Fora do escopo (P7): o bot troca a resposta escrita pela equipe por "Esta dúvida está fora do escopo de atendimento do PROCON via WhatsApp.", não manda documentos, coloca o encaminhamento em "O que fazer agora:" e não manda balão separado. A prévia da API mostra a resposta da equipe e um texto de encaminhamento que o bot não envia. A regra e a resposta do PO pedem balão separado com o texto da API. A prévia deve seguir o bot (uma mensagem só, como ele envia) ou o pedido do PO? E o bot ignorar a resposta escrita pela equipe nas perguntas fora do escopo é o esperado ou é um defeito do bot para outra issue?
- D-U-06 Observação sobre o atendimento presencial (P4): o bot não envia esse campo em nenhuma mensagem, mas a prévia da API o mostra no balão da oferta. A prévia deve mostrá-lo (como a API) ou escondê-lo (como o bot)? Se o campo não chega ao cidadão, ele continua no formulário?

## Acréscimo de backend (D-U-04, D-U-05, D-U-06)

> Status do acréscimo: aprovada — aprovação do usuário repassada pela orchestrator em 2026-11-20; não bloqueia as tarefas de frontend já aprovadas (T1 a T19, M1, M2, K1 a K3), exceto T20. As respostas do PO (D-PO-B01 a D-PO-B03) foram confirmadas pelo usuário (repasse da orchestrator).
> Tamanho do acréscimo: grande
> Criado em: 2026-11-20

### Objetivo do acréscimo

O usuário respondeu D-U-04, D-U-05 e D-U-06. Este acréscimo faz duas coisas:

1. A prévia "Ver como o cidadão recebe" passa a devolver exatamente as mensagens que o bot envia, montadas pelo mesmo código que monta as mensagens do bot. Assim o painel não guarda cópia de texto, e prévia e bot não se separam de novo.
2. Corrige o bot em dois pontos: na pergunta fora do escopo, ele passa a usar a resposta escrita pela equipe e a mandar o encaminhamento num balão separado; e passa a enviar ao cidadão a observação sobre o atendimento presencial.

### Efeito sobre o texto já aprovado

O texto aprovado acima não é editado. Para este acréscimo vale o seguinte:

- O bullet "Qualquer mudança na API de Conteúdo ou no bot" de "Fora do escopo" deixa de valer para o que está descrito aqui. Continua valendo para o resto da tela: não existe "salvar tudo de uma vez" e as gravações seguem item a item (RN-06).
- D-U-04, D-U-05 e D-U-06 ficam respondidas pelas decisões RN-B01 a RN-B14 abaixo. As dúvidas que sobraram dessas respostas foram respondidas pelo PO e pelo usuário (ver "Decisões registradas"), e o usuário confirmou as respostas do PO.
- CA-53, CA-56 e CA-61 ("depende de D-U-04") passam a ser verificados com o contrato novo: nenhum texto do bot é copiado no painel, sem exceção autorizada.
- RN-27 (composição da prévia) continua. O item "Fora do escopo: ver D-U-05" passa a ser RN-B06 a RN-B08.
- T20 passa a depender de B1 (contrato novo disponível) e, para a conferência final dos textos, de B2 e B3. Ajuste proposto para a T20 (o corpo original não é editado):
  - Consumir só o novo bloco `botMessages` da resposta da prévia: `categoryList.message` para a lista (1), com a linha `currentRowIndex` em negrito; `aiMessage` para o balão com IA (2); `officialMessages` para os balões (3) e (4) e para a alternativa "Se a IA estiver indisponível".
  - Mudar o pedido da prévia montado no hook da página (T17): passar a enviar `listRows`, com as perguntas ativas da categoria na ordem do rascunho e a pergunta atual marcada. Assim a lista (1) da API sai do rascunho (CA-53, Divergência 5) e a lista que a tela monta sozinha só fica no caso da categoria não salva (RN-28).
  - Remover ou não usar mais: a leitura de `answerBubble` e `nextStepBubble`, qualquer botão "Agendar presencial" escrito no painel (ele passa a vir da API), qualquer rótulo de navegação, cabeçalho ou botão de lista escrito no painel, e o tratamento próprio do fora do escopo.
  - Desenhar a mensagem do tipo "list" (texto, botão da lista, linhas com título e descrição) e a do tipo "buttons" (texto, botões, rodapé) como o WhatsApp mostra, sem trocar nem completar texto.
  - Os campos antigos continuam na API até a T20 terminar (ver "Campos antigos"), então T1 e T15 não quebram enquanto isso. Os tipos novos são acrescentados ao contrato do painel dentro da T20. Depois da T20, a B6 remove os campos antigos da API, e o Itadori remove os tipos antigos do painel na mesma tarefa.

### Regras do acréscimo

| ID | Regra | Fonte |
|---|---|---|
| RN-B01 | O bot real é a fonte da verdade. A prévia mostra exatamente as mensagens que o bot envia para a mesma pergunta: mesmos textos, mesmos botões, mesma ordem de balões. | usuário (D-U-04) |
| RN-B02 | Prévia e bot usam o mesmo código para montar as mensagens. A prévia não tem texto próprio para nenhum balão do bot. | usuário (D-U-04) |
| RN-B03 | Passo seguinte na prévia, como o bot envia: pergunta comum com "A dúvida foi resolvida?" e botões "Sim" / "Não"; pergunta presencial com "Deseja agendar um atendimento presencial no PROCON Jacareí?" e botões "Agendar presencial" / "Agora não". | usuário (D-U-04); bot real |
| RN-B04 | Balão com IA na prévia, como o bot envia: texto da IA, bloco com "Base legal:", "Documentos necessários:", "O que fazer agora:" e a linha de atendimento presencial quando houver, depois o aviso e a pergunta final, com os botões do passo seguinte e o rodapé "Gerado com auxílio de IA". O texto da IA é o texto de exemplo da prévia, sem gerar IA de verdade. | usuário (D-U-04); RN-25 |
| RN-B05 | Lista da categoria na prévia, como o bot envia: cabeçalho "Escolha uma das perguntas abaixo:", botão "Ver perguntas", linhas com título curto e descrição curta, e as linhas de navegação "Voltar opções" e "Ver mais opções" quando houver outra página. A regra de Conteúdo fala em "Ver mais opções ›" e "Voltar"; vale o bot. | usuário (D-U-04) |
| RN-B06 | Pergunta fora do escopo: o bot usa a resposta escrita pela equipe, e não mais "Esta dúvida está fora do escopo de atendimento do PROCON via WhatsApp.". | usuário (D-U-05) |
| RN-B07 | Pergunta fora do escopo: o balão da resposta oficial traz a resposta escrita pela equipe, a base legal (quando houver), os documentos úteis (quando houver) e, no fim, o aviso de caráter não vinculante. Esse balão não traz "O que fazer agora:". Depois dele vem um balão separado com o encaminhamento. Não há botões, não há IA, e a conversa termina como hoje (encerrada como fora do escopo). | usuário (D-U-05); product-owner (D-PO-B02); regra de Conteúdo, "Ver como o cidadão recebe", itens 3 e 4; decisão 008 |
| RN-B08 | O balão de encaminhamento do fora do escopo traz só a frase "Como esta demanda não compete ao PROCON, dirija-se ao órgão indicado na orientação acima portando seus documentos e comprovantes para atendimento especializado.", sem botões. Essa frase não aparece em nenhum outro balão. | product-owner (D-PO-B01); confirmado pelo usuário |
| RN-B09 | O bot envia ao cidadão a observação sobre o atendimento presencial, quando a pergunta exige atendimento presencial e a observação está preenchida. Ela aparece no balão da resposta oficial, logo depois da linha fixa "Esta situação pode exigir atendimento presencial no PROCON Jacareí para andamento formal.", numa linha só, no formato "Sobre o atendimento presencial: <observação>". Com IA, aparece no mesmo ponto do balão com IA. Não é repetida no balão da oferta de agendamento. A prévia mostra a observação onde o bot a envia. | usuário (D-U-06); product-owner (D-PO-B03); formato confirmado pelo usuário |
| RN-B10 | Observação vazia, só com espaços ou de pergunta que não exige atendimento presencial: nada é acrescentado, nem linha em branco. | usuário (D-U-06); regra de Conteúdo (a observação só existe com "Exige atendimento presencial") |
| RN-B11 | A observação presencial não é enviada à IA, e a conferência de números do texto da IA continua igual. A regra de IA não muda. | usuário (escopo: não mudar regra de IA); product-owner (D-PO-B03) |
| RN-B12 | O balão com IA tem um limite de tamanho no WhatsApp (1.024 caracteres no corpo de uma mensagem com botões). Se o texto ficar maior, o bot já manda a resposta oficial no lugar, e isso continua igual. Como a observação entra no balão com IA, essa troca vai acontecer mais vezes nas perguntas presenciais com observação longa; é uma consequência esperada. | bot real; decisão 009; product-owner (D-PO-B03) |
| RN-B13 | Os campos antigos da resposta da prévia são removidos nesta mesma issue, depois de a tela passar a usar só as mensagens do bot (T20): o balão da resposta e o balão do passo seguinte no formato antigo (e o que só existe por causa deles), a lista antiga da categoria e o aviso fixo solto, desde que a T20 confirme que não os usa. O alerta de resposta longa continua na resposta da prévia. | usuário (D-U-B01, D-U-B03) |
| RN-B14 | Pergunta numa categoria ainda não salva (RN-28): a prévia continua mostrando só a lista montada com o rascunho, sem os rótulos do bot (cabeçalho, botão "Ver perguntas", "Voltar opções", "Ver mais opções"). | usuário (D-U-B02) |

### Critérios de aceite do acréscimo

Prévia igual ao bot

- CA-B01 QUANDO a prévia é pedida para uma pergunta comum com IA desligada ENTÃO a resposta DEVE trazer, nas mensagens oficiais, dois balões: o balão da resposta oficial, idêntico ao que o bot envia para a mesma pergunta, e o balão com "A dúvida foi resolvida?" e os botões "Sim" e "Não". (RN-B01, RN-B03)
- CA-B02 QUANDO a prévia é pedida para uma pergunta presencial com IA desligada ENTÃO o segundo balão DEVE ser "Deseja agendar um atendimento presencial no PROCON Jacareí?" com os botões "Agendar presencial" e "Agora não", e o balão oficial DEVE ter a linha de atendimento presencial. (RN-B01, RN-B03)
- CA-B03 QUANDO a prévia é pedida com IA ligada ENTÃO a resposta DEVE trazer um balão com IA montado pelo mesmo código do bot com o texto de exemplo, com o bloco oficial, o aviso, a pergunta final, os botões do passo seguinte e o rodapé "Gerado com auxílio de IA", e também as mensagens oficiais da alternativa "Se a IA estiver indisponível". QUANDO a IA está desligada ENTÃO o balão com IA DEVE vir vazio (nulo). (RN-B04)
- CA-B04 QUANDO a prévia é pedida para uma pergunta fora do escopo ENTÃO as mensagens oficiais DEVEM ser as mesmas que o bot envia depois de B2 (balão oficial com a resposta da equipe e balão separado de encaminhamento, sem botões) e o balão com IA DEVE vir vazio. (RN-B06, RN-B07)
- CA-B05 QUANDO a categoria tem até 10 perguntas ativas ENTÃO a lista da prévia DEVE ter o cabeçalho, o botão e as linhas do bot, sem linhas de navegação. QUANDO tem 11 ou mais e a pergunta está na página 1 ENTÃO a lista DEVE ter 9 perguntas e a linha "Ver mais opções". QUANDO a pergunta está numa página do meio ENTÃO DEVE ter 8 perguntas, "Voltar opções" e "Ver mais opções". QUANDO está na última ENTÃO DEVE ter até 9 perguntas e "Voltar opções". (RN-B05)
- CA-B06 QUANDO o painel envia a ordem das perguntas do rascunho no pedido ENTÃO a lista da prévia DEVE seguir essa ordem, com a pergunta atual na posição enviada e com os títulos que estão no formulário, mesmo que ela esteja inativa no rascunho. QUANDO o painel não envia a ordem ENTÃO a lista DEVE sair das perguntas gravadas, como hoje. (RN-B05; CA-53)
- CA-B07 QUANDO a lista da prévia é devolvida ENTÃO a resposta DEVE indicar qual linha é a pergunta atual, a página em que ela está e o total de páginas, sem que o painel precise ler identificadores. (RN-B05)
- CA-B08 QUANDO o pedido traz a ordem do rascunho com nenhuma ou mais de uma pergunta marcada como atual, título curto acima de 24 caracteres ou descrição curta acima de 72 ENTÃO a API DEVE recusar com erro de validação, sem montar a prévia. (RN-B05)
- CA-B09 QUANDO a mesma pergunta gravada é passada pelo caminho do bot (motor de decisão e formatador) e pela prévia da API ENTÃO as mensagens oficiais e o balão com IA (com o mesmo texto de IA) DEVEM ser idênticos, nos quatro casos: comum, presencial com observação, presencial sem observação e fora do escopo. Esse teste é o que impede prévia e bot de se separarem de novo. (RN-B01, RN-B02)
- CA-B10 QUANDO o código da prévia é conferido ENTÃO não DEVEM existir nele textos próprios de balão do bot: os antigos "Para este caso é necessário atendimento presencial no PROCON Jacareí.", "Deseja agendar um horário?", "A sua dúvida foi resolvida?", "Agendar atendimento" e "Esta dúvida não faz parte do atendimento do PROCON Jacareí. Procure o órgão indicado acima." somem. Só o texto de exemplo da IA continua, porque não é texto do bot (RN-25). (RN-B02)
- CA-B11 QUANDO, antes de B6, a prévia é pedida com os campos de antes (sem a ordem do rascunho) ENTÃO a resposta DEVE continuar trazendo todos os campos antigos com o mesmo formato, preenchidos a partir das mensagens do bot, para que o painel continue funcionando até a T20. (RN-B01)
- CA-B24 QUANDO a B6 termina ENTÃO a resposta da prévia DEVE trazer só `botMessages` e o alerta de resposta longa (sinal e mensagem), sem a lista antiga, o aviso fixo solto, o balão da resposta e o balão do passo seguinte antigos; o painel não DEVE ter mais os tipos antigos; e a prévia na tela DEVE continuar igual à da T20. (RN-B13)
- CA-B12 QUANDO a prévia é pedida ENTÃO nada DEVE ser gravado, e as validações e mensagens de erro que já existem (categoria não encontrada, campos inválidos, sem permissão) DEVEM continuar iguais. (RN-25)

Bot: fora do escopo

- CA-B13 QUANDO o cidadão escolhe uma pergunta fora do escopo ENTÃO o bot DEVE enviar primeiro o balão oficial com a resposta escrita pela equipe, a base legal quando houver, os documentos úteis cadastrados quando houver e o aviso no fim, sem "O que fazer agora:", e depois um balão separado só com a frase "Como esta demanda não compete ao PROCON, dirija-se ao órgão indicado na orientação acima portando seus documentos e comprovantes para atendimento especializado.". (RN-B06, RN-B07, RN-B08)
- CA-B25 QUANDO o bot responde uma pergunta fora do escopo ENTÃO a frase do encaminhamento não DEVE aparecer no balão oficial, só no balão separado. (RN-B08)
- CA-B14 QUANDO o bot responde uma pergunta fora do escopo ENTÃO nenhum dos dois balões DEVE ter botões, a IA não DEVE ser chamada, a conversa DEVE terminar como fora do escopo e o registro de resposta enviada DEVE continuar dizendo que a IA não foi chamada, como hoje. (RN-B07)
- CA-B15 QUANDO o bot responde uma pergunta fora do escopo ENTÃO a frase "Esta dúvida está fora do escopo de atendimento do PROCON via WhatsApp." não DEVE aparecer em nenhuma mensagem. (RN-B06)
- CA-B16 QUANDO a pergunta fora do escopo não tem base legal nem documentos ENTÃO o balão oficial não DEVE ter as linhas "Base legal:" nem "Documentos necessários:". (RN-B07)

Bot: observação presencial

- CA-B17 QUANDO a pergunta exige atendimento presencial, tem observação preenchida e a IA está desligada ou indisponível ENTÃO o balão da resposta oficial DEVE trazer, logo depois da linha "Esta situação pode exigir atendimento presencial no PROCON Jacareí para andamento formal.", o rótulo "Sobre o atendimento presencial:" seguido do texto da observação, antes do aviso. (RN-B09)
- CA-B18 QUANDO a pergunta exige atendimento presencial, tem observação e a IA responde ENTÃO o balão com IA DEVE trazer a observação com o mesmo rótulo, logo depois da linha de atendimento presencial do bloco oficial. Se o balão passar de 1.024 caracteres, o bot DEVE mandar a resposta oficial com a observação, como já faz hoje. (RN-B09, RN-B12)
- CA-B26 QUANDO a pergunta presencial com observação é respondida ENTÃO o balão da oferta ("Deseja agendar um atendimento presencial no PROCON Jacareí?" com "Agendar presencial" / "Agora não") DEVE continuar igual ao de hoje, sem a observação. (RN-B09)
- CA-B19 QUANDO a observação está vazia, só com espaços, ou a pergunta não exige atendimento presencial ENTÃO as mensagens DEVEM ser exatamente as de hoje, sem linha nova nem linha em branco. (RN-B10)
- CA-B20 QUANDO o bot pede o texto à IA ENTÃO os dados enviados à IA não DEVEM conter a observação presencial, e a conferência de números do texto da IA DEVE continuar igual. (RN-B11)
- CA-B21 QUANDO a resposta de uma pergunta presencial é recuperada depois de uma falha de entrega (resposta que ficou sem envio) ENTÃO a mensagem recuperada DEVE trazer a observação do mesmo jeito. (RN-B09)

O que funcionava continua funcionando

- CA-B22 QUANDO o cidadão escolhe uma pergunta comum ou presencial sem observação ENTÃO as mensagens, os botões, os estados da conversa e os registros DEVEM ser os mesmos de antes deste acréscimo. (RN-B10)
- CA-B23 QUANDO o cidadão responde "Não" à pergunta de resolução ENTÃO a oferta de agendamento DEVE continuar igual à de hoje, sem observação, e o fluxo de agendamento DEVE continuar igual. (RN-B09)

### Critérios de sucesso do acréscimo

- A prévia da tela de Conteúdo mostra o que o bot envia sem nenhum texto do bot escrito no painel ou no código da prévia.
- Um teste automático falha se alguém mudar uma mensagem do bot sem que a prévia acompanhe, ou o contrário.
- O cidadão recebe a resposta escrita pela equipe nas perguntas fora do escopo e a observação presencial nas perguntas presenciais.
- Lint, build, checagem de tipos e suíte do backend passam, e os testes de integração da prévia passam num banco separado.

### Fora do escopo do acréscimo

- Fluxo de agendamento em si (quem comparece, nome, CPF, horários, confirmação): não muda.
- Regra de IA (quando usa, o que pede, conferência de números, limite de tamanho, fila): não muda. A única mudança no caminho da IA é a observação aparecer no balão com IA (RN-B09), sem ser enviada à IA.
- Gerar IA de verdade na prévia: continua o texto de exemplo (RN-25).
- Prévia da lista de categorias, saudação e mensagens de agendamento: a prévia cobre só a lista de perguntas da categoria e a resposta.
- Prévia completa para categoria ainda não salva (RN-28): continua como está, sem os rótulos do bot (RN-B14).
- Mudanças no frontend: ficam na T20 e na parte do painel da B6, do Itadori.
- Limite de 4.096 caracteres do balão de texto do WhatsApp na resposta oficial longa: risco que já existe hoje e não muda com este acréscimo.

### Desenho do acréscimo

#### Uma só fonte para as mensagens

- O formatador de mensagens do bot continua sendo o único lugar com textos de balão. A prévia passa a chamar as mesmas funções que o bot chama:
  - balão oficial e passo seguinte: a mesma função que o fluxo da conversa usa para a resposta oficial, que depois de B2 também cobre o fora do escopo (balão oficial e balão de encaminhamento);
  - balão com IA: a mesma função que o serviço de IA usa, recebendo o texto de exemplo no lugar do texto gerado;
  - lista: a mesma função que o fluxo usa para mostrar as perguntas de uma categoria, com a página em que a pergunta atual está.
- A prévia monta, a partir dos dados do formulário, a mesma estrutura de resposta que o motor de decisão monta a partir da pergunta gravada (categoria, pergunta, base legal, resposta, documentos, presencial, fora do escopo e, a partir de B0, observação presencial). O teste de CA-B09 garante que as duas montagens dão o mesmo resultado.
- A prévia não precisa mexer no formatador: as funções e constantes de que ela precisa já são públicas. Por isso B1 não toca os arquivos de B2 e B3 e pode rodar ao mesmo tempo.
- Fora do escopo (B2): a função de resposta oficial do formatador passa a devolver, para fora do escopo, o balão oficial (sem "O que fazer agora:") seguido de um balão de texto com a frase do encaminhamento, sem botões. A frase sai de "O que fazer agora:" e vira uma constante do formatador usada só no balão separado. O fluxo da conversa passa a usar essa função no ramo do fora do escopo, continua encerrando a conversa como fora do escopo e o texto numerado de apoio da resposta passa a ser os dois balões juntos. O motor de decisão deixa de trocar a resposta e passa a buscar os documentos também no fora do escopo, sem mudar a consulta ao banco.
- Observação presencial (B3): entra como campo opcional na estrutura de resposta, preenchido pelo motor só quando a pergunta é presencial e a observação não está em branco; quando não há observação, o campo fica ausente, para que as respostas de hoje continuem idênticas. O formatador a coloca logo depois da linha fixa de atendimento presencial, como "Sobre o atendimento presencial: <observação>", tanto na resposta oficial quanto no bloco oficial do balão com IA, e não a coloca no balão da oferta. O cliente da IA tira esse campo dos dados que manda à IA (RN-B11). O formato numa linha só ("rótulo: texto", como "Base legal:") foi confirmado pelo usuário.

#### Contrato novo da resposta da prévia

O pedido (`POST /api/v1/content/questions/preview` e `POST /api/v1/content/preview`) ganha um campo opcional. Os outros campos não mudam.

```ts
interface PreviewListRowInput {
    questionId: number | null
    shortTitle: string
    shortDescription: string | null
    isCurrent: boolean
}

interface QuestionPreviewInput {
    questionId?: number
    categoryId: number
    shortTitle: string
    shortDescription: string | null
    question: string
    answer: string
    legalBasis: string | null
    requiredDocuments: string[]
    requiresInPerson: boolean
    inPersonNote: string | null
    outOfScope: boolean
    llmAllowed: boolean
    listRows?: PreviewListRowInput[]
}
```

- `listRows`: perguntas ativas da categoria na ordem do rascunho, com exatamente uma marcada como atual. A linha atual entra sempre, mesmo que a pergunta esteja inativa no rascunho, como a prévia já faz hoje. Na linha atual, a API usa o título curto e a descrição curta do formulário. Cada linha segue os limites do título curto (24) e da descrição curta (72). Limite técnico de 500 linhas, só para proteger a API. Sem `listRows`, a lista sai das perguntas gravadas, como hoje.

A resposta (dentro de `{ data }`) ganha o bloco `botMessages`. Os campos antigos continuam até a B6, que os remove (RN-B13).

```ts
interface ListRow {
    id: string
    title: string
    description?: string
}

interface ReplyButton {
    id: string
    title: string
}

type OutgoingMessage =
    | { type: "text"; text: string }
    | { type: "list"; text: string; buttonText: string; rows: ListRow[]; footer?: string }
    | { type: "buttons"; text: string; buttons: ReplyButton[]; footer?: string }

interface PreviewBotList {
    message: Extract<OutgoingMessage, { type: "list" }>
    currentRowIndex: number
    page: number
    totalPages: number
}

interface PreviewBotMessages {
    categoryList: PreviewBotList
    officialMessages: OutgoingMessage[]
    aiMessage: Extract<OutgoingMessage, { type: "buttons" }> | null
}

interface QuestionPreviewResult {
    fixedDisclaimer: string
    answerLengthWarning: boolean
    answerLengthWarningMessage: string | null
    categoryList: PreviewCategoryListSection
    answerBubble: PreviewAnswerBubble
    nextStepBubble: PreviewNextStepBubble | null
    botMessages: PreviewBotMessages
}
```

- `OutgoingMessage`, `ListRow` e `ReplyButton` são os tipos que o bot já usa para enviar mensagens ao WhatsApp; a prévia devolve os mesmos objetos.
- `categoryList.message`: a mensagem de lista do bot para a página em que a pergunta atual está, com as linhas de navegação. `currentRowIndex` é a posição da pergunta atual dentro de `message.rows` (as linhas de navegação vêm depois das perguntas). A pergunta nova, ainda sem id, recebe na linha um id provisório que não colide com ids reais; o painel não deve usar os ids das linhas.
- `officialMessages`: exatamente o que o bot envia sem IA. Pergunta comum ou presencial: dois itens (texto do balão oficial e botões do passo seguinte). Fora do escopo, depois de B2: dois itens de texto (balão oficial e encaminhamento). Antes de B2 o fora do escopo sai com um item só, porque é o que o bot envia hoje.
- `aiMessage`: o balão com IA que o bot monta com o texto de exemplo; nulo quando a IA está desligada ou a pergunta é fora do escopo.
- O nome `botMessages` existe porque `categoryList` já é usado pelo campo antigo.

Exemplo, pergunta comum com IA ligada (textos encurtados com "…"):

```json
{
  "data": {
    "botMessages": {
      "categoryList": {
        "message": {
          "type": "list",
          "text": "Escolha uma das perguntas abaixo:",
          "buttonText": "Ver perguntas",
          "rows": [
            { "id": "q_10", "title": "Arrependimento", "description": "Compra fora da loja" },
            { "id": "q_11", "title": "Garantia" },
            { "id": "page_2", "title": "Ver mais opções", "description": "Exibir mais perguntas" }
          ]
        },
        "currentRowIndex": 0,
        "page": 1,
        "totalPages": 2
      },
      "officialMessages": [
        { "type": "text", "text": "Categoria: Contratos\nPergunta: …\nBase legal: CDC, art. 49\nResposta: …\n\nO que fazer agora:\n…\n\nEsta é uma orientação automatizada …" },
        { "type": "buttons", "text": "A dúvida foi resolvida?", "buttons": [ { "id": "resolved_yes", "title": "Sim" }, { "id": "resolved_no", "title": "Não" } ] }
      ],
      "aiMessage": {
        "type": "buttons",
        "text": "Exemplo ilustrativo …\n\nBase legal: CDC, art. 49\n\nO que fazer agora:\n…\n\nEsta é uma orientação automatizada …\n\nA dúvida foi resolvida?",
        "buttons": [ { "id": "resolved_yes", "title": "Sim" }, { "id": "resolved_no", "title": "Não" } ],
        "footer": "Gerado com auxílio de IA"
      }
    },
    "fixedDisclaimer": "…",
    "answerLengthWarning": false,
    "answerLengthWarningMessage": null,
    "categoryList": { "…": "campo antigo" },
    "answerBubble": { "…": "campo antigo" },
    "nextStepBubble": { "…": "campo antigo" }
  }
}
```

#### Campos antigos

Decisão (D-U-B01): manter os campos antigos, com o mesmo formato, até a T20 terminar, e removê-los na B6, ainda nesta issue. Isso reduz o risco: o T1 do Itadori já espelhou os tipos antigos e o T15 já converte esses campos em balões; nenhum dos dois quebra enquanto a T20 não troca o consumo. Os campos antigos deixam de ter texto próprio e passam a ser preenchidos a partir de `botMessages`, então os valores de alguns mudam (para o que o bot envia).

| Campo antigo | Passa a ser preenchido com | Muda de valor? |
|---|---|---|
| `fixedDisclaimer`, `answerBubble.disclaimer` | o aviso do formatador do bot | não |
| `answerLengthWarning`, `answerLengthWarningMessage` | igual a hoje | não |
| `categoryList.rows`, `hasMoreOptions`, `totalActiveQuestions` | a mesma paginação de `botMessages.categoryList`, inclusive com `listRows` quando enviado | só quando `listRows` é enviado |
| `answerBubble.formattedText` | texto do primeiro item de `officialMessages` | passa a ter a observação (B3) e, no fora do escopo, a resposta da equipe (B2) |
| `answerBubble.outOfScopeNotice` | texto do segundo item de `officialMessages` no fora do escopo, ou nulo | sim: deixa de ser a frase própria da prévia; nulo até B2 |
| `answerBubble.aiSampleLabel` | rodapé de `aiMessage`, ou nulo | não (mesmo texto, agora vindo do bot) |
| `answerBubble.aiSampleText`, `question`, `answer`, `legalBasis`, `requiredDocuments`, `llmAllowed` | igual a hoje | não |
| `nextStepBubble.type` | "schedule_offer" na presencial, "resolution" na comum, nulo no fora do escopo | não |
| `nextStepBubble.text` e `prompt` | texto do item de botões de `officialMessages` | sim: "A dúvida foi resolvida?" e "Deseja agendar um atendimento presencial no PROCON Jacareí?" |
| `nextStepBubble.buttons` | títulos dos botões desse item | sim: "Agendar presencial" no lugar de "Agendar atendimento" |
| `nextStepBubble.inPersonNote` | igual a hoje | não |
| `nextStepBubble.formattedText` | a versão numerada do bot (já é texto do bot) | não |

Efeito no frontend: T1 e T15 seguem compilando e passando até a T20, porque os testes deles simulam a API. A T20 troca o consumo para `botMessages` e para de ler os campos antigos. Na B6, saem da API e do painel `answerBubble`, `nextStepBubble` e seus tipos (`PreviewAnswerBubble`, `PreviewNextStepBubble`, `PreviewNextStepType`), e o que só existia para preenchê-los; saem também o campo antigo `categoryList` (`PreviewCategoryListSection`, `PreviewCategoryListRow`) e `fixedDisclaimer`, desde que a T20 confirme que não os usa (D-U-B03). Ficam `answerLengthWarning` e `answerLengthWarningMessage`. Depois da B6, a resposta da prévia é `{ botMessages, answerLengthWarning, answerLengthWarningMessage }`.

### Plano de execução do acréscimo

Gates do backend (rodar a partir da raiz da worktree):

- Gate rápido backend: `cd src/backend && npx vitest run <arquivos de teste da tarefa>`
- Gate completo backend (padrão do CONTRIBUTING): `cd src/backend && npm run lint && npm run build && npm run typecheck:test && npm test`
- Gate integração backend: num banco separado com as migrations aplicadas, como no README do backend: `docker compose exec postgres psql -U proconchat -d proconchat -c "CREATE DATABASE proconchat_test"` (uma vez), `export DB_URL=postgresql://proconchat:<POSTGRES_PASSWORD>@localhost:5433/proconchat_test`, `cd src/backend && npm run db:migrate && npm run test:integration`
- Gate doc: conferir que os links relativos abrem e que o texto bate com a spec, com o código e com as decisões registradas

Fases (o frontend T1 a T19 não depende de nenhuma delas e roda ao mesmo tempo):

- Fase B1 (sequencial): B0
- Fase B2 (paralelo, depois de B0): B1 [P] · B2 [P] · B5 [P]
- Fase B3: B3 (pode rodar ao mesmo tempo que B1). B2 e B3 rodam em qualquer ordem, nunca ao mesmo tempo
- Fase B4: B4 (depois de B1, B2 e B3)
- Fase B5: T20 (Itadori) pode começar quando B1 estiver feita e fecha depois de B4
- Fase B6: B6 (Todo, com a parte do painel feita pelo Itadori), depois de T20 e B4
- Depois: T19, M2 e K3, como no plano original, também depois de B6.

Gates de frontend usados na B6: os do plano original (gate rápido `cd src/frontend && npx vitest run <arquivos de teste da tarefa>`; gate completo `cd src/frontend && npm run lint && npm run typecheck && npm run test:run`).

B2 e B3 não são [P] entre si porque mexem nos mesmos arquivos (formatador, motor de decisão e seus testes). Tarefas do Todo: B0, B1, B2, B3, B4, B6 (parte da API). Do Kusakabe: B5. Do Itadori: T20 e a parte do painel da B6.

Regras para todas as tarefas do acréscimo: nunca escrever comentários; TDD (o teste citado em "Teste" é escrito e falha antes do código); no máximo 5 passos; um commit atômico por tarefa no padrão `Feat :sparkles: [#124] <descrição>` (correções do bot: `Fix :bug: [#124] <descrição>`); nunca alterar teste para fazê-lo passar. Os testes listados como "mudam" em cada tarefa mudam porque o comportamento mudou por decisão do usuário; isso faz parte da entrega. Se outro teste quebrar, avisar a orchestrator em vez de editar em silêncio.

### Tarefas do acréscimo

#### B0 Contrato dos tipos
- O quê: acrescentar o campo opcional de observação presencial na estrutura de resposta do motor e os tipos novos da prévia (linha do pedido, lista do bot, bloco de mensagens do bot), sem ligar nada ainda.
- Onde: `src/backend/types/motorDecisao.types.ts` (`RespostaFinalOutput.observacao_presencial?: string | null`); `src/backend/types/content.types.ts` (`PreviewListRowInput`, `PreviewBotList`, `PreviewBotMessages`; `listRows?` em `QuestionPreviewInput`).
- Dev: Todo (dev-backend)
- Depende de: aprovação do acréscimo
- Reaproveita: `OutgoingMessage`, `ListRow`, `ReplyButton` de `src/backend/types/message.types.ts`.
- Atende: contrato de "Desenho do acréscimo"
- Passos: (1) tipo da estrutura de resposta; (2) tipos da prévia, sem tornar `botMessages` obrigatório ainda; (3) gate completo backend; (4) commit `Feat :sparkles: [#124] Adiciona os tipos da prévia igual ao bot e da observação presencial`.
- Pronto quando: os tipos existem com os nomes do contrato; nenhum comportamento muda; gate completo backend passa sem mexer em teste.
- Teste: nenhum (só tipos; a checagem de tipos é o gate).
- Gate: completo backend
- Modelo: economico
- Status: feita. Evidência: lint, build, typecheck:test e npm test do backend passam (139 arquivos, 1946 testes, nenhum alterado); commit 4f84d55

#### B1 [P] Prévia usa o formatador do bot
- O quê: reescrever a montagem da prévia para chamar as funções do formatador do bot (resposta oficial, balão com IA, lista de perguntas), devolver `botMessages`, aceitar `listRows`, preencher os campos antigos a partir das mensagens do bot e apagar os textos próprios da prévia.
- Onde: `src/backend/services/contentRules.ts` (`buildQuestionPreview`; remover `IN_PERSON_HEADER`, `IN_PERSON_PROMPT`, `RESOLUTION_PROMPT`, `OUT_OF_SCOPE_NOTICE`, `AI_SAMPLE_LABEL`; manter `AI_SAMPLE_TEXT`); `src/backend/types/content.types.ts` (`botMessages` obrigatório em `QuestionPreviewResult`); `src/backend/schemas/content.schema.ts` (`listRows` em `questionPreviewBodySchema`); testes `src/backend/services/contentRules.test.ts`, `src/backend/schemas/content.schema.test.ts`, `src/backend/services/content.service.test.ts`.
- Dev: Todo (dev-backend)
- Depende de: B0
- Reaproveita: `mensagensRespostaOficial`, `montarMensagemIa`, `criarMensagensPerguntas`, `paginarItens`, `AVISO_NAO_VINCULANTE`, `ROTULO_IA`, `OFERTA_AGENDAMENTO`, `PERGUNTA_RESOLVIDA` de `src/backend/services/messageFormatter.service.ts`, sem editar esse arquivo.
- Atende: RN-B01 a RN-B05, CA-B01, CA-B02, CA-B03, CA-B05, CA-B06, CA-B07, CA-B08, CA-B10, CA-B11, CA-B12
- Passos: (1) testes que comparam `botMessages` com a chamada do formatador para a mesma entrada (comum, presencial, IA ligada e desligada, 11, 18 e 19 perguntas com a atual em cada página, `listRows` com a atual no meio), testes de validação de `listRows` e teste de que os campos antigos saem das mensagens do bot; (2) montagem da estrutura de resposta a partir da entrada e chamada do formatador; (3) lista com `listRows` ou perguntas gravadas, `currentRowIndex`, página e total; (4) campos antigos a partir de `botMessages` e remoção dos textos próprios; (5) gate completo backend e commit `Feat :sparkles: [#124] Monta a prévia do Conteúdo com o formatador do bot`.
- Pronto quando: `botMessages.officialMessages` é igual a `mensagensRespostaOficial` da mesma estrutura; `aiMessage` é igual a `montarMensagemIa(AI_SAMPLE_TEXT, …)` ou nulo; a lista é igual a `criarMensagensPerguntas` da página certa; nenhuma das cinco frases de CA-B10 existe na prévia; gate completo backend passa.
- Teste: unitário. Falha primeiro "prévia de pergunta comum devolve em officialMessages o mesmo que mensagensRespostaOficial". Os testes comparam com a chamada do formatador, e não com frases escritas, para que B2 e B3 não os quebrem.
- Testes que mudam (comportamento): em `contentRules.test.ts`, os casos que esperam "Para este caso é necessário…", "Deseja agendar um horário?", "A sua dúvida foi resolvida?", "Agendar atendimento", a frase própria de fora do escopo e `AI_SAMPLE_LABEL`. Ficam intactos: `content.controller.test.ts`, `content.routes.test.ts`, os demais casos de `content.service.test.ts` (o tipo "resolution" continua) e os casos de páginas e listas de `contentRules.test.ts`. `content.schema.test.ts` só ganha casos.
- Gate: rápido e completo backend
- Modelo: padrao
- Status: feita. Evidência: testes escritos primeiro e vistos falhar (botMessages ausente, listRows ignorado); lint, build, typecheck:test e npm test do backend passam (139 arquivos, 1963 testes); commit 70dee01. Testes alterados por comportamento em contentRules.test.ts: texto do passo seguinte, botão "Agendar presencial", rodapé da IA e sem frase própria do fora do escopo. Observação: no fora do escopo a prévia ainda sai com um balão só (como o bot hoje) até a B2

#### B2 [P] Bot: fora do escopo com a resposta da equipe e balão separado
- O quê: o motor deixa de trocar a resposta do fora do escopo e passa a trazer os documentos; o formatador passa a devolver, no fora do escopo, o balão oficial e o balão de encaminhamento; o fluxo da conversa usa essa saída e continua encerrando como fora do escopo.
- Onde: `src/backend/services/motorDecisao.service.ts` (`processarPergunta`); `src/backend/services/messageFormatter.service.ts` (`formatarRespostaFinal` sem "O que fazer agora:" no fora do escopo, `textoProximosPassos` sem o ramo do fora do escopo, `mensagensRespostaOficial`, constante exportada com a frase do encaminhamento); `src/backend/services/conversationFlow.service.ts` (ramo fora do escopo de `processSelectedQuestion`); `src/backend/services/mock/conversationFlow.fixtures.ts` (`respostaForaEscopo`); testes `motorDecisao.service.test.ts`, `messageFormatter.service.test.ts`, `conversationFlow.service.test.ts`.
- Dev: Todo (dev-backend)
- Depende de: B0; B3 antes ou depois, nunca ao mesmo tempo (mesmos arquivos)
- Reaproveita: `formatarRespostaFinal`, `mensagensRespostaOficial`, `getDocumentosPorPergunta` do repositório (a consulta não muda), `finishOrLog` com `OUT_OF_SCOPE`.
- Atende: RN-B06, RN-B07, RN-B08, CA-B04 (lado do bot), CA-B13, CA-B14, CA-B15, CA-B16, CA-B22, CA-B25
- Passos: (1) testes: motor devolve a resposta e os documentos da equipe no fora do escopo; balão oficial sem "O que fazer agora:" e sem a frase do encaminhamento; segundo balão só com a frase do encaminhamento, sem botões; fluxo envia os dois balões, encerra com `OUT_OF_SCOPE` e IA "NOT_CALLED"; pergunta comum e presencial continuam iguais; (2) motor; (3) formatador; (4) fluxo e fixture; (5) gate completo backend e commit `Fix :bug: [#124] Envia a resposta da equipe e o encaminhamento separado no fora do escopo`.
- Pronto quando: a frase "Esta dúvida está fora do escopo de atendimento do PROCON via WhatsApp." não existe mais no código; o fora do escopo sai em dois balões; o desfecho continua `OUT_OF_SCOPE`; gate completo backend passa.
- Teste: unitário. Falha primeiro "motor devolve a resposta escrita pela equipe na pergunta fora do escopo".
- Testes que mudam (comportamento): `motorDecisao.service.test.ts` (o caso que espera a frase trocada e os documentos vazios); `conversationFlow.service.test.ts` (o caso "pergunta fora do escopo encerra com OUT_OF_SCOPE" passa a conferir dois balões; o encerramento continua igual); `messageFormatter.service.test.ts` (casos de fora do escopo em `formatarRespostaFinal`/"O que fazer agora", que deixa de aparecer no fora do escopo por D-PO-B02). Ficam intactos: `conversationFlow.llm.test.ts` (o encerramento `OUT_OF_SCOPE` não muda), `llmExplicacao.service.test.ts`, `conversationFlow.fullFlow.test.ts`, `conversationFlow.pending.test.ts`, `conversationFlow.delivery.test.ts`, os testes de agendamento, retorno e pausa, e `motorDecisao.integration.test.ts`.
- Gate: rápido e completo backend
- Modelo: padrao
- Status: feita. Evidência: testes escritos primeiro e vistos falhar (motor, formatador, fluxo); lint, build, typecheck:test e npm test do backend passam (139 arquivos, 1966 testes); commit f922131. Testes alterados por comportamento: motorDecisao.service.test.ts (resposta e documentos da equipe), conversationFlow.service.test.ts (dois balões de texto) e o caso de fora do escopo em contentRules.test.ts (agora igual ao bot). Dado de teste: pergunta 2 do repositório simulado ganhou resposta e documento

#### B3 Bot: enviar a observação presencial
- O quê: o motor passa a preencher a observação presencial quando a pergunta é presencial e a observação não está em branco; o formatador a coloca como "Sobre o atendimento presencial: <observação>" logo depois da linha fixa de atendimento presencial, na resposta oficial e no balão com IA, e não no balão da oferta; o cliente da IA não a envia à IA.
- Onde: `src/backend/services/motorDecisao.service.ts`; `src/backend/services/messageFormatter.service.ts` (`formatarRespostaFinal`, `blocoOficialIa`, constante exportada com o rótulo); `src/backend/clients/ollamaLlm.client.ts` (dados do prompt sem o campo); testes `motorDecisao.service.test.ts`, `messageFormatter.service.test.ts`, `messageFormatter.ia.test.ts`, `ollamaLlm.client.test.ts`, `llmAnswer.service.test.ts`, `conversationFlow.pending.test.ts`.
- Dev: Todo (dev-backend)
- Depende de: B0; B2 antes ou depois, nunca ao mesmo tempo (mesmos arquivos)
- Reaproveita: `in_person_note` que o repositório do motor já lê (`SELECT *`); `LIMITE_CORPO_BOTOES` e o retorno à resposta oficial já existentes no serviço de IA; `officialAnswerReply` e `recoverMissingAnswer` (passam a trazer a observação sem mudança no fluxo).
- Atende: RN-B09 a RN-B12, CA-B17 a CA-B23, CA-B26
- Passos: (1) testes: motor preenche a observação só em pergunta presencial com texto, e deixa o campo ausente nos outros casos; formatador mostra "Sobre o atendimento presencial: <observação>" logo depois da linha fixa, na resposta oficial e no balão com IA, sem nada quando ela está vazia; balão da oferta igual ao de hoje; balão com IA com observação e retorno à resposta oficial quando passa de 1.024; prompt da IA sem a observação; resposta recuperada traz a observação; (2) motor; (3) formatador; (4) cliente da IA; (5) gate completo backend e commit `Fix :bug: [#124] Envia ao cidadão a observação sobre o atendimento presencial`.
- Pronto quando: os casos acima passam; sem observação, todas as mensagens são idênticas às de antes; gate completo backend passa.
- Teste: unitário. Falha primeiro "pergunta presencial com observação mostra 'Sobre o atendimento presencial:' logo depois da linha de atendimento presencial na resposta oficial".
- Testes que mudam: nenhum por mudança de comportamento, porque sem observação tudo continua igual; os arquivos listados só ganham casos. Se algum caso existente de `motorDecisao.service.test.ts` comparar o objeto inteiro de uma pergunta presencial com observação no repositório simulado, ele muda por comportamento e deve ser citado no commit. Ficam intactos: `conversationFlow.fullFlow.test.ts`, os testes de agendamento, `llmExplicacao.service.test.ts`.
- Gate: rápido e completo backend
- Modelo: padrao
- Status: feita. Evidência: testes escritos primeiro e vistos falhar (motor, formatador, IA, cliente da IA); lint, build, typecheck:test e npm test do backend passam (139 arquivos, 1977 testes); nenhum teste existente alterado. Depois da revisão da Nanami, entraram os casos do retorno à resposta oficial acima de 1.024 caracteres com a observação (llmAnswer.service.test.ts) e da resposta recuperada com a observação (conversationFlow.pending.test.ts); npm test do backend com 140 arquivos e 1997 testes

#### B4 Testes de rota, integração e "prévia igual ao bot"
- O quê: teste que passa a mesma pergunta pelo motor do bot e pela prévia e exige mensagens idênticas, mais os testes de rota e de integração da prévia com o contrato novo.
- Onde: novo `src/backend/services/contentPreview.bot.test.ts`; `src/backend/routes/content.routes.test.ts`; `src/backend/tests/integration/content.integration.test.ts`.
- Dev: Todo (dev-backend)
- Depende de: B1, B2, B3
- Reaproveita: `motorDecisaoMock.repository.ts` e `contentStub.repository.ts` de `src/backend/repositories/mock/`; helpers de `tests/integration/helpers/`.
- Atende: CA-B04, CA-B06, CA-B09, CA-B11, CA-B12
- Passos: (1) teste "prévia igual ao bot" para comum, presencial com e sem observação e fora do escopo; (2) rota: `botMessages` presente, `listRows` inválido recusado com 400, campos antigos presentes; (3) integração: prévia de pergunta presencial com observação e de fora do escopo com os textos finais; (4) gate completo e gate integração backend; (5) commit `Test :test_tube: [#124] Garante que a prévia do Conteúdo é igual ao que o bot envia`.
- Pronto quando: os testes novos passam; mudar uma frase do formatador sem a prévia acompanhar (ou o contrário) faz o teste de CA-B09 falhar; gate completo e gate integração backend passam.
- Teste: unitário, rota e integração. Falha primeiro "pergunta fora do escopo: a prévia devolve as mesmas mensagens que o bot envia" (falha se B1 não montar a estrutura igual ao motor).
- Testes que mudam: nenhum por comportamento; `content.routes.test.ts` e `content.integration.test.ts` só ganham casos (os que conferem `nextStepBubble.type` e `nextStepBubble.inPersonNote` continuam valendo).
- Gate: completo e integração backend
- Modelo: padrao
- Status: feita. Evidência: teste "prévia igual ao bot" (7 casos) conferido por mutação (tirar a observação da prévia faz falhar); rotas da prévia (4 casos novos); integração com 1 caso novo; gate completo backend 140 arquivos e 1988 testes; integração em banco separado proconchat_test (47 arquivos, 413 testes); nenhum teste existente alterado. Os testes passaram de primeira porque B1 a B3 já estavam feitas

#### B5 [P] Documentação do acréscimo
- O quê: registrar na documentação que a prévia mostra exatamente o que o bot envia, o fora do escopo com a resposta da equipe e balão separado, e a observação presencial enviada ao cidadão.
- Onde: `.docs/regras/06-conteudo.md` (remover o parágrafo "Pendente (alinhamento da prévia com o bot…)" e ajustar "Ver como o cidadão recebe": rótulos da lista do bot, item 4 do fora do escopo, observação presencial); `.docs/decisoes/008-fluxo-da-conversa-e-desfechos.md` e `.docs/sprints/sprint2/fluxo-conversa.md` (fora do escopo); `.docs/llm/contrato.md` e `.docs/llm/modelo.md` só se citarem a mensagem trocada ou os dados enviados à IA; `src/backend/README.md` (linha da prévia de Conteúdo e o que ela reaproveita do formatador); memória do time só se a orchestrator pedir a outro agente (o Kusakabe não grava nela sem pedido).
- Dev: Kusakabe (dev-doc)
- Depende de: aprovação do acréscimo; para conferir os textos com o código, B2 e B3
- Reaproveita: texto atual das regras, decisões e README.
- Atende: RN-B01 a RN-B12
- Passos: (1) ler o acréscimo aprovado e as respostas; (2) regra de Conteúdo; (3) decisão 008, fluxo da conversa e docs de IA, se citarem; (4) README do backend e gate doc; (5) commit `Docs :bulb: [#124] Registra a prévia igual ao bot e as correções do fora do escopo e da observação presencial`.
- Pronto quando: não sobra "Pendente" sobre a prévia na regra de Conteúdo; os textos batem com o código depois de B2 e B3; nenhuma regra inventada; gate doc ok.
- Teste: nenhum.
- Gate: doc
- Modelo: economico
- Status: feita. Evidência: gate doc ok, sem "Pendente" sobre a prévia na regra de Conteúdo, links conferidos; texto escrito conforme as decisões do usuário e RN-B01 a RN-B12; textos conferidos contra o código de B2 (f922131) e B3 (68d8fb4): frase de encaminhamento, balão oficial do fora do escopo sem "O que fazer agora:", linha "Sobre o atendimento presencial:" e observação fora do prompt da IA; corrigida a descrição do prompt em llm/contrato.md

#### B6 Remover os campos antigos da prévia
- O quê: tirar da resposta da prévia e do painel os campos antigos `answerBubble`, `nextStepBubble`, `categoryList` e `fixedDisclaimer`, seus tipos e o que só existia para preenchê-los, depois de a tela passar a usar só `botMessages`; `answerLengthWarning` e `answerLengthWarningMessage` ficam.
- Onde: API (Todo): `src/backend/types/content.types.ts` (`PreviewAnswerBubble`, `PreviewNextStepBubble`, `PreviewNextStepType`, `PreviewCategoryListSection`, `PreviewCategoryListRow` e os quatro campos em `QuestionPreviewResult`); `src/backend/services/contentRules.ts` (preenchimento dos campos antigos e imports que só serviam a eles, como `OFERTA_AGENDAMENTO` e `PERGUNTA_RESOLVIDA`); testes `src/backend/services/contentRules.test.ts`, `src/backend/services/content.service.test.ts`, `src/backend/routes/content.routes.test.ts`, `src/backend/tests/integration/content.integration.test.ts`; `src/backend/README.md` (linha da prévia). Painel (Itadori, combinado com o Todo): os tipos antigos da prévia em `src/frontend/src/types/content/` e qualquer uso restante em `src/frontend/src/utils/content/` e nos testes.
- Dev: Todo (dev-backend), com a parte do painel feita pelo Itadori (dev-frontend)
- Depende de: T20 feita; B4
- Reaproveita: `botMessages` de B1; o consumo novo da T20.
- Atende: RN-B13, CA-B24
- Passos: (1) Itadori confirma que a T20 não usa `categoryList` nem `fixedDisclaimer` (se usar, esses dois ficam e o motivo vai no Status); nos testes da API, trocar as conferências dos campos antigos pelas de `botMessages` e acrescentar a conferência de que os campos removidos não vêm mais e o alerta de tamanho continua; (2) remover tipos e preenchimento na API e atualizar o README do backend; (3) Itadori remove os tipos antigos do painel e confirma que nada mais os usa; (4) gate completo backend, gate integração backend e gate completo frontend; (5) commits atômicos `Refactor :recycle: [#124] Remove os campos antigos da prévia do Conteúdo na API` (Todo) e `Refactor :recycle: [#124] Remove os tipos antigos da prévia do Conteúdo no painel` (Itadori).
- Pronto quando: a resposta da prévia é `{ botMessages, answerLengthWarning, answerLengthWarningMessage }`, sem `answerBubble`, `nextStepBubble`, `categoryList` e `fixedDisclaimer`; nenhum código da API ou do painel cita os tipos removidos; a prévia na tela continua igual à da T20; gates passam.
- Teste: unitário, rota e integração. Falha primeiro "a resposta da prévia traz só botMessages e o alerta de tamanho".
- Testes que mudam (comportamento, por D-U-B01 e D-U-B03): os casos de `contentRules.test.ts` (inclusive os da lista antiga e do aviso fixo), `content.service.test.ts` (tipo "resolution" de `nextStepBubble`), `content.routes.test.ts` (`nextStepBubble.type`) e `content.integration.test.ts` (`nextStepBubble.type` e `nextStepBubble.inPersonNote`) que conferem os campos removidos passam a conferir o mesmo pelo `botMessages`. No painel, os testes que ainda usarem os tipos antigos.
- Gate: completo backend (`cd src/backend && npm run lint && npm run build && npm run typecheck:test && npm test`), integração backend (banco separado, `npm run db:migrate && npm run test:integration`) e completo frontend (`cd src/frontend && npm run lint && npm run typecheck && npm run test:run`)
- Modelo: economico
- Status: pendente

### Impacto nos testes existentes do bot

- Mudam por comportamento (justificado por D-U-05): `motorDecisao.service.test.ts` (caso fora do escopo), `conversationFlow.service.test.ts` (caso fora do escopo passa a ter dois balões), `messageFormatter.service.test.ts` (casos de fora do escopo, conforme D-PO-B02).
- Mudam por comportamento (justificado por D-U-04): `contentRules.test.ts` (textos próprios da prévia).
- Mudam por comportamento na B6 (justificado por D-U-B01 e D-U-B03): as conferências de `answerBubble`, `nextStepBubble`, `categoryList` e `fixedDisclaimer` em `contentRules.test.ts`, `content.service.test.ts`, `content.routes.test.ts` e `content.integration.test.ts`.
- Só ganham casos: `messageFormatter.ia.test.ts`, `ollamaLlm.client.test.ts`, `llmAnswer.service.test.ts`, `conversationFlow.pending.test.ts`, `content.schema.test.ts`, `content.routes.test.ts`, `content.integration.test.ts`.
- Intactos: `conversationFlow.llm.test.ts`, `conversationFlow.fullFlow.test.ts`, `conversationFlow.delivery.test.ts`, `conversationFlow.scheduling.test.ts`, `conversationFlow.reschedule.test.ts`, `conversationFlow.return.test.ts`, `conversationFlow.paused.test.ts`, `conversationFlow.avisosConfirmacao.test.ts`, `messageFormatter.confirmacao*.test.ts`, `llmExplicacao.service.test.ts`, `content.controller.test.ts`, `motorDecisao.integration.test.ts`, `conversationEvents.integration.test.ts`.

### Decisões registradas (não são dúvidas)

- Rótulos da lista: vale o bot ("Voltar opções", "Ver mais opções"), por decisão do usuário (D-U-04), mesmo a regra de Conteúdo falando em "Ver mais opções ›" e "Voltar".
- Texto de exemplo da IA na prévia: continua o da API, porque RN-25 já diz que a prévia usa texto de exemplo e ele não é texto do bot.
- Documentos úteis no fora do escopo: aparecem no balão oficial, porque a regra de Conteúdo ("Ver como o cidadão recebe", item 3) lista documentos úteis no balão oficial também para as perguntas fora do escopo.
- Texto numerado de apoio: o bloco novo `botMessages` não traz versão numerada; os campos antigos que a trazem saem na B6. No bot, o texto numerado de apoio da resposta continua existindo e, no fora do escopo, junta os dois balões.
- D-PO-B01 (respondida pelo PO e confirmada pelo usuário): o balão separado de encaminhamento traz a frase atual do bot, "Como esta demanda não compete ao PROCON, dirija-se ao órgão indicado na orientação acima portando seus documentos e comprovantes para atendimento especializado.", sem botões. Vira RN-B08.
- D-PO-B02 (respondida pelo PO e confirmada pelo usuário): o balão oficial do fora do escopo não traz "O que fazer agora:"; traz a resposta da equipe, a base legal, os documentos se houver e o aviso no fim. Vira RN-B07.
- D-PO-B03 (respondida pelo PO e confirmada pelo usuário): a observação vai no balão oficial da pergunta presencial, logo depois da linha fixa "Esta situação pode exigir atendimento presencial no PROCON Jacareí para andamento formal.", numa linha só, no formato "Sobre o atendimento presencial: <observação>" (formato confirmado pelo usuário); também no balão com IA; não é repetida na oferta; não é enviada à IA. Vira RN-B09, RN-B11 e RN-B12.
- D-U-B01 (decidida pelo usuário): os campos antigos da prévia são removidos nesta mesma issue, na B6, depois da T20. Vira RN-B13.
- D-U-B02 (decidida pelo usuário): pergunta em categoria ainda não salva continua sem os rótulos do bot. Vira RN-B14.
- D-U-B03 (decidida pelo usuário): na B6 saem também `categoryList` e `fixedDisclaimer`, se a T20 não os usar (a T20 confirma); `answerLengthWarning` e `answerLengthWarningMessage` ficam. Vira parte de RN-B13 e CA-B24.

### Dúvidas do acréscimo

#### Para o product-owner

Nenhuma.

#### Para o usuário

Nenhuma.

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
- Status: pendente

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
- Status: pendente

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
- Status: pendente

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
- Status: pendente

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
- Status: pendente

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
- Status: pendente

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
- Status: pendente

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
- Status: pendente

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
- Status: pendente

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
- Status: pendente

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
- Status: pendente

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
- Status: pendente

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
- Status: pendente

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
- Status: pendente

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
- Status: pendente

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
- Status: pendente

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
- Status: pendente

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
- Status: pendente

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
- Status: pendente

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
- Status: pendente

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

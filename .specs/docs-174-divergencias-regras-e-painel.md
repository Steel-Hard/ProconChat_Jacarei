# Divergências entre a documentação de regras e o painel (#174)

> Status: implementada
> Tipo: funcionalidade
> Tamanho: media
> Branch: docs/174-divergencias-regras-e-painel
> Criada em: 2026-11-22
> Aprovada em: 2026-11-22
> Implementada em: 2026-11-22. Revisão do reviewer (Kusakabe) aprovada no commit 7355e79, sem nenhum achado em aberto, nem bloqueante nem sugestão.

## Objetivo

Ao escrever o manual das telas (#119), o grupo viu que a documentação de regras e o painel dizem coisas diferentes em cinco pontos: o menu, a exportação de relatórios, a tela de Sessões, os conflitos na tela de Horários e um texto da tela de Horários que cita o Dashboard. O usuário já decidiu, para cada ponto, qual lado muda. Também decidiu que as telas de Sessões e de Dashboard foram descartadas pelo grupo, e que o manual deve ser corrigido por inteiro, inclusive nas partes que ficaram velhas com as entregas depois da #119 (bloqueio de parte do dia e marcadores do Conteúdo). Esta tarefa leva a documentação, o manual em PDF, as capturas do manual, a memória do time sobre Horários e um único texto do painel a dizer a mesma coisa.

Quase tudo é documentação. A única mudança no painel é trocar uma frase da tela de Horários que cita o Dashboard.

## Contexto e conferência inicial

Conferência feita em 2026-11-22, lendo a documentação, o código do painel e o board. Cada item aponta o que diverge hoje.

### Divergência 1: menu

- A regra de Entrar e Minha conta diz que o menu mostra hoje Agendamentos, Usuários e WhatsApp, e o estado da tela cita só as issues #84 e #85.
- O painel tem sete telas prontas no menu: Agendamentos, Relatórios, Conteúdo, Horários de atendimento, Documentos, Usuários e WhatsApp. Dashboard e Sessões não aparecem.
- A tabela do menu da regra ainda põe o Dashboard no grupo Operação, e a regra diz que, "quando o Dashboard (issue #71) ficar pronto", quem pode vê-lo passa a entrar por ele.
- O índice das regras repete o estado antigo, mostra Dashboard como "Pendente (#71)" e Sessões como "Pendente (#72, #76)", e diz que "cada arquivo de tela pendente descreve como a tela vai funcionar".
- O manual já mostra as sete telas no menu. Ele não muda neste ponto.

### Divergência 2: exportação de relatórios

- A tela de Relatórios não exporta nada.
- A regra de Relatórios descreve o botão "Exportar" com PDF, Excel e CSV como se existisse.
- A decisão 004 diz que "Ver relatórios" libera "Indicadores e exportação".
- A decisão 010 decide a exportação em três formatos e tem uma consequência técnica sobre gerar PDF no servidor.
- As regras gerais citam "Relatórios e exportações" na tabela de dados pessoais.
- O manual diz que a exportação "ainda não está disponível", em três lugares.
- Na tela de Usuários, a descrição de "Ver relatórios" continua prometendo exportar em PDF, Excel ou CSV. Isso é código e fica como está (ver Fora do escopo e Riscos).
- Board: a #73, onde a exportação seria um bônus, está fechada.

### Divergência 3: telas de Sessões e de Dashboard, e a permissão "Ver sessões"

O grupo descartou de propósito a tela de Sessões (#72) e a tela de Dashboard (#71). As issues #71, #72 e #76 ("Outras conversas do mesmo número") estão fechadas no board. A documentação ainda trata as duas telas como algo que vai existir nestes lugares:

| Onde | O que diz hoje |
|---|---|
| Regra 07 (Sessões) | A tela inteira, com o estado "Ainda não construída (issues #72 e #76)" |
| Regra 02 (Dashboard) | A tela inteira, com o estado "Ainda não construída (issue #71)"; "Ver sessões" entre as permissões de acesso; "as conversas ficam na tela de Sessões" |
| Índice das regras | Dashboard "Pendente (#71)", Sessões "Pendente (#72, #76)", e a frase de que cada tela pendente descreve como vai funcionar |
| Regra 01 (Login e conta) | Dashboard e Sessões na tabela do menu; a tela inicial muda "quando o Dashboard (issue #71) ficar pronto" |
| Regra 00 (Regras gerais) | "Ver sessões" libera Sessões e o link da sessão de origem no Detalhe; "Ver agendamentos" e "Ver relatórios" liberam blocos do Dashboard; o Admin vê o bloco "Saúde do chatbot" do Dashboard |
| Regra 04 (Detalhe do agendamento) | O código da sessão vira link para Sessões com "Ver sessões"; a linha do tempo usa os passos de Sessões; o link "fica com a #72" |
| Regra 05 (Relatórios) | Casos individuais ficam em Sessões; os nomes das etapas são os mesmos de Sessões; "O Dashboard usa as mesmas" definições |
| Regra 08 (Horários) | O Dashboard fica em alerta amarelo e vermelho; o Dashboard usa a agenda |
| Regra 10 (Usuários) | A permissão de uma tela não pronta "aparece quando a tela ficar pronta" |
| Regra 11 (WhatsApp) | A "Saúde do chatbot" no Dashboard resume o estado do número "quando o Dashboard (issue #71) … forem entregues" |
| Decisão 004 | "Ver sessões" entre as 8 permissões |
| Decisão 007 | O Dashboard avisa quando o próximo horário livre passa do prazo |
| Decisão 010 | A tela de Sessões é somente leitura; o contexto cita as telas de Sessões e Relatórios |
| Decisão 002 | "Outras conversas deste número" na tela de Sessões |
| Decisão 008 | Os nomes das etapas são usados em Sessões e em Relatórios |
| Decisão 011 | A tela de Sessões continua somente leitura |
| Manual do painel | "Ver sessões" na tabela de permissões; "abrir a conversa completa a partir do detalhe ainda não está disponível"; a legenda da figura 17 cita o aviso do Dashboard |
| Arquitetura | Dashboard e Sessões "Em construção" (fora desta tarefa: ver Fora do escopo) |
| Rastreabilidade do desafio | Sessões como entrega do RF06 e como item "Importante"; "Dashboard e Sessões continuam Em construção" (fora desta tarefa: ver Fora do escopo) |
| Documento do software | A equipe pode "ver relatórios e sessões" (fora desta tarefa: ver Fora do escopo) |

O painel ainda tem rota, item de menu, permissão e textos de Sessões e do Dashboard: a rota de Sessões mostra "Em construção.", o item fica escondido, a permissão existe no painel e no servidor, e no painel ela também conta para abrir o Dashboard. Isso é código e não faz parte desta tarefa (ver Riscos).

### Divergência 4: conflitos na tela de Horários

Os textos e o comportamento da janela de conflitos já foram conferidos contra a seção "Quando a mudança afeta agendamentos existentes" da regra 08. Títulos, aberturas, opções, botões, resumo do aviso, mensagens de verificação, mensagem de lista alterada e mensagens de resultado são iguais aos do painel. Nessa parte não há divergência.

Divergências e pontos que a conferência encontrou:

| Onde | O que diz | O que o painel faz | Situação |
|---|---|---|---|
| Regra 08, tabela de motivos, linha das vagas reduzidas | Não cita o texto do motivo, só que "os agendados por último num horário lotado são os afetados" | Mostra o motivo "Vagas reduzidas para N; este horário tem M agendamentos" | Diverge: falta o texto do motivo |
| Regra 08, pendente "Tentar novamente" | O botão para a falha de envio do cancelamento em massa não foi entregue | O histórico de cada agendamento já tem "Tentar novamente" para aviso com falha quando o cancelamento foi da equipe. A regra também diz que a falha do cancelamento em massa fica registrada no mesmo formato do cancelamento individual. A conferência inicial indica que o botão do Detalhe já vale para esses casos, mas a janela de conflitos não tem o botão | A confirmar na T6. Se confirmado, a regra passa a dizer que o reenvio é feito no Detalhe, e não pela janela |
| Regra 08, pendente "horários cancelados voltam a ficar livres" | Não garantido | A contagem de vagas ocupadas considera só agendamentos Pendentes e Confirmados. A conferência inicial indica que um horário cancelado volta a ficar livre | A confirmar na T6 |
| Regra 08, pendente "envio em paralelo" | Hoje os avisos saem um a um | Os avisos saem um a um | Sem divergência |
| Regra 08, pendente "testes de borda extras" | Item de pendência | Não é comportamento da tela | Continua na lista, por decisão do usuário (D-U-08) |
| Decisão 012, item 4 | Conflitos "continuam recusando a gravação e o cancelamento" | Nada é gravado enquanto a equipe não escolhe na janela | Sem divergência |
| Manual, "Quando a mudança afeta agendamentos" | O painel não deixa salvar, "Salvar alterações" fica desabilitado, e cita o aviso "Há agendamentos em 23/11. Para desligar este dia…" | Não há trava: abre a janela de conflitos. O aviso citado não existe mais no painel | Diverge: o trecho precisa ser reescrito |
| Memória do time, Horários, linha 15 | "Hoje a tela NÃO deixa salvar", e a janela viria "quando a #75 estiver pronta" | A janela existe (#75 fechada) | Diverge |
| Memória do time, Horários, linha 13 | "Cancelar a mudança é recusado se deixar agendamentos fora da grade anterior" | Abre a janela de conflitos, com textos próprios | Diverge |
| Memória do time, Relatórios, Sessões, Dashboard e WhatsApp | Dashboard e Sessões pendentes; exportação descrita como se existisse | Telas descartadas; exportação não entregue | Diverge, mas fica como está por decisão do usuário (D-U-09). Ver Riscos |

O índice das regras e o estado da regra 08 citam pendências "na #75", mas a #75 está fechada. O texto será ajustado junto com a lista de pendentes.

### Divergência 5: texto da tela de Horários que cita o Dashboard

- No campo "Alertar quando a espera passar de", a tela de Horários mostra a frase "O Dashboard avisa quando o próximo horário livre estiver além deste prazo." O Dashboard não existe no painel e foi descartado.
- O usuário aprovou o texto novo: "Prazo de espera considerado longo para o próximo horário livre."
- A regra 08 diz que o Dashboard fica em alerta amarelo quando a espera passa do prazo, e em alerta vermelho quando a agenda está lotada.
- A decisão 007 diz que o Dashboard avisa quando o próximo horário livre passa do prazo.
- No manual, a legenda da figura 17 diz que o aviso do Dashboard "ainda não está disponível". O texto do campo diz que "o aviso correspondente ainda não está disponível no painel".
- A figura 17 é uma captura da tela com a frase antiga. Depois da troca, a captura deixa de bater com a tela.
- O prazo é salvo e carregado pelo servidor, mas nenhuma tela, nem o chatbot, usa o valor para avisar alguém. O campo continua na tela sem efeito visível (ver Riscos).
- Hoje nenhum teste do painel confere essa frase. O teste dos campos da janela só confere a descrição de "Oferecer horários até".

### Divergência 6: partes do manual que ficaram velhas depois da #119

Depois da última mudança no manual (#119), entraram no painel a janela de conflitos (#75), o bloqueio de parte do dia (#77) e os marcadores de endereço e horários do Conteúdo (#78). Só os textos de Horários e de Conteúdo mudaram. Conferência do manual contra o painel nessas partes:

| Onde, no manual | O que diz hoje | O que o painel faz | O que muda |
|---|---|---|---|
| Horários, "Datas bloqueadas" | Só é possível bloquear o dia inteiro; bloquear um período "ainda não está disponível"; só fala em Data, Descrição e Adicionar | Bloqueia o dia inteiro ou só um período. O formulário se chama "Novo bloqueio", tem a opção "Bloquear o dia inteiro" e, sem ela, os campos "Início" e "Fim". A descrição da seção é "Bloqueie um dia inteiro ou apenas um período. O chatbot não oferece horários durante o bloqueio." A lista mostra "Dia inteiro" ou o período (por exemplo 08:00–12:00). Uma data pode ter mais de um período, desde que não se sobreponham; dia inteiro não convive com outro bloqueio na mesma data. Mensagens: "Informe o início e o fim do período.", "O fim deve ser depois do início.", "Este período se sobrepõe a outro bloqueio desta data" e "Esta data já tem um bloqueio" | Reescrever a seção com o bloqueio de período, as regras e as mensagens |
| Horários, bloquear data com agendamentos | Não cita; a tela antiga recusava com "Esta data tem N agendamentos. Para bloqueá-la, peça…" | A mensagem não existe mais. Um agendamento que cai no bloqueio entra na janela de conflitos, com o motivo "Período bloqueado (hh:mm–hh:mm)" ou o motivo do dia bloqueado | Dizer que o bloqueio pode afetar agendamentos e que isso abre a janela de conflitos |
| Horários, figura 18 | Mostra "Feriados e pontos facultativos…", o título "Bloquear um dia inteiro" e o formulário sem a opção de período | Textos novos e a opção "Bloquear o dia inteiro" | Captura nova (T12) |
| Horários, "Quando a mudança afeta agendamentos" | A trava antiga (ver divergência 4) | Janela de conflitos com "Manter os agendamentos", "Cancelar e avisar os cidadãos" ou "Cancelar agendamentos", "← Voltar sem salvar"; quem não pode cancelar só pode manter; cancelar uma mudança agendada com afetados abre a mesma janela | Reescrever (ver T8) |
| Agendamentos e Detalhe | Não citam o selo | Agendamentos mantidos ganham o selo "Fora da grade atual" na lista e no detalhe | Citar o selo na seção de conflitos e na lista de Agendamentos |
| Conteúdo, "Perguntas" | Não cita os marcadores | Abaixo da "Resposta oficial" aparece a dica "Você pode usar {endereco} e {horarios} para inserir automaticamente o endereço e os horários atuais da unidade." Os marcadores são trocados pelo endereço e pelos horários de hoje no envio e na prévia. Um marcador mal escrito mostra "Marcador não reconhecido: {Endereco}. Use {endereco}."; o primeiro clique em Salvar não salva e acrescenta "Se for isso mesmo que você quer, clique em Salvar de novo."; o segundo salva assim mesmo | Acrescentar os marcadores e o aviso |
| Conteúdo, figura 14 | Captura do formulário sem a dica dos marcadores abaixo da "Resposta oficial" | A dica aparece logo abaixo do campo | Captura nova (T12) |
| Conteúdo, prévia | Não cita os marcadores | A prévia mostra o endereço e os horários no lugar dos marcadores, e o aviso curto de marcador mal escrito | Acrescentar uma frase |
| Horários, aviso "Revisar Conteúdo →" | Pede para revisar as perguntas que citam horários ou endereço | Igual; as respostas com marcadores já mudam sozinhas, e só as escritas em texto fixo precisam de revisão | Acrescentar essa diferença |

A busca por "ainda não" no manual inteiro encontra, além dos pontos acima, a conversa completa a partir do Detalhe (Sessões), a exportação e os "indicadores adicionais" de Relatórios. Todos são tratados na T8.

O manual tem hoje 28 figuras (limite de 35) e o PDF tem cerca de 4,9 MB (limite de 10 MB). As capturas novas substituem as antigas, sem figura a mais.

## Regras

| ID | Regra | Fonte |
|---|---|---|
| RN-01 | Nas divergências 1 a 4 e 6, só a documentação muda, para descrever o que o painel faz hoje. | usuário |
| RN-02 | A regra de Entrar e Minha conta e o índice das regras dizem que o menu tem sete telas prontas: Agendamentos, Relatórios, Conteúdo, Horários de atendimento, Documentos, Usuários e WhatsApp. | usuário; painel |
| RN-03 | A exportação de relatórios fica registrada como "bônus da #73, não entregue". A documentação não a descreve como algo que existe no painel. | usuário |
| RN-04 | As telas de Sessões (#72) e de Dashboard (#71) foram descartadas de propósito pelo grupo. A documentação registra isso numa única decisão nova (013), e não como "em construção", pendente ou futura. | usuário |
| RN-05 | A permissão "Ver sessões" fica registrada como descartada, junto com a tela, e não sai do modelo: o servidor continua com ela, e a tela de Usuários continua sem mostrá-la. | product-owner (recomendação); usuário (D-PO-01, confirmada em 22/11/2026) |
| RN-06 | As decisões antigas não têm o texto reescrito. Elas ganham uma nota de estado curta e datada, que aponta para a decisão nova (Sessões e Dashboard) ou diz "bônus da #73, não entregue" (exportação). Trechos que tratem Sessões ou Dashboard como tela futura ou em construção são trocados por essa nota. | usuário (D-U-04; D-PO-01, confirmada em 22/11/2026); product-owner (recomendação) |
| RN-07 | As regras das telas de Sessões e de Dashboard continuam na pasta das regras, marcadas no topo como "Tela descartada (decisão 013)", e o índice das regras mostra "Descartada (013)" nas duas. As outras regras têm o texto ajustado para não prometer as duas telas. | product-owner (recomendação); usuário (D-U-02; D-PO-01, confirmada em 22/11/2026) |
| RN-08 | A tabela de permissões da decisão 004 e a do manual ficam iguais, linha por linha, com a mesma nota da decisão 013 nas duas. | product-owner (recomendação); usuário (D-PO-01, confirmada em 22/11/2026) |
| RN-09 | A regra 08 descreve a janela de conflitos e as pendências como o painel faz hoje, com os pontos da tabela da divergência 4. "Testes de borda extras" continua na lista de pendentes. | usuário; painel |
| RN-10 | Na divergência 5, muda o painel: a frase do campo "Alertar quando a espera passar de" passa a ser exatamente "Prazo de espera considerado longo para o próximo horário livre." | usuário (D-U-03) |
| RN-11 | A regra 08, a decisão 007 e o manual dizem o mesmo que o texto novo do painel e não prometem aviso do Dashboard. | usuário |
| RN-12 | O manual é corrigido por inteiro antes de o PDF ser gerado, inclusive o bloqueio de parte do dia (#77), os marcadores do Conteúdo (#78) e o selo "Fora da grade atual". | usuário (D-U-05) |
| RN-13 | As figuras 17, 18 e 14 do manual ganham capturas novas, tiradas no painel local com dados fictícios, depois da troca do texto do painel. Elas substituem as atuais, com o mesmo nome e o mesmo tamanho. | usuário (D-U-06) |
| RN-14 | O PDF é gerado só para o manual, e nenhum outro PDF da pasta de guias pode mudar. O documento do software não muda nesta tarefa. | usuário; especificação #119 |
| RN-15 | Só a memória do time sobre Horários é atualizada, com a fonte e a data, depois da aprovação desta especificação. | usuário (D-U-09) |
| RN-16 | A descrição de "Ver relatórios" na tela de Usuários fica como está, mesmo prometendo exportar. | usuário |
| RN-17 | Nenhuma issue é aberta para tirar Sessões e Dashboard do código do painel. Isso fica só listado como problema em Riscos. | usuário (D-U-07) |
| RN-18 | Arquitetura e rastreabilidade do desafio são do Megumi (dev-doc na #70) e ficam fora desta tarefa. Os trechos sobre Sessões e Dashboard nelas são combinados com ele. | usuário (D-U-10) |
| RN-19 | A documentação não inventa regra: o que não foi decidido pelo usuário fica em Dúvidas. A decisão 013 não diz que algum requisito do desafio continua atendido por outra tela. | usuário |

## Critérios de aceite

- CA-01 QUANDO alguém lê a regra de Entrar e Minha conta ENTÃO ela DEVE listar as sete telas prontas no menu, sem Dashboard nem Sessões, com o estado da tela atualizado, sem a frase de que o menu mostra só Agendamentos, Usuários e WhatsApp e sem a frase de que a tela inicial muda quando o Dashboard ficar pronto. (RN-01, RN-02, RN-04)
- CA-02 QUANDO alguém lê o índice das regras ENTÃO o estado de cada tela DEVE bater com o painel: telas prontas como entregues, e Dashboard e Sessões como "Descartada (013)". (RN-02, RN-07)
- CA-03 QUANDO alguém lê a regra de Relatórios ENTÃO a seção de exportar DEVE dizer que a exportação é um bônus da #73, não entregue, sem descrever um botão que não existe na tela. (RN-03)
- CA-04 QUANDO alguém lê as decisões 004 e 010 ENTÃO o texto da decisão DEVE continuar o mesmo, com uma nota de estado datada dizendo que a exportação é um bônus da #73, não entregue. (RN-03, RN-06)
- CA-05 QUANDO alguém procura Sessões, "Ver sessões", Dashboard, #71 ou #72 nas regras e nas decisões ENTÃO nenhum dos lugares da tabela da divergência 3 que está no escopo DEVE tratar as telas como futuras, pendentes ou em construção. O que sobrar DEVE ser o registro do descarte, a nota que aponta para a decisão 013 ou o uso técnico da palavra "sessão" (sessão de login, conversa no banco). (RN-04, RN-06, RN-07)
- CA-06 QUANDO alguém abre o índice das decisões ENTÃO ele DEVE ter a linha da decisão 013, que abre um registro com contexto, decisão e consequências para as duas telas e para a permissão "Ver sessões". (RN-04, RN-05)
- CA-07 QUANDO alguém lê a tabela de motivos da regra 08 ENTÃO a linha das vagas reduzidas DEVE trazer o texto que o painel mostra: "Vagas reduzidas para N; este horário tem M agendamentos". (RN-09)
- CA-08 QUANDO alguém lê a lista de pendentes da regra 08 ENTÃO cada item DEVE estar conferido contra o painel: o que já funciona sai da lista, ou é reescrito como funciona hoje, e o que não foi entregue continua, incluindo "testes de borda extras", sem citar a #75 como se estivesse aberta. (RN-09)
- CA-09 QUANDO a equipe abre a tela de Horários ENTÃO o campo "Alertar quando a espera passar de" DEVE mostrar "Prazo de espera considerado longo para o próximo horário livre.", igual letra por letra, sem citar o Dashboard. (RN-10)
- CA-10 QUANDO a tela de Horários é aberta em um celular de 320 px de largura ENTÃO o texto novo DEVE quebrar linha dentro do campo, sem rolagem horizontal. (RN-10)
- CA-11 QUANDO a tela de Horários é aberta em tamanho de computador ENTÃO ela DEVE continuar como antes, com só a frase trocada. (RN-10)
- CA-12 QUANDO alguém lê a regra 08 ou a decisão 007 sobre o alerta de espera e a agenda lotada ENTÃO elas DEVEM dizer o mesmo que o texto novo do painel, sem prometer um alerta que nenhuma tela mostra. A decisão 007 DEVE manter o texto e ganhar a nota de estado que aponta para a decisão 013. (RN-06, RN-11)
- CA-13 QUANDO alguém lê o manual ENTÃO a seção "Quando a mudança afeta agendamentos" DEVE descrever a janela de conflitos como ela funciona hoje, com o selo "Fora da grade atual", sem citar a trava antiga, o botão desabilitado nem o aviso que não existe mais. (RN-01, RN-09, RN-12)
- CA-14 QUANDO alguém lê o manual na parte do alerta de espera ENTÃO o texto e a legenda da figura 17 DEVEM bater com a frase nova do painel e não citar o Dashboard, e a figura 17 DEVE mostrar a frase nova. (RN-11, RN-13)
- CA-15 QUANDO alguém compara a tabela de permissões do manual com a da decisão 004 ENTÃO as duas DEVEM ser iguais, linha por linha, com a mesma nota da decisão 013 e a mesma nota da exportação nas duas. (RN-05, RN-08)
- CA-16 QUANDO o manual cita a exportação ENTÃO ele DEVE dizer que ela é um bônus da #73, não entregue. O aviso de que a descrição de "Ver relatórios" na tela de Usuários fala em exportação DEVE continuar. (RN-03, RN-16)
- CA-17 QUANDO alguém lê a seção "Datas bloqueadas" do manual ENTÃO ela DEVE explicar como bloquear o dia inteiro ou só um período, as regras de sobreposição e as mensagens que o painel mostra, e a figura 18 DEVE mostrar o formulário de hoje. (RN-12, RN-13)
- CA-18 QUANDO alguém lê a parte de Perguntas do Conteúdo no manual ENTÃO ela DEVE explicar os marcadores {endereco} e {horarios}, o aviso de marcador mal escrito e o segundo clique em Salvar, e a figura 14 DEVE mostrar a dica dos marcadores. (RN-12, RN-13)
- CA-19 QUANDO alguém procura "ainda não" no manual ENTÃO nenhum trecho DEVE prometer Sessões, Dashboard, exportação, bloqueio de período ou resolver conflitos pela tela de Horários. (RN-03, RN-04, RN-12)
- CA-20 QUANDO o PDF do manual é gerado de novo ENTÃO o gerador DEVE terminar sem erro, o sumário DEVE levar cada item à página certa, o PDF DEVE ficar com até 40 páginas, 35 figuras e 10 MB, e nenhum outro PDF da pasta de guias DEVE mudar no commit. (RN-14)
- CA-21 QUANDO alguém clica em um link mudado ou novo na documentação ENTÃO ele DEVE abrir um arquivo e uma seção que existem. (RN-01)
- CA-22 QUANDO a memória do time sobre Horários é lida depois desta tarefa ENTÃO ela DEVE descrever a janela de conflitos, o bloqueio de período e o alerta de espera como a regra 08 descreve, com a fonte e a data da leitura. (RN-15)
- CA-23 QUANDO alguém compara o painel e a documentação depois desta tarefa ENTÃO toda diferença conhecida que sobrar DEVE estar listada em Riscos, com a decisão, a dúvida ou o responsável que a mantém aberta. (RN-16, RN-17, RN-18, RN-19)

## Critérios de sucesso

- Para cada uma das cinco divergências da issue, documentação e painel dizem a mesma coisa, ou a diferença que sobra está registrada como decisão do usuário.
- O manual em PDF bate com o painel e com as regras em todas as telas, com capturas que mostram a tela de hoje.
- Ninguém que leia a documentação espera ver a tela de Sessões, a tela de Dashboard, a exportação de relatórios ou um aviso de espera no painel.

## Fora do escopo

- Mudar a descrição de "Ver relatórios" na tela de Usuários, que promete exportar. É código e fica como está, por decisão do usuário.
- Remover do painel ou do servidor a rota, o item de menu, a permissão e os textos de Sessões e do Dashboard, ou o campo do alerta de espera. É código. O usuário decidiu não abrir issue para isso, e fica listado em Riscos.
- Construir a exportação de relatórios, a tela de Sessões ou o Dashboard.
- Mudar o protótipo, que também tem a frase do Dashboard. Pela regra do índice, quando o protótipo e a regra divergem, vale a regra.
- Mudar o gerador de PDF, o estilo dos guias ou os outros dois guias em PDF.
- Arquitetura e rastreabilidade do desafio: são do Megumi (dev-doc na #70). Esta tarefa não as edita. Ver a nota de coordenação no Plano de execução.
- Documento do software: não muda, porque tem PDF próprio. Fica listado como desatualizado em Riscos.
- Memória do time sobre Relatórios, Sessões, Dashboard e WhatsApp: fica como está, por decisão do usuário.
- Acrescentar figuras novas ao manual. As capturas novas só substituem as figuras 14, 17 e 18.

## Riscos

- **A descrição de "Ver relatórios" na tela de Usuários continua prometendo exportar em PDF, Excel ou CSV.** O painel fica diferente da documentação nesse ponto, por decisão do usuário. O manual mantém o aviso sobre isso.
- **O painel ainda tem Sessões e Dashboard no código.** A rota de Sessões mostra "Em construção.", e o item de menu e a permissão estão escondidos. As regras de acesso do painel contam "Ver sessões" para abrir o Dashboard, e o servidor mantém a permissão. Sem efeito visível para a equipe. Por decisão do usuário, não há issue: fica só registrado aqui.
- **O campo "Alertar quando a espera passar de" não tem efeito visível.** O prazo é salvo, mas nenhuma tela nem o chatbot o usa, porque o Dashboard foi descartado. O texto novo do painel e a documentação dizem só o que o prazo é, sem prometer aviso.
- **Arquitetura e rastreabilidade do desafio continuam tratando Sessões e Dashboard como "Em construção" ou como entrega.** São do Megumi (#70). Até ele ajustar, elas divergem da decisão 013. A rastreabilidade liga Sessões ao RF06; esta tarefa não decide se o RF06 continua coberto por outra tela.
- **O documento do software continua dizendo que a equipe pode "ver relatórios e sessões".** Não muda nesta tarefa, porque tem PDF próprio e a regra é não mexer em outro PDF.
- **A memória do time sobre Relatórios, Sessões, Dashboard e WhatsApp continua tratando Dashboard e Sessões como pendentes e a exportação como existente.** Fica assim por decisão do usuário (D-U-09).
- **As capturas novas dependem da T1 e da Mai.** Sem a T12, a T8 não fecha o critério das figuras e a T9 não gera o PDF.
- **O sumário do manual tem os números de página escritos à mão.** Reescrever Datas bloqueadas, Conteúdo e a seção de conflitos muda a paginação. O gate da T9 confere cada número e cada link.
- **Várias pessoas mexem nos mesmos arquivos.** Regra 01, índice das regras, decisão 004, regra 08 e manual aparecem em mais de uma divergência. As tarefas foram montadas por arquivo, para duas tarefas nunca editarem o mesmo arquivo ao mesmo tempo.

## Contratos fixos entre as tarefas

Para as tarefas rodarem em paralelo, estes textos e nomes ficam fixos. Quem linka ou cita usa exatamente isto.

- **Decisão nova:** arquivo `.docs/decisoes/013-telas-de-sessoes-e-dashboard-descartadas.md`, título `013 — Telas de Sessões e Dashboard descartadas`, status Aceita, data 22/11/2026. Os links das regras usam `../decisoes/013-telas-de-sessoes-e-dashboard-descartadas.md`, e os das decisões usam `013-telas-de-sessoes-e-dashboard-descartadas.md`.
- **Nota de estado de Sessões e Dashboard (decisões antigas):** `> **Estado em 2026-11-22:** a tela de <Sessões|Dashboard> foi descartada pelo grupo e não existe no painel. Ver a [decisão 013](013-telas-de-sessoes-e-dashboard-descartadas.md).`
- **Nota de estado da exportação:** `> **Estado em 2026-11-22:** a exportação de relatórios (PDF, Excel e CSV) é um bônus da #73, não entregue.`
- **Marca no topo das regras 02 e 07:** `> **Tela descartada (decisão 013).**` seguida do link para a decisão, logo abaixo do título.
- **Índice das regras:** linhas do Dashboard e de Sessões com o estado `Descartada (013)`.
- **Nota da tabela de permissões (decisão 004 e manual, mesmo texto):** "Estado em 2026-11-22: a permissão Ver sessões ficou registrada como descartada, junto com a tela de Sessões, e não aparece na tela de Usuários (decisão 013). A exportação de relatórios é um bônus da #73, não entregue." No manual, a referência à decisão vai sem link, só como texto.

## Plano de execução

O usuário aprovou esta especificação em 22/11/2026 e confirmou a D-PO-01, de que dependem T2, T3, T4, T5, T7 e T8. Nas tarefas de documentação, o gate é o de documentação: links abrem, o texto bate com o painel e com a regra, e o manual fica coerente. Typecheck, lint e suíte não se aplicam a elas. Só a T1 mexe em código e tem o gate do frontend, com as mesmas checagens do CI.

- Fase 1 (paralelo): T1 [P], T2 [P], T3 [P], T4 [P], T5 [P]
  - Gate de fase: no frontend, `npm run build` (inclui o typecheck), `npm run test:run`, `npm run lint` e `npm run format:check` sem erro. Na documentação, as buscas por `Sessões`, `Ver sessões`, `#72`, `07-sessoes`, `Dashboard`, `#71` e `02-dashboard` em `.docs/regras/` e `.docs/decisoes/` sem nenhum trecho que trate as telas como futuras, com exceção da regra 08 e da decisão 007 (fase 2); todos os links mudados abrindo, inclusive os links para a decisão 013.
- Fase 2 (paralelo): T6 [P], T7 [P], T12 [P]
  - Gate de fase: regra 08 conferida contra o painel, item por item; decisão 007 e regra 08 com o mesmo texto que o painel sobre o alerta de espera; buscas da fase 1 repetidas sem nenhum achado; as três capturas novas com o mesmo nome, formato e tamanho das antigas, e `git status --short` sem outro arquivo de imagem.
- Fase 3 (sequencial): T8 → T9
  - Gate de fase: `.docs/guias/gerar-pdfs.sh manual-do-painel` sem erro; `git status --short` só com o manual e o PDF dele; tabela de permissões do manual igual à da decisão 004; sumário conferido; `grep -n "ainda não" .docs/guias/manual-do-painel.md` sem promessa de Sessões, Dashboard, exportação, bloqueio de período ou resolver conflitos pela tela.
- Fase 4 (paralelo): T10 [P], T11 [P]
  - Gate de fase: memória do time conferida contra a regra 08 e reviewer sem achado que bloqueia.

**Coordenação com o Megumi (#70):** arquitetura e rastreabilidade do desafio são dele. Antes de a T4 fechar a decisão 013, o dev-doc avisa o Megumi do descarte de Sessões e Dashboard e do nome do arquivo da decisão 013, para ele ajustar na #70 os trechos de "Em construção", a entrega de Sessões no RF06 e o item "Importante". O dev-doc não edita esses arquivos e não decide como o RF06 fica coberto.

**Permissão de arquivos da Mai:** a Mai (dev-frontend) normalmente mexe só em `src/frontend`. A T12 grava em `.docs/guias/images/manual-do-painel/`. O orquestrador liberou esse caminho para ela em 22/11/2026, só para gravar os três arquivos de imagem citados na T12.

Ambiente do gerador: Node.js 20 ou mais novo e Chrome ou Chromium (ou `CHROME_PATH`). Na primeira execução, o `npx` baixa o `marked` e precisa de internet. Rode sempre com o nome do manual: sem argumento, o gerador refaz todos os PDFs da pasta com a data de hoje na capa, e eles não devem entrar no commit.

Commits: um commit por tarefa, só com os arquivos da tarefa, no padrão `Docs :bulb: [#174] <descrição>` (a T1 usa `Fix :bug: [#174] <descrição>`, porque muda o painel). O repositório proíbe a coautoria do Claude: nenhum commit leva a linha `Co-Authored-By`. Confira com `git log -1` depois de cada commit.

## Tarefas

### T1 [P] Trocar no painel a frase do alerta de espera

- **O quê:** trocar a frase do campo "Alertar quando a espera passar de", na tela de Horários, por "Prazo de espera considerado longo para o próximo horário livre."
- **Onde:** `src/frontend/src/locales/pt-BR/schedule.json`, chave `window.waitAlertHelp` (linha 201), usada em `src/frontend/src/components/ScheduleWindowFields.tsx` (linha 88), que não muda. Se a dev decidir cobrir o texto com teste, também `src/frontend/src/components/test/ScheduleFormFields.test.tsx`.
- **Dev:** dev-frontend (Mai)
- **Depende de:** nada
- **Reaproveita:** o campo e o componente que já mostram a frase, sem alterá-los; a montagem dos campos da janela que o teste atual já faz.
- **Atende:** RN-10, CA-09, CA-10, CA-11
- **Pronto quando:** a tela mostra o texto aprovado, igual letra por letra; nenhum outro texto mudou; no celular de 320 px a frase quebra linha sem rolagem horizontal; em tamanho de computador a tela continua como antes; o gate passa.
- **Teste:** unitário, opcional. A troca de texto é dispensada pelo padrão de testes, e hoje nenhum teste confere a frase. Se a dev criar ou ajustar o teste do texto, segue o TDD do repositório: primeiro o teste que espera a frase nova no campo "Alertar quando a espera passar de" e falha com a frase antiga, depois a troca no arquivo de textos. Nenhum teste existente é alterado só para passar.
- **Gate:** em `src/frontend`, `npm run typecheck`, `npx vitest run src/components/test/ScheduleFormFields.test.tsx`, `npx prettier --check src/locales/pt-BR/schedule.json` (e o arquivo de teste, se mudou) e `npm run lint`. Conferência visual a 320 px e em tamanho de computador.
- **Modelo:** economico
- **Commit:** `Fix :bug: [#174] Troca o texto do alerta de espera que citava o Dashboard`
- **Status:** feita, commit 34a43a5. TDD: o teste "explica o alerta de espera sem citar o Dashboard" falhou antes da troca e passou depois. Gate do CI do frontend passou: `format:check`, `lint`, `build` com typecheck e `test:run` (2249 testes).

### T2 [P] Atualizar o menu e os estados na regra de Login e no índice das regras

- **O quê:** descrever o menu de hoje, com as sete telas prontas, e marcar Dashboard e Sessões como descartadas no índice das regras.
- **Onde:** `.docs/regras/01-login-e-conta.md` (linhas 13 e 26 a 35, incluindo a linha 28 com o Dashboard no grupo Operação e a linha 35 sobre a tela inicial) e `.docs/regras/README.md` (linhas 21, 22, 27 e 33). A linha 28 do índice (regra 08) fica com a T6.
- **Dev:** dev-doc
- **Depende de:** D-PO-01 (confirmada em 22/11/2026)
- **Reaproveita:** a lista de telas prontas do painel (`src/frontend/src/navigation/navItemsReady.ts`), a tabela do menu do manual, que já mostra as sete telas, e os contratos fixos (nome da decisão 013 e estado "Descartada (013)").
- **Atende:** RN-01, RN-02, RN-04, RN-07, CA-01, CA-02, CA-05, CA-21
- **Pronto quando:** a regra 01 lista as sete telas prontas, a tabela do menu não tem Dashboard nem Sessões, a frase da tela inicial não espera o Dashboard, e o estado da tela cita as entregas certas. O índice mostra "Descartada (013)" para Dashboard e Sessões e o estado certo das outras telas. A frase "Cada arquivo de tela pendente descreve como a tela vai funcionar" fica coerente com as telas descartadas.
- **Teste:** nenhum (documentação).
- **Gate:** documentação. A lista do menu na regra é igual à do painel, tela por tela. Todo link mudado abre o arquivo e a seção que existem (o da decisão 013 é conferido no gate da fase 1).
- **Modelo:** economico
- **Commit:** `Docs :bulb: [#174] Atualiza o menu e o estado das telas nas regras`
- **Status:** feita, commit aea539c. Gate: 0 links quebrados em regras e decisões; a busca por Sessões e Dashboard mostra só as marcas de descarte e as notas para a decisão 013.

### T3 [P] Registrar a exportação como não entregue na regra de Relatórios e na decisão 010

- **O quê:** dizer, na regra de Relatórios, que a exportação é um bônus da #73, não entregue, tirar dela as citações a Sessões e ao Dashboard como telas que existem, e pôr na decisão 010 as notas de estado.
- **Onde:** `.docs/regras/05-relatorios.md` (seção Exportar, linha 76 em diante; linhas 94, 95, 99 e 100) e `.docs/decisoes/010-registro-de-interacoes-e-relatorios.md` (linhas 9, 29, 30 e 35).
- **Dev:** dev-doc
- **Depende de:** D-PO-01 (confirmada em 22/11/2026)
- **Reaproveita:** os contratos fixos (nota da exportação e nota de Sessões) e a forma como a regra 08 marca o que não foi entregue.
- **Atende:** RN-03, RN-04, RN-06, RN-19, CA-03, CA-04, CA-05, CA-21
- **Pronto quando:** a regra de Relatórios não descreve o botão "Exportar" como algo da tela; diz que a exportação é um bônus da #73, não entregue, sem inventar prazo; casos individuais, nomes das etapas e definições dos indicadores não apontam para Sessões ou Dashboard como telas que existem. Na decisão 010, o texto continua o mesmo, com a nota da exportação e, nos trechos que tratam Sessões como tela, a nota de Sessões no lugar.
- **Teste:** nenhum (documentação).
- **Gate:** documentação. Uma busca por "Exportar", "exportação", "Sessões" e "Dashboard" nos dois arquivos só encontra a nota, o trecho que diz que a exportação não foi entregue ou o uso técnico de "sessão". Todo link mudado abre.
- **Modelo:** padrao
- **Commit:** `Docs :bulb: [#174] Registra a exportação de relatórios como não entregue`
- **Status:** feita, commit 134a83b. Gate: 0 links quebrados em regras e decisões; a busca por Sessões e Dashboard mostra só as marcas de descarte e as notas para a decisão 013. Correção da revisão (Kusakabe) em cd95b62: linha em branco depois da nota de estado da decisão 010 e o item 5 de volta à lista. Revisado.

### T4 [P] Criar a decisão 013 e pôr as notas de estado nas decisões antigas

- **O quê:** criar a decisão 013, que registra o descarte das telas de Sessões e de Dashboard e o que acontece com "Ver sessões", e pôr a nota de estado nas decisões 002, 004, 008 e 011.
- **Onde:** `.docs/decisoes/013-telas-de-sessoes-e-dashboard-descartadas.md` (novo), `.docs/decisoes/README.md` (linha nova no índice), `.docs/decisoes/004-contas-e-permissoes-granulares.md` (nota abaixo da tabela das 8 permissões, linhas 16 a 26, sem mudar as linhas da tabela), `.docs/decisoes/002-lgpd-dados-pessoais.md` (linha 25), `.docs/decisoes/008-fluxo-da-conversa-e-desfechos.md` (linha 45) e `.docs/decisoes/011-atendimento-humano-no-chat-nao-adotado.md` (linha 24).
- **Dev:** dev-doc
- **Depende de:** D-PO-01 (confirmada em 22/11/2026); aviso ao Megumi feito (nota de coordenação)
- **Reaproveita:** a decisão 011 como molde (contexto, decisão com motivos, consequências), o formato do índice das decisões e os contratos fixos.
- **Atende:** RN-03, RN-04, RN-05, RN-06, RN-08, RN-19, CA-04, CA-05, CA-06, CA-15, CA-21
- **Pronto quando:**
  - A decisão 013 tem contexto (as duas telas estavam previstas, #71, #72 e #76 fechadas), decisão (as duas telas descartadas pelo grupo) e consequências: "Ver sessões" registrada como descartada, mantida no servidor e escondida na tela de Usuários; o Dashboard não tem permissão própria, e os blocos dele deixam de existir; o alerta de espera fica sem tela que o mostre; o código do painel ainda tem rotas, item de menu e textos das duas telas, sem issue aberta; arquitetura e rastreabilidade ficam com a #70.
  - A coluna de requisitos da 013 repete só o que a documentação já liga às duas telas. A 013 não diz que algum requisito continua atendido por outra tela.
  - O índice das decisões tem a linha da 013 e ela abre.
  - A decisão 004 tem a nota da tabela de permissões dos contratos fixos, logo abaixo da tabela, sem mudar o texto da decisão nem as linhas da tabela.
  - As decisões 002, 008 e 011 mantêm o texto e trocam só os trechos que tratam Sessões como tela futura pela nota de Sessões.
- **Teste:** nenhum (documentação).
- **Gate:** documentação. A tabela de permissões e a nota da decisão 004 ficam copiadas no Status da tarefa, para a T8 levar ao manual. O índice das decisões abre a decisão nova. Todo link mudado abre.
- **Modelo:** padrao
- **Commit:** `Docs :bulb: [#174] Registra o descarte das telas de Sessões e Dashboard nas decisões`
- **Status:** feita, commit a8f97eb. Gate: 0 links quebrados em regras e decisões; a busca por Sessões e Dashboard mostra só as marcas de descarte e as notas para a decisão 013. Correção da revisão (Kusakabe) em b81e8e1: a decisão 013 diz que os trechos "foram ajustadas na #70", com o ajuste final em 7355e79 (vírgula retirada da consequência). Revisado.

### T5 [P] Tirar Sessões e Dashboard como telas futuras das regras das telas

- **O quê:** marcar as regras de Sessões e de Dashboard como descartadas e ajustar as outras regras para não prometerem as duas telas.
- **Onde:** `.docs/regras/07-sessoes.md` (marca no topo e estado da tela), `.docs/regras/02-dashboard.md` (marca no topo e estado da tela, linhas 9 a 13 e 79), `.docs/regras/00-regras-gerais.md` (linhas 18, 23, 24, 26 e 66), `.docs/regras/04-detalhe-do-agendamento.md` (linhas 45, 116 e 123), `.docs/regras/10-usuarios.md` (linha 35) e `.docs/regras/11-whatsapp.md` (linha 213).
- **Dev:** dev-doc
- **Depende de:** D-PO-01 (confirmada em 22/11/2026)
- **Reaproveita:** o levantamento da tabela da divergência 3 e os contratos fixos.
- **Atende:** RN-03, RN-04, RN-05, RN-07, CA-05, CA-21
- **Pronto quando:**
  - As regras 02 e 07 continuam na pasta, com a marca "Tela descartada (decisão 013)" no topo e o estado da tela dizendo que ela foi descartada, sem "Ainda não construída". O resto do texto fica como registro.
  - As regras gerais não prometem Sessões, nem blocos do Dashboard, nem o bloco "Saúde do chatbot"; "Ver sessões" aparece como descartada; "Relatórios e exportações" passa a dizer só o que existe.
  - O Detalhe do agendamento não promete link para Sessões e não diz que o link "fica com a #72".
  - A regra de Usuários não promete que "Ver sessões" vai aparecer.
  - A regra do WhatsApp não promete a "Saúde do chatbot" no Dashboard; o que ela diz do Estado do número (#127 e #88) fica como está.
- **Teste:** nenhum (documentação).
- **Gate:** documentação. Uma busca por `Sessões`, `Ver sessões`, `#72`, `07-sessoes`, `Dashboard`, `#71` e `02-dashboard` nos seis arquivos só encontra a marca de tela descartada, o texto de registro das regras 02 e 07, a nota que aponta para a 013 e o uso técnico da palavra "sessão". Todo link mudado abre.
- **Modelo:** padrao
- **Commit:** `Docs :bulb: [#174] Retira Sessões e Dashboard como telas futuras das regras`
- **Status:** feita, commit ad8612e. Gate: 0 links quebrados em regras e decisões; a busca por Sessões e Dashboard mostra só as marcas de descarte e as notas para a decisão 013.

### T6 [P] Conferir e corrigir a regra 08 contra o painel

- **O quê:** corrigir a regra 08 nos pontos da tabela da divergência 4 e alinhar o alerta de espera, a agenda lotada e as relações com o texto novo do painel e com o descarte do Dashboard.
- **Onde:** `.docs/regras/08-horarios-de-atendimento.md`: estado da tela (linha 13), janela de agendamento (linhas 43 e 45), motivo das vagas reduzidas (linha 113), pendentes (linhas 160 a 165) e Relações (linha 177); e a linha da regra 08 no índice das regras (`.docs/regras/README.md`, linha 28).
- **Dev:** dev-doc
- **Depende de:** T1 (texto do painel) e T2 (mesmo arquivo do índice)
- **Reaproveita:** os textos do painel em `src/frontend/src/locales/pt-BR/schedule.json` (chaves `conflicts`, `conflictModal` e `window`), os motivos do servidor em `src/backend/services/scheduleRules.ts`, a regra de reenvio em `src/backend/services/appointmentTransitions.ts` (`decideRetryCancellationNotice`), o envio em massa em `src/backend/services/schedule.service.ts` (`sendMassCancellationNotices`), a contagem de vagas em `src/backend/repositories/schedule.repository.ts` e o link da decisão 013 dos contratos fixos.
- **Atende:** RN-09, RN-11, CA-07, CA-08, CA-12, CA-21
- **Pronto quando:**
  - A linha das vagas reduzidas traz o texto do motivo.
  - Cada pendente foi conferido no código e o resultado está no Status desta tarefa. Fica na lista só o que não foi entregue, incluindo "testes de borda extras", sem citar a #75 como aberta.
  - Se o reenvio pelo Detalhe valer para o cancelamento em massa, a regra diz isso e explica que a janela de conflitos não tem o botão.
  - A linha 43 diz o que o prazo é, com o mesmo sentido do texto novo do painel, e que nenhuma tela mostra alerta, porque o Dashboard foi descartado (decisão 013). A linha 45 mantém o que o chatbot diz ao cidadão com a agenda lotada e tira o alerta vermelho do Dashboard. A linha 177 não cita o Dashboard.
  - A linha da regra 08 no índice das regras diz o mesmo que o estado e os pendentes da regra.
- **Teste:** nenhum (documentação).
- **Gate:** documentação. Cada texto citado entre aspas na regra existe igual no painel ou no servidor. Uma busca por `Dashboard` e `02-dashboard` na regra 08 não encontra promessa de alerta. Todo link mudado abre.
- **Modelo:** padrao
- **Commit:** `Docs :bulb: [#174] Corrige a regra de Horários conforme o painel`
- **Status:** feita, commit 0a39a51. Gate: 0 links quebrados em regras e decisões; a busca por Sessões e Dashboard mostra só as marcas de descarte e as notas para a decisão 013. Textos da regra 08 conferidos no painel e no servidor. "Horários cancelados voltam livres" saiu dos pendentes, porque já funciona, e o "Tentar novamente" existe no histórico do agendamento. Ficam pendentes só o "envio em paralelo" e os "testes de borda extras".

### T7 [P] Pôr a nota de estado na decisão 007

- **O quê:** pôr no item do limite de espera da decisão 007 a nota de estado do Dashboard, sem reescrever o texto da decisão.
- **Onde:** `.docs/decisoes/007-agenda-configuravel.md` (linha 19).
- **Dev:** dev-doc
- **Depende de:** T1 e D-PO-01 (confirmada em 22/11/2026)
- **Reaproveita:** o texto aprovado na D-U-03 e a nota de Dashboard dos contratos fixos.
- **Atende:** RN-06, RN-11, CA-12
- **Pronto quando:** o item mantém o texto, e a nota logo abaixo diz que o Dashboard foi descartado, que o prazo é salvo sem tela que mostre o aviso e aponta para a decisão 013.
- **Teste:** nenhum (documentação).
- **Gate:** documentação. O texto bate com a regra 08 e com o painel. O link para a decisão 013 abre.
- **Modelo:** economico
- **Commit:** `Docs :bulb: [#174] Registra o estado do alerta de espera na decisão 007`
- **Status:** feita, commit a909124. Gate: 0 links quebrados em regras e decisões; a busca por Sessões e Dashboard mostra só as marcas de descarte e as notas para a decisão 013.

### T12 [P] Tirar as capturas novas das figuras 17, 18 e 14 do manual

- **O quê:** tirar no painel local, com dados fictícios, as capturas novas da janela de agendamento (figura 17, já com o texto novo), de dados da unidade e datas bloqueadas (figura 18, com o formulário de bloqueio de hoje) e do formulário de pergunta do Conteúdo (figura 14, com a dica dos marcadores visível).
- **Onde:** substituir, no mesmo lugar e com o mesmo nome, `.docs/guias/images/manual-do-painel/17-horarios-janela.png`, `.docs/guias/images/manual-do-painel/18-horarios-unidade-e-bloqueios.png` e `.docs/guias/images/manual-do-painel/14-conteudo-pergunta.png`. Nenhum outro arquivo. Caminho liberado pelo orquestrador para a Mai em 22/11/2026, só para essas três imagens (ver Plano de execução).
- **Dev:** dev-frontend (Mai)
- **Depende de:** T1
- **Reaproveita:** o painel local com a carga fictícia usada nas capturas da #119; o mesmo recorte e enquadramento das figuras atuais.
- **Atende:** RN-12, RN-13, CA-14, CA-17, CA-18
- **Pronto quando:**
  - As três imagens são PNG, com o mesmo nome e o mesmo tamanho em pixels das atuais (figura 17: 974 × 872; figura 18: 2060 × 792; figura 14: 1240 de largura, com a altura que couber o campo "Resposta oficial" e a dica abaixo dele) e na mesma escala das outras figuras do manual.
  - A figura 17 mostra "Prazo de espera considerado longo para o próximo horário livre."
  - A figura 18 mostra a descrição "Bloqueie um dia inteiro ou apenas um período…", o formulário "Novo bloqueio" com a opção "Bloquear o dia inteiro" e, de preferência, um bloqueio de dia inteiro e um de período na lista.
  - A figura 14 mostra a dica dos marcadores abaixo da "Resposta oficial".
  - Nenhum dado real aparece: endereço, nomes e telefones são fictícios.
  - O manual continua com 28 figuras, e a soma das imagens não passa de 6 MB, para o PDF ficar abaixo de 10 MB.
- **Teste:** nenhum (capturas).
- **Gate:** `file` nas três imagens com PNG e as dimensões combinadas; `du -ch .docs/guias/images/manual-do-painel/*.png` abaixo de 6 MB; `git status --short` só com as três imagens; conferência visual de cada captura contra a tela.
- **Modelo:** economico
- **Commit:** `Docs :bulb: [#174] Atualiza as capturas das figuras 14, 17 e 18 do manual`
- **Status:** feita, commits 3b73b3c e d0ad084 (figura 18 refeita com as datas em pt-BR; as figuras 14 e 17 não têm campo de data). Gate: a soma das imagens é 5,1 MB, abaixo de 6 MB, e o projeto de captura foi derrubado. Tamanho em pixels diferente do combinado na RN-13, aceito pelo usuário em 22/11/2026 (D-U-11): a figura 17 ficou com 974 × 838 (era 974 × 872), porque o texto novo é mais curto, e a figura 18 com 2060 × 952 (era 2060 × 792), porque mostra 2 bloqueios fictícios e o formulário de período. A largura não mudou, e as imagens não serão refeitas.

### T8 Atualizar o texto do manual

- **O quê:** levar ao manual tudo o que ficou decidido (Sessões, Dashboard, exportação, alerta de espera e janela de conflitos) e corrigir as partes velhas da divergência 6 (bloqueio de período, marcadores do Conteúdo e selo "Fora da grade atual").
- **Onde:** `.docs/guias/manual-do-painel.md`:
  - linha 210 (conversa completa a partir do Detalhe: dizer que a tela de Sessões foi descartada, sem "ainda não");
  - linhas 268, 416 e 501 (exportação, com o texto "bônus da #73, não entregue"; "indicadores adicionais" no mesmo tom da regra de Relatórios depois da T3);
  - lista de Agendamentos (selo "Fora da grade atual");
  - Conteúdo, Perguntas e prévia (linhas 292 a 310: marcadores, aviso e segundo clique em Salvar);
  - linhas 336 e 340 (legenda da figura 17 e alerta de espera, com o texto novo e sem aviso);
  - linha 352 (Datas bloqueadas, com o bloqueio de período, as regras e as mensagens);
  - linhas 361 a 367 (seção "Quando a mudança afeta agendamentos" e aviso "Revisar Conteúdo →");
  - linhas 489 a 501 (tabela de permissões e nota);
  - o sumário (linhas 1 a 60).
- **Dev:** dev-doc
- **Depende de:** T1, T3, T4, T6, T12 e D-PO-01 (confirmada em 22/11/2026)
- **Reaproveita:** a regra 08 corrigida (T6), a regra 06 (marcadores), a tabela e a nota da decisão 004 (T4), os textos do painel listados na divergência 6 e a linguagem e o formato de avisos que o manual já usa.
- **Atende:** RN-01, RN-03, RN-04, RN-05, RN-08, RN-11, RN-12, RN-14, RN-16, CA-13, CA-14, CA-15, CA-16, CA-17, CA-18, CA-19, CA-21
- **Pronto quando:**
  - A seção de conflitos descreve a janela de hoje (opções, quem pode cancelar, aviso ao cidadão ligado ou desligado, cancelar uma mudança agendada, selo "Fora da grade atual"), em linguagem simples, sem a trava antiga.
  - Datas bloqueadas explica dia inteiro e período, sobreposição e mensagens, e que um bloqueio que afeta agendamentos abre a janela de conflitos.
  - Conteúdo explica os marcadores, o aviso de marcador mal escrito, o segundo clique em Salvar e a prévia; o aviso "Revisar Conteúdo →" diz que as respostas com marcadores mudam sozinhas.
  - O alerta de espera e a legenda da figura 17 batem com o texto novo e não citam o Dashboard.
  - A tabela de permissões é igual à da decisão 004, com a mesma nota.
  - A exportação aparece como bônus da #73, não entregue, e o aviso sobre a descrição de "Ver relatórios" continua.
  - O manual não promete Sessões nem Dashboard.
  - Uma busca por "ainda não" não encontra promessa sobre os pontos desta tarefa.
  - Toda figura citada existe na pasta de imagens, e a lista de figuras não muda.
- **Teste:** nenhum (documentação).
- **Gate:** documentação. A comparação mecânica da tabela de permissões e da nota do manual com as da decisão 004 não mostra diferença, do mesmo jeito da T8 da especificação #119. A lista de imagens citadas é igual à lista da pasta. `grep -n "ainda não" .docs/guias/manual-do-painel.md` conferido item por item. `.docs/guias/gerar-pdfs.sh manual-do-painel` termina sem erro.
- **Modelo:** padrao
- **Commit:** `Docs :bulb: [#174] Atualiza o manual do painel conforme as decisões da #174`
- **Status:** feita, commits 1f54192 (texto) e e7102a7 (legendas e sumário). Gate: a tabela de permissões é igual à da decisão 004; as 28 imagens citadas existem na pasta; os títulos do sumário foram conferidos página por página com `pdftotext`. O commit e7102a7 junta o sumário e as legendas desta tarefa com o PDF da T9.

### T9 Gerar de novo o PDF do manual

- **O quê:** gerar o PDF do manual a partir do texto da T8 e das capturas da T12.
- **Onde:** `.docs/guias/manual-do-painel.pdf`
- **Dev:** dev-doc
- **Depende de:** T8 e T12
- **Reaproveita:** `.docs/guias/gerar-pdfs.sh` e `.docs/guias/gerar-pdf.mjs`, sem alterá-los.
- **Atende:** RN-14, CA-20
- **Pronto quando:**
  - O PDF foi gerado só para o manual, abre com capa, sumário e capturas novas, e fica dentro dos limites da #119: até 40 páginas, 35 figuras e 10 MB.
  - Cada número de página do sumário bate com a página real. Se não bater, a T8 corrige o sumário e o PDF é gerado de novo.
  - Nenhum outro PDF da pasta mudou.
- **Teste:** nenhum (documentação).
- **Gate:** `.docs/guias/gerar-pdfs.sh manual-do-painel` sem erro; `ls -l .docs/guias/manual-do-painel.pdf` com até 10 MB; páginas e destinos do sumário conferidos no leitor de PDF; `git status --short` sem `guia-configuracao-do-bot.pdf` nem `documento-do-software.pdf`.
- **Modelo:** economico
- **Commit:** `Docs :bulb: [#174] Gera de novo o PDF do manual do painel`
- **Status:** feita, commits e7102a7 e 2ef7c7e (PDF com a captura nova da figura 18). Gate: o gerador rodou sem erro; o PDF tem 38 páginas, cerca de 5,0 MB e 28 figuras; o sumário foi conferido com `pdftotext` sem nenhuma diferença; nenhum outro PDF mudou. O commit e7102a7 junta o PDF desta tarefa com o sumário e as legendas da T8.

### T10 [P] Atualizar a memória do time sobre Horários

- **O quê:** atualizar só o item de Horários da memória do time, para descrever a janela de conflitos, o cancelamento de mudança agendada, o bloqueio de período e o alerta de espera como a regra 08 descreve.
- **Onde:** `/home/felipe/faculdade/ProconChat_Jacarei/.claude/team-memory/project_horarios-documentos-lembrete.md` (linhas 8, 11, 13 e 15) e, se a descrição mudar, a linha correspondente em `/home/felipe/faculdade/ProconChat_Jacarei/.claude/team-memory/MEMORY.md`. Os arquivos ficam no repositório principal, fora do git. A memória de Relatórios, Sessões, Dashboard e WhatsApp não muda.
- **Dev:** dev-doc
- **Depende de:** aprovação desta especificação e T6
- **Reaproveita:** a regra 08 corrigida (T6).
- **Atende:** RN-15, CA-22
- **Pronto quando:** o item diz que a tela não trava o salvamento e que abre a janela de conflitos, com as opções de hoje; que cancelar uma mudança agendada com afetados abre a mesma janela; que o bloqueio pode ser de dia inteiro ou de período; e que o alerta de espera é só um prazo salvo, sem tela que o mostre. A linha "Fonte" cita a regra 08 e a data da leitura.
- **Teste:** nenhum (documentação).
- **Gate:** conferir o texto da memória contra a regra 08, frase por frase. Não há commit, porque a pasta fica fora do git.
- **Modelo:** economico
- **Status:** feita, sem commit, porque o arquivo da memória fica fora do git. Gate: texto conferido frase por frase contra a regra 08 corrigida, e só o item de Horários mudou.

### T11 [P] Revisão do reviewer

- **O quê:** revisar o PR contra os critérios de aceite desta especificação.
- **Onde:** o PR da branch `docs/174-divergencias-regras-e-painel`.
- **Dev:** reviewer
- **Depende de:** T1 a T9 e T12
- **Reaproveita:** o padrão de revisão do projeto.
- **Atende:** CA-01 a CA-23
- **Pronto quando:** não há achado que bloqueia; o PR só altera os arquivos citados nas tarefas e esta especificação; `gerar-pdf.mjs` e `gerar-pdfs.sh` não mudaram; os outros dois PDFs não mudaram; arquitetura, rastreabilidade e documento do software não mudaram.
- **Teste:** nenhum.
- **Gate:** `git diff --stat develop...HEAD` só com os arquivos das tarefas; `git diff develop...HEAD -- .docs/guias/gerar-pdf.mjs .docs/guias/gerar-pdfs.sh .docs/guias/documento-do-software.md .docs/guias/documento-do-software.pdf .docs/guias/guia-configuracao-do-bot.pdf .docs/architecture .docs/desafio` sem saída; CI verde.
- **Modelo:** padrao
- **Status:** feita. O reviewer (Kusakabe) aprovou no commit 7355e79, sem nenhum achado em aberto, nem bloqueante nem sugestão.

## Dúvidas

A numeração segue a da versão anterior, para facilitar levar ao usuário.

### Abertas

Nenhuma.

### Respondidas

- **D-PO-01. Tela de Sessões descartada: o que acontece com a permissão "Ver sessões" e com as decisões antigas?** Confirmada pelo usuário em 22/11/2026, conforme a recomendação da PO (Rika), seguida pelas tarefas: (1) "Ver sessões" fica registrada como descartada e não sai do modelo, porque o servidor a mantém e removê-la seria código; na tela de Usuários continua sem aparecer; (2) criar a decisão 013 no molde da 011, cobrindo Sessões e Dashboard, com linha no índice das decisões; (3) as decisões antigas não têm o texto reescrito e ganham uma nota curta datada apontando para a 013, e os trechos que tratam Sessões ou Dashboard como tela futura são trocados pela nota; (4) as regras 07 e 02 ficam na pasta, marcadas no topo "Tela descartada (decisão 013)", e o índice das regras mostra "Descartada (013)"; (5) a tabela de permissões da decisão 004 e a do manual ficam iguais, com a nota da 013 nas duas. Afeta T2, T3, T4, T5, T7 e T8.
- **D-U-02. Dashboard (#71): descartado ou ainda pendente?** Resposta do usuário: descartado pelo grupo, como Sessões; não é "em construção" nem futuro. Entram no escopo as regras 00, 01, 02, 05, 08 e 11 e a decisão 007 (nota de estado), e a decisão 013 cobre as duas telas.
- **D-U-03. Texto exato da frase nova.** Resposta do usuário: "Prazo de espera considerado longo para o próximo horário livre." Vale para T1, T6, T7 e T8. O teste do texto, se houver, fica no teste dos campos da janela, seguindo o TDD do repositório.
- **D-U-04. Como registrar numa decisão o que não foi entregue?** Resposta do usuário: nota de estado datada, mantendo o texto das decisões, citando a #73 como "bônus da #73, não entregue".
- **D-U-05. Partes do manual desatualizadas por entregas depois da #119.** Resposta do usuário: corrigir agora todo o manual desatualizado, inclusive o bloqueio de parte do dia (#77, figura 18) e os marcadores do Conteúdo (#78), antes de gerar o PDF. A conferência está na divergência 6.
- **D-U-06. Quem tira as capturas novas.** Resposta do usuário: a figura 17 ganha captura nova, tirada pela Mai com dados fictícios depois da T1; a figura 18 entra na mesma tarefa. A conferência mostrou que a figura 14 também não tem a dica dos marcadores e entrou na mesma tarefa (T12).
- **D-U-07. Abrir uma issue de código para tirar Sessões do painel?** Resposta do usuário: não. Sessões e Dashboard no código do painel ficam só listados como problema em Riscos.
- **D-U-08. "Testes de borda extras" continua nos pendentes da regra 08?** Resposta do usuário: sim, continua.
- **D-U-09. Atualizar também a memória sobre Relatórios, Sessões, Dashboard e WhatsApp?** Resposta do usuário: não. Só a memória de Horários é atualizada.
- **D-U-10. Arquitetura, rastreabilidade do desafio e documento do software.** Resposta do usuário: arquitetura e rastreabilidade são do Megumi (dev-doc na #70) e saem do escopo, com nota de coordenação para combinar os trechos de Sessões e Dashboard; o documento do software não muda e fica listado como desatualizado em Riscos.
- **D-U-11. Figuras 17 e 18 com altura diferente da combinada na RN-13.** Resposta do usuário, em 22/11/2026: aceita. A figura 17 ficou com 974 × 838, porque o texto novo é mais curto, e a figura 18 com 2060 × 952, porque mostra 2 bloqueios fictícios e o formulário de período. A largura não mudou, e as imagens não serão refeitas.

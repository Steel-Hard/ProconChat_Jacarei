# Divergências entre a documentação de regras e o painel (#174)

> Status: em-revisao
> Tipo: funcionalidade
> Tamanho: media
> Branch: docs/174-divergencias-regras-e-painel
> Criada em: 2026-11-22

## Objetivo

Ao escrever o manual das telas (#119), o grupo viu que a documentação de regras e o painel dizem coisas diferentes em cinco pontos: o menu, a exportação de relatórios, a tela de Sessões, os conflitos na tela de Horários e um texto da tela de Horários que cita o Dashboard. O usuário já decidiu, para cada ponto, qual lado muda. Esta tarefa leva a documentação, o manual em PDF, a memória do time e um único texto do painel a dizer a mesma coisa.

Quase tudo é documentação. A única mudança no painel é trocar uma frase da tela de Horários que cita o Dashboard.

## Contexto e conferência inicial

Conferência feita em 2026-11-22, lendo a documentação, o código do painel e o board. Cada item aponta o que diverge hoje.

### Divergência 1: menu

- A regra de Entrar e Minha conta diz que o menu mostra hoje Agendamentos, Usuários e WhatsApp, e o estado da tela cita só as issues #84 e #85.
- O painel tem sete telas prontas no menu: Agendamentos, Relatórios, Conteúdo, Horários de atendimento, Documentos, Usuários e WhatsApp. Dashboard e Sessões não aparecem.
- O índice das regras repete o estado antigo e diz que "cada arquivo de tela pendente descreve como a tela vai funcionar", o que também vale para Sessões (ver divergência 3).
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

### Divergência 3: tela de Sessões e a permissão "Ver sessões"

O grupo descartou a tela de Sessões (#72) de propósito. A #72 e a #76 ("Outras conversas do mesmo número") estão fechadas no board. A documentação ainda trata Sessões como algo que vai existir nestes lugares:

| Onde | O que diz hoje |
|---|---|
| Regra 07 (Sessões) | A tela inteira, com o estado "Ainda não construída (issues #72 e #76)" |
| Índice das regras | Linha de Sessões "Pendente (#72, #76)", e a frase de que cada tela pendente descreve como vai funcionar |
| Regra 01 (Login e conta) | Sessões no grupo Chatbot da tabela do menu |
| Regra 00 (Regras gerais) | "Ver sessões" libera Sessões e o link da sessão de origem no Detalhe |
| Regra 02 (Dashboard) | "Ver sessões" entre as permissões de acesso, e "as conversas ficam na tela de Sessões" |
| Regra 04 (Detalhe do agendamento) | O código da sessão vira link para Sessões com "Ver sessões"; a linha do tempo usa os passos de Sessões; o link "fica com a #72" |
| Regra 05 (Relatórios) | Casos individuais ficam em Sessões; os nomes das etapas são os mesmos de Sessões |
| Regra 10 (Usuários) | A permissão de uma tela não pronta "aparece quando a tela ficar pronta" |
| Decisão 004 | "Ver sessões" entre as 8 permissões |
| Decisão 010 | A tela de Sessões é somente leitura; o contexto cita as telas de Sessões e Relatórios |
| Decisão 002 | "Outras conversas deste número" na tela de Sessões |
| Decisão 008 | Os nomes das etapas são usados em Sessões e em Relatórios |
| Decisão 011 | A tela de Sessões continua somente leitura |
| Manual do painel | "Ver sessões" na tabela de permissões; "abrir a conversa completa a partir do detalhe ainda não está disponível" |
| Arquitetura | Dashboard e Sessões "Em construção" |
| Rastreabilidade do desafio | Sessões como entrega do RF06 e como item "Importante"; "Dashboard e Sessões continuam Em construção" |
| Documento do software | A equipe pode "ver relatórios e sessões" |

O painel ainda tem rota, item de menu, permissão e textos de Sessões: a rota mostra "Em construção.", o item fica escondido, e a permissão existe no painel e no servidor. Isso é código e não faz parte desta tarefa (ver Riscos e a dúvida D-U-07).

### Divergência 4: conflitos na tela de Horários

Os textos e o comportamento da janela de conflitos já foram conferidos contra a seção "Quando a mudança afeta agendamentos existentes" da regra 08. Títulos, aberturas, opções, botões, resumo do aviso, mensagens de verificação, mensagem de lista alterada e mensagens de resultado são iguais aos do painel. Nessa parte não há divergência.

Divergências e pontos que a conferência encontrou:

| Onde | O que diz | O que o painel faz | Situação |
|---|---|---|---|
| Regra 08, tabela de motivos, linha das vagas reduzidas | Não cita o texto do motivo, só que "os agendados por último num horário lotado são os afetados" | Mostra o motivo "Vagas reduzidas para N; este horário tem M agendamentos" | Diverge: falta o texto do motivo |
| Regra 08, pendente "Tentar novamente" | O botão para a falha de envio do cancelamento em massa não foi entregue | O histórico de cada agendamento já tem "Tentar novamente" para aviso com falha quando o cancelamento foi da equipe. A regra também diz que a falha do cancelamento em massa fica registrada no mesmo formato do cancelamento individual. A conferência inicial indica que o botão do Detalhe já vale para esses casos, mas o modal não tem o botão | A confirmar na T6. Se confirmado, a regra passa a dizer que o reenvio é feito no Detalhe, e não pela janela |
| Regra 08, pendente "horários cancelados voltam a ficar livres" | Não garantido | A contagem de vagas ocupadas considera só agendamentos Pendentes e Confirmados. A conferência inicial indica que um horário cancelado volta a ficar livre | A confirmar na T6 |
| Regra 08, pendente "envio em paralelo" | Hoje os avisos saem um a um | Os avisos saem um a um | Sem divergência |
| Regra 08, pendente "testes de borda extras" | Item de pendência | Não é comportamento da tela | Ver D-U-08 |
| Decisão 012, item 4 | Conflitos "continuam recusando a gravação e o cancelamento" | Nada é gravado enquanto a equipe não escolhe na janela | Sem divergência |
| Manual, "Quando a mudança afeta agendamentos" | O painel não deixa salvar, "Salvar alterações" fica desabilitado, e cita o aviso "Há agendamentos em 23/11. Para desligar este dia…" | Não há trava: abre a janela de conflitos. O aviso citado não existe mais no painel | Diverge: o trecho precisa ser reescrito |
| Manual, "Datas bloqueadas" | Bloquear só um período do dia "ainda não está disponível" | A tela bloqueia o dia inteiro ou só um período (entregue na #77) | Diverge, mas não está entre as cinco da issue: ver D-U-05 |
| Memória do time, Horários, linha 15 | "Hoje a tela NÃO deixa salvar", e a janela viria "quando a #75 estiver pronta" | A janela existe (#75 fechada) | Diverge |
| Memória do time, Horários, linha 13 | "Cancelar a mudança é recusado se deixar agendamentos fora da grade anterior" | Abre a janela de conflitos, com textos próprios | Diverge |
| Memória do time, Relatórios, Sessões, Dashboard e WhatsApp | Dashboard e Sessões pendentes; exportação descrita como se existisse | Sessões descartada; exportação não entregue | Diverge: ver D-U-09 |

O índice das regras e o estado da regra 08 citam pendências "na #75", mas a #75 está fechada. O texto será ajustado junto com a lista de pendentes.

### Divergência 5: texto da tela de Horários que cita o Dashboard

- No campo "Alertar quando a espera passar de", a tela de Horários mostra a frase "O Dashboard avisa quando o próximo horário livre estiver além deste prazo." O Dashboard não existe no painel.
- A regra 08 diz que o Dashboard fica em alerta amarelo quando a espera passa do prazo, e em alerta vermelho quando a agenda está lotada.
- A decisão 007 diz que o Dashboard avisa quando o próximo horário livre passa do prazo.
- No manual, a legenda da figura 17 diz que o aviso do Dashboard "ainda não está disponível". O texto do campo diz que "o aviso correspondente ainda não está disponível no painel".
- A figura 17 é uma captura da tela com a frase antiga. Depois da troca, a captura deixa de bater com a tela.
- Nenhum teste do painel confere essa frase. A busca no projeto inteiro só a encontra no arquivo de textos da tela, no protótipo, na regra 08, no manual, na decisão 007 e na especificação da #119.
- Board: a #71 (Dashboard) está fechada. Ver D-U-02.

## Regras

| ID | Regra | Fonte |
|---|---|---|
| RN-01 | Nas divergências 1 a 4, só a documentação muda, para descrever o que o painel faz hoje. | usuário |
| RN-02 | A regra de Entrar e Minha conta e o índice das regras dizem que o menu tem sete telas prontas: Agendamentos, Relatórios, Conteúdo, Horários de atendimento, Documentos, Usuários e WhatsApp. | usuário; painel |
| RN-03 | A exportação de relatórios fica registrada como não entregue, como bônus da #73. A documentação não a descreve como algo que existe no painel. | usuário |
| RN-04 | A tela de Sessões (#72) foi descartada de propósito pelo grupo. A documentação registra isso como decisão, e não como "em construção" nem como pendente. | usuário |
| RN-05 | O que acontece com a permissão "Ver sessões" (sai do modelo final ou fica registrada como descartada) só é escrito depois da resposta da D-PO-01. | usuário (a decidir) |
| RN-06 | A regra 08 descreve a janela de conflitos e as pendências como o painel faz hoje, com os pontos da tabela da divergência 4. | usuário; painel |
| RN-07 | Na divergência 5, muda o painel: a frase do campo "Alertar quando a espera passar de" é trocada por um texto neutro que não cita o Dashboard. O texto exato precisa ser aprovado pelo usuário antes (D-U-03). | usuário |
| RN-08 | A documentação da divergência 5 (regra 08 e manual) passa a dizer o mesmo que o texto novo do painel. | usuário |
| RN-09 | O manual e o PDF dele seguem tudo o que ficar decidido. O PDF é gerado só para o manual, e nenhum outro PDF da pasta de guias pode mudar. | usuário; especificação #119 |
| RN-10 | A memória do time sobre Horários é atualizada com a fonte e a data, só depois da aprovação desta especificação. | usuário |
| RN-11 | A descrição de "Ver relatórios" na tela de Usuários fica como está, mesmo prometendo exportar. | usuário |
| RN-12 | A documentação não inventa regra: o que não foi decidido pelo usuário fica em Dúvidas. | usuário |

## Critérios de aceite

- CA-01 QUANDO alguém lê a regra de Entrar e Minha conta ENTÃO ela DEVE listar as sete telas prontas no menu, com o estado da tela atualizado, sem a frase de que o menu mostra só Agendamentos, Usuários e WhatsApp. (RN-01, RN-02)
- CA-02 QUANDO alguém lê o índice das regras ENTÃO o estado de cada tela DEVE bater com o painel: telas prontas como entregues, e Sessões e Dashboard conforme as respostas da D-PO-01 e da D-U-02. (RN-02, RN-04, RN-05)
- CA-03 QUANDO alguém lê a regra de Relatórios ENTÃO a seção de exportar DEVE dizer que a exportação não foi entregue e que era um bônus da #73, sem descrever um botão que não existe na tela. (RN-03)
- CA-04 QUANDO alguém lê as decisões 004 e 010 ENTÃO elas DEVEM deixar claro que a exportação não foi entregue, da forma escolhida na D-U-04. (RN-03, RN-12)
- CA-05 QUANDO alguém procura Sessões, "Ver sessões" ou #72 na documentação ENTÃO nenhum dos lugares da tabela da divergência 3 DEVE tratar a tela como futura, pendente ou em construção. Cada um DEVE seguir a resposta da D-PO-01. (RN-04, RN-05)
- CA-06 QUANDO o descarte de Sessões é registrado ENTÃO DEVE existir o registro da decisão da forma escolhida na D-PO-01, com a linha correspondente no índice das decisões, se for uma decisão nova. (RN-04, RN-05)
- CA-07 QUANDO alguém lê a tabela de motivos da regra 08 ENTÃO a linha das vagas reduzidas DEVE trazer o texto que o painel mostra: "Vagas reduzidas para N; este horário tem M agendamentos". (RN-06)
- CA-08 QUANDO alguém lê a lista de pendentes da regra 08 ENTÃO cada item DEVE estar conferido contra o painel: o que já funciona sai da lista, ou é reescrito como funciona hoje, e o que não foi entregue continua, sem citar a #75 como se estivesse aberta. (RN-06)
- CA-09 QUANDO a equipe abre a tela de Horários ENTÃO o campo "Alertar quando a espera passar de" DEVE mostrar o texto aprovado na D-U-03, sem citar o Dashboard. (RN-07)
- CA-10 QUANDO a tela de Horários é aberta em um celular de 320 px de largura ENTÃO o texto novo DEVE quebrar linha dentro do campo, sem rolagem horizontal. (RN-07)
- CA-11 QUANDO a tela de Horários é aberta em tamanho de computador ENTÃO ela DEVE continuar como antes, com só a frase trocada. (RN-07)
- CA-12 QUANDO alguém lê a regra 08 sobre o alerta de espera e a agenda lotada ENTÃO ela DEVE dizer o mesmo que o texto novo do painel, sem prometer um aviso que nenhuma tela mostra, seguindo a resposta da D-U-02. (RN-08)
- CA-13 QUANDO alguém lê o manual ENTÃO a seção "Quando a mudança afeta agendamentos" DEVE descrever a janela de conflitos como ela funciona hoje, sem citar a trava antiga, o botão desabilitado nem o aviso que não existe mais. (RN-01, RN-06, RN-09)
- CA-14 QUANDO alguém lê o manual na parte do alerta de espera ENTÃO o texto e a legenda da figura 17 DEVEM bater com a frase nova do painel e não citar o Dashboard. Se a captura continuar mostrando a frase antiga, isso DEVE estar resolvido como decidido na D-U-06. (RN-08, RN-09)
- CA-15 QUANDO alguém compara a tabela de permissões do manual com a da decisão 004 ENTÃO as duas DEVEM ser iguais, linha por linha. (RN-05, RN-09)
- CA-16 QUANDO o manual cita a exportação ENTÃO ele DEVE dizer que ela não foi entregue. O aviso de que a descrição de "Ver relatórios" na tela de Usuários fala em exportação DEVE continuar. (RN-03, RN-11)
- CA-17 QUANDO o PDF do manual é gerado de novo ENTÃO o gerador DEVE terminar sem erro, o sumário DEVE levar cada item à página certa, e nenhum outro PDF da pasta de guias DEVE mudar no commit. (RN-09)
- CA-18 QUANDO alguém clica em um link mudado ou novo na documentação ENTÃO ele DEVE abrir um arquivo e uma seção que existem. (RN-01)
- CA-19 QUANDO a memória do time sobre Horários é lida depois desta tarefa ENTÃO ela DEVE descrever a janela de conflitos como a regra 08 descreve, com a fonte e a data da leitura. (RN-10)
- CA-20 QUANDO alguém compara o painel e a documentação depois desta tarefa ENTÃO toda diferença conhecida que sobrar DEVE estar listada em Riscos, com a decisão, a dúvida ou a issue que a mantém aberta (por exemplo, a descrição de "Ver relatórios" na tela de Usuários e o que ficar para outra issue pelas respostas da D-U-05, da D-U-07 e da D-U-10). (RN-11, RN-12)

## Critérios de sucesso

- Para cada uma das cinco divergências, documentação e painel dizem a mesma coisa, ou a diferença que sobra está registrada como decisão do usuário.
- O manual em PDF bate com o painel e com as regras nos pontos desta tarefa.
- Ninguém que leia a documentação espera ver a tela de Sessões, a exportação de relatórios ou um aviso do Dashboard no painel de hoje.

## Fora do escopo

- Mudar a descrição de "Ver relatórios" na tela de Usuários, que promete exportar. É código e fica como está, por decisão do usuário.
- Remover do painel ou do servidor a rota, o item de menu, a permissão e os textos de Sessões. É código. Fica registrado em Riscos e na D-U-07.
- Construir a exportação de relatórios, a tela de Sessões ou o Dashboard.
- Mudar o protótipo, que também tem a frase do Dashboard. Pela regra do índice, quando o protótipo e a regra divergem, vale a regra.
- Mudar o gerador de PDF, o estilo dos guias ou os outros dois guias em PDF.
- A parte do manual sobre bloqueio de parte do dia (#77) e qualquer outra divergência que não esteja entre as cinco da issue, a não ser que o usuário as inclua (D-U-05).
- Arquitetura, rastreabilidade do desafio e documento do software, a não ser que o usuário as inclua (D-U-10).

## Riscos

- **A descrição de "Ver relatórios" na tela de Usuários continua prometendo exportar em PDF, Excel ou CSV.** O painel fica diferente da documentação nesse ponto, por decisão do usuário. O manual mantém o aviso sobre isso.
- **O painel ainda tem Sessões no código.** A rota mostra "Em construção.", e o item de menu e a permissão estão escondidos porque a tela não está pronta. As regras de acesso das telas do painel contam "Ver sessões" para abrir o Dashboard, e o servidor mantém a permissão na lista de permissões. Se a documentação disser que Sessões e "Ver sessões" saíram do modelo, o código continua com elas, sem efeito visível para a equipe, até alguém abrir uma tarefa de código.
- **A figura 17 do manual mostra a frase antiga.** Depois da T1, a captura deixa de bater com a tela. O dev-doc não tira capturas sem apoio (D-U-06).
- **O sumário do manual tem os números de página escritos à mão.** Reescrever a seção de conflitos muda a paginação. O gate da T9 confere cada número e cada link.
- **O documento do software tem PDF próprio.** Mudar o texto dele obriga a gerar outro PDF, o que bate com a regra de que nenhum outro PDF muda (D-U-10).
- **As issues #71, #72, #73 e #76 estão fechadas no board.** Citar "bônus da #73" ou "Dashboard (#71)" como trabalho futuro pode confundir quem lê (D-U-02 e D-U-04).
- **Várias pessoas mexem nos mesmos arquivos.** Regra 01, índice das regras, decisão 004, regra 08 e manual aparecem em mais de uma divergência. As tarefas foram montadas por arquivo, para duas tarefas nunca editarem o mesmo arquivo ao mesmo tempo.

## Plano de execução

Nenhuma tarefa começa antes de o usuário aprovar esta especificação e responder as dúvidas de que ela depende (campo "Depende de"). Nas tarefas de documentação, o gate é o de documentação: links abrem, o texto bate com o painel e com a regra, e o manual fica coerente. Typecheck, lint e suíte não se aplicam a elas. Só a T1 mexe em código e tem o gate do frontend, com as mesmas checagens do CI.

- Fase 1 (paralelo): T1 [P], T2 [P], T3 [P], T4 [P], T5 [P]
  - Gate de fase: no frontend, `npm run build` (inclui o typecheck), `npm run test:run`, `npm run lint` e `npm run format:check` sem erro. Na documentação, as buscas da T5 rodadas em `.docs/regras/` e `.docs/decisoes/` sem nenhum trecho que trate Sessões como futura, e todos os links mudados abrindo.
- Fase 2 (paralelo): T6 [P], T7 [P]
  - Gate de fase: regra 08 conferida contra o painel, item por item; decisão 007 e regra 08 com o mesmo texto que o painel sobre o alerta de espera.
- Fase 3 (sequencial): T8 → T9
  - Gate de fase: `.docs/guias/gerar-pdfs.sh manual-do-painel` sem erro; `git status --short` só com o manual, o PDF dele e, se houver, as imagens dele; tabela de permissões do manual igual à da decisão 004; sumário conferido.
- Fase 4 (paralelo): T10 [P], T11 [P]
  - Gate de fase: memória do time conferida contra a regra 08 e reviewer sem achado que bloqueia.

Ambiente do gerador: Node.js 20 ou mais novo e Chrome ou Chromium (ou `CHROME_PATH`). Na primeira execução, o `npx` baixa o `marked` e precisa de internet. Rode sempre com o nome do manual: sem argumento, o gerador refaz todos os PDFs da pasta com a data de hoje na capa, e eles não devem entrar no commit.

Commits: um commit por tarefa, só com os arquivos da tarefa, no padrão `Docs :bulb: [#174] <descrição>` (a T1 usa `Fix :bug: [#174] <descrição>`, porque muda o painel). O repositório proíbe a coautoria do Claude: nenhum commit leva a linha `Co-Authored-By`. Confira com `git log -1` depois de cada commit.

## Tarefas

### T1 [P] Trocar no painel a frase do alerta de espera

- **O quê:** trocar a frase do campo "Alertar quando a espera passar de", na tela de Horários, pelo texto aprovado na D-U-03.
- **Onde:** `src/frontend/src/locales/pt-BR/schedule.json`, chave `window.waitAlertHelp` (linha 201). Nenhum outro arquivo.
- **Dev:** dev-frontend
- **Depende de:** D-U-03 (texto aprovado)
- **Reaproveita:** o campo e o componente que já mostram a frase (`ScheduleWindowFields.tsx`), sem alterá-los.
- **Atende:** RN-07, CA-09, CA-10, CA-11
- **Pronto quando:** a tela mostra o texto aprovado, igual letra por letra; nenhum outro texto mudou; no celular de 320 px a frase quebra linha sem rolagem horizontal; em tamanho de computador a tela continua como antes; o gate passa.
- **Teste:** nenhum novo. É só troca de texto, dispensada pelo padrão de testes. Nenhum teste atual confere essa frase: o teste dos campos da janela (`src/frontend/src/components/test/ScheduleFormFields.test.tsx`) só confere a descrição de "Oferecer horários até".
- **Gate:** em `src/frontend`, `npm run typecheck`, `npx vitest run src/components/test/ScheduleFormFields.test.tsx`, `npx prettier --check src/locales/pt-BR/schedule.json` e `npm run lint`. Conferência visual a 320 px e em tamanho de computador.
- **Modelo:** economico
- **Commit:** `Fix :bug: [#174] Troca o texto do alerta de espera que citava o Dashboard`
- **Status:** pendente

### T2 [P] Atualizar o menu e os estados na regra de Login e no índice das regras

- **O quê:** descrever o menu de hoje, com as sete telas prontas, e acertar o estado de cada tela no índice das regras, incluindo Sessões e Dashboard.
- **Onde:** `.docs/regras/01-login-e-conta.md` (linhas 13, 26 a 35) e `.docs/regras/README.md` (linhas 21, 22, 27 e 33). A linha 28 (regra 08) fica com a T6.
- **Dev:** dev-doc
- **Depende de:** D-PO-01 (Sessões) e D-U-02 (Dashboard)
- **Reaproveita:** a lista de telas prontas do painel (`src/frontend/src/navigation/navItemsReady.ts`) e a tabela do menu do manual, que já mostra as sete telas.
- **Atende:** RN-01, RN-02, RN-04, RN-05, CA-01, CA-02, CA-05, CA-18
- **Pronto quando:** a regra 01 lista as sete telas prontas, a tabela do menu e a frase da tela inicial seguem as respostas da D-PO-01 e da D-U-02, o estado da tela cita as entregas certas, e o índice mostra o estado certo de cada tela. A frase "Cada arquivo de tela pendente descreve como a tela vai funcionar" fica coerente com o descarte de Sessões.
- **Teste:** nenhum (documentação).
- **Gate:** documentação. A lista do menu na regra é igual à do painel, tela por tela. Todo link mudado abre o arquivo e a seção que existem.
- **Modelo:** economico
- **Commit:** `Docs :bulb: [#174] Atualiza o menu e o estado das telas nas regras`
- **Status:** pendente

### T3 [P] Registrar a exportação como não entregue na regra de Relatórios e na decisão 010

- **O quê:** dizer, na regra de Relatórios e na decisão 010, que a exportação não foi entregue e que era um bônus da #73, e tirar dessas duas as citações a Sessões como tela futura.
- **Onde:** `.docs/regras/05-relatorios.md` (seção Exportar, linha 76 em diante; linhas 94, 95 e 100) e `.docs/decisoes/010-registro-de-interacoes-e-relatorios.md` (linhas 9, 29, 30 e 35).
- **Dev:** dev-doc
- **Depende de:** D-U-04 (forma de registrar numa decisão) e D-PO-01 (Sessões)
- **Reaproveita:** a forma como a regra 08 marca o que não foi entregue ("Pendente (não entregue na…)").
- **Atende:** RN-03, RN-04, RN-12, CA-03, CA-04, CA-05, CA-18
- **Pronto quando:** a regra de Relatórios não descreve o botão "Exportar" como algo da tela. Ela diz que a exportação não foi entregue e que era um bônus da #73, sem inventar um prazo. A decisão 010 registra o mesmo da forma escolhida na D-U-04. Casos individuais e nomes das etapas não apontam mais para a tela de Sessões como se ela existisse.
- **Teste:** nenhum (documentação).
- **Gate:** documentação. Uma busca por "Exportar" e "exportação" nos dois arquivos só encontra trechos que dizem que ela não foi entregue. Todo link mudado abre.
- **Modelo:** padrao
- **Commit:** `Docs :bulb: [#174] Registra a exportação de relatórios como não entregue`
- **Status:** pendente

### T4 [P] Registrar o descarte de Sessões nas decisões e ajustar a decisão 004

- **O quê:** registrar o descarte da tela de Sessões como decisão, da forma escolhida na D-PO-01, e ajustar a tabela de permissões da decisão 004 (Sessões e exportação).
- **Onde:** nova decisão em `.docs/decisoes/` (próximo número livre, hoje 013), se a D-PO-01 confirmar a recomendação; `.docs/decisoes/README.md` (índice); `.docs/decisoes/004-contas-e-permissoes-granulares.md` (linhas 16, 25 e 26); e, conforme a D-PO-01, as citações a Sessões nas decisões 002 (linha 25), 008 (linha 45) e 011 (linha 24).
- **Dev:** dev-doc
- **Depende de:** D-PO-01 (Sessões) e D-U-04 (forma de registrar numa decisão)
- **Reaproveita:** a decisão 011 (atendimento humano não adotado) como modelo de uma decisão de "não fazer", e o formato do índice das decisões.
- **Atende:** RN-03, RN-04, RN-05, RN-12, CA-04, CA-05, CA-06, CA-18
- **Pronto quando:** existe o registro do descarte, com contexto, decisão e consequências, e o índice das decisões o lista. A decisão 004 diz o que acontece com "Ver sessões" e que a exportação não foi entregue, como respondido. As decisões 002, 008 e 011 não tratam a tela como futura, ou ganham a nota escolhida na D-PO-01.
- **Teste:** nenhum (documentação).
- **Gate:** documentação. A tabela de permissões da decisão 004 fica registrada no Status da tarefa, para a T8 copiar ao manual. O índice das decisões abre a decisão nova. Todo link mudado abre.
- **Modelo:** padrao
- **Commit:** `Docs :bulb: [#174] Registra o descarte da tela de Sessões nas decisões`
- **Status:** pendente

### T5 [P] Tirar Sessões como tela futura das regras das telas

- **O quê:** ajustar as regras das telas para que nenhuma trate Sessões como futura, seguindo a D-PO-01.
- **Onde:** `.docs/regras/07-sessoes.md` (o arquivo inteiro, conforme a D-PO-01: marcar como descartada ou retirar), `.docs/regras/00-regras-gerais.md` (linhas 23 e 66), `.docs/regras/02-dashboard.md` (linhas 9 e 79), `.docs/regras/04-detalhe-do-agendamento.md` (linhas 45, 116 e 123) e `.docs/regras/10-usuarios.md` (linha 35).
- **Dev:** dev-doc
- **Depende de:** D-PO-01 (Sessões) e D-U-02 (Dashboard, para a regra 02)
- **Reaproveita:** o levantamento da tabela da divergência 3.
- **Atende:** RN-03, RN-04, RN-05, CA-05, CA-18
- **Pronto quando:** os cinco arquivos seguem a D-PO-01. O Detalhe do agendamento não promete link para Sessões. As regras gerais não prometem a tela nem a exportação ("Relatórios e exportações" passa a dizer só o que existe). A regra de Usuários não promete que "Ver sessões" vai aparecer.
- **Teste:** nenhum (documentação).
- **Gate:** documentação. Uma busca por `Sessões`, `Ver sessões`, `#72` e `07-sessoes` em `.docs/regras/` só encontra o registro do descarte (ou o que a D-PO-01 mandar manter) e o uso técnico da palavra "sessão" (sessão de login, sessão da conversa no banco). Todo link para `07-sessoes.md` abre, ou foi retirado se o arquivo saiu.
- **Modelo:** padrao
- **Commit:** `Docs :bulb: [#174] Retira Sessões como tela futura das regras`
- **Status:** pendente

### T6 [P] Conferir e corrigir a regra 08 contra o painel

- **O quê:** corrigir a regra 08 nos pontos da tabela da divergência 4, e alinhar o alerta de espera e a agenda lotada com o texto novo do painel.
- **Onde:** `.docs/regras/08-horarios-de-atendimento.md`: estado da tela (linha 13), janela de agendamento (linhas 43 e 45), motivo das vagas reduzidas (linha 113), pendentes (linhas 160 a 165) e Relações (linha 177); e a linha da regra 08 no índice das regras (`.docs/regras/README.md`, linha 28).
- **Dev:** dev-doc
- **Depende de:** T1 (texto do painel), T2 (mesmo arquivo do índice), D-U-02 (Dashboard) e D-U-08 (testes de borda)
- **Reaproveita:** os textos do painel em `src/frontend/src/locales/pt-BR/schedule.json` (chaves `conflicts`, `conflictModal` e `window`), os motivos do servidor em `src/backend/services/scheduleRules.ts`, a regra de reenvio em `src/backend/services/appointmentTransitions.ts` (`decideRetryCancellationNotice`), o envio em massa em `src/backend/services/schedule.service.ts` (`sendMassCancellationNotices`) e a contagem de vagas em `src/backend/repositories/schedule.repository.ts`.
- **Atende:** RN-06, RN-08, CA-07, CA-08, CA-12, CA-18
- **Pronto quando:**
  - A linha das vagas reduzidas traz o texto do motivo.
  - Cada pendente foi conferido no código e o resultado está no Status desta tarefa. Fica na lista só o que não foi entregue, sem citar a #75 como aberta.
  - Se o reenvio pelo Detalhe valer para o cancelamento em massa, a regra diz isso e explica que a janela de conflitos não tem o botão.
  - As linhas 43 e 45 dizem o mesmo que o texto novo do painel e seguem a D-U-02.
  - A linha da regra 08 no índice das regras diz o mesmo que o estado e os pendentes da regra.
- **Teste:** nenhum (documentação).
- **Gate:** documentação. Cada texto citado entre aspas na regra existe igual no painel ou no servidor. Todo link mudado abre.
- **Modelo:** padrao
- **Commit:** `Docs :bulb: [#174] Corrige a regra de Horários conforme o painel`
- **Status:** pendente

### T7 [P] Alinhar a decisão 007 ao texto novo do alerta de espera

- **O quê:** ajustar o item da decisão 007 que diz que o Dashboard avisa quando o próximo horário livre passa do prazo, da forma escolhida na D-U-04 e conforme a D-U-02.
- **Onde:** `.docs/decisoes/007-agenda-configuravel.md` (linha 19).
- **Dev:** dev-doc
- **Depende de:** T1, D-U-02 e D-U-04
- **Reaproveita:** o texto aprovado na D-U-03.
- **Atende:** RN-08, RN-12, CA-12
- **Pronto quando:** a decisão não promete um aviso do Dashboard que o painel não tem, ou ganha a nota de estado escolhida na D-U-04.
- **Teste:** nenhum (documentação).
- **Gate:** documentação. O texto bate com a regra 08 e com o painel.
- **Modelo:** economico
- **Commit:** `Docs :bulb: [#174] Ajusta o alerta de espera na decisão 007`
- **Status:** pendente

### T8 Atualizar o texto do manual

- **O quê:** levar ao manual tudo o que ficou decidido: Sessões, exportação, alerta de espera e janela de conflitos.
- **Onde:** `.docs/guias/manual-do-painel.md`:
  - linha 210 (conversa completa a partir do Detalhe);
  - linhas 268, 416 e 501 (exportação);
  - linhas 336 e 340 (figura 17 e alerta de espera);
  - linhas 361 a 365 (seção "Quando a mudança afeta agendamentos");
  - linhas 489 a 499 (tabela de permissões);
  - o sumário (linhas 1 a 60);
  - a linha 352 e a figura 18 (bloqueio de parte do dia), só se a D-U-05 incluir;
  - capturas novas em `.docs/guias/images/manual-do-painel/`, só se a D-U-06 decidir assim.
- **Dev:** dev-doc
- **Depende de:** T1, T3, T4, T6, D-U-05 e D-U-06
- **Reaproveita:** a regra 08 corrigida (T6), a tabela da decisão 004 (T4) e a linguagem e o formato de avisos que o manual já usa.
- **Atende:** RN-01, RN-03, RN-04, RN-05, RN-08, RN-09, RN-11, CA-13, CA-14, CA-15, CA-16, CA-18
- **Pronto quando:**
  - A seção de conflitos descreve a janela de hoje (opções, quem pode cancelar, aviso ao cidadão ligado ou desligado), em linguagem simples, sem a trava antiga.
  - O alerta de espera e a legenda da figura 17 batem com o texto novo.
  - A tabela de permissões é igual à da decisão 004.
  - A exportação aparece como não entregue, e o aviso sobre a descrição de "Ver relatórios" continua.
  - O manual não promete a tela de Sessões.
  - Toda figura citada existe na pasta de imagens.
- **Teste:** nenhum (documentação).
- **Gate:** documentação. A comparação mecânica da tabela de permissões do manual com a da decisão 004 não mostra diferença, do mesmo jeito da T8 da especificação #119. A lista de imagens citadas é igual à lista da pasta. `.docs/guias/gerar-pdfs.sh manual-do-painel` termina sem erro.
- **Modelo:** padrao
- **Commit:** `Docs :bulb: [#174] Atualiza o manual do painel conforme as decisões da #174`
- **Status:** pendente

### T9 Gerar de novo o PDF do manual

- **O quê:** gerar o PDF do manual a partir do texto da T8.
- **Onde:** `.docs/guias/manual-do-painel.pdf`
- **Dev:** dev-doc
- **Depende de:** T8
- **Reaproveita:** `.docs/guias/gerar-pdfs.sh` e `.docs/guias/gerar-pdf.mjs`, sem alterá-los.
- **Atende:** RN-09, CA-17
- **Pronto quando:**
  - O PDF foi gerado só para o manual, abre com capa, sumário e capturas, e fica dentro dos limites da #119: até 40 páginas, 35 figuras e 10 MB.
  - Cada número de página do sumário bate com a página real. Se não bater, a T8 corrige o sumário e o PDF é gerado de novo.
  - Nenhum outro PDF da pasta mudou.
- **Teste:** nenhum (documentação).
- **Gate:** `.docs/guias/gerar-pdfs.sh manual-do-painel` sem erro; `ls -l .docs/guias/manual-do-painel.pdf` com até 10 MB; páginas e destinos do sumário conferidos no leitor de PDF; `git status --short` sem `guia-configuracao-do-bot.pdf` nem `documento-do-software.pdf`.
- **Modelo:** economico
- **Commit:** `Docs :bulb: [#174] Gera de novo o PDF do manual do painel`
- **Status:** pendente

### T10 [P] Atualizar a memória do time sobre Horários

- **O quê:** atualizar o item de Horários da memória do time para descrever a janela de conflitos e o cancelamento de mudança agendada como a regra 08 descreve, e, se a D-U-09 pedir, o item de Relatórios, Sessões, Dashboard e WhatsApp.
- **Onde:** `/home/felipe/faculdade/ProconChat_Jacarei/.claude/team-memory/project_horarios-documentos-lembrete.md` (linhas 8, 11, 13 e 15) e, se a descrição mudar, a linha correspondente em `/home/felipe/faculdade/ProconChat_Jacarei/.claude/team-memory/MEMORY.md`. Os arquivos ficam no repositório principal, fora do git.
- **Dev:** dev-doc
- **Depende de:** aprovação desta especificação, T6 e D-U-09
- **Reaproveita:** a regra 08 corrigida (T6).
- **Atende:** RN-10, CA-19
- **Pronto quando:** o item diz que a tela não trava o salvamento e que abre a janela de conflitos, com as opções de hoje. Também diz que cancelar uma mudança agendada com afetados abre a mesma janela, e o alerta de espera fica como o texto novo. A linha "Fonte" cita a regra 08 e a data da leitura.
- **Teste:** nenhum (documentação).
- **Gate:** conferir o texto da memória contra a regra 08, frase por frase. Não há commit, porque a pasta fica fora do git.
- **Modelo:** economico
- **Status:** pendente

### T11 [P] Revisão do reviewer

- **O quê:** revisar o PR contra os critérios de aceite desta especificação.
- **Onde:** o PR da branch `docs/174-divergencias-regras-e-painel`.
- **Dev:** reviewer
- **Depende de:** T1 a T9
- **Reaproveita:** o padrão de revisão do projeto.
- **Atende:** CA-01 a CA-20
- **Pronto quando:** não há achado que bloqueia; o PR só altera os arquivos citados nas tarefas e esta especificação; `gerar-pdf.mjs` e `gerar-pdfs.sh` não mudaram; os outros dois PDFs não mudaram.
- **Teste:** nenhum.
- **Gate:** `git diff --stat develop...HEAD` só com os arquivos das tarefas; `git diff develop...HEAD -- .docs/guias/gerar-pdf.mjs .docs/guias/gerar-pdfs.sh` sem saída; CI verde.
- **Modelo:** padrao
- **Status:** pendente

## Dúvidas

A numeração é única para as duas listas (1 a 10), para facilitar levar ao usuário.

### Para o product-owner

- **D-PO-01. Tela de Sessões descartada: o que acontece com a permissão "Ver sessões"?** Ela sai do modelo final, e a decisão 004 passa a ter 7 permissões, ou fica registrada como descartada (por exemplo, "Ver sessões: descartada junto com a tela de Sessões")? A recomendação é registrar o descarte numa decisão nova (013), com uma linha no índice das decisões, porque o assunto aparece em várias decisões antigas (002, 004, 008, 010 e 011). Também falta definir o que fazer com essas decisões antigas: editar o texto delas ou só incluir uma nota apontando para a 013. E a regra 07 (Sessões): sai da pasta, ou fica marcada como descartada? Afeta T2, T3, T4, T5 e T8.

### Para o usuário

- **D-U-02. Dashboard (#71): descartado ou ainda pendente?** A #71 está fechada no board, com a #73 e a #76. A mensagem da tarefa diz que o Dashboard "ainda está em construção". A resposta muda a regra 08 (alertas amarelo e vermelho, linhas 43 e 45), a regra 01 (tela inicial "quando o Dashboard ficar pronto"), a regra 02 inteira, as regras gerais (blocos do Dashboard nas permissões), a regra 11 (Saúde do chatbot), a decisão 007 e o que o texto novo do painel pode dizer.
- **D-U-03. Qual é o texto exato da frase nova do campo "Alertar quando a espera passar de"?** Nenhuma tela mostra um aviso hoje, então o texto não pode prometer um aviso. Sugestões, só como ponto de partida:
  1. "Prazo de espera considerado alto até o próximo horário livre."
  2. "Quantos dias de espera até o próximo horário livre são considerados demais."
  3. "Usado para indicar quando a espera pelo próximo horário livre está alta."
- **D-U-04. Como registrar numa decisão o que não foi entregue?** As decisões 004, 007 e 010 descrevem o que foi decidido na época, e a exportação e o aviso do Dashboard não foram entregues. Há duas formas: (a) manter a decisão como está e incluir uma nota de estado ("Estado em 2026-11-22: a exportação não foi entregue; era um bônus da #73"); ou (b) mudar o texto da decisão, ou o status dela, para tirar a exportação do que foi decidido. Também falta definir como citar a #73, que está fechada: "bônus da #73, não entregue" ou outro texto. Afeta T3, T4 e T7.
- **D-U-05. Entram nesta tarefa as partes do manual que ficaram desatualizadas por entregas depois da #119?** O manual diz que bloquear só um período do dia "ainda não está disponível", mas isso foi entregue na #77, e a figura 18 provavelmente mostra o formulário antigo. A #78 (marcadores de horário e endereço no Conteúdo) também entrou depois do manual e não foi conferida. Incluir aqui ou abrir outra issue?
- **D-U-06. Quem tira as capturas novas, se forem precisas?** A figura 17 mostra a frase antiga do Dashboard e deixa de bater com a tela depois da T1. A seção de conflitos ficaria mais clara com uma captura da janela, e a figura 18 pode estar desatualizada (D-U-05). O dev-doc não tira capturas sem apoio. As saídas são: (a) alguém tira as capturas no painel local com dados fictícios, como na #119; (b) recortar a figura 17 para tirar a frase; ou (c) manter a figura e explicar na legenda que a frase mudou.
- **D-U-07. Abrir uma issue de código para tirar Sessões do painel?** O painel ainda tem a rota "Em construção.", o item de menu escondido, a permissão "Ver sessões" (na lista de permissões do painel e do servidor; no painel, ela também conta para abrir o Dashboard) e os textos da tela. Não é desta tarefa. Fica como risco até alguém decidir.
- **D-U-08. "Testes de borda extras" continua na lista de pendentes da regra 08?** A regra é escrita para quem não é de TI, e esse item não é comportamento da tela. Manter, tirar da regra ou levar para a issue?
- **D-U-09. Atualizar também a memória do time sobre Relatórios, Sessões, Dashboard e WhatsApp?** Ela trata o Dashboard e Sessões como pendentes e descreve a exportação como se existisse. Isso diverge da documentação depois desta tarefa.
- **D-U-10. Entram nesta tarefa a arquitetura, a rastreabilidade do desafio e o documento do software?** Os três citam Sessões (e o Dashboard) como em construção ou como entrega. O documento do software tem PDF próprio: mudar o texto exige gerar outro PDF, o que hoje vai contra a regra de que nenhum outro PDF muda.

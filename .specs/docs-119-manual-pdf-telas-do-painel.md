# Manual em PDF das telas do painel (#119)

> Status: aprovada
> Tipo: funcionalidade
> Tamanho: media
> Branch: docs/119-manual-pdf-telas-do-painel
> Criada em: 2026-11-21

## Objetivo

Hoje a equipe do PROCON tem um guia em PDF só para conectar o WhatsApp. Não existe um material que explique, para quem não é de TI, o que cada tela do painel mostra, o que dá para fazer em cada uma e o que cada permissão libera. Esta tarefa cria esse manual em PDF, com capturas de tela feitas só com dados fictícios. O manual também traz sugestões de quais permissões marcar para um estagiário, um atendente e um líder, deixando claro que o sistema não tem perfis prontos. Por último, traz um apêndice para a equipe técnica com o passo a passo para redefinir a senha do Admin no servidor.

É só documentação: nenhuma tela, regra ou código do sistema muda.

## Regras

| ID | Regra | Fonte |
|---|---|---|
| RN-01 | O manual é para a equipe do PROCON que não é de TI. Fora o apêndice técnico, o texto usa linguagem simples, sem caminhos de arquivo, comandos, nomes de tabela ou termos de programação. | issue #119; usuário |
| RN-02 | O manual cobre exatamente estas telas: Entrar e Minha conta, Agendamentos, Detalhe do agendamento, Conteúdo, Horários de atendimento, Documentos, Usuários, Relatórios e WhatsApp. Sessões e Dashboard ficam de fora. | issue #119; usuário |
| RN-03 | "Ver sessões" aparece só na tabela de permissões. O manual não descreve a tela de Sessões. | usuário |
| RN-04 | O manual descreve só o que existe de fato no painel hoje. O que ainda não existe dentro de uma tela incluída aparece como "ainda não disponível", sem descrever como vai funcionar. Isso vale para o link da sessão no Detalhe, os itens extras e a exportação em Relatórios, e a janela de conflitos com agendamentos e o bloqueio de parte do dia em Horários. | usuário; índice das regras das telas |
| RN-05 | Explica o que cada permissão libera, com uma tabela idêntica à da decisão 004 (as 8 permissões, com os mesmos nomes e o mesmo texto da coluna "Libera", incluindo "(inclui Ver)"). | issue #119; decisão 004 |
| RN-06 | Explica que não existem perfis nem cargos: cada conta nasce sem nenhuma permissão e é montada marcando as permissões uma a uma. | decisão 004; regras de Usuários |
| RN-07 | As combinações para estagiário, atendente e líder aparecem como sugestões, e o manual diz isso com todas as letras. Estagiário: só "Ver agendamentos". Atendente: só "Gerenciar agendamentos" ("Ver sessões" não entra, porque hoje não pode ser concedida). Líder: todas as permissões que podem ser marcadas hoje, menos "Gerenciar usuários", ou seja, Ver agendamentos, Gerenciar agendamentos, Gerenciar conteúdo do chatbot, Configurar atendimento presencial, Configurar documentos para atendimento presencial e Ver relatórios. | product-owner (sugestão); usuário (D-U-01, D-U-02, D-U-03) |
| RN-08 | O manual nunca orienta marcar uma permissão que não aparece na tela de Usuários. Hoje a tela só mostra as permissões das telas prontas, e "Ver sessões" não aparece. | regras de Usuários; código do painel |
| RN-09 | Toda captura é feita com o painel rodando localmente na worktree, só com dados fictícios. Nenhum nome, CPF, telefone, e-mail, protocolo ou credencial real pode aparecer (LGPD). Na tela de WhatsApp, só identificadores inventados e nenhum token real. | usuário; decisão 002 |
| RN-10 | Toda tela coberta tem ao menos uma captura com legenda numerada. | issue #119 |
| RN-11 | O manual tem um apêndice técnico, para a equipe técnica, com o passo a passo para redefinir a senha do Admin no servidor. O apêndice pode ter comandos, mas não pode ter endereço de servidor, IP nem segredo. | usuário; decisão 004, item 8 |
| RN-12 | O manual usa o gerador e o estilo que já existem para os guias em PDF. O gerador não muda. O estilo pode ganhar um bloco no fim, com uma nota no guia de estilo, que vale só para o manual, desde que os outros guias em PDF não mudem de aparência. | usuário (D-U-10) |
| RN-13 | O PDF entra no índice geral da documentação (linha da pasta de guias) e na tabela do índice dos guias. | issue #119 |
| RN-14 | Quando uma fonte de texto diverge do código do painel, vale o que o painel faz hoje, e a divergência é anotada para o reviewer. Corrigir as outras fontes fica fora desta tarefa. | usuário |
| RN-15 | Junto da combinação do líder, o manual avisa que, sem "Gerenciar usuários" no líder, só a conta Admin gerencia contas, e que quem cria uma conta precisa ter todas as permissões que vai conceder a ela. | usuário (D-U-03) |
| RN-16 | Logo abaixo da tabela de permissões, fora dela, uma nota diz que a exportação de relatórios ainda não está disponível. A tabela continua idêntica à da decisão 004, e não há nota sobre "Ver sessões". | usuário (D-U-04) |
| RN-17 | O capítulo de WhatsApp só apresenta a tela e aponta para o guia de configuração do bot que já existe, sem repetir o passo a passo. | usuário (D-U-05) |
| RN-18 | A capa tem o título "Manual do painel" e o subtítulo "Como usar as telas do painel do ProconChat Jacareí". | usuário (D-U-08) |
| RN-19 | As capturas são só em tamanho de computador. Não há capturas em tamanho de celular. | usuário (D-U-07) |
| RN-20 | O PDF tem no máximo 40 páginas, 35 capturas e 10 MB. | usuário (D-U-09) |
| RN-21 | O PDF não tem marcadores na barra lateral do leitor. A navegação do manual é o sumário clicável no início do documento. | usuário (D-U-11) |

## Critérios de aceite

Conteúdo e linguagem

- CA-01 QUANDO o PDF é aberto ENTÃO DEVE ter um capítulo para cada tela de RN-02, cada um com ao menos uma captura com legenda numerada ("Figura N – ..."). (RN-02, RN-10)
- CA-02 QUANDO o PDF é lido ENTÃO não DEVE ter capítulo nem captura das telas de Sessões e Dashboard, e "Ver sessões" só DEVE aparecer na tabela de permissões. (RN-02, RN-03)
- CA-03 QUANDO uma pessoa que não é de TI lê qualquer capítulo fora o apêndice técnico ENTÃO ela não DEVE encontrar caminho de arquivo, comando, nome de tabela, código de erro da API nem termo de programação sem explicação. Palavras como "permissão", "agendamento" e "modelo de mensagem" DEVEM estar num quadro de palavras, como no guia de configuração do bot. (RN-01)
- CA-04 QUANDO um capítulo cita algo que ainda não existe na tela ENTÃO DEVE dizer "ainda não disponível" (ou frase equivalente aprovada) e não DEVE descrever como vai funcionar. (RN-04)
- CA-05 QUANDO o texto de um capítulo é comparado com o painel rodando localmente ENTÃO todo nome de botão, campo, aba, filtro e mensagem citado DEVE existir na tela com o mesmo texto. (RN-04, RN-14)

Permissões e combinações

- CA-06 QUANDO a tabela de permissões do manual é comparada, linha a linha e de forma mecânica, com a tabela da decisão 004 ENTÃO as duas DEVEM ser idênticas: as mesmas 8 linhas, na mesma ordem, com o mesmo texto nas duas colunas. Qualquer observação extra DEVE ficar fora da tabela. (RN-05)
- CA-07 QUANDO o manual fala de perfis ENTÃO DEVE dizer que o sistema não tem perfis nem cargos prontos, que toda conta nasce sem permissão e que as permissões são marcadas uma a uma na tela de Usuários. (RN-06)
- CA-08 QUANDO o manual mostra as combinações para estagiário, atendente e líder ENTÃO DEVE dizer que são apenas sugestões, que podem ser ajustadas, e DEVE usar exatamente as combinações de RN-07: estagiário só com "Ver agendamentos", atendente só com "Gerenciar agendamentos" e líder com as seis permissões listadas, sem "Gerenciar usuários" e sem "Ver sessões". (RN-07, RN-08)
- CA-09 QUANDO uma combinação sugerida é conferida na tela de Usuários ENTÃO toda permissão citada DEVE aparecer na tela para ser marcada. (RN-08)
- CA-10 QUANDO o manual explica Usuários ENTÃO DEVE explicar, em linguagem simples, as regras que bloqueiam ações na tela: ninguém altera a própria conta, só se concede o que se tem, só se redefine senha ou desativa contas cujas permissões você tem por completo, e a conta Admin não pode ser alterada nem ter a senha redefinida pelo painel. (RN-06, RN-04)
- CA-21 QUANDO o manual mostra a combinação do líder ENTÃO DEVE avisar, junto dela, que assim só a conta Admin gerencia contas e que quem cria a conta precisa ter todas as permissões que vai conceder. (RN-15)
- CA-22 QUANDO o capítulo de Permissões é lido ENTÃO DEVE haver, logo abaixo da tabela e fora dela, uma nota dizendo que a exportação de relatórios ainda não está disponível, e não DEVE haver nota sobre "Ver sessões". (RN-16, RN-05)

Capturas e dados

- CA-11 QUANDO qualquer captura é examinada ENTÃO não DEVE aparecer nome, CPF, telefone, e-mail, protocolo, token ou identificador real. Os e-mails DEVEM usar um domínio que não existe de verdade, e os CPFs DEVEM ser claramente fictícios. (RN-09)
- CA-12 QUANDO a captura da tela de WhatsApp é examinada ENTÃO os campos de identificação DEVEM ter valores inventados e nenhum token ou chave real DEVE estar salvo no painel local. (RN-09)
- CA-13 QUANDO as capturas são examinadas ENTÃO todas DEVEM estar em tamanho de computador, e nenhuma DEVE estar em tamanho de celular. (RN-10, RN-19)
- CA-23 QUANDO o capítulo de WhatsApp é lido ENTÃO DEVE apresentar a tela e apontar para o guia de configuração do bot, e não DEVE repetir o passo a passo da configuração. (RN-17)

Apêndice técnico

- CA-14 QUANDO a equipe técnica lê o apêndice ENTÃO ele DEVE explicar: que o painel não redefine a senha do Admin; que o procedimento roda no servidor, com o usuário de deploy, na pasta da instalação e num terminal interativo; que o script pede a senha nova duas vezes sem mostrá-la; que a senha precisa ter de 8 caracteres a 72 bytes; que o script descobre sozinho a versão em uso; que todas as sessões abertas do Admin são encerradas; que o e-mail do Admin não muda; e que a senha só foi trocada quando aparece "Senha do Admin redefinida". (RN-11)
- CA-15 QUANDO o script falha (senhas diferentes, senha curta ou longa demais, nenhuma versão registrada, falta de terminal interativo, falta de conta Admin) ENTÃO o apêndice DEVE dizer que nada foi alterado e o que fazer em cada caso, com as mensagens que o script mostra. (RN-11)
- CA-16 QUANDO o apêndice é lido ENTÃO DEVE trazer também a alternativa sem o script, a mesma da documentação de infraestrutura, e não DEVE ter endereço de servidor, IP, senha, token nem outro segredo. (RN-11)

Geração e índices

- CA-17 QUANDO o gerador roda só para o manual ENTÃO DEVE terminar sem erro e gravar o PDF ao lado do texto-fonte, e nenhum outro PDF da pasta DEVE mudar no commit. (RN-12)
- CA-18 QUANDO o índice geral da documentação é aberto ENTÃO a linha da pasta de guias DEVE citar e linkar o manual do painel junto dos dois PDFs que já estão lá. (RN-13)
- CA-19 QUANDO o índice dos guias é aberto ENTÃO a tabela DEVE ter a linha do manual do painel, com texto-fonte, PDF e pasta de imagens. (RN-13)
- CA-20 QUANDO os links e as figuras do texto-fonte são conferidos ENTÃO toda imagem citada DEVE existir na pasta de imagens do manual, toda imagem da pasta DEVE ser usada, as figuras DEVEM ter numeração seguida e todo link DEVE abrir. (RN-10, RN-12)
- CA-24 QUANDO o PDF é aberto ENTÃO a capa DEVE ter o título "Manual do painel" e o subtítulo "Como usar as telas do painel do ProconChat Jacareí". (RN-18)
- CA-25 QUANDO o PDF final é conferido ENTÃO DEVE ter no máximo 40 páginas, no máximo 35 capturas e no máximo 10 MB. (RN-20)
- CA-26 QUANDO os outros guias em PDF são gerados com o estilo alterado e comparados com a versão gerada antes da alteração ENTÃO a aparência deles NÃO DEVE mudar, e o gerador DEVE continuar sem alteração. (RN-12)
- CA-27 QUANDO o PDF é aberto num leitor ENTÃO não DEVE haver marcadores na barra lateral, e cada item do sumário no início DEVE levar, com um clique, ao capítulo correspondente. (RN-21)

## Critérios de sucesso

- Uma pessoa da equipe do PROCON, sem ajuda, consegue achar no manual o que cada tela faz e quais permissões marcar para uma conta nova.
- A designer (Nobara) e a QA (Maki) aprovam o PDF sem achado que bloqueia.
- O reviewer aprova sem achado que bloqueia e confirma que nenhum dado real aparece no PDF.

## Estrutura do manual

Índice proposto, por capítulo. Cada `#` vira uma página nova no PDF. A ordem dos capítulos de telas segue o menu do painel. Os nomes e as seções finais dependem do levantamento (T1).

| Capítulo | Conteúdo |
|---|---|
| Capa | Título "Manual do painel", subtítulo "Como usar as telas do painel do ProconChat Jacareí", versão 1.0 (RN-18) |
| Antes de começar | Para quem é o manual; como o painel está organizado (menu em Operação, Chatbot e Configurações); por que cada pessoa vê um menu diferente; o padrão de "Salvar alterações", "Descartar" e "N alterações não salvas"; quadro de palavras |
| 1. Entrar e Minha conta | Entrar, bloqueio depois de várias tentativas, conta sem nenhuma tela disponível, Alterar minha senha, Sair. Não existe "Esqueci minha senha": a quem pedir |
| 2. Agendamentos | Lista, busca, filtros, situações de um agendamento, "Aguardando registro", Assumir, calendário semanal |
| 3. Detalhe do agendamento | Dados, documentos enviados, linha do tempo, histórico, ações (assumir, atribuir, marcar como atendido ou não compareceu, corrigir registro, cancelar, observações internas). Link para a sessão: ainda não disponível |
| 4. Relatórios | Período, indicadores e seções que existem hoje. Gráficos extras e exportação: ainda não disponíveis |
| 5. Conteúdo do chatbot | Categorias e perguntas, ativar e desativar, ordem, busca, páginas no WhatsApp, "Ver como o cidadão recebe", aviso fixo |
| 6. Horários de atendimento | Grade, duração, vagas, janela, antecedência, datas bloqueadas, mudanças agendadas, dados da unidade, lembrete. O que acontece com agendamentos afetados e bloqueio de parte do dia: descrever só o que existe hoje (ver T1) |
| 7. Documentos | As duas listas, limites e quando a mudança passa a valer |
| 8. Usuários | Criar conta, marcar permissões, redefinir senha, desativar e reativar, agendamentos futuros de quem é desativado, regras de segurança |
| 9. WhatsApp | Só a conta Admin vê. O que a tela mostra e para que serve cada parte. O passo a passo da configuração não é repetido: o capítulo aponta para o guia de configuração do bot (RN-17) |
| 10. Permissões | Tabela idêntica à da decisão 004 (a única tabela do capítulo); logo abaixo, fora da tabela, a nota de que a exportação de relatórios ainda não está disponível (RN-16); aviso de que não existem perfis |
| 11. Sugestões de combinações | Estagiário, atendente e líder, como sugestões (RN-07), com o aviso sobre a combinação do líder (RN-15) |
| Apêndice A. Redefinir a senha do Admin no servidor | Só para a equipe técnica (RN-11, CA-14 a CA-16) |

## Fora do escopo

- Telas de Sessões e Dashboard: não estão prontas (decisão do usuário).
- Corrigir as regras das telas, as decisões, o protótipo ou a memória do time quando divergem do painel: as divergências só são anotadas (RN-14).
- Mudar o gerador (`gerar-pdf.mjs` e `gerar-pdfs.sh`), a capa ou as fontes dos guias. A única mudança de estilo permitida é o bloco restrito ao manual de RN-12 (D-U-10).
- Marcadores (outline) no PDF: exigiriam mudar o gerador compartilhado, e o usuário recusou (D-U-11).
- Mudar os outros dois guias em PDF ou gerar de novo os PDFs deles.
- Criar carga de dados fictícios no repositório (seed, script ou arquivo versionado): os dados fictícios são criados por SQL no banco local de quem tira as capturas, e o script fica fora do repositório (D-U-06).
- Capturas em tamanho de celular (D-U-07).
- Passo a passo de configuração do WhatsApp na Meta: já está no guia de configuração do bot.
- Versão em inglês ou outro formato além de Markdown e PDF.

## Plano de execução

Typecheck, lint e suíte de testes: esta tarefa não muda código, então eles não são afetados e não entram nos gates. Os gates são o gerador do PDF (que já para se uma imagem citada não existir), a comparação mecânica da tabela de permissões e a conferência de links e figuras.

- Fase 1 (paralelo): T1 [P], T2 [P], T4 [P] (o título do manual já está fixado em RN-18)
  - Gate de fase: levantamento por tela entregue com a lista de pendências e divergências; painel local no ar em `http://127.0.0.1:8081` com as contas e os dados fictícios combinados; índices atualizados.
- Fase 2: T3
  - Gate de fase: todas as capturas de RN-02 na pasta de imagens, em tamanho de computador e no máximo 35.
- Fase 3 (sequencial): T5 → T6 (rascunho com capturas)
  - Gate de fase: `.docs/guias/gerar-pdfs.sh manual-do-painel` sem erro; `git status --short` mostra só o manual, o PDF dele, as imagens dele, os dois README e, se houver, `.docs/guias/estilo/guia.css` e `.docs/guias/estilo/README.md` (RN-12).
- Fase 4 (paralelo): T7 [P], T8 [P], T9 [P], T10 [P], T11 [P]
  - Começa com o rascunho com capturas. A revisão da Nobara (T10) e a da Maki (T11) começam já com ele, enquanto o dev-doc escreve o apêndice (T7). Revisores só leem; quem altera o Markdown é só o dev-doc, em sequência: primeiro o apêndice, depois as correções dos achados.
  - Gate de fase: tabela idêntica, links e figuras sem erro, revisões sem achado que bloqueia em aberto, e T6 rodada de novo para a versão final.
- Fase 5: T12
  - Gate de fase: gerador sem erro, comparação da tabela sem diferença, PDF dentro dos limites de RN-20 e reviewer sem achado que bloqueia.

Ambiente do gerador: Node.js 20 ou mais novo e Chrome ou Chromium (ou `CHROME_PATH`). Na primeira execução o `npx` baixa o `marked` e precisa de internet. Rodar sempre com o nome do manual: sem argumento, o gerador refaz todos os PDFs da pasta com a data de hoje na capa, e eles não devem entrar no commit.

## Tarefas

### T1 [P] Levantar o conteúdo por tela

- **O quê:** levantar, tela por tela de RN-02, o que o painel faz hoje: textos exatos de botões, campos, filtros e mensagens; o que cada permissão libera na tela; o que está "ainda não disponível"; e as divergências entre as fontes e o código.
- **Onde:** leitura de `.docs/regras/` (01, 03, 04, 05, 06, 08, 09, 10, 11 e 00), `.docs/decisoes/` (002, 004, 005, 006, 007, 008, 012), `src/frontend/src/pages/`, `src/frontend/src/locales/pt-BR/*.json`, `src/frontend/src/navigation/` e `.docs/prototipo/`. O resultado (pendências e divergências por tela) é registrado no campo Status desta tarefa, nesta especificação, para o T5, a QA e o reviewer consultarem.
- **Dev:** dev-doc
- **Depende de:** nada
- **Reaproveita:** as regras das telas, os textos do painel em `locales/pt-BR` e a memória do time (`.claude/team-memory/`).
- **Atende:** RN-02, RN-04, RN-14, CA-04, CA-05
- **Pronto quando:** existe, para cada tela, a lista do que descrever, a lista de pendências e a lista de divergências. Devem estar conferidas ao menos estas: (a) a regra de Login diz que o menu mostra só Agendamentos, Usuários e WhatsApp, mas o painel tem sete telas prontas (`navItemsReady.ts`); (b) a memória do time diz que Horários não deixa salvar quando há agendamentos afetados, mas os textos de Horários têm mensagens de conflito: confirmar o que a tela faz hoje; (c) a descrição de "Ver relatórios" na tela de Usuários fala em exportar em PDF, Excel ou CSV, e a tela de Relatórios não tem exportação; (d) "Ver sessões" não aparece na tela de Usuários (`readyPermissionKeys.ts`, `NAV_ITEMS_READY.sessions: false`).
- **Teste:** nenhum (documentação).
- **Gate:** não se aplica typecheck, lint nem suíte (sem mudança de código). Conferência: cada item da lista aponta a fonte no código ou na documentação.
- **Modelo:** padrao
- **Status:** concluída em 2026-11-21. Fonte principal: textos de `src/frontend/src/locales/pt-BR/*.json` (valem como o texto exato da tela), conferidos com `.docs/regras/` e `navigation/`. Resultado por tela:
  - Entrar e Minha conta: campos E-mail e Senha, botão Entrar; erros "E-mail ou senha incorretos." e "Muitas tentativas sem sucesso. Aguarde alguns minutos e tente de novo."; menu Minha conta com "Alterar minha senha" (Senha atual, Nova senha, Confirmar senha, Salvar senha; 8 a 72 caracteres) e "Sair"; conta sem tela vê "Sua conta ainda não tem acesso a nenhuma tela" e "Voltar para o login". Não existe "Esqueci minha senha".
  - Agendamentos: abas Lista e Calendário semanal; busca por nome do titular, protocolo ou CPF completo; chips Todos, Pendentes, Confirmados, Atendidos, Não compareceu, Cancelados, Aguardando registro; filtros Período e Responsável; botão Assumir na linha; ordenação e paginação.
  - Detalhe: Dados do agendamento, Documentos solicitados pelo chatbot, Linha do tempo da conversa de origem, Histórico, Ações (Assumir para mim, Marcar como atendido, Marcar como não compareceu, Corrigir registro, Atribuir a outro funcionário, Cancelar agendamento), Observações internas. Cancelar pede motivo (Unidade fechada nesta data, A pedido do cidadão, Agendamento duplicado, Outro motivo).
  - Relatórios: Período (Últimos 7, 30 e 90 dias, Mês atual, Mês anterior, Personalizado), Conversas no período, Desfecho das conversas, Categorias mais usadas, Perguntas mais usadas, Resultado dos agendamentos (Taxa de não comparecimento).
  - Conteúdo: Categorias e Perguntas em duas caixas; Nova categoria, Nova pergunta, Editar, Ativar/Desativar, setas de ordem, busca, "Página N no WhatsApp", "Ver como o cidadão recebe", Salvar alterações e Descartar; aviso fixo.
  - Horários: Grade semanal, Duração de cada atendimento, Vagas simultâneas por horário, Janela de agendamento, Antecedência mínima, Alertar quando a espera passar de, Dados da unidade, Lembrete ao cidadão, Datas bloqueadas (só "Bloquear um dia inteiro"), Mudanças agendadas, Prévia da grade.
  - Documentos: duas listas (titular e representante), Adicionar, Editar, Remover, mover, prévia da mensagem de confirmação; a mudança vale só para os próximos agendamentos.
  - Usuários: Criar conta, lista de contas, marcar permissões, Redefinir senha, Desativar conta, Reativar conta, janela de agendamentos futuros, Salvar alterações.
  - WhatsApp: abas Conexão e Privacidade; só o Admin. Conexão: número, situação, Pausar respostas automáticas, Estado do número, modelos de mensagem, falhas de entrega, Avisos ao cidadão, Credenciais, Histórico de alterações. Privacidade: dados do controlador e anonimização automática.
  Ainda não disponível (confirmado nos textos e em `.docs/regras/`): link e código da sessão no Detalhe (#72); itens extras e exportação em Relatórios (#73); janela de conflitos "Manter os agendamentos / Cancelar e avisar" em Horários (#75); bloqueio de apenas um período do dia em Horários (#77), a tela só cria bloqueio de dia inteiro. Hoje, em Horários, a tela NÃO deixa salvar uma mudança que afete agendamentos e mostra a lista "Esta alteração afeta N agendamentos", pedindo para cancelar ou remarcar antes.
  Divergências (a anotar para o reviewer, sem corrigir): (a) `regras/01` diz que o menu mostra só Agendamentos, Usuários e WhatsApp, e o painel tem sete telas prontas (`navItemsReady.ts`: Agendamentos, Relatórios, Conteúdo, Horários, Documentos, Usuários e WhatsApp); (b) a memória do time e `regras/08` batem com a tela (não salva com agendamentos afetados), sem divergência; a divergência é só que as regras citam a janela da #75 como futura; (c) a descrição de "Ver relatórios" na tela de Usuários fala em exportar em PDF, Excel ou CSV, e Relatórios não tem exportação; (d) "Ver sessões" não aparece na tela de Usuários (`NAV_ITEMS_READY.sessions: false`); (e) `regras/01` fala em um item "Dashboard" e "Sessões" no menu, que não aparecem hoje; (f) a tela de Horários (Figura 17) mostra o texto "O Dashboard avisa quando o próximo horário livre estiver além deste prazo.", e o Dashboard não está pronto (RN-14); o manual diz na legenda que esse aviso ainda não está disponível.

### T2 [P] Subir o painel local com dados fictícios

- **O quê:** subir o sistema inteiro na worktree e preparar os dados fictícios necessários para as capturas.
- **Onde:** worktree `/home/felipe/faculdade/ProconChat_Jacarei-worktrees/docs-119-manual-pdf-telas-do-painel`, arquivo `.env` local (não versionado) e banco local do Compose.
- **Dev:** dev-doc
- **Depende de:** nada
- **Reaproveita:** `compose.yaml`, o seed (conteúdo do FAQ, configuração inicial de horários e documentos e a conta Admin), a tela de Usuários para criar as contas e o banco local do Compose para os agendamentos e as conversas.
- **Atende:** RN-09, CA-11, CA-12
- **Pronto quando:**
  1. `.env` local com `ENCRYPTION_KEY` gerada por `openssl rand -hex 32`, sem `WHATSAPP_*` reais (vazios ou inventados).
  2. `docker compose up --build` no ar, com o painel em `http://127.0.0.1:8081` e a entrada com a conta Admin local (`admin@procon.local` e a senha padrão de desenvolvimento do `compose.yaml`, que não aparece no manual nem nas capturas).
  3. Contas de funcionários criadas pela tela de Usuários, com nomes inventados e e-mails num domínio que não existe (por exemplo `@exemplo.invalid`), cobrindo as combinações de RN-07 (estagiário, atendente e líder) e uma conta inativa.
  4. Agendamentos e conversas fictícios em quantidade que mostre a lista, o calendário, o Detalhe em cada situação (Pendente, Confirmado, Atendido, Não compareceu, Cancelado, Aguardando registro) e os Relatórios com números. Como o seed não cria agendamentos nem conversas, eles são inseridos por SQL direto no banco local do Compose, inclusive as situações que dependem do tempo (D-U-06). O script SQL fica fora do repositório (por exemplo no scratchpad da sessão) e nunca é commitado.
  5. Na tela de WhatsApp, só identificadores inventados; nenhum token ou chave real salvo.
  6. Nenhum arquivo do repositório alterado pela T2 (`git status --short` sem nada além do `.env`, que já é ignorado, e dos dois README da T4, que roda ao mesmo tempo).
- **Teste:** nenhum (documentação).
- **Gate:** não se aplica typecheck, lint nem suíte. Conferência: `docker compose ps` com `backend` saudável e `frontend` no ar; entrada no painel com a Admin local; `git status --short` sem arquivo alterado pela T2 (os dois README da T4 podem aparecer).
- **Modelo:** padrao
- **Status:** concluída em 2026-11-21. Evidência: sistema no ar na worktree pelo Compose com nome de projeto `docs119` e portas próprias (painel em `http://localhost:8119`, API em 3119, banco em 5519), porque 3000, 5173 e 5433 já estavam em uso por outros ambientes; backend saudável e entrada com a conta Admin local confirmada. Contas fictícias criadas pela API de Usuários (e-mails `@exemplo.invalid`): estagiário (Rafael Nogueira, só Ver agendamentos), atendente (Marina Teixeira, só Gerenciar agendamentos), líder (Helena Prado, seis permissões, sem Gerenciar usuários), uma conta inativa (Paulo Mendes) e uma sem permissões (Carolina Vieira). 20 agendamentos fictícios cobrindo Pendente, Confirmado, Atendido, Não compareceu, Cancelado e Aguardando registro, com 60 conversas fictícias para os Relatórios, inseridos por SQL no banco local; o script ficou fora do repositório. Na tela de WhatsApp, o ID do número, o ID da conta, o token de verificação e o número exibido foram trocados por valores inventados, e o token e o App Secret guardados são texto sem valor; a URL do webhook usa um domínio inexistente (`painel.exemplo.invalid`). Os dois quadros de status da Meta (modelos e qualidade do número) foram simulados no navegador, com dados fictícios, só para a captura. `git status --short` sem arquivo alterado pela T2.

### T3 Tirar as capturas

- **O quê:** tirar as capturas de todas as telas de RN-02 no painel local, só em tamanho de computador, com contas que mostrem o menu de cada combinação sugerida.
- **Onde:** `.docs/guias/images/manual-do-painel/`, com nomes numerados na ordem do manual (por exemplo `01-entrar.png`, `02-minha-conta.png`).
- **Dev:** dev-doc
- **Depende de:** T2; T1 para saber o que capturar.
- **Reaproveita:** o padrão de nomes e o tamanho das capturas de `.docs/guias/images/configuracao-do-bot/`.
- **Atende:** RN-09, RN-10, RN-19, RN-20, CA-01, CA-11, CA-12, CA-13, CA-25
- **Pronto quando:** existe ao menos uma captura por tela de RN-02, todas em tamanho de computador e no máximo 35 no total; cada imagem foi conferida a olho contra CA-11; nenhuma captura mostra a barra de endereço com dados da máquina, a senha da Admin local nem o menu de Sessões ou Dashboard.
- **Teste:** nenhum (documentação).
- **Gate:** não se aplica typecheck, lint nem suíte. Conferência: a lista de arquivos da pasta bate com a lista de capturas planejada na T1.
- **Modelo:** padrao
- **Status:** concluída em 2026-11-21. Evidência: 28 figuras em `.docs/guias/images/manual-do-painel/` (máximo de 35), refeitas em 2026-11-21 depois da revisão de diagramação: cada captura mostra o elemento inteiro da tela, em tamanho de computador (1280 pixels de largura da janela) e com o dobro de resolução, numeradas na ordem do manual, uma ou mais por tela de RN-02; quatro delas juntam duas ou três imagens. Cada imagem foi conferida a olho contra CA-11: só nomes inventados, CPFs mascarados com dígitos fictícios, e-mails `@exemplo.invalid` (mais a conta Admin local `admin@procon.local`), sem barra de endereço, sem senha e sem os menus de Sessões e Dashboard. Os menus que aparecem são os de cada combinação sugerida (Figura 28). Os valores do WhatsApp são inventados e os painéis da Meta foram simulados só para a captura.
- **Commit:** `Docs :bulb: [#119] Adiciona as capturas do manual do painel`

### T4 [P] Indexar o manual nos dois README

- **O quê:** citar o manual do painel na linha da pasta de guias do índice geral e acrescentar a linha dele na tabela do índice dos guias.
- **Onde:** `.docs/README.md` (linha da pasta `guias/`) e `.docs/guias/README.md` (tabela de guias).
- **Dev:** dev-doc
- **Depende de:** nada (o título está fixado em RN-18). Não edita o mesmo arquivo que T1, T2, T3, T5 e T6.
- **Reaproveita:** o formato das linhas dos dois guias que já existem.
- **Atende:** RN-13, CA-18, CA-19
- **Pronto quando:** as duas linhas apontam para `guias/manual-do-painel.pdf`, `manual-do-painel.md` e `images/manual-do-painel/`, e o exemplo de geração do índice dos guias não muda.
- **Teste:** nenhum (documentação).
- **Gate:** não se aplica typecheck, lint nem suíte. Conferência: os links novos abrem depois da T6.
- **Modelo:** economico
- **Status:** concluída em 2026-11-21. Evidência: linha da pasta `guias/` em `.docs/README.md` e linha nova na tabela de `.docs/guias/README.md` apontam para `manual-do-painel.md`, `manual-do-painel.pdf` e `images/manual-do-painel/`; o exemplo de geração não mudou. Os links passam a abrir depois da T6.
- **Commit:** `Docs :bulb: [#119] Indexa o manual do painel nos índices da documentação`

### T5 Escrever o Markdown do manual

- **O quê:** escrever o texto-fonte do manual com todos os capítulos da Estrutura, as capturas com legenda e a tabela de permissões copiada da decisão 004.
- **Onde:** `.docs/guias/manual-do-painel.md`
- **Dev:** dev-doc
- **Depende de:** T1, T3.
- **Reaproveita:** o front matter (`titulo:`, `subtitulo:`, `versao:`), as marcações `> **Atenção:**` e `> **Dica:**`, as figuras com legenda em itálico e o quadro de palavras do guia de configuração do bot; a marcação descrita em `.docs/guias/estilo/README.md`.
- **Atende:** RN-01 a RN-08, RN-10, RN-14 a RN-18, CA-01 a CA-10, CA-13, CA-21 a CA-24
- **Pronto quando:** o front matter tem `titulo: Manual do painel` e `subtitulo: Como usar as telas do painel do ProconChat Jacareí`; todos os capítulos de telas, Permissões e Sugestões estão escritos; a tabela de permissões foi colada da decisão 004 sem nenhuma edição, inclusive a linha separadora no formato `|---|---|` (diferente do `| --- | --- |` dos outros guias), só sem o recuo; ela é a única tabela do capítulo de Permissões e tem logo abaixo, fora dela, a nota de que a exportação de relatórios ainda não está disponível (sem nota sobre "Ver sessões"); as sugestões dizem que são só sugestões e usam exatamente as combinações de RN-07, com o aviso de RN-15 junto da do líder; o capítulo de WhatsApp aponta para o guia de configuração do bot sem repetir o passo a passo; nenhum capítulo tem caminho, comando ou termo técnico.
- **Teste:** nenhum (documentação).
- **Gate:** não se aplica typecheck, lint nem suíte. Conferência: `.docs/guias/gerar-pdfs.sh manual-do-painel` sem erro.
- **Modelo:** padrao
- **Status:** concluída em 2026-11-21 (rascunho, sem o apêndice, que é da T7). Evidência: `.docs/guias/manual-do-painel.md` com o front matter pedido, o capítulo Antes de começar (com o quadro de palavras), os capítulos 1 a 9 das telas, 10 Permissões e 11 Sugestões de combinações, e 28 figuras numeradas de 1 a 28 em sequência. Comparação mecânica da tabela de permissões com a decisão 004 sem diferença; a nota sobre a exportação de relatórios fica logo abaixo da tabela; a lista de imagens citadas é igual à da pasta. As capturas foram recortadas e reagrupadas para o PDF caber no limite de páginas, e a de Detalhe atendido foi retirada.
- **Commit:** `Docs :bulb: [#119] Escreve o manual das telas do painel`

### T6 Gerar o PDF

- **O quê:** gerar o PDF do manual: primeiro o rascunho com capturas, logo depois da T5, para abrir as revisões; depois a versão final, ao fim das correções das revisões e do apêndice.
- **Onde:** `.docs/guias/manual-do-painel.pdf`
- **Dev:** dev-doc
- **Depende de:** T5 (rascunho); T7 e as correções dos achados de T8, T9, T10 e T11 (versão final).
- **Reaproveita:** `.docs/guias/gerar-pdfs.sh` e `.docs/guias/gerar-pdf.mjs`, sem alterá-los, e `.docs/guias/estilo/`, que só pode ganhar o bloco restrito ao manual de RN-12.
- **Atende:** RN-12, RN-18, RN-20, RN-21, CA-17, CA-24, CA-25, CA-27
- **Pronto quando:** o PDF foi gerado só para o manual, abre com capa, sumário clicável, capítulos e capturas, não tem marcadores, tem no máximo 40 páginas e 10 MB, e nenhum outro PDF da pasta mudou.
- **Teste:** nenhum (documentação).
- **Gate:** não se aplica typecheck, lint nem suíte. Conferência: `.docs/guias/gerar-pdfs.sh manual-do-painel` sem erro, `ls -l .docs/guias/manual-do-painel.pdf` com até 10 MB, número de páginas conferido no leitor de PDF e `git status --short` sem `guia-configuracao-do-bot.pdf` nem `documento-do-software.pdf`.
- **Modelo:** economico
- **Status:** versão final gerada em 2026-11-21, depois das revisões e das correções finais. Evidência: `.docs/guias/gerar-pdfs.sh manual-do-painel` sem erro, 38 páginas (limite de 40), 28 figuras (limite de 35), cerca de 4,7 MB (limite de 10 MB), com capa, sumário clicável e nenhum outro PDF da pasta alterado. O bloco de CSS restrito ao manual e a nota no `.docs/guias/estilo/README.md` foram feitos no commit `a011bb5`, sem tarefa própria, e depois ampliados em `727557d`; `gerar-pdf.mjs` e `gerar-pdfs.sh` não mudaram. CA-26: os outros dois guias (`guia-configuracao-do-bot`, 25 páginas, e `documento-do-software`, 19 páginas) foram gerados em cópia fora do repositório com o estilo novo e com o estilo anterior, e as páginas renderizadas são idênticas, página a página. CA-27: o PDF não tem marcadores (RN-21), e os 49 itens do sumário levam, cada um, à página certa; conferido lendo os destinos de link do próprio PDF e comparando com os números do sumário, sem nenhum erro. O sumário foi corrigido para pôr o `id` no próprio título (antes, 18 links caíam no pé da página anterior).
- **Commit:** `Docs :bulb: [#119] Gera o PDF do manual do painel` (e, na versão final, `Docs :bulb: [#119] Atualiza o PDF do manual do painel após as revisões`)

### T7 [P] Escrever o apêndice técnico

- **O quê:** escrever o Apêndice A (redefinir a senha do Admin no servidor) no fim do Markdown do manual.
- **Onde:** `.docs/guias/manual-do-painel.md`, só a seção do apêndice, depois do último capítulo. É o único trabalho de escrita no arquivo nesta fase; as correções das revisões são feitas pelo mesmo dev-doc, em sequência.
- **Dev:** dev-doc
- **Depende de:** T5
- **Reaproveita:** `deploy/reset-admin-password.sh`, a seção "Redefinir a senha do Admin" de `.docs/infra/deploy.md` e a seção "Conta Admin e redefinição da senha" de `src/backend/README.md`. Conferido nessas fontes: o script roda em `/opt/proconchat` como o usuário `deploy`, exige terminal interativo, lê a versão em uso do `releases.log` (ou de `IMAGE_TAG`), pede a senha duas vezes sem mostrá-la, confere de 8 caracteres a 72 bytes antes de chamar o Docker, roda `docker compose -f compose.prod.yaml run --rm seed node dist/db/scripts/resetAdminPassword.js` com `ROOT_PASSWORD` só nesse comando, encerra todas as sessões do Admin, não muda o e-mail e só dá certo quando aparece "Senha do Admin redefinida". Sem conta Admin, sai com erro e pede para rodar o seed.
- **Atende:** RN-11, CA-14, CA-15, CA-16
- **Pronto quando:** o apêndice cobre CA-14 a CA-16 com as mensagens do script copiadas dele; tem a alternativa manual da documentação de infraestrutura; não tem endereço, IP nem segredo; o capítulo deixa claro, no início, que é só para a equipe técnica.
- **Teste:** nenhum (documentação).
- **Gate:** não se aplica typecheck, lint nem suíte. Conferência: `.docs/guias/gerar-pdfs.sh manual-do-painel` sem erro e cada mensagem citada existe, com o mesmo texto, em `deploy/reset-admin-password.sh`.
- **Modelo:** padrao
- **Status:** concluída em 2026-11-21. Evidência: Apêndice A no fim de `.docs/guias/manual-do-painel.md`, aberto com o aviso de que é só para a equipe técnica; cobre CA-14 a CA-16 (painel não redefine; usuário `deploy`, pasta da instalação e terminal interativo; senha pedida duas vezes sem aparecer; 8 caracteres a 72 bytes; versão em uso descoberta sozinha; sessões do Admin encerradas; e-mail não muda; troca confirmada só por "Senha do Admin redefinida"), tabela de falhas e alternativa sem o script. As 9 mensagens do script citadas existem com o mesmo texto em `deploy/reset-admin-password.sh` (e a do backend em `resetAdminPassword.ts`). Sem endereço de servidor, IP nem segredo. Página de teste gerada fora do repositório: 39 páginas (limite de 40), então as correções das revisões precisam compensar qualquer página nova. O PDF do repositório não foi regerado.
- **Commit:** `Docs :bulb: [#119] Adiciona o apêndice de redefinição da senha do Admin`

### T8 [P] Conferir a tabela de permissões contra a decisão 004

- **O quê:** comparar de forma mecânica a tabela de permissões do manual com a da decisão 004.
- **Onde:** leitura de `.docs/guias/manual-do-painel.md` e `.docs/decisoes/004-contas-e-permissoes-granulares.md`.
- **Dev:** qa Maki
- **Depende de:** T5
- **Reaproveita:** nada.
- **Atende:** RN-05, CA-06
- **Pronto quando:** extrair só as linhas da tabela dos dois arquivos, tirar o recuo da decisão e comparar com `diff`, sem nenhuma diferença, inclusive na linha separadora. O capítulo de Permissões só tem essa tabela. Exemplo de comparação:

  ```bash
  diff <(grep -E '^\s*\|' .docs/decisoes/004-contas-e-permissoes-granulares.md | sed -E 's/^\s+//') <(awk '/^# 10\. Permissões/,/^# 11\./' .docs/guias/manual-do-painel.md | grep -E '^\|')
  ```

- **Teste:** nenhum (documentação).
- **Gate:** o `diff` acima (ajustado ao título final do capítulo) sem saída.
- **Modelo:** economico
- **Status:** concluída em 2026-11-21, pela Maki (registrado pelo dev-doc a pedido da orchestrator). Evidência: a comparação com `diff` entre a tabela da decisão 004 e a do capítulo 10 do manual não mostrou nenhuma diferença, inclusive na linha separadora.

### T9 [P] Conferir links e figuras

- **O quê:** conferir que toda imagem citada existe, toda imagem da pasta é usada, a numeração das figuras é seguida e todos os links abrem, inclusive os dos dois README.
- **Onde:** leitura de `.docs/guias/manual-do-painel.md`, `.docs/guias/images/manual-do-painel/`, `.docs/README.md` e `.docs/guias/README.md`.
- **Dev:** qa Maki
- **Depende de:** T4, T6 (rascunho)
- **Reaproveita:** a checagem de imagem ausente que o gerador já faz.
- **Atende:** RN-10, RN-13, RN-20, CA-18, CA-19, CA-20, CA-25
- **Pronto quando:** a lista de imagens citadas no Markdown é igual à lista de arquivos da pasta, com no máximo 35 imagens; as legendas vão de "Figura 1" em diante sem pular número; os links dos README e do manual apontam para arquivos que existem.
- **Teste:** nenhum (documentação).
- **Gate:** comparação das duas listas sem diferença e gerador sem erro.
- **Modelo:** economico
- **Status:** concluída em 2026-11-21, pela Maki (registrado pelo dev-doc a pedido da orchestrator). Evidência: a lista de imagens citadas no Markdown é igual à da pasta, as legendas seguem de Figura 1 em diante sem pular número, e os links dos dois README e do manual apontam para arquivos que existem.

### T10 [P] Revisão visual da designer

- **O quê:** revisar o PDF: legibilidade das capturas, recortes, tamanho, quebras de página, tabelas e coerência com o guia de configuração do bot.
- **Onde:** `.docs/guias/manual-do-painel.pdf` e as imagens; comparação com o painel local e com o protótipo.
- **Dev:** designer Nobara
- **Depende de:** rascunho com capturas gerado em PDF (T6, primeira geração).
- **Reaproveita:** o guia de configuração do bot como referência de estilo.
- **Atende:** RN-10, RN-12, RN-18, RN-19, RN-20, CA-01, CA-13, CA-24, CA-25
- **Pronto quando:** a lista de achados, cada um classificado como "bloqueia" ou "sugestão", foi entregue ao dev-doc, e os que bloqueiam foram corrigidos e conferidos de novo.
- **Teste:** nenhum (documentação).
- **Gate:** nenhum achado que bloqueia em aberto.
- **Modelo:** padrao
- **Status:** revisão feita em 2026-11-21 pela Nobara (registrado pelo dev-doc a pedido da orchestrator). Primeira rodada, achados que bloqueavam: falta de sumário, páginas quase vazias, capturas cortadas no meio do conteúdo (Figuras 4, 7, 8, 9, 11, 13, 15, 16, 17, 19, 20, 24, 25, 26 e 27) e a Figura 3 com a janela cortada e fundo de outra tela. Resolvido: sumário com links, 28 figuras refeitas com o elemento inteiro a 1280 pixels e o dobro de resolução, Figura 3 com a janela completa e fundo limpo, tamanho das figuras só para o manual, capa com versão e data maiores. Segunda rodada, bloqueios: a tabela do glossário vazava duas linhas para a página 5, e a página 26 ficava quase vazia. Corrigido: o glossário cabe nas páginas 3 e 4, e os capítulos Documentos e Usuários passam a começar na sequência da página anterior, sem página quase vazia. Sugestões aplicadas: Figuras 4, 5 e 6 a 90%, Figura 14 menor com "(a janela continua abaixo)" na legenda, Figura 6 terminando em linha completa do calendário, Figura 3 com o nome e o e-mail da conta inteiros. A nova conferência da designer sobre o PDF final ainda não está registrada.

### T11 [P] Revisão de QA

- **O quê:** ler o manual como alguém do PROCON e conferir cada passo no painel local: textos exatos, permissões das combinações, pendências marcadas, linguagem simples e ausência de dados reais.
- **Onde:** `.docs/guias/manual-do-painel.pdf` e o painel local da T2.
- **Dev:** qa Maki
- **Depende de:** rascunho com capturas gerado em PDF (T6, primeira geração). O apêndice é conferido quando a T7 terminar.
- **Reaproveita:** as contas fictícias da T2.
- **Atende:** RN-01 a RN-09, RN-11, RN-15 a RN-17, CA-02 a CA-05, CA-07 a CA-12, CA-14 a CA-16, CA-21 a CA-23
- **Pronto quando:** cada critério citado foi conferido (CA-03 não vale para o apêndice técnico), os achados foram entregues classificados como "bloqueia" ou "sugestão", e os que bloqueiam foram corrigidos e conferidos de novo.
- **Teste:** nenhum (documentação).
- **Gate:** nenhum achado que bloqueia em aberto.
- **Modelo:** padrao
- **Status:** revisão feita em 2026-11-21 pela Maki (registrado pelo dev-doc a pedido da orchestrator). Os critérios de T11 foram conferidos no painel local e o apêndice bate com as telas e com o script. Sem achado que bloqueia. Sugestões e tratamento: S1 aplicada (valores de exemplo nas legendas das Figuras 24 a 26 e nota sobre a mensagem da Meta); S2 aplicada na recaptura da Figura 22 (e-mail `@exemplo.invalid`); S3 aplicada (legenda da Figura 17 e frase sobre a exportação perto da Figura 21); S4 aplicada, e os dois avisos de função ainda indisponível foram recolocados com redação neutra por decisão da orchestrator; S5 aplicada (frase de "Esqueci minha senha" com remissão ao Apêndice A); S6 aplicada nos Documentos (o botão × (Remover)); em Horários o botão de bloqueio se chama Remover na tela e ficou como estava; S7 aplicada (WhatsApp na lista das telas com Salvar alterações e confirmações descritas conforme o código); S8 conferida no código (`markAttended` e `markNoShow` assumem o agendamento Pendente), a frase do manual está certa e não mudou. Não verificáveis ao vivo pela Maki: a trava de login "Muitas tentativas…" (o texto existe na tela); o bloqueio de uma conta com "Gerenciar usuários" parcial (regras 2 e 3 de segurança); o Admin ser intocável por outra conta (ela só viu a tela do Admin logada como Admin); o efeito de ligar o aviso de cancelamento por WhatsApp, o lembrete e a anonimização automática (conferiu só os textos); e o manual diz que o guia de WhatsApp "acompanha este manual" sem citar onde ele fica.

### T12 Revisão do reviewer

- **O quê:** revisar a entrega inteira contra as regras e os critérios desta especificação e os padrões do projeto (commits, segurança, nenhum dado real ou segredo).
- **Onde:** os arquivos alterados na branch.
- **Dev:** reviewer
- **Depende de:** T6 (versão final), T8, T9, T10, T11
- **Reaproveita:** o resultado das conferências T8 e T9 e a lista de divergências registrada na T1.
- **Atende:** todos os RN e CA
- **Pronto quando:** sem achado que bloqueia; o PR só altera o manual, o PDF dele, as imagens dele, os dois README, esta especificação e, no máximo, `.docs/guias/estilo/guia.css` e `.docs/guias/estilo/README.md`; no `guia.css`, a mudança é um único bloco no fim, com todas as regras restritas por `body:has(#sumario)`, e o `README.md` do estilo ganhou a nota sobre esse bloco; `gerar-pdf.mjs` e `gerar-pdfs.sh` não mudaram; os outros dois guias, gerados fora do commit com o estilo novo, têm a mesma aparência da versão gerada antes da mudança (CA-26); o PDF do manual não tem marcadores (CA-27).
- **Teste:** nenhum (documentação).
- **Gate:** gerador sem erro, comparação da tabela sem diferença, `git diff --stat develop...HEAD` só com os arquivos citados e `git diff develop...HEAD -- .docs/guias/gerar-pdf.mjs .docs/guias/gerar-pdfs.sh` sem saída.
- **Modelo:** padrao
- **Status:** pendente

## Dúvidas

### Para o product-owner

Nenhuma.

### Para o usuário

Nenhuma.

### Respostas do usuário

Respondidas em 2026-11-21, com a aprovação da especificação.

- D-U-01 Combinação do estagiário: só "Ver agendamentos" (RN-07).
- D-U-02 Combinação do atendente: só "Gerenciar agendamentos". "Ver sessões" não entra, porque hoje não pode ser concedida (RN-07, RN-08).
- D-U-03 Combinação do líder: todas as permissões, menos "Gerenciar usuários" (RN-07). O manual avisa que, assim, só a conta Admin gerencia contas, e que quem cria a conta precisa ter as permissões que vai conceder (RN-15).
- D-U-04 Entra uma nota abaixo da tabela de permissões dizendo que a exportação de relatórios ainda não está disponível. A tabela fica idêntica à da decisão 004 (RN-16).
- D-U-05 O capítulo de WhatsApp só apresenta a tela e aponta para o guia de configuração do bot (RN-17).
- D-U-06 Os dados fictícios das capturas são criados por SQL no banco local, e o script fica fora do repositório (T2, Fora do escopo).
- D-U-07 Capturas só em tamanho de computador (RN-19).
- D-U-08 Capa com o título "Manual do painel" e o subtítulo "Como usar as telas do painel do ProconChat Jacareí" (RN-18).
- D-U-09 Limites: até 40 páginas, 35 capturas e 10 MB (RN-20).
- D-U-10 Aprovado um bloco no fim de `.docs/guias/estilo/guia.css`, com uma nota em `.docs/guias/estilo/README.md`, restrito ao manual pelo seletor `body:has(#sumario)`, desde que os outros guias não mudem visualmente. O gerador `gerar-pdf.mjs` continua sem alteração (RN-12, CA-26, T6, T12, Fora do escopo).
- D-U-11 O PDF fica sem marcadores (outline). O usuário recusou mudar o gerador compartilhado, e o sumário clicável é a navegação do manual (RN-21, CA-27, T6, Fora do escopo).

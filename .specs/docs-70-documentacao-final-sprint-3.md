# Documentação final da Sprint 3 (#70)

> Status: em-revisao
> Tipo: funcionalidade
> Tamanho: media
> Branch: docs/70-documentacao-final-sprint-3
> Criada em: 2026-11-22

## Objetivo

A Sprint 3 termina em 23/11/2026, dia da apresentação final. A documentação em Markdown do repositório ainda mostra o retrato de 19/10, do fim da Sprint 2. O README principal dá a Sprint 3 como "Pendente" e traz o status dos requisitos diferente do quadro de rastreabilidade. O quadro de rastreabilidade ainda diz que "nenhum teste com usuários" foi feito e deixa vários requisitos como parciais sem dizer o que falta. Também não existe o fechamento da Sprint 3.

Esta tarefa deixa a documentação igual ao que está de fato no sistema hoje (RNF07 e RNF08). Ao final:

- uma pessoa de fora do time consegue subir o sistema seguindo só o README;
- o quadro de rastreabilidade não tem nenhum requisito como "não atendido" e bate com o README;
- cada requisito que continua parcial aponta para uma issue aberta pela PO.

É só documentação: nenhuma tela, regra ou código do sistema muda.

## Regras

| ID | Regra | Fonte |
|---|---|---|
| RN-01 | O README principal mostra o estado final do sistema. Isso inclui o arquivo de configuração, o painel web e o servidor de produção. A Evolution e o Redis não aparecem mais, porque saíram na #82. | issue #70; PO |
| RN-02 | Os passos de instalação do README são conferidos contra o que o projeto usa de fato: o arquivo do Docker Compose, o arquivo de exemplo de configuração e os README de cada serviço. Uma pessoa de fora do time precisa conseguir subir o sistema só com eles. | issue #70; PO |
| RN-03 | As tabelas do README (tecnologias, Scrum e Product Backlog) mostram o mesmo status de cada requisito que o quadro de rastreabilidade. | issue #70; PO |
| RN-04 | Cada item da arquitetura e da rastreabilidade é conferido contra o que está no sistema hoje. O status de uma issue no GitHub sozinho não prova que algo foi entregue: a prova é o sistema, o código ou um registro escrito. | PO; orquestradora |
| RN-05 | No fim, nenhum requisito fica como "não atendido" (❌) no quadro de rastreabilidade. | issue #70 |
| RN-06 | Um requisito que de fato está parcial vira uma issue nova. O dev só lista a lacuna para a orquestradora: o requisito e o que falta, em linguagem simples. Quem abre a issue é a PO. Depois disso, o quadro marca o requisito como parcial e cita o número da issue. O dev nunca abre issue. | PO |
| RN-07 | O índice geral da documentação lista os três PDFs que estão na pasta de guias: o manual do painel, o guia de configuração do bot e o documento do software. Também mostra o estado atual das sprints. | issue #70; PO |
| RN-08 | O fechamento da Sprint 3 segue o modelo das Sprints 1 e 2. Ele traz o placar, as tarefas concluídas, as tarefas em aberto e os riscos. O burndown só entra se os dados do GitHub forem confiáveis. Se não forem, o fechamento registra o burndown como pendente e explica o motivo. | PO |
| RN-09 | O README principal aponta para o fechamento da Sprint 3 e mostra a sprint como concluída. | PO |
| RN-10 | Alguns trechos tocam os cinco pontos em que as regras e o painel divergem: o menu, a exportação de relatórios, a permissão "Ver sessões", os conflitos em Horários e o texto sobre o Dashboard. Esses trechos esperam as decisões da #174 e são a última tarefa. Até lá, as outras tarefas descrevem só o que o painel faz hoje e não mexem nesses cinco pontos. | PO; orquestradora |
| RN-11 | Nada é inventado. Uma data, um resultado ou um status sem fonte vai para "Dúvidas" e não é escrito como fato. | orquestradora |
| RN-12 | Nenhum documento mostra o valor de uma senha, chave ou token. Os exemplos citam só o nome da configuração. | padrão de segurança |
| RN-13 | Cada tarefa entra em um commit separado, no formato `Docs :bulb: [#70] <descrição no imperativo>`, sem linha de coautoria. | orquestradora; padrão de commits |

## Critérios de aceite

Instalação

- CA-01 QUANDO uma pessoa de fora do time segue só o README, numa cópia nova do repositório e sem um `.env` anterior, ENTÃO o sistema DEVE subir com todos os serviços no ar, o painel DEVE abrir no endereço que o README indica, e a entrada com a conta Admin DEVE funcionar com o e-mail e a senha que o README manda configurar. (RN-02)
- CA-02 QUANDO o README lista os serviços, as portas, os comandos e os nomes de configuração ENTÃO cada um DEVE existir com o mesmo nome no arquivo do Docker Compose e no arquivo de exemplo de configuração, e nenhum serviço que já saiu do projeto DEVE aparecer. (RN-01, RN-02)
- CA-03 QUANDO a pessoa esquece a chave de criptografia na configuração ENTÃO o README DEVE dizer qual mensagem aparece e como gerar a chave, sem mostrar uma chave real. (RN-02, RN-12)
- CA-04 QUANDO a pessoa sobe o sistema pela primeira vez ENTÃO o README DEVE avisar que o modelo de IA é baixado nessa hora, que isso exige internet e pode demorar, e DEVE apontar onde estão os requisitos de hardware e software. (RN-02)
- CA-05 QUANDO o README indica a documentação de cada serviço ENTÃO DEVE incluir o README do painel web, além dos que já estão listados. (RN-01)

Rastreabilidade e arquitetura

- CA-06 QUANDO a rastreabilidade é aberta ENTÃO nenhum requisito DEVE estar como ❌, e a data da revisão DEVE ser a da conferência final. (RN-04, RN-05)
- CA-07 QUANDO um requisito está como atendido ENTÃO a linha DEVE citar onde isso pode ser visto: uma issue entregue, uma decisão ou um registro escrito. Um requisito não pode ficar como atendido só porque a issue foi fechada. (RN-04)
- CA-08 QUANDO um requisito está como parcial ENTÃO a linha DEVE dizer o que falta, em linguagem simples, e o número da issue aberta pela PO. (RN-06)
- CA-09 QUANDO a rastreabilidade fala de pendências antigas que já foram resolvidas ENTÃO o texto DEVE refletir a situação de hoje e citar a issue que resolveu cada uma. Os casos já conhecidos são: o teste ponta a ponta (#18, fechada), a interpretação dos fluxos decisórios (#122, unificada na #121), o teste com usuários (#121), o guia de passagem para o PROCON (#118) e o painel em construção (#123 a #129). (RN-04, RN-11)
- CA-10 QUANDO a arquitetura é aberta ENTÃO a data de atualização DEVE ser a da conferência final. Nenhum item DEVE aparecer como "planejado para a Sprint 2" ou "planejado para a Sprint 3" se já está no sistema. O que não foi feito DEVE aparecer como fora da entrega, citando a issue, quando houver. (RN-04)

README e índice

- CA-11 QUANDO o README e a rastreabilidade são lidos lado a lado ENTÃO cada requisito (RF01 a RF08, RNF01 a RNF08) DEVE ter o mesmo status nos dois. Hoje o RNF02 e o RNF05 divergem. (RN-03)
- CA-12 QUANDO o README mostra a tabela de Scrum ENTÃO a Sprint 3 DEVE aparecer como concluída, com link para o fechamento. O burndown DEVE ter link quando existir ou ser indicado como pendente quando não existir. (RN-08, RN-09)
- CA-13 QUANDO a tabela de tecnologias é lida ENTÃO o estado de cada camada DEVE ser o de hoje, sem "na Sprint 3" como algo futuro. (RN-01, RN-03)
- CA-14 QUANDO o índice geral da documentação é aberto ENTÃO os três PDFs DEVEM ter link e funcionar, e a linha de sprints DEVE citar o fechamento das Sprints 1, 2 e 3. (RN-07)

Fechamento da Sprint 3

- CA-15 QUANDO o fechamento da Sprint 3 é aberto ENTÃO DEVE ter, como na Sprint 2: o período, a data do retrato, o placar, uma tabela das tarefas concluídas (com tamanho, responsável, início, fim e PR), as tarefas em aberto e os riscos. Cada número do placar DEVE bater com a lista de issues com a etiqueta `SPRINT 3` no GitHub. (RN-08)
- CA-16 QUANDO uma issue da sprint foi fechada sem entrega de código ENTÃO o placar DEVE contá-la à parte, com o motivo. Os casos conhecidos são: a #122 foi unificada na #121, e a #120 foi fechada no mesmo dia em que foi criada. (RN-08, RN-11)
- CA-17 QUANDO os dados do GitHub não permitem um burndown confiável ENTÃO o fechamento DEVE registrar o burndown como pendente, com o motivo, em vez de mostrar um gráfico. (RN-08, RN-11)
- CA-18 QUANDO as horas vêm do GitHub ENTÃO DEVEM ser convertidas para o horário de Brasília, como no fechamento da Sprint 2. (RN-08)

Geral

- CA-19 QUANDO qualquer arquivo alterado é conferido ENTÃO todo link relativo DEVE apontar para um arquivo ou pasta que existe. (RN-02, RN-07)
- CA-20 QUANDO qualquer arquivo alterado é lido ENTÃO não DEVE aparecer o valor de nenhuma senha, chave ou token. (RN-12)
- CA-21 QUANDO o histórico da branch é conferido ENTÃO DEVE haver um commit por tarefa, no formato combinado, sem linha de coautoria, e com só os arquivos daquela tarefa. (RN-13)

## Critérios de sucesso

- Alguém de fora do time sobe o sistema seguindo só o README, numa cópia nova, sem ajuda.
- A rastreabilidade não tem ❌, e cada requisito tem o mesmo status no README.
- Cada requisito parcial aponta para uma issue aberta.
- O fechamento da Sprint 3 existe, e o README aponta para ele.
- O PR é mergeado na `develop` até 23/11/2026.

## Fora do escopo

- Gerar ou alterar os PDFs (#118 a #120). Esta tarefa só confere o índice deles.
- Resolver as cinco divergências entre as regras e o painel (#174, outro dev). Esta tarefa só ajusta os trechos de texto depois das decisões (T8).
- Mudar código, telas, testes ou configuração do sistema.
- Abrir issues. Isso é com a PO (RN-06).
- Atualizar o modelo de dados (ele ainda fala em "planejado para a Sprint 3"), o README de cada serviço e a linha `.tasks/` do índice. Esses textos estão desatualizados, mas não fazem parte do escopo da PO. Ver Dúvidas.

## Plano de execução

Esta tarefa não muda código. Typecheck, lint, build e testes não são afetados e não entram nos gates. O CI não tem checagem de Markdown fora do painel: o `format:check` só roda dentro de `src/frontend`. Por isso, os README de `src/` ficam só para leitura nesta tarefa. Se algum for alterado, ele passa a precisar de `npm run format:check` em `src/frontend` quando estiver lá dentro.

Conferência de links usada nos gates (roda na raiz da worktree e não pode mostrar nada):

```bash
for f in README.md .docs/README.md .docs/architecture/architecture.md .docs/desafio/rastreabilidade.md .docs/sprints/sprint3/*.md; do grep -oE '\]\([^)#]+' "$f" | sed 's/^](//' | grep -vE '^(https?:|mailto:)' | while read -r alvo; do [ -e "$(dirname "$f")/$alvo" ] || echo "$f -> $alvo"; done; done
```

Cada parte de um arquivo tem um único dono, para que as tarefas `[P]` não mexam no mesmo arquivo:

| Arquivo | Tarefas |
|---|---|
| `.docs/README.md` | T1 |
| `.docs/sprints/sprint3/` | T2 e depois T6 (só a seção "Em aberto") |
| `README.md` (raiz) | T3 (Instalação), depois T7 (Tecnologias, Scrum e Product Backlog) e depois T8 |
| `.docs/architecture/architecture.md` | T4 e depois T8 |
| `.docs/desafio/rastreabilidade.md` | T5, depois T6 e depois T8 |

- Fase 1 (paralelo): T1 [P], T2 [P], T3 [P], T4 [P], T5 [P]
  - O caminho do fechamento está fixo nesta especificação: `.docs/sprints/sprint3/README.md`. Assim, o T1 já pode apontar para ele. O link só passa no gate quando o T2 terminar.
  - Gate de fase: a conferência de links não mostra nada; o teste do zero do T3 passou; a lista de lacunas do T5 foi entregue à orquestradora; `git status --short` mostra só os arquivos destas tarefas.
- Fase 2 (espera um aviso): T6
  - Começa quando a orquestradora avisar os números das issues abertas pela PO para cada lacuna.
  - Gate de fase: nenhum ❌ na rastreabilidade; cada ⚠️ cita uma issue; a conferência de links não mostra nada.
- Fase 3: T7
  - Gate de fase: a comparação do status de cada requisito entre o README e a rastreabilidade não mostra diferença; a conferência de links não mostra nada.
- Fase 4 (espera um aviso): T8
  - Começa quando a orquestradora avisar que a #174 tem decisão nos cinco pontos.
  - Gate de fase: os trechos dos cinco pontos batem com as decisões; a conferência de links não mostra nada; o histórico tem um commit por tarefa, sem coautoria.

## Tarefas

### T1 [P] Conferir o índice dos PDFs e o estado das sprints

- **O quê:** conferir no índice geral da documentação os links dos três PDFs, e atualizar a linha de sprints para citar o fechamento das Sprints 1, 2 e 3.
- **Onde:** `.docs/README.md` (linha `guias/`, linha `sprints/` e "Por onde começar"). Para conferir: `.docs/guias/` e `.docs/guias/README.md`.
- **Dev:** Megumi (dev-doc)
- **Depende de:** nada. O link da Sprint 3 aponta para `sprints/sprint3/README.md`, criado no T2.
- **Reaproveita:** a linha `guias/` atual, que já cita os três PDFs, e a tabela de `.docs/guias/README.md`.
- **Atende:** RN-07, CA-14, CA-19
- **Pronto quando:** os três links de PDF abrem um arquivo que existe; a linha `sprints/` não diz mais "acompanhamento da Sprint 2 (retrato de 19/10/2026)"; a conferência de links não mostra nada depois do T2. Se a linha `guias/` já estiver completa, ela não muda, e isso fica registrado no Status.
- **Teste:** nenhum (documentação).
- **Gate:** a conferência de links (na fase); `git status --short` mostra só `.docs/README.md`.
- **Modelo:** economico
- **Status:** pendente

### T2 [P] Criar o fechamento da Sprint 3

- **O quê:** criar o fechamento da Sprint 3 no modelo da Sprint 2: placar, tarefas concluídas, tarefas em aberto, riscos e, se os dados forem confiáveis, o burndown.
- **Onde:** `.docs/sprints/sprint3/README.md` e, se houver burndown, `.docs/sprints/sprint3/burndown.md` e `.docs/sprints/sprint3/burndown.svg`. Fonte dos dados:
  - `gh issue list --label "SPRINT 3" --state all`;
  - a data em que cada issue entrou na sprint, pela linha do tempo da issue (`gh api repos/Steel-Hard/ProconChat_Jacarei/issues/<n>/timeline`, evento de etiqueta);
  - o motivo do fechamento (`gh api repos/Steel-Hard/ProconChat_Jacarei/issues/<n> --jq .state_reason`);
  - os PRs mergeados na `develop` desde 20/10.
- **Dev:** Megumi (dev-doc)
- **Depende de:** nada
- **Reaproveita:** a estrutura de `.docs/sprints/sprint2/README.md` e `.docs/sprints/sprint2/burndown.md`, incluindo a nota sobre o fuso de Brasília e a seção "Fora da sprint".
- **Atende:** RN-08, RN-11, CA-15, CA-16, CA-17, CA-18, CA-19
- **Pronto quando:**
  - o placar soma exatamente as issues com a etiqueta `SPRINT 3`;
  - as issues fechadas sem entrega (#122, #120) aparecem à parte, com o motivo;
  - as issues que entraram no meio da sprint (#18, #159 e #164) mostram a data de entrada;
  - os riscos citam a #174 e as lacunas do T5;
  - a seção "Em aberto" já lista o que se sabe e deixa um lugar para as issues novas, preenchido no T6;
  - o burndown existe e confere com as datas, ou está registrado como pendente, com o motivo, conforme a resposta da PO (Dúvidas P-02 e P-03).
- **Teste:** nenhum (documentação).
- **Gate:** cada número do placar conferido contra a lista do GitHub; a conferência de links; `git status --short` mostra só a pasta `sprint3`.
- **Modelo:** padrao
- **Status:** pendente

### T3 [P] Conferir e completar a instalação no README

- **O quê:** deixar a seção de instalação do README igual ao que o sistema usa hoje, e provar isso subindo o sistema do zero seguindo só o README.
- **Onde:** `README.md`, seção "Instalação" e o bloco de produção no topo. Para conferir: `compose.yaml`, `compose.prod.yaml`, `.env.example`, `src/backend/README.md`, `src/gateway/README.md`, `src/frontend/README.md`, `.docs/infra/deploy.md` e `.docs/guias/documento-do-software.md` (requisitos medidos).
- **Dev:** Megumi (dev-doc)
- **Depende de:** nada
- **Reaproveita:** a tabela de serviços e a nota sobre a chave de criptografia, que já existem.
- **Atende:** RN-01, RN-02, RN-12, CA-01, CA-02, CA-03, CA-04, CA-05, CA-19, CA-20
- **Pronto quando:**
  - o `git clone` usa o endereço real do repositório, sem marcador;
  - o README diz como abrir o painel (porta 8081) e entrar com a conta Admin (os nomes `ROOT_EMAIL` e `ROOT_PASSWORD`, sem os valores);
  - o README avisa sobre o download do modelo de IA (internet e tempo) e aponta onde estão os requisitos de hardware e software;
  - o README lista `src/frontend/README.md` entre os documentos de cada serviço;
  - cada serviço, porta e configuração citados existem com o mesmo nome no Compose e no `.env.example`;
  - o teste do zero do Gate passou.
- **Teste:** nenhum automatizado. O teste é a instalação do zero do Gate.
- **Gate:**
  - criar uma worktree nova fora da pasta da tarefa (`git worktree add ../readme-do-zero HEAD --detach`);
  - lá dentro, seguir só o README: copiar `.env.example` para `.env` com `cp`, sem mostrar o conteúdo, e preencher `ENCRYPTION_KEY`;
  - subir com outro nome de projeto (`docker compose -p readme-do-zero up --build`) e com portas que não colidem com outra pilha que esteja rodando;
  - conferir que todos os serviços sobem, que o painel abre e que a entrada com a conta Admin funciona;
  - registrar no Status o que precisou de ajuste;
  - ao fim, `docker compose -p readme-do-zero down -v` e `git worktree remove ../readme-do-zero`;
  - a conferência de links; `git status --short` mostra só `README.md`.
- **Modelo:** padrao
- **Status:** pendente

### T4 [P] Atualizar a arquitetura para o estado final

- **O quê:** conferir cada linha da arquitetura contra o que está no sistema hoje e trocar "planejado para a Sprint 2 ou 3" pelo estado final: entregue, ou fora da entrega com a issue.
- **Onde:** `.docs/architecture/architecture.md` (cabeçalho, legenda, Componentes, Módulos do Backend, Fluxos, Infraestrutura, Segurança, Stack e "Como a arquitetura atende aos requisitos"). Para conferir:
  - `compose.yaml` e `compose.prod.yaml`;
  - `src/backend/src/`, `src/gateway/src/` e `src/frontend/src/navigation/`;
  - `.github/workflows/`;
  - as decisões em `.docs/decisoes/`.
- **Dev:** Megumi (dev-doc)
- **Depende de:** nada
- **Reaproveita:** a estrutura atual do documento e as decisões 001 a 012.
- **Atende:** RN-04, RN-10, CA-10, CA-19
- **Pronto quando:**
  - o cabeçalho tem a data da conferência e a lista das issues da Sprint 3;
  - a legenda não tem mais "planejado para a Sprint 2/3", ou ela é usada só para o que de fato ficou de fora;
  - cada ✅ aponta para algo que existe no código;
  - Dashboard e Sessões aparecem como fora da entrega, com a issue (#71 e #72, a confirmar no T5);
  - os cinco pontos da #174 não são alterados (ficam para o T8);
  - a conferência de links não mostra nada.
- **Teste:** nenhum (documentação).
- **Gate:** cada item alterado aponta a sua fonte no código ou na decisão; a conferência de links; `git status --short` mostra só `architecture.md`.
- **Modelo:** padrao
- **Status:** pendente

### T5 [P] Conferir a rastreabilidade item a item e listar as lacunas

- **O quê:** conferir cada RF, RNF e RP da rastreabilidade contra o que está no sistema hoje, corrigir o que já se resolveu e entregar à orquestradora a lista dos requisitos que de fato estão parciais.
- **Onde:** `.docs/desafio/rastreabilidade.md` (tabelas, notas 1 a 5, seção RP04 e seção Documentação). Para conferir:
  - o código na `develop`;
  - `.docs/decisoes/`;
  - as issues da Sprint 3 (corpo e comentários, não só o estado);
  - `.docs/lgpd/`;
  - `.docs/guias/`;
  - `.github/workflows/ci.yml` (o job `backend-e2e`, da #18).
- **Dev:** Megumi (dev-doc)
- **Depende de:** nada
- **Reaproveita:** a estrutura em três camadas (Código, Desenho, Situação) e as notas atuais.
- **Atende:** RN-04, RN-05, RN-06, RN-10, RN-11, CA-06, CA-07, CA-09, CA-19
- **Pronto quando:**
  - cada linha foi conferida. As que já se resolveram foram corrigidas, citando a fonte: RNF08 com a #18, RNF07 com a #118 e a #120, RF08 com as #123 a #129, RF06 com a #68 e a #128, RNF02 e RF05 com a decisão 009;
  - nenhuma linha fica como ✅ só porque a issue foi fechada. Em especial, a #121 foi fechada, mas o único comentário dela é "EM PROGRESSO" e não há registro do resultado. Por isso RNF01, RF02 e RF03 (nota 1) seguem a resposta da PO (Dúvida P-01);
  - os cinco pontos da #174 não foram alterados;
  - a orquestradora recebeu a lista de lacunas: para cada requisito parcial, o que falta, em linguagem simples, sem caminho de arquivo nem código;
  - os itens parciais ficam como ⚠️ "issue a abrir" até o T6.
- **Teste:** nenhum (documentação).
- **Gate:** cada linha cita a sua fonte (issue, decisão, código ou registro escrito); a conferência de links; `git status --short` mostra só `rastreabilidade.md`.
- **Modelo:** padrao
- **Status:** pendente

### T6 Registrar os requisitos parciais com as issues da PO

- **O quê:** trocar cada "issue a abrir" da rastreabilidade pelo número da issue que a PO abriu, e listar essas issues na seção "Em aberto" do fechamento da Sprint 3.
- **Onde:** `.docs/desafio/rastreabilidade.md` e `.docs/sprints/sprint3/README.md` (só "Em aberto").
- **Dev:** Megumi (dev-doc)
- **Depende de:** T2, T5 e o aviso da orquestradora com os números das issues abertas pela PO.
- **Reaproveita:** a lista de lacunas do T5.
- **Atende:** RN-05, RN-06, CA-06, CA-08, CA-15
- **Pronto quando:** nenhum ❌ e nenhum "issue a abrir" na rastreabilidade; cada ⚠️ cita uma issue que existe (`gh issue view <n>`); a seção "Em aberto" do fechamento lista as mesmas issues.
- **Teste:** nenhum (documentação).
- **Gate:** `grep -c '❌' .docs/desafio/rastreabilidade.md` dá 0, ou só a legenda, conforme a resposta da Dúvida P-04; cada issue citada existe; a conferência de links.
- **Modelo:** economico
- **Status:** pendente

### T7 Atualizar no README o status dos requisitos, as tecnologias e o Scrum

- **O quê:** deixar as tabelas de Tecnologias, Scrum e Product Backlog do README iguais à rastreabilidade e ao fechamento da Sprint 3.
- **Onde:** `README.md` (seções Tecnologias, Scrum e Product Backlog, e a nota que aponta só para o fechamento da Sprint 1).
- **Dev:** Megumi (dev-doc)
- **Depende de:** T2, T3 e T6
- **Reaproveita:** a rastreabilidade final (T6) e o fechamento da Sprint 3 (T2).
- **Atende:** RN-03, RN-09, CA-11, CA-12, CA-13, CA-19
- **Pronto quando:**
  - cada requisito tem o mesmo status no README e na rastreabilidade. Hoje divergem pelo menos o RNF02 ("Pendente" no README, ⚠️ na rastreabilidade) e o RNF05 ("Pendente" no README, ✅ na rastreabilidade);
  - a linha da Sprint 3 está como concluída, com link para `.docs/sprints/sprint3/README.md`, e o burndown tem link ou está indicado como pendente;
  - a linha do painel web lista as telas que existem hoje, sem "demais telas na Sprint 3";
  - a linha do LLM não diz "ligado ao fluxo na Sprint 3" como algo futuro;
  - a nota abaixo do Product Backlog aponta também para o fechamento da Sprint 3.
- **Teste:** nenhum (documentação).
- **Gate:** a comparação, linha por linha, do status de RF01 a RF08 e RNF01 a RNF08 entre o README e a rastreabilidade não mostra diferença; a conferência de links; `git status --short` mostra só `README.md`.
- **Modelo:** economico
- **Status:** pendente

### T8 Ajustar os trechos que tocam as regras do painel

- **O quê:** ajustar os trechos do README, da arquitetura e da rastreabilidade que falam dos cinco pontos da #174, conforme o que for decidido nela.
- **Onde:**
  - `README.md` (linha do painel web);
  - `.docs/architecture/architecture.md` (linha do painel e API do painel);
  - `.docs/desafio/rastreabilidade.md` (RF08, nota 4, e a tabela do RP04).
- **Dev:** Megumi (dev-doc)
- **Depende de:** T4, T6, T7 e o aviso da orquestradora de que a #174 tem decisão nos cinco pontos.
- **Reaproveita:** as decisões registradas na #174.
- **Atende:** RN-10, CA-10, CA-11, CA-19
- **Pronto quando:** os cinco pontos (menu, exportação de relatórios, "Ver sessões", conflitos em Horários e o texto do Dashboard) dizem a mesma coisa que a decisão da #174 nos três documentos; o status de cada requisito continua igual entre o README e a rastreabilidade.
- **Teste:** nenhum (documentação).
- **Gate:** cada trecho conferido contra a decisão da #174; a comparação de status entre o README e a rastreabilidade sem diferença; a conferência de links; o histórico da branch com um commit por tarefa, sem coautoria (`git log --format=%B develop..HEAD`).
- **Modelo:** padrao
- **Status:** pendente

## Dúvidas

### Para o product-owner

- P-01 A #121 está fechada desde 16/11, mas o único comentário dela é "EM PROGRESSO, esperando resposta". Nenhum PR ou commit cita a issue, e a pasta da Sprint 3, onde o roteiro e os resultados deveriam estar, não existe. Três perguntas:
  - Qual foi a resposta do professor e do PROCON sobre os "fluxos decisórios" (nota 1 de RF02 e RF03)?
  - O teste com usuários foi feito? Se sim, onde estão o roteiro e os resultados?
  - Sem esse registro, RNF01, RF02 e RF03 ficam como parciais, com issue nova. É isso?
- P-02 Quais issues contam no placar e no burndown da Sprint 3?
  - A #122 foi unificada na #121.
  - A #120 foi fechada no mesmo dia em que foi criada.
  - A #159 é a organização da Feira e não tem entrega de código.
  - A #18, a #159 e a #164 entraram no meio da sprint.
  - A própria #70 conta?
  - As issues novas das lacunas recebem a etiqueta `SPRINT 3`?
- P-03 Datas da Sprint 3:
  - O período oficial é 20/10 a 23/11/2026, como diz o README?
  - Qual é a data do retrato: 22/11 ou 23/11?
  - Quase todas as issues têm a etiqueta desde a criação (19/10 ou 28/09), e não há registro de quando cada uma foi para "In progress" no board. Se o burndown não for confiável, a PO aceita registrá-lo como pendente?
- P-04 A regra é "sem ❌". O RP04 aparece como 🔴 "maior risco do projeto". Ele pode continuar 🔴 no quadro final? A tabela de corte de escopo (Essencial, Importante, Desejável) era uma proposta: ela vira o registro oficial do que foi cortado, ou é atualizada com o que de fato ficou de fora?
- P-05 O RNF03 tem uma pendência: "conferir as citações legais dos prazos, marcadas 'a conferir' na decisão 002". Isso ainda está aberto? Se estiver, o RNF03 passa a parcial, com issue nova?
- P-06 O prazo é o merge até 23/11. Se a #174 não tiver decisão até lá, o PR entra sem o T8 e o T8 vira uma issue nova? Ou o PR espera a #174?
- P-07 Três textos estão desatualizados fora do escopo combinado:
  - o modelo de dados ainda fala em "planejado para a Sprint 3", e a arquitetura aponta para ele;
  - o índice geral descreve `.tasks/` como uma pasta local, mas as especificações ficam em `.specs/`, que está no Git;
  - os README de cada serviço podem ter trechos antigos.

  Eles entram nesta tarefa ou viram uma issue separada?

### Para o usuário

- U-01 A definição de pronto pede "testado seguindo o próprio guia do zero". O teste do zero que o dev faz numa cópia limpa, no T3, basta? Ou alguém de fora do time, sem ajuda, precisa repetir antes do merge?
- U-02 O teste do zero baixa o modelo de IA, com alguns GB, e sobe toda a pilha na sua máquina, com outro nome de projeto e outras portas. Pode rodar na sua máquina?

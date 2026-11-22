# Documentação final da Sprint 3 (#70)

> Status: em-revisao
> Tipo: funcionalidade
> Tamanho: media
> Branch: docs/70-documentacao-final-sprint-3
> Criada em: 2026-11-22

## Objetivo

A Sprint 3 termina em 23/11/2026, dia da apresentação final. A documentação em Markdown do repositório ainda mostra o retrato de 19/10, do fim da Sprint 2:

- o README principal dá a Sprint 3 como "Pendente";
- o status dos requisitos no README é diferente do quadro de rastreabilidade;
- o quadro de rastreabilidade ainda diz que "nenhum teste com usuários" foi feito e deixa vários requisitos parciais sem dizer o que falta;
- não existe o fechamento da Sprint 3.

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
| RN-04 | Cada item da arquitetura e da rastreabilidade é conferido contra o que está no sistema hoje. O status de uma issue no GitHub sozinho não prova que algo foi entregue: a prova é o sistema, o código ou um registro escrito. Nada fica como ✅ sem registro. | PO (P-01) |
| RN-05 | No fim, nenhum requisito fica como "não atendido" (❌) no quadro de rastreabilidade. O RP04 pode continuar como 🔴, porque é um risco e não um requisito. A legenda do quadro explica essa diferença. | issue #70; PO (P-04) |
| RN-06 | Um requisito que de fato está parcial vira uma issue nova. O dev só lista a lacuna para a orquestradora: o requisito e o que falta, em linguagem simples. Quem abre a issue é a PO. Depois disso, o quadro marca o requisito como parcial e cita o número da issue. O dev nunca abre issue. | PO |
| RN-07 | O índice geral da documentação lista os três PDFs que estão na pasta de guias: o manual do painel, o guia de configuração do bot e o documento do software. Também mostra o estado atual das sprints. | issue #70; PO |
| RN-08 | O fechamento da Sprint 3 segue o modelo das Sprints 1 e 2: placar, tarefas concluídas, tarefas em aberto e riscos. Os dados são estes: <ul><li>O período é de 20/10 a 23/11/2026.</li><li>A data do retrato é o dia em que a lista do GitHub for conferida.</li><li>O burndown fica registrado como pendente. O motivo é que não há registro de quando cada issue foi para "In progress".</li></ul> | PO (P-03) |
| RN-09 | O README principal aponta para o fechamento da Sprint 3 e mostra a sprint como concluída. | PO |
| RN-10 | A #174 já foi decidida: <ul><li>Nos pontos 1 a 4 (menu, exportação de relatórios, "Ver sessões" e conflitos em Horários), muda só a documentação.</li><li>A exportação de relatórios fica como não entregue, bônus da #73.</li><li>No ponto 5, a frase sobre o Dashboard sai da tela de Horários. Essa mudança no painel é do dev de frontend.</li></ul>As regras das telas e o manual são de outro dev (Inumaki). Esta tarefa só mantém o README, a arquitetura e a rastreabilidade coerentes com essas decisões. | usuário; PO (P-06) |
| RN-11 | Nada é inventado. Uma data, um resultado ou um status sem fonte vai para "Dúvidas" e não é escrito como fato. A resposta do professor sobre os fluxos decisórios não é inventada. | orquestradora; PO (P-01) |
| RN-12 | Nenhum documento mostra o valor de uma senha, chave ou token. Os exemplos citam só o nome da configuração. | padrão de segurança |
| RN-13 | Cada tarefa entra em um commit separado, no formato `Docs :bulb: [#70] <descrição no imperativo>`, sem linha de coautoria. | orquestradora; padrão de commits |
| RN-14 | A tela de Sessões (#72) foi descartada de propósito pelo grupo, e o PR foi fechado sem merge. No README, na arquitetura e na rastreabilidade, Sessões aparece como "descartada por decisão do grupo". Ela não é entregue nem pendente e não gera issue de lacuna. | usuário |
| RN-15 | O Dashboard (#71) aparece conforme o estado real: <ul><li>A issue está fechada no GitHub como não planejada, com a etiqueta "Extra".</li><li>A tela não existe no painel, que marca o Dashboard como não pronto.</li></ul>O Dashboard aparece como não entregue (extra) e não gera issue de lacuna. | PO (P-04); GitHub em 22/11/2026 |
| RN-16 | A tabela de corte de escopo do RP04 deixa de ser proposta e vira o registro oficial do que ficou de fora: <ul><li>Sessões (#72): descartada de propósito.</li><li>Exportação em PDF, Excel e CSV: não entregue, bônus da #73.</li><li>Dashboard (#71): conforme RN-15.</li><li>Os demais itens, conforme o que existe no sistema.</li></ul> | PO (P-04) |
| RN-17 | Ficam parciais, e cada um entra na lista de lacunas: <ul><li>**RF02, RF03 e RNF01:** o professor e o PROCON não responderam sobre os fluxos decisórios, e não há registro do teste com usuários. Em RF02, RF03 e na nota 1, isso aparece como "sem resposta até o fechamento", e o teste com usuários como "sem registro".</li><li>**RNF03:** a conferência das citações legais dos prazos da decisão 002 continua aberta.</li></ul> | PO (P-01, P-05); usuário |
| RN-18 | O placar conta as issues assim: <ul><li>A #122 e a #120 aparecem só como "unificada na #121" e "unificada na #118", sem contar em dobro.</li><li>A #159 conta como organização da Feira, sem código.</li><li>A #18, a #159 e a #164 aparecem como entradas no meio da sprint.</li><li>A #70 conta como a issue de fechamento, aberta no retrato.</li></ul> | PO (P-02) |
| RN-19 | A #70 também corrige estes textos, inteiros: <ul><li>o modelo de dados, que deixa de dizer "planejado para a Sprint 3";</li><li>a linha da pasta `.tasks/` no índice geral, porque as especificações ficam em `.specs/`, que está no Git;</li><li>os README do backend, do gateway e do painel web, conferidos do começo ao fim contra o que o sistema faz hoje.</li></ul> | PO (P-07); usuário (U-04) |
| RN-20 | O usuário autorizou o teste do zero com o modelo de IA. Quem faz esse teste é a QA (Nobara). O dev não baixa nem roda o modelo de IA: ele valida só o que não depende do modelo. | usuário (U-01, U-02) |
| RN-21 | Nenhuma issue de lacuna é aberta antes de o usuário ver a lista de lacunas. O usuário também decide se essas issues recebem a etiqueta `SPRINT 3`. Até essa decisão, os requisitos parciais ficam como ⚠️ "issue a abrir". | usuário (U-03) |

## Critérios de aceite

Instalação

- CA-01 QUANDO a QA segue só o README, numa cópia nova do repositório e sem um `.env` anterior, ENTÃO o sistema DEVE subir com todos os serviços no ar, inclusive o modelo de IA. O painel DEVE abrir no endereço que o README indica, e a entrada com a conta Admin DEVE funcionar com o e-mail e a senha que o README manda configurar. (RN-02, RN-20)
- CA-02 QUANDO o README lista os serviços, as portas, os comandos e os nomes de configuração ENTÃO cada um DEVE existir com o mesmo nome no arquivo do Docker Compose e no arquivo de exemplo de configuração, e nenhum serviço que já saiu do projeto DEVE aparecer. (RN-01, RN-02)
- CA-03 QUANDO a pessoa esquece a chave de criptografia na configuração ENTÃO o README DEVE dizer qual mensagem aparece e como gerar a chave, sem mostrar uma chave real. (RN-02, RN-12)
- CA-04 QUANDO a pessoa sobe o sistema pela primeira vez ENTÃO o README DEVE avisar que o modelo de IA é baixado nessa hora, que isso exige internet e pode demorar, e DEVE apontar onde estão os requisitos de hardware e software. (RN-02)
- CA-05 QUANDO o README indica a documentação de cada serviço ENTÃO DEVE incluir o README do painel web, além dos que já estão listados. (RN-01)

Rastreabilidade e arquitetura

- CA-06 QUANDO a rastreabilidade é aberta ENTÃO nenhum requisito DEVE estar como ❌, e a data da revisão DEVE ser a da conferência final. A legenda DEVE explicar que o 🔴 do RP04 marca um risco, não um requisito. (RN-04, RN-05)
- CA-07 QUANDO um requisito está como atendido ENTÃO a linha DEVE citar onde isso pode ser visto: uma issue entregue, uma decisão ou um registro escrito. Um requisito não pode ficar como atendido só porque a issue foi fechada. (RN-04)
- CA-08 QUANDO um requisito está como parcial ENTÃO a linha DEVE dizer o que falta, em linguagem simples, e o número da issue aberta pela PO. Isso vale no mínimo para RF02, RF03, RNF01 e RNF03. (RN-06, RN-17)
- CA-09 QUANDO RF02, RF03 e a nota 1 são lidos ENTÃO DEVEM dizer que a consulta sobre os fluxos decisórios ficou "sem resposta até o fechamento" e que o teste com usuários está "sem registro". Nenhuma resposta DEVE ser atribuída ao professor ou ao PROCON. (RN-11, RN-17)
- CA-10 QUANDO a rastreabilidade fala de pendências antigas que já foram resolvidas ENTÃO o texto DEVE refletir a situação de hoje e citar a issue que resolveu cada uma. Os casos já conhecidos são: o teste ponta a ponta (#18), o guia de passagem para o PROCON (#118) e o painel em construção (#123 a #129). (RN-04)
- CA-11 QUANDO a arquitetura é aberta ENTÃO a data de atualização DEVE ser a da conferência final. Nenhum item DEVE aparecer como "planejado para a Sprint 2" ou "planejado para a Sprint 3". O que ficou de fora DEVE aparecer com a situação certa e a issue: Sessões descartada por decisão do grupo (#72), Dashboard não entregue (#71) e exportação de relatórios não entregue (bônus da #73). (RN-04, RN-14, RN-15, RN-16)
- CA-12 QUANDO a tela de Sessões é citada no README, na arquitetura ou na rastreabilidade ENTÃO DEVE aparecer como "descartada por decisão do grupo", nunca como entregue, pendente ou "em construção". Ela não DEVE estar na lista de lacunas. (RN-14)
- CA-13 QUANDO a tabela de corte de escopo do RP04 é lida ENTÃO DEVE ser o registro oficial do que ficou de fora, e não mais uma "proposta a validar". (RN-16)
- CA-14 QUANDO o README, a arquitetura e a rastreabilidade falam do menu do painel, da exportação de relatórios, da permissão "Ver sessões", dos conflitos em Horários ou do Dashboard ENTÃO DEVEM dizer o mesmo que as decisões da #174 e o que o painel faz hoje. (RN-10)
- CA-15 QUANDO o modelo de dados é aberto ENTÃO nada que já existe no sistema DEVE aparecer como "planejado para a Sprint 3". (RN-19)

README e índice

- CA-16 QUANDO o README e a rastreabilidade são lidos lado a lado ENTÃO cada requisito (RF01 a RF08, RNF01 a RNF08) DEVE ter o mesmo status nos dois. Hoje o RNF02 e o RNF05 divergem. (RN-03)
- CA-17 QUANDO o README mostra a tabela de Scrum ENTÃO a Sprint 3 DEVE aparecer como concluída, com link para o fechamento, e o burndown DEVE estar indicado como pendente. (RN-08, RN-09)
- CA-18 QUANDO a tabela de tecnologias é lida ENTÃO o estado de cada camada DEVE ser o de hoje, sem "na Sprint 3" como algo futuro. (RN-01, RN-03)
- CA-19 QUANDO o índice geral da documentação é aberto ENTÃO os três PDFs DEVEM ter link e funcionar, a linha de sprints DEVE citar o fechamento das Sprints 1, 2 e 3, e a linha das especificações DEVE dizer que elas ficam em `.specs/`, no Git. (RN-07, RN-19)

Fechamento da Sprint 3

- CA-20 QUANDO o fechamento da Sprint 3 é aberto ENTÃO DEVE ter, como na Sprint 2:
  - o período de 20/10 a 23/11/2026 e a data do retrato;
  - o placar;
  - uma tabela das tarefas concluídas, com tamanho, responsável, início, fim e PR;
  - as tarefas em aberto;
  - os riscos.

  Cada número do placar DEVE bater com a lista de issues com a etiqueta `SPRINT 3` no GitHub. (RN-08)
- CA-21 QUANDO o placar é lido ENTÃO DEVE seguir RN-18: <ul><li>a #122 e a #120 aparecem só como "unificada na #121" e "unificada na #118";</li><li>a #159 é a organização da Feira, sem código;</li><li>a #18, a #159 e a #164 estão marcadas como entradas no meio da sprint;</li><li>a #70 está como a issue de fechamento, aberta no retrato.</li></ul> (RN-18)
- CA-22 QUANDO o fechamento fala do burndown ENTÃO DEVE registrá-lo como pendente, com o motivo (não há registro de "In progress"), sem gráfico. (RN-08, RN-11)
- CA-23 QUANDO as horas vêm do GitHub ENTÃO DEVEM ser convertidas para o horário de Brasília, como no fechamento da Sprint 2. (RN-08)

Geral

- CA-24 QUANDO qualquer arquivo alterado é conferido ENTÃO todo link relativo DEVE apontar para um arquivo ou pasta que existe. (RN-02, RN-07)
- CA-25 QUANDO qualquer arquivo alterado é lido ENTÃO não DEVE aparecer o valor de nenhuma senha, chave ou token. (RN-12)
- CA-26 QUANDO o histórico da branch é conferido ENTÃO DEVE haver um commit por tarefa, no formato combinado, sem linha de coautoria, e com só os arquivos daquela tarefa. (RN-13)
- CA-27 QUANDO o README do backend, do gateway ou do painel web é seguido ENTÃO cada comando, rota, porta, variável de configuração, serviço e tela citados DEVEM existir como estão escritos no sistema hoje. Nada que saiu do projeto DEVE aparecer como atual: Evolution e Redis só podem aparecer na seção sobre a migração. (RN-19)

## Critérios de sucesso

- A QA sobe o sistema do zero seguindo só o README, numa cópia nova, sem ajuda.
- A rastreabilidade não tem ❌, e cada requisito tem o mesmo status no README.
- Cada requisito parcial aponta para uma issue aberta, depois que o usuário decidir sobre a lista de lacunas (RN-21).
- Os README do backend, do gateway e do painel web descrevem o que o sistema faz hoje.
- Sessões, Dashboard e a exportação de relatórios aparecem com a mesma situação nos três documentos.
- O fechamento da Sprint 3 existe, e o README aponta para ele.
- O PR é mergeado na `develop` até 23/11/2026.

## Fora do escopo

- Gerar ou alterar os PDFs (#118 a #120). Esta tarefa só confere o índice deles.
- Regras das telas e manual do painel. Ficam com outro dev (Inumaki), conforme as decisões da #174.
- Tirar do painel a frase sobre o Dashboard na tela de Horários. É mudança de painel e fica com o dev de frontend.
- Mudar código, telas, testes ou configuração do sistema.
- Abrir issues. Isso é com a PO, depois da decisão do usuário (RN-06, RN-21).
- Rodar o modelo de IA no teste do dev. O teste do zero com o modelo é da QA (RN-20).
- Gerar um gráfico de burndown da Sprint 3 (RN-08).

## Plano de execução

Esta tarefa não muda código. Typecheck, lint, build e testes não são afetados e não entram nos gates. O CI não tem checagem de Markdown fora do painel: o `format:check` só roda dentro de `src/frontend` e pega o `src/frontend/README.md`. Por isso, o gate da T11 inclui `npm run format:check` em `src/frontend`. Os README do backend e do gateway não passam por formatador no CI.

Conferência de links usada nos gates. Ela roda na raiz da worktree e não pode mostrar nada:

```bash
for f in README.md .docs/README.md .docs/architecture/architecture.md .docs/database/database.md .docs/desafio/rastreabilidade.md .docs/sprints/sprint3/*.md src/*/README.md; do grep -oE '\]\([^)#]+' "$f" | sed 's/^](//' | grep -vE '^(https?:|mailto:)' | while read -r alvo; do [ -e "$(dirname "$f")/$alvo" ] || echo "$f -> $alvo"; done; done
```

Cada parte de um arquivo tem um único dono, para que as tarefas `[P]` não mexam no mesmo arquivo:

| Arquivo | Tarefas |
|---|---|
| `.docs/README.md` | T1 |
| `.docs/sprints/sprint3/` | T2 e depois T6 (só a seção "Em aberto") |
| `README.md` (raiz) | T3 (Instalação), depois T7 (Tecnologias, Scrum e Product Backlog) e depois T8 |
| `src/backend/README.md` | T9 |
| `src/gateway/README.md` | T10 |
| `src/frontend/README.md` | T11 |
| `.docs/architecture/architecture.md` e `.docs/database/database.md` | T4 e depois T8 |
| `.docs/desafio/rastreabilidade.md` | T5, depois T6 e depois T8 |

- Fase 1 (paralelo): T1 [P], T2 [P], T3 [P], T4 [P], T5 [P], T9 [P], T10 [P], T11 [P]
  - O caminho do fechamento está fixo nesta especificação: `.docs/sprints/sprint3/README.md`. Assim, a T1 já pode apontar para ele. O link só passa no gate quando a T2 terminar.
  - A T3 cita os README dos serviços só por link, sem copiar o conteúdo deles. Assim, ela não depende das T9 a T11.
  - Gate de fase:
    - a conferência de links não mostra nada;
    - a validação da T3 sem o modelo de IA passou;
    - `npm run format:check` em `src/frontend` passou;
    - a lista de lacunas da T5 foi entregue à orquestradora, para o usuário ver;
    - `git status --short` mostra só os arquivos destas tarefas.
- Fase 2 (parada até a decisão do usuário): T6
  - Começa quando o usuário decidir sobre a lista de lacunas e a etiqueta `SPRINT 3` (U-03), e a orquestradora avisar os números das issues abertas pela PO.
  - Até lá, os requisitos parciais ficam como ⚠️ "issue a abrir" (RN-21). As Fases 3 e 4 podem andar antes dela. Se a T6 terminar depois da T7, a comparação de status do gate da Fase 3 roda de novo.
  - Gate de fase: nenhum ❌ na rastreabilidade; cada ⚠️ cita uma issue; a conferência de links não mostra nada.
- Fase 3: T7
  - Gate de fase: a comparação do status de cada requisito entre o README e a rastreabilidade não mostra diferença; a conferência de links não mostra nada.
- Fase 4: T8
  - Gate de fase:
    - os cinco pontos da #174, Sessões e Dashboard dizem a mesma coisa nos três documentos;
    - a conferência de links não mostra nada;
    - o histórico tem um commit por tarefa, sem coautoria.
- Depois da Fase 4: a QA (Nobara) faz o teste do zero com o modelo de IA (CA-01), quando a orquestradora liberar. O que ela achar volta para o dev corrigir no README.

## Tarefas

### T1 [P] Conferir o índice dos PDFs, o estado das sprints e a linha das especificações

- **O quê:** conferir no índice geral os links dos três PDFs, atualizar a linha de sprints para citar o fechamento das Sprints 1, 2 e 3, e corrigir a linha `.tasks/`, porque as especificações ficam em `.specs/`, no Git.
- **Onde:** `.docs/README.md` (linhas `guias/`, `sprints/` e `.tasks/`, e "Por onde começar"). Para conferir: `.docs/guias/`, `.docs/guias/README.md` e `.specs/`.
- **Dev:** Megumi (dev-doc)
- **Depende de:** nada. O link da Sprint 3 aponta para `sprints/sprint3/README.md`, criado na T2.
- **Reaproveita:** a linha `guias/` atual, que já cita os três PDFs, e a tabela de `.docs/guias/README.md`.
- **Atende:** RN-07, RN-19, CA-19, CA-24
- **Pronto quando:**
  - os três links de PDF abrem um arquivo que existe;
  - a linha `sprints/` não diz mais "acompanhamento da Sprint 2 (retrato de 19/10/2026)";
  - a linha das especificações aponta para `.specs/` como pasta versionada;
  - a conferência de links não mostra nada depois da T2.

  Se a linha `guias/` já estiver completa, ela não muda, e isso fica registrado no Status.
- **Teste:** nenhum (documentação).
- **Gate:** a conferência de links (na fase); `git status --short` mostra só `.docs/README.md`.
- **Modelo:** economico
- **Status:** pendente

### T2 [P] Criar o fechamento da Sprint 3

- **O quê:** criar o fechamento da Sprint 3 no modelo da Sprint 2, com placar, tarefas concluídas, tarefas em aberto, riscos e o burndown registrado como pendente.
- **Onde:** `.docs/sprints/sprint3/README.md`. Fonte dos dados:
  - `gh issue list --label "SPRINT 3" --state all`, com a data da conferência como data do retrato;
  - a data em que cada issue entrou na sprint, pela linha do tempo da issue (`gh api repos/Steel-Hard/ProconChat_Jacarei/issues/<n>/timeline`, evento de etiqueta);
  - o motivo do fechamento (`gh api repos/Steel-Hard/ProconChat_Jacarei/issues/<n> --jq .state_reason`);
  - os PRs mergeados na `develop` desde 20/10.
- **Dev:** Megumi (dev-doc)
- **Depende de:** nada
- **Reaproveita:** a estrutura de `.docs/sprints/sprint2/README.md`, incluindo a nota sobre o fuso de Brasília e a seção "Fora da sprint".
- **Atende:** RN-08, RN-11, RN-14, RN-15, RN-18, CA-20, CA-21, CA-22, CA-23, CA-24
- **Pronto quando:**
  - o período é de 20/10 a 23/11/2026, e o retrato tem a data da conferência;
  - o placar soma as issues com a etiqueta `SPRINT 3` seguindo RN-18. A #122 e a #120 aparecem só como "unificada na #121" e "unificada na #118". A #159 é a organização da Feira, sem código. A #18, a #159 e a #164 estão marcadas como entradas no meio da sprint. A #70 está como a issue de fechamento, aberta no retrato;
  - o burndown está registrado como pendente, com o motivo (não há registro de "In progress");
  - os riscos citam as lacunas da T5 e o que ficou de fora (Sessões descartada, Dashboard e exportação não entregues);
  - a seção "Em aberto" já lista o que se sabe e deixa lugar para as issues novas, preenchidas na T6.
- **Teste:** nenhum (documentação).
- **Gate:** cada número do placar conferido contra a lista do GitHub; a conferência de links; `git status --short` mostra só a pasta `sprint3`.
- **Modelo:** padrao
- **Status:** pendente

### T3 [P] Conferir e completar a instalação no README

- **O quê:** deixar a seção de instalação do README igual ao que o sistema usa hoje e validar, sem o modelo de IA, tudo o que não depende dele.
- **Onde:**
  - `README.md`, seção "Instalação" e o bloco de produção no topo. Os README dos serviços são das T9 a T11, e a T3 só aponta para eles por link.

  Para conferir: `compose.yaml`, `compose.prod.yaml`, `.env.example`, `src/backend/README.md`, `src/gateway/README.md`, `src/frontend/README.md`, `.docs/infra/deploy.md` e `.docs/guias/documento-do-software.md` (requisitos medidos).
- **Dev:** Megumi (dev-doc)
- **Depende de:** nada
- **Reaproveita:** a tabela de serviços e a nota sobre a chave de criptografia, que já existem.
- **Atende:** RN-01, RN-02, RN-12, RN-20, CA-02, CA-03, CA-04, CA-05, CA-24, CA-25. O CA-01 é da QA.
- **Pronto quando:**
  - o `git clone` usa o endereço real do repositório, sem marcador;
  - o README diz como abrir o painel (porta 8081) e entrar com a conta Admin, citando os nomes `ROOT_EMAIL` e `ROOT_PASSWORD`, sem os valores;
  - o README avisa sobre o download do modelo de IA (internet e tempo) e aponta onde estão os requisitos de hardware e software;
  - o README lista `src/frontend/README.md` entre os documentos de cada serviço;
  - cada serviço, porta e configuração citados existem com o mesmo nome no Compose e no `.env.example`;
  - a validação do Gate passou;
  - o que não deu para validar sem o modelo de IA fica listado no Status, para a QA.
- **Teste:** nenhum automatizado. A validação é a do Gate, e o teste do zero completo é da QA.
- **Gate:**
  - criar uma worktree nova fora da pasta da tarefa (`git worktree add ../readme-do-zero HEAD --detach`);
  - lá dentro, seguir só o README: copiar `.env.example` para `.env` com `cp`, sem mostrar o conteúdo, e preencher `ENCRYPTION_KEY`;
  - subir só os serviços que não dependem do modelo de IA, com outro nome de projeto e portas que não colidem com outra pilha que esteja rodando: `docker compose -p readme-do-zero up --build postgres migrate seed backend frontend gateway`. Os serviços `ollama` e `llm-pull` não sobem no teste do dev: o teste com o modelo de IA é da QA (RN-20);
  - conferir que esses serviços sobem, que o painel abre e que a entrada com a conta Admin funciona;
  - registrar no Status o que precisou de ajuste;
  - ao fim, `docker compose -p readme-do-zero down -v` e `git worktree remove ../readme-do-zero`;
  - a conferência de links;
  - `git status --short` mostra só `README.md`.
- **Modelo:** padrao
- **Status:** pendente

### T4 [P] Atualizar a arquitetura e o modelo de dados para o estado final

- **O quê:** conferir cada linha da arquitetura e do modelo de dados contra o que está no sistema hoje e trocar "planejado para a Sprint 2 ou 3" pelo estado final: entregue, ou fora da entrega com a situação certa e a issue.
- **Onde:**
  - `.docs/architecture/architecture.md`: cabeçalho, legenda, Componentes, Módulos do Backend, Fluxos, Infraestrutura, Segurança, Stack e "Como a arquitetura atende aos requisitos";
  - `.docs/database/database.md`: os trechos "planejado para a Sprint 3".

  Para conferir:
  - `compose.yaml` e `compose.prod.yaml`;
  - `src/backend/src/`, `src/backend/db/migrations/`, `src/gateway/src/` e `src/frontend/src/navigation/navItemsReady.ts`;
  - `.github/workflows/`;
  - as decisões em `.docs/decisoes/`.
- **Dev:** Megumi (dev-doc)
- **Depende de:** nada
- **Reaproveita:** a estrutura atual dos dois documentos e as decisões 001 a 012.
- **Atende:** RN-04, RN-14, RN-15, RN-16, RN-19, CA-11, CA-12, CA-15, CA-24
- **Pronto quando:**
  - os dois documentos têm a data da conferência, e o cabeçalho da arquitetura lista as issues da Sprint 3;
  - a legenda não tem mais "planejado para a Sprint 2/3";
  - cada ✅ aponta para algo que existe no código;
  - Sessões aparece como "descartada por decisão do grupo" (#72);
  - o Dashboard aparece como não entregue (extra, #71 fechada como não planejada), conforme RN-15;
  - a exportação de relatórios aparece como não entregue, bônus da #73;
  - os pontos da #174 seguem RN-10. O ajuste final de coerência é da T8;
  - a conferência de links não mostra nada.
- **Teste:** nenhum (documentação).
- **Gate:** cada item alterado aponta a sua fonte no código, na migration ou na decisão; a conferência de links; `git status --short` mostra só `architecture.md` e `database.md`.
- **Modelo:** padrao
- **Status:** pendente

### T5 [P] Conferir a rastreabilidade item a item e listar as lacunas

- **O quê:** conferir cada RF, RNF e RP da rastreabilidade contra o que está no sistema hoje, corrigir o que já se resolveu e entregar à orquestradora a lista dos requisitos que de fato estão parciais.
- **Onde:** `.docs/desafio/rastreabilidade.md` (legenda, tabelas, notas 1 a 5, seção RP04 e seção Documentação). Para conferir:
  - o código na `develop`;
  - `.docs/decisoes/`;
  - as issues da Sprint 3 (corpo e comentários, não só o estado);
  - `.docs/lgpd/`;
  - `.docs/guias/`;
  - `.github/workflows/ci.yml` (o job `backend-e2e`, da #18).
- **Dev:** Megumi (dev-doc)
- **Depende de:** nada
- **Reaproveita:** a estrutura em três camadas (Código, Desenho, Situação) e as notas atuais.
- **Atende:** RN-04, RN-05, RN-06, RN-11, RN-14, RN-15, RN-16, RN-17, RN-21, CA-06, CA-07, CA-09, CA-10, CA-12, CA-13, CA-24
- **Pronto quando:**
  - cada linha foi conferida. As que já se resolveram foram corrigidas, citando a fonte: RNF08 com a #18, RNF07 com a #118, RF08 com as #123 a #129, RF06 com a #68 e a #128, RNF02 e RF05 com a decisão 009;
  - RF02, RF03 e RNF01 estão como ⚠️. RF02, RF03 e a nota 1 dizem que a consulta ao professor e ao PROCON sobre os fluxos decisórios ficou "sem resposta até o fechamento", e que o teste com usuários está "sem registro";
  - RNF03 está como ⚠️ pela conferência das citações legais da decisão 002;
  - a legenda explica que o 🔴 do RP04 é um risco, não um requisito;
  - a tabela de corte é o registro oficial (RN-16), com Sessões descartada, Dashboard conforme RN-15 e exportação não entregue (bônus da #73);
  - a nota 4 não fala mais de Sessões "em construção";
  - a orquestradora recebeu a lista de lacunas, em linguagem simples e sem caminho de arquivo nem código, para o usuário ver antes de qualquer issue ser aberta (RN-21). A lista traz RF02, RF03 e RNF01 juntos, RNF03 e outras lacunas que a conferência achar;
  - a lista não traz Sessões nem Dashboard;
  - os itens parciais ficam como ⚠️ "issue a abrir" até a T6.
- **Teste:** nenhum (documentação).
- **Gate:** cada linha cita a sua fonte (issue, decisão, código ou registro escrito); a conferência de links; `git status --short` mostra só `rastreabilidade.md`.
- **Modelo:** padrao
- **Status:** pendente

### T6 Registrar os requisitos parciais com as issues da PO

- **O quê:** trocar cada "issue a abrir" da rastreabilidade pelo número da issue que a PO abriu, e listar essas issues na seção "Em aberto" do fechamento da Sprint 3.
- **Onde:** `.docs/desafio/rastreabilidade.md` e `.docs/sprints/sprint3/README.md` (só "Em aberto").
- **Dev:** Megumi (dev-doc)
- **Depende de:** T2, T5 e a decisão do usuário sobre a lista de lacunas e a etiqueta `SPRINT 3` (U-03). Depois dessa decisão, depende do aviso da orquestradora com os números das issues abertas pela PO. Fica parada até lá.
- **Reaproveita:** a lista de lacunas da T5.
- **Atende:** RN-05, RN-06, RN-17, RN-21, CA-06, CA-08, CA-20
- **Pronto quando:**
  - não há nenhum ❌ nem nenhum "issue a abrir" na rastreabilidade;
  - cada ⚠️ cita uma issue que existe (`gh issue view <n>`);
  - a seção "Em aberto" do fechamento lista as mesmas issues.
- **Teste:** nenhum (documentação).
- **Gate:** `grep -c '❌' .docs/desafio/rastreabilidade.md` dá 0, ou só a ocorrência da legenda; cada issue citada existe; a conferência de links.
- **Modelo:** economico
- **Status:** pendente

### T7 Atualizar no README o status dos requisitos, as tecnologias e o Scrum

- **O quê:** deixar as tabelas de Tecnologias, Scrum e Product Backlog do README iguais à rastreabilidade e ao fechamento da Sprint 3.
- **Onde:** `README.md` (seções Tecnologias, Scrum e Product Backlog, e a nota que aponta só para o fechamento da Sprint 1).
- **Dev:** Megumi (dev-doc)
- **Depende de:** T2, T3 e T5. A T7 não espera a T6: no README, o status "Parcial" não muda quando a issue ganha número.
- **Reaproveita:** a rastreabilidade conferida (T5) e o fechamento da Sprint 3 (T2).
- **Atende:** RN-03, RN-09, RN-14, RN-15, CA-12, CA-16, CA-17, CA-18, CA-24
- **Pronto quando:**
  - cada requisito tem o mesmo status no README e na rastreabilidade. Hoje divergem pelo menos o RNF02 ("Pendente" no README, ⚠️ na rastreabilidade) e o RNF05 ("Pendente" no README, ✅ na rastreabilidade);
  - a linha da Sprint 3 está como concluída, com link para `.docs/sprints/sprint3/README.md`, e o burndown está indicado como pendente;
  - a linha do painel web lista as telas que existem hoje, diz que Sessões foi descartada por decisão do grupo e que o Dashboard não foi entregue, sem "demais telas na Sprint 3";
  - a linha do LLM não diz "ligado ao fluxo na Sprint 3" como algo futuro;
  - a nota abaixo do Product Backlog aponta também para o fechamento da Sprint 3.
- **Teste:** nenhum (documentação).
- **Gate:** a comparação, linha por linha, do status de RF01 a RF08 e RNF01 a RNF08 entre o README e a rastreabilidade não mostra diferença; a conferência de links; `git status --short` mostra só `README.md`.
- **Modelo:** economico
- **Status:** pendente

### T8 Deixar coerentes os trechos que tocam as decisões da #174

- **O quê:** conferir e ajustar, no README, na arquitetura e na rastreabilidade, os trechos sobre os pontos da #174, para que digam o mesmo que as decisões e o que o painel faz hoje.
- **Onde:**
  - `README.md` (linha do painel web);
  - `.docs/architecture/architecture.md` (linhas do painel e da API do painel);
  - `.docs/desafio/rastreabilidade.md` (RF08, nota 4 e a tabela do RP04).
- **Dev:** Megumi (dev-doc)
- **Depende de:** T4, T5 e T7
- **Reaproveita:** as decisões da #174 (RN-10) e o que as T4, T5 e T7 já escreveram.
- **Atende:** RN-10, RN-14, RN-15, CA-11, CA-12, CA-14, CA-16, CA-24
- **Pronto quando:**
  - o menu, a permissão "Ver sessões" e os conflitos em Horários são descritos como o painel faz hoje;
  - a exportação de relatórios aparece como não entregue, bônus da #73;
  - nenhum dos três documentos diz que o Dashboard existe;
  - Sessões aparece como descartada por decisão do grupo;
  - o status de cada requisito continua igual entre o README e a rastreabilidade.

  Se a conferência não achar nada para mudar, isso fica registrado no Status, e não há commit.
- **Teste:** nenhum (documentação).
- **Gate:**
  - cada trecho conferido contra RN-10, RN-14 e RN-15;
  - a comparação de status entre o README e a rastreabilidade sem diferença;
  - a conferência de links;
  - o histórico da branch com um commit por tarefa, sem coautoria (`git log --format=%B develop..HEAD`).
- **Modelo:** economico
- **Status:** pendente

### T9 [P] Conferir o README do backend contra o sistema

- **O quê:** conferir o README do backend do começo ao fim contra o que o backend faz hoje, e corrigir o que estiver desatualizado.
- **Onde:** `src/backend/README.md`. Para conferir:
  - `src/backend/package.json` (comandos);
  - `src/backend/src/` (rotas e módulos);
  - `src/backend/db/` (migrations e seed);
  - `compose.yaml`, `.env.example` e `.github/workflows/ci.yml`.
- **Dev:** Megumi (dev-doc)
- **Depende de:** nada
- **Reaproveita:** a estrutura atual do README.
- **Atende:** RN-12, RN-14, RN-19, CA-24, CA-25, CA-27
- **Pronto quando:**
  - cada comando, rota, variável e serviço citados existem no sistema com o mesmo nome;
  - o que saiu do projeto não aparece como atual;
  - Sessões, Dashboard e exportação de relatórios seguem RN-14, RN-15 e RN-10;
  - o que foi corrigido fica listado no Status.
- **Teste:** nenhum (documentação).
- **Gate:** cada trecho alterado aponta a sua fonte no código; a conferência de links; `git status --short` mostra só `src/backend/README.md`.
- **Modelo:** padrao
- **Status:** pendente

### T10 [P] Conferir o README do gateway contra o sistema

- **O quê:** conferir o README do gateway do começo ao fim contra o que o gateway faz hoje, e corrigir o que estiver desatualizado.
- **Onde:** `src/gateway/README.md`. Para conferir: `src/gateway/package.json`, `src/gateway/src/`, `compose.yaml`, `.env.example` e `.docs/whatsapp/app-de-teste.md`.
- **Dev:** Megumi (dev-doc)
- **Depende de:** nada
- **Reaproveita:** a estrutura atual do README, incluindo a seção sobre a migração da Evolution.
- **Atende:** RN-12, RN-19, CA-24, CA-25, CA-27
- **Pronto quando:**
  - cada comando, porta, variável e serviço citados existem no sistema com o mesmo nome;
  - a Evolution e o Redis aparecem só na seção sobre a migração;
  - o que foi corrigido fica listado no Status.
- **Teste:** nenhum (documentação).
- **Gate:** cada trecho alterado aponta a sua fonte no código; a conferência de links; `git status --short` mostra só `src/gateway/README.md`.
- **Modelo:** padrao
- **Status:** pendente

### T11 [P] Conferir o README do painel web contra o sistema

- **O quê:** conferir o README do painel web do começo ao fim contra o que o painel faz hoje, e corrigir o que estiver desatualizado.
- **Onde:** `src/frontend/README.md`. Para conferir:
  - `src/frontend/package.json`;
  - `src/frontend/src/pages/`;
  - `src/frontend/src/navigation/`;
  - `src/frontend/src/store/api/`;
  - `src/frontend/Dockerfile` e `compose.yaml`.
- **Dev:** Megumi (dev-doc)
- **Depende de:** nada
- **Reaproveita:** a estrutura atual do README.
- **Atende:** RN-10, RN-12, RN-14, RN-15, RN-19, CA-24, CA-25, CA-27
- **Pronto quando:**
  - cada comando, rota, tela e variável citados existem no painel com o mesmo nome;
  - Sessões aparece como descartada por decisão do grupo, e o Dashboard como não entregue;
  - a exportação de relatórios aparece como não entregue, bônus da #73;
  - o que foi corrigido fica listado no Status.
- **Teste:** nenhum (documentação).
- **Gate:** cada trecho alterado aponta a sua fonte no código; `npm run format:check` em `src/frontend` (depois de `npm ci`, se faltar `node_modules`); a conferência de links; `git status --short` mostra só `src/frontend/README.md`.
- **Modelo:** padrao
- **Status:** pendente

## Dúvidas

### Para o product-owner

Nenhuma em aberto. As respostas da PO (P-01 a P-07) foram incorporadas em RN-04, RN-05, RN-08, RN-10 e RN-15 a RN-19.

### Para o usuário

- U-03 O usuário quer ver a lista de lacunas (T5) antes de qualquer issue ser aberta. Duas decisões continuam com ele: quais lacunas viram issue e se essas issues recebem a etiqueta `SPRINT 3`. A resposta muda o placar (T2) e a seção "Em aberto" (T6). A T6 fica parada até lá (RN-21).

### Respostas do usuário

- U-01 Quem faz o teste do zero com o modelo de IA é a QA (Nobara). O dev não precisa fazer esse teste (RN-20).
- U-02 O usuário autorizou o teste do zero com o modelo de IA. Quem roda é a QA (Nobara). A validação da T3 pelo dev segue sem `ollama` e `llm-pull` (RN-20).
- U-04 Tudo entra na #70: o modelo de dados, a linha `.tasks/` e os README de cada serviço, inteiros (RN-19, T9 a T11).
- A #121 ficou sem resposta do professor e do PROCON. RF02, RF03 e a nota 1 registram "sem resposta até o fechamento" (RN-17).
- Sessões (#72) foi descartada de propósito pelo grupo (RN-14).
- A #174 foi decidida (RN-10).

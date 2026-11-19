# ProconChat Jacareí

[![CI](https://github.com/Steel-Hard/ProconChat_Jacarei/actions/workflows/ci.yml/badge.svg?branch=develop)](https://github.com/Steel-Hard/ProconChat_Jacarei/actions/workflows/ci.yml)
[![Deploy](https://github.com/Steel-Hard/ProconChat_Jacarei/actions/workflows/deploy.yml/badge.svg?branch=develop)](https://github.com/Steel-Hard/ProconChat_Jacarei/actions/workflows/deploy.yml)

Produção: <https://3.150.166.93.sslip.io>. Operação e deploy: [`.docs/infra/deploy.md`](.docs/infra/deploy.md).

Documentação do projeto: [`.docs/README.md`](.docs/README.md) (requisitos, decisões, regras das telas,
arquitetura, banco e protótipo do painel).

**Chatbot para Orientação ao Consumidor via WhatsApp**

## Sumário

- [Descrição](#descrição)
- [Objetivos](#objetivos)
- [Tecnologias](#tecnologias)
- [Scrum](#scrum)
- [Product Backlog](#product-backlog)
- [Restrições do Projeto](#restrições-do-projeto)
- [Definition of Done](#definition-of-done)
- [User Stories](#user-stories)
- [Instalação](#instalação)
- [Testes e validação](#testes-e-validação)
- [Documentação](#documentação)
- [Dev Team](#dev-team)
- [Parceiro](#parceiro)
- [Convenções de Commit](#convenções-de-commit)
- [Licença](#licença)

---

## Descrição

O **ProconChat Jacareí** é um projeto acadêmico desenvolvido no 6º
semestre do curso de Desenvolvimento de Software Multiplataforma da
**FATEC Jacareí**, em parceria com o **PROCON --- Fundação de Proteção e
Defesa do Consumidor de Jacareí-SP**.

O projeto tem como tema o desenvolvimento de um **Chatbot para
Orientação ao Consumidor via WhatsApp**.

A proposta é criar um sistema capaz de orientar cidadãos sobre direitos
do consumidor, procedimentos de reclamação, prazos, documentos
necessários e possíveis encaminhamentos. O chatbot deverá conduzir o
usuário por fluxos decisórios definidos pelo PROCON, apresentando
perguntas e opções de forma estruturada e intuitiva.

Ao final da interação, o sistema deverá gerar uma resposta orientadora
consolidada, indicando os próximos passos recomendados ao consumidor.
Quando necessário, essa resposta poderá ser complementada por um
**modelo de linguagem (LLM)** utilizado exclusivamente para geração
textual explicativa, sempre respeitando os limites e informações
definidos pelo PROCON.

> **Importante:** a solução possui caráter exclusivamente orientativo e
> não substitui o atendimento jurídico, administrativo ou formal
> realizado pelo PROCON.

Caso o chatbot não consiga solucionar adequadamente a dúvida do cidadão,
o sistema deverá possibilitar o **agendamento de atendimento
presencial**, orientando também sobre possíveis documentos necessários
para a consulta.

---

## Objetivos

O projeto busca:

- Ampliar o acesso dos cidadãos às informações fornecidas pelo PROCON;
- Reduzir a demanda causada por dúvidas e perguntas recorrentes;
- Orientar o consumidor sem exigir, inicialmente, seu deslocamento até
  a unidade do PROCON;
- Conduzir o usuário por fluxos decisórios previamente definidos;
- Fornecer respostas claras, objetivas e acessíveis;
- Permitir o agendamento presencial quando a orientação automatizada
  não for suficiente;
- Disponibilizar uma interface web para gerenciamento dos atendimentos
  agendados;
- Registrar as interações para permitir análise posterior dos fluxos
  mais utilizados;
- Respeitar os princípios e requisitos da **LGPD** durante o
  tratamento das informações dos usuários.

---

## Tecnologias

Estado do código integrado à `develop`, revisado em **19/11/2026**.

| Camada | Tecnologia | Estado |
|---|---|---|
| Backend e Gateway | Node.js + TypeScript (Express), Vitest | Implementado |
| Banco | PostgreSQL 15, migrations com `node-pg-migrate` | Implementado |
| LLM | Ollama + `llama3.2:3b`, local (RP05: nenhuma API externa de LLM) | Integrado ao fluxo; uso opcional por pergunta, identificação de IA e fallback para a resposta oficial |
| WhatsApp | **WhatsApp Cloud API** oficial | Implementado |
| Painel web | React 19 + Vite + TypeScript, a partir do `template-react` | Login, "Minha conta", Agendamentos, Detalhe, Relatórios básicos, Horários, Documentos, Usuários e WhatsApp implementados; Dashboard, Conteúdo e Sessões pendentes |
| Infraestrutura | Docker Compose, GitHub Actions (CI/CD), VM na nuvem com HTTPS | Implementado |

O LLM reescreve somente a explicação da resposta oficial; as decisões do fluxo continuam no
Motor de Decisão. Quando a IA não pode ser usada, o cidadão recebe a resposta oficial completa.
O ambiente local sobe o Ollama; na VM de produção, o modo padrão documentado é **sem IA**, por
limitação de memória. A geração depende de um Ollama disponível e pode esgotar o tempo limite em CPU.
Veja a [decisão sobre o LLM](.docs/decisoes/009-complemento-por-llm.md) e os
[modos de operação em produção](.docs/infra/deploy.md).

Detalhes da arquitetura em [`.docs/architecture/architecture.md`](.docs/architecture/architecture.md).

---

## Scrum

| Sprint |  Início  |    Fim    |     Status     |          📉 Burndown Chart          | Sprint Backlog/Review |
| :----: | :--------: | :--------: | :-------------: | :----------------------------------: | :-------------------: |
|   1   | 10/08/2026 | 14/09/2026 | 🟢 Concluída | [Ver Gráfico](.docs/sprints/sprint1/burndown.svg) | [Ver](.docs/sprints/sprint1/README.md) |
|   2   | 15/09/2026 | 19/10/2026 | 🟢 Concluída | [Ver Gráfico](.docs/sprints/sprint2/burndown.svg) | [Ver](.docs/sprints/sprint2/README.md) |
|   3   | 20/10/2026 | 23/11/2026 | 🟡 Em andamento | — | — |

> O gráfico e as tabelas de origem do burndown da Sprint 1 estão em
> [`.docs/sprints/sprint1/05-burndown.md`](.docs/sprints/sprint1/05-burndown.md). Os da Sprint 2 (18 de 18
> issues concluídas) estão em [`.docs/sprints/sprint2/burndown.md`](.docs/sprints/sprint2/burndown.md).

A Sprint 3 está em andamento em 19/11/2026, com review final prevista para 23/11/2026.
O backlog e o acompanhamento das tarefas estão no [Project 6DSM](https://github.com/orgs/Steel-Hard/projects/2).

---

## Product Backlog

Os status abaixo refletem o código em 19/11/2026. **Implementado** indica que a funcionalidade
está integrada à `develop`; a homologação com o PROCON e a ativação em produção são etapas distintas.

| Número | Recurso Funcional         |                                  Síntese do Requisito                                  |   Status   |
| :-----: | ------------------------- | :--------------------------------------------------------------------------------------: | :---------: |
|  RF01  | Integração com WhatsApp |         Permitir a integração do usuário por meio de um chatbot no WhatsApp.         | 🟢 Concluído |
|  RF02  | Tabela de Decisões       |       Apresentar opções de resposta com base nos fluxos fornecidos pelo PROCON.       | 🟢 Concluído |
|  RF03  | Fluxos Decisórios        |       Apresentar perguntas e alternativas de maneira sequencial e compreensível.       | 🟢 Concluído |
|  RF04  | Resposta Orientadora      |      Gerar ao final do fluxo um resumo do caso e os próximos passos recomendados.      | 🟢 Concluído |
|  RF05  | Complemento com LLM       | Gerar explicação por LLM local quando permitido pela pergunta, com identificação de IA e fallback oficial. | 🟢 Implementado |
|  RF06  | Registro de Interações  | Registrar eventos e desfechos e oferecer relatórios básicos; telas de Sessões e Dashboard pendentes. | 🟡 Parcial |
|  RF07  | Agendamento Presencial    | Agendar quando a orientação não resolver a dúvida, com cancelamento e remarcação pelo cidadão e horários configuráveis no painel. | 🟢 Implementado |
|  RF08  | Gerenciamento Web         | Gerenciar atendimentos no painel, com calendário, atribuição, observações e cancelamento; Dashboard, Conteúdo e Sessões pendentes. | 🟡 Parcial |

| Número | Recurso Não-Funcional |                                   Síntese do Requisito                                   |   Status   |
| :-----: | ---------------------- | :---------------------------------------------------------------------------------------: | :---------: |
|  RNF01  | Usabilidade            |            Utilizar linguagem clara, objetiva e acessível ao público geral.            | 🟡 Parcial |
|  RNF02  | Disponibilidade        | Healthchecks, reinício dos serviços e fallback implementados; disponibilidade e latência do LLM ainda exigem validação. | 🟡 Parcial |
|  RNF03  | LGPD                   |        Garantir tratamento adequado e proteção das informações dos usuários.        | 🟢 Concluído |
|  RNF04  | Caráter Orientativo   |        Informar explicitamente que as respostas não substituem atendimento formal        | 🟢 Concluído |
|  RNF05  | Transparência LLM     | Identificar a mensagem com "Gerado com auxílio de IA" e registrar o uso na linha do tempo do painel. | 🟢 Implementado |
|  RNF06  | Docker                 |                      Garantir a execução da aplicação em Docker                      | 🟢 Concluído |
|  RNF07  | Documentação         |         Documentar instalação e requisitos necessários de hardware e software.         | 🟢 Concluído |
|  RNF08  | Boas Práticas         | Adotar metodologia ágil, CI/CD, versionamento, testes e documentação técnica mínima. | 🟢 Concluído |

Os fechamentos da [Sprint 1](.docs/sprints/sprint1/README.md) e da
[Sprint 2](.docs/sprints/sprint2/README.md) registram as entregas de cada período.
As [decisões aceitas](.docs/decisoes/README.md) detalham as regras atuais do produto.
Os documentos de arquitetura, rastreabilidade e regras das telas ainda contêm estados de entregas
anteriores; para identificar o que está integrado, confira também o código da `develop`.

---

## Restrições do Projeto

- A integração com o WhatsApp deverá ocorrer preferencialmente pela
  **WhatsApp Business Platform (Cloud API)**;
- Poderão ser utilizados ambientes de teste ou soluções simuladas para
  fins acadêmicos;
- O back-end deverá utilizar tecnologia compatível com aplicações web
  modernas, como Node.js ou Python;
- A arquitetura deverá ser modular, separando:
  - lógica do chatbot;
  - gestão dos fluxos decisórios;
  - integração com modelos de linguagem;
- O escopo deverá ser compatível com o período disponível para
  desenvolvimento durante o semestre;
- **APIs externas de LLM não poderão ser utilizadas**, mesmo quando
  gratuitas;
- O tratamento de dados deverá observar os requisitos da **LGPD**.

---

## Definition of Done

Uma entrega será considerada concluída quando:

- Os requisitos e critérios definidos para a funcionalidade forem
  atendidos;
- O código estiver versionado no repositório do projeto;
- A funcionalidade estiver integrada ao restante da aplicação;
- Os testes aplicáveis tiverem sido executados;
- A documentação relacionada estiver atualizada;
- A entrega estiver disponível em ambiente Docker quando aplicável.

---

## User Stories

As tarefas e seus critérios de aceitação são acompanhados nas
[issues do repositório](https://github.com/Steel-Hard/ProconChat_Jacarei/issues) e no
[Project 6DSM](https://github.com/orgs/Steel-Hard/projects/2), com base nos
[requisitos do desafio](.docs/desafio/desafio-6dsm-2026-2.md), nos fluxos fornecidos pelo PROCON
e nas [decisões de produto](.docs/decisoes/README.md).

---

## Instalação

### Pré-requisitos

- Git para clonar o repositório;
- [Docker](https://docs.docker.com/get-docker/) em execução e Docker Compose v2 (`docker compose`, sem hífen);
- Para o modelo padrão em CPU, a referência do projeto recomenda pelo menos 8 GB de RAM no computador
  e cerca de 2 GB em disco para o modelo, além das imagens e dos dados dos serviços.
  Veja [requisitos e medições do LLM](.docs/llm/modelo.md).

Node.js, PostgreSQL e Ollama rodam nos containers. Node.js 24 é necessário no host apenas para
desenvolver ou executar os testes fora do Docker; no frontend, siga a versão de `src/frontend/.nvmrc`.

### 1. Clonar e preparar a configuração

```bash
git clone --branch develop https://github.com/Steel-Hard/ProconChat_Jacarei.git
cd ProconChat_Jacarei
```

Copie o arquivo de exemplo. No Bash:

```bash
cp .env.example .env
```

No PowerShell:

```powershell
Copy-Item .env.example .env
```

### 2. Preencher a chave e revisar o `.env`

Gere uma chave usando apenas o Docker, no Bash ou no PowerShell:

```text
docker run --rm node:24-alpine node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

Copie os 64 caracteres hexadecimais gerados para `ENCRYPTION_KEY=` no `.env` antes de subir
os serviços. Se já tiver OpenSSL, `openssl rand -hex 32` também gera uma chave válida.
Sem essa variável, o Compose recusa a inicialização com `defina ENCRYPTION_KEY no .env`.

A chave cifra as credenciais da Meta e o telefone de contato dos agendamentos. Depois que houver
dados cifrados, mantenha a mesma chave; consulte
[como trocar a `ENCRYPTION_KEY`](src/backend/README.md#trocar-a-encryption_key) para os cuidados necessários.

Revise `ROOT_EMAIL` e `ROOT_PASSWORD`, usados para criar a conta Admin no primeiro seed.
Os demais valores de exemplo atendem ao desenvolvimento local. Ao mudar `BACKEND_PORT`, ajuste
também `VITE_API_URL`, pois ela é incorporada ao build do frontend.

### 3. Subir o ambiente

```bash
docker compose up --build -d
```

Na primeira execução, aguarde os builds, as migrations, o seed e o download do modelo.
O Compose local sobe os seguintes serviços:

| Serviço         | Papel                                                              | Porta padrão (host) |
| --------------- | ------------------------------------------------------------------- | :------------------: |
| `postgres`      | Banco de dados (persistência via volume `postgres_data`)           |    `127.0.0.1:5433`    |
| `migrate`       | Aplica as migrations e encerra (`node-pg-migrate`)                  |           —           |
| `seed`          | Carrega o conteúdo, a configuração inicial, a conta Admin e a configuração do WhatsApp, e encerra |           —           |
| `backend`       | API/orquestrador (Motor de Decisão, agenda, API do painel)          |    `127.0.0.1:3000`    |
| `frontend`      | Painel web da equipe (nginx)                                        |    `127.0.0.1:8081`    |
| `gateway`       | Gateway WhatsApp — recebe o webhook e fala com o `backend`         |    `127.0.0.1:3001`    |
| `ollama`        | LLM local (modelo definido por `LLM_MODEL` no `.env`)               |           —           |
| `llm-pull`      | Baixa o modelo do Ollama e encerra                                  |           —           |

As variáveis sensíveis vêm do `.env`, que não deve ser versionado. O `compose.yaml` oferece padrões
de desenvolvimento para algumas delas e exige `ENCRYPTION_KEY`. A produção usa `compose.prod.yaml`
e possui configuração própria, descrita no [guia de deploy](.docs/infra/deploy.md).

### 4. Conferir os serviços e acessar o painel

```bash
docker compose ps --all
docker compose logs --tail=100 backend gateway llm-pull
```

`migrate`, `seed` e `llm-pull` são tarefas de execução única: terminar com código **0** é esperado.
Os endereços abaixo usam as portas padrão do `.env.example`:

- Painel: <http://localhost:8081>;
- Saúde do backend: <http://localhost:3000/health>;
- Saúde do gateway: <http://localhost:3001/health>.

Entre no painel com `ROOT_EMAIL` e `ROOT_PASSWORD` definidos no `.env`. Esses valores criam o Admin
somente quando a conta ainda não existe; alterá-los depois não redefine a conta.
Para recuperar o acesso, veja a [redefinição da senha do Admin](src/backend/README.md#conta-admin-e-redefinição-da-senha).

Abra o painel usando `localhost`: trocar por `127.0.0.1` muda a origem aceita pela API.
Os detalhes de autenticação local estão no [README do frontend](src/frontend/README.md#autenticação-no-cliente).

### Configurar o WhatsApp

Para conversar pelo WhatsApp, configure as credenciais da Cloud API e um webhook HTTPS acessível
pela Meta. Siga o [guia do app de teste](.docs/whatsapp/app-de-teste.md) e o
[README do gateway](src/gateway/README.md). O painel e suas APIs podem ser iniciados antes dessa integração.

---

## Testes e validação

Para executar as verificações fora do Docker, use Node.js 24 e rode `npm ci` dentro de cada serviço.
No frontend, use a versão indicada por `src/frontend/.nvmrc`. Execute os comandos da tabela no
diretório correspondente; eles seguem as verificações do [CI](.github/workflows/ci.yml).

| Diretório | Verificações |
|---|---|
| `src/frontend` | `npm run format:check`, `npm run lint`, `npm run build`, `npm run test:run` |
| `src/backend` | `npm run lint`, `npm run build`, `npm run typecheck:test`, `npm test` |
| `src/gateway` | `npm run lint`, `npm run build`, `npm test` |

O backend também oferece `npm run test:integration` e `npm run test:db`. Use um **banco de testes
separado**, com as migrations aplicadas, para a integração. O verificador de migrations usa
`DB_TEST_URL` e precisa de permissão para criar bancos temporários. A preparação está no
[README do backend](src/backend/README.md#como-rodar).

---

## Documentação

- [`.docs/database/migrations.md`](.docs/database/migrations.md) — schema, migrations e como resetar o banco.
- [`src/backend/README.md`](src/backend/README.md) — rodar o backend fora do Docker, rotas disponíveis, testes.
- [`src/frontend/README.md`](src/frontend/README.md) — desenvolver o painel, configurar a API e executar testes e verificações.
- [`src/gateway/README.md`](src/gateway/README.md) — subir e validar o Gateway WhatsApp com a Cloud API.
- [`.docs/llm/contrato.md`](.docs/llm/contrato.md) — contrato de entrada/saída do serviço LLM.
- [`.docs/README.md`](.docs/README.md) — índice de toda a documentação: requisitos, decisões, regras das telas e protótipo.

---

## Dev Team

|                 Nome                 |   Função   |                     GitHub                     |
| :----------------------------------: | :-----------: | :--------------------------------------------: |
| Cláudio dos Santos Siqueira Júnior |   Dev Team   |    [GitHub](https://github.com/claudsaints)    |
|        Lucas Roque Alvim Cruz        |   Dev Team   |     [GitHub](https://github.com/lucasroqe)     |
|        Luiz Felipe dos Santos        | Scrum Master |    [GitHub](https://github.com/felipe-sant)    |
| Maurício Oliveira Medeiros Cepinho | Product Owner |     [GitHub](https://github.com/maucepinho)     |
|           Nícolas Aquino           |   Dev Team   |      [GitHub](https://github.com/Nickaqui)      |
|      Victor Hugo Dantas Carbajo      |   Dev Team   | [GitHub](https://github.com/Victor-Carbajo-DSM) |
|  Vitor Francisco de Azevedo Zonzini  |   Dev Team   |      [GitHub](https://github.com/frevisto)      |

## Parceiro

**PROCON --- Fundação de Proteção e Defesa do Consumidor de Jacareí-SP**

Projeto desenvolvido como parte da metodologia de **Aprendizagem Baseada
em Projetos (ABP)** do 6º semestre de Desenvolvimento de Software
Multiplataforma da **FATEC Jacareí**.

---

## Convenções de Commit

Os padrões de branch, commit e Pull Request estão em
[`CONTRIBUTING.md`](CONTRIBUTING.md).

---

## Licença

Distribuído sob a licença Apache 2.0. Veja [`LICENSE`](LICENSE).

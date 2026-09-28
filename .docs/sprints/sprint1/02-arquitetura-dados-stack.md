# Sprint 1 · Arquitetura, modelo de dados e stack

> Parte do [fechamento da Sprint 1](README.md). Retrato de como o sistema estava em 14/09/2026. Decisões posteriores estão em [`../../decisoes/`](../../decisoes/).

## 4. Arquitetura

### 4.1 Componentes

Não são serviços 1:1 — são responsabilidades separadas conforme RP03 (modularidade).

| Componente | Papel | Container próprio? | Estado |
|---|---|---|---|
| **Gateway WhatsApp** | Canal de entrada/saída de mensagens com o cidadão. Recebe webhooks da Evolution API, extrai telefone e texto, chama o Backend e devolve a resposta ao usuário | Sim (`gateway`) | Implementado |
| **Backend API (orquestrador)** | Identifica a sessão, coordena o fluxo e monta a mensagem final | Sim (`backend`) | Implementado |
| ↳ **Motor de Decisão** (módulo interno do Backend) | Lê categorias/perguntas do banco e decide a navegação do fluxo | Não — módulo de código | Implementado e ligado ao fluxo |
| ↳ **Scheduler / Agendamento** (módulo interno do Backend) | Aciona quando o fluxo não resolve a dúvida (RF07) | Não — módulo de código | **Não implementado** |
| **LLM Service** | Ollama + modelo local pequeno; gera **só** o texto explicativo final, nunca decide o fluxo | Sim (`ollama` + `llm-pull`) | Implementado, não plugado ao fluxo |
| **Interface Web Admin** | Painel autenticado da equipe do PROCON (login único, sem RBAC — RF12) | Planejado | **Não implementado** |
| **PostgreSQL** | Persistência única, compartilhada entre chatbot e admin | Sim (`postgres`) | Implementado |

### 4.2 Relações entre os componentes

- `Gateway WhatsApp` ⟷ `Backend API`
- `Interface Web Admin` ⟷ `Backend API` (planejado)
- `Backend API` → `LLM Service` (seta única, de ida)
- `Backend API` → `PostgreSQL`

Todos dentro do agrupamento `Docker Compose (RNF06)`.

### 4.3 Decisões de arquitetura registradas

**Por que o Motor de Decisão fica dentro do Backend e não em container separado:**

- é leve, síncrono e só lê dados do banco — não há custo computacional que justifique isolar;
- evita latência extra de chamada de rede a cada mensagem;
- RP03 pede modularidade **lógica** (organização do código), não necessariamente infraestrutura separada;
- só o LLM Service compensa o isolamento, por carregar um modelo inteiro em memória.

**Como a arquitetura garante RP05/RF05 (LLM não decide o fluxo):** o LLM Service não tem nenhuma conexão de volta ao Gateway, ao Admin ou ao PostgreSQL, e não recebe estado de sessão. A única seta que chega até ele parte do Backend, já com o resumo estruturado que o Motor de Decisão produziu. Ele não tem acesso a categorias/perguntas do banco nem à sessão do usuário — portanto não tem como decidir para onde a conversa vai.

**Por que a persistência de sessão é exclusiva do Backend:** o Gateway **não** tem acesso ao Postgres nem ao segredo de hash (`PHONE_HASH_SECRET`). Ele recebe o webhook, extrai o telefone em texto puro do JID e chama `POST /api/v1/whatsapp/sessions` no Backend (autenticado por `X-Internal-Token` / `GATEWAY_INTERNAL_TOKEN`). É o Backend que hasheia e persiste. Isso concentra o tratamento do dado pessoal em um único lugar (RNF03).

### 4.4 Fluxo de uma conversa (desenho formal)

1. Usuário manda mensagem → Gateway recebe via webhook.
2. Gateway repassa ao Backend, que identifica a sessão pelo hash do telefone.
3. Backend consulta o Motor de Decisão → retorna as opções do nó atual.
4. Repete até o fim do fluxo.
5. No nó final: Backend monta o resumo estruturado → LLM Service só "traduz" isso em texto natural (RF05). *(etapa 5 ainda não ligada ao fluxo real)*
6. Se não resolveu: aciona o Scheduler e cria o agendamento (RF07). *(etapa 6 não implementada)*
7. Toda interação é logada localmente no banco (RF06), sem depender do histórico do WhatsApp. *(etapa 7 não implementada)*

---

## 5. Modelo de dados

Persistência única em PostgreSQL. As tabelas vivem em dois lugares mantidos em sincronia: `src/backend/db/schema/` (SQL de referência por tabela) e `src/backend/db/migrations/` (migrations numeradas aplicadas via `node-pg-migrate`).

### 5.1 Tabelas

| Tabela | O que guarda | Pontos relevantes |
|---|---|---|
| **Categories** | As categorias do fluxo decisório (7 no total) | `active BOOLEAN` implementa RF11 — desativar sem excluir, preservando o histórico de interações |
| **Questions** | Um item do fluxo dentro de uma categoria; corresponde a um item do FAQ do PROCON | Campos espelham 1:1 o FAQ real: `question`, `legal_basis`, `answer`, `requires_in_person`, `in_person_note`, `out_of_scope`, `active` |
| **RequiredDocuments** | Documentos exigidos por uma pergunta (0..N) | Ligada a `Questions` por `question_id` |
| **Users** | Conta de acesso ao painel admin | **Sem coluna de papel/role** — decisão do grupo (RF12): um único nível de permissão para toda a equipe |
| **Sessions** | Uma conversa no WhatsApp, do início ao fim do fluxo | Ver seção 5.2 (LGPD) e 5.3 (estado de navegação) |
| **Interactions** | Registro estruturado de cada passo do fluxo, local e independente do histórico do WhatsApp (RF06/RF14) | `answered_via_llm` sustenta a rastreabilidade exigida por RNF05. **Tabela criada, mas nada escreve nela ainda** |
| **Appointments** | Atendimento presencial acionado quando o fluxo não resolve (RF07) | CPF guardado como `cpf_hash`; `name` em texto puro porque a equipe precisa identificar a pessoa visualmente. **Tabela criada, sem fluxo que a alimente** |

### 5.2 Decisão central de LGPD: `phone_hash`

A tabela `Sessions` guarda o telefone do cidadão em `phone_hash VARCHAR(64)` (indexado), **nunca em texto puro**. Isso atende RNF03 diretamente na camada de persistência, antes de qualquer consulta pelo Admin. O mesmo mecanismo é usado para `cpf_hash` em `Appointments`: o CPF chega em texto puro ao Backend e é hasheado no momento de persistir.

Consequência prática: o `CHECK` de formato de CPF (`^[0-9]{11}$`) foi removido, já que o valor guardado deixa de ser o CPF (11 dígitos) e passa a ser o hash dele — a validação de formato passa a ser responsabilidade da camada de aplicação, antes de hashear.

**Limite honesto:** `phone_hash` sozinho não é conformidade total. A política de retenção/anonimização (RNF09) — por quanto tempo a sessão é mantida e quando o hash é descartado — **ainda não foi definida**.

### 5.3 Índices e colunas adicionados por migration

| Migration | O que adiciona | Por quê |
|---|---|---|
| `08_add_sessions_active_unique_index.sql` | `UNIQUE INDEX uniq_sessions_phone_in_progress` sobre `phone_hash` onde `status = 'IN_PROGRESS'` | Garante uma única sessão ativa por telefone e torna idempotente a criação de sessão — entregas repetidas do mesmo evento do Gateway reaproveitam a sessão em vez de duplicar |
| `09_add_sessions_navigation_state.sql` | `current_step session_step` e `current_category_id` | Guardam o estado de navegação da conversa; o Motor de Decisão é stateless por design, então o estado vive na linha da sessão |

Migrations aplicadas: `01_create_users` … `09_add_sessions_navigation_state` (9 no total), rodadas pelo serviço `migrate` do compose (`npm run db:migrate`).

### 5.4 Conteúdo real carregado

O banco é populado com o FAQ real do PROCON: **7 categorias e ~47 itens** transcritos do documento `Dúvidas Frequentes.odt` enviado pelo parceiro, via `npm run db:seed` (serviço `seed` do compose).

As 7 categorias definidas pelo grupo:

1. Cobrança/Desconto Indevido
2. Contrato
3. Direito de Arrependimento (7 dias)
4. Vício/Defeito de Produto ou Serviço
5. Garantias
6. Cumprimento de Oferta/Preço
7. Outros/Procedimentos Gerais

**Decisão registrada:** o grupo optou por **fluxo por categorias** no Motor de Decisão (não busca semântica livre em texto), justamente para atender RF02/RF03, que pedem navegação guiada.

### 5.5 Pendências do modelo de dados

- Formalizar RNF09 (retenção/anonimização de `phone_hash` e `cpf_hash`).
- Avaliar ligar `Appointments` a `Interactions` via `interaction_id`. Hoje um agendamento é um registro isolado, identificável só por `cpf_hash`/nome — não guarda de qual conversa, categoria ou pergunta se originou. Com essa coluna, a equipe veria todo o histórico da conversa ao abrir um agendamento no admin.

---

## 6. Stack tecnológica

### 6.1 Visão geral

| Camada | Tecnologia | Observação |
|---|---|---|
| Backend API | Node.js + TypeScript (Express 5) | Padrão Controller → Service → Route (+ Repository no Motor de Decisão) |
| Gateway WhatsApp | Node.js + TypeScript (Express 5) | App própria em `src/gateway/`, mesmo padrão do Backend, Dockerfile próprio |
| Banco | PostgreSQL 15 (driver `pg`, migrations via `node-pg-migrate`) | Persistência única |
| Cache / fila | Redis 7 | Usado pela Evolution API |
| Integração WhatsApp | Evolution API `v2.3.7` (self-hosted) | Automação do WhatsApp Web; por baixo usa Baileys |
| LLM local | Ollama + `llama3.2:3b` (Q4_K_M) | Container próprio; RP05 proíbe LLM externo |
| Testes | Vitest + supertest | Testes co-localizados `<arquivo>.test.ts` (nunca `__tests__/`); sem gate de cobertura mínima |
| Orquestração | Docker Compose (RNF06) | `compose.yaml` único na raiz |
| Admin | React ou server-rendered simples | Ainda não decidido em detalhe |

### 6.2 Serviços do `compose.yaml`

| Serviço | Imagem / build | Porta exposta (host) | Papel |
|---|---|---|---|
| `postgres` | `postgres:15-alpine` | `127.0.0.1:5433` | Banco único |
| `migrate` | build de `src/backend` | — | One-shot: roda as migrations e sai |
| `seed` | build de `src/backend` | — | One-shot: popula o FAQ real do PROCON |
| `backend` | build de `src/backend` | `127.0.0.1:3000` | API orquestradora, com healthcheck em `/health` |
| `redis` | `redis:7-alpine` | `6379` | Cache da Evolution API |
| `evolution-api` | `evoapicloud/evolution-api:v2.3.7` | `8080` | Integração com o WhatsApp |
| `gateway` | build de `src/gateway` | `3001` | Webhook da Evolution + envio de respostas |
| `ollama` | `ollama/ollama:latest` | — (rede interna) | Serve o modelo LLM |
| `llm-pull` | `ollama/ollama:latest` | — | One-shot: baixa o modelo definido em `LLM_MODEL` |

Ordem de dependência garantida por healthchecks e `service_completed_successfully`: `postgres` → `migrate` → `seed` → `backend` → `gateway`.

### 6.3 Padrões do Backend / Gateway

- Hierarquia de erros (`AppError` + subclasses por status HTTP) e middleware de error-handler central.
- Middleware de request-logger com `X-Request-Id` no header de resposta.
- Validação fail-fast de variáveis de ambiente na inicialização.
- Graceful shutdown em `SIGTERM`/`SIGINT`.
- Rotas de recurso sob `/api/v1` — exceto `/health`, que fica fora do prefixo de versão de propósito.
- Suite de testes unitários (`npm test`) e uma suite de integração separada (`vitest.integration.config.mts`).
- **Sem comentários no código** — clareza vem dos nomes e dos testes (convenção do projeto).

### 6.4 Contrato do LLM Service e desempenho medido

**Entrada:** o Backend serializa um `RespostaFinalOutput` (`categoria`, `pergunta`, `base_legal`, `resposta`, `documentos_necessarios[]`, `requer_presencial`, `fora_de_escopo`) embutido em um prompt de instrução fixo, enviado a `POST http://ollama:11434/api/generate` com `"stream": false`.

**Saída:** apenas o campo `response` — uma string de texto simples. O LLM **não deve** devolver, alterar ou reprocessar `requer_presencial`, `fora_de_escopo` ou `documentos_necessarios`; essas decisões já vieram prontas do Motor de Decisão (RP05/RF05).

**Fallback:** a ausência de resposta do LLM não pode travar o fluxo. `gerarExplicacaoLlm` nunca lança — qualquer falha do cliente vira `{ explicacaoLlm: null, geradoPorLlm: false }`, e `fora_de_escopo: true` pula a chamada ao LLM inteiramente. O campo `resposta` do Motor de Decisão já é utilizável por si só.

**Desempenho medido em teste real (CPU, sem GPU):**

| Cenário | `total_duration` | `eval_duration` | Tokens gerados | Tokens/s |
|---|---|---|---|---|
| Sem limite, modelo frio | ~38,35 s | ~23,35 s | 159 | ~6,8 |
| `num_predict: 100`, modelo aquecido (`keep_alive`) | ~23,55 s | ~14,96 s | 100 | ~6,7 |

**Avaliação honesta:** ~32 s para uma resposta completa é alto demais para uma conversa em tempo real no WhatsApp (RNF02). `keep_alive` elimina o custo de recarregar o modelo (~5 s por chamada, ganho sem tradeoff) e `num_predict` reduz o tempo proporcionalmente aos tokens — mas **a taxa de tokens/s não muda**: só GPU muda isso. Fica registrado como risco para quando o LLM for plugado ao fluxo.

**Requisitos de hardware do modelo (`llama3.2:3b`, Q4_K_M):**

| Recurso | Apenas CPU (RAM) | Com GPU (VRAM) |
|---|---|---|
| Consumo do modelo | ~2,0 GB | ~2,0 GB |
| Folga para contexto | +1,0 a 1,5 GB | +1,0 a 1,5 GB |
| Mínimo recomendado | 8 GB de RAM | 4 GB de VRAM (ex.: GTX 1650 / RTX 3050) |

Em disco, o modelo ocupa ~2 GB.

### 6.5 Pesquisa de integração com o WhatsApp (RP01)

| Critério | Cloud API oficial (Meta) | Simulador acadêmico | **Evolution API (adotada)** |
|---|---|---|---|
| Aprovação/cadastro | Meta Business + app | Nenhuma (não usa WhatsApp real) | Nenhuma (QR Code) |
| Custo | Gratuito no tier de teste | Zero | Gratuito (self-hosted), custo de manter linha telefônica |
| Risco de banimento | Nenhum (canal oficial) | Nenhum | **Real** — automação não oficial do WhatsApp Web |
| Esforço de setup | Médio (cadastro Meta) | Alto (nada pronto, construir do zero) | Baixo (Docker + QR Code) — já feito |
| Webhook | `GET` de verificação + HMAC | A definir | `messages.upsert` e afins, sem handshake |
| Mensagens interativas (listas/botões) | Suporte nativo | A definir | Parcial/instável, não validado |
| Estado atual | Não implementado | Não implementado | **Implementado e testado** |

**Por que a Cloud API oficial não foi adotada:** a equipe tentou o cadastro no programa de Desenvolvedores da Meta e esbarrou no bloqueio de que números já inscritos no WhatsApp não são aceitos. **Nota crítica registrada na própria pesquisa:** a Meta oferece um número de teste virtual e gratuito justamente para evitar esse problema — o bloqueio provavelmente veio de tentar cadastrar um número pessoal já ativo. **Essa rota não foi esgotada.**

**Recomendação registrada:** manter a Evolution API para a Sprint 1 / MVP acadêmico (já implementada e testada, trocar agora custaria mais tempo que o risco). Mas antes de qualquer entrega com uso real por cidadãos do PROCON, a decisão precisa ser reaberta, porque a Evolution API viola os Termos de Serviço do WhatsApp e carrega risco real de banimento do número conectado, sem aviso prévio.

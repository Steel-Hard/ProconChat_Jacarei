# Sprint 1 · Issues e pull requests

> Parte do [fechamento da Sprint 1](README.md). Escopo planejado × entregue, distribuição do trabalho e todos os PRs do período.

## 8. Escopo planejado vs. entregue

### 8.1 Situação de todas as issues

> **Nota de limitação:** não foi possível consultar o status fino do board do GitHub Project (`Backlog`/`Ready`/`In progress`/`In review`/`Done`). Tanto `gh project item-list 2 --owner Steel-Hard` quanto a consulta GraphQL equivalente falharam de forma persistente neste ambiente (`unknown owner type` e erro de conexão com `api.github.com`). A coluna abaixo usa **apenas** o estado aberto/fechado retornado por `gh issue list`, que foi obtido com sucesso.

| # | Título | Estado | Criada | Fechada | Responsável | Label |
|---|---|---|---|---|---|---|
| #2 | Estruturar as Tasks iniciais da Sprint 1 (meta-issue) | ✅ Fechada | 2026-08-31 | 2026-09-01 | felipe-sant | documentation |
| #3 | Pesquisa do bot do WhatsApp | ✅ Fechada | 2026-09-01 | 2026-09-07 | frevisto | documentation |
| #4 | Entrega do Gateway WhatsApp | ✅ Fechada | 2026-09-01 | 2026-09-07 | lucasroqe | enhancement |
| #5 | Estruturação do Backend base | ✅ Fechada | 2026-09-01 | 2026-09-01 | felipe-sant | enhancement |
| #6 | Implementar Docker / Docker Compose | ✅ Fechada | 2026-09-01 | 2026-09-14 | felipe-sant | enhancement |
| #7 | Criar um serviço LLM | ✅ Fechada | 2026-09-01 | 2026-09-07 | claudsaints | enhancement |
| #8 | Criar a arquitetura | ✅ Fechada | 2026-09-01 | 2026-09-01 | felipe-sant | documentation |
| #9 | Criar o esquema de database | ✅ Fechada | 2026-09-01 | 2026-09-02 | felipe-sant | documentation |
| #10 | Criar convenções de Git | ✅ Fechada | 2026-09-01 | 2026-09-01 | felipe-sant | documentation |
| #11 | Banco de Dados (migrations + Docker) | ✅ Fechada | 2026-09-01 | 2026-09-07 | maucepinho | enhancement |
| #12 | Popular banco com conteúdo real | ✅ Fechada | 2026-09-01 | 2026-09-08 | felipe-sant | enhancement |
| #13 | Implementar Motor de Decisão | ✅ Fechada | 2026-09-01 | 2026-09-07 | Nickaqui | enhancement |
| #14 | Integração Gateway WhatsApp ↔ Backend | ✅ Fechada | 2026-09-01 | 2026-09-08 | felipe-sant | enhancement |
| #15 | Integração Backend ↔ LLM Service | ✅ Fechada | 2026-09-01 | 2026-09-08 | felipe-sant | enhancement |
| #16 | Registro de interações (log básico) | 🟡 **Aberta** | 2026-09-01 | — | — | enhancement |
| #17 | Avisos obrigatórios no fluxo | ✅ Fechada | 2026-09-01 | 2026-09-14 | — | enhancement |
| #18 | Teste end-to-end do fluxo mínimo | 🟡 **Aberta** | 2026-09-01 | — | felipe-sant | documentation |
| #19 | Figma da interface Web (Admin) | 🟡 **Aberta** | 2026-09-01 | — | vcarbajo-dsm | documentation |
| #23 | Introduzir Repository pattern quando existir CRUD real | 🟡 **Aberta** | 2026-09-01 | — | — | enhancement |
| #24 | Validação de schema (zod) no body/query | 🟡 **Aberta** | 2026-09-01 | — | — | enhancement |
| #38 | EvolutionApi não gera QR Code | ✅ Fechada | 2026-09-12 | 2026-09-12 | claudsaints | bug |
| #40 | Mensagens duplicadas / respostas fora de ordem no fluxo | ✅ Fechada | 2026-09-12 | 2026-09-12 | claudsaints | — |
| #42 | Mensagens não entregues a contatos migrados para `@lid` | 🟡 **Aberta** | 2026-09-14 | — | — | bug |

> Os números #20, #21, #22 e #25-#37, #39, #41, #43, #44 são **Pull Requests**, não issues — ver seção 10.

**Placar da Sprint 1:** 23 issues criadas, **17 fechadas**, **6 abertas** (#16, #18, #19, #23, #24, #42).

### 8.2 Leitura do que ficou de fora

| Issue aberta | Por que não fechou | Gravidade |
|---|---|---|
| #16 — Registro de interações | Nada grava na tabela `Interactions` ainda; o fluxo funciona sem isso, mas **RF06 fica descoberto** | Alta — é requisito funcional do desafio |
| #18 — Teste end-to-end do fluxo mínimo | Dependia de #14, #15, #16. A demonstração manual real foi feita (seção 9.6), mas o teste automatizado ponta a ponta e o registro formal da issue não | Média — o critério de "chatbot viável" foi atingido na prática, falta formalizar |
| #19 — Figma da interface Web (Admin) | Não iniciado; sem dependências, é trabalho de design | Média — bloqueia RF08 na Sprint 2 |
| #23 — Repository pattern em CRUD real | Follow-up técnico da #5, intencionalmente adiado até existir CRUD real | Baixa — dívida técnica planejada |
| #24 — Validação de schema (zod) | Follow-up técnico da #5, intencionalmente adiado até existir endpoint real com body complexo | Baixa — dívida técnica planejada |
| #42 — Bug `@lid` | **Causa raiz fora do nosso controle** (bug upstream em Baileys/Evolution API); nenhuma decisão de caminho tomada ainda | Alta — bloqueia entrega em produção |

### 8.3 Distribuição de trabalho na equipe

Atribuições registradas nas issues (podem divergir das atribuições informais do backlog original):

| Pessoa (login) | Issues atribuídas |
|---|---|
| felipe-sant | #2, #5, #6, #8, #9, #10, #12, #14, #15, #18 |
| claudsaints | #7, #38, #40 |
| lucasroqe | #4 |
| frevisto | #3 |
| maucepinho | #11 |
| Nickaqui | #13 |
| vcarbajo-dsm | #19 |

---

## 10. Pull Requests da Sprint 1

### 10.1 Todos os PRs

| # | Título / assunto | Estado | Criado | Mergeado | Base ← Head |
|---|---|---|---|---|---|
| #1 | Atualização Readme | Mergeado | 2026-08-10 | 2026-08-10 | `main` ← `maucepinho-patch-1` |
| #20 | [#10] Convenções de commit, PR e criação de issue | Mergeado | 2026-09-01 | 2026-09-01 | `dev` ← `chore/10-convencoes-git` |
| #21 | Convenções de Git (duplicado) | **Fechado sem merge** | 2026-09-01 | — | `main` ← `chore/10-convencoes-git` |
| #22 | [no-task] Adiciona documento do desafio | Mergeado | 2026-09-01 | 2026-09-01 | `develop` ← `doc/no-task-adicionando-doc-do-desafio` |
| #25 | [#5] Estruturação do Backend base | Mergeado | 2026-09-01 | 2026-09-01 | `develop` ← `feat/5-backend-base` |
| #26 | [#8] Formaliza e commita a arquitetura | Mergeado | 2026-09-01 | 2026-09-01 | `develop` ← `doc/8-formalizar-arquitetura` |
| #27 | [#9] Criar esquema de database | Mergeado | 2026-09-02 | 2026-09-02 | `develop` ← `feat/9-esquema-database` |
| #28 | [#13] Navegação por categoria/pergunta no Motor de Decisão | Mergeado | 2026-09-05 | 2026-09-07 | `develop` ← `motor-de-decisao` |
| #29 | Evolution API | Mergeado | 2026-09-06 | 2026-09-07 | `develop` ← `evolution` |
| #30 | [#11] Migrations e PostgreSQL via Docker | Mergeado | 2026-09-07 | 2026-09-07 | `develop` ← `feat/11-banco-de-dados` |
| #31 | [#3] Pesquisa de integração com o WhatsApp | Mergeado | 2026-09-07 | 2026-09-07 | `develop` ← `docs/3-pesquisa-gateway-whatsapp` |
| #32 | [#7] Define modelo LLM (Ollama) e sobe container | **Fechado sem merge** | 2026-09-07 | — | `develop` ← `claudsaints` |
| #33 | [#7] Integra serviço LLM (Ollama) ao compose único | Mergeado | 2026-09-07 | 2026-09-07 | `develop` ← `feat/7-servico-llm` |
| #34 | [#6] Documenta instalação/Docker no README | Mergeado | 2026-09-07 | 2026-09-07 | `develop` ← `docs/6-documentacao-docker` |
| #35 | [#12] Popular banco com conteúdo real do FAQ do PROCON | Mergeado | 2026-09-08 | 2026-09-08 | `develop` ← `feat/12-popular-banco-conteudo-real` |
| #36 | [#15] Integração Backend ↔ LLM Service | Mergeado | 2026-09-08 | 2026-09-08 | `develop` ← `feat/15-integracao-backend-llm` |
| #37 | [#14] Integração Gateway WhatsApp ↔ Backend | Mergeado | 2026-09-08 | 2026-09-08 | `develop` ← `feat/14-integracao-gateway-backend` |
| #39 | EvolutionApi não gera QR Code (correção de versão e env) | Mergeado | 2026-09-12 | 2026-09-12 | `develop` ← `evolution` |
| #41 | Correção de mensagens duplicadas e falta de resposta da LLM | Mergeado | 2026-09-12 | 2026-09-12 | `develop` ← `evolution` |
| **#43** | **[#17] Aviso de caráter não vinculante (RNF04) na resposta final** | **Mergeado** | **2026-09-14** | **2026-09-14** | `develop` ← `feat/17-aviso-nao-vinculante` |
| **#44** | **[no-task] Gateway processa mensagens de qualquer evento suportado da Evolution** | **Mergeado** | **2026-09-14** | **2026-09-14** | `develop` ← `fix/webhook-eventos-mensagem` |

### 10.2 Números

- **21 PRs** no total durante o período.
- **19 mergeados**, **2 fechados sem merge** (#21, duplicata da #20 apontando para a base errada; #32, substituído pelo #33, que integrou o LLM ao compose único em vez de um compose separado).
- **18 dos 19** merges foram para `develop`; as exceções são o #1 (para `main`, anterior à sprint) e o #20 (para `dev`, branch legada).
- Pico de PRs mergeados: **07/09 (5 PRs)** e **08/09 (3 PRs)** — coerente com as quedas do burndown.

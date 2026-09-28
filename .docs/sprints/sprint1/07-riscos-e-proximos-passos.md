# Sprint 1 · Riscos, pendências e próximos passos

> Parte do [fechamento da Sprint 1](README.md). Estado dos riscos e a recomendação para a Sprint 2 no fechamento da Sprint 1.

## 12. Riscos e pendências conhecidas

### 12.1 🔴 Risco crítico: mensagens não chegam a contatos migrados para `@lid` (issue #42)

**Situação:** mensagens enviadas pelo bot **nunca chegam** a determinados contatos, mesmo com Backend e Gateway processando tudo corretamente, sem erro em nenhuma das nossas camadas.

**O que é `@lid`:** o WhatsApp está migrando gradualmente o identificador interno de contatos do formato antigo baseado em telefone (`55129xxxxxxx@s.whatsapp.net`) para um novo formato de identidade vinculada, o LID (`89533106372844@lid`), que não expõe o número diretamente. A biblioteca **Baileys** (usada por baixo dos panos pela Evolution API) precisa manter uma sessão de criptografia Signal por contato e agora precisa gerenciar **duas identidades por contato**, mantendo o mapeamento entre elas. Esse suporte só existe a partir do Baileys 7.x, que **ainda é release candidate**.

**Como o sintoma se manifesta:**

1. O bot processa a mensagem e monta a resposta corretamente (confirmado nos logs, sem erro, retorno 202).
2. A chamada HTTP do Gateway para a Evolution API (`POST /message/sendText/...`) **também retorna sucesso**.
3. Na Evolution API, a mensagem fica `PENDING` e, segundos depois, muda para `status: 'ERROR'` num evento `messages.update` — ou seja, nunca é entregue/decifrada pelo celular do destinatário.
4. Ocorre **apenas** com contatos já migrados para `@lid`. Confirmado testando o mesmo fluxo com dois números: um com o campo `"lid"` na resposta de `/chat/whatsappNumbers` (bug reproduz sempre) e outro sem esse campo (funciona normalmente).

**Investigação já feita (não repetir):**

- Confirmado que **não é bug no nosso código** — a falha acontece inteiramente depois da nossa chamada HTTP, dentro da Evolution API/Baileys.
- Confirmado, no `package.json` da própria Evolution API (tag `2.3.7`, a que usamos), que a dependência real é `"baileys": "7.0.0-rc.9"` — uma release candidate, não versão estável.
- Tentativas de atualizar a imagem da Evolution API:
  - `evoapicloud/evolution-api:latest` → mesma versão do Baileys, bug idêntico;
  - `evoapicloud/evolution-api:2.4.0-rc2` → retorna `503` em todos os endpoints por exigir **ativação de licença paga** (`[Licensing] API endpoints will return HTTP 503 until activation.`) — inviável.
- Não existe, até o momento, tag estável mais nova que `2.3.7` sem essa exigência de licença.

**Bugs upstream abertos e reconhecidos, sem correção definitiva:**

| Repositório | Issue | Assunto |
|---|---|---|
| WhiskeySockets/Baileys | #1964 | "Waiting for this message" ao enviar para `@lid` |
| WhiskeySockets/Baileys | #1767 | Issue guarda-chuva do mesmo sintoma |
| WhiskeySockets/Baileys | #2234 | "Bad MAC" — erro de sessão de criptografia |
| EvolutionAPI/evolution-api | #1872 | Issue guarda-chuva da própria Evolution API para `@lid` vs `@jid` |

**Contorno atual (evita o sintoma, não resolve):** antes de testar com um número, checar se ele já migrou via `POST /chat/whatsappNumbers/<instancia>` com `{"numbers": ["55DDDNUMERO"]}`. Se a resposta **não tiver** o campo `"lid"`, a entrega funciona. Isso serve apenas para escolher com quem testar — **conforme o WhatsApp migrar mais contas (rollout gradual, fora do nosso controle), mais números vão reproduzir o problema, inclusive em produção.**

**Caminhos possíveis, nenhum decidido ainda:**

1. Aguardar uma versão estável (não RC) do Baileys/Evolution API que resolva `@lid` — **sem ETA conhecida**.
2. Trocar de biblioteca/provider — revisitar a WhatsApp Cloud API oficial, que não sofre desse bug por não depender de engenharia reversa do protocolo. Este bug é **evidência concreta a favor** da recomendação que já constava da pesquisa da issue #3.
3. Aceitar o risco por enquanto (ambiente ainda em desenvolvimento) e reavaliar antes de qualquer lançamento real, monitorando os issues upstream.

### 12.2 🟠 Requisitos funcionais do desafio ainda descobertos

| Requisito | Situação | Impacto |
|---|---|---|
| **RF06** — Registro de interações | Tabela `Interactions` existe e está modelada, mas **nada grava nela**. Issue #16 aberta | Sem isso não há como analisar "os fluxos mais utilizados", que é literalmente o texto do requisito |
| **RF07** — Agendamento presencial | **Não implementado.** A tabela `Appointments` existe, mas o módulo Scheduler não foi construído e nenhum caminho do fluxo o aciona | É uma adição explícita do parceiro ao desafio; hoje, quando a resposta não resolve, o bot simplesmente não oferece saída |
| **RF08** — Interface web de gestão dos agendamentos | **Não implementado.** Só o Figma foi planejado (issue #19, aberta) | Depende de RF07 ter dados para gerenciar |

### 12.3 🟠 RNF05 pendente por dependência em cadeia

RNF05 (identificar respostas geradas com auxílio de LLM) não está atendido. A razão é encadeada e honesta:

1. O serviço `gerarExplicacaoLlm` está implementado, testado e com fallback seguro — mas **não tem nenhum chamador**.
2. Ninguém chama porque, até hoje, entregar texto de LLM sem o rótulo de RNF05 violaria o requisito.
3. O rótulo não foi implementado porque não há texto de LLM para rotular.

O ponto de extensão no código está preparado (rodapé centralizado), então plugar o LLM e acrescentar o rótulo passam a ser a mesma tarefa. **A issue #17 foi fechada com a entrega da metade RNF04**; a metade RNF05 precisa ser rastreada na Sprint 2.

### 12.4 🟠 RNF02 — desempenho do LLM em tempo real

Medição real em CPU: **~6,7-6,8 tokens/s**, o que dá ~23 a 38 segundos por resposta completa. Para uma conversa de WhatsApp em tempo real, isso é alto demais. Mitigações identificadas: `keep_alive` (elimina ~5 s de recarga por chamada, ganho puro), `num_predict` limitado (reduz proporcionalmente, com risco de cortar a frase no meio), streaming de resposta, modelo menor, ou execução com GPU — **GPU é a única que muda a taxa de tokens/s em si**.

### 12.5 🟡 RNF08 — CI/CD inexistente

O requisito RNF08 pede explicitamente "integração e entrega contínua (CI/CD)". O projeto **não tem pipeline de CI/CD**, e também **não tem linter nem formatter** (ESLint/Prettier) configurados. Versionamento, testes e documentação — as outras partes do RNF08 — estão atendidos.

### 12.6 🟡 RNF03 — LGPD parcialmente endereçada

O que está feito: telefone e CPF nunca persistidos em texto puro (hash com segredo), acesso ao segredo de hash restrito ao Backend, logs sem texto de mensagem nem telefone completo.

O que falta: **a política de retenção/anonimização (RNF09) não foi formalizada** — não está definido por quanto tempo uma sessão é mantida nem quando o hash é descartado.

### 12.7 🟡 Dívidas técnicas planejadas

| Item | Issue | Por que foi adiado |
|---|---|---|
| Repository pattern em CRUD real | #23 | Introduzir antes de existir CRUD real seria abstração prematura |
| Validação de schema com zod no body/query | #24 | Aguardando um endpoint real com body complexo o bastante para justificar |
| Teste end-to-end automatizado do fluxo mínimo | #18 | A demonstração manual foi feita; falta o teste automatizado e o fechamento formal |
| Validação manual "3+ mensagens seguidas" do fix do webhook | — (spec do PR #44) | Critério de aceite marcado como não realizado na spec |

### 12.8 🟡 Pendências de processo

- **`CONTRIBUTING.md` desatualizado:** ainda diz que todo PR vai "para a `main`", quando na prática a base é `develop`. Divergência entre o documento e a prática real da equipe.
- **Remote do git desatualizado:** o `origin` local ainda aponta para `Steel-Hard/prov_6DSM`, mas o repositório foi renomeado para `Steel-Hard/ProconChat_Jacarei`. O GitHub redireciona automaticamente hoje, mas isso pode parar de funcionar.
- **Status do board não auditável neste ambiente:** não foi possível ler os campos `Status` do GitHub Project #2 via `gh` (ver nota na seção 8.1). O acompanhamento fino de `Backlog`/`Ready`/`In progress`/`In review`/`Done` não pôde ser confirmado para este documento.
- **Mensagens interativas do WhatsApp não validadas:** listas e botões via Evolution API têm suporte "parcial e instável" segundo a própria pesquisa, e **isso nunca foi testado**. O fluxo atual depende de o usuário digitar números, o que funciona, mas não foi comparado com a alternativa de listas nativas.
- **Escala do fluxo por lista:** anotação já registrada de que o fluxo de lista do WhatsApp não escala bem além de ~10 itens por categoria — relevante quando o catálogo crescer.

---

## 13. Próximos passos sugeridos (Sprint 2)

### 13.1 Prioridade alta — fechar requisitos do desafio

| # | Ação | Requisito | Observação |
|---|---|---|---|
| 1 | **Decidir o caminho do bug `@lid`** (issue #42) | RF01 | É decisão de arquitetura, não de código. As opções são: aguardar upstream, migrar para a Cloud API oficial, ou aceitar o risco com prazo de reavaliação. Deve ser decidida cedo na sprint, porque a opção 2 é cara |
| 2 | **Implementar registro de interações** (issue #16) | RF06 | A tabela já existe; falta gravar em cada passo do fluxo, incluindo `answered_via_llm` |
| 3 | **Plugar o LLM ao fluxo + rótulo RNF05** | RF05, RNF05 | Tarefa única: `gerarExplicacaoLlm` ganha chamador e o rodapé ganha o rótulo. Avaliar antes o desempenho (streaming / `num_predict` / `keep_alive`) por causa de RNF02 |
| 4 | **Implementar o Scheduler / agendamento presencial** | RF07 | Módulo interno do Backend, acionado quando a resposta não resolve. Inclui coletar CPF e nome pelo WhatsApp e hashear o CPF antes de persistir |
| 5 | **Interface Web Admin** — Figma (issue #19) e depois implementação | RF08, RF12 | Login único, sem RBAC. CRUDs previstos: `Appointments` (status) e `Users` (contas admin) |

### 13.2 Prioridade média — qualidade e conformidade

| # | Ação | Requisito |
|---|---|---|
| 6 | Formalizar a política de retenção/anonimização (RNF09) e implementá-la | RNF03 |
| 7 | Introduzir pipeline de CI/CD (rodar os testes em cada PR, no mínimo) | RNF08 |
| 8 | Fechar a issue #18 com um teste end-to-end automatizado do fluxo mínimo | RNF08 |
| 9 | Executar a validação manual pendente do fix do webhook (3+ mensagens seguidas em conversa real) | — |
| 10 | Testar mensagens interativas (listas/botões) na Evolution API e decidir se o fluxo migra para elas | RF02, RNF01 |

### 13.3 Prioridade baixa — dívida técnica e processo

| # | Ação |
|---|---|
| 11 | Introduzir ESLint/Prettier |
| 12 | Repository pattern quando existir CRUD real (issue #23) |
| 13 | Validação de schema com zod (issue #24) |
| 14 | Avaliar a coluna `interaction_id` em `Appointments`, para rastreabilidade completa do caso no admin |
| 15 | Atualizar o `CONTRIBUTING.md` para refletir que a base dos PRs é `develop` |
| 16 | Atualizar o remote do git para `Steel-Hard/ProconChat_Jacarei` |
| 17 | Planejar a escala do fluxo por categorias além de ~10 itens por lista |

### 13.4 Recomendação estratégica

A recomendação mais importante para a Sprint 2 não é técnica, é de escopo: **decidir o provider de WhatsApp antes de investir em RF07/RF08**. O bug `@lid` não é um defeito a ser corrigido no nosso código — é uma característica de depender de automação não oficial do WhatsApp Web, e tende a piorar conforme a Meta avança o rollout da nova identidade. A pesquisa da issue #3 já recomendava revisitar a Cloud API oficial usando o número de teste virtual gratuito (rota que **não foi esgotada**), e a issue #42 é a evidência concreta de que essa recomendação precisa virar decisão.

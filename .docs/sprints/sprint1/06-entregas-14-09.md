# Sprint 1 · Entregas da sessão de 14/09/2026

> Parte do [fechamento da Sprint 1](README.md). O que foi entregue no último dia da sprint, incluindo os dois bugs corrigidos e a demonstração real.

## 11. O que foi entregue nesta sessão de trabalho (14/09/2026)

Esta é a entrega mais recente da sprint e a que transformou o projeto de "componentes prontos" em "chatbot que responde de verdade no WhatsApp".

### 11.1 Ambiente Docker validado do zero

O ambiente completo foi subido localmente e validado ponta a ponta: `postgres`, `redis`, `evolution-api`, `backend`, `gateway` e `ollama`, com as migrations e o seed rodando na ordem correta antes do backend ficar saudável. Isso fechou a **issue #6** (Docker / Docker Compose), que era a última issue de infraestrutura ainda aberta na sprint — RNF06 deixou de ser "desenhado" e passou a ser "verificado".

### 11.2 Instância WhatsApp real pareada (RF01 comprovado)

Uma instância da Evolution API foi pareada, via QR code, com um número de teste real. Isso confirma que **RF01 funciona de fato**, não apenas no papel: mensagens enviadas por um celular real chegam ao Gateway, e respostas do Gateway chegam ao celular. Até então, toda a validação da integração era por teste automatizado com payloads simulados.

### 11.3 Bug 1 — Gateway descartava silenciosamente mensagens do usuário

**Branch:** `fix/webhook-eventos-mensagem` · **PR #44** (mergeado em 14/09) · **Sem issue** (`no-task`, decisão do time) · **Spec:** `.docs/.tasks/bugs/webhook-eventos-mensagem-ignorados/`

**Sintoma observado no teste manual real:** o bot respondia a primeira mensagem ("ola") e depois simplesmente parava de responder. Do ponto de vista do usuário, o fluxo de navegação por categorias (RF02/RF03) ficava inutilizável.

**Causa raiz:** o Gateway só processava o evento `messages.upsert` da Evolution API. Qualquer outro evento era descartado na primeira linha do serviço de webhook, **sem log e sem distinguir** "evento irrelevante" de "evento carregando uma mensagem real do usuário".

**Evidência coletada** (janela de ~20 min de logs do container `evolution-api`, após parear um número novo): dos eventos de mensagem recebidos, **apenas 1** chegou como `messages.upsert`. As mensagens seguintes chegaram como `messages.edited` (9x), `messages.set` (6x) e `messages.update` (2x) — todas descartadas em silêncio. O comportamento é atribuído à sincronização inicial de histórico do WhatsApp/Baileys logo após parear um dispositivo novo (backfill competindo com mensagens em tempo real).

**Por que não bastava reconfigurar a Evolution API:** nenhuma configuração faz essas mensagens voltarem a chegar como `upsert`; desligar os eventos extras só perderia as mensagens de vez. A correção robusta é o Gateway aceitar qualquer evento que carregue uma mensagem de entrada e filtrar pelo **conteúdo** (tem texto? é do usuário? é recente? já foi vista?), não pelo nome do evento.

**Correção implementada:**

| Mudança | Detalhe |
|---|---|
| Lista de eventos ampliada | Aceita `messages.upsert`, `messages.update`, `messages.edited` e `messages.set`, mantendo a normalização de maiúsculas e `_` → `.` |
| Payloads em array normalizados | `messages.set` entrega `data.messages[]` em vez de uma mensagem única; cada item passa a ser avaliado individualmente, com as mesmas regras |
| **Guarda de idade** | Mensagens mais antigas que `EVOLUTION_MESSAGE_MAX_AGE_SECONDS` (default `300` = 5 min) são ignoradas com `reason: "stale_message"`. Sem isso, aceitar `messages.set` faria o bot responder conversas antigas inteiras no momento do pareamento — trocaria um bug por outro pior |
| Mensagens sem timestamp | São processadas normalmente (não bloquear o caminho feliz por falta de um campo opcional), confiando na deduplicação |
| Deduplicador alinhado | O TTL do deduplicador em memória passou a ser ≥ a janela de idade, para que nenhuma mensagem aceitável escape da dedup. O mesmo `key.id` chegando por eventos diferentes é processado uma única vez |
| **Log estruturado de todo descarte** | Linha JSON com `event`, `reason` e `messageId`. **Sem o texto da mensagem e sem o telefone completo** (RNF03/LGPD) |

**Kill-switch:** `EVOLUTION_MESSAGE_MAX_AGE_SECONDS=0` não serve como desligamento de emergência; o kill-switch real continua sendo `EVOLUTION_AUTO_REPLY_ENABLED=false`.

**Pendência honesta desta correção:** o critério de aceite "validado manualmente em conversa real: enviar 3+ mensagens seguidas e receber resposta para todas" ficou **marcado como não realizado** na spec.

### 11.4 Bug 2 / requisito faltante — resposta final violava RNF04

**Branch:** `feat/17-aviso-nao-vinculante` · **PR #43** (mergeado em 14/09) · **Issue #17** (parte RNF04) · **Spec:** `.docs/.tasks/features/avisos-obrigatorios-resposta-final/`

**Problema:** a resposta final montada pelo Backend incluía categoria, pergunta, base legal, resposta, documentos necessários e — **apenas quando `requer_presencial` era verdadeiro** — uma frase sobre atendimento presencial. **Em nenhum caminho ela informava que a orientação não é vinculante e não substitui o atendimento formal do PROCON.** O chatbot, como estava, violava RNF04 em toda resposta final que entregava — e RNF04 é um dos requisitos classificados internamente como "a nunca violar".

A frase de `requer_presencial` não cumpria RNF04: é condicional e trata de encaminhamento ("pode exigir atendimento presencial"), não do caráter orientativo da resposta.

**Impacto prático:** enquanto o aviso não existisse, `EVOLUTION_AUTO_REPLY_ENABLED` não podia ser ligado para a demonstração real sem entregar respostas não conformes a um usuário de verdade.

**Correção implementada:**

- Constante única e exportada `AVISO_NAO_VINCULANTE`, fonte da verdade do texto — sem segunda cópia no código.
- Redação aprovada: *"Esta é uma orientação automatizada de caráter informativo. Ela não é vinculante e não substitui o atendimento jurídico ou administrativo formal do PROCON Jacareí."*
- O aviso aparece ao final de **todos** os caminhos de retorno da resposta final, separado por linha em branco, tanto com `requer_presencial` verdadeiro quanto falso.
- A saudação de abertura (lista de categorias) ganhou uma **menção curta** ao caráter orientativo, para que o usuário seja avisado já na entrada e não só no fim.
- As mensagens de navegação e erro **não** repetem o aviso completo — listas de categorias/perguntas já são longas no WhatsApp, e repetir um parágrafo a cada passo prejudicaria a legibilidade sem ganho de conformidade (RNF04 fala da *resposta*).

**Decisões de redação registradas:**

- O aviso vai no **fim** porque o usuário precisa da orientação primeiro; o aviso funciona como fechamento, padrão em canais de atendimento. A menção curta na abertura cobre o risco de alguém ler só o início.
- A redação evita deliberadamente a palavra "presencial", usando "atendimento jurídico ou administrativo formal" — assim um teste existente que afirmava `not.toContain("presencial")` continuou passando sem alteração.
- **Ponto de extensão para RNF05 preparado:** o rodapé foi centralizado, de modo que a futura integração do LLM só precise acrescentar ali o rótulo de "conteúdo gerado com auxílio de IA" quando `geradoPorLlm` for verdadeiro — sem reescrever a montagem do corpo da resposta.

**Escopo explicitamente deixado de fora (e por quê):** RNF05 não foi implementado porque **o LLM ainda não está plugado em nenhum fluxo de conversa** — nenhum texto entregue hoje é gerado por LLM, então não há o que identificar.

### 11.5 Processo e testes

Ambas as correções foram planejadas pelo fluxo spec-driven (planejar → implementar), com `spec.md` e `tasks.md` versionados antes de qualquer código, e ambas têm testes automatizados cobrindo os cenários descritos.

| Pacote | Testes antes das correções (verificado localmente) | Testes após as correções (relatado na sessão) |
|---|---|---|
| Backend | 60 testes em 14 arquivos | **67** |
| Gateway | 33 testes em 11 arquivos | **41** |

> **Nota de verificação:** os números "antes" (60/33) foram confirmados rodando `npm test` no snapshot local de `develop`, que ainda não havia recebido os merges de #43/#44. Os números "depois" (67/41) vêm do relatório da sessão; a contagem estática dos casos de teste nas branches correspondentes é consistente com eles. Todos passando.

### 11.6 Demonstração manual real do bot funcionando

Foi realizada uma demonstração manual completa via WhatsApp real, com print de tela como evidência: o usuário envia `"2"`, e o bot responde com a **Categoria / Pergunta / Resposta / Base legal** corretamente formatadas, incluindo a lógica de não permitir reclamação duplicada.

Isso é a evidência de que, com conteúdo real do FAQ do PROCON:

- **RF01** (canal WhatsApp) funciona com número real;
- **RF02 e RF03** (navegação guiada por categorias e perguntas) funcionam de ponta a ponta;
- o **Motor de Decisão** navega o fluxo lendo do banco populado;
- **RF04** (resposta orientadora consolidada com base legal) é entregue;
- **RNF04** (aviso não vinculante) acompanha a resposta.

Na prática, este é o critério de **"chatbot viável"** da Sprint 1 atingido — ainda que a issue #18, que o formaliza como teste end-to-end, permaneça aberta.

### 11.7 Bug externo descoberto e documentado (issue #42)

Ver seção 12.1 — é o principal risco aberto da entrega.

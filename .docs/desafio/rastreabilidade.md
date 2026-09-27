# Rastreabilidade dos requisitos

Como cada requisito do [documento do desafio](desafio-6dsm-2026-2.md) é atendido, em três camadas:

- **Código:** o que está implementado em `develop`;
- **Desenho:** o que foi decidido e desenhado (registros em [`../decisoes/`](../decisoes/) e protótipo do painel no Claude Design);
- **Situação:** ✅ atendido ou bem coberto · ⚠️ parcial ou com risco · ❌ não atendido · 🔴 risco alto.

Revisão feita em 27/09/2026, no início da Sprint 2 (15/09 a 19/10/2026). A entrega final (Review Meeting) é em 23/11/2026.

## Requisitos funcionais

| Req. | Código | Desenho | Situação |
|---|---|---|---|
| **RF01** WhatsApp como interface | Evolution API funcionando | Migração para a Cloud API ([003](../decisoes/003-migracao-whatsapp-cloud-api.md)) | ✅ |
| **RF02** Opções com base na tabela de decisões | 7 categorias e 47 itens do FAQ real | Conteúdo gerenciável, títulos curtos, paginação ([001](../decisoes/001-fluxo-guiado-por-categorias.md)) | ⚠️ Nota 1 |
| **RF03** Fluxos decisórios sequenciais | Categoria → pergunta | + "resolveu?" → quem comparece → horário ([008](../decisoes/008-fluxo-da-conversa-e-desfechos.md)) | ⚠️ Nota 1 |
| **RF04** Resposta que resume o caso e indica próximos passos | Resposta com base legal e documentos | + oferta de agendamento | ⚠️ Nota 2 |
| **RF05** Complemento por LLM | Serviço pronto, sem chamador | Opção por pergunta, rótulo, fallback ([009](../decisoes/009-complemento-por-llm.md)) | ⚠️ Nota 3 |
| **RF06** Registrar interações e analisar fluxos | Não implementado (#16) | Eventos tipados, desfechos, Sessões, Relatórios ([010](../decisoes/010-registro-de-interacoes-e-relatorios.md)) | ⚠️ Só no desenho |
| **RF07** Agendamento quando a resposta não resolve | Não implementado | Fluxo completo ([006](../decisoes/006-ciclo-de-vida-do-agendamento.md), [007](../decisoes/007-agenda-configuravel.md), [008](../decisoes/008-fluxo-da-conversa-e-desfechos.md)) | ⚠️ Só no desenho |
| **RF08** Interface web de gerenciamento dos agendamentos | Não implementado | 10 telas aprovadas no protótipo | ⚠️ Nota 4 |

**Nota 1: interpretação de "tabela de decisões" e "fluxos decisórios".** O nosso modelo tem dois níveis (categoria → pergunta → resposta), mais os passos de agendamento. É defensável, porque segue o material entregue pelo PROCON, que tem formato de FAQ. Mas um avaliador pode esperar árvores com ramificações ("tem nota fiscal? sim/não"). **Ação:** confirmar com o professor e com o parceiro antes da Sprint 3.

**Nota 2: próximos passos explícitos.** A resposta orienta, mas não tem um bloco rotulado de próximos passos, que é o texto literal do RF04. **Ação:** incluir um trecho "O que fazer agora" na resposta final.

**Nota 3: tempo de resposta do LLM.** Em CPU, de 23 a 38 s por resposta. **Ação:** decidir o envio assíncrono proposto em [009](../decisoes/009-complemento-por-llm.md) antes de ligar o LLM ao fluxo.

**Nota 4: stack do front-end não decidido** (React ou server-rendered). **Ação:** decidir antes de criar as tasks do painel.

## Requisitos não funcionais

| Req. | Situação | O que falta |
|---|---|---|
| **RNF01** Usabilidade | ⚠️ Desenho cuidadoso (títulos curtos, listas tocáveis, prévias das mensagens) | Nenhum teste com usuários. Sugestão: teste rápido com a equipe do PROCON e 3 a 5 cidadãos na Sprint 3 |
| **RNF02** Disponibilidade e tempo de resposta | ⚠️ | Envio assíncrono do LLM; `restart` e healthchecks em todos os containers. A Cloud API melhora a disponibilidade em relação à Evolution |
| **RNF03** LGPD | ⚠️ Bem encaminhado ([002](../decisoes/002-lgpd-dados-pessoais.md)) | Aviso de privacidade na saudação do bot; política de retenção (RNF09); procedimento para pedidos do titular |
| **RNF04** Caráter orientativo | ✅ Implementado (PR #43), texto único em todo o sistema | — |
| **RNF05** Identificar o que é gerado por IA | ⚠️ Desenhado | Implementar junto com o RF05 |
| **RNF06** Docker | ✅ | Adicionar o container do front; remover Evolution e Redis na migração |
| **RNF07** Instalação e requisitos de hardware/software | ✅ Para o estado atual | Atualizar após a migração: chave-mestra, `.env` reduzido, front-end. Escrever o **guia de passagem para o PROCON** (conta Meta, número próprio, token permanente, modelos de mensagem, tela de WhatsApp), já que durante as sprints o sistema roda com o número de testes do time ([003](../decisoes/003-migracao-whatsapp-cloud-api.md)) |
| **RNF08** Práticas modernas (ágil, CI/CD, testes, docs) | ❌ **CI/CD não existe** | Pipeline de CI rodando os testes em cada PR. É o único ❌ que não depende de funcionalidade e deveria entrar na Sprint 2. Teste end-to-end do fluxo mínimo (#18) |

## Restrições de projeto

| Req. | Situação |
|---|---|
| **RP01** Cloud API preferencial | ✅ Com a migração ([003](../decisoes/003-migracao-whatsapp-cloud-api.md)) |
| **RP02** Back-end em tecnologia web moderna | ✅ Node.js + TypeScript |
| **RP03** Modularidade (chatbot, fluxos, LLM) | ✅ Gateway, Backend (com o Motor de Decisão) e LLM separados; a camada de provedor do Gateway reforça isso |
| **RP04** Escopo compatível com o prazo | 🔴 **Maior risco do projeto.** Ver abaixo |
| **RP05** Sem API externa de LLM | ✅ Ollama local. A Cloud API não é LLM, então não conflita |

### RP04: o escopo precisa ser cortado

A revisão do protótipo gerou 10 telas, permissões com regras de escalada, exportação em três formatos, detecção de conflitos de agenda, modelos de mensagem, migração de provedor, eventos tipados e 8 desfechos. Cada decisão faz sentido isoladamente, mas o conjunto não cabe nas cerca de 8 semanas até 23/11.

Proposta de corte, a validar com o grupo antes de criar as tasks:

| Nível | Inclui | Requisitos cobertos |
|---|---|---|
| **Essencial** | Migração para a Cloud API; bot com "resolveu?" e agendamento; registro de eventos e desfechos; login e usuários com permissões; Agendamentos e Detalhe; Conteúdo; Horários; Documentos; pipeline de CI | RF01–RF08, RNF04, RNF06, RNF08 |
| **Importante** | Relatórios básicos (desfechos, categorias, resultado dos agendamentos); Sessões; Dashboard; LLM no fluxo com rótulo; lembrete | RF05, RF06 (análise), RNF05 |
| **Desejável** | Exportação PDF e Excel; mapa de calor; modal de conflitos de agenda; outras conversas do mesmo número; auditoria detalhada; bloqueio por período | — |

## Documentação a atualizar

| Documento | Situação |
|---|---|
| [`../architecture/architecture.md`](../architecture/architecture.md) | Descreve a Evolution API e o perfil único de acesso (RF12). Superado por [003](../decisoes/003-migracao-whatsapp-cloud-api.md) e [004](../decisoes/004-contas-e-permissoes-granulares.md) |
| [`../database/database.md`](../database/database.md) | Não inclui as tabelas e colunas novas de [002](../decisoes/002-lgpd-dados-pessoais.md), [004](../decisoes/004-contas-e-permissoes-granulares.md), [006](../decisoes/006-ciclo-de-vida-do-agendamento.md), [007](../decisoes/007-agenda-configuravel.md), [008](../decisoes/008-fluxo-da-conversa-e-desfechos.md) e [010](../decisoes/010-registro-de-interacoes-e-relatorios.md). Deve ser atualizado junto com as migrations |
| `.claude/CLAUDE.md` (local) | Cita o RF12 como perfil único, a Evolution e o `EVOLUTION_AUTO_REPLY_ENABLED` |
| `README.md` da raiz | Instruções de instalação ainda com a Evolution. Atualizar após a migração |

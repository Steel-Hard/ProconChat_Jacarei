# Rastreabilidade dos requisitos

Como cada requisito do [documento do desafio](desafio-6dsm-2026-2.md) é atendido, em três camadas:

- **Código:** o que está implementado em `develop`;
- **Desenho:** o que foi decidido e desenhado (registros em [`../decisoes/`](../decisoes/) e protótipo do painel no Claude Design);
- **Situação:** ✅ atendido ou bem coberto · ⚠️ parcial ou com risco · ❌ não atendido · 🔴 risco alto.

Revisão feita em 27/09/2026, no início da Sprint 2 (15/09 a 19/10/2026), e coluna **Código** atualizada em 19/10/2026, no fechamento da Sprint 2. A entrega final (Review Meeting) é em 23/11/2026.

## Requisitos funcionais

| Req. | Código | Desenho | Situação |
|---|---|---|---|
| **RF01** WhatsApp como interface | Cloud API funcionando; Evolution API removida na #82 | Migração para a Cloud API ([003](../decisoes/003-migracao-whatsapp-cloud-api.md)) | ✅ |
| **RF02** Opções com base na tabela de decisões | 7 categorias e 47 itens do FAQ real | Conteúdo gerenciável, títulos curtos, paginação ([001](../decisoes/001-fluxo-guiado-por-categorias.md)) | ⚠️ Nota 1 |
| **RF03** Fluxos decisórios sequenciais | Categoria → pergunta → "resolveu?" → quem comparece → nome e CPF → horário (#55, #56) | Retorno de quem já tem agendamento ([008](../decisoes/008-fluxo-da-conversa-e-desfechos.md)) | ⚠️ Nota 1 |
| **RF04** Resposta que resume o caso e indica próximos passos | Resposta com base legal, documentos e o trecho "O que fazer agora"; oferta de agendamento | — | ✅ Nota 2 |
| **RF05** Complemento por LLM | Cliente e serviço prontos, sem chamador no fluxo | Opção por pergunta, rótulo, fallback ([009](../decisoes/009-complemento-por-llm.md)) | ⚠️ Nota 3 |
| **RF06** Registrar interações e analisar fluxos | Eventos tipados e desfechos gravados (#16, #55) | Sessões, Relatórios ([010](../decisoes/010-registro-de-interacoes-e-relatorios.md)) | ⚠️ Falta a análise |
| **RF07** Agendamento quando a resposta não resolve | Agendamento pelo bot, com horários da agenda e controle de vagas (#56) | Remarcar e cancelar pelo bot, agenda configurável pelo painel ([006](../decisoes/006-ciclo-de-vida-do-agendamento.md), [007](../decisoes/007-agenda-configuravel.md), [008](../decisoes/008-fluxo-da-conversa-e-desfechos.md)) | ⚠️ Parcial |
| **RF08** Interface web de gerenciamento dos agendamentos | Painel com login, "Minha conta", Agendamentos (lista com busca, filtros e "Assumir", #85), Detalhe do agendamento (assumir, atendido, não compareceu, #86) e WhatsApp (#54), sobre a API de agendamentos (#60) | Demais telas do protótipo (10 aprovadas) | ⚠️ Nota 4 |

**Nota 1: interpretação de "tabela de decisões" e "fluxos decisórios".** O nosso modelo tem dois níveis (categoria → pergunta → resposta), mais os passos de agendamento. É defensável, porque segue o material entregue pelo PROCON, que tem formato de FAQ. Mas um avaliador pode esperar árvores com ramificações ("tem nota fiscal? sim/não"). **Ação:** confirmar com o professor e com o parceiro antes da Sprint 3.

**Nota 2: próximos passos explícitos.** Resolvida: a resposta final traz o trecho rotulado "O que fazer agora", que é o texto literal do RF04.

**Nota 3: tempo de resposta do LLM.** Em CPU, de 23 a 38 s por resposta. **Ação:** decidir o envio assíncrono proposto em [009](../decisoes/009-complemento-por-llm.md) antes de ligar o LLM ao fluxo.

**Nota 4: painel em construção.** O stack foi decidido (React 19 + Vite, a partir do `template-react`). Estão prontos o login, "Minha conta", Agendamentos, Detalhe do agendamento e WhatsApp; enquanto não há Dashboard, a tela inicial (`/`) leva a Agendamentos (PR #115). Dashboard, Relatórios, Conteúdo, Sessões, Horários, Documentos e Usuários continuam "Em construção". O cancelamento pela equipe e as observações internas do agendamento ainda não existem na API.

## Requisitos não funcionais

| Req. | Situação | O que falta |
|---|---|---|
| **RNF01** Usabilidade | ⚠️ Desenho cuidadoso (títulos curtos, listas tocáveis, prévias das mensagens) | Nenhum teste com usuários. Sugestão: teste rápido com a equipe do PROCON e 3 a 5 cidadãos na Sprint 3 |
| **RNF02** Disponibilidade e tempo de resposta | ⚠️ | Envio assíncrono do LLM; `restart` e healthchecks em todos os containers. A Cloud API, que substituiu a Evolution (removida na #82), melhora a disponibilidade |
| **RNF03** LGPD | ⚠️ Bem encaminhado ([002](../decisoes/002-lgpd-dados-pessoais.md)) | Aviso de privacidade na saudação do bot; política de retenção (RNF09); procedimento para pedidos do titular |
| **RNF04** Caráter orientativo | ✅ Implementado (PR #43), texto único em todo o sistema | — |
| **RNF05** Identificar o que é gerado por IA | ⚠️ Desenhado | Implementar junto com o RF05 |
| **RNF06** Docker | ✅ | — (front no container `frontend`; Evolution e Redis removidos na #82) |
| **RNF07** Instalação e requisitos de hardware/software | ✅ Para o estado atual | Atualizar após a migração: chave-mestra, `.env` reduzido, front-end. Escrever o **guia de passagem para o PROCON** (conta Meta, número próprio, token permanente, modelos de mensagem, tela de WhatsApp), já que durante as sprints o sistema roda com o número de testes do time ([003](../decisoes/003-migracao-whatsapp-cloud-api.md)) |
| **RNF08** Práticas modernas (ágil, CI/CD, testes, docs) | ✅ CI em todo PR e push (`ci.yml`) e deploy contínuo na VM (`deploy.yml`, #51) | Teste end-to-end do fluxo mínimo (#18) |

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

## Documentação

Atualizada em 27/09/2026 com as decisões da Sprint 2: [`../architecture/architecture.md`](../architecture/architecture.md) (arquitetura atual e alvo), [`../database/database.md`](../database/database.md) (schema atual e planejado), [`../regras/`](../regras/) (regras das telas) e [`../prototipo/`](../prototipo/) (protótipo aprovado).

As instruções de instalação do `README.md` da raiz e o `src/gateway/README.md` foram atualizadas na #82 e descrevem só a Cloud API; a Evolution API e o Redis foram removidos.

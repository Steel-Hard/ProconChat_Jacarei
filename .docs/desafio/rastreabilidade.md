# Rastreabilidade dos requisitos

Como cada requisito do [documento do desafio](desafio-6dsm-2026-2.md) é atendido, em três camadas:

- **Código:** o que está implementado em `develop`;
- **Desenho:** o que foi decidido e desenhado (registros em [`../decisoes/`](../decisoes/) e protótipo do painel no Claude Design);
- **Situação:** ✅ atendido ou bem coberto · ⚠️ parcial ou com risco · ❌ não atendido · 🔴 risco alto. O 🔴 marca um **risco de projeto** (a restrição RP04), não um requisito: nenhum requisito (RF ou RNF) está como ❌ e nenhum está como parcial.

Revisão feita em 27/09/2026, no início da Sprint 2, e conferida de novo em 22/11/2026, no fechamento da Sprint 3 (20/10 a 23/11/2026), contra o que está em `develop`. A entrega final (Review Meeting) é em 23/11/2026. Fechamento: [`../sprints/sprint3/README.md`](../sprints/sprint3/README.md).

## Requisitos funcionais

| Req. | Código | Desenho | Situação |
|---|---|---|---|
| **RF01** WhatsApp como interface | Cloud API funcionando; Evolution API removida na #82 | Migração para a Cloud API ([003](../decisoes/003-migracao-whatsapp-cloud-api.md)) | ✅ |
| **RF02** Opções com base na tabela de decisões | 7 categorias e 47 itens do FAQ real, gerenciáveis pela tela de Conteúdo (#63, #124) | Conteúdo gerenciável, títulos curtos, paginação ([001](../decisoes/001-fluxo-guiado-por-categorias.md)) | ✅ Nota 1 |
| **RF03** Fluxos decisórios sequenciais | Categoria → pergunta → "resolveu?" → quem comparece → nome e CPF → horário (#55, #56) e retorno de quem já tem agendamento, com remarcar e cancelar (#59) | Retorno de quem já tem agendamento ([008](../decisoes/008-fluxo-da-conversa-e-desfechos.md)) | ✅ Nota 1 |
| **RF04** Resposta que resume o caso e indica próximos passos | Resposta com base legal, documentos e o trecho "O que fazer agora"; oferta de agendamento | — | ✅ Nota 2 |
| **RF05** Complemento por LLM | Ligado ao fluxo (#66): a IA reescreve só a explicação da resposta oficial numa mensagem única com o bloco oficial, o aviso e os botões; a oficial sai inteira quando a IA não pode ser usada. Tempo medido em 20/11/2026 ([documento do software](../guias/documento-do-software.pdf)) | Opção por pergunta, rótulo, fallback ([009](../decisoes/009-complemento-por-llm.md)) | ✅ Nota 3 |
| **RF06** Registrar interações e analisar fluxos | Eventos tipados e desfechos gravados (#16, #55) e tela de Relatórios com período, conversas, desfechos, categorias, perguntas e resultado dos agendamentos (#68, #128) | Relatórios ([010](../decisoes/010-registro-de-interacoes-e-relatorios.md)). A exportação e os gráficos extras são bônus da #73, nunca pedidos; Sessões (#72) e Dashboard (#71) foram descartados por decisão do grupo | ✅ Nota 4 |
| **RF07** Agendamento quando a resposta não resolve | Agendamento pelo bot, com horários da agenda e controle de vagas (#56); remarcar e cancelar pelo bot (#59); horários configuráveis (#64, #125, #134) e lembrete antes do atendimento (#74) | Agenda configurável pelo painel ([006](../decisoes/006-ciclo-de-vida-do-agendamento.md), [007](../decisoes/007-agenda-configuravel.md), [008](../decisoes/008-fluxo-da-conversa-e-desfechos.md), [012](../decisoes/012-horarios-agendados.md)) | ✅ |
| **RF08** Interface web de gerenciamento dos agendamentos | Painel com login, "Minha conta", Agendamentos com lista, busca, filtros e calendário semanal (#85, #126), Detalhe do agendamento com assumir, atribuir, atendido, não compareceu, corrigir registro, observações e cancelamento (#86, #126, #127) e WhatsApp (#54, #129), sobre a API de agendamentos (#60, #87), mais Conteúdo, Horários, Documentos, Usuários e Relatórios (#123 a #128) | Telas do protótipo aprovado; Dashboard e Sessões foram descartados por decisão do grupo | ✅ Nota 4 |

**Nota 1: interpretação de "tabela de decisões" e "fluxos decisórios".** O nosso modelo tem dois níveis (categoria → pergunta → resposta), mais os passos de agendamento. Segundo o registro do usuário em 22/11/2026, o professor aceitou e recomendou o fluxo atual, com botões. Fontes: registro do usuário em 22/11/2026 e a [decisão 001](../decisoes/001-fluxo-guiado-por-categorias.md). A consulta foi feita na #122 (unificada na #121).

**Nota 2: próximos passos explícitos.** A resposta final traz o trecho rotulado "O que fazer agora", que é o texto literal do RF04.

**Nota 3: tempo de resposta do LLM.** Decidido em [009](../decisoes/009-complemento-por-llm.md) (item 6, 02/11/2026): mensagem única depois da IA, com "digitando…", sondagem de 2 s e uma geração por vez; o cidadão espera a IA até o limite de `LLM_TIMEOUT_MS` (padrão de 20 s) e recebe a resposta oficial se a IA passar dele. A medição de 20/11/2026 está no [documento do software](../guias/documento-do-software.pdf) (texto-fonte em [`../guias/documento-do-software.md`](../guias/documento-do-software.md)): com 6 núcleos, a média foi de 6,5 s e o pior caso, cerca de 12 s; a primeira resposta com o modelo frio levou de 12,9 a 21,8 s e pode passar do limite de 20 s, e a produção do projeto (ARM) não foi medida. A conferência feita para a #70 comparou o texto do PDF e o do Markdown e os parâmetros do sistema (modelo, limite de 300 tokens e `LLM_TIMEOUT_MS`); os números vêm da medição de 20/11, que não foi repetida.

**Nota 4: painel e relatórios.** O painel tem login, "Minha conta", Agendamentos, Detalhe do agendamento, Conteúdo, Horários (com o modal de conflitos, #75, e o bloqueio de parte do dia, #77), Documentos, Usuários, Relatórios e WhatsApp, além da página pública `/privacidade`. A tela inicial (`/`) leva a Agendamentos. **Sessões (#72) e Dashboard (#71) foram descartados por decisão do grupo.** A tela de Relatórios cumpre o RF06; a exportação em PDF, Excel e CSV e os gráficos extras são bônus da #73, nunca pedidos. O cancelamento pela equipe (#67, tela na #127) e as observações internas do agendamento (#87, tela na #126) estão integrados.

**Nota 5: aviso de cancelamento ao cidadão.** O aviso de cancelamento por WhatsApp não é requisito do desafio (RF07 e RF08 não dependem dele). Como a Meta cobra cada mensagem de modelo e a conta do projeto não tem forma de pagamento, o aviso é **opcional e nasce desligado** ([decisão 005](../decisoes/005-mensagens-ao-cidadao.md), issue #164). Com ele desligado, o cancelamento funciona igual e a equipe avisa o cidadão por outro meio. Sugestão futura, fora do escopo: o bot informar o cancelamento quando o cidadão escrever e tiver um agendamento cancelado sem aviso.

## Requisitos não funcionais

| Req. | Situação | O que falta |
|---|---|---|
| **RNF01** Usabilidade | ✅ Desenho cuidadoso (títulos curtos, listas tocáveis, prévias das mensagens). Segundo o registro do usuário em 22/11/2026, o PROCON validou e aprovou o fluxo antes do desenvolvimento, e o fluxo foi construído a partir dos feedbacks dele (#121) | — |
| **RNF02** Disponibilidade e tempo de resposta | ✅ Espera da IA com "digitando…", sondagem de 2 s e uma geração por vez, com a resposta oficial como alternativa ([009](../decisoes/009-complemento-por-llm.md)); `restart` e healthchecks no Compose; Cloud API no lugar da Evolution (removida na #82); tempos medidos em 20/11/2026 ([documento do software](../guias/documento-do-software.pdf), Nota 3) | A produção do projeto (ARM) não foi medida, e a primeira resposta com o modelo frio pode passar do limite de espera: nesse caso o cidadão recebe a resposta oficial |
| **RNF03** LGPD | ✅ Implementado (#69): telefone do agendamento apagado no horário, anonimização automática de conversas e agendamentos por prazo (ligada e configurada na aba Privacidade, com prévia e confirmação), página pública `/privacidade` com os dados e os prazos cadastrados, link na saudação e [procedimento para pedidos do titular](../lgpd/pedidos-do-titular.md) ([002](../decisoes/002-lgpd-dados-pessoais.md)) | Segundo o registro do usuário em 22/11/2026, a página de privacidade já traz as citações legais dos prazos. A decisão 002 ainda marca essa conferência como "a conferir", e a atualização dela é da PO |
| **RNF04** Caráter orientativo | ✅ Implementado (PR #43), texto único em todo o sistema | — |
| **RNF05** Identificar o que é gerado por IA | ✅ | Rótulo "Gerado com auxílio de IA" na mensagem (no rodapé da mensagem interativa, [009](../decisoes/009-complemento-por-llm.md)) e na linha do tempo do painel |
| **RNF06** Docker | ✅ | — (front no container `frontend`; Evolution e Redis removidos na #82) |
| **RNF07** Instalação e requisitos de hardware/software | ✅ [`README.md`](../../README.md) com a instalação do zero; [documento do software](../guias/documento-do-software.pdf) com requisitos medidos, instalação e atualização; [guia de configuração do bot](../guias/guia-configuracao-do-bot.pdf), com a passagem para o PROCON (conta Meta, número próprio, token permanente, modelos de mensagem, tela de WhatsApp); [manual do painel](../guias/manual-do-painel.pdf) (#118, #119) | — |
| **RNF08** Práticas modernas (ágil, CI/CD, testes, docs) | ✅ CI em todo PR e push (`ci.yml`), com o job `backend-e2e` do teste ponta a ponta do fluxo principal (#18), e deploy contínuo na VM (`deploy.yml`, #51) | — |

## Restrições de projeto

| Req. | Situação |
|---|---|
| **RP01** Cloud API preferencial | ✅ Com a migração ([003](../decisoes/003-migracao-whatsapp-cloud-api.md)) |
| **RP02** Back-end em tecnologia web moderna | ✅ Node.js + TypeScript |
| **RP03** Modularidade (chatbot, fluxos, LLM) | ✅ Gateway, Backend (com o Motor de Decisão) e LLM separados; a camada de provedor do Gateway reforça isso |
| **RP04** Escopo compatível com o prazo | 🔴 **Risco de projeto, não requisito.** O escopo foi cortado, e o corte está registrado abaixo |
| **RP05** Sem API externa de LLM | ✅ Ollama local. A Cloud API não é LLM, então não conflita |

### RP04: o escopo cortado

A revisão do protótipo gerou 10 telas, permissões com regras de escalada, exportação em três formatos, detecção de conflitos de agenda, modelos de mensagem, migração de provedor, eventos tipados e 8 desfechos. Cada decisão faz sentido isoladamente, mas o conjunto não coube nas cerca de 8 semanas até 23/11. A tabela é o registro do corte, com o que foi entregue e o que ficou de fora.

| Nível | Inclui | Situação em 22/11/2026 |
|---|---|---|
| **Essencial** | Migração para a Cloud API; bot com "resolveu?" e agendamento; registro de eventos e desfechos; login e usuários com permissões; Agendamentos e Detalhe; Conteúdo; Horários; Documentos; pipeline de CI | Entregue (RF01 a RF08, RNF04, RNF06, RNF08) |
| **Importante** | Relatórios básicos (desfechos, categorias, resultado dos agendamentos); LLM no fluxo com rótulo; lembrete | Entregue: Relatórios (#68, #128), LLM no fluxo (#66) e lembrete (#74) |
| **Importante** | Sessões (#72) e Dashboard (#71) | Descartados por decisão do grupo |
| **Desejável** | Modal de conflitos de agenda; bloqueio por período | Entregue (#75 e #77, e as datas e períodos bloqueados na tela de Horários, #125) |
| **Desejável** | Exportação PDF, Excel e CSV; gráficos extras de Relatórios (abandono por etapa, horário de pico, perguntas que mais não resolveram) | Não entregue: bônus da #73 |
| **Desejável** | Outras conversas do mesmo número (#76) | Não entregue: dependia da tela de Sessões, e a #76 foi fechada como não planejada |

## Documentação

Conferida em 22/11/2026 contra `develop`: [`../architecture/architecture.md`](../architecture/architecture.md) (arquitetura entregue), [`../database/database.md`](../database/database.md) (schema, migrations até a `21`), [`../regras/`](../regras/) (regras das telas), [`../prototipo/`](../prototipo/) (protótipo aprovado), os [guias em PDF](../guias/README.md) e o [fechamento da Sprint 3](../sprints/sprint3/README.md).

As instruções de instalação do `README.md` da raiz e o `src/gateway/README.md` descrevem só a Cloud API; a Evolution API e o Redis foram removidos na #82.

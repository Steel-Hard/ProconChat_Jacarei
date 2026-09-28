# Registros de decisão

Cada arquivo desta pasta registra **uma** decisão de produto ou de arquitetura: o contexto, o que foi decidido, as consequências e o que ela substitui. O objetivo é que ninguém precise reabrir uma discussão sem saber por que ela foi fechada daquele jeito.

## Como ler

- **Status `Aceita`**: vale para o projeto. Implementações novas devem seguir.
- **Status `Proposta`**: recomendação ainda não confirmada pelo grupo.
- **Status `Substituída`**: indica qual decisão a substituiu.

Quando uma decisão daqui contradiz um documento mais antigo (`architecture/`, `database/`, `historico/`), **vale a decisão**.

## Índice

| # | Decisão | Status | Requisitos |
|---|---|---|---|
| [001](001-fluxo-guiado-por-categorias.md) | Fluxo guiado por categorias e perguntas | Aceita | RF02, RF03, RP05, RNF01 |
| [002](002-lgpd-dados-pessoais.md) | Tratamento de dados pessoais | Aceita | RNF03 |
| [003](003-migracao-whatsapp-cloud-api.md) | Migração para a WhatsApp Cloud API | Aceita | RF01, RP01, RNF02 |
| [004](004-contas-e-permissoes-granulares.md) | Conta Admin e permissões granulares | Aceita | RF08 (substitui RF12 interno) |
| [005](005-mensagens-ao-cidadao.md) | Mensagens enviadas ao cidadão fora da conversa | Aceita | RF07, RNF03 |
| [006](006-ciclo-de-vida-do-agendamento.md) | Ciclo de vida do agendamento | Aceita | RF07, RF08 |
| [007](007-agenda-configuravel.md) | Agenda de atendimento configurável | Aceita | RF07, RF08 |
| [008](008-fluxo-da-conversa-e-desfechos.md) | Fluxo da conversa, retorno e desfechos | Aceita | RF03, RF04, RF06, RF07 |
| [009](009-complemento-por-llm.md) | Complemento por LLM | Aceita, com uma parte Proposta | RF05, RNF02, RNF05, RP05 |
| [010](010-registro-de-interacoes-e-relatorios.md) | Registro de interações e relatórios | Aceita | RF06, RNF03 |
| [011](011-atendimento-humano-no-chat-nao-adotado.md) | Atendimento humano no chat não adotado | Aceita | RF07, RP04 |

Origem: revisão do protótipo do painel administrativo com o grupo, em 26 e 27/09/2026.

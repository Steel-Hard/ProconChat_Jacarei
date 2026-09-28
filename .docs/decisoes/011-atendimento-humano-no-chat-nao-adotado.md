# 011 — Atendimento humano no chat não adotado

- **Status:** Aceita
- **Data:** 27/09/2026
- **Requisitos:** RF07, RP04

## Contexto

O documento [`../historico/GUIA-FLUXO-BOT-ATENDENTE.md`](../historico/GUIA-FLUXO-BOT-ATENDENTE.md) propôs que um atendente humano pudesse assumir a conversa no WhatsApp, com modos como `BOT_ACTIVE`, `WAITING_HUMAN` e `HUMAN_ACTIVE`.

## Decisão

**Não adotar.** Quando o chatbot não resolve a dúvida, o encaminhamento é o **agendamento presencial** (RF07), que é o que o desafio pede.

Motivos:

- nenhum requisito do desafio pede conversa com atendente pelo WhatsApp;
- exigiria uma tela de atendimento em tempo real, filas e presença de funcionários online, o que está fora do prazo (RP04);
- conflita com a decisão de não guardar o texto digitado pelo cidadão ([002](002-lgpd-dados-pessoais.md)).

## Consequências

- O guia foi movido para `historico/`, com uma nota dizendo que não foi adotado.
- A tela de Sessões continua somente leitura, sem ação de "assumir conversa".

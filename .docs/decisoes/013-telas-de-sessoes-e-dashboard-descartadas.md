# 013 — Telas de Sessões e Dashboard descartadas

- **Status:** Aceita
- **Data:** 22/11/2026
- **Requisitos:** RF06

## Contexto

A revisão do protótipo previu duas telas no painel: **Dashboard** (issue #71) e **Sessões** (issues #72 e #76). As regras ([02](../regras/02-dashboard.md) e [07](../regras/07-sessoes.md)) e várias decisões as descreviam como telas que viriam depois. Elas nunca foram entregues, e as issues estão fechadas no board.

Ao escrever o manual do painel (#119), a documentação e o painel apareceram diferentes nesses pontos (#174).

## Decisão

**Descartar as duas telas.** O grupo decidiu, de propósito, não construir a tela de Dashboard nem a tela de Sessões. Elas deixam de ser "em construção" ou "pendentes".

## Consequências

- A permissão **Ver sessões** fica registrada como descartada, junto com a tela. Ela continua existindo no servidor e não aparece na tela de Usuários.
- O Dashboard não tem permissão própria. Os blocos que a regra 02 previa deixam de existir, inclusive o bloco "Saúde do chatbot".
- O prazo do campo "Alertar quando a espera passar de", na tela de Horários, continua sendo salvo, mas nenhuma tela mostra um aviso a partir dele.
- As regras [02](../regras/02-dashboard.md) e [07](../regras/07-sessoes.md) continuam na pasta só como registro, marcadas como telas descartadas.
- As decisões antigas que citam as duas telas mantêm o texto e ganharam uma nota de estado que aponta para esta decisão.
- O painel ainda tem, no código, a rota e os textos das duas telas, o item de menu escondido e a permissão. Não há issue aberta para retirá-los.
- A arquitetura e a rastreabilidade do desafio, que ainda tratam as duas telas como em construção ou como entrega, são ajustadas na #70.

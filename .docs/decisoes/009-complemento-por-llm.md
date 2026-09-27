# 009 — Complemento por LLM

- **Status:** Aceita (itens 1 a 5). **Proposta** (item 6, envio assíncrono)
- **Data:** 27/09/2026
- **Requisitos:** RF05, RNF02, RNF05, RP05

## Contexto

O serviço de LLM (Ollama local, `llama3.2:3b`) foi implementado na Sprint 1 (#15), mas nenhum fluxo o chama. Em CPU, cada resposta levou de 23 a 38 segundos, o que é longo demais para uma conversa (RNF02).

## Decisão

1. **O LLM só escreve um texto complementar**, a partir da resposta oficial já escolhida pelo Motor de Decisão. Ele nunca decide o fluxo e nunca substitui a resposta oficial (RF05, RP05).
2. **Cada pergunta tem a opção "Permitir complemento por IA"**, ligada por padrão, para que a equipe possa deixar respostas sensíveis só com o texto oficial.
3. **Perguntas fora do escopo nunca usam IA.**
4. **Todo texto gerado por IA leva o rótulo "Gerado com auxílio de IA"**, na mensagem do WhatsApp e na linha do tempo do painel (RNF05).
5. **Se a IA falhar, o cidadão recebe só o texto oficial.** O evento fica registrado ("Complemento por IA indisponível") e é contado na Saúde do chatbot.
6. **Proposta: envio assíncrono.** A resposta oficial é enviada **na hora**, e o complemento vai como **segunda mensagem** quando estiver pronto, com tempo limite. Assim o cidadão nunca espera pelo LLM. Se aceita, a prévia da tela de Conteúdo precisa mostrar o complemento num balão separado.

## Consequências

- `Questions` ganha a coluna `llm_allowed`.
- O registro de interações precisa distinguir "IA não foi chamada" (pergunta sem permissão ou fora do escopo) de "IA falhou" ([010](010-registro-de-interacoes-e-relatorios.md)).
- O item 6 precisa de decisão do grupo antes de implementar o RF05.

# 010 — Registro de interações e relatórios

- **Status:** Aceita
- **Data:** 26 e 27/09/2026
- **Requisitos:** RF06, RNF03

## Contexto

O RF06 pede o registro das interações para "análise posterior dos fluxos mais utilizados". A tabela `Interactions` existe desde a Sprint 1, mas nada grava nela (#16). Ela guarda só categoria, pergunta e texto do LLM, o que não basta para as telas de Sessões e Relatórios.

## Decisão

1. **Cada passo da conversa é gravado como um evento tipado, com data e hora:**
   - início e escolhas de categoria e pergunta;
   - resposta entregue (com IA / sem IA / IA falhou);
   - resposta a "A dúvida foi resolvida?";
   - agendamento oferecido, sem horário, recusado;
   - quem comparece, agendamento criado;
   - consulta, remarcação ou cancelamento de agendamento existente;
   - abandono (com a etapa).

   **O texto digitado pelo cidadão nunca é gravado** ([002](002-lgpd-dados-pessoais.md)).
2. **A sessão guarda o desfecho** ([008](008-fluxo-da-conversa-e-desfechos.md)).
3. **Definições dos indicadores**, que têm que ser iguais em todas as telas:
   - **categorias e perguntas mais acessadas:** conversas distintas que escolheram o item. Escolher o mesmo item de novo na mesma conversa não conta duas vezes;
   - **"Resolvidas sem agendamento":** conversas em que o cidadão respondeu "Sim" a "A dúvida foi resolvida?";
   - **"Resultado dos agendamentos":** considera a **data do atendimento** no período, não a data de criação;
   - **"Taxa de não comparecimento":** Não compareceu ÷ (Atendido + Não compareceu).
4. **Exportação em PDF, Excel (uma aba por seção) e CSV (um arquivo por seção, em .zip).** Todas são geradas no backend e contêm **apenas dados agregados**, sem nome, CPF ou protocolo.
5. **A tela de Sessões é somente leitura** e mostra os passos, nunca o texto digitado.

## Consequências

- `Interactions` precisa ser reestruturada, ou substituída por uma tabela de eventos com um campo de tipo.
- A geração de PDF no backend tem um custo técnico a decidir: navegador headless (fiel à tela, imagem Docker pesada) ou biblioteca de PDF (leve, gráficos à parte).

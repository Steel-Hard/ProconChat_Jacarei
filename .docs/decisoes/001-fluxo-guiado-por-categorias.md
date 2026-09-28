# 001 — Fluxo guiado por categorias e perguntas

- **Status:** Aceita
- **Data:** 07/09/2026 (fluxo por categorias), complementada em 27/09/2026 (listas e paginação)
- **Requisitos:** RF02, RF03, RP05, RNF01

## Contexto

O desafio pede navegação guiada por uma tabela de decisões fornecida pelo PROCON (RF02/RF03) e proíbe que o LLM decida o fluxo (RP05). O material que o PROCON entregou (`database/Dúvidas Frequentes.odt`) tem formato de FAQ: assuntos, perguntas, respostas, base legal e documentos.

## Decisão

1. **O cidadão navega tocando em opções, nunca digitando texto livre que o sistema interpreta.** Primeiro escolhe a categoria, depois a pergunta.
2. **O conteúdo é plano: categoria → perguntas.** Não é uma árvore de decisão com ramificações.
3. **Cada categoria e pergunta tem um título curto de até 24 caracteres** (pergunta pode ter descrição curta de até 72), que é o limite das listas tocáveis do WhatsApp.
4. **Listas com mais de 10 itens são paginadas:**
   - página 1: 9 itens + "Ver mais opções";
   - páginas do meio: 8 itens + "Voltar" + "Ver mais opções";
   - última página: até 9 itens + "Voltar".
5. **Uma categoria só aparece para o cidadão se tiver ao menos uma pergunta ativa.**
6. **Conteúdo não é excluído, só desativado**, para preservar o histórico e os relatórios.
7. **A ordem das listas no WhatsApp é definida pela equipe** no painel.

## Consequências

- O Motor de Decisão precisa listar por página e respeitar a regra da categoria oculta.
- Categorias e perguntas ganham colunas de título curto, descrição curta e ordem.
- **Risco em aberto:** um avaliador pode esperar árvores com ramificações ("tem nota fiscal? sim/não"). O modelo é defensável porque segue o material do PROCON, mas deve ser confirmado com o professor e com o parceiro. Ver [`../desafio/rastreabilidade.md`](../desafio/rastreabilidade.md).
- Ideia registrada para o futuro, não adotada: uma busca por palavra-chave dentro da categoria, sem LLM, para reduzir listas longas.

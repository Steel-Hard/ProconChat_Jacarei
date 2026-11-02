# 009 — LLM na resposta ao cidadão

- **Status:** Aceita (itens 2, 3 e 5 em 27/09/2026; itens 1, 4 e 6 na redação atual em 02/11/2026, aceite da equipe registrado no [comentário do PR #148](https://github.com/Steel-Hard/ProconChat_Jacarei/pull/148#issuecomment-6591345542))
- **Data:** 27/09/2026 · atualizada em 02/11/2026 (#66)
- **Requisitos:** RF05, RNF02, RNF04, RNF05, RP05

## Contexto

O serviço de LLM (Ollama local, `llama3.2:3b`) foi implementado na Sprint 1 (#15) e ficou sem ser chamado pelo fluxo até a #66. Em CPU, cada resposta leva de 23 a 38 segundos, o que é longo para uma conversa (RNF02).

A primeira versão da #66 enviava a resposta oficial na hora e o texto da IA como segunda mensagem, uns 30 s depois. O cidadão respondia "A dúvida foi resolvida?" antes de ler a explicação e lia duas respostas para a mesma pergunta. Por isso os itens 1, 4 e 6 foram revistos em 02/11/2026.

## Decisão

1. **A IA escreve a explicação principal da resposta, a partir da resposta oficial já escolhida pelo Motor de Decisão.** Ela reescreve só o campo `resposta` e nunca decide o fluxo: o passo da conversa e os botões são definidos pelo código antes da geração (RF05, RP05). Base legal, documentos, "O que fazer agora", o aviso de caráter não vinculante (RNF04) e a pergunta do passo seguinte vêm do texto oficial e são acrescentados pelo código. A reescrita só é usada se citar todos os números da resposta oficial e nenhum número novo. A resposta oficial continua sendo a alternativa garantida (item 5).
2. **Cada pergunta tem a opção "Permitir complemento por IA"**, ligada por padrão, para que a equipe possa deixar respostas sensíveis só com o texto oficial.
3. **Perguntas fora do escopo nunca usam IA.**
4. **Todo texto gerado por IA leva o rótulo "Gerado com auxílio de IA"**: no WhatsApp, no rodapé da mensagem interativa (`footer`); no painel, na linha do tempo (RNF05).
5. **Se a IA não puder ser usada, o cidadão recebe só o texto oficial**, nas mensagens de sempre (texto oficial completo e a pergunta com botões). O evento fica registrado ("IA indisponível") e é contado na Saúde do chatbot.
6. **Envio único, depois da IA ou da alternativa oficial, com indicador de digitação.**
   - Ao escolher uma pergunta com IA permitida, o cidadão vê "digitando…" no WhatsApp (até 25 s, limite da Meta). Uma mensagem enviada nesse meio tempo não avança a conversa.
   - Antes de gerar, o Backend sonda o Ollama (`GET /api/tags`, 2 s). Fora do ar: a resposta oficial sai em até 2 s. No ar: o cidadão espera a geração (31 a 38 s em CPU), limitada por `LLM_TIMEOUT_MS`. RNF02 passa a depender do tempo da IA: custo aceito.
   - Uma geração por vez: quem chega com a IA ocupada recebe a resposta oficial na hora.
   - A mensagem da IA é uma mensagem de botões de até 1024 caracteres (limite da Meta). Passou disso, a IA falhou, o texto veio vazio, os números não conferem ou o envio foi recusado: sai a resposta oficial.
   - O `ANSWER_SENT` é gravado na hora real do envio: `USED` quando saiu a mensagem da IA, `FAILED` quando saiu a oficial. Se o Backend reiniciar no meio, a próxima mensagem do cidadão recebe a resposta oficial.
   - A prévia da tela de Conteúdo mostra um balão só, com a explicação da IA, o bloco oficial, o aviso, os botões e o rótulo no rodapé (#124).

Detalhes do contrato em [`llm/contrato.md`](../llm/contrato.md).

## Consequências

- `Questions` ganha a coluna `llm_allowed`.
- O registro de interações precisa distinguir "IA não foi chamada" (pergunta sem permissão ou fora do escopo) de "IA falhou" ([010](010-registro-de-interacoes-e-relatorios.md)).
- Pergunta com IA desligada ou fora do escopo grava `ANSWER_SENT` com `llm: "NOT_CALLED"` na hora, como antes.
- **Produção sem Ollama:** a VM atual (`t4g.small`, #51) não roda o perfil `llm`. Enquanto for assim, toda resposta com IA permitida sai só com o texto oficial e grava `FAILED`. As opções são: ligar o Ollama numa VM com mais memória (perfil `llm`); usar o Ollama de uma máquina da equipe fora da VM, por rede privada, apontando `OLLAMA_URL` para ela (aceito em 02/11/2026); ou desligar a opção nas perguntas. No modo com outra máquina, sai da VM só o texto oficial estruturado da resposta, sem telefone nem texto do cidadão, e o Ollama continua self-hosted pela equipe. Risco aceito: quem controla a máquina remota controla o texto da explicação escrita pela IA, que continua rotulado "Gerado com auxílio de IA" e passa pela conferência dos números. Como configurar e proteger cada modo: [`infra/deploy.md`](../infra/deploy.md).

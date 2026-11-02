# 009 — Complemento por LLM

- **Status:** Aceita (itens 1 a 5 em 27/09/2026; item 6 em 02/11/2026)
- **Data:** 27/09/2026 · atualizada em 02/11/2026 (#66)
- **Requisitos:** RF05, RNF02, RNF05, RP05

## Contexto

O serviço de LLM (Ollama local, `llama3.2:3b`) foi implementado na Sprint 1 (#15) e ficou sem ser chamado pelo fluxo até a #66. Em CPU, cada resposta levou de 23 a 38 segundos, o que é longo demais para uma conversa (RNF02).

## Decisão

1. **O LLM só escreve um texto complementar**, a partir da resposta oficial já escolhida pelo Motor de Decisão. Ele nunca decide o fluxo e nunca substitui a resposta oficial (RF05, RP05).
2. **Cada pergunta tem a opção "Permitir complemento por IA"**, ligada por padrão, para que a equipe possa deixar respostas sensíveis só com o texto oficial.
3. **Perguntas fora do escopo nunca usam IA.**
4. **Todo texto gerado por IA leva o rótulo "Gerado com auxílio de IA"**, na mensagem do WhatsApp e na linha do tempo do painel (RNF05).
5. **Se a IA falhar, o cidadão recebe só o texto oficial.** O evento fica registrado ("Complemento por IA indisponível") e é contado na Saúde do chatbot.
6. **Envio assíncrono (aceito em 02/11/2026, #66).** A resposta oficial é enviada **na hora**, e o complemento vai como **segunda mensagem** quando estiver pronto. Assim o cidadão nunca espera pelo LLM.
   - O complemento só é gerado para pergunta dentro do escopo com "Permitir complemento por IA" ligada. A geração respeita o tempo limite `LLM_TIMEOUT_MS` (padrão 20 s).
   - A mensagem é o texto gerado sem espaços nas pontas, uma linha em branco e o rótulo **"Gerado com auxílio de IA" no rodapé**. Não repete o aviso de caráter não vinculante, que já vai no fim da resposta oficial, e não usa itálico. Acima de 4096 caracteres, com o rótulo, a mensagem não é enviada nem cortada.
   - O complemento é enviado mesmo que o cidadão já tenha respondido "A dúvida foi resolvida?" ou entrado no agendamento. O Gateway o envia na mesma fila por telefone das outras mensagens, então ele nunca chega antes da resposta que ainda está saindo.
   - Para essas perguntas, o `ANSWER_SENT` é gravado **quando o envio termina**, com o horário da resposta oficial, para a linha do tempo ficar na ordem certa. O `llm` é `USED` quando o Gateway confirmou o envio. É `FAILED` quando o cidadão ficou só com o texto oficial: o LLM falhou ou esgotou o tempo, a mensagem passou do limite, ou o Gateway recusou ou não respondeu. `ok` do Gateway quer dizer que a Meta aceitou, não que entregou.
   - Custos aceitos: o passo "Resposta entregue" some da linha do tempo por até uns 35 s; se o Backend reiniciar no meio, aquele `ANSWER_SENT` se perde.
   - A prévia da tela de Conteúdo mostra o complemento num balão separado (#124).

## Consequências

- `Questions` ganha a coluna `llm_allowed`.
- O registro de interações precisa distinguir "IA não foi chamada" (pergunta sem permissão ou fora do escopo) de "IA falhou" ([010](010-registro-de-interacoes-e-relatorios.md)).
- Pergunta com IA desligada ou fora do escopo grava `ANSWER_SENT` com `llm: "NOT_CALLED"` na hora, como antes.
- **Produção sem Ollama:** a VM atual (`t4g.small`, #51) não roda o perfil `llm`. Enquanto for assim, toda resposta com IA permitida sai só com o texto oficial e grava `FAILED`. As opções são: ligar o Ollama numa VM com mais memória (perfil `llm`); usar o Ollama de uma máquina da equipe fora da VM, por rede privada, apontando `OLLAMA_URL` para ela (aceito em 02/11/2026); ou desligar a opção nas perguntas. No modo com outra máquina, sai da VM só o texto oficial estruturado da resposta, sem telefone nem texto do cidadão, e o Ollama continua self-hosted pela equipe. Risco aceito: quem controla a máquina remota controla o texto do complemento, que continua rotulado "Gerado com auxílio de IA". Como configurar e proteger cada modo: [`infra/deploy.md`](../infra/deploy.md).

# 008 — Fluxo da conversa, retorno e desfechos

- **Status:** Aceita
- **Data:** 26 e 27/09/2026
- **Requisitos:** RF03, RF04, RF06, RF07

## Contexto

Na Sprint 1 a conversa terminava na resposta final. Para cumprir o RF07 ("quando a resposta não solucionar a dúvida"), o chatbot precisa saber se a dúvida foi resolvida. E, para os relatórios (RF06), cada conversa precisa ter um desfecho claro.

## Decisão

### Fluxo de uma dúvida nova

1. Saudação com a menção curta ao caráter orientativo, seguida da lista de categorias ([001](001-fluxo-guiado-por-categorias.md)).
2. O cidadão escolhe a categoria e depois a pergunta.
3. **O bot envia a resposta**, com o aviso de caráter não vinculante ao final (RNF04).
4. Em seguida, depende da pergunta:
   - **pergunta fora do escopo do PROCON:** encerra com a orientação de encaminhamento. **Nunca oferece agendamento**. "Fora do escopo" e "Exige atendimento presencial" são mutuamente exclusivos;
   - **pergunta que exige atendimento presencial:** oferece agendamento direto, **sem perguntar se a dúvida foi resolvida**;
   - **demais perguntas:** pergunta **"A dúvida foi resolvida?"**. Se a resposta for "Não", oferece agendamento.
5. **Agendamento:** o cidadão diz quem vai comparecer (ele mesmo ou um representante), escolhe o horário e recebe a confirmação ([005](005-mensagens-ao-cidadao.md)).

### Retorno de quem já tem agendamento

Quando alguém com agendamento futuro volta a escrever, o bot oferece: **Remarcar / Cancelar / Tenho outra dúvida**. A conversa antiga não é retomada; abre-se uma sessão nova.

### Timeout

**Uma sessão sem interação por 30 minutos vira Abandonada.** A próxima mensagem abre uma sessão nova. Hoje a sessão nunca expira, e quem volta dias depois cai no meio do fluxo. O valor de 30 minutos é uma constante do sistema, não uma configuração.

### Desfechos (cada sessão tem exatamente um)

| Desfecho | Quando |
|---|---|
| Resolvida sem agendamento | O cidadão respondeu "Sim" a "A dúvida foi resolvida?" |
| Terminou em agendamento | Um agendamento foi criado |
| Fora do escopo do PROCON | Recebeu a orientação de encaminhamento |
| Sem horário disponível na janela | Quis agendar, mas não havia horário livre |
| Não quis agendar | Recebeu a oferta de agendamento e recusou |
| Remarcou ou cancelou agendamento existente | Conversa de retorno só para isso |
| Abandonada | 30 minutos sem interação antes de um desfecho |
| Em andamento | Ainda não terminou |

As **etapas de abandono** têm nomes fixos, usados em Sessões e em Relatórios: na lista de categorias, na lista de perguntas, aguardando a resposta, na pergunta "A dúvida foi resolvida?", em quem vai comparecer, na escolha do horário.

## Consequências

- `Sessions` ganha um campo de desfecho, com os 8 valores acima, e a lógica de timeout.
- A máquina de estados do bot (`conversationFlow.service.ts`) ganha as etapas novas: "resolveu?", quem comparece, escolha de horário e o menu de retorno.
- **Pendente (RF04):** incluir na resposta um trecho explícito de **próximos passos** ("O que fazer agora"). Ver [`../desafio/rastreabilidade.md`](../desafio/rastreabilidade.md).

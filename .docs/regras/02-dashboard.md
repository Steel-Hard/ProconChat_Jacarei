# Dashboard

## Para que serve

Responder à pergunta **"o que eu preciso fazer hoje?"**. Análises mais longas ficam em [Relatórios](05-relatorios.md).

## Quem acessa

Qualquer conta que tenha **pelo menos uma** das permissões Ver agendamentos, Ver sessões ou Ver relatórios, ou a conta Admin. **Cada bloco aparece conforme a permissão.** Quem não pode ver nenhum bloco entra direto na primeira tela permitida.

## Cabeçalho

- Saudação conforme a hora: **"Bom dia"** até 11:59, **"Boa tarde"** de 12:00 a 17:59, **"Boa noite"** a partir de 18:00, seguida do primeiro nome.
- Data por extenso e hora atual.

## Blocos

### Saúde do chatbot (só Admin)

Mostra o estado do WhatsApp e do chatbot. **Com algum problema, vira um destaque vermelho no topo**, com botão para a tela de [WhatsApp](11-whatsapp.md). **Sem problemas, fica como uma faixa discreta.**

| Item | Problema quando |
|---|---|
| Credenciais da Cloud API | Token inválido ou expirado: o chatbot não envia nem responde |
| Webhook | Nenhum evento recebido há mais de 24 horas |
| Qualidade do número | Qualidade "Baixa" na Meta: o envio pode ser limitado |
| Limite de envios da Meta | Mais de 80% do limite diário usado |
| Respostas automáticas | Pausadas |
| Falhas de entrega (24h) | Alguma mensagem do chatbot não chegou ao cidadão |
| Respostas sem IA (24h) | Informativo, nunca é problema: a IA falhou e o cidadão recebeu só o texto oficial |

### Alerta de agenda lotada (quem vê agendamentos)

Aparece em vermelho **só quando não há nenhum horário livre dentro da janela de agendamento**: "Sem horários livres nos próximos [N] dias. O chatbot não está conseguindo agendar." Tem link para Horários de atendimento (só para quem pode configurá-los).

### Agendamentos pendentes (quem vê agendamentos)

- O número total de pendentes e o botão **"Ver todos"**.
- **Vencidos sem responsável:** pendentes cujo horário já passou sem que ninguém assumisse, em destaque e no topo.
- **Aguardando registro na equipe** (só para quem gerencia agendamentos): quantidade de confirmados cujo horário passou e que ainda não foram marcados como Atendido ou Não compareceu, com link para a lista filtrada.
- **Próximos:** os próximos pendentes, com o botão **"Assumir"** (só para quem gerencia agendamentos).

### Dúvidas resolvidas sem agendamento · últimos 7 dias (quem vê relatórios)

Percentual das conversas em que o cidadão **respondeu no chatbot que a dúvida foi resolvida**. É a mesma definição usada em Relatórios.

### Próximo horário livre (quem vê agendamentos)

- Em destaque: **a data e a hora do próximo horário que o chatbot pode oferecer hoje**, e "em N dias".
- **Amarelo** quando a espera passa do limite configurado em Horários de atendimento; **vermelho** quando não há horário livre na janela.
- Informação secundária: **ocupação da janela**, que é vagas reservadas (pendentes e confirmadas) sobre o total de vagas. Datas bloqueadas não entram.

### Meus agendamentos (quem tem agendamentos atribuídos)

- Aparece só se a conta for responsável por algum agendamento.
- Mostra **hoje e amanhã**, sem os cancelados.
- **Aguardando registro:** os seus confirmados cujo horário já passou aparecem no topo, com os botões rápidos **"Atendido"** e **"Não compareceu"**.

### Agenda de hoje (quem vê agendamentos)

Todos os agendamentos do dia, de qualquer responsável e status: hora, titular, se comparece por representante, responsável e status.

### Categorias mais acessadas · últimos 7 dias (quem vê relatórios)

Quantidade de **conversas distintas** que escolheram cada categoria. Escolher a mesma categoria duas vezes na mesma conversa conta uma vez.

### Perguntas que mais não resolveram · últimos 7 dias (quem vê relatórios)

Top 3 perguntas em que mais cidadãos responderam que a dúvida **não** foi resolvida. Indica respostas que talvez precisem ser reescritas. Tem link **"Revisar em Conteúdo"** para quem gerencia o conteúdo.

## O que não existe de propósito

| O que não existe | Por quê |
|---|---|
| Lista de conversas em andamento | A equipe não tem o que fazer com ela, porque não existe atendimento humano pelo chat ([decisão 011](../decisoes/011-atendimento-humano-no-chat-nao-adotado.md)). As conversas ficam na tela de Sessões |
| Configurar os períodos dos blocos | "Últimos 7 dias", "hoje e amanhã" e "últimas 24h" são parte da definição de cada indicador. Outros recortes ficam em Relatórios |

## Relações

- Os números usam as mesmas definições de [Relatórios](05-relatorios.md).
- Janela, antecedência e limite de espera vêm de [Horários de atendimento](08-horarios-de-atendimento.md).

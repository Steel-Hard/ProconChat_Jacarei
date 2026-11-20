# 005 — Mensagens enviadas ao cidadão fora da conversa

- **Status:** Aceita
- **Data:** 27/09/2026
- **Requisitos:** RF07, RNF03

## Contexto

Inicialmente o grupo decidiu não enviar nenhuma mensagem que o cidadão não tivesse provocado. Mas, sem isso, um agendamento cancelado pela equipe (ex.: unidade fechada) não chegaria ao conhecimento do cidadão, que apareceria no balcão mesmo assim. Um lembrete na véspera também reduz as faltas.

Na Cloud API ([003](003-migracao-whatsapp-cloud-api.md)), mensagens de texto livre só podem ser enviadas **até 24 horas depois da última mensagem do cidadão**. Fora disso, só com **modelos de mensagem aprovados pela Meta**, que são cobrados por mensagem.

## Decisão

| Mensagem | Quando | Tipo | Custo na Cloud API |
|---|---|---|---|
| **Confirmação do agendamento** | Logo após o cidadão escolher o horário | Texto fixo no código, dentro da janela | Gratuita |
| **Lembrete** | X horas antes do atendimento, configurável; pode ser desligado | Modelo aprovado | Paga |
| **Aviso de cancelamento pela equipe** | Quando a equipe cancela, a qualquer momento antes do horário, **se o interruptor de aviso estiver ligado** (desligado por padrão) | Modelo aprovado | Paga |
| **Chatbot pausado** | Quando alguém escreve durante a pausa | Texto fixo, dentro da janela | Gratuita |

Regras:

1. **Nenhuma mensagem ao cidadão é texto livre digitado por funcionário.** Todas seguem textos fixos com campos preenchidos pelo sistema.
2. **O cancelamento pela equipe exige um motivo de uma lista fixa**, e cada motivo tem uma frase pré-definida:
   - "Unidade fechada nesta data";
   - "A pedido do cidadão";
   - "Agendamento duplicado";
   - "Outro motivo".

   O funcionário vê a prévia exata da mensagem antes de confirmar. Pode também escrever uma observação interna, que não é enviada.
3. **A confirmação traz:** protocolo, data e hora, endereço da unidade, a lista de documentos do grupo (titular ou representante), os documentos úteis da pergunta e o aviso de que o cidadão receberá, naquele número, o lembrete e o aviso de cancelamento **que estiverem ligados** (a frase muda com cada combinação e some quando os dois estão desligados; textos em [Documentos](../regras/09-documentos.md)). O título é **"Agendamento realizado"**, e não "confirmado", para não confundir com o status interno "Confirmado".
4. **Os documentos do lembrete são os que foram enviados na confirmação**, guardados no agendamento, e não a configuração atual.
5. **Se o envio falhar**, o histórico do agendamento registra a falha em destaque, com a opção "Tentar novamente".
7. **O aviso de cancelamento é opcional e nasce desligado** (issue #164). O Admin liga e desliga o interruptor na tela de WhatsApp, **na hora e com diálogo de confirmação** (como o "Pausar respostas automáticas"), e cada mudança fica registrada com quem e quando. O motivo: a Meta cobra cada mensagem de modelo, e o aviso de cancelamento não é requisito do desafio. Com o aviso desligado, o cancelamento funciona igual (o horário volta a ficar livre), mas **o sistema não envia nada ao cidadão**: a tela diz que ele não será avisado e a equipe deve avisá-lo por outro meio. O histórico registra "Aviso ao cidadão desativado: cidadão não avisado pelo sistema", sem destaque de erro e sem "Tentar novamente". O interruptor vale para todo cancelamento feito pela equipe, inclusive o cancelamento em massa, e **não vale para o lembrete**, que tem o próprio liga e desliga em Horários de atendimento.
8. **O lembrete segue regras próprias de envio** (issue #74): um lembrete **por data marcada** (quem remarca recebe um novo para a nova data e nunca um para a data antiga); nenhum lembrete para agendamento marcado ou remarcado dentro da janela do lembrete nem para agendamento já cancelado; falha passageira do sistema de envio é tentada de novo até o horário do atendimento, e erro definitivo da Meta é registrado, com o código, e não se repete; sem documentos na lista, o lembrete pede "um documento oficial com foto". Ligar e desligar o lembrete em Horários pede confirmação, avisa do custo e entra no Histórico de alterações da tela de WhatsApp.
6. **Se o cidadão responder a um lembrete**, a janela de 24h reabre e o bot volta a conversar normalmente (remarcar, cancelar).

## Consequências

- Precisa haver um jeito de o Backend pedir ao Gateway "envie esta mensagem para este número". Hoje o Gateway só responde.
- Os modelos de lembrete e de cancelamento precisam ser cadastrados e aprovados na Meta antes do uso. A tela de WhatsApp mostra o status de cada um, e a seção do lembrete em Horários repete esse estado para o Admin.
- O telefone passa a ser guardado criptografado no agendamento. Ver [002](002-lgpd-dados-pessoais.md).
- **Custo:** o PROCON precisa decidir se aceita o custo por mensagem dos lembretes e dos avisos de cancelamento. Como os dois podem ser desligados (o aviso de cancelamento nasce desligado), o sistema funciona em todos os cenários. Detalhes de cobrança no [guia de modelos de mensagem](../whatsapp/modelos-de-mensagem.md).

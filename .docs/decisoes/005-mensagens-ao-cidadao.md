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
| **Aviso de cancelamento pela equipe** | Quando a equipe cancela, a qualquer momento antes do horário | Modelo aprovado | Paga |
| **Chatbot pausado** | Quando alguém escreve durante a pausa | Texto fixo, dentro da janela | Gratuita |

Regras:

1. **Nenhuma mensagem ao cidadão é texto livre digitado por funcionário.** Todas seguem textos fixos com campos preenchidos pelo sistema.
2. **O cancelamento pela equipe exige um motivo de uma lista fixa**, e cada motivo tem uma frase pré-definida:
   - "Unidade fechada nesta data";
   - "A pedido do cidadão";
   - "Agendamento duplicado";
   - "Outro motivo".

   O funcionário vê a prévia exata da mensagem antes de confirmar. Pode também escrever uma observação interna, que não é enviada.
3. **A confirmação traz:** protocolo, data e hora, endereço da unidade, a lista de documentos do grupo (titular ou representante), os documentos úteis da pergunta e o aviso de que o cidadão receberá lembrete e avisos de cancelamento naquele número. O título é **"Agendamento realizado"**, e não "confirmado", para não confundir com o status interno "Confirmado".
4. **Os documentos do lembrete são os que foram enviados na confirmação**, guardados no agendamento, e não a configuração atual.
5. **Se o envio falhar**, o histórico do agendamento registra a falha em destaque, com a opção "Tentar novamente".
6. **Se o cidadão responder a um lembrete**, a janela de 24h reabre e o bot volta a conversar normalmente (remarcar, cancelar).

## Consequências

- Precisa haver um jeito de o Backend pedir ao Gateway "envie esta mensagem para este número". Hoje o Gateway só responde.
- Os modelos de lembrete e de cancelamento precisam ser cadastrados e aprovados na Meta antes do uso. A tela de WhatsApp mostra o status de cada um.
- O telefone passa a ser guardado criptografado no agendamento. Ver [002](002-lgpd-dados-pessoais.md).
- **Custo:** o PROCON precisa decidir se aceita o custo por mensagem dos lembretes. Como o lembrete pode ser desligado, o sistema funciona nos dois cenários.

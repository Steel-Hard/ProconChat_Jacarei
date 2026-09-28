# Horários de atendimento

## Para que serve

Definir **quando o PROCON atende presencialmente**. É daqui que o chatbot tira os horários livres que oferece ao cidadão. Também guarda os dados da unidade e a configuração do lembrete.

## Quem acessa

**Configurar atendimento presencial.**

## Regras gerais da tela

- **Segue o padrão de salvar** ([regras gerais](00-regras-gerais.md#3-salvar-descartar-e-registrar-quem-alterou)): tudo, inclusive adicionar ou remover datas bloqueadas, fica pendente até "Salvar alterações", com "N alterações não salvas" e "Descartar".
- **A disponibilidade é da unidade, não de cada funcionário.** Quem vai atender é definido depois, quando alguém assume o agendamento.
- Na Grade semanal e em Dados da unidade há o aviso: **"Se você mudar horários ou endereço, revise as perguntas do Conteúdo que citam essas informações"**, com link para Conteúdo.

## Seções

### Grade semanal

- Para cada dia da semana: ligado/desligado e **até 3 faixas de horário** (ex.: 08:30–11:30 e 13:30–16:30).
- **Validações**, com o erro mostrado na própria faixa, e **sem permitir salvar** enquanto houver erro:
  - início e fim preenchidos;
  - fim depois do início;
  - sem sobreposição com outra faixa do mesmo dia;
  - a faixa precisa comportar pelo menos um atendimento: "Esta faixa não comporta nenhum atendimento de 30 minutos".

### Duração e vagas

- **Duração de cada atendimento:** 20, 30, 40 ou 60 minutos. Os horários oferecidos começam no início da faixa e seguem de duração em duração.
- **Vagas simultâneas por horário:** de 1 a 20.

### Janela de agendamento

| Campo | Significa |
|---|---|
| **Oferecer horários até N dias à frente** (1 a 180) | O chatbot não oferece nada além disso |
| **Antecedência mínima** (mesmo dia, 1, 2, 3 ou 5 dias úteis) | O chatbot não oferece horários antes disso. **Contam apenas dias com atendimento configurado e não bloqueados** |
| **Alertar quando a espera passar de N dias** (1 a 60) | O Dashboard fica em alerta amarelo quando o próximo horário livre está além disso |

**"Agenda lotada"** quer dizer **não haver nenhum horário livre dentro da janela**. Nesse caso, o chatbot informa ao cidadão que não há horários disponíveis no momento, e o Dashboard mostra o alerta vermelho.

### Dados da unidade

- **Endereço da unidade** e **complemento ou referência** (opcional).
- Usados nas mensagens ao cidadão: confirmação do agendamento e lembrete.

### Lembrete ao cidadão

- **Ligado/desligado** e **quantas horas antes** do atendimento: 2, 6, 12, 24 ou 48.
- Enviado para agendamentos **Pendentes e Confirmados**.
- **Prévia do modelo fixo:**
  > "Olá, [primeiro nome]. Lembrete do seu atendimento no PROCON Jacareí: [dia da semana], [dd/mm], às [hh:mm] (protocolo [protocolo]). Endereço: [endereço (complemento)]. Traga: [documentos]. Se não puder comparecer, remarque ou cancele respondendo a esta mensagem."
- **Os documentos do lembrete são os que foram enviados na confirmação**, guardados no agendamento, e não a configuração atual.
- Aviso: "Cada lembrete é uma mensagem de modelo e tem custo por mensagem cobrado pela Meta."

### Datas bloqueadas

- **Dia inteiro** ou **apenas um período** (horário inicial e final), com uma descrição (ex.: "Aniversário de Jacareí").
- O chatbot não oferece horários nessas datas ou períodos.

### Prévia da grade

- Calendário mensal navegável. Cada dia mostra as **vagas livres**, ou está marcado como lotado, antes da antecedência, bloqueado, sem atendimento ou fora da janela.
- Clicar num dia mostra os horários e as vagas livres de cada um.
- Mostra também os horários por dia da semana e o total de vagas na janela.

## Quando a mudança afeta agendamentos existentes

Ao salvar, o sistema verifica se algum agendamento **Pendente ou Confirmado futuro** deixou de caber na configuração nova:

| Situação | Motivo mostrado |
|---|---|
| A data foi bloqueada | "Data bloqueada: [descrição]" |
| O horário caiu num período bloqueado | "Período bloqueado (hh:mm–hh:mm)" |
| O dia deixou de ter atendimento | "Dia sem atendimento na nova grade" |
| O horário deixou de existir por mudança de duração | "Horário deixou de existir com atendimentos de N minutos" |
| A faixa foi removida ou alterada | "Faixa de horário removida ou alterada" |
| As vagas foram reduzidas abaixo do que já está ocupado | Os **agendados por último** num horário lotado são os afetados |

Se houver afetados, abre a janela **"Esta alteração afeta N agendamentos"** com a lista e três opções:

- **Manter os agendamentos:** continuam válidos e ganham o selo "Fora da grade atual" (não são apontados de novo em mudanças futuras). Nenhum aviso é enviado.
- **Cancelar e avisar os cidadãos:** cancela todos com o motivo "Unidade fechada nesta data" (bloqueios) ou "Outro motivo" (demais casos), envia o aviso pelo WhatsApp e registra no histórico de cada um.
- **Voltar sem salvar.**

## O que não existe de propósito

| O que não existe | Por quê |
|---|---|
| Agenda por funcionário | A disponibilidade é da unidade; o responsável é definido ao assumir ([decisão 007](../decisoes/007-agenda-configuravel.md)) |
| Editar o texto do lembrete | É um modelo aprovado pela Meta; o texto é fixo ([decisão 005](../decisoes/005-mensagens-ao-cidadao.md)) |
| Configurar o tempo de abandono da conversa | São 30 minutos fixos no sistema |

## Relações

- Usado pelo chatbot para oferecer horários, pelo [calendário de Agendamentos](03-agendamentos.md) e pelo [Dashboard](02-dashboard.md).
- Os documentos da confirmação vêm de [Documentos](09-documentos.md).

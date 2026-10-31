# Horários de atendimento

## Para que serve

Definir **quando o PROCON atende presencialmente**. É daqui que o chatbot tira os horários livres que oferece ao cidadão. Também guarda os dados da unidade e a configuração do lembrete.

## Quem acessa

**Configurar atendimento presencial.**

## Estado da tela

**Pronta (backend na issue #64, tela na issue #125, mudanças agendadas na issue #134).** O chatbot oferece os horários da configuração salva aqui, seguindo em cada data a versão que vale nela (seção "Mudanças agendadas"). Ainda faltam: o envio do lembrete (issue #74; até lá a tela esconde a seção "Lembrete ao cidadão", e o salvamento mantém o liga/desliga e as horas como estão gravados), a janela de manter ou cancelar os agendamentos afetados (issue #75) e a criação de bloqueio de parte do dia (issue #77; a tela cria só bloqueio de dia inteiro, mas mostra e deixa remover os bloqueios parciais que já existirem).

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
  - a faixa precisa comportar pelo menos um atendimento: "Esta faixa não comporta nenhum atendimento de [N] minutos", conforme a duração configurada.

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

**Escondida até a issue #74.** Como nada envia o lembrete ainda, a tela não mostra esta seção. Salvar a tela mantém o liga/desliga e as horas exatamente como estão gravados. Quando o envio existir, a seção volta como descrita abaixo.

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

### Mudanças agendadas

A configuração pode mudar a partir de uma data, sem afetar os agendamentos de antes dela ([decisão 012](../decisoes/012-horarios-agendados.md)).

- **Qual configuração está em edição:** o topo da tela diz "Editando a configuração que vale hoje" ou "Editando a configuração a partir de dd/mm/aaaa". Se a configuração de hoje é uma mudança que já começou, aparece também "Valendo desde dd/mm/aaaa".
- **Criar:** em "Valer a partir de", a equipe escolhe uma data a partir de amanhã. A tela carrega a configuração que valeria nessa data, a equipe altera e salva. Data de hoje ou anterior mostra no campo "Escolha uma data a partir de amanhã.", não carrega nada e não deixa salvar.
- **Lista "Mudanças agendadas":** mostra cada mudança futura pela data de início, com "Editar" e "Cancelar mudança" (os botões são lidos como "Editar a mudança de dd/mm/aaaa" e "Cancelar a mudança de dd/mm/aaaa"). Se a lista não carregar, aparece "Não foi possível carregar as mudanças agendadas.".
- **Editar:** só antes da data de início. Salvar substitui a cópia da mudança e registra quem alterou e quando.
- **Cancelar:** só antes da data de início, depois de confirmar no diálogo "Cancelar a mudança de horários a partir de dd/mm/aaaa?". A mudança some da lista e as datas dela voltam a seguir a configuração anterior.
- **Trocar de versão com alterações não salvas** (Editar, outra data ou "Voltar à configuração de hoje") pede confirmação: "Descartar as alterações não salvas?". "Voltar" mantém o rascunho.
- **Vigência:** uma mudança vale da data de início até a véspera da próxima mudança. A configuração de hoje vale de hoje até a véspera da primeira mudança futura. Em cada data, a grade, a duração, as vagas, as datas bloqueadas e o endereço são os da versão que vale nela. A janela, a antecedência mínima e o alerta de espera são os da versão que vale hoje; os dias úteis da antecedência contam com a grade de cada dia.
- **Cópia própria:** cada mudança guarda a sua cópia dos horários, das datas bloqueadas e do endereço, e a tela avisa isso quando há mudanças agendadas. Por isso, um bloqueio novo só é aceito numa data da vigência da versão em edição. Fora dela, o servidor recusa com o erro no próprio bloqueio: "Esta data segue a mudança de dd/mm. Bloqueie lá." ou, antes do início da mudança em edição, "Esta data vem antes do início desta mudança (dd/mm). Bloqueie na configuração que vale nessa data.".
- **Travas do formulário:** desligar o dia, remover a faixa e bloquear a data só ficam travados pelos agendamentos da vigência da versão em edição. A prévia continua marcando todos os dias com agendamento.
- **Editar a configuração de hoje quando ela é uma mudança que já começou** grava uma mudança nova a partir de hoje; a que começou antes fica como estava.

## Quando a mudança afeta agendamentos existentes

Ao salvar, o sistema verifica se algum agendamento **Pendente ou Confirmado futuro** da vigência da versão salva deixou de caber na configuração nova. Agendamentos antes da data de início de uma mudança, ou a partir da mudança seguinte, não contam:

| Situação | Motivo mostrado |
|---|---|
| A data foi bloqueada | "Data bloqueada: [descrição]" |
| O horário caiu num período bloqueado | "Período bloqueado (hh:mm–hh:mm)" |
| O dia deixou de ter atendimento | "Dia sem atendimento na nova grade" |
| O horário deixou de existir por mudança de duração | "Horário deixou de existir com atendimentos de N minutos" |
| A faixa foi removida ou alterada | "Faixa de horário removida ou alterada" |
| As vagas foram reduzidas abaixo do que já está ocupado | Os **agendados por último** num horário lotado são os afetados |
| A duração aumentou e dois agendamentos **Confirmados** do mesmo responsável passaram a se sobrepor | "Responsável com outro agendamento sobreposto com atendimentos de N minutos (protocolo XXXXXXXX)" |
| Cancelar uma mudança agendada deixaria agendamentos da vigência dela fora da configuração anterior | O mesmo motivo da linha correspondente, conferido contra a configuração anterior. O cancelamento é recusado e a lista "Esta alteração afeta N agendamentos" aparece abaixo das mudanças agendadas |

**Comportamento atual, até a issue #75:** a tela não deixa salvar uma mudança que afete agendamentos. O funcionário cancela ou remarca o agendamento na tela de Agendamentos antes. Para isso:

- Os dias com agendamento futuro aparecem marcados na prévia, com os horários e a quantidade no detalhe do dia.
- O formulário recusa bloquear o dia inteiro de uma data com agendamento, desligar o dia da semana que tem agendamento (o checkbox fica desabilitado, com as próximas datas) e remover a faixa que cobre um horário com agendamento.
- As outras mudanças (alterar o início ou o fim de uma faixa, a duração, as vagas ou remover um bloqueio) são simuladas pela prévia antes de salvar: os afetados aparecem no campo ligado à mudança e na lista "Esta alteração afeta N agendamentos" (protocolo, dia, hora, status e motivo), e "Salvar alterações" fica desabilitado.
- Se ainda assim o servidor recusar ao salvar (por exemplo, um agendamento feito pelo chatbot entre a prévia e o salvar), a mesma lista aparece, agora com nome e CPF mascarado, e o salvar fica desabilitado até a próxima edição.

**Quando a issue #75 for feita:** se houver afetados, abre a janela **"Esta alteração afeta N agendamentos"** com a lista e três opções:

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

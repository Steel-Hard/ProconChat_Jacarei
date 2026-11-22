# Horários de atendimento

## Para que serve

Definir **quando o PROCON atende presencialmente**. É daqui que o chatbot tira os horários livres que oferece ao cidadão. Também guarda os dados da unidade e a configuração do lembrete.

## Quem acessa

**Configurar atendimento presencial.**

## Estado da tela

**Pronta (backend na issue #64, tela na issue #125, mudanças agendadas na issue #134, envio do lembrete na issue #74, janela de manter ou cancelar os agendamentos afetados na issue #75, bloqueio de parte do dia na issue #77).** O chatbot oferece os horários da configuração salva aqui, seguindo em cada data a versão que vale nela (seção "Mudanças agendadas"). Também estão pendentes, dentro da #75, os itens marcados como pendentes em "Quando a mudança afeta agendamentos existentes".

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

- **Ligado/desligado** e **quantas horas antes** do atendimento: 2, 6, 12, 24 ou 48.
- Enviado para agendamentos **Pendentes e Confirmados**.
- **Um lembrete por data marcada.** Se o cidadão remarcar depois de receber o lembrete, ele recebe um **novo lembrete para a nova data**. Nunca sai lembrete para a data antiga, e voltar para uma data que já recebeu lembrete não gera outro.
- **Agendamento marcado (ou remarcado) já dentro da janela do lembrete não recebe lembrete.** Exemplo: com lembrete de 6 horas, um atendimento marcado para daqui a 3 horas não recebe.
- **Agendamento cancelado antes do envio não recebe lembrete.** Se a mensagem já saiu e o cancelamento veio logo depois, o envio fica registrado no histórico do agendamento do mesmo jeito.
- **Falha passageira** (o sistema de envio fora do ar ou não configurado): não vira falha no histórico. O sistema tenta de novo na varredura seguinte, enquanto o horário do atendimento não passou. **Erro definitivo da Meta** (modelo não aprovado, conta sem forma de pagamento etc.): grava a falha no histórico, com o código da Meta, e **não repete**.
- **Sem documentos na lista**, o lembrete diz "Traga: um documento oficial com foto."
- **Avisos na seção:** todos que abrem a tela veem o custo ("Cada lembrete é uma mensagem de modelo e tem custo por mensagem cobrado pela Meta."), o aviso de que o lembrete só é enviado com o modelo aprovado na Meta ("O lembrete só é enviado com o modelo Lembrete do atendimento aprovado na Meta, na tela WhatsApp. Sem essa aprovação, nenhum lembrete é enviado.") e o aviso de que os lembretes contam no limite diário ("Os lembretes contam no limite diário de envios da Meta."). Quem não é Admin vê também a dica para procurar o Admin ("O estado do modelo e o limite diário ficam na tela WhatsApp, que é só do Admin. Se os lembretes não chegarem, fale com quem administra o WhatsApp."). **Só o Admin** vê o estado real do modelo e o uso do limite diário, com os mesmos dados e textos da tela de [WhatsApp](11-whatsapp.md#modelos-de-mensagem).
- **Ligar ou desligar o lembrete pede confirmação** (como o aviso de cancelamento na tela de WhatsApp). A troca fica no rascunho da tela e **só vale depois de "Salvar alterações"**. Ao ligar, o diálogo diz:
  > **"Ligar o lembrete?"** "O cidadão receberá uma mensagem pelo WhatsApp [N] horas antes do atendimento. Cada lembrete é uma mensagem de modelo e tem custo por mensagem cobrado pela Meta. A mudança só vale depois de Salvar alterações." Botão de confirmar: "Ligar lembrete".

  Ao desligar, o diálogo diz:
  > **"Desligar o lembrete?"** "O cidadão deixará de receber a mensagem de lembrete antes do atendimento. A mudança só vale depois de Salvar alterações." Botão de confirmar: "Desligar lembrete".

  **Cada mudança salva entra no Histórico de alterações** da tela de WhatsApp, com quem e quando: "Lembrete ao cidadão ligado" ou "Lembrete ao cidadão desligado". Mudar só as horas ou o endereço não entra.
- **Prévia do modelo fixo:**
  > "Olá, [primeiro nome]. Lembrete do seu atendimento no PROCON Jacareí: [dia da semana], [dd/mm], às [hh:mm] (protocolo [protocolo]). Endereço: [endereço (complemento)]. Traga: [documentos]. Se não puder comparecer, remarque ou cancele respondendo a esta mensagem."
- **Os documentos do lembrete são os que foram enviados na confirmação**, guardados no agendamento, e não a configuração atual.
- Aviso: "Cada lembrete é uma mensagem de modelo e tem custo por mensagem cobrado pela Meta."

### Datas bloqueadas

- **Dia inteiro** ou **apenas um período** (horário inicial e final), com uma descrição (ex.: "Aniversário de Jacareí"). A tela cria, mostra e remove os dois tipos.
- **Mais de um bloqueio parcial na mesma data**, desde que não se sobreponham (ex.: manhã e tarde). O início de um pode ser igual ao fim do outro. Períodos sobrepostos são recusados.
- **Dia inteiro não convive com outro bloqueio na mesma data:** tanto um dia inteiro numa data que já tem bloqueio quanto um período numa data de dia inteiro são recusados.
- **Validações do formulário** (campos "Início" e "Fim"): o fim deve ser depois do início, e fim igual ao início também é recusado; preencher só um dos horários é recusado; com "Bloquear o dia inteiro" marcado, os horários são ignorados.
- O chatbot e a prévia mensal não oferecem horários nessas datas ou períodos. Um horário já agendado que cai no período é afetado, com o motivo "Período bloqueado (hh:mm–hh:mm)" (seção "Quando a mudança afeta agendamentos existentes").

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
- **Cancelar:** só antes da data de início, depois de confirmar no diálogo "Cancelar a mudança de horários a partir de dd/mm/aaaa?". A mudança some da lista e as datas dela voltam a seguir a configuração anterior. Se o cancelamento deixaria agendamentos fora da configuração anterior, abre a janela de conflitos (seção "Quando a mudança afeta agendamentos existentes"), com as mesmas opções do salvar e textos próprios. Nenhuma lista de afetados aparece abaixo das mudanças agendadas: só a janela mostra os afetados.
- **Trocar de versão com alterações não salvas** (Editar, outra data ou "Voltar à configuração de hoje") pede confirmação: "Descartar as alterações não salvas?". "Voltar" mantém o rascunho.
- **Vigência:** uma mudança vale da data de início até a véspera da próxima mudança. A configuração de hoje vale de hoje até a véspera da primeira mudança futura. Em cada data, a grade, a duração, as vagas, as datas bloqueadas e o endereço são os da versão que vale nela. A janela, a antecedência mínima e o alerta de espera são os da versão que vale hoje; os dias úteis da antecedência contam com a grade de cada dia.
- **Cópia própria:** cada mudança guarda a sua cópia dos horários, das datas bloqueadas e do endereço, e a tela avisa isso quando há mudanças agendadas. Por isso, um bloqueio novo só é aceito numa data da vigência da versão em edição. Fora dela, o servidor recusa com o erro no próprio bloqueio: "Esta data segue a mudança de dd/mm. Bloqueie lá." ou, antes do início da mudança em edição, "Esta data vem antes do início desta mudança (dd/mm). Bloqueie na configuração que vale nessa data.".
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
| Cancelar uma mudança agendada deixaria agendamentos da vigência dela fora da configuração anterior | O mesmo motivo da linha correspondente, conferido contra a configuração anterior. Em vez de recusar, abre a janela de conflitos, como no salvar |

**Antes de salvar**, a tela só informa e não trava nada: desligar um dia, remover uma faixa ou bloquear uma data que tenha agendamento é permitido, e "Salvar alterações" continua habilitado. O que a tela mostra:

- Os dias com agendamento futuro aparecem marcados na prévia, com os horários e a quantidade no detalhe do dia.
- Os afetados pela alteração aparecem no campo ligado à mudança e na lista "Esta alteração afeta N agendamentos" (protocolo, dia, hora, status e motivo). Abaixo da lista há uma dica que depende da permissão. Com **Configurar atendimento presencial** e **Gerenciar agendamentos** (e o Admin): "Ao salvar, você poderá manter estes agendamentos fora da grade atual ou cancelá-los." Só com Configurar atendimento presencial: "Ao salvar, você poderá manter estes agendamentos fora da grade atual. Para cancelá-los, peça a quem gerencia os agendamentos."
- Um bloqueio novo numa data de outra vigência continua recusado no próprio campo (seção "Mudanças agendadas"). Isso não é trava por agendamento.

**A janela de conflitos.** Ao salvar a configuração de hoje, ao salvar uma mudança agendada ou ao cancelar uma mudança agendada, o servidor refaz a lista de afetados. Se houver afetados e a equipe ainda não escolheu nada, **nada é gravado** e abre a janela **"Esta alteração afeta N agendamentos"** (origem "salvar") ou **"Cancelar a mudança de dd/mm afeta N agendamentos"** (origem "cancelar mudança agendada"), com a lista e as opções:

- **Manter os agendamentos:** continuam válidos e ganham o selo "Fora da grade atual" (o histórico registra que foram mantidos, e eles **não são apontados de novo** como afetados em mudanças futuras). Nenhum aviso é enviado.
- **Cancelar:** cancela todos com o motivo "Unidade fechada nesta data" (data ou período bloqueado) ou "Outro motivo" (demais casos). **Um aviso por agendamento** (não existe aviso agrupado: cada cidadão recebe o modelo de cancelamento da [decisão 005](../decisoes/005-mensagens-ao-cidadao.md) com os dados do dele). Quem decide se há aviso é o interruptor **"Avisar o cidadão por WhatsApp quando a equipe cancelar um agendamento"** da tela de WhatsApp (desligado por padrão):
  - **Com o aviso ligado**, o modal mostra o resumo "N cidadãos receberão um aviso por WhatsApp. Cada aviso é uma mensagem de modelo e tem custo por mensagem cobrado pela Meta." Se houver problema conhecido na conta da Meta, aparece antes a faixa "O aviso pode não chegar: [motivo]" ([regra 11](11-whatsapp.md#aviso-de-cancelamento-ao-cidadão)), e o cancelamento continua permitido.
  - **Com o aviso desligado (padrão)**, o modal mostra "N cidadãos não serão avisados pelo sistema. A equipe precisa avisar por outro meio.", nada é enviado à Meta e cada histórico registra "Aviso ao cidadão desativado: cidadão não avisado pelo sistema".
  - Enquanto o estado do aviso é verificado, o modal mostra "Verificando o aviso ao cidadão...". Se não for possível verificá-lo, mostra "Não foi possível verificar o aviso ao cidadão. Tente de novo." com "Tentar de novo". Nos dois casos o botão de cancelar **não aparece**, e Manter e voltar continuam disponíveis.
- **Voltar:** não grava nada. O Esc equivale a voltar, e clicar fora do modal não o fecha. Durante uma ação em andamento, nem o Esc nem os botões fecham o modal.

**Quem pode:** cancelar só aparece para quem tem **Configurar atendimento presencial** e também **Gerenciar agendamentos** (o Admin tem as duas), porque cancela agendamentos ([decisão 004](../decisoes/004-contas-e-permissoes-granulares.md)). O servidor confere isso a cada pedido. Quem só configura horários vê apenas Manter e voltar.

**Textos por origem e por permissão:**

| | Origem "salvar" | Origem "cancelar mudança agendada" |
|---|---|---|
| Título | "Esta alteração afeta N agendamento(s)" | "Cancelar a mudança de dd/mm afeta N agendamento(s)" |
| Abertura, com as duas permissões | "Estes agendamentos Pendentes ou Confirmados deixam de caber na configuração nova. Escolha o que fazer antes de salvar." | "Estes agendamentos Pendentes ou Confirmados deixam de caber na configuração anterior, que voltaria a valer. Escolha o que fazer antes de cancelar a mudança." |
| Abertura, só com Configurar atendimento presencial | "Estes agendamentos Pendentes ou Confirmados deixam de caber na configuração nova. Você não pode cancelar agendamentos. Mantenha-os para salvar a alteração, ou volte sem salvar." | "Estes agendamentos Pendentes ou Confirmados deixam de caber na configuração anterior, que voltaria a valer. Você não pode cancelar agendamentos. Mantenha-os para cancelar a mudança, ou volte sem cancelar." |
| Opção Manter | "Continuam válidos e ganham o selo "Fora da grade atual" na lista e no detalhe. Nenhum aviso é enviado." | "A mudança é cancelada e estes agendamentos continuam válidos, com o selo "Fora da grade atual". Nenhum aviso é enviado." |
| Botão de cancelar, aviso ligado | "Cancelar e avisar os cidadãos" | "Cancelar a mudança, os agendamentos e avisar os cidadãos" |
| Botão de cancelar, aviso desligado | "Cancelar agendamentos" | "Cancelar a mudança e os agendamentos" |
| Voltar | "← Voltar sem salvar" | "← Voltar sem cancelar a mudança" |

**O que o servidor confere ao gravar.** A tela envia quais agendamentos estavam na janela e, ao cancelar, se o aviso estava ligado ou desligado. No momento de gravar, o servidor refaz a lista:

- **Lista igual à vista** (e, no cancelar, aviso igual): aplica a escolha e grava a agenda **juntos**, ou seja, se uma parte falhar, nenhuma vale. Duas gravações da agenda ao mesmo tempo não se misturam: uma espera a outra. Os avisos saem **depois** de tudo gravado.
- **Lista diferente da vista, ou aviso que mudou desde que a janela abriu:** nada é gravado e nenhum aviso é enviado. A janela se atualiza com a lista nova e o estado atual do aviso, e mostra: "A lista de agendamentos afetados ou o aviso ao cidadão mudou desde que você abriu esta janela. Confira antes de escolher." A mensagem fica até a próxima escolha ou até a janela fechar, e não aparece na primeira abertura. Vale para Manter e para Cancelar, nos três caminhos. Uma mudança só no aviso não impede Manter.
- **Lista vazia** (por exemplo, o cidadão cancelou o agendamento nesse meio tempo): grava a agenda, ou cancela a mudança, sem mexer em nenhum agendamento e sem avisar. A tela fecha a janela e mostra a mensagem normal, sem "0 agendamentos".

**Mensagem de resultado.**

- Origem "salvar": cancelou com o aviso ligado, "N agendamentos cancelados e cidadãos avisados por WhatsApp."; com o aviso desligado, "N agendamentos cancelados. Os cidadãos não foram avisados pelo sistema."; manteve, "Alteração salva. N agendamentos mantidos com o selo "Fora da grade atual"."; com falha de aviso, numa frase só, "N agendamentos cancelados. M avisos falharam." (plural certo nas duas partes).
- Origem "cancelar mudança agendada": as mesmas mensagens com "Mudança cancelada. " antes, e a de mantidos sem "Alteração salva.": "Mudança cancelada. N agendamentos mantidos com o selo "Fora da grade atual"."; com falha, "Mudança cancelada. N agendamentos cancelados. M avisos falharam.".
- Uma falha de envio **não desfaz** os cancelamentos e soma na mensagem de resultado. Nos casos de falha do envio (telefone ausente, gateway fora do ar, recusa da Meta), ela fica registrada também no histórico do agendamento, no mesmo formato do cancelamento individual ([Detalhe do agendamento](04-detalhe-do-agendamento.md)). Se o envio quebrar antes de registrar (falha de banco ou envio do mesmo agendamento já em andamento), ela entra só na contagem do resultado.
- Se a ação não puder ser concluída, a janela continua aberta com "Não foi possível concluir a ação. Tente de novo.".
- Ao cancelar uma mudança que estava aberta para edição, a tela volta para a configuração de hoje.

**Pendente (não entregue na #75):**

- O botão **"Tentar novamente"** para a falha de envio do cancelamento em massa.
- A garantia de que os horários cancelados voltam a ficar livres nos dois casos (aviso ligado e desligado).
- O envio dos avisos **em paralelo** (hoje saem um a um).
- Testes de borda extras.

## O que não existe de propósito

| O que não existe | Por quê |
|---|---|
| Agenda por funcionário | A disponibilidade é da unidade; o responsável é definido ao assumir ([decisão 007](../decisoes/007-agenda-configuravel.md)) |
| Editar o texto do lembrete | É um modelo aprovado pela Meta; o texto é fixo ([decisão 005](../decisoes/005-mensagens-ao-cidadao.md)) |
| Configurar o tempo de abandono da conversa | São 30 minutos fixos no sistema |

## Relações

- Usado pelo chatbot para oferecer horários, pelo [calendário de Agendamentos](03-agendamentos.md) e pelo [Dashboard](02-dashboard.md).
- Os documentos da confirmação vêm de [Documentos](09-documentos.md).

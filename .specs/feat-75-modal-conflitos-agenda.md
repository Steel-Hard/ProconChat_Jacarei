# Correções do modal de conflitos ao alterar a agenda (#75, PR #169)

> Status: em-andamento
> Tipo: funcionalidade
> Tamanho: grande
> Branch: feat/75-modal-conflitos-agenda
> Criada em: 2026-11-22
> Aprovada pelo usuário em: 2026-11-22

## Objetivo

O PR #169 trouxe o modal "Esta alteração afeta N agendamentos", que substitui as travas antigas da tela de Horários. Quando uma mudança na agenda deixa agendamentos Pendentes ou Confirmados fora da grade, a equipe escolhe entre manter esses agendamentos, cancelá-los ou voltar sem salvar.

A revisão do PR, a designer e o usuário apontaram correções que precisam entrar antes do merge:

- O servidor pode agir sobre agendamentos que a equipe não viu, ou com um estado do aviso ao cidadão diferente do que estava na tela.
- Faltam testes com banco real e testes do cancelamento de mudança agendada.
- Os textos não mudam conforme a permissão nem conforme a origem do modal (salvar ou cancelar mudança agendada).
- Ao cancelar uma mudança agendada, a lista de afetados aparece duas vezes.
- O modal tem falhas de teclado e de celular, e o visual não segue o protótipo.
- Sobrou código das travas antigas sem uso.

As regras do PR que já estão certas continuam valendo (RN-01 a RN-08) e ganham critérios de regressão.

## Regras

| ID | Regra | Fonte |
|---|---|---|
| RN-01 | Se a alteração afeta agendamentos, abre o modal com a lista e três opções: manter os agendamentos, cancelá-los e voltar sem fazer nada. Nada é gravado antes de a equipe escolher. | usuário; regra 08 |
| RN-02 | O cancelamento (ou a manutenção) dos agendamentos e a gravação da agenda acontecem juntos: se uma parte falhar, nenhuma vale. Duas gravações da agenda ao mesmo tempo não se misturam: uma espera a outra. | usuário; regra 08 |
| RN-03 | Os avisos ao cidadão só são enviados depois que tudo foi gravado. Uma falha de envio não desfaz os cancelamentos e fica registrada no histórico do agendamento. | usuário; regra 08 |
| RN-04 | Com o aviso ao cidadão desligado, nada é enviado à Meta, e o histórico de cada agendamento cancelado registra "Aviso ao cidadão desativado: cidadão não avisado pelo sistema". | usuário; regras 08 e 11 |
| RN-05 | O motivo do cancelamento é "Unidade fechada nesta data" quando o agendamento cai numa data ou num período bloqueado, e "Outro motivo" nos demais casos. | usuário; regra 08 |
| RN-06 | Só quem tem "Configurar atendimento presencial" e também "Gerenciar agendamentos" pode cancelar pelo modal. A conta Admin conta como tendo as duas. O servidor confere isso a cada pedido, e esconder o botão na tela não basta. | usuário; decisão 004 |
| RN-07 | Os agendamentos mantidos ganham o selo "Fora da grade atual", o histórico registra que foram mantidos, e eles não voltam a ser apontados como afetados em mudanças futuras. | usuário; regra 08 |
| RN-08 | As travas antigas do formulário saem, porque o modal as substitui: não há mais bloqueio para desligar um dia, remover uma faixa ou bloquear uma data que tenha agendamento. Continuam os avisos informativos da prévia (os dias com agendamento, a lista de afetados na tela e os afetados apontados no campo ligado à mudança) e o erro de data bloqueada fora da vigência que está sendo editada. | usuário |
| RN-09 | O servidor só age sobre os agendamentos que a equipe viu no modal e, na opção de cancelar, com o estado do aviso (ligado ou desligado) que ela viu. A tela envia quais agendamentos estavam no modal e, ao cancelar, o estado do aviso mostrado. No momento de gravar, o servidor refaz a lista de afetados. Se a lista nova for diferente da vista, ou se o estado do aviso tiver mudado, nada é gravado e a tela recebe a lista nova e o estado atual do aviso, para o modal se atualizar. Vale para Manter e para Cancelar, e nos três caminhos: salvar a configuração de hoje, salvar uma mudança agendada e cancelar uma mudança agendada. | usuário; PO (Manter incluído, D-PO-01) |
| RN-10 | Se, no momento de gravar, a lista refeita estiver vazia, o servidor grava sem mexer em nenhum agendamento, tanto em Manter quanto em Cancelar. A tela mostra a mensagem normal (horários salvos, mudança agendada ou mudança cancelada), sem contagem de agendamentos. | PO (D-PO-02) |
| RN-11 | Quando o modal se atualiza por causa de RN-09, ele mostra, nos dois caminhos (salvar e cancelar mudança agendada): "A lista de agendamentos afetados ou o aviso ao cidadão mudou desde que você abriu esta janela. Confira antes de escolher." | PO (D-PO-03) |
| RN-12 | Ao cancelar uma mudança agendada que deixaria agendamentos fora da configuração anterior, abre o modal, com as mesmas opções e regras, em vez de recusar. A lista de afetados que aparecia abaixo das mudanças agendadas é removida: só o modal mostra os afetados. | usuário (decisão) |
| RN-13 | O modal tem duas origens, salvar e cancelar mudança agendada, cada uma com os próprios textos (RN-15 e RN-16). | usuário |
| RN-14 | A dica abaixo da lista de afetados na tela de Horários depende da permissão. Com as duas permissões: "Ao salvar, você poderá manter estes agendamentos fora da grade atual ou cancelá-los." Só com "Configurar atendimento presencial": "Ao salvar, você poderá manter estes agendamentos fora da grade atual. Para cancelá-los, peça a quem gerencia os agendamentos." | usuário |
| RN-15 | Textos do modal na origem salvar. Título: o atual ("Esta alteração afeta N agendamento(s)"). Abertura com as duas permissões: "Estes agendamentos Pendentes ou Confirmados deixam de caber na configuração nova. Escolha o que fazer antes de salvar." Abertura só com Configurar: "Estes agendamentos Pendentes ou Confirmados deixam de caber na configuração nova. Você não pode cancelar agendamentos. Mantenha-os para salvar a alteração, ou volte sem salvar." Opções e botões: os atuais. Voltar: "← Voltar sem salvar". Resultado com falha de aviso: "N agendamentos cancelados. M avisos falharam.", numa frase só, com plural certo nas duas partes. | usuário |
| RN-16 | Textos do modal na origem cancelar mudança agendada (título e botões confirmados pelo usuário). Título: "Cancelar a mudança de {data} afeta N agendamento(s)", com a data de início da mudança em dd/mm. Abertura com as duas permissões: "Estes agendamentos Pendentes ou Confirmados deixam de caber na configuração anterior, que voltaria a valer. Escolha o que fazer antes de cancelar a mudança." Abertura só com Configurar: "Estes agendamentos Pendentes ou Confirmados deixam de caber na configuração anterior, que voltaria a valer. Você não pode cancelar agendamentos. Mantenha-os para cancelar a mudança, ou volte sem cancelar." Texto da opção Manter: "A mudança é cancelada e estes agendamentos continuam válidos, com o selo "Fora da grade atual". Nenhum aviso é enviado." Botão Manter: "Manter os agendamentos". Botão de cancelar com o aviso ligado: "Cancelar a mudança, os agendamentos e avisar os cidadãos"; com o aviso desligado: "Cancelar a mudança e os agendamentos". Voltar: "← Voltar sem cancelar a mudança". Resultado com falha de aviso: "Mudança cancelada. N agendamentos cancelados. M avisos falharam.", numa frase só, com plural certo. Resultado ao manter (ajuste aprovado pelo usuário, sem "Alteração salva."): singular "Mudança cancelada. 1 agendamento mantido com o selo "Fora da grade atual"."; plural "Mudança cancelada. N agendamentos mantidos com o selo "Fora da grade atual".". Resultados sem falha ao cancelar: as mensagens de hoje da origem salvar, com "Mudança cancelada. " antes, ou seja: "Mudança cancelada. N agendamento(s) cancelado(s) e cidadão(s) avisado(s) por WhatsApp." e "Mudança cancelada. N agendamento(s) cancelado(s). O(s) cidadão(s) não foi(foram) avisado(s) pelo sistema.", com o plural das mensagens de hoje. A origem salvar continua com "Alteração salva." na mensagem de mantidos. | usuário |
| RN-17 | Quando nenhum agendamento foi afetado, não aparece mensagem com "0 agendamentos" (RN-10). | usuário |
| RN-18 | Teclado no modal, igual às outras janelas de confirmação do painel: ao abrir, o foco vai para "Manter os agendamentos"; o Tab circula só dentro do modal; ao fechar, o foco volta para onde estava antes. O Esc equivale a voltar. Um clique fora do modal não fecha. | usuário (revisão de design) |
| RN-19 | Enquanto o estado do aviso está sendo verificado, ou quando não foi possível verificá-lo, o botão de cancelar não aparece. Continuam a mensagem de "verificando" ou o erro, com "Tentar de novo". | usuário (revisão de design) |
| RN-20 | Visual do modal igual ao protótipo do painel, com as decisões do usuário (detalhes no Desenho). Cada agendamento da lista mostra o protocolo, o nome com o selo de status, a data e a hora e o motivo, sem CPF. "Manter os agendamentos" tem contorno roxo. O botão de cancelar é vermelho cheio. Voltar é um link cinza alinhado à esquerda, com a seta. O modal cabe na altura visível da tela e, numa tela de 320 px, não tem rolagem horizontal. Os estados que o protótipo não mostra (carregando, erro de verificação, faixa de problema da Meta, sem permissão e mensagem de resultado) seguem o padrão das janelas de confirmação do painel. | designer (Nobara) e usuário |
| RN-21 | O selo "Fora da grade atual" no detalhe do agendamento segue o protótipo: fundo creme, texto marrom, 12,5 px em negrito e o mesmo tamanho dos outros selos do cabeçalho do detalhe. | designer (Nobara) e usuário |

As decisões RN-09 (Manter incluído), RN-10 e RN-11 vieram da PO por inferência e são confirmadas pelo usuário na aprovação desta spec.

## Contrato da API (B1)

Este contrato existe para back (Todo) e front (Yuji) começarem juntos. Os ids dos agendamentos são sempre texto com só dígitos (o servidor já os envia assim hoje).

### Pedidos

**PUT /api/v1/schedule** e **PUT /api/v1/schedule/versions/:effectiveFrom**: o corpo é o mesmo de hoje (os campos da configuração), mais estes campos opcionais:

| Campo | Tipo | Regra |
|---|---|---|
| `conflictResolution` | `"KEEP"` ou `"CANCEL"` | Igual a hoje. |
| `seenConflictIds` | lista de texto | Obrigatório quando `conflictResolution` vem; proibido sem ele. Ids dos agendamentos que estavam no modal. Cada item com 1 a 19 dígitos, sem zero à esquerda, sem repetição. De 1 a 5.000 itens. |
| `seenNoticeEnabled` | booleano | Obrigatório quando `conflictResolution` é `"CANCEL"`; proibido nos outros casos. É o estado do aviso (ligado ou desligado) que o modal mostrou. |

Estes campos valem só para os dois PUT. Eles não entram em `config` do POST /api/v1/schedule/preview, que hoje reaproveita o esquema da configuração.

**DELETE /api/v1/schedule/versions/:effectiveFrom**: o parâmetro `?conflictResolution=` sai. Os mesmos três campos, com as mesmas regras, vão num corpo JSON opcional. Sem corpo, o comportamento é o de hoje: 204, ou 409 `SCHEDULE_CONFLICTS`.

- Motivo do corpo: a lista de ids pode passar do tamanho seguro de um endereço, e assim a validação é a mesma dos PUT.
- O PR ainda não foi mesclado, então nenhum cliente usa o parâmetro antigo.
- A troca de query para corpo foi confirmada pelo usuário.

### Respostas

Ordem das verificações, da primeira para a última:

| Situação | Status e código | Corpo |
|---|---|---|
| Origem não confiável (`INVALID_ORIGIN`) | 403 | erro |
| Sem sessão | 401 | erro |
| Sem "Configurar atendimento presencial" | 403 | erro |
| Corpo ou parâmetros inválidos, incluindo as regras da tabela acima | 400, no formato de hoje (com `details.issues`) | erro |
| `"CANCEL"` sem "Gerenciar agendamentos" e sem ser Admin | 403 | erro |
| DELETE de mudança que não existe | 404 | erro |
| Bloqueio novo fora da vigência e demais validações de hoje | 400 (como hoje) | erro |
| Há afetados e `conflictResolution` não veio | 409 `SCHEDULE_CONFLICTS` | `{ error: { code, message, details: { conflicts, cancellationNotice } } }` |
| `conflictResolution` veio, a lista refeita não está vazia e é diferente de `seenConflictIds`; ou, só em `"CANCEL"`, o estado atual do aviso é diferente de `seenNoticeEnabled` | 409 `SCHEDULE_CONFLICTS_CHANGED` | `{ error: { code, message, details: { conflicts, cancellationNotice, changes } } }` |
| `conflictResolution` veio e a lista refeita está vazia | grava sem mexer em agendamento (RN-10) | PUT: 200 `{ data, resolution }`; DELETE: 200 `{ resolution }`, com `affectedCount: 0`, `notifiedCount: 0` e `failedCount: 0` |
| Gravou | PUT: 200 `{ data, resolution? }`. DELETE: 200 `{ resolution }` quando `conflictResolution` veio, e 204 quando não veio | `resolution` = `{ action, affectedCount, notifiedCount, failedCount, noticeDisabled }`, como hoje |

- `conflicts`: a lista refeita dentro da gravação. Cada item tem o formato de hoje: `id`, `protocol`, `name`, `cpfMasked`, `appointmentDatetime`, `date`, `time`, `status`, `code`, `reason` e, quando houver, `conflictingAppointmentId` e `conflictingProtocol`.
- `cancellationNotice`: `{ enabled: boolean, problem: { code } | null }`, o mesmo formato de GET /api/v1/schedule/cancellation-notice. O `enabled` é o valor lido dentro da gravação. O `problem` só vem preenchido quando `enabled` é verdadeiro.
- `changes`: lista com `"CONFLICTS"`, `"NOTICE"` ou os dois, dizendo o que mudou.
- Nos dois 409, nada é gravado e nenhum aviso é enviado.
- A comparação de listas ignora a ordem: o que conta é o conjunto de ids.

## Critérios de aceite

Proteção contra agir sobre o que não foi visto (B1)

- CA-01 QUANDO a equipe escolhe cancelar e, entre a abertura do modal e o clique, entra um agendamento novo afetado ENTÃO o sistema não DEVE cancelar nada nem gravar a agenda, e o modal DEVE continuar aberto, mostrando a lista nova com o agendamento novo e a mensagem de RN-11. (RN-09, RN-11)
- CA-02 QUANDO a equipe escolhe cancelar e, nesse meio tempo, um dos agendamentos da lista deixou de ser afetado (por exemplo, foi cancelado pelo cidadão), sem a lista ficar vazia ENTÃO o sistema não DEVE gravar nada, e o modal DEVE mostrar a lista nova sem esse agendamento e a mensagem de RN-11. (RN-09, RN-11)
- CA-03 QUANDO o modal mostrou o aviso desligado e, antes do clique em cancelar, alguém ligou o aviso na tela de WhatsApp ENTÃO o sistema não DEVE cancelar nada nem enviar aviso, e o modal DEVE passar a mostrar a opção e o resumo do aviso ligado, com a mensagem de RN-11. O caso inverso (mostrou ligado e foi desligado) DEVE se comportar do mesmo jeito. (RN-09, RN-11, RN-04)
- CA-04 QUANDO a equipe escolhe Manter e a lista mudou nesse meio tempo, sem ficar vazia ENTÃO o sistema não DEVE gravar nada nem marcar nenhum agendamento, e o modal DEVE se atualizar como em CA-01. Uma mudança no aviso, sozinha, não DEVE impedir Manter. (RN-09, RN-11)
- CA-05 QUANDO a lista e o estado do aviso continuam iguais aos que a equipe viu ENTÃO cancelar ou manter DEVE funcionar como antes, numa só tentativa. (RN-09, RN-01)
- CA-06 QUANDO o caso de CA-01 a CA-04 acontece ao salvar a configuração de hoje, ao salvar uma mudança agendada ou ao cancelar uma mudança agendada ENTÃO o comportamento DEVE ser o mesmo nos três, inclusive a mensagem de RN-11. (RN-09, RN-11, RN-12)
- CA-07 QUANDO a lista refeita no momento de gravar está vazia, com Manter ou com Cancelar ENTÃO o sistema DEVE gravar a agenda (ou cancelar a mudança) sem mexer em nenhum agendamento e sem enviar aviso, e a tela DEVE fechar o modal e mostrar a mensagem normal, sem contagem. (RN-10, RN-17)
- CA-08 QUANDO o modal se atualiza depois de uma recusa ENTÃO os botões DEVEM voltar a funcionar, a equipe DEVE poder escolher de novo ou voltar, e a mensagem de RN-11 DEVE continuar visível até a próxima escolha ou até o modal fechar. QUANDO o modal abre pela primeira vez ENTÃO essa mensagem não DEVE aparecer. (RN-11)
- CA-09 QUANDO alguém sem "Gerenciar agendamentos" tenta cancelar chamando o servidor direto ENTÃO o servidor DEVE recusar e nada DEVE ser gravado. (RN-06)

Regras que já estavam certas (regressão)

- CA-10 QUANDO a agenda é gravada com cancelamento ENTÃO cada agendamento cancelado por cair em data ou período bloqueado DEVE ter o motivo "Unidade fechada nesta data", e os demais DEVEM ter "Outro motivo", conferido com banco real. (RN-05)
- CA-11 QUANDO a equipe cancela com o aviso desligado ENTÃO nenhum envio à Meta DEVE acontecer, e cada agendamento cancelado DEVE ter no histórico o registro de cidadão não avisado, conferido com banco real. (RN-04)
- CA-12 QUANDO a equipe mantém os agendamentos ENTÃO cada um DEVE ficar marcado como fora da grade atual, com o registro no histórico, e uma mudança seguinte que também não o comporte não DEVE apontá-lo de novo, conferido com banco real. (RN-07)
- CA-13 QUANDO a gravação da agenda falha depois de os cancelamentos terem sido feitos ENTÃO nenhum agendamento DEVE ficar cancelado, nenhum registro novo DEVE ficar no histórico, a agenda DEVE continuar como antes e nenhum aviso DEVE ser enviado, conferido com banco real. (RN-02, RN-03)
- CA-14 QUANDO a equipe cancela com o aviso ligado e um envio falha ENTÃO os cancelamentos DEVEM continuar valendo, a falha DEVE aparecer no histórico do agendamento, e a mensagem de resultado DEVE seguir RN-15 ou RN-16, conforme a origem. (RN-03, RN-15, RN-16)
- CA-15 QUANDO a tela de Horários é usada depois das correções ENTÃO desligar um dia, remover uma faixa ou bloquear uma data com agendamento não DEVE ser impedido pelo formulário, os avisos informativos da prévia e a lista de afetados na tela DEVEM continuar, e o erro de bloqueio fora da vigência em edição DEVE continuar. (RN-08)

Cancelar uma mudança agendada (B4 e B5)

- CA-16 QUANDO a equipe confirma "Cancelar mudança" numa mudança cujo cancelamento deixaria agendamentos fora da configuração anterior ENTÃO o modal DEVE abrir com a lista e os textos de RN-16, e nenhuma lista de afetados DEVE aparecer abaixo das mudanças agendadas. (RN-12, RN-13, RN-16)
- CA-17 QUANDO, nesse modal, a equipe escolhe Manter ENTÃO a mudança DEVE ser cancelada e os agendamentos DEVEM ficar com o selo "Fora da grade atual". QUANDO escolhe cancelar com o aviso ligado ENTÃO a mudança e os agendamentos DEVEM ser cancelados e os avisos enviados depois. QUANDO escolhe cancelar com o aviso desligado ENTÃO nada DEVE ser enviado, e cada histórico DEVE registrar o cidadão não avisado. QUANDO um envio falha ENTÃO o cancelamento DEVE continuar valendo e a mensagem DEVE seguir RN-16. QUANDO escolhe "← Voltar sem cancelar a mudança" ou aperta Esc ENTÃO a mudança DEVE continuar agendada e nada DEVE mudar. (RN-12, RN-03 a RN-05, RN-16)
- CA-18 QUANDO a mudança cancelada pelo modal era a que estava aberta para edição ENTÃO a tela DEVE voltar para a configuração de hoje, como já faz no cancelamento sem afetados. (RN-12)

Textos por permissão e por origem (B3 e B6)

- CA-19 QUANDO a lista de afetados aparece na tela de Horários para quem tem as duas permissões, ou para o Admin ENTÃO a dica DEVE ser exatamente a primeira de RN-14. QUANDO aparece para quem só tem "Configurar atendimento presencial" ENTÃO DEVE ser exatamente a segunda. (RN-14)
- CA-20 QUANDO o modal abre na origem salvar ENTÃO o título, a abertura (conforme a permissão), as opções e o voltar DEVEM ser os de RN-15. QUANDO abre na origem cancelar mudança agendada ENTÃO DEVEM ser os de RN-16, com a data da mudança em dd/mm e o plural certo no título. Em cada origem, os dois textos de abertura (as duas permissões e só Configurar) DEVEM estar cobertos por teste. Só com Configurar, o modal DEVE mostrar apenas Manter e voltar. (RN-13, RN-15, RN-16, RN-06)

Mensagens de resultado

- CA-21 QUANDO 1 agendamento é cancelado e 1 aviso falha ENTÃO a mensagem na origem salvar DEVE ser "1 agendamento cancelado. 1 aviso falhou.". Com 2 e 1: "2 agendamentos cancelados. 1 aviso falhou.". Com 3 e 2: "3 agendamentos cancelados. 2 avisos falharam.". Na origem cancelar mudança agendada, as mesmas três combinações DEVEM vir com "Mudança cancelada. " antes. QUANDO, nessa origem, a equipe mantém 1 agendamento ENTÃO a mensagem DEVE ser "Mudança cancelada. 1 agendamento mantido com o selo "Fora da grade atual".", e com 2: "Mudança cancelada. 2 agendamentos mantidos com o selo "Fora da grade atual".", sem "Alteração salva.". QUANDO, nessa origem, a equipe cancela sem falha com o aviso ligado ou desligado ENTÃO a mensagem DEVE ser a de hoje da origem salvar com "Mudança cancelada. " antes, por exemplo "Mudança cancelada. 2 agendamentos cancelados e cidadãos avisados por WhatsApp.". QUANDO a equipe mantém agendamentos na origem salvar ENTÃO a mensagem DEVE continuar com "Alteração salva.". (RN-15, RN-16)
- CA-22 QUANDO o resultado diz que nenhum agendamento foi afetado ENTÃO a tela não DEVE mostrar mensagem com "0 agendamentos", e DEVE mostrar a mensagem normal: horários salvos, mudança agendada ou mudança cancelada. (RN-10, RN-17)

Teclado, carregamento e visual do modal

- CA-23 QUANDO o modal abre ENTÃO o foco DEVE estar em "Manter os agendamentos". QUANDO se aperta Tab no último elemento ENTÃO o foco DEVE ir para o primeiro, e Shift+Tab no primeiro DEVE levar ao último, sem sair do modal. QUANDO o modal fecha, por qualquer opção ou pelo Esc ENTÃO o foco DEVE voltar para onde estava antes de ele abrir. (RN-18)
- CA-24 QUANDO há um clique fora do modal ENTÃO ele não DEVE fechar. QUANDO se aperta Esc sem ação em andamento ENTÃO ele DEVE fechar como o voltar, sem gravar nada. Durante uma ação em andamento, nem Esc nem os botões DEVEM fechar o modal. (RN-18)
- CA-25 QUANDO o estado do aviso está sendo verificado ENTÃO o botão de cancelar não DEVE aparecer, e a mensagem "Verificando o aviso ao cidadão..." DEVE aparecer. QUANDO não foi possível verificar ENTÃO o botão de cancelar não DEVE aparecer, e o erro com "Tentar de novo" DEVE aparecer. Nos dois casos, Manter e voltar DEVEM continuar disponíveis. (RN-19)
- CA-26 QUANDO o modal aparece em tamanho de computador ENTÃO, ao comparar lado a lado com o protótipo:
  - cada agendamento da lista DEVE mostrar à esquerda o protocolo sem a palavra "Protocolo", em fonte monoespaçada roxa;
  - à direita DEVE mostrar o nome com o selo de status ao lado, depois a data e a hora e depois o motivo em vermelho escuro, sem CPF, sem moldura vermelha e sem fundo rosado, com um filete claro entre os agendamentos;
  - "Manter os agendamentos" DEVE ter contorno roxo, o botão de cancelar DEVE ser vermelho cheio com texto branco, e o voltar DEVE ser um link cinza com a seta, alinhado à esquerda;
  - o quadro da opção de cancelar DEVE usar a cor de borda de erro do painel, e o texto das opções DEVE ter 13,5 px;
  - o fundo escurecido, a caixa de 640 px, o cabeçalho, o título, a lista, o rodapé e as opções lado a lado DEVEM continuar como hoje.

  (RN-20)
- CA-27 QUANDO o modal abre num celular com 320 px de largura ENTÃO não DEVE haver rolagem horizontal, os textos dos botões DEVEM quebrar linha em telas abaixo de 480 px, os botões DEVEM ocupar a largura da opção, as opções DEVEM ficar uma embaixo da outra, e o modal DEVE caber na altura visível da tela (inclusive com a barra do navegador do celular), com a lista rolando por dentro. (RN-20)
- CA-28 QUANDO o modal está carregando o aviso, com erro de verificação, com a faixa de problema da Meta, aberto por quem não pode cancelar, ou quando a mensagem de resultado aparece ENTÃO esses estados DEVEM seguir o visual das janelas de confirmação do painel. (RN-20)
- CA-29 QUANDO a tela de Horários é aberta em tamanho de computador ENTÃO tudo fora do modal DEVE continuar como antes. (RN-20)
- CA-30 QUANDO um agendamento fora da grade é aberto no detalhe ENTÃO o selo "Fora da grade atual" DEVE ter fundo creme, texto marrom, 12,5 px em negrito e o mesmo tamanho dos outros selos do cabeçalho, como no protótipo. (RN-21)

Limpeza

- CA-31 QUANDO o código da tela de Horários é conferido ENTÃO não DEVEM existir mais as funções, os tipos, os textos e os testes que só serviam às travas antigas ou à lista removida abaixo das mudanças agendadas, e os testes do que continua (RN-08) DEVEM passar. (RN-08, RN-12)

Documentação

- CA-32 QUANDO a regra 08, o índice das regras e os READMEs do painel e do servidor são lidos ENTÃO eles DEVEM descrever:
  - o modal como está depois das correções, nas duas origens e com os textos por permissão e por origem;
  - RN-09 a RN-11, o fim da lista abaixo das mudanças agendadas e o contrato novo da API.

  Eles também DEVEM listar como pendentes: "Tentar novamente" por falha de envio, a garantia de os horários cancelados voltarem livres, o envio dos avisos em paralelo e os testes de borda extras. (RN-09 a RN-16)

## Critérios de sucesso

- Nenhum agendamento é cancelado ou mantido sem ter aparecido no modal, e nenhum cancelamento usa um estado do aviso diferente do mostrado, nos três caminhos.
- As regras de motivo, histórico, manutenção e gravação conjunta estão provadas por testes com banco real. O cancelamento de mudança agendada tem testes de comportamento no servidor e na tela.
- O CI passa inteiro: frontend, backend e backend-integration. Isso inclui o teste da lista de afetados, que hoje falha, segundo a mensagem do usuário.
- O modal funciona só pelo teclado, cabe numa tela de 320 px e fica igual ao protótipo nas regiões comparadas.
- A documentação descreve o comportamento entregue e o que ficou pendente.

## Fora do escopo

- Botão "Tentar novamente" para aviso que falhou: fica como pendente na documentação.
- Garantir que os horários cancelados voltem a ficar livres na oferta do chatbot: fica como pendente na documentação.
- Enviar os avisos em paralelo: continua um por vez, depois da gravação.
- Testes de borda além dos pedidos aqui.
- Mudar a tela de WhatsApp, o interruptor do aviso ou o cancelamento individual de agendamento. A única mudança fora de Horários é o selo do detalhe (RN-21).
- Mudar a lista de afetados que aparece na tela de Horários fora do modal, além da dica por permissão. Ela continua com nome e CPF mascarado quando vem do salvar.
- Atualizar a memória do time (quem grava é outro agente, a pedido da orchestrator).

## Desenho

### Peças e responsabilidades (servidor)

- **Controller** (`schedule.controller.ts`): lê `conflictResolution`, `seenConflictIds` e `seenNoticeEnabled` do corpo dos dois PUT e do DELETE. Confere a permissão de cancelar antes de tudo e repassa os três campos ao serviço.
- **Esquemas** (`schedule.schema.ts`):
  - um esquema só dos PUT, que estende o da configuração com os três campos e as regras entre eles (`superRefine`), para não vazar para o `config` da prévia;
  - um esquema de corpo do DELETE, no lugar do esquema de query.
- **Serviço** (`schedule.service.ts`):
  - deixa de ler `isEnabled()` antes da gravação;
  - recebe do repositório, depois do COMMIT, os ids resolvidos e o estado do aviso lido na transação, e esse valor decide o envio. Não existe segunda leitura;
  - com a lista vazia (RN-10), devolve `resolution` com contagens zeradas;
  - nos dois 409, preenche `cancellationNotice.problem` com a regra que já existe (`decideCancellationNoticeProblem`), só quando `enabled` é verdadeiro. Se essa leitura falhar, sai `problem: null`.
- **Repositório** (`schedule.repository.ts`): nos três caminhos, depois do lock de agenda, lê o interruptor do aviso na linha de configuração do WhatsApp, com trava compartilhada (`FOR SHARE`), para que uma troca do interruptor ao mesmo tempo espere.
  - Linha ausente vale como desligado, que é o padrão da regra 11.
  - Erro de leitura derruba a transação, como hoje.
  - Depois de refazer a lista, segue esta ordem:
    1. Lista vazia: grava sem mexer em agendamento.
    2. Com afetados e sem resolução: 409 `SCHEDULE_CONFLICTS`.
    3. Com resolução e divergência (lista nos dois tipos; aviso só em `"CANCEL"`): 409 `SCHEDULE_CONFLICTS_CHANGED`.
    4. Sem divergência: aplica a resolução com `noticeDisabled` vindo do valor lido.
- **Interface do repositório**:
  - os parâmetros ganham `seenConflictIds?: string[]` e `seenNoticeEnabled?: boolean`;
  - `onResolved` passa a receber `{ affectedIds: string[]; noticeEnabled: boolean }`;
  - `noticeDisabled` sai no fim (T4).
- **Stub** (`repositories/mock/scheduleStub.repository.ts`):
  - `saveScheduledConfig` e `deleteScheduledConfig` passam a calcular os afetados e a aplicar a resolução, como o `saveConfig` do stub já faz. Hoje os dois sempre chamam `onResolved([])`;
  - os três aplicam a conferência de RN-09 e a regra de lista vazia;
  - o estado do aviso pode ser configurado no teste.

### Peças e responsabilidades (painel)

- **Dados** (`schedule.api.ts`, `scheduleSaveErrorOf.ts`, tipos):
  - `ScheduleConflict` ganha `id: string`, e o leitor do erro deixa de descartá-lo;
  - o erro do tipo `conflicts` ganha `changed`, `notice` e `changes`;
  - `saveSchedule` envia os três campos no corpo, e `deleteScheduleVersion` envia os três num corpo JSON.
- **Página** (`useSchedule.ts`):
  - envia os ids do modal e, ao cancelar, o `enabled` mostrado;
  - num `SCHEDULE_CONFLICTS_CHANGED`, troca a lista do modal, grava o `cancellationNotice` novo no cache de GET /cancellation-notice (`upsertQueryEntries`) e liga a mensagem de RN-11;
  - informa ao modal a origem (`"save"` ou `"cancelScheduledChange"`) e a data da mudança;
  - deixa de guardar `cancelConflicts`.
- **Modal** (`ScheduleConflictModal.tsx`):
  - recebe a origem;
  - escolhe os textos por um mapa de chaves por origem e por permissão, sem condicionais espalhadas no JSX;
  - o foco e o Tab seguem o padrão de `ConfirmDialog.tsx`, sem fechar por clique fora;
  - mostra a mensagem de RN-11 quando a página indica atualização.
- **Linha do modal**: um componente próprio (`ScheduleConflictModalRow.tsx`) com estilo próprio (`scheduleConflictModalRow.module.css`), sem CPF e sem a palavra "Protocolo". Não reaproveita `scheduleConflictList.module.css`. `ScheduleConflictRow` continua servindo a lista da tela.
- **Lista da tela** (`ScheduleConflictList.tsx`): continua com um chamador depois da remoção de `cancelConflicts`. A página de Horários a mostra com os afetados da prévia ou do salvar (`conflictRows`), por isso a dica por permissão (RN-14) continua tendo onde aparecer. Só o uso em `ScheduleVersions.tsx` sai.

### Visual do modal (referência e tokens)

- **Referência:** `.docs/prototipo/ProconChat Painel.dc.html`, bloco `conflOpen` (linhas 1415 a 1449), e o selo da linha 461.
- **Lista:**
  - linha em grade `96px minmax(0, 1fr)`, `gap: 4px 14px`, padding vertical de 11 px, `border-bottom: 1px solid var(--divider)`;
  - protocolo em `var(--font-mono)`, 600, 13 px, `var(--color-primary)`;
  - nome em 14 px e 600, com o selo de status ao lado (pílula de 11,5 px, 600, padding 2/8, com quebra de linha);
  - data e hora em 13 px, `var(--text-secondary)`;
  - motivo em 12,5 px, 600, `var(--error-text)` (`#9A2E24`), sem token novo. A designer decidiu usar o token no lugar do `#8E2C22` do protótipo.
- **Texto corrido** (descrição e opções): `var(--text-secondary)`, que vale `#4A4660`.
- **Botões:**
  - Manter: `border: 1px solid var(--color-primary)`, fundo branco, texto `var(--color-primary)`.
  - Cancelar: `background: var(--danger)` (`#A3261B`), texto branco.
  - Voltar: link `var(--text-muted)` (`#6B6780`), 13 px, 600, alinhado à esquerda.
  - Todos em 13,5 px e 600, padding 9/12.
- **Quadro da opção de cancelar:** `var(--error-border)` no lugar de `--danger-border`.
- **Opções:** `repeat(auto-fit, minmax(min(240px, 100%), 1fr))`. Os botões ficam com `width: 100%`. O `white-space: nowrap` dos botões fica só acima de 480 px e sai abaixo disso.
- **Caixa:** `max-height: calc(100dvh - 40px)`. O fundo escurecido, a caixa de 640 px, o cabeçalho, a lista e o rodapé já batem com o protótipo e ficam.
- **Selo "Fora da grade atual" no detalhe:** `var(--seal-warning-bg)` e `var(--seal-warning-text)` (`#FCEFD6` e `#7A4F00`), 12,5 px, 600, padding 4/11, como os outros selos do cabeçalho do detalhe no protótipo. Hoje o `Seal` usa 11,5 px e padding 2/8; o ajuste vale só para o cabeçalho do detalhe.
- **Estados sem protótipo** (carregando, erro, faixa da Meta, sem permissão, resultado): seguem `ConfirmDialog` e as faixas de aviso já usadas no painel.

### Por que o visual fica em tarefa separada (T13) e não dentro de T9

T9 entrega o comportamento (foco, teclado, carregamento, origem, textos e mensagem de atualização), que é verificável por teste e feito em TDD. T13 entrega o visual, verificado lado a lado com o protótipo pela designer. Separar deixa cada commit com um propósito e permite que T13 rode em paralelo com a ligação da página (T10).

T13 depende de T9 porque troca a linha usada pelo modal. O visual deixa de ser uma tarefa reservada e passa a ter itens concretos. A designer não tem mais detalhes a mandar.

### Sequência de uma resolução

1. A tela tenta salvar (ou cancelar a mudança) sem resolução e recebe 409 `SCHEDULE_CONFLICTS`.
2. O modal abre na origem certa e busca o estado do aviso.
3. A equipe escolhe uma opção, e a tela envia a resolução, os ids vistos e, ao cancelar, o estado do aviso visto.
4. O servidor trava a agenda, lê o aviso, refaz a lista e compara.
   - Lista vazia: grava sem mexer em agendamento.
   - Igual: aplica, grava e faz o COMMIT; depois envia os avisos, se o aviso estiver ligado e a opção for cancelar.
   - Diferente: faz o ROLLBACK e responde 409 `SCHEDULE_CONFLICTS_CHANGED`. A tela volta ao passo 3 com os dados novos e a mensagem de RN-11.

### Textos (todos em `schedule.json`)

Chaves por origem, para o modal escolher por mapa:

- `conflicts.hintWithCancel` e `conflicts.hintKeepOnly` (RN-14), no lugar de `conflicts.hint`.
- `conflictModal.changedNotice` (RN-11).
- `conflictModal.save.*`: `descriptionWithCancel`, `descriptionKeepOnly`, `keepDescription`, `keepAction`, `cancelActionOn`, `cancelActionOff`, `back` ("← Voltar sem salvar") e `canceledWithFailures_one/_other`.
  - O título continua `conflicts.title`.
  - A frase com falhas é pluralizada pelos cancelados e tem a parte dos avisos que falharam aninhada com o próprio plural (`$t(conflictModal.failedCount, ...)`).
- `conflictModal.cancelScheduledChange.*`: `title_one/_other` (com `{{date}}`), `descriptionWithCancel`, `descriptionKeepOnly`, `keepDescription`, `keepAction`, `cancelActionOn`, `cancelActionOff`, `back` ("← Voltar sem cancelar a mudança"), `canceledWithFailures_one/_other`, `keptToast_one/_other`, `canceledOnToast_one/_other` e `canceledOffToast_one/_other`.
  - `keptToast_one`: "Mudança cancelada. 1 agendamento mantido com o selo \"Fora da grade atual\"."; `keptToast_other`: "Mudança cancelada. {{count}} agendamentos mantidos com o selo \"Fora da grade atual\".". Sem "Alteração salva." (RN-16).
  - `canceledOnToast_*` e `canceledOffToast_*` são as mensagens de hoje da origem salvar com "Mudança cancelada. " antes (RN-16).
  - A mensagem de mantidos da origem salvar não muda e continua com "Alteração salva.".
- Continuam comuns às duas origens: `cancelSummaryOn_*`, `cancelSummaryOff_*`, `noticeLoading`, `noticeFailed`, `retryNotice` e `resolveFailed`.

## Plano de execução

Gates do projeto (rodar a partir da raiz da worktree):

- Gate rápido front: `cd src/frontend && npx vitest run <testes da tarefa> && npm run typecheck && npx oxlint <arquivos alterados> && npx prettier --check <arquivos alterados>`
- Gate rápido back: `cd src/backend && npx vitest run <testes da tarefa> && npm run typecheck:test && npx oxlint <arquivos alterados>`
- Gate integração: CI. Os testes de integração são escritos localmente, mas não rodam local (não há `.env` nem Postgres local). Localmente, o dev confere `cd src/backend && npm run typecheck:test && npx oxlint <arquivos alterados>`. Os testes rodam no job backend-integration do CI, depois do push, que não é feito pelos devs. O resultado do CI é registrado no Status da tarefa.
- Gate doc: links relativos abrem; texto bate com esta spec e com o código; `cd src/frontend && npx prettier --check README.md` para o README do painel.
- Typecheck lento: não medido. Se passar de alguns minutos, ele vai para o gate de fase e os commits intermediários podem não compilar.

Gate de fase (rodado uma vez ao fim de cada fase, antes do reviewer, igual ao CI):

- frontend: `cd src/frontend && npm run format:check && npm run lint && npm run build && npm run test:run`
- backend: `cd src/backend && npm run lint && npm run build && npm run typecheck:test && npm test`
- backend-integration: CI (job backend-integration: `db:migrate`, `test:integration`, `test:db`), sem rodar local. Nas fases abaixo, "backend-integration" quer dizer conferir esse job no CI depois do push.

Fases:

- Fase 1 (paralelo): T1 [P] (Todo) · T2 [P] (Yuji) · T7 [P] (Yuji)
  - Gate de fase: frontend e backend.
- Fase 2 (paralelo): T3 [P] (Todo, depois de T1) · T5 [P] (Todo, depois de T1) · T15 [P] (Yuji, depois de T7)
  - Gate de fase: frontend, backend e backend-integration.
- Fase 3 (paralelo): T4 [P] (Todo, depois de T3 e T5) · T6 [P] (Todo, depois de T5) · T9 [P] (Yuji, depois de T7 e T15)
  - Gate de fase: frontend, backend e backend-integration.
- Fase 4 (paralelo): T10 [P] (Yuji, depois de T2, T7 e T9) · T13 [P] (Yuji, depois de T9)
  - Gate de fase: frontend.
- Fase 5 (paralelo): T8 [P] (Yuji, depois de T7 e T10) · T11 [P] (Yuji, depois de T10 e T15)
  - Gate de fase: frontend.
- Fase 6: T12 (Yuji, depois de T8, T9, T10, T11 e T13) · T14 [P] (Miwa, depois de T4, T5, T10 e T15)
  - Gate de fase: frontend, backend, backend-integration e gate doc.

Quem edita o quê, para as tarefas [P] não se cruzarem:

- `schedule.json`: T7, depois T15, depois T12, em sequência.
- `useSchedule.ts`: T10, depois T11, depois T12, em sequência.
- `ScheduleConflictModal.tsx`: T9, depois T13 (só a troca da linha), depois T12 (só chaves antigas, se sobrar alguma).
- `scheduleConflictModal.module.css`, `ScheduleConflictModalRow.tsx` e `scheduleConflictModalRow.module.css`: só T13.
- O CSS do cabeçalho do detalhe do agendamento (selo, RN-21): só T13.
- `ScheduleConflictList.tsx`: só T8, depois de T10 tirar o uso dele em `ScheduleVersions.tsx`.
- `ScheduleVersions.tsx` e `ScheduleVersionsView.types.ts`: só T10.
- Interface do repositório, controller, esquemas e rotas: T1, com o formato final. O serviço, o stub e o repositório real recebem em T1 só a adaptação mínima para compilar.
- O stub: T1 (adaptação mínima), depois T3, depois T4 (só a remoção de `noticeDisabled`).
- `schedule.repository.ts`: T1 (adaptação mínima), depois T5, depois T4 (só a remoção de `noticeDisabled`).
- Serviço: T1 (repasse dos campos), depois T4 (lógica).
- Assim, cada tarefa termina com o projeto compilando e com a suíte passando.

Regras para todas as tarefas de código:

- nunca escrever comentários;
- TDD: o teste citado em "Teste" é escrito e falha antes do código. Nas tarefas só de teste de regra que já existe, o teste passa de primeira, e isso é esperado e fica registrado;
- nunca alterar teste para fazê-lo passar, salvo as alterações autorizadas e explicadas em T1, T8, T10 e T12;
- um commit atômico por tarefa, só com os caminhos exatos (`git commit -m "..." -- caminhos`), sem linha Co-Authored-By e sem push;
- padrão de commit: `Fix :bug: [#75] ...`, `Feat :sparkles: [#75] ...`, `Test :test_tube: [#75] ...`, `Refactor :recycle: [#75] ...`, `Style :art: [#75] ...` ou `Docs :bulb: [#75] ...`, conforme a tarefa.

## Tarefas

### T1 [P] Contrato HTTP e interface do B1 no servidor
- O quê:
  - aceitar e validar os campos do contrato nos dois PUT e no corpo do DELETE (esquema e controller), e repassá-los ao serviço e ao repositório;
  - fixar a interface do repositório no formato final, com `noticeDisabled` ainda presente;
  - adaptar o mínimo do serviço, do stub e do repositório real ao novo `onResolved`: o repositório devolve `noticeEnabled: !noticeDisabled` até T3 e T5, e nenhuma regra muda;
  - atualizar os testes de rota que já existem para o contrato novo.
- Onde:
  - `src/backend/schemas/schedule.schema.ts`; `src/backend/types/schedule.types.ts`; `src/backend/repositories/schedule.repository.interface.ts`; `src/backend/routes/schedule.routes.ts`; `src/backend/controllers/schedule.controller.ts`;
  - a adaptação mínima em `src/backend/services/schedule.service.ts`, `src/backend/repositories/schedule.repository.ts` e `src/backend/repositories/mock/scheduleStub.repository.ts`;
  - testes em `src/backend/routes/schedule.conflictResolution.routes.test.ts` e num novo `src/backend/routes/schedule.conflictContract.routes.test.ts`.
- Dev: Todo (Dev Back)
- Depende de: nada
- Reaproveita: `scheduleConfigBodySchema` (estendido num esquema só dos PUT); `deleteScheduledConfigQuerySchema` (vira esquema de corpo); `validateRequest` com `withIssues`.
- Atende: RN-09, contrato (400, campos e corpo do DELETE)
- Observação: os casos de `schedule.conflictResolution.routes.test.ts` com `?conflictResolution=` passam a usar o corpo, e os casos com resolução passam a enviar os campos vistos. Isso acompanha a mudança de contrato decidida pelo usuário (B1) e não conta como "alterar teste para passar". As expectativas de resultado não mudam.
- Pronto quando:
  - os 400 do contrato saem com `details.issues`: ids sem resolução, resolução sem ids, `seenNoticeEnabled` ausente em `"CANCEL"` ou presente em `"KEEP"`, id inválido ou repetido, lista vazia ou com mais de 5.000;
  - o POST /preview não aceita esses campos dentro de `config`;
  - o DELETE com corpo JSON passa pela validação e pelo controle de origem, e o controller lê o corpo;
  - o projeto compila;
  - o gate rápido back e a suíte do backend passam.
- Teste: unitário de rota com o stub. Falha primeiro o teste que espera 400 quando `conflictResolution: "CANCEL"` vem sem `seenConflictIds`.
- Gate: rápido back
- Modelo: padrao
- Status: feita (71081f5). Teste escrito primeiro: 19 dos 22 testes novos falharam pelo motivo certo (sem validação) antes do código. Gate: typecheck:test ok, oxlint ok, suíte do backend 143 arquivos e 2032 testes ok.

### T2 [P] Contrato do B1 no painel: tipos, leitura do erro e chamadas
- O quê: manter o `id` dos afetados, ler os dois 409 com `cancellationNotice` e `changes`, e enviar os campos do contrato nos dois PUT e no corpo do DELETE.
- Onde: `src/frontend/src/types/schedule/ScheduleConflict.types.ts`; `src/frontend/src/types/schedule/ScheduleSaveError.types.ts`; novo `src/frontend/src/types/schedule/ScheduleConflictResolutionRequest.types.ts`; `src/frontend/src/utils/schedule/scheduleSaveErrorOf.ts` e o teste dele; `src/frontend/src/store/api/schedule.api.ts` e `src/frontend/src/store/api/test/schedule.api.test.tsx`.
- Dev: Yuji (Dev Front)
- Depende de: nada (contrato nesta spec)
- Reaproveita: `ScheduleCancellationNoticeState.types.ts`; o leitor atual de `SCHEDULE_CONFLICTS`.
- Atende: RN-09, contrato
- Observação: os campos novos dos argumentos são opcionais, para que `useSchedule.ts` continue compilando até T10. Nenhum teste do painel confere hoje o endereço do DELETE com `?conflictResolution=`.
- Pronto quando:
  - o `id` vem em cada afetado;
  - `changed: true`, com `notice` e `changes`, vem em `SCHEDULE_CONFLICTS_CHANGED`, e `changed: false` em `SCHEDULE_CONFLICTS`;
  - os dois PUT enviam os campos no corpo, e o DELETE envia um corpo JSON, sem query;
  - o gate rápido front passa.
- Teste: unitário. Falha primeiro o teste de `scheduleSaveErrorOf` que espera o `id` no afetado lido de um 409.
- Gate: rápido front
- Modelo: padrao
- Status: feita (aa4d2a7). Teste primeiro: 6 falharam pelo motivo certo (id ausente, corpo sem campos, query no DELETE). Gate: vitest 28 passaram, typecheck, oxlint e prettier ok.

### T3 [P] Stub do repositório resolvendo conflitos nos três caminhos
- O quê: o stub passa a calcular os afetados e a aplicar Manter ou Cancelar em `saveScheduledConfig` e `deleteScheduledConfig`, e aplica RN-09 e RN-10 nos três caminhos, com o estado do aviso configurável no teste.
- Onde: `src/backend/repositories/mock/scheduleStub.repository.ts`; `src/backend/repositories/mock/scheduleStub.repository.test.ts`.
- Dev: Todo (Dev Back)
- Depende de: T1
- Reaproveita: `detectScheduleConflicts`, `appointmentsInScheduleInterval` e o trecho de resolução do `saveConfig` do stub. `noticeDisabled` continua aceito até T4.
- Atende: RN-09, RN-10, RN-12; prepara B2 e B5
- Pronto quando:
  - os três caminhos devolvem pelo `onResolved` os ids resolvidos e o estado do aviso;
  - os três caminhos lançam os dois 409 com os detalhes do contrato;
  - a lista vazia grava sem mexer em agendamento;
  - um setter muda o estado do aviso do stub;
  - o gate rápido back passa.
- Teste: unitário. Falha primeiro o teste que espera que `deleteScheduledConfig` com `"KEEP"` devolva os ids afetados, e não uma lista vazia.
- Gate: rápido back
- Modelo: padrao
- Status: feita. Teste escrito primeiro: 9 dos 18 testes do bloco novo falharam pelo motivo certo antes do código. Alteração de teste autorizada pelo usuário: o teste antigo "salva a mudança sem conferir conflitos e guarda os argumentos" virou "salva a mudança resolvendo os conflitos e guarda os argumentos", com conflictResolution KEEP e seenConflictIds ["11"] no toEqual de scheduledSaveCalls, porque o stub passou a conferir conflitos. Gate: typecheck:test ok, oxlint ok, suíte do backend 143 arquivos e 2042 testes ok. Sugestão S-T3-1 da revisão: o stub passou a copiar a regra do repositório real (lista vista ausente dá CONFLICTS; aviso visto ausente ao cancelar dá NOTICE; resolução no DELETE sem usuário dá SCHEDULE_CONFLICTS), com 3 testes novos. Ajuste só de montagem em 3 testes antigos de schedule.conflictResolution.test.ts (mantém afetados, cancela com aviso ligado, cancela com aviso desligado): passaram a informar seenConflictIds (e seenNoticeEnabled ao cancelar), porque o stub agora confere o que foi visto; nenhuma expectativa mudou. Gate: typecheck:test ok, oxlint ok, suíte 2056 testes ok. Vermelho da S-T3-1 comprovado depois: rodando os 3 testes novos contra o scheduleStub.repository.ts do commit anterior (40d9b0a~1), os 3 falharam; com o stub atual passam.

### T4 [P] Serviço do B1 e testes do cancelamento de mudança agendada (B5)
- O quê:
  - o serviço deixa de ler o aviso antes da gravação e usa o estado lido na transação para enviar os avisos depois do COMMIT;
  - devolve as contagens zeradas na lista vazia e completa o `problem` nos dois 409;
  - os testes do serviço cobrem o cancelamento de mudança agendada;
  - no fim, `noticeDisabled` sai da interface, do stub e do repositório real.
- Onde: `src/backend/services/schedule.service.ts`; `src/backend/repositories/schedule.repository.interface.ts`, `src/backend/repositories/schedule.repository.ts` e `src/backend/repositories/mock/scheduleStub.repository.ts` (só a remoção de `noticeDisabled`); testes em `src/backend/services/schedule.conflictResolution.test.ts` e `src/backend/routes/schedule.conflictResolution.routes.test.ts`.
- Dev: Todo (Dev Back)
- Depende de: T1, T3, T5
- Reaproveita: `sendMassCancellationNotices`; `ensureCanCancelAppointments`; `decideCancellationNoticeProblem` (via o leitor do estado do aviso já injetado no serviço).
- Atende: RN-03, RN-04, RN-06, RN-09, RN-10, RN-12, CA-01 a CA-07, CA-09, CA-17 (servidor)
- Pronto quando:
  - nos três caminhos, a divergência dá 409 `SCHEDULE_CONFLICTS_CHANGED` com `conflicts`, `cancellationNotice` e `changes`, em Manter e em Cancelar;
  - a lista vazia dá 200 com contagens zeradas;
  - o aviso só é enviado quando o estado lido na transação é ligado;
  - os testes do serviço do DELETE cobrem: Manter; Cancelar com aviso ligado; Cancelar com aviso desligado (nenhum envio e `noticeDisabled: true`); e falha de envio (cancelamento mantido e `failedCount` contado);
  - `"CANCEL"` sem permissão dá 403 antes de qualquer gravação;
  - `noticeDisabled` não existe mais;
  - o gate rápido back passa, e os testes de integração de T5 passam no CI.
- Teste: unitário de serviço e de rota com o stub. Falha primeiro o teste do serviço que espera, no DELETE com `"CANCEL"` e aviso ligado, um envio por agendamento afetado.
- Gate: rápido back
- Modelo: padrao
- Status: feita. Código escrito antes dos testes novos (fora da ordem do TDD); os testes novos passaram de primeira. Gate: typecheck:test ok, oxlint ok, suíte do backend 143 arquivos e 2053 testes ok; os testes de integração de T5 e T6 ficam para o CI. Ajustes de montagem em testes antigos de schedule.conflictResolution.test.ts, autorizados pelo usuário, sem mudar expectativa: (1) "cancela agendamentos sem enviar avisos quando o interruptor está desligado" passou a desligar o aviso por repo.setCancellationNoticeEnabled(false), porque o serviço não lê mais o aviso antes de gravar (spec, Desenho do serviço); (2) "não salva a agenda quando a configuração do aviso não pode ser lida" passou a provocar a falha por repo.setCancellationNoticeReadError, porque a leitura agora é feita dentro da transação do repositório. Vermelho comprovado depois: rodando os testes novos contra o schedule.service.ts do commit anterior, 6 falharam (envio por agendamento com aviso ligado, aviso desligado pelo estado do repositório, falha de envio, lista vazia, 409 por mudança só do aviso, problema do aviso completado no 409); com o serviço atual todos passam. Correções da revisão: S-T4-1 (isEnabled saiu das dependências do serviço e do padrão; os mocks dos testes de agenda perderam só a chave isEnabled, que não é mais usada); S-T4-2 (3 testes novos de 403 em CANCEL sem appointments.manage conferindo que nada foi gravado: agendamentos intactos, agenda igual, sem chamada de gravação ou cancelamento no repositório); S-T4-3 (montagem dos testes antigos do serviço já ajustada com a S-T3-1). Suíte 2059 testes ok.

### T5 [P] Repositório real: aviso lido na transação, conferência do B1 e lista vazia
- O quê: nos três caminhos do repositório real, ler o interruptor do aviso dentro da transação com trava compartilhada, comparar com o que foi visto, gravar sem mexer em ninguém quando a lista refeita estiver vazia e responder conforme o contrato, provado com banco real.
- Onde: `src/backend/repositories/schedule.repository.ts`; novo `src/backend/tests/integration/scheduleConflictDivergence.integration.test.ts`.
- Dev: Todo (Dev Back)
- Depende de: T1
- Reaproveita: `applyConflictResolution`; o lock `schedule_config`; `loadFutureActiveAppointments`; o preparo de dados de `scheduleChanges.integration.test.ts`.
- Atende: RN-02, RN-09, RN-10, CA-01 a CA-07 (banco real), parte de B2
- Pronto quando, com banco real e nos três caminhos:
  - um afetado a mais ou a menos que os vistos dá 409 `SCHEDULE_CONFLICTS_CHANGED` sem nenhuma linha alterada, em Manter e em Cancelar;
  - o aviso diferente do visto em `"CANCEL"` dá o mesmo 409;
  - a lista vazia grava sem alterar agendamentos;
  - lista e aviso iguais aplicam a resolução;
  - localmente, `typecheck:test` e lint passam, e os testes de integração passam no CI.
- Teste: integração, rodado no CI. Primeiro é escrito o teste que salva a configuração de hoje com `"CANCEL"` e `seenConflictIds` sem um dos afetados e espera 409 `SCHEDULE_CONFLICTS_CHANGED`. Como não roda local, a falha antes do código não é observada localmente, e isso fica registrado no Status.
- Gate: local `typecheck:test` e lint dos arquivos; integração no CI
- Modelo: padrao
- Status: feita (aguardando o resultado do job backend-integration no CI). Gate local: typecheck:test ok, oxlint ok, suíte do backend sem regressão. O teste de integração foi escrito junto com o código e não roda local (sem Postgres): a falha antes do código não foi observada local.

### T6 [P] Testes com banco real das regras de resolução (B2)
- O quê: provar com banco real:
  - o motivo `UNIT_CLOSED` e `OTHER`;
  - o registro `CITIZEN_NOTICE_DISABLED` em cada histórico;
  - o `KEPT_OFF_GRID` com `off_grid = TRUE`, e o agendamento mantido não ser apontado de novo;
  - o rollback total quando a gravação falha depois dos cancelamentos.
- Onde: novo `src/backend/tests/integration/scheduleConflictResolution.integration.test.ts`.
- Dev: Todo (Dev Back)
- Depende de: T5
- Reaproveita: o preparo de dados de `scheduleChanges.integration.test.ts`. Para o rollback, chamar o repositório direto com uma configuração que o banco recusa depois dos cancelamentos.
- Atende: RN-02, RN-03, RN-04, RN-05, RN-07, CA-10 a CA-13
- Pronto quando:
  - cada regra tem um teste com banco real;
  - o rollback deixa os agendamentos, o histórico e a agenda como antes;
  - localmente, `typecheck:test` e lint passam, e os testes passam no CI.
- Teste: integração, rodado no CI. Regras que já existem: os testes devem passar de primeira (registrar no Status). Se algum falhar no CI, é bug, e a correção entra nesta tarefa.
- Gate: local `typecheck:test` e lint dos arquivos; integração no CI
- Modelo: padrao
- Status: feita (aguardando o resultado do job backend-integration no CI). Gate local: typecheck:test ok, oxlint ok. Os testes não rodam local (sem Postgres): não foi observado se passam de primeira. Se algum falhar no CI, é bug e a correção entra nesta tarefa.

### T7 [P] Textos da origem salvar, da dica por permissão e da mensagem de atualização
- O quê: acrescentar ao arquivo de textos as chaves de RN-11, RN-14 e RN-15 (`conflicts.hintWithCancel`, `conflicts.hintKeepOnly`, `conflictModal.changedNotice` e `conflictModal.save.*`), conforme "Textos".
- Onde: `src/frontend/src/locales/pt-BR/schedule.json`; teste de textos em `src/frontend/src/i18n/test/`.
- Dev: Yuji (Dev Front)
- Depende de: nada
- Reaproveita: `conflictModal.failedCount_one/_other` (aninhada na frase única); os textos atuais das opções.
- Atende: RN-11, RN-14, RN-15, CA-21 (origem salvar)
- Pronto quando:
  - as chaves existem com os textos exatos;
  - a frase com falhas da origem salvar dá as três combinações de CA-21;
  - as chaves antigas continuam até T12;
  - o gate rápido front passa.
- Teste: unitário. Falha primeiro o teste da frase com 3 cancelados e 2 falhas.
- Gate: rápido front
- Modelo: economico
- Status: feita (6595cf1). Teste primeiro: 8 falharam por chave ausente. Gate: vitest 42 passaram (i18n), typecheck, oxlint e prettier ok.

### T15 [P] Textos da origem cancelar mudança agendada
- O quê: acrescentar as chaves `conflictModal.cancelScheduledChange.*` de RN-16, conforme "Textos", incluindo os resultados sem falha com o prefixo "Mudança cancelada. ".
- Onde: `src/frontend/src/locales/pt-BR/schedule.json`; o mesmo teste de textos de T7.
- Dev: Yuji (Dev Front)
- Depende de: T7
- Reaproveita: o padrão de plural aninhado de T7.
- Atende: RN-16, CA-20 (textos), CA-21 (origem cancelar mudança agendada)
- Pronto quando:
  - as chaves existem com os textos confirmados;
  - o título dá "Cancelar a mudança de 05/12 afeta 1 agendamento" e "... afeta 2 agendamentos";
  - a frase com falhas dá as três combinações com "Mudança cancelada. " antes;
  - `keptToast` dá "Mudança cancelada. 1 agendamento mantido com o selo \"Fora da grade atual\"." e "Mudança cancelada. 2 agendamentos mantidos com o selo \"Fora da grade atual\".", sem "Alteração salva.";
  - os resultados sem falha ao cancelar (aviso ligado e aviso desligado) dão as mensagens de hoje com "Mudança cancelada. " antes, no singular e no plural;
  - a mensagem de mantidos da origem salvar continua com "Alteração salva.";
  - o gate rápido front passa.
- Teste: unitário. Falha primeiro o teste do título no plural.
- Gate: rápido front
- Modelo: economico
- Status: feita (67f6e51). Teste primeiro: 14 falharam por chave ausente. Gate: vitest 57 passaram (i18n), typecheck, oxlint e prettier ok.

### T9 [P] Modal: origem, textos por permissão, mensagem de atualização, teclado e carregamento
- O quê:
  - o modal recebe a origem e a data da mudança, e escolhe os textos por um mapa de chaves por origem e permissão, sem condicionais espalhadas no JSX;
  - mostra a mensagem de RN-11 quando indicado;
  - foca "Manter os agendamentos" ao abrir, prende o Tab e devolve o foco ao fechar;
  - não fecha por clique fora, e o Esc volta;
  - esconde o botão de cancelar enquanto carrega ou com erro.
- Onde: `src/frontend/src/components/ScheduleConflictModal.tsx`; novo `src/frontend/src/components/test/ScheduleConflictModal.test.tsx`; tipo da origem em `src/frontend/src/types/schedule/ScheduleConflictModalOrigin.types.ts`.
- Dev: Yuji (Dev Front)
- Depende de: T7, T15
- Reaproveita: o foco e o Tab de `ConfirmDialog.tsx` (`FOCUSABLE_SELECTOR` e o padrão de `trapFocus`).
- Atende: RN-11, RN-13, RN-15, RN-16, RN-18, RN-19, CA-08, CA-20, CA-23, CA-24, CA-25
- Pronto quando:
  - os textos de cada origem e de cada permissão aparecem, um teste por variação de abertura nas duas origens;
  - a mensagem de RN-11 só aparece quando indicada;
  - o foco abre em Manter, Tab e Shift+Tab circulam só no modal, e o foco volta ao elemento anterior;
  - clique fora não fecha, e o Esc fecha sem ação em andamento;
  - carregando ou com erro, o botão de cancelar não está na tela;
  - o gate rápido front passa.
- Teste: unitário de componente. Falha primeiro o teste que espera o foco em "Manter os agendamentos" ao abrir.
- Gate: rápido front
- Modelo: padrao
- Status: feita (30d5547). Teste primeiro: 15 dos 20 falharam pelo motivo certo. Gate: vitest 845 (modal e páginas), typecheck, oxlint e prettier ok. Divergência registrada: 3 asserções de teste de página ajustadas por mudança de regra (voltar com a seta, RN-15; cancelar escondido em vez de desabilitado, RN-19), em Schedule.conflictModal.test.tsx e Schedule.conflicts.test.tsx. Exceção registrada: a T9 acrescentou a classe .changedNotice em scheduleConflictModal.module.css, arquivo que a spec reservava à T13 (depois estilizada no tom de aviso, com aria-live polite, e com reserva de 100vh na altura). O controle de foco foi extraído para utils/trapFocus.ts e é usado também pelo ConfirmDialog, por decisão da orchestrator.

### T10 [P] Página: envio do que foi visto, atualização após recusa, origem e fim da lista abaixo das mudanças (B1, B4 e B5)
- O quê:
  - a página envia os ids do modal e, ao cancelar, o estado do aviso mostrado;
  - num 409 `SCHEDULE_CONFLICTS_CHANGED`, troca a lista, grava o estado novo do aviso no cache de GET /cancellation-notice e liga a mensagem de RN-11;
  - informa ao modal a origem e a data da mudança;
  - remove `cancelConflicts` e a lista abaixo das mudanças agendadas;
  - testa o caminho de cancelar mudança agendada.
- Onde: `src/frontend/src/pages/hooks/useSchedule.ts`; `src/frontend/src/components/ScheduleVersions.tsx`; `src/frontend/src/types/schedule/ScheduleVersionsView.types.ts`; `src/frontend/src/pages/Schedule.page.tsx` (repasse ao modal); testes `src/frontend/src/pages/test/Schedule.conflictModal.test.tsx`, `src/frontend/src/pages/test/Schedule.versions.test.tsx` e `src/frontend/src/components/test/ScheduleVersions.test.tsx`; `src/frontend/src/testUtils/scheduleApiStub.ts`, se precisar.
- Dev: Yuji (Dev Front)
- Depende de: T2, T7, T9
- Reaproveita: `scheduleApi.util.upsertQueryEntries`; o fluxo atual de `resolveConflicts` e de `confirmCancel`.
- Atende: RN-09, RN-11, RN-12, RN-13, CA-01 a CA-08, CA-16, CA-17, CA-18 (tela)
- Observação: tirar de `ScheduleVersions.test.tsx` os casos que só testavam a lista abaixo das mudanças faz parte da decisão do usuário (RN-12). Ajustar em `Schedule.conflictModal.test.tsx` o corpo esperado das chamadas para o contrato novo acompanha B1. Nenhum dos dois conta como "alterar teste para passar".
- Pronto quando:
  - o corpo enviado nos três caminhos tem os ids do modal e, ao cancelar, o `seenNoticeEnabled`;
  - depois de um 409 de divergência, o modal mostra a lista nova, o estado novo do aviso e a mensagem de RN-11, nas duas origens;
  - um teste de página abre o modal por "Cancelar mudança" e confere: a lista só no modal; o DELETE com `"KEEP"` e com `"CANCEL"` e os campos do contrato no corpo; a mensagem de resultado; e a volta para a configuração de hoje quando a mudança cancelada estava aberta;
  - o gate rápido front passa.
- Teste: integração de página. Falha primeiro o teste que espera, depois de confirmar "Cancelar mudança" com afetados, a lista só dentro do modal.
- Gate: rápido front
- Modelo: padrao
- Status: feita (fdb89bd). Teste primeiro: 9 novos falharam pelo motivo certo. Gate: vitest 25 (modal e versões), páginas e componentes 1306 passam e 1 falha (ScheduleConflictList, prevista para T8), typecheck, oxlint e prettier ok. Testes autorizados alterados: removido o caso da lista abaixo das mudanças (RN-12) em Schedule.versions.test.tsx e `cancelConflicts` do ScheduleVersions.test.tsx. Também editado useScheduleSave.ts (onConflicts recebe o erro inteiro), fora da lista de arquivos da tarefa.

### T13 [P] Visual do modal e selo do detalhe, iguais ao protótipo
- O quê:
  - aplicar ao modal o visual de "Visual do modal" com a linha própria `ScheduleConflictModalRow` (sem CPF, protocolo sem a palavra "Protocolo") e trocar a linha usada pelo modal;
  - aplicar o visual aos botões, ao texto corrido, ao quadro de cancelar, às opções e à altura;
  - aplicar o padrão das janelas de confirmação aos estados sem protótipo;
  - ajustar o selo "Fora da grade atual" no cabeçalho do detalhe.
- Onde: `src/frontend/src/components/ScheduleConflictModal.tsx` (só a troca da linha); novo `src/frontend/src/components/ScheduleConflictModalRow.tsx` e `src/frontend/src/styles/components/scheduleConflictModalRow.module.css`; `src/frontend/src/styles/components/scheduleConflictModal.module.css`; o CSS do cabeçalho do detalhe do agendamento (o arquivo de estilo de `AppointmentDetailHeader`); novo `src/frontend/src/components/test/ScheduleConflictModalRow.test.tsx`.
- Dev: Yuji (Dev Front), com a conferência lado a lado da Nobara
- Depende de: T9
- Reaproveita: os tokens `--divider`, `--font-mono`, `--color-primary`, `--text-secondary`, `--text-muted`, `--danger`, `--error-text` (cor do motivo, decisão da designer), `--error-border`, `--seal-warning-bg` e `--seal-warning-text`; o `Seal` para o selo de status da linha (já tem 11,5 px e padding 2/8); o protótipo servido localmente.
- Atende: RN-20, RN-21, CA-26 a CA-30
- Pronto quando:
  - a linha mostra protocolo, nome com selo de status, data e hora e motivo, sem CPF e sem a palavra "Protocolo";
  - o CSS segue cada item de "Visual do modal": sem `white-space: nowrap` abaixo de 480 px, `minmax(min(240px, 100%), 1fr)`, botões com `width: 100%`, `100dvh`, `--error-border` e texto das opções em 13,5 px;
  - conferido em 320 px e em computador, lado a lado com o protótipo, com cada diferença corrigida ou registrada com o motivo;
  - o selo do detalhe segue RN-21;
  - fora do modal e do selo, nada muda;
  - o gate rápido front passa.
- Teste: unitário da linha. Falha primeiro o teste que espera o protocolo sem a palavra "Protocolo" e nenhum CPF. O resto é estilo, conferido lado a lado.
- Gate: rápido front
- Modelo: padrao
- Status: feita (42eab83), com a conferência lado a lado pendente da Nobara (não rodei navegador, só CSS conforme o Desenho). Teste primeiro: a linha falhou por componente ausente. Gate: vitest 1309 de componentes e páginas passam e 1 falha (ScheduleConflictList, T8), typecheck, oxlint e prettier ok. Teste alterado por mudança de regra (RN-20): Schedule.conflicts.test.tsx agora espera o modal sem CPF e sem a palavra Protocolo. Seletor do selo do detalhe via [data-tone] dentro de .tags. A alteração em Schedule.conflicts.test.tsx (sem CPF e sem "Protocolo") foi aceita sob a RN-20. O status da linha usa o Seal com cores (prop colors), sem estilo inline repetido; o teste do Seal passou a cobrir isso.

### T8 [P] Dica da lista de afetados por permissão (B3)
- O quê: a lista de afetados da tela de Horários mostra a dica de RN-14 conforme a permissão de quem usa.
- Onde: `src/frontend/src/components/ScheduleConflictList.tsx`; `src/frontend/src/components/test/ScheduleConflictList.test.tsx`; `src/frontend/src/pages/Schedule.page.tsx` (repasse da permissão).
- Dev: Yuji (Dev Front)
- Depende de: T7, T10 (T10 tira o uso da lista em `ScheduleVersions.tsx`, e a propriedade nova fica com um chamador só)
- Reaproveita: `canManageAppointments`, que já vem de `useSchedule`.
- Atende: RN-14, CA-19
- Observação: a mudança no teste `ScheduleConflictList.test.tsx` foi autorizada explicitamente pelo usuário, porque a regra mudou. Hoje o teste espera o texto antigo da develop e, segundo a mensagem do usuário, falha no CI. Ele passa a cobrir os dois casos de permissão. Os outros testes do arquivo ficam.
- Pronto quando:
  - com as duas permissões (e com Admin), a dica é a primeira de RN-14, e só com Configurar é a segunda;
  - o teste que falhava passa;
  - o gate rápido front passa.
- Teste: unitário de componente. Falha primeiro o caso "só com Configurar atendimento presencial".
- Gate: rápido front
- Modelo: economico
- Status: feita (da08007). Teste primeiro: o caso só com Configurar falhou pelo motivo certo. Teste de página da dica para Admin sem appointments.manage e para só Configurar adicionado (passaram de primeira, regra já existente). Gate: vitest 840 (páginas e lista) passam, typecheck, oxlint e prettier ok. Testes alterados (autorizado): o teste antigo da dica foi trocado pelos dois casos de permissão, e as renderizações dos outros testes do arquivo passaram a levar a propriedade nova obrigatória, sem mudar o que verificam.

### T11 [P] Mensagens de resultado por origem e sem "0 agendamentos"
- O quê: usar a frase com falhas de cada origem, os resultados sem falha da origem cancelar mudança agendada (com "Mudança cancelada. " antes, RN-16) e a mensagem normal quando `affectedCount` é 0.
- Onde: `src/frontend/src/pages/hooks/useSchedule.ts` (`resolutionToast`); `src/frontend/src/pages/test/Schedule.conflictModal.test.tsx` e `src/frontend/src/pages/test/Schedule.versions.test.tsx`.
- Dev: Yuji (Dev Front)
- Depende de: T10, T15
- Reaproveita: as chaves de T7 e T15; `save.toast`, `save.scheduledToast` e `versions.cancelled`.
- Atende: RN-10, RN-15, RN-16, RN-17, CA-07 (tela), CA-14 (tela), CA-21, CA-22
- Pronto quando:
  - com falhas, a mensagem é uma frase de uma chave só, conforme a origem;
  - na origem cancelar mudança agendada, Manter mostra "Mudança cancelada. N agendamentos mantidos com o selo \"Fora da grade atual\"." (singular com 1), sem "Alteração salva.", com teste que confere a ausência de "Alteração salva.";
  - na origem cancelar mudança agendada, Cancelar com aviso ligado e Cancelar com aviso desligado mostram a mensagem de hoje com "Mudança cancelada. " antes, cada caso com teste;
  - na origem salvar, Manter continua mostrando "Alteração salva.", com teste;
  - com `affectedCount: 0`, aparece a mensagem normal do caminho, em Manter e em Cancelar;
  - o gate rápido front passa.
- Teste: integração de página. Falha primeiro o teste que espera "Mudança de horários cancelada." quando o DELETE com resolução volta com `affectedCount: 0`.
- Gate: rápido front
- Modelo: economico
- Status: feita (52f92db). Teste primeiro: 9 novos falharam pelo motivo certo (os 2 de origem salvar com a frase de falhas já passavam, regra que existia). Gate: vitest 843 de páginas passam, typecheck, oxlint e prettier ok.

### T12 Remover o código das travas antigas e o que sobrou sem uso
- O quê: apagar o código, os textos e os testes que só serviam às travas antigas ou que ficaram sem uso depois de T8 a T13.
- Onde:
  - apagar `src/frontend/src/utils/schedule/bookedDatesOfWeekday.ts`, `src/frontend/src/utils/schedule/rangeHasBooking.ts` e `src/frontend/src/utils/schedule/test/bookingLocks.test.ts`;
  - tirar `dateHasAppointments` de `src/frontend/src/types/schedule/BlockedDateProblem.types.ts` e o ramo dele em `useSchedule.ts`;
  - tirar o parâmetro `_bookedDays` de `src/frontend/src/utils/schedule/validateNewBlock.ts`, o repasse de `bookedDays` em `useScheduleDraft.ts` e o cálculo `vigencyDays` de `useSchedule.ts`;
  - apagar `src/frontend/src/utils/schedule/bookedDaysInVigency.ts` e o teste dele, se não houver mais uso;
  - tirar `lockedReason` de `ScheduleDayView.types.ts`, `ScheduleDayRow.tsx` e `useSchedule.ts`, e `removeLocked` de `ScheduleRangeView.types.ts`, `ScheduleRangeField.tsx` e `useSchedule.ts`;
  - no arquivo de textos, tirar as chaves órfãs: `grid.removeLocked`, `grid.dayLocked`, `grid.dayLockedMore`, `blocked.problems.dateHasAppointments_*`, `conflicts.hint`, `conflictModal.description` e as chaves soltas do modal que T7 e T15 substituíram por chaves por origem (`keepDescription`, `keepAction`, `cancelActionOn`, `cancelActionOff`, `back`, `canceledCount_*`);
  - ajustar `ScheduleWeekGrid.test.tsx` e `useSchedule.draft.test.tsx` só nos casos de trava;
  - conferir `Schedule.vigencyLocks.test.tsx` e apagar só os casos de trava.
- Dev: Yuji (Dev Front)
- Depende de: T8, T9, T10, T11, T13
- Reaproveita: nada
- Atende: RN-08, RN-12, CA-15, CA-31
- Observação:
  - Ficam a marcação de dias com agendamento na prévia (`SchedulePreview` com `bookedDays`, `useBookedDays`, aviso `bookedDaysFailed`), a lista de afetados da tela (`ScheduleConflictList` e `ScheduleConflictRow`) e o erro de bloqueio fora da vigência.
  - Apagar testes de código removido não conta como "alterar teste para passar". Se algum teste fora dessa lista falhar, avise a orchestrator.
- Pronto quando:
  - a busca pelos nomes removidos não acha nada no painel;
  - os testes do que fica passam sem mudança;
  - o gate rápido front e o gate de fase do frontend passam.
- Teste: nenhum novo (remoção). A suíte inteira prova que o que fica continua igual.
- Gate: rápido front, com `npm run test:run`
- Modelo: economico
- Status: feita (7351970). Gate de fase do frontend: format:check, lint, build, typecheck e suíte completa (260 arquivos, 2158 testes) passam. A busca pelos nomes removidos não acha nada. Apagados por serem só de trava: bookingLocks.test, bookedDaysInVigency.test, Schedule.vigencyLocks.test (os 3 casos eram só de trava por vigência), os 3 casos de trava do ScheduleWeekGrid.test e o caso de data com agendamento do validateNewBlock.test. Também removidos o CSS de trava (.lock e aria-disabled) em scheduleForm.module.css e `lockedReason`/`removeLocked` dos testes de grade.

### T14 [P] Documentação: regra 08, índice das regras e READMEs
- O quê: atualizar a documentação para o comportamento entregue, para os textos novos por origem e por permissão e para o contrato novo da API, e listar o que ficou pendente.
- Onde: `.docs/regras/08-horarios-de-atendimento.md`; `.docs/regras/README.md`; `src/frontend/README.md`; `src/backend/README.md`.
- Dev: Miwa (Dev Doc)
- Depende de: T4, T5, T10, T15
- Reaproveita: o contrato e a seção "Textos" desta spec; o texto atual da regra 08 sobre o modal.
- Atende: CA-32
- Detalhes:
  - na regra 08, a linha da tabela de motivos que diz que o cancelamento de mudança agendada é recusado e que a lista aparece abaixo das mudanças passa a dizer que abre o modal (RN-12);
  - o bloco "Comportamento atual, até a issue #75" sai ou vira histórico;
  - entram RN-09 a RN-11 e RN-13 a RN-16, com os textos exatos das duas origens;
  - "Tentar novamente", os horários voltarem livres, o envio em paralelo e os testes de borda viram pendentes;
  - o README do servidor documenta os campos, os dois 409, a lista vazia e o corpo do DELETE;
  - o README do painel descreve as duas origens do modal.
- Pronto quando: os quatro arquivos batem com esta spec e com o código; os links abrem; o gate doc passa.
- Teste: nenhum
- Gate: doc
- Modelo: padrao
- Status: feita (c253a5e). Gate doc: regra 08, índice das regras e os READMEs do painel e do servidor conferidos contra a spec (RN-09 a RN-16, contrato da API) e contra o código (campos, eventos, ordem dos avisos); sem Co-Authored-By. Pendentes registrados nos quatro arquivos: "Tentar novamente", horários cancelados voltarem livres, avisos em paralelo e testes de borda extras.

## Dúvidas

Do product-owner:

- Nenhuma. D-PO-01, D-PO-02 e D-PO-03 foram respondidas pela PO e viraram RN-09 (Manter incluído), RN-10 e RN-11. As respostas são inferências da PO e o usuário as confirma na aprovação desta spec.

Só o usuário:

- Nenhuma. O usuário confirmou o corpo JSON no DELETE, o prefixo "Mudança cancelada. " nas mensagens sem falha da origem cancelar mudança agendada (RN-16), a retirada de "Alteração salva." da mensagem de mantidos dessa origem e os textos de título e botões dessa origem.

Da designer: nenhuma. A cor do motivo usa `--error-text`, e não há mais detalhes a mandar.

# WhatsApp

## Para que serve

Conectar o painel ao número institucional na **WhatsApp Cloud API** (oficial da Meta), acompanhar o estado do número e pausar o chatbot em emergências. Permite trocar o número e as credenciais **sem mexer no servidor** ([decisão 003](../decisoes/003-migracao-whatsapp-cloud-api.md)).

## Quem acessa

**Só a conta Admin.**

## Estado da tela

**Entregue (issues #54, #69, #127 e #129).** Já funcionam: topo com número e situação, pausa, credenciais, "Configure no painel da Meta", teste de conexão, a aba **Privacidade** (issue #69), credenciais, webhook, qualidade e limite de envios no **Estado do número**, modelos de mensagem com atualização de status (issue #127), falhas de entrega e **Histórico de alterações** (issue #129).

## O que a tela mostra

### Abas

A tela tem duas abas logo abaixo do título:

- **Conexão** (aberta por padrão): todo o conteúdo descrito abaixo, de "Estado do número" a "Histórico de alterações", mais a faixa de pausa e o resumo do topo.
- **Privacidade**: os dados de privacidade (seção [Privacidade](#privacidade)).

Regras da troca de abas:

- as abas são navegáveis pelo teclado (setas para a esquerda e para a direita);
- trocar de aba **não descarta** as alterações pendentes de nenhuma das duas: cada aba guarda as suas até salvar ou descartar;
- a nota "Última alteração por [nome] em [data]" e a barra "N alterações não salvas" do topo seguem a aba ativa. Na Conexão, mostram as credenciais; na Privacidade, os dados de privacidade;
- a configuração de privacidade só é lida quando a aba Privacidade é aberta pela primeira vez.

### Topo

- **Número institucional**: o número e o nome verificados pela Meta, guardados no sistema no último teste bem-sucedido das credenciais salvas ou ao salvar. Enquanto não houver número verificado, aparece "Número ainda não verificado. Teste a conexão."
- **Situação** geral: **Operando**, **Respostas pausadas**, **Credenciais inválidas**, **Não verificado** (há ID do número, mas as credenciais ainda não foram verificadas com a Meta) ou **Não configurado** (sem ID do número).
- Interruptor **"Pausar respostas automáticas"**.
- Quando pausado, uma faixa no topo: "As respostas automáticas estão pausadas. O chatbot não está respondendo aos cidadãos", com o botão **"Reativar respostas"**.

### Estado do número

**Construído nas issues #127 e #129.** A tela mostra credenciais, último evento do webhook, falhas de entrega das últimas 24 horas, qualidade e limite de envios. A seção permite atualizar a consulta à Meta e mostra alertas quando a consulta falha ou quando o uso fica acima de 80% do limite diário.

| Item | O que mostra |
|---|---|
| **Credenciais** | "Válidas" (com a data da última verificação) ou "Token inválido ou expirado", com a orientação para gerar um novo token, usar "Substituir", testar e salvar |
| **Último evento recebido pelo webhook** | Data e hora. **Sem eventos há mais de 24 horas**, alerta para conferir se o webhook está verificado e assinado em "messages" |
| **Qualidade do número na Meta** | Alta, Média ou Baixa, com a explicação de cada uma. Com qualidade baixa, a Meta pode limitar os envios. **Alta:** "Poucos bloqueios ou denúncias de usuários. Envio sem restrições." **Média:** "Aumento recente de bloqueios ou denúncias. Vale revisar o texto das mensagens." **Baixa:** "Muitos bloqueios ou denúncias. A Meta pode limitar o envio de mensagens." |
| **Limite de envios da Meta** | Limite diário de conversas iniciadas pela empresa, quantas foram usadas nas últimas 24h (lembretes e avisos de cancelamento) e uma barra. **Acima de 80%**, alerta: "Perto do limite diário da Meta. Lembretes e avisos podem deixar de ser enviados" **Formato:** "Limite diário: [N] conversas iniciadas pela empresa. Usadas nas últimas 24h: [X] de [N]", com N igual a 250, 1.000, 10.000 ou 100.000 conforme o nível da conta na Meta. Se a Meta informar que não há limite, a tela mostra "Sem limite diário", sem barra nem alerta. Se o nível for desconhecido, mostra "Limite não informado pela Meta", também sem barra nem alerta. A tela nunca mostra o código do nível (por exemplo, TIER_250). |

### Credenciais

| Campo | Tipo |
|---|---|
| ID do número de telefone | Visível |
| ID da conta WhatsApp Business | Visível |
| Token de acesso | **Secreto** |
| App Secret | **Secreto** |

- **Todos os campos são obrigatórios.** Os IDs aceitam só números (até 40 dígitos); os campos secretos não podem ter espaços. A tela avisa antes de testar, por exemplo: "Preencha o campo "ID da conta WhatsApp Business" ou cancele a substituição antes de testar."
- **Campos secretos nunca são exibidos depois de salvos.** Aparecem como `••••••••a91F` (só os últimos 4 caracteres), com o botão **"Substituir"**. A tela explica: "Guardado criptografado. Não é possível visualizar o valor salvo."
- No campo do token, o sistema mostra o tipo do token, descoberto sozinho pela Meta no teste de conexão e no salvar:
  - token que não expira: nenhum aviso no campo (o Admin só precisa saber quando o token vai expirar);
  - token com validade: **"Este token expira em [data] às [hora] (horário de Brasília)."** Com mais de 7 dias restantes, em tom neutro. De 4 a 7 dias, em amarelo e com o pedido **"Gere um token permanente de usuário do sistema para o chatbot não parar de responder."** Com 3 dias ou menos, em vermelho, com o mesmo pedido;
  - token já expirado: **"Este token expirou em [data] às [hora] (horário de Brasília). Gere um token permanente de usuário do sistema, use "Substituir", teste e salve."**, em vermelho;
  - quando o sistema não consegue saber o tipo (ou enquanto um token novo é digitado e ainda não foi testado): **"Use um token permanente de usuário do sistema; o token temporário expira em 24 horas."**

### Configure no painel da Meta

Os valores **gerados pelo sistema** que o Admin cola no painel da Meta, com botão "Copiar":
- **URL do webhook**;
- **token de verificação**.

Se o endereço público do sistema não estiver configurado no servidor, no lugar da URL aparece: "A URL pública do sistema não está configurada no servidor. Peça à equipe técnica para definir PUBLIC_BASE_URL."

E o passo a passo:
1. Usar um **token permanente de usuário do sistema** (Gerenciador de Negócios › Usuários do sistema › Gerar token). O token temporário do painel de desenvolvedor expira em 24 horas e o chatbot para de funcionar.
2. No painel de desenvolvedores da Meta, abrir o app e ir em WhatsApp › Configuração.
3. Em Webhook, clicar em Editar e colar a URL e o token de verificação.
4. Clicar em Verificar e salvar e, em Campos do webhook, assinar "messages".
5. Em WhatsApp › Configuração da API, copiar o ID do número e o ID da conta para os campos da tela.

### Testar conexão

- Estados: **testando**, **sucesso** (mostra o número e o nome verificados) e **erro** (com mensagem clara, ex.: "Token inválido ou expirado").
- **Credenciais novas só podem ser salvas depois de um teste bem-sucedido.** Ao salvar, o sistema testa de novo com a Meta; se a Meta recusar, nada é salvo e a tela mostra o motivo.
- Motivos de erro mostrados: "Token inválido ou expirado", "App Secret inválido", "ID do número não encontrado ou sem acesso por este token", "ID da conta WhatsApp Business não encontrado ou sem acesso por este token", "O número não pertence a esta conta WhatsApp Business", "O token não tem permissão para gerenciar este número", "Não foi possível falar com a Meta. Tente de novo em instantes" e "A Meta recusou as credenciais".

### Modelos de mensagem

**Construído na #127.** A seção consulta os modelos na Meta ao abrir e oferece o botão **"Atualizar status da Meta"**. O cadastro dos modelos na Meta está no [guia de modelos de mensagem](../whatsapp/modelos-de-mensagem.md).

Mensagens enviadas fora da conversa precisam de modelo aprovado pela Meta ([decisão 005](../decisoes/005-mensagens-ao-cidadao.md)).

| Modelo | Usado em |
|---|---|
| Lembrete do atendimento | [Horários de atendimento](08-horarios-de-atendimento.md) |
| Aviso de cancelamento | [Detalhe do agendamento](04-detalhe-do-agendamento.md) e cancelamento em massa |

- Cada um mostra, ao lado do nome, o **nome técnico do modelo** (por exemplo, `lembrete_atendimento`), para o Admin encontrá-lo no Gerenciador da Meta.
- Cada um mostra o status na Meta: **Aprovado** (verde), **Em análise** (âmbar), **Rejeitado** (vermelho), **Não encontrado** (vermelho) ou outro status informado pela Meta (âmbar, com o nome do status devolvido), com o botão **"Atualizar status da Meta"**.
- Se algum não estiver aprovado: "Enquanto este modelo não for aprovado, [lembretes / avisos de cancelamento] não serão enviados."
- Se o modelo estiver **Rejeitado**, o alerta acrescenta, depois da frase acima: "A Meta rejeitou o modelo: revise o texto no Gerenciador do WhatsApp e envie novamente."

### Aviso de cancelamento ao cidadão

Issue #164, [decisão 005](../decisoes/005-mensagens-ao-cidadao.md). Um cartão com o interruptor **"Avisar o cidadão por WhatsApp quando a equipe cancelar um agendamento"**, **desligado por padrão**, que fica depois de "Modelos de mensagem".

- Texto de apoio: "Cada aviso de cancelamento é uma mensagem de modelo e tem custo por mensagem cobrado pela Meta. Os avisos contam no limite diário de envios da Meta. Com o aviso desligado, o agendamento é cancelado sem avisar o cidadão e a equipe precisa avisar por outro meio."
- **Age na hora**, sem passar pelo Salvar ([regras gerais §3](00-regras-gerais.md#3-salvar-descartar-e-registrar-quem-alterou)), e **pede confirmação nos dois sentidos**:
  - **Ligar:** título "Ligar o aviso de cancelamento?", texto "Quando a equipe cancelar um agendamento, o cidadão receberá uma mensagem pelo WhatsApp. Cada aviso é uma mensagem de modelo e tem custo por mensagem cobrado pela Meta.", botões "Ligar aviso" e "Voltar".
  - **Desligar:** título "Desligar o aviso de cancelamento?", texto "Quando a equipe cancelar um agendamento, o cidadão NÃO será avisado pelo sistema. A equipe precisa avisar por outro meio.", botões "Desligar aviso" e "Voltar".
- Só o Admin muda o interruptor, validado no servidor. Cada mudança entra no **Histórico de alterações** com quem e quando.
- **O que muda no cancelamento:** ver [Detalhe do agendamento](04-detalhe-do-agendamento.md#modal-de-cancelamento) e o cancelamento em massa em [Horários de atendimento](08-horarios-de-atendimento.md). Não vale para o lembrete, que tem o próprio liga e desliga.
- **Faixa "O aviso pode não chegar: [motivo]"**, no cartão e no modal de cancelar, com o aviso ligado. Só entram **problemas da conta**, não do destinatário. Aparece quando há uma falha de envio nas **últimas 24 horas** (a mesma janela das falhas de entrega) e nenhum envio bem-sucedido depois dela, ou quando o estado atual já mostra o problema. Frases:

  | Situação | Frase |
  |---|---|
  | Erro 131042 | a conta da Meta está sem forma de pagamento |
  | Erro 132001 | o modelo de aviso não existe na Meta |
  | Erros 132000 e 132005 | o texto do modelo cadastrado na Meta não confere com o do sistema |
  | Erro 190, credenciais inválidas | o token da Meta está inválido ou expirado |
  | Modelo não aprovado ou pausado | o modelo de aviso não está aprovado na Meta |

  Os erros 131026 (mensagem não entregável) e 131049 (limite de envio proativo) dizem respeito àquele cidadão, não à conta: não geram a faixa e aparecem só na falha do Histórico do agendamento. Os códigos acima seguem a lista que a equipe usou; só o 131042 foi confirmado na documentação oficial da Meta (17/11/2026), os demais **não foram confirmados** e devem ser conferidos antes da entrega.

### Privacidade

**Entregue (issue #69).** Dados de quem responde pelo tratamento dos dados pessoais ([decisão 002](../decisoes/002-lgpd-dados-pessoais.md)). Eles mudam na passagem para o PROCON, por isso ficam no painel e não no código.

| Campo | Limite | Observação |
|---|---|---|
| Nome do controlador | até 150 caracteres | |
| Nome do encarregado (DPO) | até 150 caracteres | |
| E-mail de contato para pedidos do titular | até 254 caracteres | precisa ter o formato `nome@dominio.tld` |
| Atendimento presencial (opcional) | até 300 caracteres | telefone ou endereço |
| Prazos de guarda | até 2000 caracteres | texto livre, várias linhas, para outros prazos que a página pública deve mostrar |
| Anonimização automática | interruptor | **desligado por padrão** |
| Prazo das conversas (dias) | inteiro de 30 a 1825 | padrão 90 |
| Prazo dos agendamentos (dias) | inteiro de 90 a 1825 | padrão 365 |

- Cada campo tem, ao lado do rótulo, um ícone de ajuda (tooltip) com um texto que explica para que serve o campo. O ícone tem o nome acessível **"Sobre o campo <rótulo>"** (por exemplo, "Sobre o campo Nome do controlador").
- **Segue o padrão de salvar** ([regras gerais](00-regras-gerais.md#3-salvar-descartar-e-registrar-quem-alterou)): as alterações ficam pendentes até **Salvar**, **Descartar** volta aos valores salvos e o topo mostra "Última alteração por [nome] em [data]".
- Todos os campos podem ficar vazios. Os espaços nas pontas são removidos ao salvar, e campo vazio é gravado como "não cadastrado".
- Com um e-mail fora do formato, o campo mostra **"Informe um e-mail válido."**; com texto acima do limite, **"Use no máximo N caracteres."**, com N do campo. Nos dois casos, **Salvar** fica desabilitado.
- Se a leitura falhar, a aba mostra "Não foi possível carregar a configuração de privacidade." e nenhum formulário. Se o salvamento falhar, aparece "Não foi possível salvar a configuração de privacidade agora. Tente de novo." e as alterações continuam pendentes.
- **Página pública:** esses dados aparecem na página `/privacidade` do painel, aberta sem login. Campo vazio aparece como **"Informação ainda não cadastrada"**; o atendimento presencial vazio não aparece.
- **Saudação do bot:** a saudação ganha a linha **"Saiba como tratamos seus dados: <endereço público>/privacidade"** só quando o **nome do controlador e o e-mail de contato** estão preenchidos **e** o servidor tem o endereço público (`PUBLIC_BASE_URL`). A linha vai em toda mensagem que repete a saudação, inclusive na troca de página das categorias. Apagar o controlador ou o e-mail tira a linha já na próxima saudação.
- O salvamento da privacidade não entra no "Histórico de alterações" (#129); a aba mostra só a última alteração.

#### Anonimização automática

Entregue em 02/11/2026 (#69, D3). A regra de cada prazo e as salvaguardas estão na [decisão 002](../decisoes/002-lgpd-dados-pessoais.md#anonimização-por-prazo).

- Depois de "Prazos de guarda", a aba mostra o interruptor **"Anonimização automática"** (com "Ligada" ou "Desligada" ao lado) e os campos **"Prazo das conversas (dias)"** e **"Prazo dos agendamentos (dias)"**.
- Os textos de ajuda (tooltips):
  - Prazos de guarda: "Texto livre com outros prazos que a página pública deve mostrar. A anonimização automática é configurada nos campos abaixo."
  - Anonimização automática: "Quando ligada, o sistema remove a cada hora a ligação das conversas com o número e o nome e o CPF dos agendamentos que passaram do prazo. Não pode ser desfeito."
  - Prazo das conversas (dias): "Dias depois do fim da conversa. A conversa que gerou um agendamento espera o prazo do agendamento."
  - Prazo dos agendamentos (dias): "Dias depois da data do atendimento, em qualquer status."
- Um prazo vazio, não inteiro ou fora da faixa mostra **"Use um número inteiro de 30 a 1825."** (conversas) ou **"Use um número inteiro de 90 a 1825."** (agendamentos), e **Salvar** fica desabilitado.
- O interruptor e os prazos seguem o mesmo padrão de salvar dos outros campos: contam na barra "N alterações não salvas", e **Descartar** volta aos valores carregados.
- **Confirmação antes de salvar.** Quando o resultado deixa o interruptor ligado e ele estava desligado, ou algum prazo diminuiu, **Salvar** primeiro calcula quantos registros já passaram do prazo e abre o diálogo:
  - título **"Ligar a anonimização automática?"**, ou **"Reduzir o prazo de guarda?"** quando o interruptor já estava ligado e só um prazo diminuiu;
  - texto **"Com estes prazos, N conversas e M agendamentos já passaram do prazo e serão anonimizados nas próximas horas. Isso não pode ser desfeito."** (com "1 conversa" e "1 agendamento" no singular). Com os dois totais zero: **"Com estes prazos, nenhum registro passou do prazo agora. A partir de agora, o que passar do prazo será anonimizado a cada hora. Isso não pode ser desfeito."**;
  - botões **"Anonimizar"** (vermelho) e **"Cancelar"**. Só "Anonimizar" salva. "Cancelar" fecha o diálogo e mantém as alterações pendentes.
- Desligar o interruptor, ou aumentar um prazo com ele ligado, salva direto, sem diálogo. O que já foi anonimizado continua anonimizado.
- Se o cálculo falhar, aparece **"Não foi possível calcular quantos registros seriam anonimizados. Tente de novo."**, sem diálogo, e as alterações continuam pendentes.
- **Página pública:** com o interruptor ligado, a seção "Por quanto tempo guardamos" mostra os prazos salvos (ver a página `/privacidade`).

### Histórico de alterações

**Construído na issue #129.** A tela lista as 50 alterações mais recentes da API `GET /api/v1/whatsapp/settings/history` (só Admin), com quem alterou, o que mudou e quando. Para segredos, mostra apenas que foram substituídos; os valores do token e do App Secret nunca são registrados nem exibidos. A nota "Última alteração por [nome] em [data]" continua no topo.

Quem alterou o quê e quando. **Os valores do token e do App Secret não são registrados.**

## O que dá para fazer

| Ação | Regra |
|---|---|
| Editar os dados de privacidade | **Segue o padrão de salvar**. Não exige teste. Um e-mail fora do formato, um texto acima do limite ou um prazo fora da faixa desabilitam o Salvar |
| Ligar a anonimização automática ou reduzir um prazo | **Segue o padrão de salvar**, com a prévia de quantos registros passaram do prazo e a confirmação "Anonimizar" antes de gravar |
| Editar IDs, substituir segredos | **Segue o padrão de salvar** ([regras gerais](00-regras-gerais.md#3-salvar-descartar-e-registrar-quem-alterou)). Salvar credenciais novas exige teste bem-sucedido |
| Testar conexão | Pode ser feito a qualquer momento |
| Atualizar status dos modelos | Consulta os modelos e o estado do número na Meta de novo (#127) |
| **Ligar ou desligar o aviso de cancelamento ao cidadão** | **Age na hora**, com diálogo de confirmação nos dois sentidos (issue #164). Só o Admin |
| **Pausar respostas automáticas** | **Age na hora**, sem passar pelo Salvar, porque é de emergência. Pede confirmação: "O chatbot deixará de responder aos cidadãos até ser reativado" |
| **Reativar respostas** | Age na hora, sem confirmação |

**Durante a pausa**, quem escreve para o número recebe esta mensagem fixa, que aparece na tela e no modal de confirmação:

> "O atendimento automático do PROCON Jacareí está temporariamente indisponível. Tente novamente mais tarde."

## O que não existe de propósito

| O que não existe | Por quê |
|---|---|
| QR code, "Reconectar", Evolution API | O sistema usa só a Cloud API oficial ([decisão 003](../decisoes/003-migracao-whatsapp-cloud-api.md)) |
| Ver o valor de um segredo salvo | Segurança: só dá para substituir |
| Acesso para outras contas | Credenciais e pausa afetam o sistema inteiro; ficam só com o Admin |

## Relações

- A **Saúde do chatbot** no [Dashboard](02-dashboard.md) (também só Admin) resume os itens de "Estado do número" e a pausa, quando o Dashboard (issue #71) e a tela do Estado do número (issues #127 e #88) forem entregues.
- Durante o desenvolvimento, o sistema usa um número de testes do time. O PROCON troca pelo próprio número por esta tela, seguindo o guia de passagem.

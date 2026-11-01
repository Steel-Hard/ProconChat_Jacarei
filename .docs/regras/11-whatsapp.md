# WhatsApp

## Para que serve

Conectar o painel ao número institucional na **WhatsApp Cloud API** (oficial da Meta), acompanhar o estado do número e pausar o chatbot em emergências. Permite trocar o número e as credenciais **sem mexer no servidor** ([decisão 003](../decisoes/003-migracao-whatsapp-cloud-api.md)).

## Quem acessa

**Só a conta Admin.**

## Estado da tela

**Entregue em parte (issue #54).** Já funcionam: topo com número e situação, pausa, credenciais, "Configure no painel da Meta" e teste de conexão. Ainda não construídos na tela: **Modelos de mensagem** e a qualidade e o limite do **Estado do número** (API pronta na issue #67, tela na #127), o resto do **Estado do número** e o **Histórico de alterações** (issue #88).

## O que a tela mostra

### Topo

- **Número institucional**: o número e o nome verificados pela Meta, guardados no sistema no último teste bem-sucedido das credenciais salvas ou ao salvar. Enquanto não houver número verificado, aparece "Número ainda não verificado. Teste a conexão."
- **Situação** geral: **Operando**, **Respostas pausadas**, **Credenciais inválidas**, **Não verificado** (há ID do número, mas as credenciais ainda não foram verificadas com a Meta) ou **Não configurado** (sem ID do número).
- Interruptor **"Pausar respostas automáticas"**.
- Quando pausado, uma faixa no topo: "As respostas automáticas estão pausadas. O chatbot não está respondendo aos cidadãos", com o botão **"Reativar respostas"**.

### Estado do número

**Ainda não construído na tela.** Hoje a tela mostra só a situação geral no topo. A **qualidade** e o **limite de envios** já têm API (issue #67, `GET /api/v1/whatsapp/settings/number-status`, só Admin) e a tela fica com a #127. As **credenciais** e o **último evento do webhook** ficam com a #88.

| Item | O que mostra |
|---|---|
| **Credenciais** | "Válidas" (com a data da última verificação) ou "Token inválido ou expirado", com a orientação para gerar um novo token, usar "Substituir", testar e salvar |
| **Último evento recebido pelo webhook** | Data e hora. **Sem eventos há mais de 24 horas**, alerta para conferir se o webhook está verificado e assinado em "messages" |
| **Qualidade do número na Meta** | Alta, Média ou Baixa, com a explicação de cada uma. Com qualidade baixa, a Meta pode limitar os envios |
| **Limite de envios da Meta** | Limite diário de conversas iniciadas pela empresa, quantas foram usadas nas últimas 24h (lembretes e avisos de cancelamento) e uma barra. **Acima de 80%**, alerta: "Perto do limite diário da Meta. Lembretes e avisos podem deixar de ser enviados" |

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

**API pronta (issue #67), tela na #127.** `GET /api/v1/whatsapp/settings/templates` (só Admin) consulta a Meta a cada chamada. O cadastro dos modelos na Meta está no [guia de modelos de mensagem](../whatsapp/modelos-de-mensagem.md).

Mensagens enviadas fora da conversa precisam de modelo aprovado pela Meta ([decisão 005](../decisoes/005-mensagens-ao-cidadao.md)).

| Modelo | Usado em |
|---|---|
| Lembrete do atendimento | [Horários de atendimento](08-horarios-de-atendimento.md) |
| Aviso de cancelamento | [Detalhe do agendamento](04-detalhe-do-agendamento.md) e cancelamento em massa |

- Cada um mostra o status na Meta: **Aprovado**, **Em análise** ou **Rejeitado**, com o botão **"Atualizar status"**.
- Se algum não estiver aprovado: "Enquanto este modelo não for aprovado, [lembretes / avisos de cancelamento] não serão enviados."

### Histórico de alterações

**Ainda não construído (issue #88).** Hoje a tela mostra só "Última alteração por [nome] em [data]", que muda ao salvar credenciais e também ao pausar ou reativar as respostas.

Quem alterou o quê e quando. **Os valores do token e do App Secret não são registrados.**

## O que dá para fazer

| Ação | Regra |
|---|---|
| Editar IDs, substituir segredos | **Segue o padrão de salvar** ([regras gerais](00-regras-gerais.md#3-salvar-descartar-e-registrar-quem-alterou)). Salvar credenciais novas exige teste bem-sucedido |
| Testar conexão | Pode ser feito a qualquer momento |
| Atualizar status dos modelos | Consulta a Meta de novo. API pronta (issue #67), **botão na tela com a #127** |
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

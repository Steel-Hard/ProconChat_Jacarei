# WhatsApp

## Para que serve

Conectar o painel ao número institucional na **WhatsApp Cloud API** (oficial da Meta), acompanhar o estado do número e pausar o chatbot em emergências. Permite trocar o número e as credenciais **sem mexer no servidor** ([decisão 003](../decisoes/003-migracao-whatsapp-cloud-api.md)).

## Quem acessa

**Só a conta Admin.**

## O que a tela mostra

### Topo

- Número institucional e a **situação** geral.
- Interruptor **"Pausar respostas automáticas"**.
- Quando pausado, uma faixa no topo: "As respostas automáticas estão pausadas. O chatbot não está respondendo aos cidadãos", com o botão **"Reativar respostas"**.

### Estado do número

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

- **Campos secretos nunca são exibidos depois de salvos.** Aparecem como `••••••••a91F` (só os últimos 4 caracteres), com o botão **"Substituir"**. A tela explica: "Guardado criptografado. Não é possível visualizar o valor salvo."
- No campo do token: **"Use um token permanente de usuário do sistema; o token temporário expira em 24 horas."**

### Configure no painel da Meta

Os valores **gerados pelo sistema** que o Admin cola no painel da Meta, com botão "Copiar":
- **URL do webhook**;
- **token de verificação**.

E o passo a passo:
1. Usar um **token permanente de usuário do sistema** (Gerenciador de Negócios › Usuários do sistema › Gerar token). O token temporário do painel de desenvolvedor expira em 24 horas e o chatbot para de funcionar.
2. No painel de desenvolvedores da Meta, abrir o app e ir em WhatsApp › Configuração.
3. Em Webhook, clicar em Editar e colar a URL e o token de verificação.
4. Clicar em Verificar e salvar e, em Campos do webhook, assinar "messages".
5. Em WhatsApp › Configuração da API, copiar o ID do número e o ID da conta para os campos da tela.

### Testar conexão

- Estados: **testando**, **sucesso** (mostra o número e o nome verificados) e **erro** (com mensagem clara, ex.: "Token inválido ou expirado").
- **Credenciais novas só podem ser salvas depois de um teste bem-sucedido.**

### Modelos de mensagem

Mensagens enviadas fora da conversa precisam de modelo aprovado pela Meta ([decisão 005](../decisoes/005-mensagens-ao-cidadao.md)).

| Modelo | Usado em |
|---|---|
| Lembrete do atendimento | [Horários de atendimento](08-horarios-de-atendimento.md) |
| Aviso de cancelamento | [Detalhe do agendamento](04-detalhe-do-agendamento.md) e cancelamento em massa |

- Cada um mostra o status na Meta: **Aprovado**, **Em análise** ou **Rejeitado**, com o botão **"Atualizar status"**.
- Se algum não estiver aprovado: "Enquanto este modelo não for aprovado, [lembretes / avisos de cancelamento] não serão enviados."

### Histórico de alterações

Quem alterou o quê e quando. **Os valores do token e do App Secret não são registrados.**

## O que dá para fazer

| Ação | Regra |
|---|---|
| Editar IDs, substituir segredos | **Segue o padrão de salvar** ([regras gerais](00-regras-gerais.md#3-salvar-descartar-e-registrar-quem-alterou)). Salvar credenciais novas exige teste bem-sucedido |
| Testar conexão | Pode ser feito a qualquer momento |
| Atualizar status dos modelos | Consulta a Meta |
| **Pausar respostas automáticas** | **Age na hora**, sem passar pelo Salvar, porque é de emergência. Pede confirmação: "O chatbot deixará de responder aos cidadãos até ser reativado" |

**Durante a pausa**, quem escreve para o número recebe esta mensagem fixa, que aparece na tela e no modal de confirmação:

> "O atendimento automático do PROCON Jacareí está temporariamente indisponível. Tente novamente mais tarde."

## O que não existe de propósito

| O que não existe | Por quê |
|---|---|
| QR code, "Reconectar", Evolution API | O sistema usa só a Cloud API oficial ([decisão 003](../decisoes/003-migracao-whatsapp-cloud-api.md)) |
| Ver o valor de um segredo salvo | Segurança: só dá para substituir |
| Acesso para outras contas | Credenciais e pausa afetam o sistema inteiro; ficam só com o Admin |

## Relações

- A **Saúde do chatbot** no [Dashboard](02-dashboard.md) (também só Admin) resume os itens de "Estado do número" e a pausa.
- Durante o desenvolvimento, o sistema usa um número de testes do time. O PROCON troca pelo próprio número por esta tela, seguindo o guia de passagem.

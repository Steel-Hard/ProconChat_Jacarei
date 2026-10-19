# Login, "Minha conta" e menu

## Para que serve

Entrar no painel, trocar a própria senha, sair, e navegar entre as telas.

## Quem acessa

Qualquer conta **ativa**. Uma conta desativada não consegue entrar.

## Estado da tela

**Entregue (issue #84).** O contador de agendamentos pendentes no menu chegou com a tela de Agendamentos (issue #85).

## Login

- Campos: **e-mail** e **senha**.
- Depois de várias tentativas erradas, o acesso fica bloqueado por alguns minutos: "Muitas tentativas sem sucesso. Aguarde alguns minutos e tente de novo."
- Não existe "Esqueci minha senha" nem cadastro público. Ver "O que não existe de propósito".
- Texto de apoio: "Acesso restrito a servidores do PROCON Jacareí. Problemas de acesso devem ser tratados com o administrador do sistema."

## Menu lateral

Agrupado em três seções:

| Seção | Itens |
|---|---|
| Operação | Dashboard, Agendamentos, Relatórios |
| Chatbot | Conteúdo, Sessões |
| Configurações | Horários de atendimento, Documentos, Usuários, WhatsApp |

- **Só aparecem os itens que a conta pode acessar** ([regras gerais](00-regras-gerais.md#2-contas-e-permissões)).
- **Enquanto uma tela não está pronta, o item dela não aparece no menu**, mesmo para quem tem a permissão. Aberta pelo endereço, a tela mostra "Em construção.". Hoje o menu mostra Agendamentos e WhatsApp, conforme a permissão.
- O item **Agendamentos** mostra um contador com a quantidade de **agendamentos pendentes**. Sem pendentes, o contador não aparece.
- **Enquanto o Dashboard não existe (issue #71), a tela inicial do painel abre direto em Agendamentos.**
- **Quem não tem permissão para nenhum bloco do Dashboard** entra direto na primeira tela que pode acessar.

## "Minha conta" (canto superior direito)

Mostra o nome e o e-mail da conta logada (o Admin com o selo **ADMIN**) e abre um menu com:

- **Alterar minha senha:** pede a **senha atual**, a **nova senha** (de 8 a 72 caracteres) e a **confirmação**. A nova senha vale a partir do próximo acesso. Ao trocar, as outras sessões abertas com esta conta são encerradas; a sessão atual continua.
- **Sair.**

## O que não existe de propósito

| O que não existe | Por quê |
|---|---|
| "Esqueci minha senha" | O sistema não envia e-mails. Um funcionário que esquecer a senha pede a alguém com "Gerenciar usuários" para redefini-la ([Usuários](10-usuarios.md)) |
| Recuperação da senha do Admin pelo painel | Ninguém pode redefinir a senha do Admin. Se o Admin esquecer, a **equipe técnica redefine diretamente no servidor** |
| Cadastro de conta pelo próprio funcionário | Contas são criadas por quem tem "Gerenciar usuários" |

## Relações

- Permissões: [decisão 004](../decisoes/004-contas-e-permissoes-granulares.md) e [Usuários](10-usuarios.md).

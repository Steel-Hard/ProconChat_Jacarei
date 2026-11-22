# Login, "Minha conta" e menu

## Para que serve

Entrar no painel, trocar a própria senha, sair, e navegar entre as telas.

## Quem acessa

Qualquer conta **ativa**. Uma conta desativada não consegue entrar.

## Estado da tela

**Entregue (issues #84 e #85).** O menu mostra as sete telas prontas do painel: Agendamentos, Relatórios, Conteúdo, Horários de atendimento, Documentos, Usuários e WhatsApp. As telas de Dashboard e de Sessões foram descartadas ([decisão 013](../decisoes/013-telas-de-sessoes-e-dashboard-descartadas.md)).

## Login

- Campos: **e-mail** e **senha**.
- Depois de várias tentativas erradas, o acesso fica bloqueado por alguns minutos: "Muitas tentativas sem sucesso. Aguarde alguns minutos e tente de novo."
- Não existe "Esqueci minha senha" nem cadastro público. Ver "O que não existe de propósito".
- Texto de apoio: "Acesso restrito a servidores do PROCON Jacareí. Problemas de acesso devem ser tratados com o administrador do sistema."

## Menu lateral

Agrupado em três seções:

| Seção | Itens |
|---|---|
| Operação | Agendamentos, Relatórios |
| Chatbot | Conteúdo |
| Configurações | Horários de atendimento, Documentos, Usuários, WhatsApp |

- **Só aparecem os itens que a conta pode acessar** ([regras gerais](00-regras-gerais.md#2-contas-e-permissões)).
- **O menu mostra cada uma das sete telas prontas conforme a permissão da conta.** As telas de Dashboard e de Sessões foram descartadas e não têm item no menu ([decisão 013](../decisoes/013-telas-de-sessoes-e-dashboard-descartadas.md)). Quem só tem permissões de telas sem item no menu vê o aviso de conta sem tela disponível, descrito abaixo.
- O item **Agendamentos** do menu **não mostra contador** de agendamentos pendentes. Os pendentes são acompanhados dentro da tela de Agendamentos (chip "Pendentes", com contagem).
- **A tela inicial do painel abre na primeira tela que a conta pode acessar e que já está pronta**, na ordem do menu. Hoje isso é Agendamentos para quem pode vê-los.
- **Quem não tem acesso a nenhuma tela pronta** (por exemplo, uma conta recém-criada, que nasce sem permissões, ou uma conta que só tem permissão de telas descartadas) vê o aviso "Sua conta ainda não tem acesso a nenhuma tela", com a orientação de pedir acesso a um administrador do sistema, e o botão **Voltar para o login**, que encerra a sessão. O aviso aparece fora do painel, sem menu, em qualquer endereço. Quem tem ao menos uma tela pronta continua vendo "404 - Not Found" ao abrir um endereço que não existe ou uma tela sem permissão.

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

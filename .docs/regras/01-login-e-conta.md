# Login, "Minha conta" e menu

## Para que serve

Entrar no painel, trocar a própria senha, sair, e navegar entre as telas.

## Quem acessa

Qualquer conta **ativa**. Uma conta desativada não consegue entrar.

## Login

- Campos: **e-mail** e **senha**.
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
- O item **Agendamentos** mostra um contador com a quantidade de **agendamentos pendentes**.
- **Quem não tem permissão para nenhum bloco do Dashboard** entra direto na primeira tela que pode acessar.

## "Minha conta" (canto superior direito)

Mostra o nome e o e-mail da conta logada (o Admin com o selo **ADMIN**) e abre um menu com:

- **Alterar minha senha:** pede a **senha atual**, a **nova senha** (mínimo de 8 caracteres) e a **confirmação**. A nova senha vale a partir do próximo acesso.
- **Sair.**

## O que não existe de propósito

| O que não existe | Por quê |
|---|---|
| "Esqueci minha senha" | O sistema não envia e-mails. Um funcionário que esquecer a senha pede a alguém com "Gerenciar usuários" para redefini-la ([Usuários](10-usuarios.md)) |
| Recuperação da senha do Admin pelo painel | Ninguém pode redefinir a senha do Admin. Se o Admin esquecer, a **equipe técnica redefine diretamente no servidor** |
| Cadastro de conta pelo próprio funcionário | Contas são criadas por quem tem "Gerenciar usuários" |

## Relações

- Permissões: [decisão 004](../decisoes/004-contas-e-permissoes-granulares.md) e [Usuários](10-usuarios.md).

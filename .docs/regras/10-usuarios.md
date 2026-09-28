# Usuários

## Para que serve

Criar as contas da equipe e definir o que cada pessoa pode fazer no painel.

## Quem acessa

**Gerenciar usuários.** A conta Admin sempre acessa.

## O que a tela mostra

**Lista de contas:** iniciais, nome (com o selo **ADMIN** na conta Admin), e-mail, quantas permissões tem ("Todas as permissões" ou "N de 8 permissões"), **último acesso** (ou "Nunca acessou") e o estado (Ativo/Inativo). Contas com alterações ainda não salvas mostram "Não salvo".

**Painel da conta selecionada:**
- nome, e-mail, último acesso e **"Permissões alteradas por [nome] em [data]"**;
- os botões **Redefinir senha** e **Desativar/Reativar conta**, ou **Alterar minha senha** quando for a própria conta;
- a lista das 8 permissões, com a descrição de cada uma ([regras gerais](00-regras-gerais.md#2-contas-e-permissões)).

## O que dá para fazer

### Criar conta

- Campos: **nome**, **e-mail** (validado, e **não pode repetir** um e-mail já cadastrado) e **senha inicial** (mínimo de 8 caracteres).
- **A conta é criada sem nenhuma permissão.**
- A senha inicial deve ser **informada pessoalmente** ao funcionário, porque o sistema não envia e-mails.

### Permissões

- Marcar e desmarcar permissões, uma a uma.
- **"Gerenciar agendamentos" inclui "Ver agendamentos":** marcar a primeira marca a segunda, e desmarcar a segunda desmarca a primeira.
- **Segue o padrão de salvar** ([regras gerais](00-regras-gerais.md#3-salvar-descartar-e-registrar-quem-alterou)).

### Redefinir senha

Define uma nova senha inicial para outra pessoa, que deve ser informada pessoalmente. A senha anterior deixa de funcionar imediatamente.

### Desativar e reativar

Uma conta desativada não consegue entrar. **Não há exclusão**: isso preserva a autoria de observações e do histórico.

## Regras de segurança

Estas regras existem para impedir que alguém aumente o próprio acesso. **São validadas no servidor**, não só escondidas na tela ([decisão 004](../decisoes/004-contas-e-permissoes-granulares.md)).

1. **Ninguém altera a própria conta:** não edita as próprias permissões e não se desativa. Aparece: "Você não pode alterar a própria conta. Peça a outro usuário com a permissão Gerenciar usuários." Para trocar a própria senha, use "Alterar minha senha".
2. **Só se concede ou remove o que você mesmo tem.** As permissões que você não tem aparecem desabilitadas, com o aviso "Você não possui esta permissão". Isso vale também para o efeito em cascata: quem não tem "Gerenciar agendamentos" não pode desmarcar "Ver agendamentos" de quem tem as duas.
3. **Só se redefine a senha ou se ativa/desativa contas cujas permissões você também tem por completo.** Caso contrário, os botões ficam desabilitados com o aviso "Esta conta tem permissões que você não possui". Sem essa regra, alguém poderia redefinir a senha de uma conta mais poderosa e entrar por ela.
4. **A conta Admin:** tem todas as permissões, não pode ser desativada, não pode ter permissões removidas e **não pode ter a senha redefinida por ninguém pelo painel**. Nota na tela: "Se a senha da conta Admin for esquecida, a redefinição é feita pela equipe técnica diretamente no servidor."

## Quando a conta é responsável por agendamentos

Ao **desativar** uma conta, ou ao **tirar dela "Gerenciar agendamentos"**, se ela for responsável por agendamentos Pendentes ou Confirmados **futuros**, abre a janela **"Esta conta é responsável por N agendamentos futuros"** com a lista e duas opções:

- **Voltar para Pendente sem responsável**;
- **Atribuir a outro funcionário**, escolhendo entre as contas ativas com "Gerenciar agendamentos".

A mudança só vale ao salvar, e fica registrada no histórico de cada agendamento.

## O que não existe de propósito

| O que não existe | Por quê |
|---|---|
| Perfis ou cargos | Cada conta tem suas permissões marcadas uma a uma ([decisão 004](../decisoes/004-contas-e-permissoes-granulares.md)) |
| Excluir conta | Preserva a autoria dos registros |
| Convite ou recuperação de senha por e-mail | O sistema não envia e-mails |
| Mais de uma conta Admin | O Admin é único; as outras contas recebem as permissões necessárias |

## Relações

- [Login e conta](01-login-e-conta.md): "Alterar minha senha".
- [Detalhe do agendamento](04-detalhe-do-agendamento.md): quem pode ser responsável.

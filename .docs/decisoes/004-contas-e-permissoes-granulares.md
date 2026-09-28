# 004 — Conta Admin e permissões granulares

- **Status:** Aceita
- **Data:** 26 e 27/09/2026
- **Requisitos:** RF08
- **Substitui:** o requisito interno **RF12** ("perfil único de acesso, sem RBAC"), decidido na Sprint 1

## Contexto

O RF12 previa uma única conta de acesso ao painel. Na revisão do protótipo o grupo concluiu que isso não atende ao PROCON: um estagiário deveria poder ver a agenda sem alterar a configuração de horários, e alguém deveria poder configurar sem usar a conta principal.

## Decisão

1. **Existe uma única conta Admin**, com todas as permissões. Ela não pode ser desativada, nem ter permissões removidas, nem ter a senha redefinida por outra pessoa. Só ela acessa a tela de WhatsApp. Na interface, ela aparece como "Admin".
2. **As demais contas são de funcionários**, com permissões marcadas uma a uma. **Não existem perfis nem cargos.** No banco, isso é uma flag `is_admin` em `Users` mais as tabelas `Permissions` e `UserPermissions`.
3. **As 8 permissões:**

   | Permissão | Libera |
   |---|---|
   | Ver agendamentos | Lista, calendário e detalhe |
   | Gerenciar agendamentos (inclui Ver) | Assumir, atribuir, registrar atendimento, cancelar, observações |
   | Gerenciar conteúdo do chatbot | Categorias e perguntas |
   | Configurar atendimento presencial | Grade, duração, vagas, janela, bloqueios, dados da unidade, lembrete |
   | Configurar documentos para atendimento presencial | Listas de documentos do titular e do representante |
   | Ver sessões | Consulta das conversas, somente leitura |
   | Ver relatórios | Indicadores e exportação |
   | Gerenciar usuários | Criar contas, ativar/desativar, editar permissões |

4. **Regras contra escalada de privilégio**, validadas **no servidor** e não só escondidas na tela:
   - ninguém edita as próprias permissões nem se desativa;
   - só se concede ou remove permissões que você mesmo tem;
   - só se redefine a senha ou se ativa/desativa contas cujas permissões você também tem por completo.
5. **Uma conta nova nasce sem nenhuma permissão.** A senha inicial é informada pessoalmente, porque não há envio de e-mail.
6. **Contas não são excluídas, só desativadas**, para preservar a autoria de observações e do histórico.
7. **Desativar uma conta**, ou tirar dela "Gerenciar agendamentos", quando ela é responsável por agendamentos futuros, obriga a escolher: voltar esses agendamentos para Pendente ou atribuí-los a outro funcionário.
8. **Se o Admin esquecer a senha**, a redefinição é feita pela equipe técnica diretamente no servidor. Esse procedimento precisa ser documentado.

## Consequências

- O `CLAUDE.md` e a documentação que citam o RF12 como perfil único estão desatualizados nesse ponto.
- Toda rota da API precisa checar a permissão correspondente.
- O painel registra "Último acesso" e "Permissões alteradas por … em …".

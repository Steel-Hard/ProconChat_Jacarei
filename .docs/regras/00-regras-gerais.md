# Regras gerais do painel

Regras que valem em todas as telas. As telas específicas não as repetem.

## 1. Quem usa o painel

O painel é usado **só pela equipe do PROCON**. O cidadão nunca acessa o painel; ele fala com o chatbot pelo WhatsApp.

## 2. Contas e permissões

Existem dois tipos de conta ([decisão 004](../decisoes/004-contas-e-permissoes-granulares.md)):

- **Admin:** uma única conta, com todas as permissões. É a única que acessa a tela de WhatsApp. Aparece com o selo **ADMIN**.
- **Funcionário:** cada conta tem as permissões marcadas uma a uma. Não existem "perfis" ou "cargos".

| Permissão | Telas e ações que libera |
|---|---|
| Ver agendamentos | Agendamentos (lista, calendário, busca), Detalhe do agendamento (só leitura), blocos de agenda do Dashboard |
| Gerenciar agendamentos (inclui Ver agendamentos) | Assumir, atribuir, marcar atendido ou não compareceu, corrigir registro, cancelar, escrever observações |
| Gerenciar conteúdo do chatbot | Conteúdo |
| Configurar atendimento presencial | Horários de atendimento |
| Configurar documentos para atendimento presencial | Documentos |
| Ver sessões | Sessões, link da sessão de origem no Detalhe do agendamento |
| Ver relatórios | Relatórios, blocos de indicadores do Dashboard |
| Gerenciar usuários | Usuários |
| *(só Admin)* | WhatsApp, bloco "Saúde do chatbot" do Dashboard |

Regras:

- **Um item de menu, bloco ou botão sem permissão simplesmente não aparece.** Não se mostra algo desabilitado com a mensagem "sem permissão", exceto nos casos citados em cada tela.
- **As permissões são validadas no servidor.** Esconder um botão na tela não basta; a API recusa a ação.

## 3. Salvar, descartar e registrar quem alterou

Todas as **telas de configuração** (Horários de atendimento, Documentos, Usuários e WhatsApp) seguem o mesmo padrão:

1. As alterações ficam **pendentes** até clicar em **"Salvar alterações"**.
2. Enquanto há alterações pendentes, aparece **"N alterações não salvas"**. Passando o mouse, aparece a lista do que mudou.
3. **"Descartar"** desfaz todas as alterações pendentes.
4. O topo da tela mostra **"Última alteração por [nome] em [data]"**.

A única exceção é o interruptor **"Pausar respostas automáticas"**, na tela de WhatsApp, que age na hora porque é de emergência.

Nas telas de operação (Agendamentos, Detalhe, Conteúdo), cada ação é aplicada quando confirmada, e fica registrada no histórico correspondente.

## 4. Nada é excluído

- **Conteúdo** (categorias e perguntas) é **desativado**, não excluído.
- **Contas** são **desativadas**, não excluídas.
- **Observações** dos agendamentos não podem ser editadas nem apagadas.
- **Agendamentos** são cancelados, não apagados.

Isso preserva o histórico, os relatórios e a autoria de cada registro.

## 5. Dados pessoais no painel

Ver [decisão 002](../decisoes/002-lgpd-dados-pessoais.md).

| Dado | Como aparece no painel |
|---|---|
| Nome do titular | Completo |
| CPF | Sempre mascarado: `***.456.789-**`. **O CPF completo nunca aparece**, nem em resultados de busca |
| Telefone do cidadão | **Nunca aparece**, em nenhuma tela |
| Texto que o cidadão digitou no WhatsApp | **Não existe no sistema.** O painel mostra só os passos que o cidadão percorreu |
| Relatórios e exportações | Só números agregados. Sem nome, CPF ou protocolo |

## 6. Mensagens enviadas ao cidadão

Ver [decisão 005](../decisoes/005-mensagens-ao-cidadao.md).

- **Nenhum funcionário escreve texto livre para o cidadão.** Todas as mensagens seguem textos fixos, com campos preenchidos pelo sistema (nome, protocolo, data).
- Sempre que uma ação do painel envia uma mensagem, a tela mostra **a prévia exata** antes de confirmar.
- Se o envio falhar, o histórico do agendamento registra **"Falha ao avisar o cidadão pelo WhatsApp"** em destaque, com a opção **"Tentar novamente"**.

## 7. Aviso de caráter não vinculante

Toda resposta final do chatbot termina com este texto, **que não pode ser alterado nem desligado** (RNF04):

> "Esta é uma orientação automatizada de caráter informativo. Ela não é vinculante e não substitui o atendimento jurídico ou administrativo formal do PROCON Jacareí."

## 8. Identificação do que foi gerado por IA

Todo texto gerado com auxílio de IA aparece com o rótulo **"Gerado com auxílio de IA"**, tanto no WhatsApp quanto nas linhas do tempo do painel (RNF05). Ver [decisão 009](../decisoes/009-complemento-por-llm.md).

## 9. Datas, horários e protocolos

- Datas no formato `dd/mm/aaaa` (ou `dd/mm` em listas); horários em `hh:mm`, fuso de Brasília.
- **Protocolo** de um agendamento: os 8 primeiros caracteres do código do agendamento, em maiúsculas (ex.: `A3F9C21B`).
- **Código da sessão:** no formato `S-XXXXXX`.

## 10. Tooltips

Todo número cuja definição não é óbvia tem um ícone **ⓘ** que explica como ele é calculado. As definições são as mesmas em todas as telas (ver [decisão 010](../decisoes/010-registro-de-interacoes-e-relatorios.md)).

## 11. Protótipo x sistema real

O protótipo tem **"Controles do protótipo"** (trocar de conta, simular falhas). Eles aparecem em faixa tracejada e **não existem no sistema real**. Os dados do protótipo são de exemplo.

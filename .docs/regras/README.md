# Regras das telas do painel

Esta pasta descreve, tela por tela, **o que o painel administrativo do ProconChat mostra, o que cada pessoa pode fazer e por quê**. O texto é escrito para qualquer pessoa entender, sem precisar ler código: desenvolvedores, a equipe do PROCON e quem for avaliar o projeto.

A referência visual é o protótipo navegável aprovado no Claude Design ("ProconChat Painel navegável"). Quando o protótipo e este texto divergirem, **vale este texto**. Quando este texto divergir de um registro em [`../decisoes/`](../decisoes/), **vale a decisão**, e este texto deve ser corrigido.

## Como cada arquivo está organizado

1. **Para que serve**
2. **Quem acessa**
3. **O que a tela mostra**
4. **O que dá para fazer**, com as regras de cada ação
5. **O que não existe de propósito**, e por quê
6. **Relações** com outras telas e decisões

## Índice

| Arquivo | Tela |
|---|---|
| [00-regras-gerais.md](00-regras-gerais.md) | Regras que valem para o painel inteiro: permissões, salvar/descartar, dados pessoais, mensagens ao cidadão |
| [01-login-e-conta.md](01-login-e-conta.md) | Login, "Minha conta" e menu |
| [02-dashboard.md](02-dashboard.md) | Dashboard |
| [03-agendamentos.md](03-agendamentos.md) | Agendamentos: lista, calendário e busca |
| [04-detalhe-do-agendamento.md](04-detalhe-do-agendamento.md) | Detalhe do agendamento |
| [05-relatorios.md](05-relatorios.md) | Relatórios |
| [06-conteudo.md](06-conteudo.md) | Conteúdo do chatbot |
| [07-sessoes.md](07-sessoes.md) | Sessões |
| [08-horarios-de-atendimento.md](08-horarios-de-atendimento.md) | Horários de atendimento |
| [09-documentos.md](09-documentos.md) | Documentos para atendimento presencial |
| [10-usuarios.md](10-usuarios.md) | Usuários |
| [11-whatsapp.md](11-whatsapp.md) | WhatsApp |

O comportamento do **chatbot** (o que o cidadão vê no WhatsApp) está descrito em [`../decisoes/008-fluxo-da-conversa-e-desfechos.md`](../decisoes/008-fluxo-da-conversa-e-desfechos.md) e [`../decisoes/005-mensagens-ao-cidadao.md`](../decisoes/005-mensagens-ao-cidadao.md).

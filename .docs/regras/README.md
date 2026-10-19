# Regras das telas do painel

Esta pasta descreve, tela por tela, **o que o painel administrativo do ProconChat mostra, o que cada pessoa pode fazer e por quê**. O texto é escrito para qualquer pessoa entender, sem precisar ler código: desenvolvedores, a equipe do PROCON e quem for avaliar o projeto.

A referência visual é o protótipo navegável aprovado no Claude Design, copiado para [`../prototipo/`](../prototipo/) (veja lá como abrir). Quando o protótipo e este texto divergirem, **vale este texto**. Quando este texto divergir de um registro em [`../decisoes/`](../decisoes/), **vale a decisão**, e este texto deve ser corrigido.

## Como cada arquivo está organizado

1. **Para que serve**
2. **Quem acessa**
3. **O que a tela mostra**
4. **O que dá para fazer**, com as regras de cada ação
5. **O que não existe de propósito**, e por quê
6. **Relações** com outras telas e decisões

## Índice

| Arquivo | Tela | Estado |
|---|---|---|
| [00-regras-gerais.md](00-regras-gerais.md) | Regras que valem para o painel inteiro: permissões, salvar/descartar, dados pessoais, mensagens ao cidadão | — |
| [01-login-e-conta.md](01-login-e-conta.md) | Login, "Minha conta" e menu | Entregue (#84) |
| [02-dashboard.md](02-dashboard.md) | Dashboard | Pendente (#71) |
| [03-agendamentos.md](03-agendamentos.md) | Agendamentos: lista, calendário e busca | Entregue (#85). Calendário semanal: #87 |
| [04-detalhe-do-agendamento.md](04-detalhe-do-agendamento.md) | Detalhe do agendamento | Entregue (#86). Atribuir, observações internas e corrigir registro: #87. Cancelar com aviso ao cidadão: #67 |
| [05-relatorios.md](05-relatorios.md) | Relatórios | Pendente (#68, #73) |
| [06-conteudo.md](06-conteudo.md) | Conteúdo do chatbot | Pendente (#63) |
| [07-sessoes.md](07-sessoes.md) | Sessões | Pendente (#72, #76) |
| [08-horarios-de-atendimento.md](08-horarios-de-atendimento.md) | Horários de atendimento | Pendente (#64, #74, #75, #77) |
| [09-documentos.md](09-documentos.md) | Documentos para atendimento presencial | Pendente (#65) |
| [10-usuarios.md](10-usuarios.md) | Usuários | Pendente (#62) |
| [11-whatsapp.md](11-whatsapp.md) | WhatsApp | Entregue em parte (#54). Estado do número e histórico de alterações: #88. Modelos de mensagem: #67 |

Enquanto uma tela está pendente, o item dela não aparece no menu e o endereço da tela mostra "Em construção.". A exceção é o Dashboard: enquanto ele não existe, a tela inicial abre direto em Agendamentos. Cada arquivo de tela pendente descreve como a tela **vai** funcionar.

O comportamento do **chatbot** (o que o cidadão vê no WhatsApp) está descrito em [`../decisoes/008-fluxo-da-conversa-e-desfechos.md`](../decisoes/008-fluxo-da-conversa-e-desfechos.md) e [`../decisoes/005-mensagens-ao-cidadao.md`](../decisoes/005-mensagens-ao-cidadao.md).

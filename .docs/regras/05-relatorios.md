# Relatórios

## Para que serve

Analisar o uso do chatbot e dos agendamentos: quais assuntos mais aparecem, onde as pessoas desistem e como os atendimentos terminam (RF06). Serve também para prestar contas.

## Quem acessa

**Ver relatórios.**

## Período

Chips: **Últimos 7 dias**, **Últimos 30 dias**, **Últimos 90 dias**, **Mês atual**, **Mês anterior** e **Personalizado** (data inicial e final, até hoje). O período vale para todas as seções da tela.

## Seções

### Conversas no período

Total de conversas iniciadas no WhatsApp, a média por dia e a quantidade de agendamentos criados.

### Desfecho das conversas

Cada conversa tem **exatamente um desfecho**, e todos somam 100%. Ver [decisão 008](../decisoes/008-fluxo-da-conversa-e-desfechos.md).

| Desfecho | Quando |
|---|---|
| Resolvida sem agendamento | O cidadão respondeu que a dúvida foi resolvida |
| Terminou em agendamento | Um agendamento foi criado |
| Fora do escopo do PROCON | Recebeu a orientação para procurar outro órgão |
| Sem horário disponível na janela | Quis agendar, mas não havia horário livre. **Em destaque vermelho**, com link para Horários de atendimento |
| Não quis agendar | Recebeu a oferta de agendamento e recusou |
| Remarcou ou cancelou agendamento existente | Voltou ao chatbot só para isso |
| Abandonada | 30 minutos sem interação antes de um desfecho |
| Em andamento | Ainda não terminou (só aparece se houver) |

### Conversas e agendamentos por dia

Barras por dia (**por semana** no período de 90 dias), com o total de conversas e a parte que virou agendamento.

### Categorias mais usadas e perguntas mais usadas

Contam **conversas distintas** que escolheram o item. Escolher o mesmo item de novo na mesma conversa conta uma vez.

### Perguntas que mais não resolveram

Lista completa, com categoria e quantidade de cidadãos que responderam que **não** resolveu. Link **"Revisar em Conteúdo"** para quem gerencia o conteúdo.

### Em qual etapa as pessoas abandonam a conversa

Quantidade e percentual das conversas abandonadas, por etapa em que o cidadão parou:

1. Na lista de categorias
2. Na lista de perguntas
3. Aguardando a resposta. O tooltip explica que abandonos aqui costumam indicar **resposta demorada**
4. Na pergunta "A dúvida foi resolvida?"
5. Em quem vai comparecer
6. Na escolha do horário

### Resultado dos agendamentos

**Considera os agendamentos cuja data do atendimento está no período**, independentemente de quando foram criados.

- Linhas: Atendido, Não compareceu, Cancelado, **Aguardando registro** (horário já passou sem registro) e **Pendente ou Confirmado (ainda futuro)**. No rodapé, "Total com atendimento no período".
- **Taxa de não comparecimento** em destaque: Não compareceu ÷ (Atendido + Não compareceu). Cancelados, aguardando registro e futuros não entram na conta.
- **Cancelamentos por origem:** cidadão no chatbot × equipe no painel.
- **Motivo dos cancelamentos pela equipe:** Unidade fechada, A pedido do cidadão, Duplicado, Outro.

### Horário de pico

Mapa de calor das conversas iniciadas por **dia da semana** e **faixa de horário**.

## Exportar

Botão **"Exportar ▾"** com três formatos, todos do período selecionado e com **todas as seções**:

| Formato | Conteúdo |
|---|---|
| **PDF** | Relatório para apresentação: cabeçalho "PROCON Jacareí · Relatório do ProconChat", período, data e hora de geração, nome de quem gerou, gráficos e tabelas na ordem da tela, páginas numeradas |
| **Excel (.xlsx)** | Uma aba por seção, cabeçalhos em negrito, números como números |
| **CSV (.zip)** | Um CSV por seção, separador `;`, UTF-8 com BOM (abre corretamente no Excel em português) |

Antes de gerar, a tela mostra o que será gerado (ex.: "PDF com 9 seções · período 01/09 a 30/09") e depois o estado "Gerando…".

**Todos os formatos contêm apenas dados agregados, sem nome, CPF, protocolo ou qualquer informação pessoal.** A tela diz isso ao lado do botão.

## O que não existe de propósito

| O que não existe | Por quê |
|---|---|
| Lista de conversas ou agendamentos individuais | Relatório é agregado. Casos individuais ficam em [Sessões](07-sessoes.md) e [Agendamentos](03-agendamentos.md) |
| Dados pessoais na exportação | LGPD ([decisão 002](../decisoes/002-lgpd-dados-pessoais.md)) |

## Relações

- Definições dos indicadores: [decisão 010](../decisoes/010-registro-de-interacoes-e-relatorios.md). O [Dashboard](02-dashboard.md) usa as mesmas.
- Os nomes das etapas de abandono são os mesmos da tela de [Sessões](07-sessoes.md).

# Documentação do ProconChat Jacareí

Chatbot de orientação ao consumidor via WhatsApp, desenvolvido para o PROCON de Jacareí-SP no ABP do 6º DSM da Fatec Jacareí (2026-2).

## Por onde começar

1. [`desafio/desafio-6dsm-2026-2.md`](desafio/desafio-6dsm-2026-2.md): o que o PROCON e a Fatec pediram (RF, RNF e RP).
2. [`desafio/rastreabilidade.md`](desafio/rastreabilidade.md): como cada requisito é atendido hoje, o que falta e os riscos.
3. [`decisoes/`](decisoes/): as decisões de produto e arquitetura, com o porquê de cada uma. **Quando uma decisão contradiz outro documento, vale a decisão.**
4. [`regras/`](regras/): como cada tela do painel funciona, escrito para qualquer pessoa entender.

## Pastas

| Pasta | Conteúdo | Estado |
|---|---|---|
| [`desafio/`](desafio/) | Documento oficial do desafio e rastreabilidade dos requisitos | Atual |
| [`decisoes/`](decisoes/) | Registros de decisão, um por arquivo | Atual |
| [`regras/`](regras/) | Regras de cada tela do painel: o que mostra, quem acessa, o que dá para fazer e o que não existe de propósito. O índice diz quais telas já foram entregues | Atual |
| [`prototipo/`](prototipo/) | Protótipo navegável do painel, aprovado no Claude Design (referência visual) | Atual |
| [`architecture/`](architecture/) | Arquitetura: componentes, módulos do backend, fluxos, infraestrutura e segurança (estado atual e alvo da entrega) | Atual |
| [`infra/`](infra/) | Ambiente de produção: VM, deploy contínuo, rollback, backup e diagnóstico | Atual |
| [`database/`](database/) | Modelo de dados (schema atual e planejado), migrations e o FAQ real do PROCON (`Dúvidas Frequentes.odt`) | Atual |
| [`llm/`](llm/) | Contrato e escolha do modelo do serviço de LLM | Atual |
| [`whatsapp/`](whatsapp/) | Pesquisa de integração com o WhatsApp (issue #3), [guia do app de teste da Meta](whatsapp/app-de-teste.md) para desenvolvimento e [guia dos modelos de mensagem](whatsapp/modelos-de-mensagem.md) (aviso de cancelamento e lembrete) | Atual como pesquisa; a decisão final está em [003](decisoes/003-migracao-whatsapp-cloud-api.md) |
| [`lgpd/`](lgpd/) | [Procedimento para pedidos do titular](lgpd/pedidos-do-titular.md) (acesso e exclusão por anonimização) | Atual |
| [`sprints/`](sprints/) | Fechamento da Sprint 1 e acompanhamento da Sprint 2 (retrato de 19/10/2026, último dia da sprint) | Atual |
| [`historico/`](historico/) | Documentos superados, mantidos só para contexto | Não usar como referência |
| `.tasks/` | Pasta local, fora do Git, com as specs e tasks do fluxo de planejamento (`sdd` → `executor` → `reviewer`) | Local, não versionada |

## Regras que valem em todo o sistema

- **O LLM nunca decide o fluxo.** Ele só reescreve a explicação da resposta oficial, numa mensagem única com o bloco oficial, o aviso e os botões; quando a IA não pode ser usada, a resposta oficial sai inteira (RF05, RP05, [009](decisoes/009-complemento-por-llm.md)).
- **Toda resposta final avisa que a orientação não é vinculante** (RNF04), com um texto único:
  > "Esta é uma orientação automatizada de caráter informativo. Ela não é vinculante e não substitui o atendimento jurídico ou administrativo formal do PROCON Jacareí."
- **Todo texto gerado por IA é identificado** como "Gerado com auxílio de IA" (RNF05).
- **O telefone nunca é guardado em texto puro, e o texto digitado pelo cidadão nunca é guardado** (RNF03). O telefone criptografado do agendamento é apagado quando chega o horário do atendimento. A política de privacidade é a página pública `/privacidade` do painel. Ver [002](decisoes/002-lgpd-dados-pessoais.md) e [pedidos do titular](lgpd/pedidos-do-titular.md).
- **Nenhuma API externa de LLM** (RP05).

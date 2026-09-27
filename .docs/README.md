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
| [`regras/`](regras/) | Regras de cada tela do painel: o que mostra, quem acessa, o que dá para fazer e o que não existe de propósito | Atual |
| [`architecture/`](architecture/) | Arquitetura (componentes, relações, fluxo) | ⚠️ Parcialmente superada por [003](decisoes/003-migracao-whatsapp-cloud-api.md) e [004](decisoes/004-contas-e-permissoes-granulares.md) |
| [`database/`](database/) | Modelo de dados, migrations e o FAQ real do PROCON (`Dúvidas Frequentes.odt`) | ⚠️ Não inclui as tabelas novas decididas na Sprint 2 |
| [`llm/`](llm/) | Contrato e escolha do modelo do serviço de LLM | Atual |
| [`whatsapp/`](whatsapp/) | Pesquisa de integração com o WhatsApp (issue #3) | Atual como pesquisa; a decisão final está em [003](decisoes/003-migracao-whatsapp-cloud-api.md) |
| [`sprints/`](sprints/) | Documentos de fechamento de cada sprint | Atual |
| [`historico/`](historico/) | Documentos superados, mantidos só para contexto | Não usar como referência |
| [`.tasks/`](.tasks/) | Specs e tasks do fluxo de planejamento (`sdd` → `executor` → `reviewer`) | Atual |

## Regras que valem em todo o sistema

- **O LLM nunca decide o fluxo.** Ele só escreve um texto complementar à resposta oficial (RF05, RP05).
- **Toda resposta final avisa que a orientação não é vinculante** (RNF04), com um texto único:
  > "Esta é uma orientação automatizada de caráter informativo. Ela não é vinculante e não substitui o atendimento jurídico ou administrativo formal do PROCON Jacareí."
- **Todo texto gerado por IA é identificado** como "Gerado com auxílio de IA" (RNF05).
- **O telefone nunca é guardado em texto puro, e o texto digitado pelo cidadão nunca é guardado** (RNF03). Ver [002](decisoes/002-lgpd-dados-pessoais.md).
- **Nenhuma API externa de LLM** (RP05).

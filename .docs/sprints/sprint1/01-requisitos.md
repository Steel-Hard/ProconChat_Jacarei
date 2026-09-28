# Sprint 1 · Situação dos requisitos

> Parte do [fechamento da Sprint 1](README.md). Situação de cada RF, RNF e RP em 14/09/2026. Para a situação atual, ver [`../../desafio/rastreabilidade.md`](../../desafio/rastreabilidade.md).

## 3. Requisitos-chave do desafio

### 3.1 Requisitos Funcionais (RF)

| ID | Descrição | Situação ao fim da Sprint 1 |
|---|---|---|
| RF01 | Interação do usuário pelo WhatsApp, com chatbot como interface principal | ✅ Funcionando — validado com número real pareado via QR code |
| RF02 | Apresentar opções de resposta com base na tabela de decisões do PROCON, conduzindo a conversa de forma guiada | ✅ Funcionando — navegação por 7 categorias |
| RF03 | Navegação por fluxos decisórios, com perguntas e alternativas sequenciais | ✅ Funcionando — máquina de estados `AWAITING_CATEGORY` → `AWAITING_QUESTION` → `FINISHED` |
| RF04 | Resposta orientadora final, resumindo o caso e indicando próximos passos | ✅ Funcionando — resposta com categoria, pergunta, base legal, resposta e documentos |
| RF05 | Resposta final **poderá** ser complementada por LLM, exclusivamente para geração textual explicativa | ⚠️ Parcial — serviço implementado e testado, ainda sem chamador no fluxo de conversa |
| RF06 | Registrar interações, permitindo análise posterior dos fluxos mais usados | ❌ Não implementado — tabela `Interactions` existe, mas nada grava nela (issue #16 aberta) |
| RF07 *(adição)* | Quando a resposta não solucionar a dúvida, realizar agendamento presencial | ❌ Não implementado — tabela `Appointments` existe; o Scheduler não foi construído |
| RF08 *(adição)* | Interface web para gerenciamento dos atendimentos agendados | ❌ Não implementado — apenas o Figma foi planejado (issue #19 aberta) |

> Observação: o grupo também trabalha com requisitos internos numerados acima de RF08 (RF09-RF14), que não constam do documento oficial do desafio. Os mais citados nas decisões técnicas são: **RF11** (desativar conteúdo sem excluir, via coluna `active`), **RF12** (perfil único de acesso ao admin, sem RBAC — decisão explícita do grupo) e **RF14** (histórico local estruturado, coberto na prática pela tabela `Interactions`).

### 3.2 Requisitos Não Funcionais (RNF)

| ID | Descrição | Situação ao fim da Sprint 1 |
|---|---|---|
| RNF01 | Usabilidade crítica: linguagem clara, objetiva e acessível | ⚠️ Parcial — mensagens escritas em linguagem simples; sem teste de usabilidade formal |
| RNF02 | Alta disponibilidade e tempo de resposta adequado para conversas em tempo real | ⚠️ Risco conhecido — o LLM em CPU levou ~32s por resposta no teste (ver seção 6.4) |
| RNF03 | Conformidade com a LGPD | ✅ Endereçado — telefone nunca persistido em texto puro (`phone_hash`); logs sem texto de mensagem nem telefone completo. Política de retenção ainda não formalizada |
| RNF04 | Deixar explícito o caráter orientativo, que não substitui o atendimento formal | ✅ **Implementado nesta sessão** — toda resposta final termina com aviso padronizado |
| RNF05 | Identificar de forma clara quais respostas são geradas com auxílio de LLM | ⏸️ Pendente por dependência — nenhum texto entregue hoje vem de LLM, logo não há o que rotular. O ponto de extensão no código já está preparado |
| RNF06 *(adição)* | O sistema deve rodar em Docker | ✅ Atendido — `compose.yaml` único na raiz, validado subindo do zero |
| RNF07 | Documentação de instalação e especificação de hardware/software | ✅ Atendido — `README.md` da raiz + `.docs/llm/modelo.md` (requisitos de RAM/VRAM do modelo) |
| RNF08 | Práticas modernas: ágil, CI/CD, versionamento, testes, documentação técnica | ⚠️ Parcial — versionamento com convenções formais, testes automatizados e documentação existem; **CI/CD não existe** |

> Pendência registrada internamente: **RNF09** (política de retenção/anonimização de dados pessoais) ainda não foi formalizada no documento oficial do desafio.

### 3.3 Restrições de Projeto (RP)

| ID | Descrição | Como o projeto atende |
|---|---|---|
| RP01 | Integração com WhatsApp preferencialmente via Cloud API oficial; alternativas gratuitas/simuladas são aceitas para fins acadêmicos, desde que preservem o modelo conceitual | Adotada a **Evolution API** (self-hosted, automação do WhatsApp Web). Pesquisa comparativa documentada em `.docs/whatsapp/pesquisa.md`, que **recomenda revisitar a Cloud API oficial antes de qualquer entrega em produção** |
| RP02 | Back-end em tecnologia web moderna (Node.js ou Python) | Node.js + TypeScript |
| RP03 | Estrutura modular, separando lógica do chatbot, gestão dos fluxos decisórios e integração com LLM | Gateway, Backend (com Motor de Decisão como módulo interno) e LLM Service separados |
| RP04 | Escopo compatível com o tempo do semestre | Sprint 1 fechou o fluxo mínimo; RF07/RF08 empurrados para as próximas sprints |
| RP05 *(adição)* | **Proibido usar APIs externas de LLM**, mesmo gratuitas (custo + LGPD) | LLM 100% local via Ollama, em container próprio. Nenhuma chamada a API externa de LLM |

### 3.4 As três regras que o projeto trata como invioláveis

1. **RP05 / RF05** — o LLM gera **apenas texto explicativo complementar**; quem decide o fluxo é sempre o Motor de Decisão, lendo categorias e perguntas do banco. Nenhuma API externa de LLM, mesmo gratuita.
2. **RNF04 / RNF05** — toda resposta final deve explicitar o caráter não vinculante e identificar claramente o que foi gerado com auxílio de LLM.
3. **RNF03** — o telefone do cidadão nunca é armazenado em texto puro.

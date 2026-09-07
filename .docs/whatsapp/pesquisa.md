# Pesquisa: integração com o WhatsApp (RP01) — issue #3

> **Escopo ajustado em relação ao texto original da issue #3:** o documento originalmente pedido
> era uma pesquisa comparativa feita *antes* de qualquer implementação, pra guiar a escolha. Na
> prática, a decisão já foi tomada de forma pragmática pela equipe (Vitor Francisco e Lucas
> Roque) e já existe uma implementação funcional em cima dela (issue #4, PR #29 — Evolution API).
> Este documento formaliza essa pesquisa retroativamente: registra as opções que foram
> efetivamente investigadas, por que a Evolution API foi escolhida, e — o que não estava
> documentado até agora — os riscos dessa escolha que a equipe deve estar ciente antes da entrega
> final.

## Opções investigadas

A equipe investigou duas categorias de integração com o WhatsApp, resumidas na pesquisa original
(imagem abaixo, levantada por Vitor Francisco e Lucas Roque):

![Comparação entre Meta for Developers e emuladores/APIs não oficiais](./images/gateway.png)

### 1. WhatsApp Cloud API oficial (Meta for Developers)

- **Cadastro:** feito via Meta for Developers, criando um app associado a um WhatsApp Business
  Account. A Meta fornece um **número de teste virtual próprio, gratuito**, ao criar a aplicação —
  não é necessário usar um número real nessa etapa.
- **Destinatários de teste:** até 5 números de telefone reais podem ser cadastrados para
  receberem mensagens do número de teste.
- **Custo e limites:** mensagens não são "ilimitadas", mas a Meta aplica um limite de
  requisições por segundo (rate limit) e uma cota diária gratuita de mensagens — suficiente para
  testar o fluxo do chatbot e chamadas de API sem custo, segundo a pesquisa.
- **Webhook de recebimento:** segue o padrão da API oficial — verificação inicial via `GET` com
  `hub.challenge` (handshake exigido pela Meta ao configurar a URL do webhook) e assinatura
  HMAC no header de cada payload subsequente, para garantir que a requisição veio da Meta.
- **Mensagens interativas:** suporta nativamente listas e botões interativos — compatível com o
  fluxo guiado por categoria/pergunta do Motor de Decisão (#13).
- **Por que não foi adotada:** a equipe tentou o cadastro no programa de Desenvolvedores da Meta e
  encontrou o bloqueio de que **números já inscritos no WhatsApp não são aceitos** para a
  inscrição.
  - **Nota importante para revisão futura:** conforme a própria pesquisa da equipe registra (ver
    imagem acima), a Meta oferece um número de teste **virtual e gratuito** exatamente para evitar
    esse problema — o bloqueio relatado provavelmente veio de tentar cadastrar um número pessoal
    já ativo no WhatsApp, em vez de usar esse número de teste virtual fornecido pela própria Meta.
    Essa rota não parece ter sido esgotada e vale ser revisitada antes da entrega final (ver
    "Recomendação" abaixo).

### 2. Simulador acadêmico (mock local)

- Não foi encontrada nenhuma biblioteca ou ferramenta pronta que imite fielmente o formato de
  mensagens do WhatsApp Business API para testes locais.
- Construir um simulador do zero (ex.: uma página web de chat que apenas imita o payload) seria
  necessário, com esforço de setup alto por não haver nada pronto — mas com controle total sobre o
  comportamento, custo zero, e zero risco de qualquer penalidade (não usa uma conta real do
  WhatsApp).
- Essa opção não chegou a ser prototipada; foi descartada em favor de uma integração mais
  próxima do comportamento real (ver opção 3).

### 3. Evolution API (opção adotada — não estava no enquadramento original da #3)

A issue #3 originalmente enquadrava a decisão como "oficial vs. simulador acadêmico" (RP01). A
opção efetivamente escolhida pela equipe é uma terceira via, que não é nenhuma das duas: a
**Evolution API**, uma camada open-source que automatiza o **WhatsApp Web** (mesmo princípio de
bibliotecas como Baileys), expondo uma API REST e webhooks num formato inspirado no WhatsApp
Business API.

- **Cadastro:** não depende de aprovação da Meta. A instância da Evolution API é conectada a um
  número de telefone real (chip físico ou e-SIM) escaneando um QR Code, exatamente como conectar o
  WhatsApp Web num navegador.
- **Custo:** self-hosted via Docker (imagem `evoapicloud/evolution-api`), sem custo de licença.
  O único custo recorrente é manter uma linha telefônica ativa para o número conectado.
- **Limites:** a ferramenta em si não impõe limite de mensagens. Porém, como não é uma API
  aprovada pela Meta, o número está sujeito às regras de uso do WhatsApp para contas comuns — sem
  as garantias de um canal comercial oficial.
- **Webhook de recebimento:** evento `messages.upsert` (entre outros), com payload documentado
  pela própria Evolution API — sem handshake de verificação prévio (diferente da Meta). Já
  implementado, testado (unitário + integração) e validado rodando via Docker no PR #29 — ver
  `.docs/.tasks/features/extrair-gateway-whatsapp/` para o plano de extração desse código para uma
  aplicação própria (`src/gateway/`).
- **Mensagens interativas:** suporte a listas/botões via WhatsApp Web tende a ser parcial e
  instável, dependendo da versão do protocolo suportado — diferente da API oficial, que suporta
  nativamente. **Isso não foi validado ainda** e é relevante para o fluxo guiado do Motor de
  Decisão (#13); recomenda-se um teste específico antes de depender disso no MVP.

## Comparativo resumido

| Critério | Cloud API oficial (Meta) | Simulador acadêmico | Evolution API (adotada) |
| --- | --- | --- | --- |
| Aprovação/cadastro | Meta Business + app | Nenhuma (não usa WhatsApp real) | Nenhuma (QR Code) |
| Custo | Gratuito no tier de teste | Zero | Gratuito (self-hosted), custo de manter linha |
| Risco de banimento | Nenhum (canal oficial) | Nenhum | **Real** — automação não oficial do WhatsApp Web |
| Esforço de setup | Médio (cadastro Meta) | Alto (nada pronto, construir do zero) | Baixo (Docker + QR Code) — já feito |
| Webhook | `GET` de verificação + HMAC | A definir | `messages.upsert`, sem handshake |
| Mensagens interativas (listas/botões) | Suporte nativo | A definir | Parcial/instável, não validado |
| Estado atual | Não implementado | Não implementado | **Implementado e testado** (PR #29) |

## Recomendação

**Curto prazo (Sprint 1 / MVP acadêmico):** manter a Evolution API. Já está implementada,
testada (unitário + integração + validação manual via Docker) e reduz o risco de atraso do
cronograma do semestre (RP04) — trocar de tecnologia agora custaria mais tempo do que o risco que
ela introduz para um ambiente de desenvolvimento/demonstração acadêmica.

**Antes de qualquer entrega com uso real por cidadãos do PROCON**, esta decisão precisa ser
reaberta: usar a Evolution API significa depender de uma automação não autorizada oficialmente
pelo WhatsApp, o que:

- viola os Termos de Serviço do WhatsApp (uso de automação/bot não aprovado);
- carrega risco real de banimento do número conectado, sem aviso prévio da Meta;
- é adequado para desenvolvimento e demonstração acadêmica, mas não deveria sustentar uma entrega
  em produção para o PROCON sem uma reavaliação explícita da equipe e do parceiro.

Recomenda-se, antes da entrega final, revisitar o cadastro na Meta for Developers usando o
**número de teste virtual gratuito** (não um número pessoal já ativo, que foi a causa provável do
bloqueio original) para validar se essa rota realmente está fechada ou se foi um erro de
tentativa.

## Referências

- [Documentação da Evolution API — instalação via Docker](https://docs.evolutionfoundation.com.br/evolution-api/install/docker)
- [`.docs/desafio-6dsm-2026-2.md`](../desafio-6dsm-2026-2.md) — RP01
- [`.docs/.tasks/features/extrair-gateway-whatsapp/`](../.tasks/features/extrair-gateway-whatsapp/) — plano de extração do Gateway para app própria (issue #4)
- Issue [#3](https://github.com/Steel-Hard/ProconChat_Jacarei/issues/3) (comentário original de Vitor Francisco) e PR [#29](https://github.com/Steel-Hard/ProconChat_Jacarei/pull/29) (implementação, Lucas Roque)

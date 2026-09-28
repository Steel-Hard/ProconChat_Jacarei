# Desafio 6DSM — 2026-2

> Transcrição do documento oficial `Desafio 6DSM - 2026-2.pdf`, enviado pela Fatec Jacareí/PROCON.
> Versão do documento: 06/02/2026.
> Trechos que aparecem em vermelho no PDF original (adições feitas após a emissão inicial do
> documento) estão marcados abaixo com **(adição)**.

| | |
|---|---|
| **Parceiro** | PROCON – Fundação de Proteção e Defesa do Consumidor de Jacareí-SP |
| **Contato** | Renan de Oliveira Corrêa (Diretor de Assuntos da Cidadania) |
| **Período/Curso** | 6º DSM |
| **Focal point** | Prof. Marcelo Augusto Sudo |
| **Kick off** | 09/08/2026 às 19h30 |

## Tema do Semestre

Chatbot para Orientação ao Consumidor via WhatsApp

## Desafio (problema)

O PROCON de Jacareí-SP atua diariamente no atendimento a consumidores que buscam orientação
sobre seus direitos, procedimentos de reclamação, prazos, documentos necessários e encaminhamentos
adequados para diferentes tipos de conflitos de consumo. Grande parte dessas demandas é recorrente
e segue fluxos decisórios definidos com base em normas legais e diretrizes institucionais.

Atualmente, o atendimento humano é frequentemente sobrecarregado por perguntas repetitivas e por
usuários que não sabem exatamente qual procedimento seguir, o que impacta negativamente o tempo
de resposta e a eficiência do serviço prestado à população.

O desafio proposto consiste no desenvolvimento de um sistema cujo principal ponto de interação com
o usuário será um chatbot integrado ao WhatsApp, com o objetivo de tirar dúvidas do cidadão e
fornecer orientações iniciais, sem a necessidade de deslocamento presencial até a unidade do PROCON.

O chatbot deverá guiar o usuário de forma estruturada e intuitiva, com base nos fluxos decisórios
fornecidos pelo PROCON, organizados em uma tabela de decisões contendo opções, perguntas e
encaminhamentos. Essas informações servirão como base para a navegação do usuário ao longo da
conversa.

Ao final do fluxo, o sistema deverá apresentar uma resposta orientadora consolidada, indicando os
próximos passos recomendados ao consumidor. Essa resposta poderá ser complementada por um
modelo de linguagem (LLM), exclusivamente para a geração textual explicativa, com o objetivo de
oferecer uma explicação clara, acessível e alinhada às diretrizes do PROCON, sem caráter jurídico
vinculante.

A solução proposta não substitui o atendimento formal do PROCON, atuando como um canal inicial de
orientação e esclarecimento de dúvidas. Dessa forma, busca-se ampliar o acesso à informação, reduzir
a demanda por atendimentos presenciais e otimizar o tempo tanto do cidadão quanto da equipe do
PROCON, contribuindo para a melhoria da eficiência do serviço público e da experiência do usuário.
**(adição)** Caso a resposta não atenda plenamente às dúvidas do cidadão, o chatbot deverá realizar um
agendamento presencial, orientando-o sobre possíveis documentações que auxiliarão a consulta.

## Requisitos

### Requisitos Funcionais

- **RF01:** O sistema deve permitir a interação do usuário por meio do aplicativo WhatsApp, utilizando um chatbot como interface principal.
- **RF02:** O chatbot deve apresentar opções de resposta ao usuário com base em uma tabela de decisões fornecida pelo PROCON, conduzindo a conversa de forma guiada.
- **RF03:** O sistema deve permitir a navegação por fluxos decisórios, apresentando perguntas e alternativas de forma sequencial e compreensível.
- **RF04:** Ao final do fluxo, o sistema deve gerar uma resposta orientadora, resumindo o caso do usuário e indicando os próximos passos recomendados.
- **RF05:** A resposta final poderá ser complementada por um modelo de linguagem (LLM), exclusivamente para a geração textual explicativa, respeitando as informações, limites e fluxos definidos pelo PROCON.
- **RF06:** O sistema deve registrar as interações realizadas, permitindo a análise posterior dos fluxos mais utilizados.
- **RF07 (adição):** Quando a resposta não solucionar a dúvida do cidadão, o chatbot deverá realizar um agendamento para atendimento presencial.
- **RF08 (adição):** Além do chatbot, deverá haver uma interface web para gerenciamento dos atendimentos agendados.

### Requisitos Não Funcionais

- **RNF01:** A usabilidade será um requisito crítico, exigindo linguagem clara, objetiva e acessível ao público em geral.
- **RNF02:** O sistema deve apresentar alta disponibilidade e tempo de resposta adequado para conversas em tempo real.
- **RNF03:** A solução deve respeitar a Lei Geral de Proteção de Dados (LGPD), garantindo o tratamento adequado das informações dos usuários.
- **RNF04:** O chatbot deve deixar explícito que as respostas possuem caráter orientativo, não substituindo o atendimento jurídico ou administrativo formal.
- **RNF05:** O chatbot deve identificar de forma clara e transparente quais respostas são geradas com o auxílio de modelos de linguagem (LLM).
- **RNF06 (adição):** O sistema deve rodar em Docker.
- **RNF07:** Deverá haver documentações explicativas sobre como instalar a aplicação, assim como uma especificação de necessidades de hardware e software.
- **RNF08:** O projeto deverá adotar práticas modernas de desenvolvimento de software, incluindo metodologias ágeis, integração e entrega contínua (CI/CD), versionamento de código, testes de software e documentação técnica mínima.

### Restrições de Projeto

- **RP01:** A integração com o WhatsApp deverá ser realizada preferencialmente por meio da WhatsApp Business Platform (Cloud API). Para fins acadêmicos e de desenvolvimento, poderão ser utilizadas alternativas gratuitas, ambientes de testes ou soluções simuladas que reproduzam o fluxo de comunicação do WhatsApp (envio e recebimento de mensagens, identificação do usuário e controle de sessões), desde que preservem o modelo conceitual da integração.
- **RP02:** O back-end deverá ser desenvolvido utilizando tecnologias compatíveis com aplicações web modernas (ex.: Node.js ou Python).
- **RP03:** O sistema deverá ser estruturado de forma modular, separando a lógica do chatbot, a gestão dos fluxos decisórios e a integração com modelos de linguagem.
- **RP04:** O escopo do projeto deverá ser compatível com o tempo disponível para desenvolvimento ao longo do semestre.
- **RP05 (adição):** Não deverão ser utilizadas APIs externas de LLM, mesmo que gratuitas, devido à restrição de custos e também para proteção das informações de acordo com a LGPD.

## Cronograma

| Etapa | Início | Fim |
|---|---|---|
| Kick off | 10/08/26 | — |
| Sprint 1 | 10/08/26 | 14/09/26 |
| Sprint 2 | 15/09/26 | 19/10/26 |
| Sprint 3 | 20/10/26 | — |
| Review Meeting | — | 23/11/26 |

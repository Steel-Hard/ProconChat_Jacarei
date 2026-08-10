# Desafio 6DSM - 2026-2(1)

# Chatbot para Orientação ao Consumidor via WhatsApp

<div align="center">
<h1>
<a href="#descrição">Descrição</a> || 
<a href="#tecnologias">Tecnologias</a> || 
<a href="#dev-team">Dev Team</a> || 
<a href="#product-backlog">Product Backlog</a> || 
<a href="#scrum">Scrum</a> || 
<a href="#instalação">Instalação</a>
</h1>
</div>

------------------------------------------------------------------------

## 📝 Descrição

O **Desafio 6DSM - 2026-2(1)** é um projeto acadêmico desenvolvido no 6º
semestre do curso de Desenvolvimento de Software Multiplataforma da
**FATEC Jacareí**, em parceria com o **PROCON --- Fundação de Proteção e
Defesa do Consumidor de Jacareí-SP**.

O projeto tem como tema o desenvolvimento de um **Chatbot para
Orientação ao Consumidor via WhatsApp**.

A proposta é criar um sistema capaz de orientar cidadãos sobre direitos
do consumidor, procedimentos de reclamação, prazos, documentos
necessários e possíveis encaminhamentos. O chatbot deverá conduzir o
usuário por fluxos decisórios definidos pelo PROCON, apresentando
perguntas e opções de forma estruturada e intuitiva.

Ao final da interação, o sistema deverá gerar uma resposta orientadora
consolidada, indicando os próximos passos recomendados ao consumidor.
Quando necessário, essa resposta poderá ser complementada por um
**modelo de linguagem (LLM)** utilizado exclusivamente para geração
textual explicativa, sempre respeitando os limites e informações
definidos pelo PROCON.

> **Importante:** a solução possui caráter exclusivamente orientativo e
> não substitui o atendimento jurídico, administrativo ou formal
> realizado pelo PROCON.

Caso o chatbot não consiga solucionar adequadamente a dúvida do cidadão,
o sistema deverá possibilitar o **agendamento de atendimento
presencial**, orientando também sobre possíveis documentos necessários
para a consulta.

------------------------------------------------------------------------

## 🎯 Objetivos

O projeto busca:

-   Ampliar o acesso dos cidadãos às informações fornecidas pelo PROCON;
-   Reduzir a demanda causada por dúvidas e perguntas recorrentes;
-   Orientar o consumidor sem exigir, inicialmente, seu deslocamento até
    a unidade do PROCON;
-   Conduzir o usuário por fluxos decisórios previamente definidos;
-   Fornecer respostas claras, objetivas e acessíveis;
-   Permitir o agendamento presencial quando a orientação automatizada
    não for suficiente;
-   Disponibilizar uma interface web para gerenciamento dos atendimentos
    agendados;
-   Registrar as interações para permitir análise posterior dos fluxos
    mais utilizados;
-   Respeitar os princípios e requisitos da **LGPD** durante o
    tratamento das informações dos usuários.

------------------------------------------------------------------------

## 🛠️ Tecnologias

As tecnologias definitivas do projeto ainda serão definidas pela equipe
durante o desenvolvimento.

### Integração

![WhatsApp](https://img.shields.io/badge/WhatsApp_Business-25D366?style=for-the-badge&logo=whatsapp&logoColor=white)

A integração deverá ser realizada preferencialmente por meio da
**WhatsApp Business Platform (Cloud API)**. Para fins acadêmicos,
poderão ser utilizadas alternativas gratuitas, ambientes de teste ou
soluções simuladas que reproduzam o fluxo de comunicação.

### Backend

O back-end deverá utilizar tecnologias compatíveis com aplicações web
modernas, como:

![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![Python](https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white)

> A tecnologia utilizada pelo grupo será definida posteriormente.

### Infraestrutura & Ferramentas

![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)
![Git](https://img.shields.io/badge/Git-F05032?style=for-the-badge&logo=git&logoColor=white)
![GitHub](https://img.shields.io/badge/GitHub-181717?style=for-the-badge&logo=github&logoColor=white)

O sistema deverá obrigatoriamente executar em **Docker** e adotar
práticas modernas de desenvolvimento, incluindo versionamento de código,
testes, documentação técnica e integração/entrega contínua (**CI/CD**).

### Modelo de Linguagem

O projeto poderá utilizar um **LLM local** exclusivamente para
complementar a geração textual das orientações.

**Não deverão ser utilizadas APIs externas de LLM**, mesmo que
gratuitas, devido às restrições de custo e à necessidade de proteção das
informações conforme a LGPD.

------------------------------------------------------------------------

## 🔄 Scrum
| Sprint                                    | Início     | Fim        | Status           | 📉 Burndown Chart                                        | Sprint Backlog/Review  |
|:-----------------------------------------:|:----------:|:----------:|:----------------:|:---------------------------------------------------------:|:-----------------:|
| 1 | 10/08/2026 | 14/09/2026 | 🟡 Em andamento    | [Ver Gráfico](assets/burndown_1.png) |  [Ver](docs/sprint1.md) |
| 2 | 15/09/2026 | 19/10/2026 | ⚪ Pendente  | [Ver Gráfico](assets/burndown_2.png) |  [Ver](docs/sprint2.md) |
| 3 | 20/10/2026 | 23/11/2026 | ⚪ Pendente | [Ver Gráfico](assets/burndown_3.png) |  [Ver](docs/sprint3.md) |

------------------------------------------------------------------------
## 📋 Product Backlog
| Número | Recurso Funcional           | Síntese do Requisito                                         | Status          |
|:------:|-----------------------------|:------------------------------------------------------------:|:---------------:|
|  RF01  | Integração com WhatsApp           | Permitir a integração do usuário por meio de um chatbot no WhatsApp.                      | ⚪ <br> Pendente |
|  RF02  | Tabela de Decisões        | Apresentar opções de resposta com base nos fluxos fornecidos pelo PROCON.              | ⚪ <br> Pendente |
|  RF03  | Fluxos Decisórios      | Apresentar perguntas e alternativas de maneira sequencial e compreensível.          | ⚪ <br> Pendente |
|  RF04  | Resposta Orientadora    | Gerar ao final do fluxo um resumo do caso e os próximos passos recomendados.               | ⚪ <br> Pendente |
|  RF05  | Complemento com LLM   | Permitir geração textual explicativa por LLM dentro dos limites definidos pelo PROCON.               | ⚪ <br> Pendente |
|  RF06  | Registro de Interações    | Registrar interaçõies para análise posterior dos fluxos mais utilizados.               | ⚪ <br> Pendente |
|  RF07  | Agendamento Presencial    | Realizar agendamento quando o chatbot não solucionar a dúvida do cidadão.               | ⚪ <br> Pendente |
|  RF08  | Gerenciamento Web    | Disponibilizar interface web para gerenciamento dos atendimentos agendados.               | ⚪ <br> Pendente |

| Número  | Recurso Não-Funcional       | Síntese do Requisito                                         | Status          |
|:-------:|-----------------------------|:------------------------------------------------------------:|:---------------:|
|  RNF01  | Usabilidade              | Utilizar linguagem clara, objetiva e acessível ao público geral.               | ⚪ <br> Pendente |
|  RNF02  | Disponibilidade        | Garantir alta disponibilidade e tempo de resposta adequado para conversas em tempo real.             | ⚪ <br> Pendente |
|  RNF03  | LGPD        | Garantir tratamento adequado e proteção das informações dos usuários.               | ⚪ <br> Pendente |
|  RNF04  | Caráter Orientativo        | Informar explicitamente que as respostas não substituem atendimento formal               | ⚪ <br> Pendente |
|  RNF05  | Transparência LLM        | Identificar claramente respostas geradas com auxílio de modelos de linguagem.               | ⚪ <br> Pendente |
|  RNF06  | Docker        | Garantir a execução da aplicação em Docker               | ⚪ <br> Pendente |
|  RNF07  | Documentação        | Documentar instalação e requisitos necessários de hardware e software.               | ⚪ <br> Pendente |
|  RNF08  | Boas Práticas       | Adotar metodologia ágil, CI/CD, versionamento, testes e documentação técnica mínima.               | ⚪ <br> Pendente |
------------------------------------------------------------------------



## 🔒 Restrições do Projeto

-   A integração com o WhatsApp deverá ocorrer preferencialmente pela
    **WhatsApp Business Platform (Cloud API)**;
-   Poderão ser utilizados ambientes de teste ou soluções simuladas para
    fins acadêmicos;
-   O back-end deverá utilizar tecnologia compatível com aplicações web
    modernas, como Node.js ou Python;
-   A arquitetura deverá ser modular, separando:
    -   lógica do chatbot;
    -   gestão dos fluxos decisórios;
    -   integração com modelos de linguagem;
-   O escopo deverá ser compatível com o período disponível para
    desenvolvimento durante o semestre;
-   **APIs externas de LLM não poderão ser utilizadas**, mesmo quando
    gratuitas;
-   O tratamento de dados deverá observar os requisitos da **LGPD**.

------------------------------------------------------------------------

## ✅ Definition of Done

Uma entrega será considerada concluída quando:

-   Os requisitos e critérios definidos para a funcionalidade forem
    atendidos;
-   O código estiver versionado no repositório do projeto;
-   A funcionalidade estiver integrada ao restante da aplicação;
-   Os testes aplicáveis tiverem sido executados;
-   A documentação relacionada estiver atualizada;
-   A entrega estiver disponível em ambiente Docker quando aplicável.

------------------------------------------------------------------------

## 📖 User Stories

As **User Stories** e seus respectivos critérios de aceitação serão
definidos e refinados pela equipe durante o planejamento das Sprints,
com base nos requisitos e fluxos decisórios fornecidos pelo PROCON.

------------------------------------------------------------------------

## ⚙️ Instalação

As instruções de instalação serão adicionadas conforme a arquitetura e
as tecnologias do projeto forem definidas.

A documentação deverá incluir:

1.  Pré-requisitos de hardware e software;
2.  Clonagem do repositório;
3.  Configuração das variáveis de ambiente;
4.  Configuração da integração com o WhatsApp ou ambiente simulado;
5.  Configuração do modelo de linguagem local, caso utilizado;
6.  Inicialização dos containers Docker;
7.  Execução da aplicação.

Exemplo inicial:

``` bash
git clone <URL_DO_REPOSITORIO>
cd <NOME_DO_REPOSITORIO>
docker compose up --build
```

------------------------------------------------------------------------

## 👨‍💻 Dev Team

| Nome                               | Função              | GitHub                                          |
|:----------------------------------:|:-------------------:|:-----------------------------------------------:|
| Maurício Oliveira Medeiros Cepinho                     | Product Owner       | [GitHub](https://github.com/maucepinho)           |
| Cláudio dos Santos Siqueira Júnior |  Dev Team     | [GitHub](https://github.com/claudsaints)        |
| Lucas Roque Alvim Cruz             | Scrum Master| [GitHub](https://github.com/lucasroqe)          |
| Nícolas Aquino    | Dev Team  | [GitHub](https://github.com/Nickaqui)         |
| Luiz Felipe dos Santos             | Dev Team  | [GitHub](https://github.com/felipe-sant)      |
| Vitor Francisco de Azevedo Zonzini |Dev Team     | [GitHub](https://github.com/frevisto)           |
| Victor Hugo Dantas Carbajo         | Dev Team | [GitHub](https://github.com/Victor-Carbajo-DSM) |

## 🤝 Parceiro

**PROCON --- Fundação de Proteção e Defesa do Consumidor de Jacareí-SP**

Projeto desenvolvido como parte da metodologia de **Aprendizagem Baseada
em Projetos (ABP)** do 6º semestre de Desenvolvimento de Software
Multiplataforma da **FATEC Jacareí**.

------------------------------------------------------------------------

## 📌 Convenções de Commit

Para manter a organização e padronização do histórico do projeto, a
equipe deverá utilizar boas práticas de commits.

Sugestão de referência:

[Padrões de Commits](https://github.com/iuricode/padroes-de-commits)

------------------------------------------------------------------------

## 📄 Licença

A definição da licença do projeto será realizada posteriormente pela
equipe.

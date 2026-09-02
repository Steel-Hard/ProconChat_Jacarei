# SOBRE O MODELO ESCOLHIDO: OLLAMA 3.2 3B QUANTIZED

O Ollama carrega o modelo inteiro na memória para garantir respostas rápidas. A versão padrão de 3B (3 bilhões de parâmetros) vem com uma quantização Q4_K_M (precisão de 4 bits), o que reduz drasticamente o peso original do modelo sem perder inteligência relevante.


## 📝 REQUISITOS E CONSUMO


| Recurso           | Apenas em CPU (RAM) | Com Placa de Vídeo (VRAM) |
|------------------|-------------|--------------|
| Consumo do Modelo | ~2.0 GB             | ~2.0 GB                   | 
| Folga para Contexto (Janela de Chat) | + 1.0 GB a 1.5 GB | + 1.0 GB a 1.5 GB |
| Mínimo Recomendado no PC | 8 GB de RAM | 4 GB de VRAM (Ex: GTX 1650 / RTX 3050) |

Em disco, o modelo ocupa entorno de 2GB.

Se você tiver GPU (NVIDIA/AMD): O modelo roda na VRAM. A resposta será instantânea (30 a 50+ tokens por segundo).

Se você rodar em CPU: O modelo roda na RAM. A resposta será aceitável (8 a 15 tokens por segundo), o que ainda é perfeitamente usável para uma conversa em tempo real.


## 🤖 Por que ele é o IDEAL para Chatbots?

1. **Janela de Contexto Gigante (128k)** Ele suporta até 128.000 tokens de histórico. Isso significa que o chatbot pode lembrar de conversas extremamente longas, ler documentos inteiros, PDF's extensos ou manter regras complexas de atendimento sem "esquecer" o que foi dito no início do chat.

2. **Excelente suporte ao Português** Diferente de modelos antigos que traduziam o pensamento do inglês (gerando frases robóticas), o Llama 3.2 foi treinado nativamente com grandes volumes de dados em português. Ele entende gírias, contextos culturais e escreve de forma natural e fluida.

3. **Capacidade de RAG (Retrieval-Augmented Generation)** Por ter 3 bilhões de parâmetros, ele é rápido o suficiente para analisar textos injetados em tempo real. é possivel conectar um banco de dados ao prompt, e ele responderá o cliente baseando-se estritamente nas informações que você forneceu, agindo como um atendente treinado.

4. **Custo Zero e Privacidade Total** Ao rodar no Docker em uma máquina pessoal ou no servidor proprio, não é necessario pagar por token utilizado (como na API da OpenAI) e os dados dos seus usuários/clientes nunca saem da sua infraestrutura, garantindo conformidade com leis de privacidade (LGPD)

## 🔍 ENDPOINTS DO SERVIDOR OLLAMA

O servidor interno do Ollama disponibiliza duas APIs paralelas na porta 11434: a API Nativa do Ollama e a API de Compatibilidade da OpenAI.
Abaixo estão todos os principais endpoints funcionais  divididos por utilidade.

------------------------------

## 💬 1. Endpoints de Conversação e Geração (Os mais usados)

Estes endpoints são utilizados para enviar mensagens e receber as respostas do Llama 3.2.

## POST /api/chat (Nativo) ou /v1/chat/completions (Padrão OpenAI)

* Utilização: O endpoint ideal para Chatbots. Ele recebe uma lista com o histórico de mensagens (estruturado em system, user e assistant) e mantém o contexto da conversa.
* Exemplo de uso: Enviar o prompt do usuário junto com as últimas 5 mensagens trocadas para o robô responder sabendo o assunto anterior.

## POST /api/generate (Nativo) ou /v1/completions (Padrão OpenAI)

* Utilização: Geração de texto simples a partir de um único prompt textual. Não gerencia histórico de chat automaticamente.
* Exemplo de uso: Tarefas isoladas de automação como "Resuma este texto", "Extraia os e-mails deste bloco" ou "Classifique este comentário como positivo ou negativo".

------------------------------
## 🧠 2. Endpoints de Vetorização (Embeddings)
Essenciais para projetos avançados de chatbots que consultam bases de dados ou arquivos PDF (RAG).

## POST /api/embed (Nativo) ou /v1/embeddings (Padrão OpenAI)

* Utilização: Transforma um texto ou frase em um vetor numérico (uma lista de números que representa o significado matemático daquela frase).
* Exemplo de uso: Vetorizar a pergunta de um cliente para compará-la com o seu banco de dados de FAQ e encontrar a resposta mais parecida antes de enviar ao Llama.

------------------------------
## 🛠️ 3. Endpoints de Gerenciamento de Modelos
Úteis se o seu sistema precisar baixar novos modelos ou verificar a saúde da inteligência artificial de forma dinâmica.
## POST /api/pull

* Utilização: Faz o download de um modelo diretamente do registro do Ollama.
* Exemplo de uso: Criar um botão "Instalar modelo Llama 3.2" no painel administrativo do seu sistema.

## GET /api/tags ou /v1/models (Padrão OpenAI)

* Utilização: Lista todos os modelos que já foram baixados e estão disponíveis localmente no disco rígido do container.
* Exemplo de uso: Alimentar um campo de seleção (Select/Dropdown) na sua interface gráfica para o usuário escolher com qual IA quer conversar.

## POST /api/show

* Utilização: Retorna informações detalhadas sobre as entranhas de um modelo específico.
* Exemplo de uso: Descobrir qual arquitetura, tamanho da janela de contexto ou parâmetros de quantização o Llama 3.2 importado está usando.

## DELETE /api/delete

* Utilização: Remove o arquivo de um modelo do disco para liberar espaço de armazenamento.
* Exemplo de uso: Limpar modelos antigos que o seu projeto não utiliza mais.

------------------------------
## 💓 4. Endpoints de Diagnóstico e Infraestrutura

## GET/

* Utilização: Retorna apenas um texto curto: "Ollama is running". É o teste mais simples para garantir que o serviço está online.

## POST /api/copy

* Utilização: Duplica um modelo local existente criando um novo nome/tag para ele. Muito usado se você quiser criar variações do Llama 3.2 com configurações de temperatura ou comportamentos padrão diferentes diretamente no servidor.

## POST /api/ps

* Utilização: Mostra quais modelos estão carregados na memória (RAM/VRAM) neste exato momento e quanta memória estão consumindo ativamente.

------------------------------

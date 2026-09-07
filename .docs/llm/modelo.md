# Modelo escolhido: Llama 3.2 3B (Q4_K_M), servido via Ollama

O Ollama é o runtime que carrega o modelo inteiro na memória para garantir respostas rápidas. O modelo é o **Llama 3.2**, na variante de 3B (3 bilhões de parâmetros), com quantização Q4_K_M (precisão de 4 bits), o que reduz drasticamente o peso original do modelo sem perder inteligência relevante.

## Requisitos e consumo

| Recurso           | Apenas em CPU (RAM) | Com Placa de Vídeo (VRAM) |
|------------------|-------------|--------------|
| Consumo do Modelo | ~2.0 GB             | ~2.0 GB                   |
| Folga para Contexto (Janela de Chat) | + 1.0 GB a 1.5 GB | + 1.0 GB a 1.5 GB |
| Mínimo Recomendado no PC | 8 GB de RAM | 4 GB de VRAM (Ex: GTX 1650 / RTX 3050) |

Em disco, o modelo ocupa em torno de 2 GB.

Se você tiver GPU (NVIDIA/AMD): o modelo roda na VRAM. A resposta será instantânea (30 a 50+ tokens por segundo).

Se você rodar em CPU: o modelo roda na RAM. A resposta será aceitável (8 a 15 tokens por segundo), o que ainda é perfeitamente usável para uma conversa em tempo real.

## Por que ele é o ideal para este chatbot

1. **Janela de contexto grande (128k)**: suporta até 128.000 tokens de histórico, permitindo lembrar de conversas longas, ler documentos inteiros ou manter regras complexas de atendimento sem "esquecer" o que foi dito no início do chat.

2. **Excelente suporte ao português**: diferente de modelos antigos que traduziam o pensamento do inglês (gerando frases robóticas), o Llama 3.2 foi treinado nativamente com grandes volumes de dados em português. Entende gírias, contextos culturais e escreve de forma natural e fluida.

3. **Capacidade de RAG (Retrieval-Augmented Generation)**: por ter 3 bilhões de parâmetros, é rápido o suficiente para analisar textos injetados em tempo real. É possível conectar uma base de dados ao prompt e o modelo responde estritamente com base nas informações fornecidas. Essa capacidade não é implementada nesta spec (fora de escopo — ver `spec.md` da `servico-llm`), mas é um motivo relevante da escolha.

4. **Custo zero e privacidade total**: ao rodar em Docker localmente ou no servidor próprio, não é necessário pagar por token utilizado (como na API da OpenAI) e os dados dos usuários nunca saem da infraestrutura própria, atendendo RP05/RNF03 (LGPD).

## Endpoints do servidor Ollama (referência geral)

O servidor interno do Ollama disponibiliza duas APIs paralelas na porta 11434: a API nativa do Ollama e a API de compatibilidade da OpenAI. Abaixo estão os principais endpoints, divididos por utilidade.

### Conversação e geração

- `POST /api/chat` (nativo) ou `/v1/chat/completions` (padrão OpenAI): ideal para chatbots — recebe uma lista com histórico de mensagens (`system`, `user`, `assistant`) e mantém o contexto da conversa.
- `POST /api/generate` (nativo) ou `/v1/completions` (padrão OpenAI): geração de texto simples a partir de um único prompt textual, sem gerenciar histórico de chat automaticamente. É o endpoint usado pelo contrato deste projeto (ver `.docs/llm/contrato.md`).

### Vetorização (embeddings)

- `POST /api/embed` (nativo) ou `/v1/embeddings` (padrão OpenAI): transforma um texto em um vetor numérico. Útil para RAG, fora de escopo desta spec.

### Gerenciamento de modelos

- `POST /api/pull`: faz o download de um modelo do registro do Ollama. Usado pelo serviço `llm-pull` do `compose.yaml`.
- `GET /api/tags` ou `/v1/models`: lista os modelos já baixados e disponíveis localmente.
- `POST /api/show`: retorna informações detalhadas sobre um modelo específico (arquitetura, janela de contexto, quantização).
- `DELETE /api/delete`: remove um modelo do disco.

### Diagnóstico e infraestrutura

- `GET /`: retorna o texto `Ollama is running`. É o teste mais simples para garantir que o serviço está online.
- `POST /api/copy`: duplica um modelo local criando um novo nome/tag.
- `POST /api/ps`: mostra quais modelos estão carregados na memória neste momento e quanta memória estão consumindo.

## Resultado do teste real de prompt

Ver seção adicionada ao final deste documento após a validação (T4 de `tasks.md`).

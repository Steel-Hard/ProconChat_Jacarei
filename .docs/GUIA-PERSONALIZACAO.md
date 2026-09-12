# Guia da aplicação ProconChat

## 1. Visão geral

O sistema é um chatbot integrado ao WhatsApp por meio da Evolution API.

Fluxo principal:

```text
WhatsApp
   ↓
Evolution API
   ↓ webhook
Gateway
   ↓
Backend
   ↓
PostgreSQL
   ↓
Gateway
   ↓
Evolution API
   ↓
WhatsApp
```

O sistema possui quatro componentes principais:

- **Evolution API**: conexão com o WhatsApp.
- **Gateway**: recebe webhooks e envia mensagens.
- **Backend**: controla o fluxo da conversa e as regras de negócio.
- **PostgreSQL**: armazena sessões, categorias, perguntas e respostas.
- **Ollama/LLM**: utilizado para explicações complementares, quando habilitado.
- **Redis**: disponível para controle distribuído e filas.

---

## 2. Estrutura do projeto

```text
src/
├── backend/
│   ├── clients/
│   ├── controllers/
│   ├── db/
│   │   ├── migrations/
│   │   ├── schema/
│   │   └── seeds/
│   ├── repositories/
│   ├── routes/
│   ├── services/
│   └── types/
│
└── gateway/
    ├── clients/
    ├── controllers/
    ├── gateways/
    ├── routes/
    ├── services/
    └── types/
```

---

## 3. Responsabilidade de cada camada

### 3.1 Gateway

Localizado em:

```text
src/gateway/
```

Responsável por:

- Receber eventos da Evolution API;
- Validar eventos de mensagens;
- Ignorar mensagens enviadas pelo próprio bot;
- Extrair telefone e texto;
- Evitar processamento duplicado;
- Chamar o backend;
- Enviar a resposta para o WhatsApp.

Arquivos principais:

```text
controllers/evolutionWebhook.controller.ts
services/evolutionWebhook.service.ts
gateways/evolution.gateway.ts
clients/backend.client.ts
```

O gateway não deve conter regras de negócio do chatbot.

---

### 3.2 Backend

Localizado em:

```text
src/backend/
```

Responsável por:

- Criar e recuperar sessões;
- Controlar a etapa da conversa;
- Validar opções escolhidas;
- Consultar categorias e perguntas;
- Gerar respostas;
- Persistir o estado da sessão.

Arquivos principais:

```text
services/conversationFlow.service.ts
services/whatsappSession.service.ts
services/motorDecisao.service.ts
repositories/session.repository.ts
repositories/motorDecisao.repository.ts
```

---

### 3.3 Banco de dados

O PostgreSQL armazena:

- Usuários;
- Categorias;
- Perguntas;
- Respostas;
- Sessões;
- Interações;
- Agendamentos;
- Documentos necessários.

As alterações estruturais devem ser feitas por migrations:

```text
src/backend/db/migrations/
```

Os dados iniciais devem ser inseridos pelos seeds:

```text
src/backend/db/seeds/
```

---

## 4. Fluxo de conversação atual

A conversa é controlada pela coluna `current_step` da tabela `sessions`.

Estados disponíveis:

```text
AWAITING_CATEGORY
AWAITING_QUESTION
FINISHED
```

### 4.1 Nova conversa

Quando uma mensagem chega:

1. O gateway extrai o telefone;
2. O telefone é enviado ao backend;
3. O backend calcula o hash do telefone;
4. O sistema procura uma sessão ativa;
5. Caso não exista, cria uma sessão;
6. Consulta as categorias;
7. Envia o menu de categorias.

Fluxo:

```text
Nova mensagem
   ↓
Sessão não encontrada
   ↓
Cria sessão
   ↓
current_step = AWAITING_CATEGORY
   ↓
Envia lista de categorias
```

---

### 4.2 Escolha da categoria

Quando o usuário envia uma opção:

1. O backend lê a sessão ativa;
2. Verifica se o estado é `AWAITING_CATEGORY`;
3. Valida se o texto é um número válido;
4. Localiza a categoria correspondente;
5. Consulta as perguntas da categoria;
6. Salva a categoria selecionada;
7. Altera o estado para `AWAITING_QUESTION`;
8. Envia as perguntas.

Exemplo:

```text
Usuário: 1
   ↓
Categoria selecionada
   ↓
Salva current_category_id
   ↓
current_step = AWAITING_QUESTION
   ↓
Envia perguntas da categoria
```

---

### 4.3 Escolha da pergunta

Quando o usuário responde ao menu de perguntas:

1. O backend verifica se o estado é `AWAITING_QUESTION`;
2. Recupera `current_category_id`;
3. Busca novamente as perguntas daquela categoria;
4. Valida a opção recebida;
5. Seleciona a pergunta;
6. Consulta a resposta final;
7. Finaliza a sessão;
8. Envia a orientação.

Fluxo:

```text
Usuário: 1
   ↓
Lê current_category_id salvo
   ↓
Busca perguntas da categoria correta
   ↓
Seleciona a pergunta 1
   ↓
Busca resposta
   ↓
FINISHED
```

A opção `1` da categoria e a opção `1` da pergunta são processadas em etapas diferentes. O estado persistido impede que uma escolha seja reutilizada incorretamente.

---

## 5. Controle de sessões

A tabela principal é `sessions`.

Campos importantes:

```text
id
session_code
phone_hash
status
current_step
current_category_id
started_at
ended_at
```

O telefone não é salvo diretamente. Ele é transformado em hash usando:

```text
PHONE_HASH_SECRET
```

Isso evita armazenar o número em texto puro.

A sessão deve ser identificada por:

```text
phone_hash + status = IN_PROGRESS
```

A migration `08_add_sessions_active_unique_index.sql` garante que não existam várias sessões ativas para o mesmo telefone.

---

## 6. Controle de concorrência

O serviço de fluxo usa um lock em memória por telefone.

Objetivo:

```text
Mensagem A começa
Mensagem B chega imediatamente
Mensagem B aguarda
Mensagem A atualiza a sessão
Mensagem B lê o novo estado
```

Sem esse controle, duas mensagens poderiam ler simultaneamente:

```text
AWAITING_CATEGORY
```

e ambas seriam processadas como escolha de categoria.

O lock em memória protege uma única instância do backend. Se existirem múltiplas instâncias, o lock deve ser migrado para:

- Redis;
- PostgreSQL com `SELECT ... FOR UPDATE`;
- Fila por telefone.

---

## 7. Deduplicação de mensagens

A Evolution API pode reenviar o mesmo webhook.

O identificador correto é:

```text
payload.data.key.id
```

O gateway deve:

- Ignorar eventos sem ID;
- Ignorar mensagens com `fromMe = true`;
- Ignorar eventos que não sejam `messages.upsert`;
- Não processar duas vezes o mesmo ID.

A deduplicação em memória funciona somente enquanto o container está ativo. Para produção, recomenda-se armazenar os IDs processados no banco ou Redis.

Modelo recomendado:

```sql
CREATE TABLE inbound_messages (
    id BIGSERIAL PRIMARY KEY,
    external_id TEXT NOT NULL UNIQUE,
    phone TEXT NOT NULL,
    payload JSONB NOT NULL,
    received_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

O registro deve ser feito antes de chamar o backend.

---

## 8. Execução com Docker

Na raiz do projeto:

```bash
docker compose up -d
```

Verificar os containers:

```bash
docker compose ps
```

Ver logs:

```bash
docker compose logs -f backend gateway
```

Ver logs do banco e seed:

```bash
docker compose logs postgres migrate seed
```

Recompilar após alterações:

```bash
docker compose build --no-cache backend gateway
docker compose up -d backend gateway
```

Executar o seed manualmente:

```bash
docker compose run --rm seed
```

O banco utiliza as variáveis:

```dotenv
POSTGRES_USER=proconchat
POSTGRES_PASSWORD=1234
POSTGRES_PORT=5433
```

Conectar ao banco:

```bash
docker compose exec postgres \
  psql -U proconchat -d proconchat
```

---

## 9. Configuração do `.env`

Exemplo:

```dotenv
POSTGRES_USER=proconchat
POSTGRES_PASSWORD=1234
POSTGRES_PORT=5433

REDIS_PASSWORD=1234
REDIS_PORT=6379

EVOLUTION_API_KEY=chave-da-evolution
EVOLUTION_API_PORT=8080
EVOLUTION_WEBHOOK_TOKEN=token-do-webhook

BACKEND_PORT=3000
GATEWAY_PORT=3001
GATEWAY_INTERNAL_TOKEN=token-interno

PHONE_HASH_SECRET=segredo-do-hash

EVOLUTION_AUTO_REPLY_ENABLED=true

LLM_MODEL=llama3.2:3b
LLM_TIMEOUT_MS=20000
```

Nunca versionar chaves reais ou senhas de produção.

---

# Personalização para outro cliente

## 10. O que deve ser alterado

Para adaptar o sistema para outro cliente, normalmente devem ser alterados:

1. Nome e identidade do chatbot;
2. Categorias;
3. Perguntas;
4. Respostas;
5. Documentos necessários;
6. Mensagens exibidas ao usuário;
7. Regras do motor de decisão;
8. Variáveis de ambiente;
9. Configuração da Evolution API;
10. Logo, nome e textos institucionais.

A estrutura técnica pode permanecer a mesma.

---

## 11. Alterando categorias

As categorias são cadastradas nos arquivos de seed:

```text
src/backend/db/seeds/data/
```

Procure arquivos semelhantes a:

```text
procon-faq.cobranca.data.ts
procon-faq.arrependimento.data.ts
```

Cada cliente pode possuir seu próprio arquivo:

```text
cliente-x.data.ts
cliente-y.data.ts
```

O conteúdo deve representar a área de atendimento do cliente.

Exemplo conceitual:

```typescript
export const categorias = [
  {
    name: "Financeiro",
    description: "Dúvidas sobre pagamentos e cobranças",
  },
  {
    name: "Suporte técnico",
    description: "Problemas de acesso e utilização",
  },
];
```

Não altere diretamente os dados em produção sem criar uma estratégia de atualização.

---

## 12. Alterando perguntas e respostas

Cada categoria deve possuir perguntas relacionadas.

Exemplo conceitual:

```typescript
{
  category: "Financeiro",
  questions: [
    {
      text: "Como consultar uma cobrança?",
      answer: {
        title: "Consulta de cobrança",
        content: "Acesse o portal do cliente...",
      },
    },
    {
      text: "Como solicitar segunda via?",
      answer: {
        title: "Segunda via",
        content: "Solicite a segunda via pelo canal...",
      },
    },
  ],
}
```

Regras importantes:

- A pergunta deve pertencer a uma categoria;
- A ordem exibida deve ser estável;
- A resposta precisa estar completa;
- Evite alterar IDs manualmente;
- Use seeds ou scripts de atualização.

---

## 13. Alterando as mensagens do chatbot

As mensagens estão em:

```text
src/backend/services/messageFormatter.service.ts
```

Funções comuns:

```text
formatarListaCategorias
formatarListaPerguntas
formatarErroCategoria
formatarErroPergunta
formatarCategoriaSemPerguntas
formatarRespostaFinal
```

Altere esse arquivo para personalizar:

- Saudação;
- Títulos;
- Emojis;
- Instruções;
- Mensagens de erro;
- Encerramento;
- Texto institucional.

Exemplo:

```typescript
export function formatarSaudacao(nomeCliente: string): string {
  return [
    `Olá! Você está falando com o atendimento ${nomeCliente}.`,
    "",
    "Escolha uma opção:",
  ].join("\n");
}
```

Evite colocar regras de banco ou chamadas à Evolution API nesse arquivo. Ele deve apenas formatar textos.

---

## 14. Alterando o fluxo

O fluxo está em:

```text
src/backend/services/conversationFlow.service.ts
```

Para adicionar uma etapa, primeiro atualize o tipo:

```typescript
export type SessionStep =
  | "AWAITING_CATEGORY"
  | "AWAITING_QUESTION"
  | "AWAITING_DOCUMENT"
  | "FINISHED";
```

Depois crie uma migration para atualizar o enum do PostgreSQL.

Em seguida:

1. Atualize `ConversationFlowReply`;
2. Crie o handler da nova etapa;
3. Adicione a condição no fluxo principal;
4. Persista o novo estado;
5. Crie testes;
6. Atualize os seeds, se necessário.

Fluxo recomendado:

```text
AWAITING_CATEGORY
   ↓
AWAITING_QUESTION
   ↓
AWAITING_DOCUMENT
   ↓
FINISHED
```

Nunca controle uma etapa somente com variável em memória.

---

## 15. Adicionando campos específicos de um cliente

Se outro cliente precisar de protocolo, CPF ou número de contrato:

1. Criar uma migration;
2. Adicionar o campo à tabela correta;
3. Atualizar o repository;
4. Atualizar os tipos TypeScript;
5. Criar o estado correspondente;
6. Atualizar o fluxo;
7. Criar testes.

Exemplo de migration:

```sql
-- Up Migration
ALTER TABLE sessions
ADD COLUMN customer_document VARCHAR(30);

-- Down Migration
ALTER TABLE sessions
DROP COLUMN customer_document;
```

Não adicione campos diretamente pelo terminal em produção. Use migrations para manter os ambientes sincronizados.

---

## 16. Configurando outro número de WhatsApp

Para outro cliente:

1. Criar uma nova instância na Evolution API;
2. Conectar o novo WhatsApp;
3. Configurar o webhook;
4. Apontar o webhook para o gateway;
5. Definir o token correto;
6. Validar o nome da instância;
7. Testar envio e recebimento.

O gateway deve validar a instância recebida quando houver múltiplos clientes.

Recomenda-se incluir o cliente no contexto da sessão:

```text
cliente + telefone + sessão
```

Não use apenas o telefone se o mesmo número puder acessar clientes diferentes.

---

## 17. Multiempresa

Para suportar vários clientes corretamente, adicione um identificador de tenant:

```text
tenant_id
```

Esse campo deve existir em:

- Sessões;
- Categorias;
- Perguntas;
- Usuários;
- Interações.

A chave lógica da sessão deverá ser:

```text
tenant_id + phone_hash
```

Exemplo:

```sql
CREATE UNIQUE INDEX sessions_active_tenant_phone_idx
ON sessions (tenant_id, phone_hash)
WHERE status = 'IN_PROGRESS';
```

Todas as consultas devem filtrar pelo cliente:

```sql
WHERE tenant_id = $1
  AND phone_hash = $2
  AND status = 'IN_PROGRESS'
```

Nunca reutilize categorias de um cliente para outro sem filtro de `tenant_id`.

---

## 18. Uso do LLM

O LLM não deve substituir o fluxo determinístico de menus.

O fluxo recomendado é:

```text
Menu e seleção
   ↓
Motor de decisão
   ↓
Resposta cadastrada
   ↓
LLM opcional para explicação
```

O LLM deve ser usado para:

- Explicar uma resposta;
- Simplificar linguagem;
- Responder dúvidas complementares;
- Classificar mensagens fora do menu, se necessário.

Não use o LLM para decidir sozinho uma opção crítica sem validação.

Configurações principais:

```dotenv
LLM_MODEL=llama3.2:3b
LLM_TIMEOUT_MS=20000
```

Sempre defina timeout e tratamento de erro.

---

## 19. Testes obrigatórios

Antes de liberar um cliente, testar:

### Sessão

- Criação de sessão;
- Reutilização de sessão ativa;
- Finalização da sessão;
- Nova conversa após finalização.

### Navegação

- Categoria válida;
- Categoria inválida;
- Pergunta válida;
- Pergunta inválida;
- Categoria sem perguntas;
- Estado sem categoria associada.

### Webhook

- Evento válido;
- Evento duplicado;
- Evento sem ID;
- Mensagem `fromMe`;
- Evento sem texto;
- Telefone com sufixo do WhatsApp;
- Resposta automática desabilitada.

### Concorrência

- Duas mensagens simultâneas;
- Mesmo webhook enviado duas vezes;
- Reinício do gateway;
- Mais de uma instância do backend.

Executar:

```bash
cd src/backend
npm test -- --run
npm run build

cd ../gateway
npm test -- --run
npm run build
```

---

## 20. Checklist para novo cliente

### Banco

- [ ] Criar categorias;
- [ ] Criar perguntas;
- [ ] Criar respostas;
- [ ] Criar documentos necessários;
- [ ] Executar migrations;
- [ ] Executar seed;
- [ ] Validar os registros no banco.

### WhatsApp

- [ ] Criar instância;
- [ ] Conectar o número;
- [ ] Configurar webhook;
- [ ] Validar token;
- [ ] Testar recebimento;
- [ ] Testar envio.

### Aplicação

- [ ] Alterar nome do cliente;
- [ ] Alterar mensagens;
- [ ] Configurar variáveis de ambiente;
- [ ] Configurar categorias;
- [ ] Validar fluxo completo;
- [ ] Rebuildar os containers.

### Segurança

- [ ] Trocar senhas padrão;
- [ ] Usar `PHONE_HASH_SECRET` exclusivo;
- [ ] Usar token interno exclusivo;
- [ ] Não expor PostgreSQL publicamente;
- [ ] Não versionar `.env`;
- [ ] Configurar logs sem dados sensíveis.

### Operação

- [ ] Configurar backup do PostgreSQL;
- [ ] Monitorar logs;
- [ ] Monitorar Evolution API;
- [ ] Monitorar tempo de resposta do LLM;
- [ ] Documentar o número de suporte;
- [ ] Definir procedimento de reinício.

---

## 21. Procedimento de publicação

Após alterar código ou dados:

```bash
docker compose build --no-cache backend gateway seed migrate
docker compose run --rm seed
docker compose up -d backend gateway
docker compose ps
```

Verificar logs:

```bash
docker compose logs -f backend gateway
```

Testar:

1. Enviar uma mensagem inicial;
2. Escolher uma categoria;
3. Escolher uma pergunta;
4. Confirmar a resposta;
5. Reenviar o mesmo webhook;
6. Confirmar que não houve duplicação;
7. Iniciar uma nova conversa após finalizar.

---

## 22. Cuidados importantes

- Não apagar categorias em uso sem tratar a foreign key das sessões;
- Não executar `TRUNCATE ... CASCADE` em produção;
- Não modificar migrations já aplicadas;
- Criar uma nova migration para cada alteração;
- Não usar variáveis globais para controlar sessões;
- Não processar mensagens sem identificador;
- Não confiar apenas em deduplicação em memória;
- Não enviar resposta antes de confirmar a transição da sessão;
- Não permitir que o LLM altere o estado diretamente;
- Não compartilhar dados entre clientes sem `tenant_id`.

---

## 23. Resumo técnico

O sistema funciona como uma máquina de estados persistida:

```text
mensagem recebida
   ↓
deduplicação
   ↓
identificação do telefone
   ↓
recuperação da sessão
   ↓
leitura do current_step
   ↓
execução da etapa atual
   ↓
atualização da sessão
   ↓
resposta enviada ao WhatsApp
```

A personalização de um novo cliente deve priorizar:

1. Dados no banco;
2. Mensagens formatadas;
3. Configuração da Evolution API;
4. Identidade visual;
5. Regras específicas;
6. Multiempresa, quando necessário.

A estrutura de código só deve ser alterada quando o novo cliente possuir um fluxo diferente do fluxo atual.
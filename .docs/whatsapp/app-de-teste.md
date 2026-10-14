# Guia: app de teste da Meta para desenvolvimento

Cada pessoa do time pode montar o próprio app de teste na Meta para receber eventos da WhatsApp Cloud
API no gateway local. O número da equipe fica com a produção (`.docs/infra/deploy.md`); este guia é
para o ambiente de desenvolvimento.

Os detalhes técnicos do webhook, dos limites das mensagens e do diagnóstico de entrega estão no
[README do gateway](../../src/gateway/README.md). Este guia segue a ordem dos passos e aponta para lá
quando o assunto já está descrito.

Nunca coloque em arquivo versionado, issue ou PR o ID do app, o ID do número, o token, o App Secret ou
um telefone real. Os exemplos abaixo usam só placeholders.

## 1. Criar o app na Meta

1. Entre em [developers.facebook.com](https://developers.facebook.com/) com a sua conta e crie um app
   novo do tipo empresa (Business).
2. No painel do app, adicione o produto **WhatsApp**. A Meta cria uma conta do WhatsApp Business de
   teste ligada ao app.

## 2. Número de teste e destinatários

1. Em **WhatsApp → Configuração da API**, a Meta mostra um número de teste gratuito, criado junto com o
   app.
2. Na mesma tela, cadastre os números que vão conversar com o número de teste. O número de teste só
   entrega para até 5 destinatários cadastrados.

## 3. ID do número e App Secret

- **ID do número**: em **WhatsApp → Configuração da API**, o campo de ID do número de telefone do número
  de teste. Vai em `WHATSAPP_PHONE_NUMBER_ID`. Eventos de outro número são ignorados pelo gateway.
- **App Secret**: em **Configurações do app → Básico**, a chave secreta do app. Vai em
  `WHATSAPP_APP_SECRET` e serve para validar a assinatura `X-Hub-Signature-256` de cada evento.

## 4. Token de acesso

O token temporário de **WhatsApp → Configuração da API** expira em 24 h. Serve para um primeiro teste,
mas para trabalhar no dia a dia gere um token de usuário do sistema sem expiração, seguindo a seção
[Token de acesso permanente](../../src/gateway/README.md#token-de-acesso-permanente) do README do
gateway. O token vai em `WHATSAPP_ACCESS_TOKEN`.

## 5. Token de verificação do webhook

O `WHATSAPP_VERIFY_TOKEN` é escolhido por você, usado no passo 6a e repetido na Meta no passo 8. Gere um valor aleatório (se a configuração já existir no banco, use o token que ela já tem, passo 6b):

```bash
openssl rand -hex 32
```

## 6. Configurar o `.env` e as credenciais

No `.env` da raiz (copiado de `.env.example`), gere a chave-mestra que cifra o token e o App Secret
no banco. Ela é obrigatória e não tem valor padrão: sem ela, o Docker Compose recusa subir.

```bash
openssl rand -hex 32
```

```dotenv
ENCRYPTION_KEY=valor-gerado-acima
```

As credenciais da Meta ficam no banco (#83), não no `.env`. O caminho depende de a configuração do
WhatsApp já existir.

### 6a. Antes da primeira subida

Os `WHATSAPP_*` do `.env` são lidos pelo `seed` **só enquanto a configuração ainda não existe no
banco**. Se você ainda não rodou `docker compose up` neste volume do Postgres, preencha:

```dotenv
WHATSAPP_PHONE_NUMBER_ID=id-do-numero-no-app-da-meta
WHATSAPP_ACCESS_TOKEN=token-de-usuario-do-sistema-sem-expiracao
WHATSAPP_APP_SECRET=chave-secreta-do-app-da-meta
WHATSAPP_VERIFY_TOKEN=valor-gerado-no-passo-5
```

e suba a stack com `docker compose up --build -d` (seção 1 do README do gateway). O log do `seed` mostra
`WhatsApp: configuração inicial criada`.

### 6b. Com a configuração já criada

Depois da primeira subida, o `seed` mostra `WhatsApp: configuração inicial já existe, mantida` e
ignora os `WHATSAPP_*`: rodar o seed de novo não muda nada. Troque as credenciais pela tela de WhatsApp
do painel (#54) ou, enquanto ela não existe, pela API do backend com o cookie do Admin
([README do backend](../../src/backend/README.md), "Configuração do WhatsApp").

Os exemplos usam o Admin e as portas padrão do `compose.yaml` (`ROOT_EMAIL`/`ROOT_PASSWORD` do `.env`,
backend em `3000`, painel em `8081`). Leia os segredos sem ecoar na tela e sem gravar no histórico:

```bash
ORIGIN=http://localhost:8081
read -r PHONE_NUMBER_ID
read -rs ACCESS_TOKEN
read -rs APP_SECRET
ACCESS_COOKIE=$(curl -s -D - -o /dev/null -X POST http://localhost:3000/api/v1/auth/login \
  -H "Origin: $ORIGIN" -H "Content-Type: application/json" \
  -d '{"email":"admin@procon.local","password":"admin-dev-123"}' \
  | grep -i '^set-cookie: proconchat_access=' | sed 's/^[^:]*: //; s/;.*//')
BODY=$(printf '{"phoneNumberId":"%s","accessToken":"%s","appSecret":"%s"}' "$PHONE_NUMBER_ID" "$ACCESS_TOKEN" "$APP_SECRET")
```

Testar a conexão (não grava nada quando os valores são novos):

```bash
curl -s -X POST http://localhost:3000/api/v1/whatsapp/settings/test \
  -H "Origin: $ORIGIN" -H "Cookie: $ACCESS_COOKIE" -H "Content-Type: application/json" \
  -d "$BODY"
```

A resposta é `{"data":{"ok":true,...}}` ou `{"data":{"ok":false,"reason":"..."}}`. Com `ok: true`,
salvar (o backend refaz o teste e só grava se ele passar; falha devolve `422` com o motivo):

```bash
curl -s -X PUT http://localhost:3000/api/v1/whatsapp/settings \
  -H "Origin: $ORIGIN" -H "Cookie: $ACCESS_COOKIE" -H "Content-Type: application/json" \
  -d "$BODY"
unset ACCESS_TOKEN APP_SECRET BODY
```

O gateway recarrega sozinho. O token de verificação do passo 8 aparece em `verifyToken` na resposta de
`GET /api/v1/whatsapp/settings` (com o mesmo cookie). Ele é o `WHATSAPP_VERIFY_TOKEN` do `.env` se a
configuração foi criada pelo passo 6a, ou um valor gerado pelo sistema.

## 7. Túnel HTTPS

A Meta só chama URL HTTPS pública. Abra um túnel para a porta do gateway com uma das ferramentas:

```bash
ngrok http 3001
cloudflared tunnel --url http://localhost:3001
```

Anote o endereço `https://<túnel>` que a ferramenta mostrar. Ele muda a cada execução nos planos
gratuitos, então o passo 8 se repete quando o túnel for recriado.

## 8. Configurar o webhook na Meta

1. Em **WhatsApp → Configuração → Webhook**, informe `https://<túnel>/webhooks/whatsapp` como URL de
   callback e o token de verificação da configuração (`verifyToken`, passo 6b) em "Verificar token".
2. Clique em "Verificar e salvar". A Meta chama `GET /webhooks/whatsapp`, e o gateway responde com o
   desafio quando o token confere. Se a verificação falhar, confira o token de verificação mostrado na
   tela de WhatsApp do painel.
3. Assine o campo `messages`.

## 9. Conferir pelos logs

Mande uma mensagem de um destinatário cadastrado para o número de teste e acompanhe:

```bash
docker compose logs -f gateway backend
```

Os logs do gateway identificam a mensagem por `messageRef`, um resumo do ID da mensagem. Telefone,
texto e token nunca aparecem. A sessão criada pelo backend pode ser conferida na seção "Consultar
sessões no Postgres" do README do gateway.

## 10. Limitação do número de teste

O número de teste da Meta recebe as mensagens e aceita os envios, mas na #53 toda entrega para número
brasileiro terminou com status `failed` e código `130497` ("Business account is restricted from messaging
users in this country"). Cadastrar cartão e completar o perfil da empresa não resolveu. A causa provável
é a falta de verificação de empresa no portfólio (`141010` no `health_status`). Na prática:

- o app de teste serve para verificar o webhook e ver a mensagem chegar ao gateway e ao backend;
- a resposta chegando ao celular é validada com um número real registrado na conta do WhatsApp
  Business. Hoje isso é feito na produção, com o número da equipe, depois do merge em `develop`.

O gateway ainda descarta os eventos de status sem registrar `failed` nem o código de erro (isso fica
para a #88). Por isso, uma resposta que não chega ao celular não aparece nos logs: confira o payload de
status no painel do app e a saúde do número com `GET /{phone_number_id}?fields=health_status`. Os dois
estão na seção
[Validação com número real e diagnóstico de entrega](../../src/gateway/README.md#validação-com-número-real-e-diagnóstico-de-entrega)
do README do gateway.

## 11. Teste local sem a Meta

Para testar o webhook sem app nem túnel, use o `curl` assinado da seção
[Teste manual com `curl`](../../src/gateway/README.md#teste-manual-com-curl) do README do gateway. Ele
funciona com os valores padrão do Compose e com um número fictício.

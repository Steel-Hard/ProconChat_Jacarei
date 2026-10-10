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

O `WHATSAPP_VERIFY_TOKEN` é escolhido por você e repetido na Meta no passo 8. Gere um valor aleatório:

```bash
openssl rand -hex 32
```

## 6. Configurar o `.env` e subir o gateway

No `.env` da raiz (copiado de `.env.example`), preencha:

```dotenv
WHATSAPP_PHONE_NUMBER_ID=id-do-numero-no-app-da-meta
WHATSAPP_ACCESS_TOKEN=token-de-usuario-do-sistema-sem-expiracao
WHATSAPP_APP_SECRET=chave-secreta-do-app-da-meta
WHATSAPP_VERIFY_TOKEN=valor-gerado-no-passo-5
```

Depois recrie o gateway:

```bash
docker compose up -d --build gateway
```

Se a stack ainda não estiver de pé, use `docker compose up --build -d` (seção 1 do README do gateway).

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
   callback e o valor de `WHATSAPP_VERIFY_TOKEN` em "Verificar token".
2. Clique em "Verificar e salvar". A Meta chama `GET /webhooks/whatsapp`, e o gateway responde com o
   desafio quando o token confere. Se a verificação falhar, confira o token no `.env` e se o gateway foi
   recriado depois da mudança.
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

Sem a verificação de empresa no portfólio do negócio, o número de teste da Meta recebe as mensagens e
aceita os envios, mas toda entrega para número brasileiro termina com status `failed` e código `130497`.
Na prática:

- o app de teste serve para verificar o webhook e ver a mensagem chegar ao gateway e ao backend;
- a resposta chegando ao celular é validada com um número real registrado na conta do WhatsApp
  Business. Hoje isso é feito na produção, com o número da equipe, depois do merge em `develop`.

Como ler o status de uma mensagem e conferir a saúde do número está na seção
[Validação com número real e diagnóstico de entrega](../../src/gateway/README.md#validação-com-número-real-e-diagnóstico-de-entrega)
do README do gateway.

## 11. Teste local sem a Meta

Para testar o webhook sem app nem túnel, use o `curl` assinado da seção
[Teste manual com `curl`](../../src/gateway/README.md#teste-manual-com-curl) do README do gateway. Ele
funciona com os valores padrão do Compose e com um número fictício.

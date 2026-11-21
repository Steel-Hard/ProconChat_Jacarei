---
titulo: Documento do software
subtitulo: Visão geral, regras de proteção de dados e de uso de IA, requisitos, instalação e atualização
versao: 1.0
---

# O que é o ProconChat

O ProconChat Jacareí é um chatbot de orientação ao consumidor pelo WhatsApp, feito para o PROCON de Jacareí-SP. Ele foi desenvolvido no 6º semestre do curso de Desenvolvimento de Software Multiplataforma da Fatec Jacareí.

O cidadão conversa com o bot pelo WhatsApp. O bot conduz a conversa por perguntas e opções definidas pelo PROCON e entrega, ao final, uma orientação com a base legal, os documentos necessários e os próximos passos. Quando a orientação não resolve, o cidadão pode agendar um atendimento presencial. A equipe do PROCON acompanha os atendimentos e configura o bot por um painel web.

## O que o sistema faz

| Para quem | O que oferece |
| --- | --- |
| Cidadão | Orientação sobre direitos do consumidor pelo WhatsApp, por perguntas e opções. Agendamento, remarcação e cancelamento de atendimento presencial. Lembrete antes do atendimento |
| Equipe do PROCON | Painel web para acompanhar os agendamentos, configurar horários, documentos e conteúdo do bot, ver relatórios e sessões, gerenciar contas e configurar o número do WhatsApp |
| Administrador | Tudo que a equipe faz, mais a gestão de contas e das credenciais do WhatsApp |

> **Atenção:** a orientação do bot tem caráter informativo. Ela não é vinculante e não substitui o atendimento jurídico ou administrativo formal do PROCON.

## A quem este documento se destina

A uma pessoa técnica de fora do time de desenvolvimento que precise entender o sistema e colocá-lo no ar. Ele cobre a visão geral, as regras de proteção de dados e de uso de IA, os requisitos de hardware e software, a instalação, a atualização e o procedimento de redefinição da senha do Administrador.

Este documento é um resumo da documentação do projeto (pasta `.docs/` do repositório). Quando houver diferença entre os dois, vale a documentação do repositório.

# Como o sistema funciona

Todos os componentes rodam em containers Docker, em uma única máquina, orquestrados por Docker Compose. Isso inclui o modelo de IA.

![Visão geral dos componentes do ProconChat](images/documento-do-software/visao-geral.svg)
*Figura 1 – Componentes do sistema, todos na mesma máquina*

## Componentes

| Componente | Para que serve |
| --- | --- |
| Proxy HTTPS (Caddy) | Único ponto exposto à internet (portas 80 e 443). Emite o certificado HTTPS sozinho e encaminha o tráfego para o painel, a API e o webhook do WhatsApp |
| Gateway WhatsApp | Recebe as mensagens enviadas pela Meta (WhatsApp Cloud API), confere a assinatura de cada uma, organiza a fila por telefone e envia as respostas |
| Backend | Cérebro do sistema: conduz a conversa, monta as respostas, calcula horários livres, cuida dos agendamentos, expõe a API do painel e controla login e permissões |
| Painel (frontend) | Site usado pela equipe do PROCON |
| Banco de dados (PostgreSQL) | Guarda conteúdo, agenda, contas, registros de atendimento e configurações |
| IA local (Ollama, modelo `llama3.2:3b`) | Reescreve a explicação da resposta oficial em linguagem natural. Roda na própria máquina |

Além desses, três serviços rodam uma vez e encerram: `migrate` (cria e atualiza as tabelas do banco), `seed` (carrega o conteúdo inicial, a conta Administrador e a configuração do WhatsApp) e `llm-pull` (baixa o modelo de IA na primeira subida).

## Caminho de uma mensagem

1. O cidadão envia uma mensagem ou toca numa opção no WhatsApp.
2. A Meta entrega a mensagem ao sistema por um webhook HTTPS assinado. O proxy encaminha ao gateway.
3. O gateway confere a assinatura, descarta repetições e repassa ao backend.
4. O backend identifica a conversa, decide o próximo passo pelas regras cadastradas e monta a resposta.
5. O gateway envia a resposta pelo WhatsApp.

Quando a pergunta permite o complemento por IA, o cidadão vê "digitando…" no WhatsApp enquanto a IA escreve a explicação. Em seguida, recebe uma única mensagem com a explicação, o bloco oficial, o aviso e os botões. Se a IA não puder ser usada, o cidadão recebe a resposta oficial completa, nas mensagens de sempre.

## Painel da equipe

O painel é um site protegido por login. Cada conta tem permissões próprias, conferidas no servidor a cada requisição. A conta Administrador tem todas as permissões. Não existe "esqueci minha senha" no painel: a redefinição da senha do Administrador é um procedimento técnico no servidor, descrito no capítulo de atualização e operação.

# Proteção de dados e uso de IA

Estas regras valem em todo o sistema e fazem parte do desafio proposto pelo PROCON e pela Fatec.

## Dados pessoais (LGPD)

| Regra | Como o sistema cumpre |
| --- | --- |
| O telefone nunca é guardado em texto puro | Nas conversas, só um código calculado a partir do telefone (hash), que não permite recuperar o número. No agendamento, o telefone é guardado criptografado, só para enviar avisos |
| O telefone do agendamento é apagado no horário do atendimento | Uma rotina do backend, a cada 60 segundos, apaga o telefone dos agendamentos cujo horário chegou |
| O texto digitado pelo cidadão nunca é guardado | O sistema registra só os passos percorridos na conversa, nunca o que a pessoa escreveu |
| CPF | Guardado como hash e em versão mascarada. O CPF completo nunca aparece no painel |
| Base legal | Execução do serviço que o próprio cidadão pediu. Não há consentimento separado |
| Conversas e agendamentos antigos | O Administrador pode ligar a anonimização automática por prazo na aba Privacidade do painel |
| Política de privacidade | Página pública `/privacidade` do painel |
| Credenciais do WhatsApp | Guardadas criptografadas no banco, com uma chave-mestra que fica só no arquivo `.env` do servidor |
| Cópias de segurança | Dumps diários do banco, guardados por 7 dias. Um telefone já apagado pode permanecer num dump por menos de 7 dias |

> **Atenção:** os segredos `PHONE_HASH_SECRET`, `CPF_HASH_SECRET`, `ENCRYPTION_KEY` e `POSTGRES_PASSWORD` não podem mudar depois do primeiro uso. Trocá-los quebra a ligação entre conversas antigas e novas, impede a busca por CPF e deixa ilegíveis as credenciais do WhatsApp salvas.

## Uso de inteligência artificial

| Regra | Significado |
| --- | --- |
| A IA nunca decide o fluxo | Quem escolhe o passo da conversa e os botões é o código, a partir das regras cadastradas, antes de a IA ser chamada. A IA só reescreve a explicação da resposta oficial já escolhida |
| Toda resposta com IA é identificada | A mensagem no WhatsApp leva "Gerado com auxílio de IA" no rodapé. No painel, a marca aparece na linha do tempo |
| Toda resposta final avisa que é informativa | Texto único: "Esta é uma orientação automatizada de caráter informativo. Ela não é vinculante e não substitui o atendimento jurídico ou administrativo formal do PROCON Jacareí." |
| Nenhuma API externa de LLM | O modelo roda na própria máquina do sistema (Ollama). Nenhum texto sai para serviços de IA de terceiros, nem gratuitos |
| Nenhum dado pessoal vai ao modelo | O pedido à IA leva só o texto oficial da resposta (categoria, pergunta do catálogo, base legal, resposta, documentos e próximos passos). Nunca o telefone nem o que o cidadão digitou |
| A resposta oficial é sempre a alternativa | Se a IA estiver fora do ar, demorar além do limite, errar números ou passar do tamanho permitido, o cidadão recebe o texto oficial. A reescrita só é usada se citar todos os números do texto oficial e nenhum número novo |
| A equipe controla onde a IA atua | Cada pergunta tem a opção "Permitir complemento por IA". Perguntas fora do escopo nunca usam IA |

# Requisitos de hardware e software

## Meta de desempenho da IA

A meta de hardware é que a IA (Ollama, modelo `llama3.2:3b`) entregue a resposta em até 10 segundos. A máquina precisa ser dimensionada para isso. O limite de espera do sistema pela IA é definido pela variável `LLM_TIMEOUT_MS` (padrão: 20 segundos). Passado esse limite, o cidadão recebe a resposta oficial.

## Requisitos mínimos

[[REQUISITOS-MINIMOS-PENDENTE]]

## Software

| Item | Requisito |
| --- | --- |
| Sistema operacional | Linux de 64 bits com suporte ao Docker. A produção do projeto usa Ubuntu 24.04 |
| Docker | Docker Engine com Docker Compose v2 (comando `docker compose`, sem hífen) |
| Rede | Portas 80 e 443 abertas à internet. Nenhuma outra porta deve ficar aberta |
| Endereço | Um nome de domínio que aponte para a máquina (ou um endereço `<ip>.sslip.io`), para o certificado HTTPS |
| WhatsApp | Conta da Meta com o WhatsApp Cloud API configurado e um número de telefone dedicado ao bot |
| Acesso à internet | Para baixar as imagens do sistema e o modelo de IA na instalação, e para falar com a Meta |

Não é preciso instalar Node.js, PostgreSQL nem o modelo de IA na máquina: tudo roda dentro dos containers.

# Instalação

Há dois caminhos. O primeiro serve para conhecer e testar o sistema numa máquina, sem HTTPS. O segundo é o de produção, com HTTPS e WhatsApp real.

## Caminho 1: testar a partir do código-fonte

Roda tudo na máquina, com as portas acessíveis só por ela mesma (`127.0.0.1`).

1. Instale o Docker e o Docker Compose v2.
2. Baixe o código do repositório e entre na pasta:

   ```bash
   git clone <URL_DO_REPOSITORIO>
   cd <NOME_DO_REPOSITORIO>
   cp .env.example .env
   ```

3. Abra o `.env` e preencha duas chaves, cada uma com o resultado de `openssl rand -hex 32`:
   - `ENCRYPTION_KEY`: obrigatória, sem ela o Docker Compose recusa subir;
   - `AUTH_TOKEN_SECRET`: assina as sessões do painel.
4. Suba tudo:

   ```bash
   docker compose up --build -d
   ```

5. Acompanhe até todos os serviços ficarem saudáveis (o `llm-pull` baixa o modelo de IA, cerca de 2 GB, e encerra):

   ```bash
   docker compose ps -a
   ```

6. Abra o painel em `http://localhost:8081` e entre com `ROOT_EMAIL` e `ROOT_PASSWORD` do `.env`.

Nesse modo não há HTTPS, e o WhatsApp real não consegue entregar mensagens à máquina. Use o caminho 2 para isso.

> **Dica:** o arquivo `.env.example` traz valores de desenvolvimento. Nunca os use em produção.

## Caminho 2: produção

A produção usa o arquivo `compose.prod.yaml`, que baixa imagens prontas do registro de containers do GitHub (GHCR) em vez de compilar o código, e o proxy Caddy para o HTTPS.

1. Prepare a máquina: instale o Docker Engine pelo repositório oficial, ative-o na inicialização (`sudo systemctl enable --now docker`) e crie um usuário sem privilégios de administrador, no grupo `docker`, para operar o sistema. Abra só as portas 80, 443 e a de acesso remoto (SSH) no firewall.
2. Crie a pasta da aplicação, por exemplo `/opt/proconchat`, e copie para ela o `compose.prod.yaml` e a pasta `deploy/` do repositório.
3. Crie o arquivo `.env` nessa pasta, a partir de `deploy/.env.prod.example`, com permissão `600`. Gere cada segredo com `openssl rand -hex 32`. As variáveis principais:

   | Variável | O que colocar |
   | --- | --- |
   | `SITE_ADDRESS` | Endereço público, sem `https://`. Precisa ser exatamente o endereço que o navegador usa, senão o login responde `403 INVALID_ORIGIN` |
   | `COMPOSE_PROFILES` | `llm`, para subir a IA local (Ollama) na mesma máquina |
   | `POSTGRES_PASSWORD`, `PHONE_HASH_SECRET`, `CPF_HASH_SECRET`, `GATEWAY_INTERNAL_TOKEN` | Segredos gerados |
   | `AUTH_TOKEN_SECRET` | Segredo com 32 ou mais caracteres |
   | `ENCRYPTION_KEY` | Exatamente 64 caracteres hexadecimais |
   | `ROOT_EMAIL` e `ROOT_PASSWORD` | E-mail e senha inicial do Administrador (senha de 8 caracteres a 72 bytes) |
   | `WHATSAPP_*` | Dados do número do bot na Meta: ID do número, ID da conta, token permanente, chave secreta do app e token de verificação do webhook. Servem só para a primeira subida; depois são editados pela tela de WhatsApp do painel |
   | `LLM_MODEL` | `llama3.2:3b` |

4. Rode o deploy informando a tag das imagens publicadas (o SHA do commit que se quer instalar):

   ```bash
   cd /opt/proconchat
   ./deploy/deploy.sh <tag>
   ```

   O script confere as variáveis do `.env` (e para sem mexer em nada se alguma for inválida), baixa as imagens, sobe os serviços, espera ficarem saudáveis, confere o endereço público e registra a tag em `releases.log`. Na primeira subida, o `llm-pull` baixa o modelo de IA.

5. Confira o resultado:

   ```bash
   export IMAGE_TAG="$(tail -n 1 releases.log | cut -d' ' -f2)"
   docker compose -f compose.prod.yaml ps -a
   ```

   Os serviços de longa duração devem estar em execução, e `backend` e `gateway` saudáveis. Abra `https://<SITE_ADDRESS>` e entre com a conta Administrador.

6. No app da Meta, em WhatsApp, Configuração, Webhook, informe a URL de callback `https://<SITE_ADDRESS>/webhooks/whatsapp` e o token de verificação mostrado na tela de WhatsApp do painel. Assine o campo `messages`. Mande uma mensagem ao número do bot e confira a resposta.

> **Atenção:** as imagens publicadas pelo projeto são geradas para a arquitetura da máquina de produção atual (ARM64). Para uma máquina x86 (amd64), gere as imagens para essa arquitetura no fluxo de entrega ou compile-as na própria máquina a partir do código, como descrito em "Primeiro deploy" no `deploy.md`.

# Atualização e operação

## Atualizar para uma versão nova

No projeto, cada alteração aprovada na branch de entrega gera imagens novas e atualiza o servidor sozinha, pelo GitHub Actions (CI e CD). Para atualizar manualmente, na pasta da aplicação:

```bash
./deploy/deploy.sh <tag-nova>
```

O `deploy.sh` aplica as migrações do banco antes de subir o backend novo. Se a migração falhar, o backend novo não sobe e a versão anterior continua.

Para pegar correções das imagens de terceiros (`postgres` e `caddy`), baixe-as antes do deploy:

```bash
export IMAGE_TAG="$(tail -n 1 releases.log | cut -d' ' -f2)"
docker compose -f compose.prod.yaml pull postgres caddy
./deploy/deploy.sh "$IMAGE_TAG"
```

## Voltar para a versão anterior

```bash
tail -n 5 releases.log
./deploy/deploy.sh <tag-anterior>
```

> **Atenção:** as migrações do banco não voltam no rollback. O código só deve voltar se a migração nova for compatível com ele. Desfazer a última migração é manual, exige backup antes e é descrito no `deploy.md`.

## Backup

O script `deploy/backup.sh` grava um dump do banco em `backups/proconchat-AAAA-MM-DD.dump` e apaga os mais antigos que a retenção (`BACKUP_RETENTION_DAYS`, padrão 7). Agende-o uma vez por dia no `cron` do usuário de operação:

```text
30 3 * * * /opt/proconchat/deploy/backup.sh >> /opt/proconchat/backups/backup.log 2>&1
```

Os dumps ficam só no disco da máquina e contêm dados pessoais protegidos. Copie-os para fora da máquina se quiser proteção contra a perda dela, e apague essas cópias quando não forem mais necessárias.

## Redefinir a senha do Administrador

Não existe "esqueci minha senha" no painel, e ninguém pode redefinir a senha do Administrador por ele. Quem faz isso é a equipe técnica, diretamente no servidor, em um terminal interativo, com o usuário de operação:

1. Entre no servidor e vá para a pasta da aplicação (por exemplo `/opt/proconchat`).
2. Rode o script:

   ```bash
   ./deploy/reset-admin-password.sh
   ```

3. Digite a senha nova e repita. Ela não aparece na tela e precisa ter de 8 caracteres a 72 bytes. Se as duas não forem iguais ou a regra não for cumprida, nada é alterado.
4. Confirme a mensagem final "Senha do Admin redefinida". É o único sinal de que a senha mudou.
5. Entre no painel com o e-mail do Administrador e a senha nova.

O script descobre sozinho a tag em uso pelo `releases.log` e passa a senha ao container por variável de ambiente, sem deixá-la na linha de comando, no histórico do shell nem no `.env`. Todas as sessões abertas do Administrador são encerradas. O e-mail do Administrador não muda: `ROOT_EMAIL` só vale na criação da conta. Se a conta Administrador não existir, o script sai com erro e pede para rodar o `seed`.

## Diagnóstico rápido

```bash
cd /opt/proconchat
export IMAGE_TAG="$(tail -n 1 releases.log | cut -d' ' -f2)"
docker compose -f compose.prod.yaml ps -a
docker compose -f compose.prod.yaml logs --tail 100 backend
docker compose -f compose.prod.yaml logs --tail 100 gateway
docker compose -f compose.prod.yaml logs --tail 100 caddy
```

| Sintoma | Causa provável |
| --- | --- |
| `backend` ou `gateway` não ficam saudáveis | Variável obrigatória faltando ou inválida no `.env`, ou a migração do banco falhou. Veja os logs |
| O endereço público não responde e o resto está saudável | Certificado ainda não emitido, portas 80 e 443 fechadas no firewall, ou o endereço não aponta para a máquina |
| Login no painel responde `403 INVALID_ORIGIN` | `SITE_ADDRESS` diferente do endereço que o navegador usa |
| Cidadão recebe sempre a resposta oficial, sem a explicação da IA | IA fora do ar, modelo não baixado ou resposta além do limite de espera. Veja `docker compose ps -a` e confira o serviço `ollama` |

Confira o espaço em disco de tempos em tempos, porque não há alerta automático:

```bash
df -h /
docker system df
```

## Onde está a documentação completa

Tudo o que este documento resume está detalhado na pasta `.docs/` do repositório: `infra/deploy.md` (produção, deploy, rollback, backup e diagnóstico), `architecture/architecture.md` (arquitetura), `decisoes/` (decisões de produto e arquitetura), `regras/` (regras de cada tela do painel) e `lgpd/` (pedidos do titular).

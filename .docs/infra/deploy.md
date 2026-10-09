# Produção: VM, deploy contínuo e operação

Guia do ambiente de produção (issue #51). Ele cobre a criação da VM, o deploy automático pelo GitHub Actions, o deploy manual, o rollback, o backup e o diagnóstico. Nenhum valor real de segredo vai neste arquivo.

## Visão geral

- Uma VM na Oracle Cloud roda a stack com Docker Compose a partir de `compose.prod.yaml`.
- O Caddy é o único serviço exposto (portas 80 e 443). Ele emite o certificado HTTPS sozinho e encaminha:
  - `/webhooks/whatsapp` para o `gateway`;
  - `/api/v1/whatsapp/sessions` responde 404 (rota interna entre gateway e backend);
  - `/api/*` para o `backend`;
  - o resto para o `frontend` (painel).
- O Postgres, o Ollama, o `/health` dos serviços e `/webhooks/evolution` não são acessíveis de fora.
- O painel é gerado sem `VITE_API_URL` e chama a API no mesmo endereço (`/api/v1/...`). A mesma imagem serve para qualquer domínio.
- Evolution e Redis não existem em produção (saem do código na #82).
- A cada push na branch de deploy (`DEPLOY_BRANCH`, hoje `develop`) com CI verde, o workflow `deploy.yml` gera as imagens, publica no GHCR e roda `deploy/deploy.sh` na VM por SSH.

Arquivos no repositório:

| Arquivo | Para quê |
|---|---|
| `compose.prod.yaml` | Stack de produção, só com `image:` do GHCR |
| `deploy/Caddyfile` | Roteamento e HTTPS |
| `deploy/.env.prod.example` | Modelo do `.env` da VM, com valores de exemplo |
| `deploy/deploy.sh` | Deploy de uma tag na VM |
| `deploy/backup.sh` | Dump diário do Postgres com retenção |
| `.github/workflows/deploy.yml` | CI, build no GHCR e deploy por SSH |

Na VM, tudo fica em `/opt/proconchat`, com a mesma estrutura do repositório:

```text
/opt/proconchat/
├── .env
├── compose.prod.yaml
├── deploy/
├── backups/
└── releases.log
```

## Provedor, tamanho e custo

| Item | Valor |
|---|---|
| Provedor | Oracle Cloud Infrastructure, Always Free |
| Região | Brazil East (São Paulo), `sa-saopaulo-1` |
| Forma | Ampere A1 (`VM.Standard.A1.Flex`), arm64. Tamanho final: preencher na T6 (alvo: 4 OCPU e 24 GB) |
| Sistema | Ubuntu 24.04 (aarch64) |
| Disco | Volume de boot: preencher na T6 (o Always Free cobre até 200 GB no total) |
| Custo | Zero dentro do Always Free. Custo confirmado na criação: preencher na T6 |
| Endereço | `<ip>.sslip.io`, com IP público reservado. IP: preencher na T6 |
| Conta | Em nome de Luiz Felipe |

As imagens são geradas só para a arquitetura da VM, definida pelas variáveis `DEPLOY_PLATFORM=linux/arm64` e `DEPLOY_RUNNER=ubuntu-24.04-arm`. Se a VM mudar para amd64 (plano B, DigitalOcean), basta trocar para `linux/amd64` e `ubuntu-latest`.

Versões fixas em produção: `postgres:15-alpine`, `caddy:2-alpine` e `ollama/ollama:0.40.2`. Nenhuma imagem usa `latest`.

## Conta Oracle

Faça estes passos logo depois de criar a conta, antes de depender da VM:

1. **Converter para Pay As You Go.** Em **Billing & Cost Management → Upgrade and Manage Payment**, escolha **Upgrade to Pay As You Go**. Os recursos Always Free continuam gratuitos, e a VM deixa de ser recuperada por ociosidade. Sem a conversão, a Oracle pode recuperar instâncias com CPU, rede e memória baixas por 7 dias, e esta stack fica ociosa quase o tempo todo.
2. **Criar um alerta de orçamento.** Em **Billing & Cost Management → Budgets → Create Budget**, crie um orçamento mensal de valor baixo (por exemplo US$ 1) para a tenancy, com alerta por e-mail para o dono da conta quando o gasto real passar de 1%. Assim qualquer cobrança é avisada.
3. **Adicionar outro administrador (pendente).** Em **Identity & Security → Domains → Default → Users**, convide outro membro do time e adicione-o ao grupo `Administrators`. Até isso ser feito, só Luiz Felipe acessa a conta.
4. **Se faltar capacidade A1.** A mensagem "Out of capacity for shape VM.Standard.A1.Flex" é comum em São Paulo. Tente em outros horários (madrugada costuma funcionar), em outro *availability domain* ou *fault domain*, ou com um tamanho menor (por exemplo 2 OCPU e 12 GB, que também serve) e aumente depois. Depois de 2 a 3 dias sem sucesso, a troca para o plano B (DigitalOcean, droplet de 8 GB) volta ao time antes de ser feita.

## Chaves SSH

São duas chaves, com papéis diferentes. Nunca use a mesma para os dois.

| Chave | Arquivo | Usuário na VM | Quem usa |
|---|---|---|---|
| Administração | `~/.ssh/proconchat_oci` (ed25519) | `ubuntu` (padrão da imagem, com `sudo`) | Só pessoas, para administrar a VM |
| Deploy | `~/.ssh/proconchat_deploy` (ed25519, gerada à parte) | `deploy` (sem `sudo`, no grupo `docker`) | Só o GitHub Actions, pelo segredo `DEPLOY_SSH_KEY` |

O grupo `docker` equivale a root na VM, por isso a chave do GitHub é exclusiva do deploy e pode ser revogada sem afetar o acesso de administração. Não há restrição por IP, porque os runners do GitHub não têm IP fixo.

Gerar a chave de deploy no WSL, sem senha (o Actions não digita senha):

```bash
ssh-keygen -t ed25519 -f ~/.ssh/proconchat_deploy -C proconchat-deploy-github -N ""
```

## Criar a VM

1. No console, **Compute → Instances → Create instance**, na região Brazil East (São Paulo).
2. **Image and shape:**
   - imagem **Canonical Ubuntu 24.04** (a versão aarch64 aparece ao escolher a forma Ampere);
   - forma **Ampere → VM.Standard.A1.Flex**, com 4 OCPU e 24 GB.
3. **Networking:** crie uma VCN nova com sub-rede pública (ou use a existente) e marque **Assign a public IPv4 address**.
4. **Add SSH keys:** escolha **Paste public keys** e cole o conteúdo de `~/.ssh/proconchat_oci.pub`.
5. **Boot volume:** aumente o tamanho se quiser mais espaço (por exemplo 100 GB), dentro do limite gratuito.
6. Crie a instância e anote o IP público.
7. **Reservar o IP:**
   - em **Networking → IP management → Reserved public IPs**, crie um IP reservado no mesmo compartimento;
   - na instância, abra **Attached VNICs → (VNIC) → IPv4 Addresses → Edit**, troque o IP efêmero por **No public IP**, salve, edite de novo e escolha **Reserved public IP** com o IP reservado.
   - O endereço do sistema passa a ser `<ip>.sslip.io` (por exemplo, para `203.0.113.10`, `203.0.113.10.sslip.io`). O `sslip.io` resolve o nome para o próprio IP, sem cadastro de DNS.
8. Teste o acesso:

```bash
ssh -i ~/.ssh/proconchat_oci ubuntu@<ip>
```

## Firewall

A Oracle tem dois firewalls, e os dois precisam liberar 80 e 443.

1. **Security list da VCN:** em **Networking → Virtual cloud networks → (VCN) → Security Lists → Default Security List → Add Ingress Rules**, crie duas regras com origem `0.0.0.0/0`, protocolo TCP, portas de destino `80` e `443`. A regra da porta 22 já existe. Não abra nenhuma outra porta.
2. **iptables da imagem Ubuntu da Oracle:** a imagem vem com regras que rejeitam tudo menos a porta 22. Na VM, como `ubuntu`:

```bash
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 80 -j ACCEPT
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 443 -j ACCEPT
sudo netfilter-persistent save
sudo iptables -L INPUT -n --line-numbers
```

As duas regras novas precisam aparecer antes da linha `REJECT`.

Para conferir de fora da VM, depois do primeiro deploy, só 22, 80 e 443 devem aparecer abertas:

```bash
nmap -Pn <ip>
```

## Preparar a VM

### Atualizar o sistema e endurecer o SSH

```bash
sudo apt-get update && sudo apt-get -y upgrade
printf 'PermitRootLogin no\nPasswordAuthentication no\nKbdInteractiveAuthentication no\n' | sudo tee /etc/ssh/sshd_config.d/99-proconchat.conf
sudo sshd -t && sudo systemctl reload ssh
```

Antes de fechar a sessão, abra outra e confirme que o login com `proconchat_oci` continua funcionando.

### Instalar o Docker

Pelo repositório oficial do Docker:

```bash
sudo apt-get install -y ca-certificates curl
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | sudo tee /etc/apt/sources.list.d/docker.list
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
sudo systemctl enable --now docker
docker --version && docker compose version
```

O `systemctl enable` faz o Docker subir com a VM. Os serviços com `restart: unless-stopped` voltam sozinhos depois de um `reboot`, e `migrate`, `seed` e `llm-pull` (`restart: "no"`) não rodam de novo.

### Criar o usuário `deploy` e a pasta da aplicação

```bash
sudo adduser --disabled-password --gecos "" deploy
sudo usermod -aG docker deploy
sudo install -d -o deploy -g deploy -m 750 /opt/proconchat
sudo install -d -o deploy -g deploy -m 700 /home/deploy/.ssh
```

Copie a chave pública de deploy para a VM (do WSL) e instale para o usuário `deploy`:

```bash
scp -i ~/.ssh/proconchat_oci ~/.ssh/proconchat_deploy.pub ubuntu@<ip>:/tmp/proconchat_deploy.pub
ssh -i ~/.ssh/proconchat_oci ubuntu@<ip> 'sudo install -o deploy -g deploy -m 600 /tmp/proconchat_deploy.pub /home/deploy/.ssh/authorized_keys && rm /tmp/proconchat_deploy.pub'
ssh -i ~/.ssh/proconchat_deploy deploy@<ip> 'docker ps'
```

O último comando precisa listar os containers (vazio no começo) sem pedir senha.

### `.env` de produção

O `.env` fica só em `/opt/proconchat/.env`, com dono `deploy` e permissão `600`. Ele nunca vai para o repositório nem para o GitHub. Use `deploy/.env.prod.example` como modelo e gere cada segredo com `openssl rand -hex 32`.

| Variável | Conteúdo |
|---|---|
| `SITE_ADDRESS` | Host público, sem esquema (`<ip>.sslip.io`). É também a URL pública prevista na decisão 003, reaproveitada pela #83 e pela #54 |
| `IMAGE_OWNER` | Dono das imagens no GHCR, em minúsculas (`steel-hard`) |
| `COMPOSE_PROFILES` | `llm` para subir o Ollama. Vazio para uma VM sem Ollama |
| `POSTGRES_USER` | Usuário do banco (`proconchat`) |
| `POSTGRES_PASSWORD` | Senha do banco. **Nunca muda depois do primeiro deploy**: ela só vale na criação do volume |
| `PHONE_HASH_SECRET` | Segredo do HMAC do telefone. **Nunca muda depois do primeiro deploy**: trocar faz as sessões existentes deixarem de ser encontradas |
| `GATEWAY_INTERNAL_TOKEN` | Token entre gateway e backend |
| `EVOLUTION_WEBHOOK_TOKEN` | Valor aleatório. O gateway ainda exige a variável até a #82, mas a rota não é exposta |
| `WHATSAPP_PHONE_NUMBER_ID` | ID do número da equipe no app da Meta |
| `WHATSAPP_ACCESS_TOKEN` | Token **permanente** de usuário do sistema (README do gateway, "Token de acesso permanente"). O temporário expira em 24 h |
| `WHATSAPP_APP_SECRET` | Chave secreta do app da Meta |
| `WHATSAPP_VERIFY_TOKEN` | Token de verificação do webhook, gerado para produção |
| `WHATSAPP_GRAPH_API_VERSION` | Versão da Graph API (`v26.0`) |
| `LLM_MODEL` | Modelo do Ollama (`llama3.2:3b`) |
| `LLM_TIMEOUT_MS` | Tempo limite do LLM |
| `BACKUP_RETENTION_DAYS` | Dias de retenção dos dumps (`7`) |

`IMAGE_TAG` não precisa ficar no `.env`: o `deploy.sh` define a tag a cada deploy e a registra em `releases.log`.

Para criar, como `deploy`:

```bash
cd /opt/proconchat
umask 077
nano .env
chmod 600 .env
```

## GitHub

### Segredos e variáveis

Em **Settings → Environments → New environment**, crie `production` e adicione os segredos:

| Segredo | Valor |
|---|---|
| `DEPLOY_HOST` | IP público reservado da VM |
| `DEPLOY_USER` | `deploy` |
| `DEPLOY_SSH_KEY` | Conteúdo inteiro de `~/.ssh/proconchat_deploy` (a chave privada) |
| `DEPLOY_KNOWN_HOSTS` | Saída de `ssh-keyscan` da VM, conferida (abaixo) |

Para gerar e conferir o `DEPLOY_KNOWN_HOSTS`, compare as impressões digitais vistas de fora com as da própria VM:

```bash
ssh-keyscan -t ed25519 <ip> 2>/dev/null | tee known_hosts.proconchat
ssh-keygen -lf known_hosts.proconchat
ssh -i ~/.ssh/proconchat_oci ubuntu@<ip> 'ssh-keygen -lf /etc/ssh/ssh_host_ed25519_key.pub'
```

As duas impressões precisam ser iguais. Cole o conteúdo de `known_hosts.proconchat` no segredo e apague o arquivo. O workflow conecta com `StrictHostKeyChecking=yes` e não aceita chave de servidor desconhecida.

Em **Settings → Secrets and variables → Actions → Variables**, crie as variáveis de repositório:

| Variável | Valor |
|---|---|
| `DEPLOY_BRANCH` | `develop` |
| `DEPLOY_PLATFORM` | `linux/arm64` |
| `DEPLOY_RUNNER` | `ubuntu-24.04-arm` |

Os segredos da aplicação não vão para o GitHub. As imagens não carregam segredo nenhum.

### Liberação do GHCR na organização `Steel-Hard`

Feita por um admin da organização.

Antes do primeiro build:

1. Em `https://github.com/organizations/Steel-Hard/settings/packages`, em **Package creation**, marque **Public** entre os tipos de pacote que os membros podem criar.
2. Em `https://github.com/organizations/Steel-Hard/settings/actions`, em **Policies**, confira se as actions da organização `docker` (verified creator) e as de `actions` são permitidas. Com "Allow all actions", não há nada a mudar.
3. Em **Workflow permissions**, mantenha o padrão. O `deploy.yml` pede `packages: write` só no job de build.

Depois do primeiro build, que cria `proconchat-backend`, `proconchat-gateway` e `proconchat-frontend` como privados:

1. Em `https://github.com/orgs/Steel-Hard/packages`, abra cada pacote e entre em **Package settings**.
2. Em **Manage Actions access**, confira se `ProconChat_Jacarei` aparece com papel **Write**.
3. Em **Danger Zone → Change visibility**, escolha **Public** e confirme digitando o nome do pacote.
4. Confira sem login, de qualquer máquina:

```bash
docker logout ghcr.io
docker pull ghcr.io/steel-hard/proconchat-frontend:<sha>
```

A VM baixa as imagens sem login. Se o deploy falhar no `pull` com erro de permissão, falta tornar algum pacote público.

## Deploy automático

O workflow `.github/workflows/deploy.yml` roda em todo push para `develop` e `main`, mas só segue na branch definida em `DEPLOY_BRANCH`:

1. **ci:** chama o próprio `ci.yml` (lint, build e testes dos três apps e testes com Postgres). Num push para a branch de deploy, o CI roda duas vezes: uma pelo `ci.yml` e outra pelo `deploy.yml`.
2. **build:** com o CI verde, gera as três imagens para `DEPLOY_PLATFORM` num runner nativo e publica `ghcr.io/steel-hard/proconchat-<app>:<sha>`.
3. **deploy:** no environment `production`, copia `compose.prod.yaml` e `deploy/` para `/opt/proconchat` por `scp` e roda `/opt/proconchat/deploy/deploy.sh <sha>` por SSH.

Push numa branch diferente de `DEPLOY_BRANCH`, CI falho ou PR não geram imagem nem deploy. Os deploys usam o grupo de concorrência `deploy-production`: um deploy em andamento nunca é cancelado, e o próximo espera. Se chegarem vários enquanto um roda, só o mais recente fica na fila.

O `deploy.sh <tag>`:

1. baixa as imagens da tag (`docker compose pull`);
2. recria os serviços com `IMAGE_TAG=<tag>` (`up -d --remove-orphans`). O `migrate` aplica as migrations novas e o `seed` roda antes do `backend`; se o `migrate` falhar, o `backend` novo não sobe;
3. espera `backend` e `gateway` ficarem `healthy` (até `DEPLOY_WAIT_TIMEOUT`, padrão 300 s). Não espera o `llm-pull`;
4. confere pelo endereço público que `/` responde 200 e `/webhooks/whatsapp` responde 403, com até 12 tentativas;
5. registra `<data UTC> <tag>` em `/opt/proconchat/releases.log`;
6. remove as imagens sem uso (`docker image prune -f`).

Qualquer falha sai com código diferente de 0, e o job fica vermelho. Sem tag, ele sai com código 2 sem mexer nos containers.

### Trocar a branch de deploy no fim do semestre

Em **Settings → Secrets and variables → Actions → Variables**, mude `DEPLOY_BRANCH` de `develop` para `main`. O próximo push em `main` faz deploy, e `develop` deixa de fazer. Não é preciso editar o YAML.

## Primeiro deploy

O deploy automático só existe quando o `deploy.yml` estiver em `develop`. Há dois caminhos:

**A. Pelo merge do PR da #51 (padrão).** Com a VM preparada, o `.env` criado, os segredos e as variáveis no GitHub e a liberação do GHCR feita, o merge do PR em `develop` dispara o workflow. Depois do primeiro build, torne os três pacotes públicos e, se o job de deploy tiver falhado no `pull`, rode-o de novo em **Actions → (execução) → Re-run failed jobs**.

**B. Antes do merge, com imagens geradas na própria VM.** Serve para validar a VM e o webhook antes do PR entrar. Como `deploy`, na VM (que já é arm64):

```bash
cd /opt/proconchat
git clone --depth 1 --branch feat/51-producao-vm-deploy-continuo https://github.com/Steel-Hard/ProconChat_Jacarei.git src-checkout
cp src-checkout/compose.prod.yaml . && cp -r src-checkout/deploy .
TAG="$(git -C src-checkout rev-parse HEAD)"
docker build --target runtime -t "ghcr.io/steel-hard/proconchat-backend:$TAG" src-checkout/src/backend
docker build --target runtime -t "ghcr.io/steel-hard/proconchat-gateway:$TAG" src-checkout/src/gateway
docker build --build-arg VITE_API_URL= -t "ghcr.io/steel-hard/proconchat-frontend:$TAG" src-checkout/src/frontend
export IMAGE_TAG="$TAG"
docker compose -f compose.prod.yaml up -d --remove-orphans
docker compose -f compose.prod.yaml ps
printf '%s %s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$TAG" >> releases.log
rm -rf src-checkout
```

Esse caminho não usa o `deploy.sh`, porque ele faz `pull` do GHCR e as imagens ainda não estão lá. Confira as rotas como no deploy automático:

```bash
curl -s -o /dev/null -w '%{http_code}\n' https://<ip>.sslip.io/
curl -s -o /dev/null -w '%{http_code}\n' https://<ip>.sslip.io/webhooks/whatsapp
```

O primeiro deve responder `200` e o segundo `403`. A primeira emissão do certificado leva alguns segundos. Se o Let's Encrypt recusar o `sslip.io` por limite de emissão, o Caddy tenta outro emissor ACME sozinho. Se continuar falhando, a saída é um domínio próprio, o que precisa de decisão do time.

## Deploy manual e rollback

Deploy manual de uma tag publicada, como `deploy` na VM:

```bash
/opt/proconchat/deploy/deploy.sh <sha>
```

Rollback para a versão anterior:

```bash
tail -n 5 /opt/proconchat/releases.log
/opt/proconchat/deploy/deploy.sh <sha-anterior>
```

Quando o `deploy.yml` estiver em `main` (branch padrão do repositório), o rollback também pode ser feito em **Actions → Deploy → Run workflow**, com o campo `image_tag` preenchido com o SHA anterior. Com `image_tag`, o CI e o build são pulados e só o deploy roda. Antes disso o botão não aparece, porque o GitHub só mostra o `workflow_dispatch` de workflows que estão na branch padrão.

**Migrations não voltam no rollback.** O schema continua o da versão mais nova. O rollback de código só é seguro se a migration nova for compatível com o código anterior. Desfazer a última migration é manual e precisa de backup antes:

```bash
cd /opt/proconchat
export IMAGE_TAG="$(tail -n 1 releases.log | cut -d' ' -f2)"
./deploy/backup.sh
docker compose -f compose.prod.yaml run --rm migrate npm run db:rollback
```

## Backup e restauração

`deploy/backup.sh` roda `pg_dump -Fc` dentro do container `postgres` e grava `/opt/proconchat/backups/proconchat-AAAA-MM-DD.dump` com permissão `600`. O arquivo só recebe o nome final se o `pg_dump` terminar sem erro. Depois apaga os dumps mais antigos que `BACKUP_RETENTION_DAYS` (padrão 7).

Agendar no `cron` do usuário `deploy`, uma vez por dia:

```bash
crontab -e
```

Linha do `crontab`:

```text
30 3 * * * /opt/proconchat/deploy/backup.sh >> /opt/proconchat/backups/backup.log 2>&1
```

Conferir no dia seguinte:

```bash
ls -l /opt/proconchat/backups/
```

**Retenção e LGPD.** O dump contém o telefone criptografado dos agendamentos, o hash do telefone das sessões e o CPF em hash e mascarado. Com 7 dias de retenção, um telefone apagado ao fim do agendamento (decisão 002) sobrevive no máximo 7 dias nos backups. Isso faz parte da política de retenção, e o restante dela é da #69.

**Não há cópia fora da VM.** Os dumps ficam só no disco da VM. Perder a VM ou a conta Oracle perde também os backups. A cópia externa (por exemplo, Object Storage da Oracle) ficou para depois.

Para copiar um dump para a sua máquina (por exemplo, antes de mexer na VM):

```bash
scp -i ~/.ssh/proconchat_oci ubuntu@<ip>:/opt/proconchat/backups/proconchat-AAAA-MM-DD.dump .
```

O usuário `ubuntu` precisa de `sudo` para ler a pasta. Se o `scp` negar, copie antes com `sudo cp` para `/tmp` e ajuste o dono.

### Conferir um dump num banco temporário

```bash
cd /opt/proconchat
export IMAGE_TAG="$(tail -n 1 releases.log | cut -d' ' -f2)"
docker compose -f compose.prod.yaml exec -T postgres sh -c 'createdb -U "$POSTGRES_USER" restore_test'
docker compose -f compose.prod.yaml exec -T postgres sh -c 'pg_restore --no-owner -U "$POSTGRES_USER" -d restore_test' < backups/proconchat-AAAA-MM-DD.dump
docker compose -f compose.prod.yaml exec -T postgres sh -c 'psql -U "$POSTGRES_USER" -d restore_test -Atc "select count(*) from categories; select count(*) from questions; select count(*) from sessions"'
docker compose -f compose.prod.yaml exec -T postgres sh -c 'dropdb -U "$POSTGRES_USER" restore_test'
```

As contagens precisam bater com as do banco `proconchat`.

### Restaurar o banco de produção

Pare quem escreve no banco, restaure por cima e suba de novo:

```bash
cd /opt/proconchat
export IMAGE_TAG="$(tail -n 1 releases.log | cut -d' ' -f2)"
docker compose -f compose.prod.yaml stop caddy gateway backend
docker compose -f compose.prod.yaml exec -T postgres sh -c 'pg_restore --clean --if-exists --no-owner -U "$POSTGRES_USER" -d "$POSTGRES_DB"' < backups/proconchat-AAAA-MM-DD.dump
docker compose -f compose.prod.yaml up -d
```

## Webhook na Meta

1. No app da Meta, em **WhatsApp → Configuração → Webhook**, clique em **Editar**.
2. **URL de callback:** `https://<ip>.sslip.io/webhooks/whatsapp`.
3. **Verificar token:** o `WHATSAPP_VERIFY_TOKEN` do `.env` da VM.
4. Clique em **Verificar e salvar** e assine o campo `messages`.
5. Mande uma mensagem ao número da equipe e confira a resposta no WhatsApp e o log do gateway:

```bash
cd /opt/proconchat
export IMAGE_TAG="$(tail -n 1 releases.log | cut -d' ' -f2)"
docker compose -f compose.prod.yaml logs --tail 50 gateway
```

O log deve mostrar `processed`, sem telefone, texto ou token.

## Como os devs testam o WhatsApp real

- O número da equipe aponta para a produção, que acompanha `develop`. O WhatsApp real é testado depois do merge em `develop`.
- Localmente, cada dev testa o webhook com `curl` assinado (README do gateway, "Teste manual com `curl`").
- Túnel (`cloudflared`, `ngrok`) só serve para quem usa um app de teste próprio na Meta. O número da equipe não sai da produção.
- Um problema que só aparece com o WhatsApp real é investigado pelos logs da produção, que não têm dado pessoal.

## Diagnóstico

Os comandos do Compose precisam de `IMAGE_TAG`. Use a última tag do `releases.log`:

```bash
cd /opt/proconchat
export IMAGE_TAG="$(tail -n 1 releases.log | cut -d' ' -f2)"
docker compose -f compose.prod.yaml ps -a
docker compose -f compose.prod.yaml logs --tail 100 backend
docker compose -f compose.prod.yaml logs --tail 100 gateway
docker compose -f compose.prod.yaml logs --tail 100 caddy
docker compose -f compose.prod.yaml logs migrate seed
tail -n 10 releases.log
```

Disco (não há alerta automático; olhe quando passar de 80%):

```bash
df -h /
docker system df
```

Os logs dos containers usam `json-file` com 3 arquivos de 10 MB por serviço, então não enchem o disco.

Depois de um reinício da VM (`sudo reboot`), confira com `docker compose ps` se todos os serviços de longa duração voltaram.

Casos comuns:

| Sintoma | Causa provável |
|---|---|
| Job de deploy falha no `pull` com `denied` | Pacote do GHCR ainda privado |
| `backend` ou `gateway` não ficam `healthy` | Variável obrigatória faltando no `.env` (o serviço encerra na inicialização) ou `migrate` falhou. Veja `logs` |
| Verificação pública falha com o resto `healthy` | Certificado ainda não emitido, portas 80/443 fechadas na security list ou no `iptables`, ou IP trocado |
| Job falha na conexão SSH | `DEPLOY_KNOWN_HOSTS` desatualizado (VM recriada) ou chave de deploy removida de `authorized_keys` |

# Produção: VM, deploy contínuo e operação

Guia do ambiente de produção (issue #51). Ele cobre a criação da VM, o deploy automático pelo GitHub Actions, o deploy manual, o rollback, o backup e o diagnóstico. Nenhum valor real de segredo vai neste arquivo.

## Visão geral

- Uma VM na AWS (EC2 `t4g.small`, `us-east-2`) roda a stack com Docker Compose a partir de `compose.prod.yaml`.
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
| Provedor | Amazon Web Services (EC2), conta no plano **Free** com US$ 100 de crédito, válido até 10/04/2027 |
| Região | `us-east-2` (Ohio) |
| Instância | `t4g.small` (2 vCPU ARM Graviton, 2 GB de RAM), arm64, mais 2 GB de swap |
| Sistema | Ubuntu 24.04 arm64 (AMI da Canonical) |
| Disco | gp3 de 40 GB, criptografado |
| Metadados | IMDSv2 obrigatório |
| Endereço | Elastic IP `3.150.166.93`, ou seja, `3.150.166.93.sslip.io` |
| Firewall | Security group `proconchat-prod` (22, 80 e 443) e `ufw` no host com as mesmas portas |
| Custo | Cerca de US$ 19 por mês (instância ≈ US$ 12,30, disco ≈ US$ 3,20, IPv4 público ≈ US$ 3,65), pago pelo crédito |

**Por que `t4g.small`:**

- O plano Free só aceita alguns tipos de instância. A `t4g.large` (8 GB) foi recusada.
- Os tipos de 8 GB aceitos no plano Free (`m7i-flex.large`, `c7i-flex.large`) esgotariam o crédito antes da entrega de 23/11/2026.
- Com cerca de US$ 19 por mês, o crédito dura até meados de março de 2027.
- 2 GB bastam para a stack sem o Ollama. O swap de 2 GB evita que um pico de memória derrube um serviço.

**Ollama desligado.** Em produção, `COMPOSE_PROFILES` fica vazio e o `ollama` e o `llm-pull` não sobem. O modelo precisa de 3 a 4 GB só para ele. O LLM ainda não está no fluxo; o impacto está comentado na #66. Ele volta numa VM maior ou na migração para a Oracle. Basta pôr `COMPOSE_PROFILES=llm` no `.env` e rodar o deploy de novo.

**Dados fora do Brasil (LGPD).** A região é nos EUA. Isso foi aceito para o projeto acadêmico e fica registrado aqui. Na passagem para o PROCON (#70), a região e o provedor precisam ser revistos.

**Quando o crédito acaba.** No plano Free não há cobrança no cartão. Quando o crédito de US$ 100 acaba ou o prazo de 10/04/2027 chega, o que vier primeiro, a AWS para os recursos e fecha a conta. Ela dá um prazo para migrar para o plano pago (com cobrança no cartão) antes de apagar os dados; confira o prazo atual em **Billing and Cost Management → Free plan**. Como os backups ficam só na VM, copie um dump para fora antes desse ponto. Acompanhe o saldo em **Billing and Cost Management → Credits**.

**Acesso à conta.** A conta está em nome de Luiz Felipe. Para outro membro do time administrar, crie um usuário no IAM Identity Center com o conjunto de permissões `AdministratorAccess`. Até lá, só uma pessoa acessa a conta.

As imagens são geradas só para a arquitetura da VM, pelas variáveis `DEPLOY_PLATFORM=linux/arm64` e `DEPLOY_RUNNER=ubuntu-24.04-arm`. Para uma VM amd64, troque para `linux/amd64` e `ubuntu-latest`.

Versões fixas em produção: `postgres:15-alpine`, `caddy:2-alpine` e `ollama/ollama:0.40.2`. Nenhuma imagem usa `latest`.

**Alternativa futura: Oracle Cloud Always Free.** A Ampere A1 (até 4 OCPU e 24 GB, sem custo e sem prazo) foi a primeira escolha, mas ficou sem capacidade em São Paulo. Se a capacidade aparecer, a migração resolve o Ollama, a região e o fim do crédito. Na Oracle, a conta precisa ser convertida para Pay As You Go (sem isso, a VM ociosa pode ser recuperada), e a imagem Ubuntu vem com `iptables` que bloqueia tudo menos a porta 22, além da *security list* da VCN. O pipeline não muda, porque a A1 também é arm64.

## Chaves SSH

São duas chaves, com papéis diferentes. Nunca use a mesma para os dois.

| Chave | Arquivo | Usuário na VM | Quem usa |
|---|---|---|---|
| Administração | `~/.ssh/proconchat_oci` (ed25519), key pair `proconchat-oci-admin` na AWS | `ubuntu` (padrão da AMI, com `sudo`) | Só pessoas, para administrar a VM |
| Deploy | `~/.ssh/proconchat_deploy` (ed25519, gerada à parte) | `deploy` (sem `sudo`, no grupo `docker`) | O GitHub Actions, pelo segredo `DEPLOY_SSH_KEY`, e o deploy manual |

O grupo `docker` equivale a root na VM, por isso a chave do GitHub é exclusiva do deploy e pode ser revogada sem afetar o acesso de administração. Não há restrição por IP, porque os runners do GitHub não têm IP fixo.

Gerar a chave de deploy no WSL, sem senha (o Actions não digita senha):

```bash
ssh-keygen -t ed25519 -f ~/.ssh/proconchat_deploy -C proconchat-deploy-github -N ""
```

## Criar a VM pela AWS CLI

Os comandos abaixo recriam a VM do zero, na conta e na região certas. Rode no WSL, com a AWS CLI configurada num perfil da conta. Antes de rodar, confira no console que a conta continua no plano Free: no plano pago, esses recursos são cobrados no cartão.

```bash
export AWS_PROFILE=<perfil> AWS_REGION=us-east-2

aws ec2 import-key-pair --key-name proconchat-oci-admin --public-key-material fileb://~/.ssh/proconchat_oci.pub

SG_ID="$(aws ec2 create-security-group --group-name proconchat-prod --description "ProconChat prod: 22 80 443" --query GroupId --output text)"
for port in 22 80 443; do
  aws ec2 authorize-security-group-ingress --group-id "$SG_ID" --protocol tcp --port "$port" --cidr 0.0.0.0/0
done

AMI_ID="$(aws ssm get-parameter --name /aws/service/canonical/ubuntu/server/24.04/stable/current/arm64/hvm/ebs-gp3/ami-id --query Parameter.Value --output text)"

INSTANCE_ID="$(aws ec2 run-instances \
  --image-id "$AMI_ID" \
  --instance-type t4g.small \
  --key-name proconchat-oci-admin \
  --security-group-ids "$SG_ID" \
  --block-device-mappings '[{"DeviceName":"/dev/sda1","Ebs":{"VolumeSize":40,"VolumeType":"gp3","Encrypted":true,"DeleteOnTermination":true}}]' \
  --metadata-options HttpTokens=required,HttpEndpoint=enabled \
  --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=proconchat-prod}]' \
  --query 'Instances[0].InstanceId' --output text)"
aws ec2 wait instance-running --instance-ids "$INSTANCE_ID"

ALLOC_ID="$(aws ec2 allocate-address --domain vpc --tag-specifications 'ResourceType=elastic-ip,Tags=[{Key=Name,Value=proconchat-prod}]' --query AllocationId --output text)"
aws ec2 associate-address --instance-id "$INSTANCE_ID" --allocation-id "$ALLOC_ID"
aws ec2 describe-addresses --allocation-ids "$ALLOC_ID" --query 'Addresses[0].PublicIp' --output text
```

- A AMI vem do parâmetro público do SSM da Canonical, então é sempre a imagem atual do Ubuntu 24.04 arm64.
- O Elastic IP não muda ao parar e ligar a VM. O endereço do sistema é `<ip>.sslip.io` (o `sslip.io` resolve o nome para o próprio IP, sem cadastro de DNS).
- Um Elastic IP sem instância associada também é cobrado. Ao desmontar o ambiente, libere-o com `aws ec2 release-address`.

Teste o acesso:

```bash
ssh -i ~/.ssh/proconchat_oci ubuntu@<ip>
```

## Firewall

Dois níveis, os dois só com 22, 80 e 443:

1. **Security group `proconchat-prod`**, criado acima. É a barreira principal.
2. **`ufw` no host**, como `ubuntu`:

```bash
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw --force enable
sudo ufw status verbose
```

O Docker publica portas direto no `iptables`, sem passar pelo `ufw`. Por isso só o `caddy` publica portas no `compose.prod.yaml`, e o security group continua sendo o que vale para o resto.

Para conferir de fora da VM, só 22, 80 e 443 devem aparecer abertas:

```bash
nmap -Pn <ip>
```

## Preparar a VM

### Atualizar o sistema, endurecer o SSH e criar o swap

```bash
sudo apt-get update && sudo apt-get -y upgrade
printf 'PermitRootLogin no\nPasswordAuthentication no\nKbdInteractiveAuthentication no\n' | sudo tee /etc/ssh/sshd_config.d/99-proconchat.conf
sudo sshd -t && sudo systemctl reload ssh
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
free -m
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
| `COMPOSE_PROFILES` | Vazio na VM atual de 2 GB (sem Ollama). `llm` numa VM com memória para o Ollama |
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

Push numa branch diferente de `DEPLOY_BRANCH`, CI falho ou PR não geram imagem nem deploy. O job `deploy` usa o grupo de concorrência `deploy-production`: um deploy em andamento nunca é cancelado, e o próximo espera. Se chegarem vários enquanto um roda, só o mais recente fica na fila. Como a fila vale só para o job `deploy`, uma execução cujos jobs são pulados (por exemplo, push em `main` com `DEPLOY_BRANCH=develop`) não entra nela nem cancela um deploy pendente.

O `deploy.sh <tag>`:

1. baixa só as imagens que ainda não existem na VM (`docker compose pull --policy missing`). Uma tag nova sempre falta e é baixada; como as tags são SHAs imutáveis, uma tag que já está na VM não muda. `postgres:15-alpine` e `caddy:2-alpine` não são atualizados sozinhos depois do primeiro `pull`. Para pegar correções dessas imagens, rode antes de um deploy:

   ```bash
   cd /opt/proconchat
   export IMAGE_TAG="$(tail -n 1 releases.log | cut -d' ' -f2)"
   docker compose -f compose.prod.yaml pull postgres caddy
   ./deploy/deploy.sh "$IMAGE_TAG"
   ```

2. recria os serviços com `IMAGE_TAG=<tag>` (`up -d --remove-orphans`). O `migrate` aplica as migrations novas e o `seed` roda antes do `backend`; se o `migrate` falhar, o `backend` novo não sobe;
3. espera `backend` e `gateway` ficarem `healthy` (até `DEPLOY_WAIT_TIMEOUT`, padrão 300 s). Não espera o `llm-pull`;
   depois recarrega o Caddy (`caddy reload`), porque o `Caddyfile` é montado como arquivo e uma mudança nele não recria o container. O `scp` do workflow sobrescreve o arquivo no lugar, então o container vê o conteúdo novo. Se o `Caddyfile` for trocado por outro meio que crie um arquivo novo (por exemplo `mv`), recrie o Caddy com `docker compose -f compose.prod.yaml up -d --force-recreate caddy`;
4. confere pelo endereço público que `/` responde 200 e `/webhooks/whatsapp` responde 403, com até 12 tentativas;
5. registra `<data UTC> <tag>` em `/opt/proconchat/releases.log`;
6. remove as imagens sem container que chegaram à VM (por `pull` ou `build`) há mais de uma semana (`docker image prune -af --filter "until=168h"`). Com o armazenamento de imagens do containerd, padrão do Docker na VM, o `until` conta a partir da chegada da imagem na VM, não da data de criação dela. Imagens em uso nunca são removidas, e as da última semana ficam para um rollback rápido; uma tag mais antiga é baixada de novo do GHCR.

Qualquer falha sai com código diferente de 0, e o job fica vermelho. Sem tag, ele sai com código 2 sem mexer nos containers.

### Trocar a branch de deploy no fim do semestre

Em **Settings → Secrets and variables → Actions → Variables**, mude `DEPLOY_BRANCH` de `develop` para `main`. O próximo push em `main` faz deploy, e `develop` deixa de fazer. Não é preciso editar o YAML.

## Primeiro deploy

O deploy automático só existe quando o `deploy.yml` estiver em `develop`. Há dois caminhos:

**A. Pelo merge do PR da #51 (padrão).** Com a VM preparada, o `.env` criado, os segredos e as variáveis no GitHub e a liberação do GHCR feita, o merge do PR em `develop` dispara o workflow. Depois do primeiro build, torne os três pacotes públicos e, se o job de deploy tiver falhado no `pull`, rode-o de novo em **Actions → (execução) → Re-run failed jobs**.

**B. Antes do merge, com as imagens geradas na própria VM.** Serve para subir e validar a produção antes de o PR entrar, sem push e sem GHCR. A VM já é arm64, então o build é nativo. Com 2 GB de RAM, gere uma imagem por vez e com a stack parada.

No WSL, na raiz do repositório, envie o commit atual (só o que está commitado) para a VM:

```bash
SHA="$(git rev-parse HEAD)"
git archive --format=tar HEAD compose.prod.yaml deploy src/backend src/gateway src/frontend \
  | ssh -i ~/.ssh/proconchat_deploy deploy@<ip> "mkdir -p /opt/proconchat/build-$SHA && tar -x -C /opt/proconchat/build-$SHA"
echo "$SHA"
```

Na VM, como `deploy`, com o SHA impresso acima:

```bash
cd /opt/proconchat
SHA=<sha>
B="build-$SHA"
cp "$B/compose.prod.yaml" . && cp -r "$B/deploy" .
docker build --target runtime -t "ghcr.io/steel-hard/proconchat-backend:$SHA" "$B/src/backend"
docker build --target runtime -t "ghcr.io/steel-hard/proconchat-gateway:$SHA" "$B/src/gateway"
docker build --target runtime --build-arg VITE_API_URL= -t "ghcr.io/steel-hard/proconchat-frontend:$SHA" "$B/src/frontend"
docker builder prune -f
rm -rf "$B"
./deploy/deploy.sh "$SHA"
```

O `deploy.sh` baixa só as imagens que faltam (`pull --policy missing`). Como as três da tag já existem na VM, ele só baixa `postgres` e `caddy` e segue igual ao deploy automático.

A primeira emissão do certificado leva alguns segundos, e o `deploy.sh` tenta de novo enquanto isso. Se o Let's Encrypt recusar o `sslip.io` por limite de emissão, o Caddy tenta outro emissor ACME sozinho. Se continuar falhando, a saída é um domínio próprio, o que precisa de decisão do time.

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

**Migrations não voltam no rollback.** O schema continua o da versão mais nova. O rollback de código só é seguro se a migration nova for compatível com o código anterior. Desfazer a última migration é manual, precisa de backup antes e roda com a tag **nova**, a que ainda está no ar, porque só a imagem nova tem o arquivo da migration a desfazer. Só depois volte o código:

```bash
cd /opt/proconchat
export IMAGE_TAG="$(tail -n 1 releases.log | cut -d' ' -f2)"
./deploy/backup.sh
docker compose -f compose.prod.yaml run --rm migrate npm run db:rollback
./deploy/deploy.sh <sha-anterior>
```

O rollback usa o `compose.prod.yaml` e o `deploy/` atuais com as imagens da tag anterior. Se o rollback atravessar uma mudança nesses arquivos, copie a versão deles da tag anterior antes.

## Backup e restauração

`deploy/backup.sh` roda `pg_dump -Fc` dentro do container `postgres` e grava `/opt/proconchat/backups/proconchat-AAAA-MM-DD.dump` com permissão `600`. O arquivo só recebe o nome final se o `pg_dump` terminar sem erro. Depois apaga os dumps com `BACKUP_RETENTION_DAYS` dias ou mais (padrão 7), mantendo exatamente os dumps dos últimos N dias: com o padrão, o de hoje e os 6 anteriores.

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

**Retenção e LGPD.** O dump contém o telefone criptografado dos agendamentos, o hash do telefone das sessões e o CPF em hash e mascarado. Com 7 dias de retenção, um telefone apagado ao fim do agendamento (decisão 002) sobrevive menos de 7 dias nos backups: o dump mais antigo é apagado quando completa 7 dias. Isso faz parte da política de retenção, e o restante dela é da #69.

**Não há cópia fora da VM.** Os dumps ficam só no disco da VM. Perder a VM ou a conta AWS (por exemplo, no fim do crédito) perde também os backups. A cópia externa (por exemplo, um bucket S3) ficou para depois.

Para copiar um dump para a sua máquina (por exemplo, antes de mexer na VM):

```bash
scp -i ~/.ssh/proconchat_deploy deploy@<ip>:/opt/proconchat/backups/proconchat-AAAA-MM-DD.dump .
```

Guarde a cópia fora do repositório e apague-a quando não precisar mais (ela tem dados pessoais).

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
| Verificação pública falha com o resto `healthy` | Certificado ainda não emitido, portas 80/443 fechadas no security group ou no `ufw`, ou Elastic IP desassociado |
| Job falha na conexão SSH | `DEPLOY_KNOWN_HOSTS` desatualizado (VM recriada) ou chave de deploy removida de `authorized_keys` |

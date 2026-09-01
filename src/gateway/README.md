# 🚀 Evolution API - Docker Setup

Sistema de orquestração completo da **Evolution API** com **PostgreSQL** e **Redis** usando Docker Compose.

## 📋 Índice

- [Pré-requisitos](#pré-requisitos)
- [Início Rápido](#início-rápido)
- [Estrutura do Projeto](#estrutura-do-projeto)
- [Configuração](#configuração)
- [Execução](#execução)
- [Gerenciamento](#gerenciamento)
- [Acesso aos Serviços](#acesso-aos-serviços)
- [Troubleshooting](#troubleshooting)
- [Segurança](#segurança)
- [Backup e Restore](#backup-e-restore)

## 🔧 Pré-requisitos

- **Docker** (versão 20+)
- **Docker Compose** (versão 1.29+)
- **Git** (para clonar o repositório)
- Mínimo **1GB** de espaço em disco
- Portas disponíveis: `8080`, `5432`, `6379`

### Verificar Instalação

```bash
docker --version
docker-compose --version
```

## 🚀 Início Rápido

### 1. Configurar Variáveis de Ambiente

```bash
# Copiar o arquivo de exemplo
cp .env.example .env

# Editar as variáveis (especialmente as senhas)
nano .env
```

**⚠️ Alterar obrigatoriamente em produção:**

- `AUTHENTICATION_API_KEY`
- `POSTGRES_PASSWORD`
- `REDIS_PASSWORD`

### 2. Iniciar os Serviços

```bash
# Iniciar em background
docker-compose -f docker-compose.prod.yaml up -d

# Ou em foreground (para ver logs)
docker-compose -f docker-compose.prod.yaml up
```

### 3. Verificar Status

```bash
docker-compose -f docker-compose.prod.yaml ps
```

Aguarde até ver todos os containers com status **Up**.

## 📁 Estrutura do Projeto

```
gateway/
├── docker-compose.prod.yaml    # ⭐ Arquivo principal (3 serviços)
├── .env                        # Variáveis de ambiente (gitignored)
├── .env.example                # Exemplo de configuração
└── README.md                   # Este arquivo
```

**Serviços inclusos:**

- ✅ **Evolution API** (v2.1.1) na porta 8080
- ✅ **PostgreSQL** 15 Alpine na porta 5432
- ✅ **Redis** 7 Alpine na porta 6379

## ⚙️ Configuração

### Arquivo `.env`

O arquivo `.env` controla toda a configuração dos serviços:

```ini
# AUTENTICAÇÃO
AUTHENTICATION_API_KEY=mude-me

# REDIS (Cache)
CACHE_REDIS_ENABLED=true
CACHE_REDIS_URI=redis://:${REDIS_PASSWORD}@redis:6379/6
CACHE_REDIS_PREFIX_KEY=evolution
CACHE_REDIS_SAVE_INSTANCES=false
CACHE_LOCAL_ENABLED=false

# POSTGRESQL (Banco de Dados)
DATABASE_ENABLED=true
DATABASE_PROVIDER=postgresql
DATABASE_CONNECTION_URI=postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres:5432/evolution
DATABASE_CONNECTION_CLIENT_NAME=evolution_exchange

# Dados a salvar no banco
DATABASE_SAVE_DATA_INSTANCE=true
DATABASE_SAVE_DATA_NEW_MESSAGE=true
DATABASE_SAVE_MESSAGE_UPDATE=true
DATABASE_SAVE_DATA_CONTACTS=true
DATABASE_SAVE_DATA_CHATS=true
DATABASE_SAVE_DATA_LABELS=true
DATABASE_SAVE_DATA_HISTORIC=true
```

### Variáveis Opcionais (com valores padrão)

Defina estas no `.env` se quiser portas customizadas:

```ini
POSTGRES_USER=evolution
POSTGRES_PASSWORD=change_me_in_production
POSTGRES_PORT=5432

REDIS_PASSWORD=change_me_in_production
REDIS_PORT=6379

API_PORT=8080
```

## ▶️ Execução

### Iniciar Serviços

```bash
# Iniciar em background
docker-compose -f docker-compose.prod.yaml up -d

# Iniciar e ver logs em tempo real
docker-compose -f docker-compose.prod.yaml up

# Iniciar um serviço específico
docker-compose -f docker-compose.prod.yaml up -d postgres
docker-compose -f docker-compose.prod.yaml up -d redis
docker-compose -f docker-compose.prod.yaml up -d evolution-api
```

### Parar Serviços

```bash
# Parar (dados preservados)
docker-compose -f docker-compose.prod.yaml down

# Parar e remover volumes (CUIDADO: apaga dados)
docker-compose -f docker-compose.prod.yaml down -v

# Parar um serviço específico
docker-compose -f docker-compose.prod.yaml stop postgres
```

### Reiniciar Serviços

```bash
# Reiniciar todos
docker-compose -f docker-compose.prod.yaml restart

# Reiniciar um serviço
docker-compose -f docker-compose.prod.yaml restart evolution-api
```

## 🛠️ Gerenciamento

### Ver Logs

```bash
# Todos os serviços (tempo real)
docker-compose -f docker-compose.prod.yaml logs -f

# Seguir apenas Evolution API
docker-compose -f docker-compose.prod.yaml logs -f evolution-api

# Últimas 100 linhas
docker-compose -f docker-compose.prod.yaml logs --tail 100

# Com timestamp
docker-compose -f docker-compose.prod.yaml logs -t
```

### Ver Status

```bash
# Status de todos os containers
docker-compose -f docker-compose.prod.yaml ps

# Detalhes de um container
docker-compose -f docker-compose.prod.yaml ps postgres

# Verificar saúde
docker-compose -f docker-compose.prod.yaml ps --format "table {{.Service}}\t{{.Status}}"
```

### Executar Comandos

```bash
# Executar comando no container
docker-compose -f docker-compose.prod.yaml exec postgres psql -U evolution -d evolution

# Executar em background (sem TTY)
docker-compose -f docker-compose.prod.yaml exec -T postgres pg_dump -U evolution evolution

# Acessar shell do container
docker-compose -f docker-compose.prod.yaml exec evolution-api /bin/sh
```

## 🌐 Acesso aos Serviços

| Serviço                | URL/Host                       | Porto | Autenticação                      |
| ----------------------- | ------------------------------ | ----- | ----------------------------------- |
| **Evolution API** | http://localhost               | 8080  | `AUTHENTICATION_API_KEY`          |
| **Swagger/Docs**  | http://localhost:8080/api/docs | 8080  | -                                   |
| **PostgreSQL**    | localhost                      | 5432  | `POSTGRES_USER:POSTGRES_PASSWORD` |
| **Redis CLI**     | Dentro da rede Docker          | 6379  | `REDIS_PASSWORD`                  |

### PostgreSQL (CLI)

```bash
# Acessar console PostgreSQL
docker-compose -f docker-compose.prod.yaml exec postgres psql -U evolution -d evolution

# Comandos úteis
\dt                           # Listar tabelas
\l                            # Listar bancos
SELECT * FROM pg_tables WHERE schemaname='public';  # Tabelas públicas
\q                            # Sair
```

### Redis (CLI)

```bash
# Acessar console Redis
docker-compose -f docker-compose.prod.yaml exec redis redis-cli

# Autenticar (se houver senha)
AUTH sua_senha_redis

# Usar banco 6 (configurado para Evolution)
SELECT 6

# Comandos úteis
PING                          # Teste de conexão
KEYS *                        # Ver todas as chaves
DBSIZE                        # Tamanho do banco
FLUSHDB                       # Limpar banco atual (⚠️)
INFO                          # Informações do Redis
```

## 🔍 Troubleshooting

### "Erro: Porta já em uso"

```bash
# Encontrar processo usando a porta
lsof -i :8080    # Evolution API
lsof -i :5432    # PostgreSQL
lsof -i :6379    # Redis

# Matar processo
kill -9 <PID>

# Ou alterar portas no .env
API_PORT=8081
POSTGRES_PORT=5433
REDIS_PORT=6380
```

### "Evolution API não consegue conectar ao banco"

```bash
# Verificar se Postgres está saudável
docker-compose -f docker-compose.prod.yaml logs postgres

# Testar conexão manualmente
docker-compose -f docker-compose.prod.yaml exec postgres \
  psql -U evolution -d evolution -c "SELECT 1"

# Verificar se a URI está correta
grep DATABASE_CONNECTION_URI .env
```

### "Redis connection refused"

```bash
# Verificar status
docker-compose -f docker-compose.prod.yaml logs redis

# Testar ping
docker-compose -f docker-compose.prod.yaml exec redis redis-cli ping

# Com autenticação
docker-compose -f docker-compose.prod.yaml exec redis \
  redis-cli -a $REDIS_PASSWORD ping
```

### "Containers não iniciam"

```bash
# Ver erro detalhado
docker-compose -f docker-compose.prod.yaml logs

# Reconstruir sem cache
docker-compose -f docker-compose.prod.yaml build --no-cache

# Resetar tudo
docker-compose -f docker-compose.prod.yaml down -v
docker-compose -f docker-compose.prod.yaml up -d
```

### "Banco de dados corrompido"

```bash
# Resetar base de dados (⚠️ apaga tudo!)
docker-compose -f docker-compose.prod.yaml exec postgres \
  psql -U evolution -d evolution -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"

# Ou remover volume completamente
docker-compose -f docker-compose.prod.yaml down -v
docker-compose -f docker-compose.prod.yaml up -d
```

## 💾 Backup e Restore

### Fazer Backup do PostgreSQL

```bash
# Backup SQL do banco de dados
docker-compose -f docker-compose.prod.yaml exec -T postgres \
  pg_dump -U evolution evolution > backup_$(date +%Y%m%d_%H%M%S).sql

# Verificar tamanho do backup
ls -lh backup_*.sql
```

### Backup de Volumes (Completo)

```bash
# Backup compactado de todos os dados
docker run --rm \
  -v evolution_postgres_data:/data/postgres \
  -v evolution_redis_data:/data/redis \
  -v evolution_instances:/data/instances \
  -v $(pwd):/backup \
  alpine tar czf /backup/evolution_full_$(date +%Y%m%d_%H%M%S).tar.gz /data
```

### Restaurar de Backup

```bash
# Restaurar banco PostgreSQL do SQL
cat backup_20260831_120000.sql | \
  docker-compose -f docker-compose.prod.yaml exec -T postgres \
  psql -U evolution evolution

# Restaurar volumes completos (⚠️ sobrescreve dados atuais)
docker run --rm \
  -v evolution_postgres_data:/data/postgres \
  -v evolution_redis_data:/data/redis \
  -v evolution_instances:/data/instances \
  -v $(pwd):/backup \
  alpine tar xzf /backup/evolution_full_20260831_120000.tar.gz -C /data --strip-components=1
```

### Agendamento Automático (Cron)

```bash
# Adicionar ao crontab (backup diário às 3AM)
crontab -e

# Adicionar linha:
0 3 * * * cd /home/fivo/Projetos/ProconChat_Jacarei/src/gateway && \
  docker-compose -f docker-compose.prod.yaml exec -T postgres \
  pg_dump -U evolution evolution > backup_$(date +\%Y\%m\%d).sql
```

## 🔒 Segurança

### ✅ Checklist de Produção

- [ ] Alterar `AUTHENTICATION_API_KEY` - Gerar chave segura
- [ ] Alterar `POSTGRES_PASSWORD` - Mínimo 16 caracteres
- [ ] Alterar `REDIS_PASSWORD` - Mínimo 16 caracteres
- [ ] Usar HTTPS com proxy reverso (nginx/traefik)
- [ ] Configurar firewall para restringir portas
- [ ] Ativar backups automáticos
- [ ] Monitorar logs e saúde dos containers
- [ ] Usar secrets do Docker em vez de `.env` (Swarm/K8s)
- [ ] Atualizar imagens regularmente

### Gerar Chaves Seguras

```bash
# Senha forte de 32 bytes
openssl rand -base64 32

# Chave API aleatória
python3 -c "import secrets; print(secrets.token_urlsafe(32))"

# Usando /dev/urandom
head -c 32 /dev/urandom | base64
```

### Exemplo `.env` Seguro

```ini
AUTHENTICATION_API_KEY=X9kL2mN4oP6qR8sT0uV2wX4yZ6aB8cD0
POSTGRES_PASSWORD=Tr0ng_P@ssw0rd_2026_!#$%
REDIS_PASSWORD=R3d1s_K3y_S3cur3_P@ss_!

```

### Proxy Reverso com Nginx (Opcional)

```nginx
server {
    listen 443 ssl http2;
    server_name api.seu-dominio.com;

    ssl_certificate /etc/letsencrypt/live/api.seu-dominio.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.seu-dominio.com/privkey.pem;

    location / {
        proxy_pass http://evolution-api:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## 📊 Monitoramento

### Verificar Saúde dos Serviços

```bash
# Status geral
docker-compose -f docker-compose.prod.yaml ps

# Verificação de saúde em JSON
docker inspect evolution_api --format='{{json .State.Health}}'

# Com formatação
docker inspect evolution_api --format='{{json .State.Health}}' | jq
```

### Uso de Recursos

```bash
# Monitoramento em tempo real
docker stats

# Limite de recursos (adicionar ao docker-compose.prod.yaml)
services:
  evolution-api:
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 2G
        reservations:
          cpus: '1'
          memory: 1G
```

### Logs com Timestamp

```bash
# Todos os serviços com timestamp
docker-compose -f docker-compose.prod.yaml logs --timestamps

# Seguir logs com filtro (últimas 100 linhas)
docker-compose -f docker-compose.prod.yaml logs --tail 100 -f evolution-api
```

## 📚 Referências

- 📖 [Evolution API - GitHub](https://github.com/EvolutionAPI/evolution-api)
- 🐳 [Docker Compose Documentation](https://docs.docker.com/compose/)
- 🐘 [PostgreSQL 15 Documentation](https://www.postgresql.org/docs/15/)
- 🔴 [Redis 7 Documentation](https://redis.io/documentation)


## 🆘 Troubleshooting Rápido

| Problema               | Solução                                               |
| ---------------------- | ------------------------------------------------------- |
| Porta em uso           | `lsof -i :8080` e `kill -9 <PID>`                   |
| API não conecta ao BD | Verificar `DATABASE_CONNECTION_URI` no `.env`       |
| Redis recusa conexão  | Confirmar `REDIS_PASSWORD` e permissões              |
| Dados perdidos         | Verificar volumes: `docker volume ls`                |

## 📞 Suporte

Para mais ajuda:

1. Verifique os logs completos: `docker-compose -f docker-compose.prod.yaml logs -f`
2. Teste conexões manualmente com CLI
3. Valide o arquivo `.env` com: `docker-compose -f docker-compose.prod.yaml config`
4. Reinicie com: `docker-compose -f docker-compose.prod.yaml restart`

---

**Última atualização:** 2026-08-31
**Versão Evolution API:** v2.1.1
**Docker Compose:** 3.9

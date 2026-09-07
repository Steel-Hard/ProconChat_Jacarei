# Banco de dados e migrations — issue #11

## Decisão

Usamos **node-pg-migrate 8.0.4**, versão estável compatível com Node >=20.11,
com migrations SQL. Ele registra versões em `public.pgmigrations`, controla a
ordem, usa transação para o lote pendente e trava execuções concorrentes.
Isso permite reaproveitar o SQL da #9 sem introduzir um ORM ou manter um executor
próprio. Knex adicionaria um query builder que o backend não utiliza; scripts
numerados sozinhos ainda precisariam de histórico, transações e locking.

Referências: [ferramenta](https://github.com/salsita/node-pg-migrate/tree/v8.0.4),
[CLI](https://salsita.github.io/node-pg-migrate/cli).

As sete migrations em `src/backend/db/migrations` contêm uma cópia versionada do
SQL aprovado: Users, Categories, Questions, RequiredDocuments, Sessions,
Interactions e Appointments. Os nomes sem aspas são convertidos para minúsculas
pelo PostgreSQL (por exemplo, `RequiredDocuments` vira `requireddocuments`).
Cada migration tem `Up Migration` e `Down Migration`, incluindo remoção dos enums.

Os arquivos usam prefixos sequenciais `01` a `07`, em ordem de dependência.
O node-pg-migrate 8 aceita essa ordenação numérica, mas imprime
`Can't determine timestamp for 01` (e os demais prefixos), pois seu formato
padrão é timestamp. Esse aviso não impede a execução; a sequência foi validada
com o teste real de migrations.

## Subir em ambiente limpo

Com Docker Desktop iniciado, execute na raiz do repositório:

```sh
docker compose up -d --build
docker compose ps -a
docker compose logs migrate
```

O PostgreSQL 15 usa o volume `postgres_data`. Após o healthcheck, o serviço
temporário `migrate` aplica as versões pendentes e termina com código 0.
Somente então o backend inicia. Não montamos scripts em
`docker-entrypoint-initdb.d`: eles só executam na primeira criação do volume e
não resolvem atualizações posteriores. Não use apenas `up postgres` esperando
que as migrations sejam executadas.

Conexão local padrão: `postgresql://proconchat:proconchat_dev@localhost:5433/proconchat`.
Dentro dos containers, o host é `postgres` e a porta é `5432`. Backend disponível
em `http://localhost:3000/health`. As portas são publicadas apenas em localhost.

O Compose aceita `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_PORT` e
`BACKEND_PORT` pelo ambiente ou por um `.env` na raiz. Os valores padrão são para
desenvolvimento local. Se a senha contiver caracteres reservados de URL, ajuste
a composição de `DB_URL` com a codificação correspondente. Alterar credenciais
de inicialização não altera usuários de um volume PostgreSQL já existente.

## Backend local e mudanças futuras

Em `src/backend`, copie `.env.example` para `.env` e execute:

```sh
npm ci
npm run db:migrate
npm run dev
```

Para criar uma mudança nova:

```sh
npm run db:migration:create -- adicionar_campo
npm run db:migrate
```

O comando gera um timestamp: antes de aplicar o arquivo, substitua esse prefixo
pelo próximo número disponível (`08`, `09`, `10` etc.), sem repetir números.
Preencha os blocos up/down do arquivo gerado. Nunca edite uma migration já
aplicada em ambiente compartilhado: adicione uma nova versão. `db/schema` é a
referência do desenho original; o histórico executável está em `db/migrations`.

Em Docker, após obter migrations novas:

```sh
docker compose build migrate backend
docker compose run --rm migrate
docker compose up -d backend
```

Reexecutar `db:migrate` preserva tabelas e dados já existentes. `docker compose down`
também preserva o volume; não acrescente `-v` se quiser manter seus dados.

`npm run db:rollback` desfaz **uma** migration e pode remover dados. Use apenas
quando a reversão estiver planejada; faça backup de bancos compartilhados.

Um banco criado manualmente com o SQL antigo não possui `pgmigrations`: não
aplique estas migrations por cima nem marque versões como executadas sem antes
comparar integralmente o schema. Para desenvolvimento, prefira um projeto Compose
novo (`docker compose -p outro-nome ...`) com portas livres e volume independente.

## Integração com a issue #6

Este Compose cobre banco, migrations e backend. Na junção com a branch `evolution`,
preserve Redis/Evolution e suas configurações; substitua os mounts de SQL de
inicialização pelo serviço `migrate` e faça o backend depender de
`service_completed_successfully`. Os nomes `postgres`, `postgres_data` e a porta
local 5433 seguem aquela branch. A carga de conteúdo real pertence à issue #12.

## Validação

```sh
# Em src/backend
npm run build
npm test
```

Para o teste real de migrations, configure `DB_TEST_URL` com a conexão de um
PostgreSQL de desenvolvimento e um usuário com permissão `CREATEDB`:

```powershell
$env:DB_TEST_URL='postgresql://proconchat:proconchat_dev@localhost:5433/proconchat'
npm run test:db
```

O teste cria um banco temporário com nome aleatório e o remove ao terminar;
não limpa o banco informado. Verifica criação das sete tabelas, chaves
estrangeiras, UUIDs, enums, unicidade de agendamento ativo, repetição sem perda
de dados e rollback completo seguido de reaplicação.

Validação local realizada em 06/09/2026: build TypeScript e 14 testes aprovados;
teste real de migrations aprovado; Compose iniciado com volume novo, migration
encerrada com código 0 e `/health` respondendo 200. Após `down` e `up`, o histórico
de versões (inclusive datas de execução) permaneceu igual e o executor informou
`No migrations to run!`. Ambiente de verificação: projeto
`proconchat-issue11-check`, PostgreSQL na porta 55433 e backend na 53011.

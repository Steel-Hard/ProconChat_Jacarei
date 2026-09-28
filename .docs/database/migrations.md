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

Existem 12 migrations em `src/backend/db/migrations`: `01` a `07` criam as
tabelas da Sprint 1, `08`, `09` e `010` ajustam `Sessions`,
`11_sprint2_schema.sql` é o schema da Sprint 2 (#52) e
`12_short_text_checks.sql` ajusta o limite dos títulos curtos (#61). O que cada uma faz está
em [`database.md`](database.md#histórico-das-migrations). Os nomes sem aspas
são convertidos para minúsculas pelo PostgreSQL (por exemplo,
`RequiredDocuments` vira `requireddocuments`). Cada migration tem
`Up Migration` e `Down Migration`, incluindo remoção dos enums.

**Numeração.** O node-pg-migrate 8 ordena os arquivos pelo **prefixo lido como
número**, não como texto: `010_alter_sessions.sql` é a versão 10, e um arquivo
`10_...` empataria com ela. Por isso a migration da Sprint 2 é a `11_`, e a
**próxima livre é `13_`**. Não renomeie a `010`: ela já está registrada com esse
nome em `pgmigrations` nos bancos existentes. O executor imprime
`Can't determine timestamp for 01` (e os demais prefixos), pois seu formato
padrão é timestamp. Esse aviso não impede a execução.

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
pelo próximo número disponível (hoje `13_`), sem repetir números.
Preencha os blocos up/down do arquivo gerado. Nunca edite uma migration já
aplicada em ambiente compartilhado: adicione uma nova versão. `db/schema` tem o
`CREATE TABLE` consolidado de cada tabela no estado atual, e deve ser atualizado
junto com a migration; o histórico executável está em `db/migrations`.

Em Docker, após obter migrations novas:

```sh
docker compose build migrate seed backend
docker compose up -d
```

O serviço `migrate` aplica só as versões pendentes, e o `seed` roda de novo em
todo `up`. O seed é não destrutivo: insere o conteúdo que falta, atualiza pelo
`seed_key` só as linhas que o painel não editou, nunca apaga, e cria a
configuração inicial só uma vez (ver `src/backend/db/seeds/README.md`).

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

O teste cria bancos temporários com nome aleatório e os remove ao terminar;
não limpa o banco informado. Ele cobre estes cenários:

- **Do zero:** `up` aplica as 12 migrations; as tabelas públicas são exatamente
  as do schema atual (`interactions` não existe); cada enum tem os valores
  esperados (`appointment_status` 5, `session_outcome` 8, `session_step` 12);
  `users.session_version` é `integer not null default 0`; `short_title` é
  `NOT NULL` e `short_description` é anulável; `unaccent` funciona. Um segundo
  `up` não muda nada. Depois, cada constraint da migration `11` é exercitada
  com um caso inválido (código `23514` para `CHECK`, `23505` para unicidade,
  `23502` para `NOT NULL`, `P0001` para o trigger de `AppointmentNotes`) e um
  válido. Por fim, `down 1` volta à versão 10 (`interactions` de volta,
  `appointment_status` com 3 valores, etapas novas mapeadas), em dois passos:
  o primeiro `down 1` desfaz só a `12` (os `CHECK` de tamanho voltam a aceitar
  espaço nas pontas) e o segundo desfaz a `11`. Depois `up` reaplica,
  `down 12` deixa só `pgmigrations` e `up` reaplica tudo. Os `CHECK` da `12`
  recusam título curto com espaço nas pontas ou com 25 caracteres e aceitam 24.
- **Sobre a versão 10 com o conteúdo do seed:** `up 10`, carga dos dados de
  `db/seeds/data` com as colunas da versão 10, sessões `IN_PROGRESS`,
  `FINISHED` e `ABANDONED`, e então o `up` restante. Confere que as 7
  categorias, as 47 perguntas e os documentos continuam com os mesmos ids e
  textos, o backfill de `short_title`, `llm_allowed`, `position`, `outcome`,
  `abandoned_at_step` e `last_interaction_at`, e que `current_step` foi
  preservado. Depois roda o seed real (`db/seeds/run.ts`) duas vezes.
- **Guarda de `Appointments`:** num banco na versão 10 com uma linha em
  `appointments`, o `up` falha com a mensagem da guarda e a versão continua 10,
  sem nada aplicado.
- **Normalização da `12`:** um título e uma descrição curta com espaço nas
  pontas, gravados na versão 11, ficam aparados depois do `up`.
- **Seed:** do zero (7 categorias, 47 perguntas, títulos, ordem, `llm_allowed`,
  documentos e configuração inicial iguais aos arquivos de dados, `BlockedDates`
  vazia); idempotência (retrato completo das tabelas semeadas igual depois da
  segunda execução); backfill do `seed_key` num banco com o conteúdo antigo,
  eventos e sessões (ids, eventos e sessões intactos); linhas editadas ou
  criadas pelo painel preservadas; configuração alterada não sobrescrita.

Para comparar o rollback com a versão 10 à mão, aplique `up` e `down 1` num
banco, só `up 10` em outro, e compare os `pg_dump --schema-only` com `diff`.

## Enums: recrie o tipo, não use `ADD VALUE`

No PostgreSQL, um valor adicionado com `ALTER TYPE ... ADD VALUE` a um tipo que
já existia **não pode ser usado na mesma transação** em que foi adicionado. E o
CLI do node-pg-migrate roda com `--single-transaction` ligado por padrão: todas
as migrations pendentes de uma execução vão para **uma só transação**
(`BEGIN` → todas → `COMMIT`). Migrations em `.sql` não conseguem sair dela
(`pgm.noTransaction()` só existe em migrations JavaScript).

Por isso, **separar o `ADD VALUE` numa migration própria não resolve**: num banco
que recebe as duas na mesma execução (o caso de todo `docker compose up` num
volume novo), o valor adicionado na primeira e usado na segunda continua na
mesma transação, e a migration falha. Desligar `--single-transaction` também não
é o caminho: uma falha no meio deixaria o banco pela metade.

O padrão adotado (migration `11`) é **recriar o tipo**, o que funciona dentro da
transação, porque valores de um tipo criado com `CREATE TYPE` podem ser usados
na mesma transação:

```sql
ALTER TABLE Sessions ALTER COLUMN current_step DROP DEFAULT;
ALTER TYPE session_step RENAME TO session_step_old;
CREATE TYPE session_step AS ENUM ('AWAITING_CATEGORY', 'AWAITING_QUESTION', 'NOVO_VALOR', 'FINISHED');
ALTER TABLE Sessions ALTER COLUMN current_step TYPE session_step USING current_step::text::session_step;
ALTER TABLE Sessions ALTER COLUMN current_step SET DEFAULT 'AWAITING_CATEGORY';
DROP TYPE session_step_old;
```

Repita o `ALTER COLUMN ... USING` para **cada coluna** que usa o tipo (por
exemplo, `Sessions.abandoned_at_step` também é `session_step`), e retire antes os
`DEFAULT`, índices parciais ou `CHECK` que citem valores do tipo antigo,
recriando-os depois. No `Down`, mapeie os valores que deixam de existir antes de
trocar o tipo de volta. Se a tabela estiver vazia e mudar quase toda, recriá-la
(`DROP TABLE`, `DROP TYPE`, `CREATE TYPE`, `CREATE TABLE`) é mais simples, como
a `11` fez com `Appointments`, protegida por uma guarda que aborta se houver
linhas.

A migration `11` já inclui os valores que a Sprint 3 vai precisar
(`AWAITING_RETURN_CHOICE`, `AWAITING_CANCEL_CONFIRMATION`, eventos de remarcação,
cancelamento, lembrete e aviso), para evitar mexer nesses enums logo depois.
Teste sempre subindo do zero **e** sobre um banco já existente.

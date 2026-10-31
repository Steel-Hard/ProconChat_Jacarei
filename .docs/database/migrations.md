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

Existem 17 migrations em `src/backend/db/migrations`: `01` a `07` criam as
tabelas da Sprint 1, `08`, `09` e `010` ajustam `Sessions`,
`11_sprint2_schema.sql` é o schema da Sprint 2 (#52),
`12_short_text_checks.sql` ajusta o limite dos títulos curtos (#61),
`13_conversation_events_data_checks.sql` limita as chaves e os valores de
`ConversationEvents.data` e amarra `Sessions.current_step = 'FINISHED'` às
sessões encerradas (#16), `14_whatsapp_settings_display_number.sql` guarda o
número e o nome verificados do WhatsApp (#54),
`15_whatsapp_settings_access_token_lifetime.sql` guarda se o token de acesso do
WhatsApp expira (#54), `16_user_permissions.sql` cria as permissões granulares
das contas e o e-mail único sem diferenciar maiúsculas (#62), e
`17_schedule_changes.sql` cria snapshots da agenda com data efetiva (#134). O que cada uma faz está
em [`database.md`](database.md#histórico-das-migrations). Os nomes sem aspas
são convertidos para minúsculas pelo PostgreSQL (por exemplo,
`RequiredDocuments` vira `requireddocuments`). Cada migration tem
`Up Migration` e `Down Migration`, incluindo remoção dos enums.

**Numeração.** O node-pg-migrate 8 ordena os arquivos pelo **prefixo lido como
número**, não como texto: `010_alter_sessions.sql` é a versão 10, e um arquivo
`10_...` empataria com ela. Por isso a migration da Sprint 2 é a `11_`, e a
**próxima livre é `18_`**. Não renomeie a `010`: ela já está registrada com esse
nome em `pgmigrations` nos bancos existentes. O executor imprime
`Can't determine timestamp for 01` (e os demais prefixos), pois seu formato
padrão é timestamp. Esse aviso não impede a execução.

## Subir em ambiente limpo

Com Docker Desktop iniciado e `ENCRYPTION_KEY` preenchida no `.env` (`openssl rand -hex 32`; sem ela
o Compose recusa subir), execute na raiz do repositório:

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
pelo próximo número disponível (hoje `17_`), sem repetir números.
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

Este Compose cobre banco, migrations e backend. Os mounts de SQL de
inicialização foram substituídos pelo serviço `migrate`, e o backend depende de
`service_completed_successfully`. Os nomes `postgres`, `postgres_data` e a porta
local 5433 seguem a issue #6. A carga de conteúdo real pertence à issue #12.

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

- **Do zero:** `up` aplica as 17 migrations; as tabelas públicas são exatamente
  as do schema atual (`interactions` não existe); cada enum tem os valores
  esperados (`appointment_status` 5, `session_outcome` 8, `session_step` 12);
  `users.session_version` é `integer not null default 0`; `short_title` é
  `NOT NULL` e `short_description` é anulável; `unaccent` funciona. Um segundo
  `up` não muda nada. Depois, cada constraint da migration `11` é exercitada
  com um caso inválido (código `23514` para `CHECK`, `23505` para unicidade,
  `23502` para `NOT NULL`, `P0001` para o trigger de `AppointmentNotes`) e um
  válido. Os `CHECK` da `13` aceitam o `data` de cada tipo de evento do
  contrato e recusam com `23514` chave fora da lista do tipo (inclusive as
  antigas `llmStatus` e `byRepresentative`), texto livre em `llm`, `reason` e
  `step`, `step` igual a `FINISHED`, booleano em string e `from`/`to` que não
  são data ISO 8601 com fuso. Os `CHECK` de `Sessions` da `13` aceitam sessão
  encerrada ou abandonada em `FINISHED` com a etapa em `abandoned_at_step` e
  recusam com `23514` sessão `IN_PROGRESS` em `FINISHED`, sessão encerrada ou
  abandonada fora de `FINISHED` e `abandoned_at_step = 'FINISHED'`. Em
  `WhatsAppSettings`, `display_phone_number` aceita até 40 caracteres e
  `verified_name` até 255 (`22001` acima disso), e
  `chk_whatsapp_settings_access_token_lifetime` aceita as duas colunas nulas,
  `TRUE` sem data e `FALSE` com data, e recusa com `23514` `TRUE` com data,
  `FALSE` sem data e data sem tipo. A `16` cria exatamente as 8 chaves em
  `Permissions`, e são recusados com `23505` a mesma permissão repetida em
  `UserPermissions` e um e-mail igual com outra caixa, com `23503` uma
  `permission_key` ou um `user_id` inexistentes, e com `23514`
  `permissions_updated_by` sem `permissions_updated_at` e o contrário. Por fim, a volta à versão 10
  (`interactions` de volta, `appointment_status` com 3 valores, etapas novas
  mapeadas) é feita em sete passos de `down 1`: o primeiro desfaz a `17`
  (some `ScheduleChanges`), o segundo desfaz a `16` (somem `Permissions`,
  `UserPermissions`, as duas colunas de `Users` e `uniq_users_email_lower`, e
  as contas continuam), e o terceiro desfaz a `15`
  (somem `access_token_permanent`, `access_token_expires_at` e a constraint, e
  a linha de `WhatsAppSettings` continua), o quarto desfaz a `14` (somem
  `display_phone_number` e `verified_name`, e a linha continua), o quinto
  desfaz a `13` (sobra só `chk_conversation_events_data_object`, um evento com
  chave livre volta a ser aceito e uma sessão em andamento em `FINISHED`
  também), o sexto desfaz a `12` (os `CHECK` de tamanho voltam a aceitar
  espaço nas pontas) e o sétimo desfaz a `11`. A volta à versão 10 perde a
  etapa do abandono: a `11` reaplicada copia `current_step = 'FINISHED'` para
  `abandoned_at_step`, e por isso o `up` seguinte falha na guarda de sessões da
  `13` enquanto houver sessão abandonada; depois de apagar a sessão abandonada
  da versão 10, `up` reaplica, `down 17` deixa só `pgmigrations` e `up` reaplica tudo. Os `CHECK` da `12`
  recusam título curto com espaço nas pontas ou com 25 caracteres e aceitam 24.
- **Sobre a versão 10 com o conteúdo do seed:** `up 10`, carga dos dados de
  `db/seeds/data` com as colunas da versão 10, sessões `IN_PROGRESS`,
  `FINISHED` e `ABANDONED`, e então o `up` restante. Confere que as 7
  categorias, as 47 perguntas e os documentos continuam com os mesmos ids e
  textos, o backfill de `short_title`, `llm_allowed`, `position`, `outcome`,
  `abandoned_at_step` e `last_interaction_at`, e que `current_step` foi
  preservado nas sessões em andamento e passou a `FINISHED` nas encerradas e
  abandonadas (a etapa do abandono fica em `abandoned_at_step`). Depois roda o seed real (`db/seeds/run.ts`) duas vezes.
- **Guarda de `Appointments`:** num banco na versão 10 com uma linha em
  `appointments`, o `up` falha com a mensagem da guarda e a versão continua 10,
  sem nada aplicado.
- **Normalização da `12`:** um título e uma descrição curta com espaço nas
  pontas, gravados na versão 11, ficam aparados depois do `up`.
- **Chaves antigas na `13`:** eventos gravados na versão 12 com
  `{ "llmStatus": ... }` e `{ "byRepresentative": ... }` passam a
  `{ "llm": ... }` e `{ "by_representative": ... }` depois do `up`; o `down 4`
  volta à versão 12 mantendo as chaves novas, e o `up` seguinte funciona.
- **Guarda da `13`:** num banco na versão 12 com um evento cujo `data` tem
  texto livre, o `up` falha com a mensagem da guarda, a versão continua 12 e
  nenhum `CHECK` novo fica; depois de apagar a linha, o `up` funciona.
- **Sessões na `13`:** sessões encerradas e abandonadas gravadas na versão 12
  com outra etapa em `current_step` passam a `FINISHED` (a abandonada mantém
  `abandoned_at_step`) e a sessão em andamento não muda. Num banco na versão 12
  com uma sessão `IN_PROGRESS` em `FINISHED`, ou abandonada com
  `abandoned_at_step = 'FINISHED'`, o `up` falha com a mensagem da guarda, a
  versão continua 12 e nenhum `CHECK` de `Sessions` fica; depois de apagar a
  linha, o `up` funciona.
- **Migration `14`:** num banco na versão 13 com a linha de `WhatsAppSettings`,
  o `up` acrescenta `display_phone_number` e `verified_name` nulos sem mudar a
  linha; `down 3` volta à versão 13, remove as colunas e mantém a linha, e o
  `up` seguinte funciona.
- **Migration `15`:** num banco na versão 14 com a linha de `WhatsAppSettings`,
  o `up` acrescenta `access_token_permanent` e `access_token_expires_at` nulos
  sem mudar o resto da linha; `down 2` volta à versão 14, remove as colunas e a
  constraint e mantém a linha, e o `up` seguinte volta com as duas colunas
  nulas.
- **Migration `16`:** num banco na versão 15 com o Admin e uma conta inativa
  com e-mail em maiúsculas, o `up` mantém as contas como estavam, sem
  permissões e sem "alterado por"; o índice novo recusa o mesmo e-mail com
  outra caixa; `down 1` remove tabelas, colunas e índice e mantém as contas, e
  o `up` seguinte volta com as 8 permissões e sem linhas em `UserPermissions`.
- **Guarda da `16`:** num banco na versão 15 com `Pessoa@Guard.Test` e
  `pessoa@guard.test`, o `up` falha com a mensagem da guarda, a versão continua
  15 e nada é criado; depois de apagar uma das contas, o `up` funciona.
- **Seed:** do zero (7 categorias, 47 perguntas, títulos, ordem, `llm_allowed`,
  documentos e configuração inicial iguais aos arquivos de dados, `BlockedDates`
  vazia); idempotência (retrato completo das tabelas semeadas igual depois da
  segunda execução); backfill do `seed_key` num banco com o conteúdo antigo,
  eventos e sessões (ids, eventos e sessões intactos); linhas editadas ou
  criadas pelo painel preservadas; documentos úteis alterados reescritos só
  nas perguntas que o painel não editou; configuração alterada não
  sobrescrita.
- **Conta Admin:** o seed mantém o Admin que já existe, com outro
  `ROOT_EMAIL` ou sem `ROOT_*`; sem Admin, falha com `ROOT_*` ausente ou
  inválido e não grava nada; `admin:reset-password` regrava o hash do Admin,
  incrementa `session_version` e não imprime credenciais.

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

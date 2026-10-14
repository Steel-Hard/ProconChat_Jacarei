# Seeds — Conteúdo do FAQ do PROCON e configuração inicial

Este diretório carrega no banco:

- o **conteúdo** do chatbot: as **7 categorias** e os **47 itens** do FAQ real fornecido pelo
  PROCON Jacareí (`.docs/database/Dúvidas Frequentes.odt`), com título curto, descrição curta e
  ordem das listas do WhatsApp;
- a **configuração inicial** da agenda: `ScheduleSettings` (linha única `id = 1`), a grade de
  `ScheduleRanges` e as duas listas de `AttendanceDocuments`;
- a **conta Admin** do painel (decisão 004, item 1), a partir de `ROOT_EMAIL` e `ROOT_PASSWORD`;
- a **configuração inicial do WhatsApp** (`WhatsAppSettings`, linha única `id = 1`, #83), a partir
  dos `WHATSAPP_*` do `.env`.

Diferente de `../migrations` (node-pg-migrate, que versiona mudança de **schema**), este script
carrega **dados**. Specs: `.docs/.tasks/features/popular-banco-conteudo-real/spec.md` (origem) e
`.docs/.tasks/features/seed-configuracao-titulos-curtos/spec.md` (#61, política atual).

## Quando roda

- **Docker:** o serviço `seed` do `compose.yaml` roda em **todo** `docker compose up`, depois do
  `migrate`, e o `backend` só sobe se ele terminar com código 0. Por isso o seed tem que ser
  seguro para rodar de novo em qualquer banco, inclusive com conversas e agendamentos gravados.
- **Manual:** a partir de `src/backend/`, com `DB_URL` apontando para o Postgres desejado (mesma
  variável de `db/connection.ts` e de `db:migrate`), e com as migrations já aplicadas:

```bash
npm run db:migrate
npm run db:seed
```

## O que é carregado

| `position` | `seed_key` | Categoria | Título curto | Perguntas |
| --- | --- | --- | --- | --- |
| 0 | `cobranca` | Cobrança/Desconto Indevido | Cobrança indevida | 5 |
| 1 | `contrato` | Contrato | Contratos | 4 |
| 2 | `arrependimento` | Direito de Arrependimento (7 dias) | Arrependimento 7 dias | 6 |
| 3 | `vicio` | Vício/Defeito de Produto ou Serviço | Vício ou defeito | 8 |
| 4 | `garantias` | Garantias | Garantias | 11 |
| 5 | `oferta` | Cumprimento de Oferta/Preço | Oferta e preço | 6 |
| 6 | `outros` | Outros/Procedimentos Gerais | Outros e procedimentos | 7 |
| | | | **Total** | **47** |

Configuração inicial (`data/configuracao-inicial.data.ts`): atendimentos de 30 minutos, 2 vagas
por horário, janela de 30 dias, antecedência de 1 dia útil, alerta de espera de 7 dias, lembrete
desligado, endereço da unidade, grade de segunda a sexta com 08:00–12:00 e 13:00–17:00, e os
documentos de atendimento do titular e do representante (`regras/09`).

**Feriados:** o seed não insere nada em `BlockedDates`. Os feriados são cadastrados pela tela de
Horários (#64); até lá, o bot pode oferecer horário em feriado.

## Política: conteúdo x configuração

| | Conteúdo (`Categories`, `Questions`, `RequiredDocuments`) | Configuração (`ScheduleSettings`, `ScheduleRanges`, `AttendanceDocuments`) |
| --- | --- | --- |
| Fonte da verdade | Os arquivos de `data/`, revisados por PR | O arquivo de dados só dá o **valor inicial**; depois, o banco |
| Chave | `seed_key` (estável, nunca muda) | Linha `ScheduleSettings.id = 1` como sentinela |
| Em toda execução | Insere o que falta e atualiza as linhas nunca editadas pelo painel (`updated_by IS NULL`) | Insere só se `id = 1` não existir; se existir, não toca em nada |
| Linhas editadas pelo painel (`updated_by` preenchido) | Não são tocadas | Não se aplica |
| Linhas criadas pelo painel (`seed_key` `NULL`) | Não são tocadas | Não se aplica |
| Apaga? | Nunca | Nunca |

Detalhes do conteúdo:

- **Nada é apagado nem recriado.** Os ids de categorias e perguntas se mantêm, e as FKs de
  `ConversationEvents` e `Appointments` continuam válidas. Um item retirado do arquivo de dados
  continua no banco como está; desativar é ação do painel (#63).
- **Só grava o que mudou:** cada `UPDATE` compara os campos com `IS DISTINCT FROM`, então uma
  segunda execução não escreve nada (nem `updated_at`).
- **`category_id` nunca é alterado** e **`active` só é definido no `INSERT`.**
- **`llm_allowed`** vem de `llmAllowed` e, se ausente, vale `!outOfScope`.
- **Documentos úteis** de uma pergunta não editada são comparados com a lista do arquivo (na
  ordem de `position, id`) e reescritos só quando diferem.
- **`Sessions` não é tocada.** Etapa, rascunho e página da lista são do fluxo do bot (#55).
- **Texto:** títulos curtos, descrições curtas e documentos são gravados exatamente como estão
  no arquivo. O teste `data/procon-faq.data.test.ts` garante os limites (24 e 72 pontos de
  código, sem aparar), a ausência de espaço nas pontas e a forma NFC.

**Backfill do `seed_key`:** num banco que já tinha o conteúdo sem `seed_key` (seed anterior à
#61), a primeira execução casa cada linha pelo **texto exato** (`title` nas categorias,
`category_id` + `question` nas perguntas, menor `id` se houver mais de um, com aviso no log) e
grava a chave, sem trocar o id. Se um texto foi alterado à mão no banco, o casamento falha e o
seed insere uma linha nova, visível no log como "inseridas" maior que 0.

**`seed_key` é imutável:** minúsculas sem acento, `^[a-z0-9]+(-[a-z0-9]+)*$` nas categorias e
`<chave da categoria>.<slug>` nas perguntas. Depois de mergeada, uma chave nunca é renomeada nem
reaproveitada. Textos podem mudar em PRs futuros sem perder o casamento.

**`updated_by` marca a edição pelo painel:** ao salvar uma categoria ou pergunta, a #63 grava
`updated_by`, e o seed deixa a linha (e os documentos úteis dela) em paz.

**Regra para a #63: toda alteração pelo painel grava `updated_by`** na categoria ou pergunta
afetada, não só a edição do formulário. Isso inclui:

- **reordenar a lista** (↑↓): a reordenação muda a `position` de várias linhas, e **todas as
  linhas renumeradas** precisam receber `updated_by`, não só a que foi movida;
- **ligar ou desligar "Permitir complemento por IA"** (`llm_allowed`);
- **alterar só os documentos úteis** de uma pergunta: o `updated_by` vai na própria pergunta, já
  que `RequiredDocuments` não tem essa coluna.

Sem o `updated_by`, o seed trata a linha como dele, e o próximo `docker compose up` ou deploy
desfaz a alteração (volta `position`, `llm_allowed`, títulos e documentos úteis para os valores do
arquivo). `active` é a exceção: o seed só o grava no `INSERT`, então ativar ou desativar pelo
painel nunca é desfeito, mesmo sem `updated_by`.

**Execuções simultâneas:** tudo roda numa única transação, com `pg_advisory_xact_lock` logo
depois do `BEGIN`. Qualquer erro faz `ROLLBACK` e o processo sai com código diferente de 0.

## Conta Admin (#57)

O seed procura a conta com `is_admin`. Se ela existe, com qualquer e-mail, nada muda e as
variáveis `ROOT_*` nem são lidas. Se não existe, o seed cria uma única conta com `name = 'Admin'`,
`is_admin`, ativa, `session_version = 0`, o e-mail de `ROOT_EMAIL` sem espaços nas pontas e em
minúsculas e o hash `bcryptjs` de custo 12 de `ROOT_PASSWORD`. Sem Admin, a falta de uma das duas
variáveis, ou uma senha com menos de 8 caracteres ou mais de 72 bytes, faz o seed falhar sem
gravar nada. O log nunca mostra o e-mail nem a senha.

Trocar `ROOT_EMAIL` ou `ROOT_PASSWORD` depois não altera a conta. Para redefinir a senha, use
`npm run admin:reset-password` (README do backend).

## Configuração do WhatsApp (#83)

O seed procura a linha `WhatsAppSettings.id = 1`. Se ela existe, nada muda e as variáveis
`WHATSAPP_*` nem são lidas. Se não existe, o seed cria a linha uma única vez
(`INSERT ... ON CONFLICT (id) DO NOTHING`) com:

| Coluna | Variável | Regra |
| --- | --- | --- |
| `phone_number_id` | `WHATSAPP_PHONE_NUMBER_ID` | Só dígitos, até 40. Vazia ou ausente vira `NULL` |
| `business_account_id` | `WHATSAPP_BUSINESS_ACCOUNT_ID` | Opcional. Só dígitos, até 40. Vazia ou ausente vira `NULL` |
| `access_token_encrypted` | `WHATSAPP_ACCESS_TOKEN` | Cifrado com `ENCRYPTION_KEY` (formato `v1:`). Vazia ou ausente vira `NULL` |
| `app_secret_encrypted` | `WHATSAPP_APP_SECRET` | Cifrado com `ENCRYPTION_KEY`. Vazia ou ausente vira `NULL` |
| `verify_token` | `WHATSAPP_VERIFY_TOKEN` | De 1 a 64 caracteres visíveis, sem espaço. Ausente: gera 64 caracteres hexadecimais aleatórios |

`credentials_valid`, `credentials_checked_at` e `updated_by` ficam `NULL`. Um ID que não é
numérico ou um `WHATSAPP_VERIFY_TOKEN` fora da regra fazem o seed falhar com uma mensagem que cita a
variável, sem o valor. Cifrar sem `ENCRYPTION_KEY` válida (64 caracteres hexadecimais) também faz o
seed falhar.

**O `.env` é só o valor inicial.** Depois que a linha existe, mudar `WHATSAPP_*` não tem efeito: as
credenciais, a pausa e o número são trocados pela tela de WhatsApp do painel (API em
`/api/v1/whatsapp/settings`, README do backend). Em produção, os `WHATSAPP_*` que já estão no `.env`
da VM criam a linha na primeira subida, e o `deploy.sh` avisa (sem abortar e sem mostrar valores)
quando um deles está vazio.

## Procedimentos

### Corrigir um valor de configuração num banco já semeado

Mudar `data/configuracao-inicial.data.ts` **não** altera bancos em que a configuração já foi
criada. Até as telas de Horários e Documentos (#64, #65), corrija direto no banco:

```sql
UPDATE ScheduleSettings SET unit_address = 'Novo endereço', updated_at = now() WHERE id = 1;
```

### Reaplicar a configuração inicial (só em desenvolvimento)

Apaga a agenda e os documentos de atendimento do banco e cria de novo a partir do arquivo:

```sql
DELETE FROM ScheduleRanges;
DELETE FROM AttendanceDocuments;
DELETE FROM ScheduleSettings;
```

Depois, `npm run db:seed` (ou `docker compose run --rm seed`).

## Saída

O log começa com `Seed concluído` e informa quantas categorias e perguntas foram inseridas,
atualizadas e mantidas, se a configuração inicial foi criada ou mantida, se o Administrador foi
criado ou mantido e se a configuração do WhatsApp foi criada ou mantida ("WhatsApp: configuração
inicial criada" ou "WhatsApp: configuração inicial já existe, mantida"). O log nunca mostra os
valores das variáveis.

## Estrutura interna

- `data/types.ts` — tipos dos arquivos de dados (`FaqCategorySeed`, `FaqQuestionSeed`,
  `InitialConfigSeed`).
- `data/procon-faq.<categoria>.data.ts` — um arquivo por categoria, com `seedKey`, título curto e
  as perguntas na ordem da lista, transcritas fielmente do `.odt` (pergunta, título e descrição
  curtos, base legal, resposta, atendimento presencial, fora de escopo e documentos úteis).
- `data/procon-faq.data.ts` — agrega as 7 categorias, na ordem das listas.
- `data/configuracao-inicial.data.ts` — valores iniciais da agenda e dos documentos de atendimento.
- `data/*.data.test.ts` — testes dos dados, sem banco (`npm test`).
- `content.seed.ts` — `seedContent(client)`: upsert do conteúdo pelo `seed_key`.
- `config.seed.ts` — `seedInitialConfig(client)`: cria a configuração inicial uma única vez.
- `admin.seed.ts` — `seedAdminAccount(client, env)`: cria a conta Admin uma única vez.
- `whatsappSettings.seed.ts` — `seedWhatsAppSettings(client, env)`: cria a configuração inicial do
  WhatsApp uma única vez.
- `run.ts` — abre a transação, pega o lock, chama as quatro funções, escreve o log e faz
  `COMMIT`/`ROLLBACK`.

Os cenários contra Postgres real (do zero, idempotência, backfill com histórico, edições do
painel, configuração alterada e conta Admin) ficam em `../verify-migrations.cjs` (`npm run test:db`).

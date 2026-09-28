# Seeds — Conteúdo do FAQ do PROCON e configuração inicial

Este diretório carrega no banco:

- o **conteúdo** do chatbot: as **7 categorias** e os **47 itens** do FAQ real fornecido pelo
  PROCON Jacareí (`.docs/database/Dúvidas Frequentes.odt`), com título curto, descrição curta e
  ordem das listas do WhatsApp;
- a **configuração inicial** da agenda: `ScheduleSettings` (linha única `id = 1`), a grade de
  `ScheduleRanges` e as duas listas de `AttendanceDocuments`.

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

**Execuções simultâneas:** tudo roda numa única transação, com `pg_advisory_xact_lock` logo
depois do `BEGIN`. Qualquer erro faz `ROLLBACK` e o processo sai com código diferente de 0.

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
atualizadas e mantidas, e se a configuração inicial foi criada ou mantida.

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
- `run.ts` — abre a transação, pega o lock, chama as duas funções, escreve o log e faz
  `COMMIT`/`ROLLBACK`.

Os cenários contra Postgres real (do zero, idempotência, backfill com histórico, edições do
painel e configuração alterada) ficam em `../verify-migrations.cjs` (`npm run test:db`).

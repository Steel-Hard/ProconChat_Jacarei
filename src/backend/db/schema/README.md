# Schema SQL — Ordem de dependência de criação

Este diretório contém o `CREATE TABLE` de cada tabela do modelo de dados, um arquivo por
tabela, conforme desenhado em [`.docs/database/database.md`](../../../../.docs/database/database.md).

Nenhum desses arquivos foi aplicado a um banco real ainda, e não há ferramenta de migration
decidida — isso é escopo da issue #11 (Banco de Dados — aplicar schema, migrations, Docker).

Ordem válida de execução, respeitando as foreign keys:

1. `users.sql`
2. `categories.sql`
3. `questions.sql` (depende de `categories.sql` — FK `category_id`)
4. `required_documents.sql` (depende de `questions.sql` — FK `question_id`)
5. `sessions.sql`
6. `interactions.sql` (depende de `sessions.sql`, `categories.sql` e `questions.sql` — FKs `session_id`, `category_id`, `question_id`)
7. `appointments.sql`

`appointments.sql` não depende de nenhuma outra tabela deste diretório — é um registro isolado,
identificado por `cpf_hash`.

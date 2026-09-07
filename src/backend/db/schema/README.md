# Schema SQL — Ordem de dependência de criação

Este diretório contém o `CREATE TABLE` de cada tabela do modelo de dados, um arquivo por
tabela, conforme desenhado em [`.docs/database/database.md`](../../../../.docs/database/database.md).

O histórico executável está em `../migrations`, usando node-pg-migrate. Estes arquivos
preservam a referência do desenho original da #9; mudanças futuras devem ser novas
migrations. Consulte [o guia de execução](../../../../.docs/database/migrations.md)
para subir PostgreSQL, aplicar o schema e validar em Docker (issue #11).

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

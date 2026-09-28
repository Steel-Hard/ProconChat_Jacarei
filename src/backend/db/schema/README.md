# Schema SQL — Ordem de dependência de criação

Este diretório contém o `CREATE TABLE` consolidado de cada tabela do modelo de dados, um arquivo
por tabela, com os seus tipos, constraints e índices, conforme descrito em
[`.docs/database/database.md`](../../../../.docs/database/database.md).

Os arquivos refletem o **estado atual** do schema, depois da migration `11_sprint2_schema.sql`
(issue #52). Eles servem para leitura: o histórico executável está em `../migrations`, aplicado
com node-pg-migrate. Toda mudança de schema entra como uma migration nova, e o arquivo da tabela
aqui é atualizado junto. Consulte [o guia de migrations](../../../../.docs/database/migrations.md)
para subir o PostgreSQL, aplicar as migrations e validar.

Ordem válida de execução num banco vazio, respeitando as foreign keys:

1. `extensions.sql` (`unaccent`, usada na busca de agendamentos por nome)
2. `users.sql`
3. `categories.sql` (FK `updated_by` → `users`)
4. `questions.sql` (FKs `category_id` → `categories`, `updated_by` → `users`)
5. `required_documents.sql` (FK `question_id` → `questions`)
6. `sessions.sql` (tipos `session_status`, `session_step`, `session_outcome`; FKs `current_category_id` → `categories`, `current_question_id` → `questions`)
7. `appointments.sql` (tipos `appointment_status`, `appointment_reason`; FKs → `sessions`, `questions`, `users`)
8. `conversation_events.sql` (tipo `conversation_event_type`; FKs → `sessions`, `categories`, `questions`, `appointments`)
9. `appointment_notes.sql` (função e trigger de imutabilidade; FKs → `appointments`, `users`)
10. `appointment_events.sql` (tipo `appointment_event_type`; FKs → `appointments`, `users`)
11. `schedule_settings.sql` (FK `updated_by` → `users`)
12. `schedule_ranges.sql`
13. `blocked_dates.sql`
14. `attendance_documents.sql` (tipo `attendee_group`)
15. `whatsapp_settings.sql` (FK `updated_by` → `users`)

`Interactions` não existe mais: foi substituída por `ConversationEvents` na migration `11`.

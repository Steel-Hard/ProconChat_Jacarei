-- Up Migration
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM Users GROUP BY lower(email) HAVING count(*) > 1) THEN
        RAISE EXCEPTION 'A migration 16_user_permissions encontrou contas em Users com e-mails repetidos ignorando maiúsculas. Deixe um e-mail por conta (corrija ou desative e troque o e-mail das contas repetidas) e rode a migration de novo.';
    END IF;
END
$$;

CREATE TABLE Permissions (
    key VARCHAR(40) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT NOT NULL
);

INSERT INTO Permissions (key, name, description) VALUES
    ('appointments.view', 'Ver agendamentos', 'Consultar a lista, o calendário e o detalhe dos agendamentos.'),
    ('appointments.manage', 'Gerenciar agendamentos', 'Assumir, atribuir, marcar como atendido, cancelar e registrar observações internas.'),
    ('content.manage', 'Gerenciar conteúdo do chatbot', 'Editar categorias e perguntas e ativar ou desativar itens.'),
    ('schedule.configure', 'Configurar atendimento presencial', 'Definir grade semanal, duração, vagas, janela de agendamento, datas bloqueadas, dados da unidade e lembrete.'),
    ('documents.configure', 'Configurar documentos para atendimento presencial', 'Editar as listas de documentos pedidos ao titular e ao representante.'),
    ('sessions.view', 'Ver sessões', 'Consultar, somente leitura, os passos percorridos nas conversas do chatbot.'),
    ('reports.view', 'Ver relatórios', 'Acessar indicadores de uso e exportar relatórios em PDF, Excel ou CSV.'),
    ('users.manage', 'Gerenciar usuários', 'Criar contas, ativar ou desativar e editar permissões.');

CREATE TABLE UserPermissions (
    user_id BIGINT NOT NULL REFERENCES Users(id),
    permission_key VARCHAR(40) NOT NULL REFERENCES Permissions(key),
    granted_by BIGINT REFERENCES Users(id),
    granted_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, permission_key)
);

ALTER TABLE Users
    ADD COLUMN permissions_updated_by BIGINT REFERENCES Users(id),
    ADD COLUMN permissions_updated_at TIMESTAMPTZ,
    ADD CONSTRAINT chk_users_permissions_updated CHECK ((permissions_updated_by IS NULL) = (permissions_updated_at IS NULL));

CREATE UNIQUE INDEX uniq_users_email_lower ON Users (lower(email));

-- Down Migration
DROP INDEX uniq_users_email_lower;

ALTER TABLE Users
    DROP CONSTRAINT chk_users_permissions_updated,
    DROP COLUMN permissions_updated_at,
    DROP COLUMN permissions_updated_by;

DROP TABLE UserPermissions;

DROP TABLE Permissions;

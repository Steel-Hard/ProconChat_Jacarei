CREATE TABLE Agendamentos (
    id BIGSERIAL PRIMARY KEY, -- AUTO_INCREMENT no MySQL

    cpf VARCHAR(11) NOT NULL,
    nome VARCHAR(150) NOT NULL,

    razao_agendamento TEXT NOT NULL,

    profissional VARCHAR(150) NOT NULL,

    data_hora_agendamento TIMESTAMP NOT NULL,

    data_hora_request TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    status VARCHAR(20) NOT NULL DEFAULT 'AGENDADO',

    observacoes TEXT,

    CONSTRAINT chk_status CHECK (status IN ('AGENDADO', 'CANCELADO', 'ATENDIDO'))
);

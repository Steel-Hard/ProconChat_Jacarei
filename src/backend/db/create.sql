-- ENUM de status
CREATE TYPE status_agendamento AS ENUM ('AGENDADO', 'CANCELADO', 'ATENDIDO');

-- Tabela principal
CREATE TABLE Agendamentos (
    id BIGSERIAL PRIMARY KEY,

    codigo_agendamento UUID NOT NULL DEFAULT gen_random_uuid(),

    cpf VARCHAR(11) NOT NULL,
    nome VARCHAR(150) NOT NULL,

    razao_agendamento TEXT NOT NULL,

    profissional VARCHAR(50) NOT NULL CHECK (profissional IN ('ADVOGADO', 'ATENDENTE')),

    data_hora_agendamento TIMESTAMPTZ NOT NULL,

    data_hora_request TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    status status_agendamento NOT NULL DEFAULT 'AGENDADO',

    observacoes TEXT,

    CONSTRAINT chk_cpf CHECK (cpf ~ '^[0-9]{11}$')
);

-- Índices
CREATE INDEX idx_agendamento_cpf ON Agendamentos(cpf);
CREATE INDEX idx_codigo_agendamento ON Agendamentos(codigo_agendamento);
CREATE INDEX idx_agendamento_data ON Agendamentos(data_hora_agendamento);

-- Evita duplicidade ativa
CREATE UNIQUE INDEX uniq_agendamento_ativo 
ON Agendamentos(cpf, data_hora_agendamento)
WHERE status = 'AGENDADO';

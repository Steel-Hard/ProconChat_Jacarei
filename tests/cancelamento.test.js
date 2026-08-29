const client = require("./src/backend/db/connection");
const { enviarMensagem } = require("./src/backend/services/send_chatbot");

describe("Cancelamento", () => {
  const cpf = "12345678910";

  beforeEach(async () => {
    await client.query("DELETE FROM Agendamentos WHERE cpf = $1", [cpf]);
  });

  test("deve cancelar um agendamento existente", async () => {
    const mensagemCancelamento = `
    Desejo cancelar meu atendimento às 12h do dia 01 de dezembro de 2026.
    Meu cpf é ${cpf}.
  `;

    await enviarMensagem(mensagemCancelamento);

    const res = await client.query(
      "SELECT * FROM Agendamentos WHERE cpf = $1",
      [cpf],
    );

    const agendamento = res.rows[0];

    expect(agendamento.status).toBe("CANCELADO");
  });
});

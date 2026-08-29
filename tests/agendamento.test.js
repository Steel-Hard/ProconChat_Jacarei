// tests/agendamento.test.js
const client = require("../src/backend/db/connection");
const { enviarMensagem } = require("../src/backend/services/send_chatbot");

describe("Agendamento", () => {
  
  const cpf = "12345678910";

  beforeEach(async () => {
    await client.query("DELETE FROM Agendamentos WHERE cpf = $1", [cpf]);
  });

  test("deve criar um agendamento corretamente", async () => {
    const mensagem = `
      Olá. Desejo ser atendido às 12h do dia 01 de dezembro de 2026,
      com o advogado disponível, para discutir um caso de fraude.
      Meu cpf é ${cpf} e me chamo João Faria.
    `;

    await enviarMensagem(mensagem);

    const res = await client.query(
      "SELECT * FROM Agendamentos WHERE cpf = $1",
      [cpf]
    );

    expect(res.rows.length).toBe(1);

    const agendamento = res.rows[0];

    expect(agendamento.nome).toBe("João Faria");
    expect(agendamento.status).toBe("AGENDADO");
    expect(agendamento.profissional).toBe("ADVOGADO");

    const data = new Date(agendamento.data_hora_agendamento);
    expect(data.getHours()).toBe(12);
    expect(data.getDate()).toBe(1);
    expect(data.getMonth()).toBe(11); // dezembro
  });
});
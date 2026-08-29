// services/send_chatbot.js
const axios = require("axios");

async function enviarMensagem(mensagem) {
  const response = await axios.post(process.env.CHATBOT_API, {
    message: mensagem
  });

  return response.data;
}

module.exports = { enviarMensagem };
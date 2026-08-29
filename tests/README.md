# Sobre testes

A lógica de um teste não precisa ser complexa. Por exemplo, no arquivo "agendamento.test.js", a ideia é "envio uma mensagem agendando uma consulta para a API do chatbot, o resultado esperado é que a consulta seja agendada (persistida no banco) com os dados corretos, no horário correto".

Então há a entrada e o que esperamos que ocorra.

Rapidamente podemos reutilizar os dados do primeiro teste para fazer  o cancelamento da consulta. A validação ainda é via consulta no banco.

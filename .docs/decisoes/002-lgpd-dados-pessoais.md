# 002 — Tratamento de dados pessoais

- **Status:** Aceita
- **Data:** 01/09/2026 (hash do telefone), complementada em 26 e 27/09/2026
- **Requisitos:** RNF03 (LGPD)

## Contexto

O chatbot lida com telefone, nome e CPF de cidadãos. O desafio exige conformidade com a LGPD e restringe o uso de serviços externos por proteção de dados (RP05).

## Decisão

| Dado | Como é guardado | Quem vê |
|---|---|---|
| **Texto digitado pelo cidadão** | **Não é guardado.** Só os passos percorridos | Ninguém |
| **Telefone (sessão)** | `phone_hash` (HMAC com `PHONE_HASH_SECRET`) | Ninguém. Nunca é exibido nem enviado ao navegador |
| **Telefone (agendamento)** | Criptografado (reversível), só para enviar avisos. **Apagado quando o agendamento termina** | Ninguém. Usado só pelo backend para enviar mensagens |
| **CPF** | `cpf_hash` + versão mascarada gravada na criação (`***.456.789-**`) | Painel mostra só a versão mascarada |
| **Nome do titular** | Texto, porque a equipe precisa identificar a pessoa no balcão | Quem tem permissão de ver agendamentos |

Regras adicionais:

1. **Nome e CPF são sempre do titular** (o consumidor lesado), mesmo quando outra pessoa comparece em nome dele.
2. **A busca por CPF compara hashes**: a recepção digita os 11 dígitos, o sistema calcula o hash e procura. O CPF completo nunca aparece.
3. **Sessões do mesmo cidadão podem ser ligadas pelo `phone_hash`** ("Outras conversas deste número" na tela de Sessões). A consulta é feita no backend, que **nunca devolve o hash** ao front.
4. **Relatórios e exportações contêm só dados agregados**, sem nome, CPF ou protocolo.
5. **O cidadão é informado**, no momento do agendamento, de que receberá avisos naquele número. Não há consentimento separado, porque a base legal é a execução do serviço que ele mesmo pediu.
6. **Segredos de integração** (token da Meta, App Secret) são guardados criptografados no banco, com uma chave-mestra que fica no `.env`.
7. **Descartado:** conferir o CPF no balcão digitando-o no painel. O grupo avaliou e decidiu que não agrega ao produto.

## Consequências

- `Appointments` ganha colunas de CPF mascarado e telefone criptografado.
- `PHONE_HASH_SECRET` **não deve ser trocado sem motivo**: trocar quebra a ligação entre sessões antigas e novas.
- **Pendências em aberto:**
  - **RNF09: política de retenção.** Por quanto tempo sessões, eventos e agendamentos ficam guardados. Só o apagamento do telefone criptografado está decidido.
  - **Aviso de privacidade na saudação do bot**, com link para uma política de privacidade. Hoje o bot não informa que dados coleta.
  - **Procedimento para pedidos do titular** (ver ou apagar os próprios dados), ainda que manual.
  - Com a Cloud API, as mensagens passam pela Meta. Isso deve constar na política de privacidade.

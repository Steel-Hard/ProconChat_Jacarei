# 003 — Migração para a WhatsApp Cloud API

- **Status:** Aceita
- **Data:** 27/09/2026
- **Requisitos:** RF01, RP01, RNF02
- **Substitui:** o uso da Evolution API adotado na Sprint 1 (issues #3 e #4)

## Contexto

Na Sprint 1 o projeto usou a Evolution API (automação não oficial do WhatsApp Web). Ela funcionou, mas:

- o bug `@lid` (issue #42) impede a entrega de mensagens a contatos já migrados pela Meta para o novo formato de identificação, e não tem correção prevista;
- ela viola os termos de uso do WhatsApp e há risco de o número ser banido;
- o RP01 prefere a Cloud API oficial, e a pesquisa da issue #3 já recomendava revisitar essa opção.

Além disso, o sistema passou a precisar **enviar mensagens ao cidadão fora da conversa** (lembrete e cancelamento, ver [005](005-mensagens-ao-cidadao.md)), o que é mais arriscado em canais não oficiais.

## Decisão

1. **O sistema usa apenas a WhatsApp Cloud API.** A Evolution API e o Redis saem do `compose.yaml`.
2. **A migração é feita antes de começar o front-end.** O protótipo do painel já não tem nenhuma menção à Evolution.
3. **As credenciais são configuradas pela tela de WhatsApp**, e não pelo `.env`. Isso vale para o ID do número, o ID da conta, o token de acesso e o App Secret:
   - os segredos são guardados criptografados e nunca exibidos de volta (só os 4 últimos caracteres);
   - salvar credenciais novas exige um **teste de conexão** bem-sucedido;
   - a tela mostra a URL do webhook e o token de verificação para colar no painel da Meta;
   - o guia orienta a usar um **token permanente de usuário do sistema**, porque o token temporário expira em 24 horas.
4. **"Pausar respostas automáticas"** na tela substitui o `EVOLUTION_AUTO_REPLY_ENABLED` como interruptor de emergência. Durante a pausa, quem escreve recebe uma mensagem fixa informando a indisponibilidade.
5. **A tela mostra o estado do número:**
   - credenciais válidas ou expiradas;
   - último evento recebido pelo webhook (alerta após 24h sem eventos);
   - qualidade do número segundo a Meta;
   - limite diário de conversas iniciadas pela empresa, com alerta acima de 80%.
6. **O Gateway continua sem acesso ao banco.** Ele busca a configuração no Backend por um endpoint interno, guarda em cache e recarrega quando o Admin salva.

## Consequências

- **O Gateway precisa de uma camada de provedor.** O webhook da Cloud API é diferente: tem o `GET` de verificação e a assinatura HMAC com o App Secret.
- **Continuam no `.env`:** conexão com o banco, `PHONE_HASH_SECRET`, token interno Gateway ↔ Backend, **chave-mestra de criptografia** e a URL pública do sistema.
- **Custo:** conversas iniciadas pelo cidadão são gratuitas; mensagens de modelo fora da janela de 24h (lembrete, cancelamento) são cobradas pela Meta. Ver [005](005-mensagens-ao-cidadao.md).
- **É preciso uma conta Meta Business e um número dedicado.** Isso depende do PROCON e pode levar tempo, então deve ser tratado cedo.
- Os documentos em [`../historico/evolution/`](../historico/evolution/) passam a ser só registro histórico.

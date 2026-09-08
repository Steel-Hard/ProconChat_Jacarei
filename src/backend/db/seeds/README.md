# Seeds — Conteúdo real do FAQ do PROCON

Este diretório carrega no banco as **7 categorias** e os **47 itens** do FAQ real fornecido
pelo PROCON Jacareí (`.docs/database/Dúvidas Frequentes.odt`), usado pelo Motor de Decisão
(#13) para navegar o fluxo de atendimento.

Diferente de `../migrations` (node-pg-migrate, que versiona mudança de **schema**), este é
um script chamado manualmente, porque carrega **dado de conteúdo** — que pode ser revisado
pelo PROCON sem qualquer alteração de tabela. Ver `.docs/.tasks/features/popular-banco-conteudo-real/spec.md`
para o histórico completo da decisão.

## Pré-requisito

As migrations precisam estar aplicadas antes (schema de `Categories`, `Questions` e
`RequiredDocuments` já criado):

```bash
npm run db:migrate
```

## Como rodar

A partir de `src/backend/`, com `DB_URL` apontando para o Postgres desejado (mesma variável
usada por `db/connection.ts` e por `db:migrate`):

```bash
npm run db:seed
```

## O que é carregado

| Categoria | Perguntas |
| --- | --- |
| Cobrança/Desconto Indevido | 5 |
| Contrato | 4 |
| Direito de Arrependimento (7 dias) | 6 |
| Cumprimento de Oferta/Preço | 6 |
| Vício/Defeito de Produto ou Serviço | 8 |
| Garantias | 11 |
| Outros/Procedimentos Gerais | 7 |
| **Total** | **47** |

## Idempotência

O script roda em uma única transação: antes de inserir, remove (por `title`, na ordem
`RequiredDocuments` → `Questions` → `Categories`) qualquer linha pré-existente dessas 7
categorias, depois insere os dados novos. Rodar `npm run db:seed` várias vezes seguidas contra
o mesmo banco sempre resulta no mesmo estado final — sem duplicar linhas. Se o script falhar no
meio da execução, a transação é revertida (`ROLLBACK`) e nenhuma linha parcial fica no banco.

## Estrutura interna

- `data/types.ts` — tipos `FaqCategorySeed`/`FaqQuestionSeed` usados pelos arquivos de dados.
- `data/procon-faq.<categoria>.data.ts` — um arquivo por categoria, com o array de perguntas
  transcritas fielmente do `.odt` (pergunta, base legal, resposta, atendimento presencial,
  fora de escopo e documentos necessários).
- `data/procon-faq.data.ts` — agrega os 7 arquivos de categoria em um único array exportado.
- `run.ts` — script executor: abre a transação via `getPool()` (`../connection.ts`), faz o
  reset e o insert, e termina com exit code 0 (sucesso) ou diferente de 0 (erro).

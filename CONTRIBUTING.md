# Contribuindo

Este documento define o padrão de branches, commits e Pull Requests deste repositório. As tasks são acompanhadas pelas issues do GitHub e pelo board do [Project 6DSM](https://github.com/orgs/Steel-Hard/projects/2).

## Tipos de alteração

| Tipo     |     Ícone     | Código do ícone | Descrição                                                                   |
| -------- | :-----------: | ---------------- | --------------------------------------------------------------------------- |
| Fix      |     :bug:     | bug               | Correção de bugs.                                                           |
| Feat     |  :sparkles:   | sparkles          | Desenvolvimento de novas funcionalidades (features).                        |
| Hotfix   |  :ambulance:  | ambulance         | Correção de bugs a partir da branch de produção (main).                     |
| Refactor |   :recycle:   | recycle           | Melhorias no código (ex.: reestruturações; melhorias no código).            |
| Test     |  :test_tube:  | test_tube         | Criação ou alteração de arquivos de teste.                                  |
| Perf     |     :zap:     | zap               | Mudanças a fim de melhorar a performance.                                   |
| Style    |     :art:     | art               | Mudanças apenas em estilo de código (ex.: formatação; clean code).          |
| Docs     |    :bulb:     | bulb              | Mudanças relacionadas à documentação.                                       |
| Build    |   :rocket:    | rocket            | Mudanças em arquivos de build (ex.: Docker; `package.json`).                |
| Chore    | :see_no_evil: | see_no_evil       | Mudanças sem impacto direto na aplicação (ex.: alterações no `.gitignore`). |
| Revert   |   :rewind:    | rewind            | Reverter algum commit.                                                      |

## Padrão de branches

```
<tipo>/<número-da-issue>-<descrição-curta(opcional)>
```

Exemplo:

```
feat/13-motor-de-decisao
```

Sem issue aberta, o número pode ser omitido:

```
chore/update-gitignore
```

## Padrão de commits

```
<Tipo> <ícone> [#<número-da-issue>] <descrição-da-alteração>
```

Exemplo:

```
Feat :sparkles: [#13] Implementa navegação por categoria/pergunta no Motor de Decisão
```

Sem issue relacionada, omita o `[#...]`:

```
Chore :see_no_evil: Atualiza .gitignore
```

## Pull Requests

- Toda alteração passa por PR para a `develop` — sem push direto. A `main` só recebe merges da `develop`.
- Ao abrir o PR, preencha: **assignees** e **labels** (use as labels já existentes no repositório: `bug`, `enhancement`, `documentation`, etc.).
    - **Assignee**: por padrão, o autor do PR se auto-atribui já na criação (ex.: `gh pr create --assignee @me`), sem depender de edição posterior.
- Referencie a issue relacionada na descrição (ex.: `Closes #13`). Como a `develop` não é a branch padrão do repositório, o GitHub não liga nem fecha a issue sozinho no merge: comente `PR: #<número-do-PR>` na issue e feche-a depois do merge.
- O título do PR segue o mesmo padrão do commit principal (`<Tipo> <ícone> [#<número>] <descrição>`).
- Ao fazer merge, mova o item correspondente para `Done` no board do [Project 6DSM](https://github.com/orgs/Steel-Hard/projects/2).

## Quando rodar cada verificação

Rodar tudo em toda alteração gasta tempo e satura a máquina. Rode só o que o diff justifica:

- **Frontend:** `format:check`, `lint`, `typecheck` e os testes dos arquivos alterados a cada tarefa. O gate completo usa `npm run test:cov`, que já executa todos os testes e a cobertura: não rode `test:run` junto (são cerca de 95 s por passada).
- **Backend e gateway:** `lint`, `build`, `typecheck:test` (só no backend) e `npm test`.
- **Backend, `test:integration`:** só quando o diff mexer em repositórios, consultas SQL ou migrations.
- **Backend, `test:db`** (cerca de 125 s): só quando o diff tocar `src/backend/db/migrations`, `src/backend/db/schema`, `src/backend/db/seeds`, `src/backend/db/verify-migrations.cjs` ou os repositórios.
- **Validação independente (tester ou revisão):** não repita lint, build e testes que o executor já registrou como verdes no mesmo SHA. O relatório do executor registra o SHA em que rodou os gates; só rode de novo se houver commits depois dele ou se o diff justificar.
- O CI (`.github/workflows/ci.yml`) roda tudo a cada PR e é a verificação final.

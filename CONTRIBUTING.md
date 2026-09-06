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

- Toda alteração passa por PR para a `main` — sem push direto.
- Ao abrir o PR, preencha: **assignees** e **labels** (use as labels já existentes no repositório: `bug`, `enhancement`, `documentation`, etc.).
    - **Assignee**: por padrão, o autor do PR se auto-atribui já na criação (ex.: `gh pr create --assignee @me`), sem depender de edição posterior.
- Referencie a issue relacionada na descrição (ex.: `Closes #13`) para que ela seja fechada automaticamente no merge.
- O título do PR segue o mesmo padrão do commit principal (`<Tipo> <ícone> [#<número>] <descrição>`).
- Ao fazer merge, mova o item correspondente para `Done` no board do [Project 6DSM](https://github.com/orgs/Steel-Hard/projects/2).

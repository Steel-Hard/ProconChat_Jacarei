# Sprint 1 · Convenções de trabalho

> Parte do [fechamento da Sprint 1](README.md). Convenções de Git e de planejamento em uso na Sprint 1.

## 7. Convenções de trabalho

### 7.1 Git

| Elemento | Padrão | Exemplo |
|---|---|---|
| Branch | `<tipo>/<número-da-issue>-<descrição-curta>` | `feat/13-motor-de-decisao` |
| Commit | `<Tipo> <ícone> [#<número>] <descrição>` | `Feat :sparkles: [#13] Implementa navegação por categoria/pergunta` |
| PR | Referencia a issue (`Closes #N`), assignee automático (autor), labels preenchidas | — |

Tipos de commit: Fix 🐛, Feat ✨, Hotfix 🚑, Refactor ♻️, Test 🧪, Perf ⚡, Style 🎨, Docs 💡, Build 🚀, Chore 🙈, Revert ⏪.

**Branch de integração ativa: `develop`.** Toda branch de feature/fix nasce dela e os PRs apontam para ela. `main` fica reservada para release/entrega formal; `dev` é uma branch antiga, não é mais alvo. *(O `CONTRIBUTING.md` ainda fala genericamente em "PR para a main" — divergência conhecida, a corrigir.)*

### 7.2 Fluxo de planejamento spec-driven (opcional)

O projeto adota, para tasks não triviais, um fluxo de três papéis: **planejar** (escreve `spec.md` + `tasks.md` em `.docs/.tasks/features/<slug>/` ou `.docs/.tasks/bugs/<slug>/`) → **implementar** → **revisar**. Para tasks pequenas, pode-se seguir direto o padrão de branch/commit sem spec formal. As duas correções desta última sessão foram feitas por esse fluxo.

Specs escritas até agora: `backend-base`, `arquitetura-8`, `esquema-database-9`, `servico-llm`, `popular-banco-conteudo-real`, `extrair-gateway-whatsapp`, `integracao-gateway-backend`, `integracao-backend-llm`, `avisos-obrigatorios-resposta-final`, e o bug `webhook-eventos-mensagem-ignorados`.

# ProconChat - Painel (frontend)

Painel administrativo do ProconChat (RF08), feito com React 19, Vite, TypeScript e React Router.

## Requisitos

- Node 24 (`.nvmrc` indica `24.21.0`; `engines` exige `>=24.15.0`). Com nvm: `nvm use`.

## Comandos

Rode dentro de `src/frontend/`.

| Comando | O que faz |
|---|---|
| `npm ci` | Instala as dependências e ativa o hook de pre-commit |
| `npm run dev` | Sobe o servidor de desenvolvimento do Vite |
| `npm run build` | Checa os tipos (`tsc --noEmit`) e gera `dist/` |
| `npm run preview` | Serve o build localmente |
| `npm test` | Vitest em modo interativo |
| `npm run test:run` | Vitest uma única vez (usado no CI) |
| `npm run lint` / `npm run lint:fix` | oxlint |
| `npm run format` / `npm run format:check` | Prettier |

Não há limite mínimo nem relatório de cobertura.

## Variáveis de ambiente

- `VITE_API_URL`: URL base do Backend (padrão de desenvolvimento em `.env.example`: `http://localhost:3000`). O Vite embute o valor no build, então mudar a variável exige rebuild da imagem. O `.env.example` fixa `VITE_API_URL=http://localhost:3000`, o que sobrepõe o padrão do `compose.yaml` (`http://localhost:${BACKEND_PORT:-3000}`): ao mudar `BACKEND_PORT` no `.env`, ajuste `VITE_API_URL` para a mesma porta, senão o build embute a URL errada.

## Estrutura de `src/`

- `routers/`: `paths.ts` (`ROUTES`), `Router.tsx` (rotas com `lazy` + `Suspense`) e `RequireAuth.tsx`.
- `layouts/`: layouts das rotas (`Nome.layout.tsx`).
- `pages/`: telas (`Nome.page.tsx`); a lógica de cada tela fica em `pages/hooks/`.
- `hooks/`: hooks compartilhados (`useAuth`).
- `services/`: `http.service.ts` (cliente HTTP) e `session.service.ts` (token em memória).
- `styles/`: `global.css` e CSS Modules em `styles/<pasta>/<nome>.module.css`.
- `types/`: declarações e tipos compartilhados.

## Convenções

- Alias `@/` para `src/`; imports com `../` são proibidos pelo oxlint.
- Código em inglês, texto de interface em português.
- Testes co-localizados (`Nome.test.tsx`).
- Sem comentários no código.

## Autenticação no cliente

- O token de acesso fica apenas em memória (`session.service.ts`); nunca em `localStorage`, `sessionStorage` ou cookie legível por JavaScript. Recarregar a página perde o token, e a renovação virá do cookie httpOnly de refresh.
- O cliente HTTP envia `credentials: "include"` e `Authorization: Bearer <token>` quando há token. Em 401, se houver um refresher registrado com `setTokenRefresher`, ele é chamado uma vez e a requisição é repetida uma única vez; sem refresher, ou se o refresh falhar, o token é limpo e o callback de `onUnauthorized` é chamado.
- Nota para #57/#84: `credentials: "include"` exige que o Backend responda CORS com origem explícita e `Access-Control-Allow-Credentials` (o `cors()` aberto de hoje não serve) e que o cookie tenha `SameSite` compatível com a origem do painel. Detalhes no comentário da issue #57.
- Todo 401 limpa o token e chama `onUnauthorized`, inclusive o 401 de credencial errada em `POST /login`. A tela de login (#84) deve tratar o `HttpError` antes do callback global, ou o redirecionamento de `onUnauthorized` entra em loop.

## Docker

O `Dockerfile` faz o build do Vite e serve `dist/` com nginx (fallback de SPA para `index.html`). No `compose.yaml` o serviço `frontend` responde em `http://localhost:8081` (`FRONTEND_PORT`):

```
docker compose up -d --build frontend
```

## Hook de pre-commit

O `npm ci`/`npm install` em `src/frontend/` instala o husky na raiz do repositório. Em cada commit, o `lint-staged` roda oxlint e prettier nos `.ts`/`.tsx` alterados em `src/frontend/`. Commits que só tocam backend ou gateway passam sem efeito.

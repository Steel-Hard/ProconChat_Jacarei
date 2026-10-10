# ProconChat - Painel (frontend)

Painel administrativo do ProconChat (RF08), feito com React 19, TypeScript (`strict`), Vite, React Router, Redux Toolkit com RTK Query, i18next com react-i18next, CSS Modules e Vitest com Testing Library. Segue os padrões do `template-react` da equipe.

## Requisitos

- Node 24 (`.nvmrc` indica `24.21.0`; `engines` exige `>=24.15.0`). Com nvm: `nvm use`.

## Comandos

Rode dentro de `src/frontend/`.

| Comando                                   | O que faz                                                                     |
| ----------------------------------------- | ----------------------------------------------------------------------------- |
| `npm ci`                                  | Instala as dependências e ativa o hook de pre-commit                          |
| `npm run dev`                             | Sobe o servidor de desenvolvimento do Vite                                    |
| `npm run typecheck`                       | Checa os tipos com `tsc -b` (`src/` e `vite.config.ts`)                       |
| `npm run build`                           | Roda o `typecheck` e gera `dist/`                                             |
| `npm run preview`                         | Serve o `dist/` já gerado                                                     |
| `npm test`                                | Vitest em modo interativo                                                     |
| `npm run test:run`                        | Vitest uma única vez (usado no CI)                                            |
| `npm run test:cov`                        | Suíte inteira com cobertura (`coverage/`), mínimo de 80% em todas as métricas |
| `npm run lint` / `npm run lint:fix`       | oxlint                                                                        |
| `npm run format` / `npm run format:check` | Prettier em `ts`, `tsx`, `css`, `json`, `md`, `yml` e `html`                  |

O CI (`.github/workflows/ci.yml`) roda `format:check`, `lint`, `build` e `test:run`.

## Variáveis de ambiente

- `VITE_API_URL`: URL base do Backend (padrão de desenvolvimento em `.env.example`: `http://localhost:3000`). É lida só em `src/services/http/apiUrl.ts`, e fica vazia quando não existe. O Vite embute o valor no build, então mudar a variável exige rebuild da imagem. O `.env.example` fixa `VITE_API_URL=http://localhost:3000`, o que sobrepõe o padrão do `compose.yaml` (`http://localhost:${BACKEND_PORT:-3000}`): ao mudar `BACKEND_PORT` no `.env`, ajuste `VITE_API_URL` para a mesma porta, senão o build embute a URL errada.

## Estrutura de `src/`

- `App.tsx`: `Router` dentro do `<Provider store={store}>`, com `@/i18n/i18n` e `global.css` importados por efeito colateral.
- `routers/`: `paths.ts` (`ROUTES`), `routes.tsx` (o `RouteObject[]` com as páginas em `lazy`), `Router.tsx` (`createBrowserRouter(routes)`) e `RequireAuth.tsx`.
- `layouts/`: `Root.layout.tsx` e `Panel.layout.tsx`. Cada layout tem um `<Suspense>` em volta do próprio `<Outlet />`; as rotas não têm `Suspense`.
- `pages/`: telas (`Nome.page.tsx`); a lógica de cada tela fica em `pages/hooks/use<Nome>.ts`.
- `components/`: componentes compartilhados entre telas (`Nome.tsx`).
- `hooks/`: hooks compartilhados (`useAuth`, `useLogout`, `useMediaQuery`, `useIsDocked`, `useCompactTable`, `useShowAccountEmail`, `useNavBadges`, `useToast`).
- `contexts/`: contextos React (`toastContext`).
- `navigation/`: itens do menu, regras de acesso e trilha (`navGroups`, `permissionKeys`, `canAccess`, `visibleNavGroups`, `firstAllowedPath`, `activeNavKey`, `breadcrumbFor`).
- `status/`: cores e ordem dos status de agendamento e dos desfechos de conversa.
- `i18n/`: configuração do i18next (um símbolo por arquivo). `locales/pt-BR/<namespace>.json`: os textos.
- `store/`: Redux Toolkit e RTK Query (`api.ts`, `rootReducer.ts`, `createStore.ts`, `store.ts`, `useAppDispatch.ts`, `useAppSelector.ts` e `slices/`).
- `services/http/`: cliente HTTP, um arquivo por função (`apiUrl`, `get`, `post`, `put`, `patch`, `del`, `request`, `parseResponse`, `HttpError`, `setTokenRefresher`, `onUnauthorized`). `services/session/`: o token de acesso em memória.
- `styles/`: `global.css` (fontes, cores e reset) e CSS Modules em `styles/<components|layouts|pages>/<nome>.module.css`.
- `types/<dominio>/<Nome>.types.ts`: tipos exportados, um por arquivo.
- `utils/`: funções puras (`formatDate`, `initialsOf`).
- `testUtils/`: apoio aos testes (`renderWithStore`, `mockMatchMedia`, `setViewportWidth`).

## Convenções

- Alias `@/` para `src/`; imports com `../` são proibidos pelo oxlint.
- Um símbolo exportado por arquivo, sempre `export default` no final. Tipo exportado vai para `src/types/<dominio>/<Nome>.types.ts`; tipo local fica sem `export`.
- Identificadores e chaves de tradução em inglês. Nenhum texto de interface no código: tudo vem de `t()` ou `<Trans>`, com o valor em `src/locales/pt-BR/`. A regra `react/jsx-no-literals` do oxlint acusa texto literal no JSX (fora dos testes). Mensagem de `Error` lançada no código fica em português.
- Testes em `test/` dentro da pasta do arquivo testado (`src/components/Sidebar.tsx` → `src/components/test/Sidebar.test.tsx`), importando por `@/`. Os testes afirmam o texto em português.
- Sem comentários no código.

## Idioma

Só pt-BR (`SUPPORTED_LANGUAGES = ["pt-BR"]`, fallback `pt-BR`). A estrutura do template continua: detecção por `?lng=`, escolha salva e navegador, com qualquer variante `pt-*` resolvida para `pt-BR` e o resto caindo no fallback. A única escrita em `localStorage` é a do idioma escolhido (`proconchat:language`), que não é dado pessoal. Novo namespace entra em `src/locales/pt-BR/`, em `src/i18n/resources.ts` e no `ns` de `src/i18n/i18n.ts`. `src/types/i18next.d.ts` tipa as chaves: chave inexistente não compila. O namespace `layoutPreview` é exceção: fica fora de `resources.ts` e do `ns`, entra no tipo pelo `i18next.d.ts` e é registrado por `src/i18n/registerLayoutPreviewNamespace.ts` só quando a rota `/dev/layout` carrega, para os textos da prévia não irem para o build de produção.

## Estado global

- Redux Toolkit para estado de cliente compartilhado. A conta logada fica no slice `account` (`store/slices/account.slice.ts`, `state.account.current`), lida com `useAppSelector` e escrita com `accountLoaded`/`accountCleared` via `useAppDispatch`. A store vive só em memória.
- RTK Query (`store/api.ts`) para dado do servidor, com endpoints injetados por domínio em `store/api/<dominio>.api.ts`. A `baseQuery` usa `VITE_API_URL`, `credentials: "include"`, `Accept-Language` e `Authorization: Bearer` quando há token. A renovação de token em 401 ainda não existe no RTK Query, só no cliente HTTP.
- Testes de componente que leem a store usam `renderWithStore(ui, { preloadedState })`.

## Autenticação no cliente

- O token de acesso fica apenas em memória (`services/session/`); nunca em `localStorage`, `sessionStorage` ou cookie legível por JavaScript. Ele não está no Redux porque o cliente HTTP, que roda fora do React, precisa dele. Recarregar a página perde o token, e a renovação virá do cookie httpOnly de refresh.
- O cliente HTTP envia `credentials: "include"`, `Accept-Language` e `Authorization: Bearer <token>` quando há token. Em 401, se houver um refresher registrado com `setTokenRefresher`, ele é chamado uma vez (compartilhado entre requisições simultâneas) e a requisição é repetida uma única vez; sem refresher, ou se o refresh falhar, o token é limpo e o callback de `onUnauthorized` é chamado. Erros viram `HttpError` com `status`, `code` e `message` do envelope `{ error: { code, message } }` do Backend.
- Nota para #57/#84: `credentials: "include"` exige que o Backend responda CORS com origem explícita e `Access-Control-Allow-Credentials` (o `cors()` aberto de hoje não serve) e que o cookie tenha `SameSite` compatível com a origem do painel. Detalhes no comentário da issue #57.
- Todo 401 limpa o token e chama `onUnauthorized`, inclusive o 401 de credencial errada em `POST /login`. A tela de login (#84) deve tratar o `HttpError` antes do callback global, ou o redirecionamento de `onUnauthorized` entra em loop.

## Layout e componentes compartilhados

Toda rota protegida é renderizada dentro do `PanelLayout`: menu lateral (`Sidebar`, com `SidebarGroup` e `SidebarLink`), topo com trilha e "Minha conta" (`Topbar` e `AccountMenu`), área principal e o `ToastProvider`. Login, "Acesso negado" e a página 404 ficam fora dele.

- Menu por permissão: `navigation/` define os itens, a trilha e quem vê cada item. O Admin vê tudo; WhatsApp é só do Admin; "Gerenciar agendamentos" inclui "Ver agendamentos". Esconder o item não é controle de acesso: a API valida de novo. Os rótulos ficam em `common:navigation`.
- Conta logada: a #84 despacha `accountSlice.actions.accountLoaded` com o resultado de "quem sou eu". Com conta `null` o menu fica vazio e o topo não mostra o bloco da conta. "Sair" (`useLogout`) limpa o token e a conta.
- Contador do menu: `hooks/useNavBadges.ts` devolve `{ [chave]: { count, label } }`, hoje vazio. A #85 troca a implementação para os agendamentos pendentes. O contador só aparece com `count > 0`.
- Limites de largura: menu encaixado a partir de 1200 px (`useIsDocked`; abaixo vira gaveta aberta pelo botão "Menu"); `useCompactTable()` é `true` até 1431 px e `false` a partir de 1432 px; o e-mail da conta aparece a partir de 940 px (`useShowAccountEmail`).
- Componentes em `components/`:
    - `StatusBadge`: selo de status de agendamento (`kind="appointment"`) e de desfecho de conversa (`kind="outcome"`), com chaves iguais aos enums do banco, rótulo em `common:status` e cores em `status/`.
    - `EmptyState`: título, descrição e ação opcional.
    - `InfoTooltip`: ícone ⓘ que abre ao passar o mouse, focar ou tocar.
    - `ConfirmDialog`: modal de confirmação com conteúdo extra opcional e `tone="danger"`.
    - `ToastProvider` + `useToast()`: aviso temporário (2600 ms), um por vez.
    - `UnsavedChangesBar`: "N alterações não salvas", lista de pendentes ao passar o mouse, focar ou tocar, "Descartar" e "Salvar alterações".
    - `LastChangeNote`: "Última alteração por [nome] em [data]". Recebe `{ changedBy, changedAt }`, com `changedAt` em ISO 8601 com fuso, e mostra a data em dd/mm/aaaa no fuso de Brasília por `utils/formatDate.ts`. Sem alteração ou com data inválida, não mostra nada. O `formatDate` também aceita data sem hora (`AAAA-MM-DD`, como uma coluna `DATE`) e a formata como está, sem conversão de fuso.
- Prévia: com `npm run dev`, a rota `/dev/layout` mostra o layout com uma conta Admin de exemplo e um exemplo de cada componente. Ela só existe em desenvolvimento e não entra no build de produção, nem os textos dela.

## Fontes

Manrope (500 a 800) e Inter (400 a 700), só o subconjunto latin, em `public/fonts/` junto com as licenças OFL (`inter-OFL.txt`, `manrope-OFL.txt`). O `@font-face` fica em `src/styles/global.css` e o `index.html` faz `preload` da Inter 400 e da Manrope 700. Nada é baixado de serviço de terceiros.

## Docker

O `Dockerfile` faz o build do Vite e serve `dist/` com nginx (fallback de SPA para `index.html`). No `compose.yaml` o serviço `frontend` responde em `http://localhost:8081` (`FRONTEND_PORT`):

```
docker compose up -d --build frontend
```

## Hook de pre-commit

O `npm ci`/`npm install` em `src/frontend/` instala o husky na raiz do repositório (script `prepare`). Em cada commit, o `lint-staged` roda `oxlint --fix` e `prettier --write` nos `.ts`/`.tsx` e só o `prettier --write` nos `.css`/`.json`/`.md`/`.yml`/`.html` alterados em `src/frontend/`. Commits que só tocam backend ou gateway passam sem efeito.

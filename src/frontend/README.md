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
- `routers/`: `paths.ts` (`ROUTES`), `routes.tsx` (o `RouteObject[]` com as páginas em `lazy`), `Router.tsx` (`createBrowserRouter(routes)`), `RequireAuth.tsx` (sessão) e `RequireAccess.tsx` (permissão da rota).
- `layouts/`: `Root.layout.tsx` e `Panel.layout.tsx`. Cada layout tem um `<Suspense>` em volta do próprio `<Outlet />`; as rotas não têm `Suspense`.
- `pages/`: telas (`Nome.page.tsx`); a lógica de cada tela fica em `pages/hooks/use<Nome>.ts`.
- `components/`: componentes compartilhados entre telas (`Nome.tsx`), inclusive o `PanelShell` (o conteúdo do `PanelLayout`) e o `ChangePasswordDialog`.
- `hooks/`: hooks compartilhados (`useSession`, `useLogout`, `useChangePasswordForm`, `useMediaQuery`, `useIsDocked`, `useCompactTable`, `useShowAccountEmail`, `useNavBadges`, `useToast`).
- `contexts/`: contextos React (`toastContext`).
- `navigation/`: itens do menu, regras de acesso e trilha (`navGroups`, `permissionKeys`, `canAccess`, `visibleNavGroups`, `firstAllowedPath`, `activeNavKey`, `breadcrumbFor`).
- `status/`: cores e ordem dos status de agendamento e dos desfechos de conversa.
- `i18n/`: configuração do i18next (um símbolo por arquivo). `locales/pt-BR/<namespace>.json`: os textos.
- `store/`: Redux Toolkit e RTK Query (`api.ts`, `baseQueryWithSessionRenewal.ts`, `rootReducer.ts`, `createStore.ts`, `store.ts`, `useAppDispatch.ts`, `useAppSelector.ts` e `slices/`).
- `services/http/`: cliente HTTP, um arquivo por função (`apiUrl`, `get`, `post`, `put`, `patch`, `del`, `request`, `parseResponse`, `HttpError`, `refreshSession`, `onUnauthorized`). `services/auth/`: as chamadas de `/api/v1/auth` (`fetchCurrentAccount`, `signIn`, `signOut`, `changePassword` e `toPanelAccount`).
- `styles/`: `global.css` (fontes, cores e reset) e CSS Modules em `styles/<components|layouts|pages>/<nome>.module.css`.
- `types/<dominio>/<Nome>.types.ts`: tipos exportados, um por arquivo.
- `utils/`: funções puras (`formatDate`, `initialsOf`, `safeRedirectPath`, `loginPathFor`).
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

- Redux Toolkit para estado de cliente compartilhado. A conta logada fica no slice `account` (`store/slices/account.slice.ts`): `state.account.current` (a conta ou `null`) e `state.account.status` (`"unknown"` até o `/me` responder, `"authenticated"` ou `"anonymous"`). `accountLoaded` grava a conta e leva a `authenticated`; `accountCleared` limpa a conta e leva a `anonymous`. Leia com `useAppSelector` e escreva com `useAppDispatch`. A store vive só em memória.
- RTK Query (`store/api.ts`) para dado do servidor, com endpoints injetados por domínio em `store/api/<dominio>.api.ts`. A `baseQuery` (`store/baseQueryWithSessionRenewal.ts`) usa `VITE_API_URL`, `credentials: "include"` e `Accept-Language`, sem `Authorization`. No 401 ela renova a sessão como o cliente HTTP (mesmo `refreshSession`, mesmo `onUnauthorized`) e repete a query uma vez.
- Testes de componente que leem a store usam `renderWithStore(ui, { preloadedState })`.

## Autenticação no cliente

- A sessão fica só nos cookies `HttpOnly` do Backend (`proconchat_access`, de 1 h, e `proconchat_refresh`, de 90 dias). Nenhum token chega ao JavaScript, e o painel não envia `Authorization`. Todas as chamadas usam `credentials: "include"`.
- Quem está logado é decidido por `GET /api/v1/auth/me`. O `RequireAuth` usa `hooks/useSession.ts`: com `status: "unknown"`, mostra "Carregando...", chama o `/me` e despacha `accountLoaded` ou `accountCleared`. Uma falha de rede ou 5xx no `/me` também leva ao login. Com `anonymous`, qualquer rota fora de `/login`, inclusive uma inexistente, vai para `/login?redirect=<caminho e query codificados>`.
- 401: o cliente HTTP (`services/http/request.ts`) chama `POST /api/v1/auth/refresh` (`services/http/refreshSession.ts`, uma única chamada compartilhada entre requisições simultâneas). No `204`, repete a requisição uma vez. Se o refresh falhar, ou se a repetição também der 401, chama o handler de `onUnauthorized` e rejeita com o `HttpError` 401 original. O `useSession` registra esse handler, que despacha `accountCleared`, e o `RequireAuth` leva ao login com o `redirect` da tela atual.
- `skipSessionRenewal: true` (em `HttpOptions`) desliga esse fluxo: o 401 só rejeita com `HttpError`. Usam o flag o login (senha errada não pode virar refresh nem logout) e o logout. O `/me` e a troca de senha passam pelo refresh.
- Login (`pages/Login.page.tsx` e `pages/hooks/useLogin.ts`): depois de entrar, a pessoa vai para o `redirect` validado por `utils/safeRedirectPath.ts`, que só aceita caminho interno da mesma origem (recusa `//`, `/\`, endereço absoluto, `javascript:`, caracteres de controle e o próprio `/login`). Sem `redirect` válido, vai para a primeira tela permitida da conta. As mensagens de erro são mapeadas por status e `code`; o texto do Backend (em inglês) nunca aparece.
- Permissão da rota (`routers/RequireAccess.tsx`): uma tela que a conta não pode acessar, uma rota inexistente e uma conta sem nenhuma tela permitida mostram a NotFound, sem o layout. Quem não pode ver o Dashboard e abre `/` vai para a primeira tela permitida. Isso não é controle de acesso: a API valida de novo.
- "Sair" (`hooks/useLogout.ts`) chama `POST /api/v1/auth/logout`. Só no `204` a conta é limpa e a pessoa vai para `/login`, sem `redirect`. Se falhar, a pessoa continua logada na mesma tela e vê o aviso "Não foi possível sair agora. Tente de novo.". A conta é limpa no mesmo tick da navegação, que usa `flushSync`, para o `RequireAuth` não montar um `redirect` para a tela de onde a pessoa saiu.
- "Alterar minha senha" (`components/ChangePasswordDialog.tsx` e `hooks/useChangePasswordForm.ts`): `POST /api/v1/auth/change-password`. A senha atual errada (`400 INVALID_CURRENT_PASSWORD`) mostra o erro no modal e não desloga.
- `403 INVALID_ORIGIN` só chega ao JavaScript quando o painel e a API estão na mesma origem, como em produção (`VITE_API_URL` vazia atrás do Caddy). Com outra origem, o navegador barra o CORS, o `fetch` falha, e a tela mostra a mensagem genérica de falha.
- `npm run dev` (porta 5173) contra o Backend do Compose não consegue entrar: o `FRONTEND_ORIGIN` do Compose é `http://localhost:8081`, e o CORS recusa a 5173. Use o painel do Compose (`http://localhost:8081`) ou suba o Backend com `FRONTEND_ORIGIN=http://localhost:5173`. Abrir o painel por `127.0.0.1` em vez de `localhost` também é outra origem.
- A imagem do Backend roda com `NODE_ENV=production` e marca os cookies como `Secure`. Chrome e Firefox aceitam esses cookies em `http://localhost`; o Safari não, então use Chrome ou Firefox no ambiente local.

## Layout e componentes compartilhados

Toda rota protegida é renderizada dentro do `PanelLayout`: menu lateral (`Sidebar`, com `SidebarGroup` e `SidebarLink`), topo com trilha e "Minha conta" (`Topbar` e `AccountMenu`), área principal e o `ToastProvider`. O `PanelLayout` só monta o `ToastProvider` em volta do `PanelShell`, que tem o resto, para o "Sair" e a troca de senha conseguirem mostrar avisos. Login e a página 404 ficam fora dele.

- Menu por permissão: `navigation/` define os itens, a trilha e quem vê cada item. O Admin vê tudo; WhatsApp é só do Admin; "Gerenciar agendamentos" inclui "Ver agendamentos". Esconder o item não é controle de acesso: a API valida de novo. Os rótulos ficam em `common:navigation`.
- Conta logada: vem do `/me` ou do login (`accountLoaded`). Com conta `null` o menu fica vazio e o topo não mostra o bloco da conta. "Minha conta" tem "Alterar minha senha" e "Sair" (ver "Autenticação no cliente").
- Contador do menu: `hooks/useNavBadges.ts` devolve `{ [chave]: { count, label } }`, hoje vazio. A #85 troca a implementação para os agendamentos pendentes. O contador só aparece com `count > 0`.
- Limites de largura: menu encaixado a partir de 1200 px (`useIsDocked`; abaixo vira gaveta aberta pelo botão "Menu"); `useCompactTable()` é `true` até 1431 px e `false` a partir de 1432 px; o e-mail da conta aparece a partir de 940 px (`useShowAccountEmail`).
- Componentes em `components/`:
    - `StatusBadge`: selo de status de agendamento (`kind="appointment"`) e de desfecho de conversa (`kind="outcome"`), com chaves iguais aos enums do banco, rótulo em `common:status` e cores em `status/`.
    - `EmptyState`: título, descrição e ação opcional.
    - `InfoTooltip`: ícone ⓘ que abre ao passar o mouse, focar ou tocar.
    - `ConfirmDialog`: modal de confirmação com conteúdo extra opcional e `tone="danger"`. Com `submitOnEnter`, o conteúdo fica num `<form>`: Enter num campo aciona o confirmar (só se ele estiver habilitado e não ocupado), o confirmar vira `type="submit"` e o foco inicial vai para o primeiro campo. Sem a prop, o foco inicial fica no cancelar.
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

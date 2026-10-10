# ProconChat - Painel (frontend)

Painel administrativo do ProconChat (RF08), feito com React 19, Vite, TypeScript e React Router.

## Requisitos

- Node 24 (`.nvmrc` indica `24.21.0`; `engines` exige `>=24.15.0`). Com nvm: `nvm use`.

## Comandos

Rode dentro de `src/frontend/`.

| Comando                                   | O que faz                                            |
| ----------------------------------------- | ---------------------------------------------------- |
| `npm ci`                                  | Instala as dependências e ativa o hook de pre-commit |
| `npm run dev`                             | Sobe o servidor de desenvolvimento do Vite           |
| `npm run build`                           | Checa os tipos (`tsc --noEmit`) e gera `dist/`       |
| `npm run preview`                         | Serve o build localmente                             |
| `npm test`                                | Vitest em modo interativo                            |
| `npm run test:run`                        | Vitest uma única vez (usado no CI)                   |
| `npm run lint` / `npm run lint:fix`       | oxlint                                               |
| `npm run format` / `npm run format:check` | Prettier                                             |

Não há limite mínimo nem relatório de cobertura.

## Variáveis de ambiente

- `VITE_API_URL`: URL base do Backend (padrão de desenvolvimento em `.env.example`: `http://localhost:3000`). O Vite embute o valor no build, então mudar a variável exige rebuild da imagem. O `.env.example` fixa `VITE_API_URL=http://localhost:3000`, o que sobrepõe o padrão do `compose.yaml` (`http://localhost:${BACKEND_PORT:-3000}`): ao mudar `BACKEND_PORT` no `.env`, ajuste `VITE_API_URL` para a mesma porta, senão o build embute a URL errada.

## Estrutura de `src/`

- `routers/`: `paths.ts` (`ROUTES`), `Router.tsx` (rotas com `lazy` + `Suspense`), `RequireAuth.tsx` e `navigation.ts` (itens do menu, trilha e regra de acesso de cada item).
- `layouts/`: layouts das rotas (`Nome.layout.tsx`), entre eles o `Panel.layout.tsx`.
- `pages/`: telas (`Nome.page.tsx`); a lógica de cada tela fica em `pages/hooks/`.
- `components/`: componentes compartilhados entre telas (`Nome.tsx`).
- `hooks/`: hooks compartilhados (`useAuth`, `useAccount`, `useMediaQuery`, `useNavBadges`, `useToast`).
- `services/`: `http.service.ts` (cliente HTTP), `session.service.ts` (token em memória) e `account.service.ts` (conta logada em memória).
- `styles/`: `global.css` (cores e fontes como variáveis) e CSS Modules em `styles/<pasta>/<nome>.module.css`.
- `types/`: declarações e tipos compartilhados (`account.ts` com as chaves de permissão).
- `utils/`: funções puras reaproveitáveis (`formatDate`).
- `test/`: apoio aos testes (`mockMatchMedia`, instalado com viewport de 1440 px em `setupTests.ts`).

## Layout e componentes compartilhados

Toda rota protegida é renderizada dentro do `PanelLayout` (`layouts/Panel.layout.tsx`): menu lateral (`components/Sidebar.tsx`), topo com trilha e "Minha conta" (`components/Topbar.tsx` e `components/AccountMenu.tsx`), área principal e o `ToastProvider`. Login, "Acesso negado" e a página 404 ficam fora dele.

- Menu por permissão: `routers/navigation.ts` define os itens, a trilha e quem vê cada item (`canAccess`, `visibleNavGroups`, `firstAllowedPath`, `breadcrumbFor`, `activeNavKey`). O Admin vê tudo; WhatsApp é só do Admin; "Gerenciar agendamentos" inclui "Ver agendamentos". Esconder o item não é controle de acesso: a API valida de novo.
- Conta logada: `services/account.service.ts` guarda a `PanelAccount` só em memória, e `useAccount()` lê dali. A #84 chama `setAccount` com o resultado de "quem sou eu". Com conta `null` o menu fica vazio e o topo não mostra o bloco da conta. "Sair" limpa o token e a conta.
- Contador do menu: `hooks/useNavBadges.ts` devolve `{ [chave]: { count, label } }`, hoje vazio. A #85 troca a implementação para os agendamentos pendentes. O contador só aparece com `count > 0`.
- Limites de largura (`hooks/useMediaQuery.ts`): menu encaixado a partir de 1200 px (abaixo vira gaveta aberta pelo "☰ Menu"); `useCompactTable()` é `true` até 1431 px e `false` a partir de 1432 px; o e-mail da conta aparece a partir de 940 px.
- Componentes em `components/`:
    - `StatusBadge`: selo de status de agendamento (`kind="appointment"`) e de desfecho de conversa (`kind="outcome"`), com chaves iguais aos enums do banco e cores em `statusStyles.ts`.
    - `EmptyState`: título, descrição e ação opcional.
    - `InfoTooltip`: ícone ⓘ que abre ao passar o mouse, focar ou tocar.
    - `ConfirmDialog`: modal de confirmação com conteúdo extra opcional e `tone="danger"`.
    - `ToastProvider` + `useToast()`: aviso temporário (2600 ms), um por vez.
    - `UnsavedChangesBar`: "N alterações não salvas", lista de pendentes ao passar o mouse ou focar, "Descartar" e "Salvar alterações".
    - `LastChangeNote`: "Última alteração por [nome] em [data]". Recebe `{ changedBy, changedAt }`, com `changedAt` em ISO 8601 com fuso, e mostra a data em dd/mm/aaaa no fuso de Brasília por `utils/formatDate.ts`. Sem alteração ou com data inválida, não mostra nada. O `formatDate` também aceita data sem hora (`AAAA-MM-DD`, como uma coluna `DATE`) e a formata como está, sem conversão de fuso.
- Prévia: com `npm run dev`, a rota `/dev/layout` mostra o layout com uma conta Admin de exemplo e um exemplo de cada componente. Ela só existe em desenvolvimento e não entra no build de produção.

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

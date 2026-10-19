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
- `navigation/`: itens do menu, regras de acesso e trilha (`navGroups`, `permissionKeys`, `canAccess`, `hasPermission`, `visibleNavGroups`, `firstAllowedPath`, `activeNavKey`, `breadcrumbFor`).
- `status/`: cores e ordem dos status de agendamento e dos desfechos de conversa, e as cores da situação do WhatsApp.
- `i18n/`: configuração do i18next (um símbolo por arquivo). `locales/pt-BR/<namespace>.json`: os textos.
- `store/`: Redux Toolkit e RTK Query (`api.ts`, `baseQueryWithSessionRenewal.ts`, `rootReducer.ts`, `createStore.ts`, `store.ts`, `useAppDispatch.ts`, `useAppSelector.ts` e `slices/`).
- `services/http/`: cliente HTTP, um arquivo por função (`apiUrl`, `get`, `post`, `put`, `patch`, `del`, `request`, `parseResponse`, `HttpError`, `refreshSession`, `onUnauthorized`). `services/auth/`: as chamadas de `/api/v1/auth` (`fetchCurrentAccount`, `signIn`, `signOut`, `changePassword` e `toPanelAccount`). `services/whatsapp/`: teste de conexão e salvar da configuração do WhatsApp (`testWhatsAppConnection`, `saveWhatsAppSettings`), fora do RTK Query porque levam o token e o App Secret digitados.
- `styles/`: `global.css` (fontes, cores e reset) e CSS Modules em `styles/<components|layouts|pages>/<nome>.module.css`.
- `types/<dominio>/<Nome>.types.ts`: tipos exportados, um por arquivo.
- `utils/`: funções puras (`formatDate`, `formatTime`, `formatDayMonth`, `weekdayOf`, `initialsOf`, `safeRedirectPath`, `loginPathFor`, e as da lista de agendamentos: `appointmentListDefaults`, `parseAppointmentListParams`, `toAppointmentListParams`, `appointmentStatusFilters`, `appointmentPeriods`, `appointmentResponsibleFilters`, `minAppointmentSearchLength`, `defaultSortMode`, `appointmentActionErrorKey`).
- `testUtils/`: apoio aos testes (`renderWithStore`, `mockMatchMedia`, `setViewportWidth`, e os da tela de Agendamentos: `renderAppointmentsPage`, `buildAppointmentList`, `buildAppointmentListItem`, `buildAppointmentRowView`, `appointmentTableTexts`).

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
- A busca da tela de Agendamentos fica no slice `appointmentSearch` (`state.appointmentSearch.term`, ações `searchChanged` e `searchCleared`), nunca na URL nem no `history.state`. O `accountCleared` também apaga o termo.
- "Sair" e a sessão expirada (`onUnauthorized` registrado pelo `useSession`) despacham `api.util.resetApiState()` junto com `accountCleared`, para o cache do RTK Query (inclusive o argumento da última busca) não sobrar para a próxima conta na mesma aba.
- Segredos digitados (token de acesso e App Secret do WhatsApp) nunca entram na store: o RTK Query guarda o argumento de cada mutation em `state.api.mutations`. Por isso o teste de conexão e o salvar usam `services/whatsapp/` sobre o cliente HTTP, e o valor digitado fica só no estado React do hook da tela até salvar, descartar ou cancelar.

## Autenticação no cliente

- A sessão fica só nos cookies `HttpOnly` do Backend (`proconchat_access`, de 1 h, e `proconchat_refresh`, de 90 dias). Nenhum token chega ao JavaScript, e o painel não envia `Authorization`. Todas as chamadas usam `credentials: "include"`.
- Quem está logado é decidido por `GET /api/v1/auth/me`. O `RequireAuth` usa `hooks/useSession.ts`: com `status: "unknown"`, mostra "Carregando...", chama o `/me` e despacha `accountLoaded` ou `accountCleared`. Uma falha de rede ou 5xx no `/me` também leva ao login. Com `anonymous`, qualquer rota fora de `/login`, inclusive uma inexistente, vai para `/login?redirect=<caminho e query codificados>`.
- 401: o cliente HTTP (`services/http/request.ts`) chama `POST /api/v1/auth/refresh` (`services/http/refreshSession.ts`, uma única chamada compartilhada entre requisições simultâneas). No `204`, repete a requisição uma vez. Se o refresh falhar, ou se a repetição também der 401, chama o handler de `onUnauthorized` e rejeita com o `HttpError` 401 original. O `useSession` registra esse handler, que despacha `accountCleared`, e o `RequireAuth` leva ao login com o `redirect` da tela atual.
- `skipSessionRenewal: true` (em `HttpOptions`) desliga esse fluxo: o 401 só rejeita com `HttpError`. Usam o flag o login (senha errada não pode virar refresh nem logout) e o logout. O `/me` e a troca de senha passam pelo refresh.
- Login (`pages/Login.page.tsx` e `pages/hooks/useLogin.ts`): depois de entrar, a pessoa vai para o `redirect` validado por `utils/safeRedirectPath.ts`, que só aceita caminho interno da mesma origem (recusa `//`, `/\`, endereço absoluto, `javascript:`, caracteres de controle e o próprio `/login`). Sem `redirect` válido, vai para a primeira tela permitida da conta. As mensagens de erro são mapeadas por status e `code`; o texto do Backend (em inglês) nunca aparece.
- Permissão da rota (`routers/RequireAccess.tsx`): uma tela que a conta não pode acessar, uma rota inexistente e uma conta sem nenhuma tela permitida mostram a NotFound, sem o layout. Quem não pode ver o Dashboard e abre `/` vai para a primeira tela permitida. Enquanto o Dashboard não existe, `/` redireciona para `/agendamentos` (`routers/routes.tsx`, PR #115) para quem pode ver o Dashboard; uma conta que vê o Dashboard sem ver agendamentos (só Sessões ou Relatórios) cai, assim, na NotFound. Isso não é controle de acesso: a API valida de novo.
- "Sair" (`hooks/useLogout.ts`) chama `POST /api/v1/auth/logout`. Só no `204` a conta é limpa e a pessoa vai para `/login`, sem `redirect`. Se falhar, a pessoa continua logada na mesma tela e vê o aviso "Não foi possível sair agora. Tente de novo.". A conta é limpa no mesmo tick da navegação, que usa `flushSync`, para o `RequireAuth` não montar um `redirect` para a tela de onde a pessoa saiu.
- "Alterar minha senha" (`components/ChangePasswordDialog.tsx` e `hooks/useChangePasswordForm.ts`): `POST /api/v1/auth/change-password`. A senha atual errada (`400 INVALID_CURRENT_PASSWORD`) mostra o erro no modal e não desloga.
- `403 INVALID_ORIGIN` só chega ao JavaScript quando o painel e a API estão na mesma origem, como em produção (`VITE_API_URL` vazia atrás do Caddy). Com outra origem, o navegador barra o CORS, o `fetch` falha, e a tela mostra a mensagem genérica de falha.
- `npm run dev` (porta 5173) contra o Backend do Compose não consegue entrar: o `FRONTEND_ORIGIN` do Compose é `http://localhost:8081`, e o CORS recusa a 5173. Use o painel do Compose (`http://localhost:8081`) ou suba o Backend com `FRONTEND_ORIGIN=http://localhost:5173`. Abrir o painel por `127.0.0.1` em vez de `localhost` também é outra origem.
- A imagem do Backend roda com `NODE_ENV=production` e marca os cookies como `Secure`. Chrome e Firefox aceitam esses cookies em `http://localhost`; o Safari não, então use Chrome ou Firefox no ambiente local.

## Layout e componentes compartilhados

Toda rota protegida é renderizada dentro do `PanelLayout`: menu lateral (`Sidebar`, com `SidebarGroup` e `SidebarLink`), topo com trilha e "Minha conta" (`Topbar` e `AccountMenu`), área principal e o `ToastProvider`. O `PanelLayout` só monta o `ToastProvider` em volta do `PanelShell`, que tem o resto, para o "Sair" e a troca de senha conseguirem mostrar avisos. Login e a página 404 ficam fora dele.

- Menu por permissão: `navigation/` define os itens, a trilha e quem vê cada item. O Admin vê tudo; WhatsApp é só do Admin; "Gerenciar agendamentos" inclui "Ver agendamentos". Esconder o item não é controle de acesso: a API valida de novo. Os rótulos ficam em `common:navigation`.
- Conta logada: vem do `/me` ou do login (`accountLoaded`). Com conta `null` o menu fica vazio e o topo não mostra o bloco da conta. "Minha conta" tem "Alterar minha senha" e "Sair" (ver "Autenticação no cliente").
- Contador do menu: `hooks/useNavBadges.ts` devolve `{ appointments: { count, label } }` com o número de `GET /api/v1/appointments/pending-count`, só para quem acessa Agendamentos e só com `count > 0`. Com `0`, erro ou conta sem acesso, devolve `{}` e não chama a API. O texto oculto fica em `common:navigation.pendingBadge`.
- Limites de largura: menu encaixado a partir de 1200 px (`useIsDocked`; abaixo vira gaveta aberta pelo botão "Menu"); `useCompactTable()` é `true` até 1431 px e `false` a partir de 1432 px; o e-mail da conta aparece a partir de 940 px (`useShowAccountEmail`).
- Componentes em `components/`:
    - `StatusBadge`: selo de status de agendamento (`kind="appointment"`), de desfecho de conversa (`kind="outcome"`) e da situação do WhatsApp (`kind="whatsapp"`: `OPERATING`, `PAUSED`, `INVALID_CREDENTIALS`, `NOT_VERIFIED`, `NOT_CONFIGURED`), com rótulo em `common:status` e cores em `status/`.
    - `EmptyState`: título, descrição e ação opcional.
    - `InfoTooltip`: ícone ⓘ que abre ao passar o mouse, focar ou tocar.
    - `ConfirmDialog`: modal de confirmação com conteúdo extra opcional e `tone="danger"`. Com `submitOnEnter`, o conteúdo fica num `<form>`: Enter num campo aciona o confirmar (só se ele estiver habilitado e não ocupado), o confirmar vira `type="submit"` e o foco inicial vai para o primeiro campo. Sem a prop, o foco inicial fica no cancelar.
    - `ToastProvider` + `useToast()`: aviso temporário (2600 ms), um por vez.
    - `UnsavedChangesBar`: "N alterações não salvas", lista de pendentes ao passar o mouse, focar ou tocar, "Descartar" e "Salvar alterações". Com `saveDisabled`, o Salvar fica travado mesmo com alterações; com `saveHint`, o motivo aparece ao lado e vira a descrição acessível do botão.
    - `Seal`: selo neutro (`tone="neutral"`) ou de alerta (`tone="warning"`), como "Por representante" e "Fora da grade atual".
    - `Pagination`: contagem, "Página X de Y", "‹ Anterior" e "Próxima ›", desabilitados nas pontas. Sem mais de uma página, só a contagem.
    - Partes da lista de agendamentos, que recebem os textos já traduzidos por props: `AppointmentStatusChips`, `AppointmentListFilters`, `AppointmentSortSelect`, `AppointmentTable` (com `AppointmentSortHeader`, `AppointmentRow` e `AppointmentCompactRow`), `AppointmentProtocolLink` e `AppointmentClaimButton`.
    - Seções do detalhe do agendamento, que também recebem os textos prontos por props: `AppointmentDetailHeader`, `AppointmentFacts` (com `AppointmentFact`), `AppointmentDocuments` (com `AppointmentDocumentGroup`), `AppointmentTimeline` (com `AppointmentTimelineStep`), `AppointmentHistory` (com `AppointmentHistoryEntry`) e `AppointmentActions` (com `AppointmentActionItem`).
    - `LastChangeNote`: "Última alteração por [nome] em [data]". Recebe `{ changedBy, changedAt }`, com `changedAt` em ISO 8601 com fuso, e mostra a data em dd/mm/aaaa no fuso de Brasília por `utils/formatDate.ts`. Sem alteração ou com data inválida, não mostra nada. O `formatDate` também aceita data sem hora (`AAAA-MM-DD`, como uma coluna `DATE`) e a formata como está, sem conversão de fuso.
- Telas liberadas no menu (`navigation/navItemsReady.ts`): Agendamentos (#85) e WhatsApp (#54). O detalhe do agendamento (`/agendamentos/:id`, #86) abre pela lista. As outras rotas continuam com "Em construção" até a issue de cada tela.
- Prévia: com `npm run dev`, a rota `/dev/layout` mostra o layout com uma conta Admin de exemplo e um exemplo de cada componente. Ela só existe em desenvolvimento e não entra no build de produção, nem os textos dela.

## Tela de Agendamentos

Rota `/agendamentos`, para quem tem Ver ou Gerenciar agendamentos (e o Admin). A página `pages/Appointments.page.tsx` só renderiza; a lógica fica em `pages/hooks/useAppointments.ts` e a busca em `pages/hooks/useAppointmentSearch.ts`. Os textos ficam no namespace `appointments`, e os dias da semana em `common:weekdays`.

- Endpoints em `store/api/appointments.api.ts`: `getAppointments` (sempre com `limit=20`, `search` só com 2 ou mais caracteres depois do `trim`, `sortBy`/`sortOrder` só quando a pessoa escolheu uma ordem), `getPendingAppointmentsCount`, `getAppointment` e `updateAppointmentStatus`. Tags de cache em `store/api.ts`: `Appointment`, `AppointmentList` e `AppointmentPendingCount`. A mudança de status grava o detalhe devolvido em `getAppointment(id)` e invalida a lista e o contador, com sucesso ou erro.
- Status, período, responsável, ordem e página ficam na URL (`utils/parseAppointmentListParams.ts` e `utils/toAppointmentListParams.ts`), sem os valores padrão. Valor inválido cai no padrão e não vai para a API. Mudar filtro, busca ou período volta à página 1 e à ordem padrão. A nota da ordem padrão do rodapé vem de `utils/defaultSortMode.ts`.
- A busca fica fora da URL (CPF digitado na recepção não pode ir para o histórico do navegador): só no slice `appointmentSearch`, de onde volta quando a pessoa sai do detalhe. A busca dispara depois de uma pausa curta na digitação. Enter abre o único resultado quando a resposta do termo atual já chegou; Esc e "Limpar" apagam a busca.
- A linha abre o detalhe levando no `state` só a origem (`{ from: { pathname, search } }`). O protocolo é um link, para quem usa o teclado.
- "Assumir" aparece só na linha de um pendente e só para quem gerencia agendamentos (`navigation/hasPermission.ts`), age na hora e mostra o aviso. O erro vira mensagem por `utils/appointmentActionErrorKey.ts` (`common:appointmentActions`).
- Até 1431 px a tabela fica compacta e a ordem é escolhida em "Ordenar por".
- Abrir a lista busca de novo o contador do menu.
- Fora desta tela por enquanto: o calendário semanal e o filtro por um funcionário específico (#87 e #62).

## Tela de Detalhe do agendamento

Rota `/agendamentos/:id`, para quem tem Ver ou Gerenciar agendamentos (e o Admin). A página `pages/AppointmentDetail.page.tsx` só renderiza; a leitura fica em `pages/hooks/useAppointmentDetail.ts`, a montagem dos textos em `pages/hooks/useAppointmentDetailView.ts` e as ações em `pages/hooks/useAppointmentActions.ts`. Os textos ficam no namespace `appointmentDetail`.

- O `id` precisa ser só de dígitos; senão a tela não chama a API e mostra "Agendamento não encontrado.", igual a um `404` ou `400`. Outro erro mostra "Tentar novamente".
- "Voltar para Agendamentos" usa a origem do `state` só quando ela é a própria lista (`/agendamentos` + `search`); sem origem válida, vai para `/agendamentos`.
- A API não manda texto pronto da linha do tempo nem do histórico: `utils/timelineStepLabel.ts` e `utils/appointmentEventLabel.ts` montam a chave de tradução a partir de `type` e `data`, conferindo o tipo de cada campo de `data`. Tipo desconhecido vira "Passo registrado" ou "Evento registrado". "Gerado com auxílio de IA" segue só `generated_by_ai`.
- As ações ("Assumir para mim", "Marcar como atendido", "Marcar como não compareceu") só aparecem para quem gerencia agendamentos e quando `available_actions.<ação>.allowed` é `true`. Os codes `ATTENDANCE_NOT_YET_AVAILABLE` e `NO_SHOW_NOT_YET_AVAILABLE` viram a mensagem de "disponível a partir de"; a tela não calcula datas.
- Cada ação pede confirmação. No sucesso, a tela se atualiza com a resposta do `PATCH`, sem novo `GET`. Com `409` ou `500`/falha de rede, a tela espera reler o detalhe e só então mostra o erro na caixa "Ações" (`role="alert"`), que some na próxima ação. `403` e `404` só mostram a mensagem.
- Quem só vê agendamentos vê tudo, sem botões, com "Sua conta pode apenas visualizar agendamentos." num Pendente ou Confirmado.
- A partir de 1200 px a tela tem duas colunas; abaixo, as seções empilham.
- Fora desta tela por enquanto: atribuir, observações internas e corrigir registro (#87), cancelar e "Tentar novamente" do aviso ao cidadão (#67) e o link da sessão de origem (#72).

## Tela de WhatsApp

Rota `/whatsapp`, só para o Admin (o funcionário vê a tela de não encontrado e a API recusa com `403`). A página `pages/WhatsApp.page.tsx` só renderiza; a lógica fica em `pages/hooks/useWhatsAppSettings.ts`, e os textos no namespace `whatsapp`. As partes da tela ficam em `components/WhatsApp*.tsx` e recebem os textos já traduzidos por props.

- Leitura, pausa e retomada pelo RTK Query (`store/api/whatsappSettings.api.ts`); pausar e reativar gravam a leitura devolvida no cache, sem nova requisição.
- Segredos salvos só aparecem como `••••••••` + 4 últimos caracteres, com "Substituir". O Salvar fica travado até um teste bem-sucedido com exatamente os valores atuais do formulário; qualquer mudança depois do teste invalida o resultado.
- O ID da conta WhatsApp Business é obrigatório na tela, embora a API aceite vazio.
- O texto do campo "Token de acesso" segue o tipo do token (`accessTokenLifetime`): o do token salvo, ou o de um teste bem-sucedido com os valores atuais. Enquanto o Admin substitui o token, só vale o teste do token digitado. Token que não expira: nenhum aviso no campo. Token com validade: a data e a hora de Brasília, em tom neutro com mais de 7 dias, amarelo de 4 a 7 dias e vermelho com 3 dias ou menos ou já expirado. Quando o sistema não sabe o tipo, fica o aviso "Use um token permanente…". O prazo é recalculado a cada teste de conexão e depois de salvar, sem recarregar a tela. O passo 1 de "Configure no painel da Meta" não muda.
- Pausar pede confirmação com a prévia da mensagem fixa e age na hora; reativar não pede confirmação. Os dois mantêm o rascunho e o resultado do teste.
- Sem `PUBLIC_BASE_URL` no Backend, a URL do webhook não existe e a tela mostra um aviso no lugar.
- O fundo da conversa nas prévias (`public/images/whatsapp-chat-background.webp`) é uma imagem de uso livre, sem licença, informada pelo usuário.
- Fora desta tela por enquanto: "Estado do número" e "Histórico de alterações" (#88) e "Modelos de mensagem" (#67).

## Fontes

Manrope (500 a 800) e Inter (400 a 700), só o subconjunto latin, em `public/fonts/` junto com as licenças OFL (`inter-OFL.txt`, `manrope-OFL.txt`). O `@font-face` fica em `src/styles/global.css` e o `index.html` faz `preload` da Inter 400 e da Manrope 700. Nada é baixado de serviço de terceiros.

## Docker

O `Dockerfile` faz o build do Vite e serve `dist/` com nginx (fallback de SPA para `index.html`). No `compose.yaml` o serviço `frontend` responde em `http://localhost:8081` (`FRONTEND_PORT`):

```
docker compose up -d --build frontend
```

## Hook de pre-commit

O `npm ci`/`npm install` em `src/frontend/` instala o husky na raiz do repositório (script `prepare`). Em cada commit, o `lint-staged` roda `oxlint --fix` e `prettier --write` nos `.ts`/`.tsx` e só o `prettier --write` nos `.css`/`.json`/`.md`/`.yml`/`.html` alterados em `src/frontend/`. Commits que só tocam backend ou gateway passam sem efeito.

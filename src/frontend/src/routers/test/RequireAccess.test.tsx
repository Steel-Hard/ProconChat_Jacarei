import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"
import { screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { createMemoryRouter, RouterProvider } from "react-router-dom"
import loadPanelRoutes from "@/testUtils/loadPanelRoutes"
import type PermissionKey from "@/types/account/PermissionKey.types"

let panel: Awaited<ReturnType<typeof loadPanelRoutes>>

function renderAs(path: string, permissions: PermissionKey[], isAdmin = false) {
    const router = createMemoryRouter(panel.routes, { initialEntries: [path] })
    const result = panel.renderWithStore(<RouterProvider router={router} />, {
        preloadedState: {
            account: {
                current: {
                    id: 4,
                    name: "Carla Dias",
                    email: "carla@exemplo.gov.br",
                    isAdmin,
                    permissions
                },
                status: "authenticated"
            }
        }
    })

    return { ...result, router }
}

async function expectNotFound() {
    expect(await screen.findByRole("heading", { name: "404 - Not Found" })).toBeInTheDocument()
    expect(screen.queryByRole("navigation", { name: "Menu principal" })).not.toBeInTheDocument()
}

async function expectNoAccess() {
    expect(
        await screen.findByRole("heading", {
            name: "Sua conta ainda não tem acesso a nenhuma tela"
        })
    ).toBeInTheDocument()
    expect(
        screen.getByText(
            "Peça a um administrador do sistema que libere as telas de que você precisa. Depois, entre de novo."
        )
    ).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Voltar para o login" })).toBeInTheDocument()
    expect(screen.queryByRole("heading", { name: "404 - Not Found" })).not.toBeInTheDocument()
    expect(screen.queryByText("Em construção.")).not.toBeInTheDocument()
    expect(screen.queryByRole("navigation", { name: "Menu principal" })).not.toBeInTheDocument()
}

describe("RequireAccess", () => {
    beforeAll(async () => {
        panel = await loadPanelRoutes([
            () => import("@/pages/NotFound.page"),
            () => import("@/pages/UnderConstruction.page"),
            () => import("@/pages/Appointments.page")
        ])
    })

    afterAll(() => {
        vi.unstubAllEnvs()
    })

    beforeEach(() => {
        vi.stubGlobal(
            "fetch",
            vi.fn(() => new Promise<Response>(() => {}))
        )
    })

    afterEach(() => {
        vi.unstubAllGlobals()
    })

    it("mostra o aviso em / a quem só gerencia conteúdo", async () => {
        const { router } = renderAs("/", ["content.manage"])

        await expectNoAccess()
        expect(router.state.location.pathname).toBe("/")
    })

    it("leva quem vê relatórios e gerencia usuários de / para /usuarios", async () => {
        const { router } = renderAs("/", ["reports.view", "users.manage"])

        expect(await screen.findByRole("heading", { name: "Usuários" })).toBeInTheDocument()
        expect(router.state.location.pathname).toBe("/usuarios")
        expect(router.state.historyAction).toBe("REPLACE")
        expect(screen.queryByRole("heading", { name: "404 - Not Found" })).not.toBeInTheDocument()
    })

    it("leva quem gerencia conteúdo e usuários de / para /usuarios", async () => {
        const { router } = renderAs("/", ["content.manage", "users.manage"])

        expect(await screen.findByRole("heading", { name: "Usuários" })).toBeInTheDocument()
        expect(router.state.location.pathname).toBe("/usuarios")
    })

    it("mostra Relatórios em construção dentro do painel a quem vê relatórios e gerencia usuários", async () => {
        renderAs("/relatorios", ["reports.view", "users.manage"])

        expect(await screen.findByRole("heading", { name: "Relatórios" })).toBeInTheDocument()
        expect(screen.getByText("Em construção.")).toBeInTheDocument()
        expect(screen.getByRole("navigation", { name: "Menu principal" })).toBeInTheDocument()
        expect(
            screen.queryByRole("heading", { name: "Sua conta ainda não tem acesso a nenhuma tela" })
        ).not.toBeInTheDocument()
    })

    it("leva da NotFound para /usuarios pelo link da página inicial", async () => {
        const user = userEvent.setup()
        const { router } = renderAs("/agendamentos", ["reports.view", "users.manage"])
        await expectNotFound()

        await user.click(screen.getByRole("link", { name: "Vá para a página inicial." }))

        expect(await screen.findByRole("heading", { name: "Usuários" })).toBeInTheDocument()
        expect(router.state.location.pathname).toBe("/usuarios")
        expect(screen.queryByRole("heading", { name: "404 - Not Found" })).not.toBeInTheDocument()
    })

    it("leva quem só gerencia usuários de / para /usuarios", async () => {
        const { router } = renderAs("/", ["users.manage"])

        expect(await screen.findByRole("heading", { name: "Usuários" })).toBeInTheDocument()
        expect(router.state.location.pathname).toBe("/usuarios")
    })

    it("leva quem vê agendamentos de / para /agendamentos", async () => {
        const { router } = renderAs("/", ["appointments.view", "users.manage"])

        expect(await screen.findByRole("heading", { name: "Agendamentos" })).toBeInTheDocument()
        expect(router.state.location.pathname).toBe("/agendamentos")
        expect(router.state.historyAction).toBe("REPLACE")
    })

    it("leva o Admin de / para /agendamentos", async () => {
        const { router } = renderAs("/", [], true)

        expect(await screen.findByRole("heading", { name: "Agendamentos" })).toBeInTheDocument()
        expect(router.state.location.pathname).toBe("/agendamentos")
    })

    it("mostra o aviso em / à conta sem nenhuma permissão", async () => {
        renderAs("/", [])

        await expectNoAccess()
    })

    it("mostra o aviso em /sessoes à conta sem nenhuma permissão", async () => {
        const { router } = renderAs("/sessoes", [])

        await expectNoAccess()
        expect(router.state.location.pathname).toBe("/sessoes")
    })

    it("mostra o aviso em /usuarios à conta sem nenhuma permissão, mantendo a URL", async () => {
        const { router } = renderAs("/usuarios", [])

        await expectNoAccess()
        expect(router.state.location.pathname).toBe("/usuarios")
    })

    it("mostra o aviso numa rota inexistente à conta sem nenhuma permissão", async () => {
        const { router } = renderAs("/pao_mel_123", [])

        await expectNoAccess()
        expect(router.state.location.pathname).toBe("/pao_mel_123")
    })

    it("mostra a NotFound em /usuarios a quem só vê agendamentos", async () => {
        renderAs("/usuarios", ["appointments.view"])

        await expectNotFound()
    })

    it("mostra o aviso em /usuarios a quem só vê sessões", async () => {
        renderAs("/usuarios", ["sessions.view"])

        await expectNoAccess()
    })

    it("mostra o aviso em /conteudo a quem só gerencia conteúdo", async () => {
        renderAs("/conteudo", ["content.manage"])

        await expectNoAccess()
    })

    it("mostra o aviso em / a quem só vê relatórios", async () => {
        renderAs("/", ["reports.view"])

        await expectNoAccess()
    })

    it("mostra a NotFound em /whatsapp a um funcionário com todas as permissões", async () => {
        renderAs("/whatsapp", [
            "appointments.view",
            "appointments.manage",
            "content.manage",
            "schedule.configure",
            "documents.configure",
            "sessions.view",
            "reports.view",
            "users.manage"
        ])

        await expectNotFound()
    })

    it("mostra o aviso em /sessoes a quem só vê sessões", async () => {
        renderAs("/sessoes", ["sessions.view"])

        await expectNoAccess()
    })

    it("aplica a regra de Agendamentos ao detalhe do agendamento", async () => {
        renderAs("/agendamentos/1", ["users.manage"])

        await expectNotFound()
    })

    it("mostra a NotFound numa rota inexistente com sessão", async () => {
        renderAs("/pao_mel_123", ["users.manage"])

        await expectNotFound()
    })
})

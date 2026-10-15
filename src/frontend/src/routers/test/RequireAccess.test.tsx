import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { screen } from "@testing-library/react"
import { createMemoryRouter, RouterProvider } from "react-router-dom"
import routes from "@/routers/routes"
import renderWithStore from "@/testUtils/renderWithStore"
import type PermissionKey from "@/types/account/PermissionKey.types"

function renderAs(path: string, permissions: PermissionKey[], isAdmin = false) {
    const router = createMemoryRouter(routes, { initialEntries: [path] })
    const result = renderWithStore(<RouterProvider router={router} />, {
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

describe("RequireAccess", () => {
    beforeEach(() => {
        vi.stubGlobal(
            "fetch",
            vi.fn(() => new Promise<Response>(() => {}))
        )
    })

    afterEach(() => {
        vi.unstubAllGlobals()
    })

    it("leva quem só gerencia conteúdo de / para /conteudo", async () => {
        const { router } = renderAs("/", ["content.manage"])

        expect(await screen.findByRole("heading", { name: "Conteúdo" })).toBeInTheDocument()
        expect(router.state.location.pathname).toBe("/conteudo")
        expect(router.state.historyAction).toBe("REPLACE")
    })

    it("leva quem só gerencia usuários de / para /usuarios", async () => {
        const { router } = renderAs("/", ["users.manage"])

        expect(await screen.findByRole("heading", { name: "Usuários" })).toBeInTheDocument()
        expect(router.state.location.pathname).toBe("/usuarios")
    })

    it("mostra o Dashboard ao Admin em /", async () => {
        renderAs("/", [], true)

        expect(await screen.findByRole("heading", { name: "Painel" })).toBeInTheDocument()
    })

    it("mostra a NotFound em / à conta sem nenhuma tela permitida", async () => {
        renderAs("/", [])

        await expectNotFound()
    })

    it("mostra a NotFound em /sessoes à conta sem nenhuma tela permitida", async () => {
        renderAs("/sessoes", [])

        await expectNotFound()
    })

    it("mostra a NotFound em /usuarios a quem só vê sessões", async () => {
        renderAs("/usuarios", ["sessions.view"])

        await expectNotFound()
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

    it("mostra Sessões a quem só vê sessões", async () => {
        renderAs("/sessoes", ["sessions.view"])

        expect(await screen.findByRole("heading", { name: "Sessões" })).toBeInTheDocument()
        expect(screen.getByRole("navigation", { name: "Menu principal" })).toBeInTheDocument()
    })

    it("aplica a regra de Agendamentos ao detalhe do agendamento", async () => {
        renderAs("/agendamentos/1", ["sessions.view"])

        await expectNotFound()
    })

    it("mostra a NotFound numa rota inexistente com sessão", async () => {
        renderAs("/pao_mel_123", ["sessions.view"])

        await expectNotFound()
    })
})

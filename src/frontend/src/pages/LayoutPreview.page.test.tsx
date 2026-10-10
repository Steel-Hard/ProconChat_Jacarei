import { afterEach, describe, expect, it, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import { createMemoryRouter, RouterProvider, type RouteObject } from "react-router-dom"
import { clearAccount } from "@/services/account.service"

const PREVIEW_PATH = "/dev/layout"
const LAZY_TIMEOUT_MS = 4000

function hasPath(routes: RouteObject[], path: string): boolean {
    return routes.some((route) => route.path === path || hasPath(route.children ?? [], path))
}

describe("LayoutPreviewPage", { timeout: 15000 }, () => {
    afterEach(() => {
        clearAccount()
        vi.unstubAllEnvs()
        vi.resetModules()
    })

    it("mostra um exemplo de cada componente dentro do layout em desenvolvimento", async () => {
        await import("@/pages/LayoutPreview.page")
        const { routes } = await import("@/routers/Router")
        const router = createMemoryRouter(routes, { initialEntries: [PREVIEW_PATH] })

        render(<RouterProvider router={router} />)

        expect(
            await screen.findByRole(
                "heading",
                { name: "Prévia do layout" },
                { timeout: LAZY_TIMEOUT_MS }
            )
        ).toBeInTheDocument()
        expect(
            screen.getByText("Última alteração por Mariana Couto em 15/09/2026")
        ).toBeInTheDocument()
        expect(screen.getByText("Pendente")).toBeInTheDocument()
        expect(screen.getByText("Em andamento")).toBeInTheDocument()
        expect(screen.getByText("Nenhum agendamento pendente")).toBeInTheDocument()
        expect(screen.getByRole("button", { name: "Mais informações" })).toBeInTheDocument()
        expect(screen.getByRole("button", { name: "Abrir confirmação" })).toBeInTheDocument()
        expect(
            screen.getByRole("button", { name: "Abrir confirmação de perigo" })
        ).toBeInTheDocument()
        expect(screen.getByRole("button", { name: "Mostrar toast" })).toBeInTheDocument()
        expect(screen.getByText("2 alterações não salvas")).toBeInTheDocument()
        expect(await screen.findByRole("link", { name: "WhatsApp" })).toBeInTheDocument()
    })

    it("não registra a rota de prévia fora do modo de desenvolvimento", async () => {
        vi.stubEnv("DEV", false)
        vi.resetModules()

        const { routes } = await import("@/routers/Router")

        expect(hasPath(routes, PREVIEW_PATH)).toBe(false)
        expect(hasPath(routes, "/sessoes")).toBe(true)
    })
})

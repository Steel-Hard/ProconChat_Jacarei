import { describe, expect, it, vi } from "vitest"
import { createMemoryRouter, RouterProvider } from "react-router-dom"
import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import Sidebar from "@/components/Sidebar"
import type NavBadges from "@/types/navigation/NavBadges.types"
import ROUTES from "@/routers/paths"
import type PanelAccount from "@/types/account/PanelAccount.types"

const admin: PanelAccount = {
    name: "Ana Paula Souza",
    email: "ana@exemplo.gov.br",
    isAdmin: true,
    permissions: []
}

type SidebarOptions = {
    account?: PanelAccount | null
    badges?: NavBadges
    onNavigate?: () => void
    path?: string
}

function renderSidebar({
    account = admin,
    badges = {},
    onNavigate,
    path = ROUTES.dashboard
}: SidebarOptions = {}) {
    const sidebar = <Sidebar account={account} badges={badges} onNavigate={onNavigate} />
    const router = createMemoryRouter(
        [
            { path: "/", element: sidebar },
            { path: "*", element: sidebar }
        ],
        { initialEntries: [path] }
    )

    render(<RouterProvider router={router} />)

    return screen.getByRole("navigation", { name: "Menu principal" })
}

describe("Sidebar", () => {
    it("mostra os 3 grupos e os 9 links do Admin com as rotas do painel", () => {
        const nav = renderSidebar()

        expect(within(nav).getByText("Operação")).toBeInTheDocument()
        expect(within(nav).getByText("Chatbot")).toBeInTheDocument()
        expect(within(nav).getByText("Configurações")).toBeInTheDocument()
        expect(
            within(nav)
                .getAllByRole("link")
                .map((link) => [link.textContent, link.getAttribute("href")])
        ).toEqual([
            ["Dashboard", ROUTES.dashboard],
            ["Agendamentos", ROUTES.appointments],
            ["Relatórios", ROUTES.reports],
            ["Conteúdo", ROUTES.content],
            ["Sessões", ROUTES.sessions],
            ["Horários de atendimento", ROUTES.schedule],
            ["Documentos", ROUTES.documents],
            ["Usuários", ROUTES.users],
            ["WhatsApp", ROUTES.whatsapp]
        ])
        expect(
            within(nav).getByText("Uso exclusivo de servidores do PROCON Jacareí.")
        ).toBeInTheDocument()
    })

    it("mostra só os itens permitidos para quem só vê sessões", () => {
        const nav = renderSidebar({
            account: { ...admin, isAdmin: false, permissions: ["sessions.view"] }
        })

        expect(
            within(nav)
                .getAllByRole("link")
                .map((link) => link.textContent)
        ).toEqual(["Dashboard", "Sessões"])
        expect(within(nav).getByText("Operação")).toBeInTheDocument()
        expect(within(nav).getByText("Chatbot")).toBeInTheDocument()
        expect(within(nav).queryByText("Configurações")).not.toBeInTheDocument()
    })

    it("não mostra links sem conta", () => {
        const nav = renderSidebar({ account: null })

        expect(within(nav).queryAllByRole("link")).toHaveLength(0)
    })

    it("marca o link da rota atual como página atual", () => {
        renderSidebar({ path: ROUTES.sessions })

        expect(screen.getByRole("link", { name: "Sessões" })).toHaveAttribute(
            "aria-current",
            "page"
        )
        expect(screen.getByRole("link", { name: "Dashboard" })).not.toHaveAttribute("aria-current")
    })

    it("marca Agendamentos como ativo no detalhe do agendamento", () => {
        renderSidebar({ path: "/agendamentos/7" })

        expect(screen.getByRole("link", { name: "Agendamentos" })).toHaveAttribute(
            "aria-current",
            "page"
        )
    })

    it("mostra o contador só quando há pendências", () => {
        renderSidebar({
            badges: {
                appointments: { count: 3, label: "agendamentos pendentes" },
                sessions: { count: 0, label: "sessões" }
            }
        })

        expect(
            screen.getByRole("link", { name: "Agendamentos 3 agendamentos pendentes" })
        ).toBeInTheDocument()
        expect(screen.getByRole("link", { name: "Sessões" })).toHaveTextContent(/^Sessões$/)
    })

    it("avisa a navegação ao clicar num link", async () => {
        const user = userEvent.setup()
        const onNavigate = vi.fn()
        renderSidebar({ onNavigate })

        await user.click(screen.getByRole("link", { name: "Relatórios" }))

        expect(onNavigate).toHaveBeenCalledTimes(1)
    })
})

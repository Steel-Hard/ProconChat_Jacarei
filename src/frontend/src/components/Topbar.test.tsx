import { describe, expect, it, vi } from "vitest"
import { createMemoryRouter, RouterProvider } from "react-router-dom"
import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import Topbar from "@/components/Topbar"
import { ROUTES } from "@/routers/paths"
import type { PanelAccount } from "@/types/account"

const admin: PanelAccount = {
    name: "Ana Paula Souza",
    email: "ana@exemplo.gov.br",
    isAdmin: true,
    permissions: []
}

type TopbarOptions = {
    account?: PanelAccount | null
    showMenuButton?: boolean
    onOpenMenu?: () => void
    path?: string
}

function renderTopbar({
    account = admin,
    showMenuButton = false,
    onOpenMenu = vi.fn(),
    path = ROUTES.dashboard
}: TopbarOptions = {}) {
    const topbar = (
        <Topbar
            account={account}
            showMenuButton={showMenuButton}
            menuOpen={false}
            menuControls="menu-principal"
            onOpenMenu={onOpenMenu}
        />
    )
    const router = createMemoryRouter(
        [
            { path: "/", element: topbar },
            { path: "*", element: topbar }
        ],
        { initialEntries: [path] }
    )

    return render(<RouterProvider router={router} />)
}

describe("Topbar", () => {
    it("mostra a trilha do detalhe com o link para Agendamentos", () => {
        renderTopbar({ path: "/agendamentos/7" })

        const trail = screen.getByRole("navigation", { name: "Trilha" })
        expect(within(trail).getByText("Operação")).toBeInTheDocument()
        expect(within(trail).getByRole("link", { name: "Agendamentos" })).toHaveAttribute(
            "href",
            ROUTES.appointments
        )
        expect(within(trail).getByText("Detalhe do agendamento")).toHaveAttribute(
            "aria-current",
            "page"
        )
    })

    it("mostra grupo e título na trilha de Horários", () => {
        renderTopbar({ path: ROUTES.schedule })

        const trail = screen.getByRole("navigation", { name: "Trilha" })
        expect(within(trail).getByText("Configurações")).toBeInTheDocument()
        expect(within(trail).getByText("Horários de atendimento")).toBeInTheDocument()
        expect(within(trail).queryByRole("link")).not.toBeInTheDocument()
    })

    it("mostra o botão Menu só quando pedido e avisa ao clicar", () => {
        const onOpenMenu = vi.fn()
        const { unmount } = renderTopbar({ showMenuButton: false })
        expect(screen.queryByRole("button", { name: "Menu" })).not.toBeInTheDocument()
        unmount()

        renderTopbar({ showMenuButton: true, onOpenMenu })
        const button = screen.getByRole("button", { name: "Menu" })
        expect(button).toHaveAttribute("aria-expanded", "false")
        expect(button).toHaveAttribute("aria-controls", "menu-principal")

        userEvent.click(button)

        expect(onOpenMenu).toHaveBeenCalledTimes(1)
    })

    it("não mostra Minha conta sem conta", () => {
        renderTopbar({ account: null })

        expect(screen.getByRole("banner")).toBeInTheDocument()
        expect(screen.queryByRole("button", { name: "Minha conta" })).not.toBeInTheDocument()
    })
})

import { describe, expect, it, vi } from "vitest"
import { MemoryRouter } from "react-router-dom"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import SidebarLink from "@/components/SidebarLink"
import ROUTES from "@/routers/paths"

describe("SidebarLink", () => {
    it("mostra o rótulo traduzido do item e aponta para a rota", () => {
        render(
            <MemoryRouter>
                <SidebarLink item={{ key: "sessions", path: ROUTES.sessions }} active={false} />
            </MemoryRouter>
        )

        const link = screen.getByRole("link", { name: "Sessões" })
        expect(link).toHaveAttribute("href", ROUTES.sessions)
        expect(link).not.toHaveAttribute("aria-current")
    })

    it("marca o item ativo como página atual", () => {
        render(
            <MemoryRouter>
                <SidebarLink item={{ key: "reports", path: ROUTES.reports }} active />
            </MemoryRouter>
        )

        expect(screen.getByRole("link", { name: "Relatórios" })).toHaveAttribute(
            "aria-current",
            "page"
        )
    })

    it("mostra o contador com o texto acessível quando há pendências", () => {
        render(
            <MemoryRouter>
                <SidebarLink
                    item={{ key: "appointments", path: ROUTES.appointments }}
                    active={false}
                    badge={{ count: 4, label: "agendamentos pendentes" }}
                />
            </MemoryRouter>
        )

        expect(
            screen.getByRole("link", { name: "Agendamentos 4 agendamentos pendentes" })
        ).toBeInTheDocument()
    })

    it("não mostra contador zerado e avisa a navegação ao clicar", async () => {
        const user = userEvent.setup()
        const onNavigate = vi.fn()
        render(
            <MemoryRouter>
                <SidebarLink
                    item={{ key: "appointments", path: ROUTES.appointments }}
                    active={false}
                    badge={{ count: 0, label: "agendamentos pendentes" }}
                    onNavigate={onNavigate}
                />
            </MemoryRouter>
        )

        await user.click(screen.getByRole("link", { name: "Agendamentos" }))

        expect(onNavigate).toHaveBeenCalledTimes(1)
    })
})

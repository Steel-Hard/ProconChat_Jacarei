import { describe, expect, it, vi } from "vitest"
import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import AccountMenu from "@/components/AccountMenu"
import { mockMatchMedia } from "@/test/mockMatchMedia"
import type { PanelAccount } from "@/types/account"

const admin: PanelAccount = {
    name: "Ana Paula Souza",
    email: "ana@exemplo.gov.br",
    isAdmin: true,
    permissions: []
}

describe("AccountMenu", () => {
    it("mostra o nome e as iniciais da primeira e da última palavra", () => {
        render(<AccountMenu account={admin} />)

        expect(screen.getByText("Ana Paula Souza")).toBeInTheDocument()
        expect(screen.getByText("AS")).toBeInTheDocument()
    })

    it("mostra o selo ADMIN só para o Admin", () => {
        const { rerender } = render(<AccountMenu account={admin} />)
        expect(screen.getByText("ADMIN")).toBeInTheDocument()

        rerender(<AccountMenu account={{ ...admin, name: "Bruno", isAdmin: false }} />)

        expect(screen.queryByText("ADMIN")).not.toBeInTheDocument()
        expect(screen.getByText("B")).toBeInTheDocument()
    })

    it("esconde o e-mail em 900 px e mostra em 1440 px", () => {
        mockMatchMedia(900)
        const { unmount } = render(<AccountMenu account={admin} />)
        expect(screen.queryByText("ana@exemplo.gov.br")).not.toBeInTheDocument()
        unmount()

        mockMatchMedia(1440)
        render(<AccountMenu account={admin} />)

        expect(screen.getByText("ana@exemplo.gov.br")).toBeInTheDocument()
    })

    it("abre o menu e mostra só as opções com ação", () => {
        render(<AccountMenu account={admin} onLogout={vi.fn()} />)
        const trigger = screen.getByRole("button", { name: "Minha conta" })
        expect(trigger).toHaveAttribute("aria-expanded", "false")

        userEvent.click(trigger)

        expect(trigger).toHaveAttribute("aria-expanded", "true")
        const options = screen.getByRole("list", { name: "Minha conta" })
        expect(trigger).toHaveAttribute("aria-controls", options.id)
        expect(
            within(options)
                .getAllByRole("button")
                .map((item) => item.textContent)
        ).toEqual(["Sair"])
        expect(screen.queryByRole("menu")).not.toBeInTheDocument()
    })

    it("chama onLogout e fecha o menu ao escolher Sair", () => {
        const onLogout = vi.fn()
        render(<AccountMenu account={admin} onChangePassword={vi.fn()} onLogout={onLogout} />)
        userEvent.click(screen.getByRole("button", { name: "Minha conta" }))
        expect(screen.getByRole("button", { name: "Alterar minha senha" })).toBeInTheDocument()

        userEvent.click(screen.getByRole("button", { name: "Sair" }))

        expect(onLogout).toHaveBeenCalledTimes(1)
        expect(screen.queryByRole("list", { name: "Minha conta" })).not.toBeInTheDocument()
    })

    it("fecha o menu com Esc e devolve o foco ao botão Minha conta", () => {
        render(<AccountMenu account={admin} onLogout={vi.fn()} />)
        const trigger = screen.getByRole("button", { name: "Minha conta" })
        userEvent.click(trigger)
        screen.getByRole("button", { name: "Sair" }).focus()

        userEvent.keyboard("{esc}")

        expect(trigger).toHaveFocus()
        expect(screen.queryByRole("list", { name: "Minha conta" })).not.toBeInTheDocument()
    })

    it("fecha o menu ao clicar fora", () => {
        render(
            <>
                <p>Fora do menu</p>
                <AccountMenu account={admin} onLogout={vi.fn()} />
            </>
        )
        userEvent.click(screen.getByRole("button", { name: "Minha conta" }))

        userEvent.click(screen.getByText("Fora do menu"))

        expect(screen.queryByRole("list", { name: "Minha conta" })).not.toBeInTheDocument()
    })

    it("usa iniciais em maiúsculas para nomes digitados em minúsculas", () => {
        const { rerender } = render(
            <AccountMenu account={{ ...admin, name: "bruno" }} onLogout={vi.fn()} />
        )
        expect(screen.getByText("B")).toBeInTheDocument()

        rerender(<AccountMenu account={{ ...admin, name: "ana paula souza" }} onLogout={vi.fn()} />)

        expect(screen.getByText("AS")).toBeInTheDocument()
    })
})

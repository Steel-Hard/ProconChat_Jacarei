import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"
import UserAccountRow from "@/components/UserAccountRow"
import type UserAccountRowView from "@/types/users/UserAccountRowView.types"

const TEXTS = { admin: "ADMIN", unsaved: "Não salvo" }

function rowView(overrides: Partial<UserAccountRowView> = {}): UserAccountRowView {
    return {
        id: 7,
        initials: "BL",
        name: "Bruno Lima",
        isAdmin: false,
        summary: "bruno@exemplo.gov.br · 2 de 8 permissões",
        lastLogin: "Último acesso em 20/10/2026 às 10:00",
        active: true,
        statusLabel: "Ativo",
        unsaved: false,
        selected: false,
        ...overrides
    }
}

describe("UserAccountRow", () => {
    it("mostra iniciais, nome, resumo, último acesso e situação num botão", () => {
        render(<UserAccountRow row={rowView()} texts={TEXTS} onSelect={vi.fn()} />)

        const button = screen.getByRole("button", { name: /Bruno Lima/ })
        expect(button).toHaveTextContent("BL")
        expect(button).toHaveTextContent("bruno@exemplo.gov.br · 2 de 8 permissões")
        expect(button).toHaveTextContent("Último acesso em 20/10/2026 às 10:00")
        expect(button).toHaveTextContent("Ativo")
        expect(button).toHaveAttribute("aria-pressed", "false")
        expect(screen.queryByText("ADMIN")).not.toBeInTheDocument()
        expect(screen.queryByText("Não salvo")).not.toBeInTheDocument()
    })

    it("mostra o selo ADMIN, Não salvo e a seleção quando for o caso", () => {
        render(
            <UserAccountRow
                row={rowView({ isAdmin: true, unsaved: true, selected: true })}
                texts={TEXTS}
                onSelect={vi.fn()}
            />
        )

        expect(screen.getByText("ADMIN")).toBeInTheDocument()
        expect(screen.getByText("Não salvo")).toBeInTheDocument()
        expect(screen.getByRole("button", { name: /Bruno Lima/ })).toHaveAttribute(
            "aria-pressed",
            "true"
        )
    })

    it("seleciona a conta ao clicar", async () => {
        const user = userEvent.setup()
        const onSelect = vi.fn()
        render(<UserAccountRow row={rowView()} texts={TEXTS} onSelect={onSelect} />)

        await user.click(screen.getByRole("button", { name: /Bruno Lima/ }))

        expect(onSelect).toHaveBeenCalledWith(7)
    })

    it("não mostra a linha de último acesso quando não há texto", () => {
        render(
            <UserAccountRow row={rowView({ lastLogin: null })} texts={TEXTS} onSelect={vi.fn()} />
        )

        expect(screen.getByRole("button", { name: /Bruno Lima/ })).not.toHaveTextContent(
            "Último acesso"
        )
    })
})

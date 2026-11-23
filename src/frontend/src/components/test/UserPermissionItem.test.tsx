import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"
import UserPermissionItem from "@/components/UserPermissionItem"
import type UserPermissionItemView from "@/types/users/UserPermissionItemView.types"

function itemView(overrides: Partial<UserPermissionItemView> = {}): UserPermissionItemView {
    return {
        key: "appointments.manage",
        name: "Gerenciar agendamentos",
        description:
            "Assumir, atribuir, marcar como atendido, cancelar e registrar observações internas.",
        includes: "Inclui Ver agendamentos",
        checked: false,
        disabled: false,
        warning: null,
        ...overrides
    }
}

describe("UserPermissionItem", () => {
    it("mostra a caixa com nome, rótulo de inclusão e descrição", () => {
        render(<UserPermissionItem item={itemView()} onToggle={vi.fn()} />)

        const checkbox = screen.getByRole("checkbox", { name: /Gerenciar agendamentos/ })
        expect(checkbox).not.toBeChecked()
        expect(checkbox).toBeEnabled()
        expect(checkbox).not.toHaveAttribute("aria-describedby")
        expect(screen.getByText("Inclui Ver agendamentos")).toBeInTheDocument()
        expect(
            screen.getByText(
                "Assumir, atribuir, marcar como atendido, cancelar e registrar observações internas."
            )
        ).toBeInTheDocument()
    })

    it("alterna a permissão ao clicar", async () => {
        const user = userEvent.setup()
        const onToggle = vi.fn()
        render(<UserPermissionItem item={itemView()} onToggle={onToggle} />)

        await user.click(screen.getByRole("checkbox", { name: /Gerenciar agendamentos/ }))

        expect(onToggle).toHaveBeenCalledWith("appointments.manage")
    })

    it("mostra a permissão desabilitada com o aviso visível e ligado à caixa", async () => {
        const user = userEvent.setup()
        const onToggle = vi.fn()
        render(
            <UserPermissionItem
                item={itemView({
                    includes: null,
                    checked: true,
                    disabled: true,
                    warning: "Você não possui esta permissão"
                })}
                onToggle={onToggle}
            />
        )

        const checkbox = screen.getByRole("checkbox", { name: /Gerenciar agendamentos/ })
        await user.click(checkbox)

        expect(checkbox).toBeChecked()
        expect(checkbox).toBeDisabled()
        expect(checkbox).toHaveAccessibleDescription("Você não possui esta permissão")
        expect(screen.queryByText("Inclui Ver agendamentos")).not.toBeInTheDocument()
        expect(onToggle).not.toHaveBeenCalled()
    })
})

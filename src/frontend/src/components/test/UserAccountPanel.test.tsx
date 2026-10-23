import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"
import UserAccountPanel from "@/components/UserAccountPanel"
import type UserAccountPanelView from "@/types/users/UserAccountPanelView.types"

function panelView(overrides: Partial<UserAccountPanelView> = {}): UserAccountPanelView {
    return {
        initials: "BL",
        name: "Bruno Lima",
        isAdmin: false,
        adminLabel: "ADMIN",
        email: "bruno@exemplo.gov.br",
        lastLogin: "Nunca acessou",
        permissionsChanged: "Permissões alteradas por Ana Paula Souza em 20/10/2026",
        resetPassword: { label: "Redefinir senha", disabled: false },
        toggleActive: { label: "Desativar conta", disabled: false },
        changeMyPassword: null,
        lockWarning: null,
        adminNotes: [],
        selfNote: null,
        outranksNote: null,
        permissionsHeading: "Permissões",
        permissions: [
            {
                key: "appointments.view",
                name: "Ver agendamentos",
                description: "Consultar a lista.",
                includes: null,
                checked: true,
                disabled: false,
                warning: null
            },
            {
                key: "reports.view",
                name: "Ver relatórios",
                description: "Acessar indicadores.",
                includes: null,
                checked: false,
                disabled: true,
                warning: "Você não possui esta permissão"
            }
        ],
        ...overrides
    }
}

function handlers() {
    return {
        onResetPassword: vi.fn(),
        onToggleActive: vi.fn(),
        onChangeMyPassword: vi.fn(),
        onTogglePermission: vi.fn()
    }
}

describe("UserAccountPanel", () => {
    it("mostra os dados da conta, as ações e as permissões", () => {
        render(<UserAccountPanel view={panelView()} {...handlers()} />)

        const panel = screen.getByRole("region", { name: "Bruno Lima" })
        expect(within(panel).getByText("bruno@exemplo.gov.br")).toBeInTheDocument()
        expect(within(panel).getByText("Nunca acessou")).toBeInTheDocument()
        expect(
            within(panel).getByText("Permissões alteradas por Ana Paula Souza em 20/10/2026")
        ).toBeInTheDocument()
        expect(within(panel).getByRole("button", { name: "Redefinir senha" })).toBeEnabled()
        expect(within(panel).getByRole("button", { name: "Desativar conta" })).toBeEnabled()
        expect(within(panel).queryByRole("button", { name: "Alterar minha senha" })).toBeNull()
        expect(within(panel).getByRole("heading", { name: "Permissões" })).toBeInTheDocument()
        expect(within(panel).getAllByRole("checkbox")).toHaveLength(2)
        expect(within(panel).queryByText("ADMIN")).not.toBeInTheDocument()
    })

    it("chama as ações da conta e das permissões", async () => {
        const user = userEvent.setup()
        const props = handlers()
        render(
            <UserAccountPanel
                view={panelView({ changeMyPassword: "Alterar minha senha" })}
                {...props}
            />
        )

        await user.click(screen.getByRole("button", { name: "Redefinir senha" }))
        await user.click(screen.getByRole("button", { name: "Desativar conta" }))
        await user.click(screen.getByRole("button", { name: "Alterar minha senha" }))
        await user.click(screen.getByRole("checkbox", { name: /Ver agendamentos/ }))

        expect(props.onResetPassword).toHaveBeenCalledTimes(1)
        expect(props.onToggleActive).toHaveBeenCalledTimes(1)
        expect(props.onChangeMyPassword).toHaveBeenCalledTimes(1)
        expect(props.onTogglePermission).toHaveBeenCalledWith("appointments.view")
    })

    it("mostra os botões bloqueados com o aviso visível ligado a eles", async () => {
        const user = userEvent.setup()
        const props = handlers()
        render(
            <UserAccountPanel
                view={panelView({
                    resetPassword: { label: "Redefinir senha", disabled: true },
                    toggleActive: { label: "Desativar conta", disabled: true },
                    lockWarning: "Esta conta tem permissões que você não possui",
                    outranksNote:
                        "Esta conta tem permissões que você não possui. Redefinir senha e desativar ficam indisponíveis."
                })}
                {...props}
            />
        )

        const reset = screen.getByRole("button", { name: "Redefinir senha" })
        const toggle = screen.getByRole("button", { name: "Desativar conta" })
        await user.click(toggle)

        expect(reset).toBeDisabled()
        expect(toggle).toBeDisabled()
        expect(reset).toHaveAccessibleDescription("Esta conta tem permissões que você não possui")
        expect(toggle).toHaveAccessibleDescription("Esta conta tem permissões que você não possui")
        expect(
            screen.getByText(
                "Esta conta tem permissões que você não possui. Redefinir senha e desativar ficam indisponíveis."
            )
        ).toBeInTheDocument()
        expect(props.onToggleActive).not.toHaveBeenCalled()
    })

    it("mostra a conta Admin com o selo, as notas e sem ações", () => {
        render(
            <UserAccountPanel
                view={panelView({
                    isAdmin: true,
                    resetPassword: null,
                    toggleActive: null,
                    adminNotes: ["Conta admin: nota.", "Se a senha da conta Admin for esquecida."]
                })}
                {...handlers()}
            />
        )

        expect(screen.getByText("ADMIN")).toBeInTheDocument()
        expect(screen.getByText("Conta admin: nota.")).toBeInTheDocument()
        expect(screen.getByText("Se a senha da conta Admin for esquecida.")).toBeInTheDocument()
        expect(screen.queryByRole("button")).toBeNull()
    })

    it("mostra a nota da própria conta", () => {
        render(
            <UserAccountPanel
                view={panelView({
                    resetPassword: null,
                    toggleActive: { label: "Desativar conta", disabled: true },
                    changeMyPassword: "Alterar minha senha",
                    lockWarning: "Você não pode alterar a própria conta",
                    selfNote: "Você não pode alterar a própria conta. Peça a outro usuário."
                })}
                {...handlers()}
            />
        )

        expect(
            screen.getByText("Você não pode alterar a própria conta. Peça a outro usuário.")
        ).toBeInTheDocument()
        expect(screen.getByRole("button", { name: "Desativar conta" })).toHaveAccessibleDescription(
            "Você não pode alterar a própria conta"
        )
        expect(screen.getByRole("button", { name: "Alterar minha senha" })).toBeEnabled()
        expect(screen.queryByRole("button", { name: "Redefinir senha" })).toBeNull()
    })

    it("não mostra último acesso nem alteração de permissões quando não há texto", () => {
        render(
            <UserAccountPanel
                view={panelView({ lastLogin: null, permissionsChanged: null })}
                {...handlers()}
            />
        )

        expect(screen.queryByText("Nunca acessou")).not.toBeInTheDocument()
        expect(screen.queryByText(/Permissões alteradas/)).not.toBeInTheDocument()
    })
})

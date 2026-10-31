import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"
import ScheduleVersions from "@/components/ScheduleVersions"
import buildScheduleConfig from "@/testUtils/buildScheduleConfig"
import type ScheduleVersionsActions from "@/types/schedule/ScheduleVersionsActions.types"
import type ScheduleVersionsView from "@/types/schedule/ScheduleVersionsView.types"

function view(overrides: Partial<ScheduleVersionsView> = {}): ScheduleVersionsView {
    return {
        effectiveFrom: "",
        currentSince: null,
        date: "",
        dateMin: "2026-10-25",
        dateError: null,
        versions: [{ effectiveFrom: "2026-11-10", config: buildScheduleConfig() }],
        versionsFailed: false,
        cancelConflicts: null,
        cancelTarget: null,
        cancelling: false,
        switchPending: false,
        ...overrides
    }
}

function actions(): ScheduleVersionsActions {
    return {
        changeDate: vi.fn(),
        returnCurrent: vi.fn(),
        edit: vi.fn(),
        askCancel: vi.fn(),
        confirmCancel: vi.fn(),
        dismissCancel: vi.fn(),
        confirmSwitch: vi.fn(),
        dismissSwitch: vi.fn()
    }
}

describe("ScheduleVersions", () => {
    it("chama editar e cancelar com a data da mudança", async () => {
        const user = userEvent.setup()
        const handlers = actions()
        render(<ScheduleVersions view={view()} actions={handlers} />)

        await user.click(screen.getByRole("button", { name: "Editar a mudança de 10/11/2026" }))
        await user.click(screen.getByRole("button", { name: "Cancelar a mudança de 10/11/2026" }))

        expect(handlers.edit).toHaveBeenCalledWith("2026-11-10")
        expect(handlers.askCancel).toHaveBeenCalledWith("2026-11-10")
    })

    it("marca o campo de data como inválido e liga a mensagem de erro a ele", () => {
        render(
            <ScheduleVersions
                view={view({
                    date: "2026-10-24",
                    dateError: "Escolha uma data a partir de amanhã."
                })}
                actions={actions()}
            />
        )

        const field = screen.getByLabelText("Valer a partir de")
        expect(field).toHaveAttribute("aria-invalid", "true")
        expect(field).toHaveAttribute("min", "2026-10-25")
        expect(field).toHaveAccessibleDescription("Escolha uma data a partir de amanhã.")
    })

    it("mostra a versão em edição com o botão de voltar à configuração de hoje", async () => {
        const user = userEvent.setup()
        const handlers = actions()
        render(
            <ScheduleVersions
                view={view({ effectiveFrom: "2026-11-10", date: "2026-11-10" })}
                actions={handlers}
            />
        )

        await user.click(screen.getByRole("button", { name: "Voltar à configuração de hoje" }))

        expect(
            screen.getByText("Editando a configuração a partir de 10/11/2026")
        ).toBeInTheDocument()
        expect(handlers.returnCurrent).toHaveBeenCalledOnce()
    })
})

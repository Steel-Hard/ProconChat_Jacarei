import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"
import AppointmentListFilters from "@/components/AppointmentListFilters"

vi.setConfig({ testTimeout: 20000 })

const PERIODS = [
    { value: "all" as const, label: "Todos" },
    { value: "today" as const, label: "Hoje" },
    { value: "upcoming" as const, label: "Próximos (a partir de hoje)" }
]

const RESPONSIBLES = [
    { value: "all" as const, label: "Todos" },
    { value: "unassigned" as const, label: "Sem responsável" },
    { value: "me" as const, label: "Atribuídos a mim" }
]

function renderFilters(onPeriodChange = vi.fn(), onResponsibleChange = vi.fn()) {
    render(
        <AppointmentListFilters
            periodLabel="Período"
            responsibleLabel="Responsável"
            period="upcoming"
            responsible="all"
            periodOptions={PERIODS}
            responsibleOptions={RESPONSIBLES}
            onPeriodChange={onPeriodChange}
            onResponsibleChange={onResponsibleChange}
        />
    )
}

describe("AppointmentListFilters", () => {
    it("mostra os dois selects com rótulo e o valor atual", () => {
        renderFilters()

        expect(screen.getByRole("combobox", { name: "Período" })).toHaveValue("upcoming")
        expect(screen.getByRole("combobox", { name: "Responsável" })).toHaveValue("all")
        expect(
            screen.getByRole("option", { name: "Próximos (a partir de hoje)" })
        ).toBeInTheDocument()
    })

    it("avisa a troca de período", async () => {
        const user = userEvent.setup()
        const onPeriodChange = vi.fn()
        renderFilters(onPeriodChange)

        await user.selectOptions(screen.getByRole("combobox", { name: "Período" }), "today")

        expect(onPeriodChange).toHaveBeenCalledWith("today")
    })

    it("avisa a troca de responsável", async () => {
        const user = userEvent.setup()
        const onResponsibleChange = vi.fn()
        renderFilters(vi.fn(), onResponsibleChange)

        await user.selectOptions(screen.getByRole("combobox", { name: "Responsável" }), "me")

        expect(onResponsibleChange).toHaveBeenCalledWith("me")
    })
})

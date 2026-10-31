import { fireEvent, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import buildBookedDays from "@/testUtils/buildBookedDays"
import buildMonthlyPreview from "@/testUtils/buildMonthlyPreview"
import buildScheduleConfig from "@/testUtils/buildScheduleConfig"
import renderSchedulePage from "@/testUtils/renderSchedulePage"

vi.setConfig({ testTimeout: 20000 })

const SLOW = { timeout: 10000 }

afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
})

function renderWithChange(effectiveFrom: string) {
    const version = { ...buildScheduleConfig(), effectiveFrom }

    return renderSchedulePage({
        bookedDays: buildBookedDays(),
        handlers: {
            "GET /api/v1/schedule/versions": () => ({
                status: 200,
                body: { data: [{ effectiveFrom, config: version }] }
            }),
            "GET /api/v1/schedule/effective": () => ({ status: 200, body: { data: version } }),
            "GET /api/v1/schedule/preview": () => ({
                status: 200,
                body: {
                    data: buildMonthlyPreview("2026-11", [
                        { date: "2026-11-04", status: "AVAILABLE", freeSeats: 6, capacity: 8 }
                    ])
                }
            })
        }
    })
}

async function bookedDaysLoaded() {
    await screen.findByRole("button", { name: "04/11: 6 vagas livres · 2 agendamentos" }, SLOW)
}

async function editChange(effectiveFrom: string) {
    await bookedDaysLoaded()
    fireEvent.change(screen.getByLabelText("Valer a partir de"), {
        target: { value: effectiveFrom }
    })
    await screen.findByText(/^Editando a configuração a partir de/, {}, SLOW)
    await screen.findByRole("checkbox", { name: "Quarta-feira" }, SLOW)
}

describe("SchedulePage: travas pela vigência da versão editada", () => {
    it("libera o dia cujo agendamento cai antes da mudança editada e deixa salvar sem ele", async () => {
        const { user } = await renderWithChange("2026-11-10")
        await editChange("2026-11-10")

        const wednesday = screen.getByRole("checkbox", { name: "Quarta-feira" })
        expect(wednesday).not.toHaveAttribute("aria-disabled")
        await user.click(wednesday)

        expect(screen.getByRole("checkbox", { name: "Quarta-feira" })).not.toBeChecked()
        expect(screen.getByRole("button", { name: "Salvar alterações" })).toBeEnabled()
    })

    it("mantém travado o dia cujo agendamento cai na vigência da mudança editada", async () => {
        await renderWithChange("2026-11-02")
        await editChange("2026-11-02")

        expect(screen.getByRole("checkbox", { name: "Quarta-feira" })).toHaveAttribute(
            "aria-disabled",
            "true"
        )
    })

    it("não trava na configuração de hoje o dia cujo agendamento cai depois da primeira mudança", async () => {
        await renderWithChange("2026-11-02")

        await bookedDaysLoaded()
        await screen.findAllByText("02/11/2026")

        expect(screen.getByRole("checkbox", { name: "Quarta-feira" })).not.toHaveAttribute(
            "aria-disabled"
        )
    })
})

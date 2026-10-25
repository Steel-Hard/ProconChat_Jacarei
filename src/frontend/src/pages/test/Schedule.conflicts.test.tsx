import { screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vitest"
import buildMonthlyPreview from "@/testUtils/buildMonthlyPreview"
import renderSchedulePage from "@/testUtils/renderSchedulePage"
import type SchedulePreviewConflict from "@/types/schedule/SchedulePreviewConflict.types"

vi.setConfig({ testTimeout: 20000 })

const PREVIEW_CONFLICT: SchedulePreviewConflict = {
    protocol: "A1B2C3D4",
    date: "2026-11-04",
    time: "14:00",
    status: "CONFIRMED",
    code: "RANGE_CHANGED",
    reason: "Faixa de horário removida ou alterada"
}

const SAVE_CONFLICT = {
    id: "41",
    protocol: "E5F6A7B8",
    name: "Maria Souza",
    cpfMasked: "***.982.247-**",
    appointmentDatetime: "2026-11-05T12:00:00.000Z",
    date: "2026-11-05",
    time: "09:00",
    status: "PENDING",
    code: "SEATS_REDUCED",
    reason: "Vagas reduzidas para 1; este horário tem 2 agendamentos"
}

afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
})

async function seats(user: ReturnType<typeof userEvent.setup>, value: string) {
    await user.clear(screen.getByLabelText("Vagas simultâneas por horário"))
    await user.type(screen.getByLabelText("Vagas simultâneas por horário"), value)
}

describe("SchedulePage: agendamentos afetados", () => {
    it("mostra os afetados da prévia, trava o salvar e libera quando a edição os tira", async () => {
        vi.useFakeTimers({ shouldAdvanceTime: true })
        await renderSchedulePage({
            handlers: {
                "POST /api/v1/schedule/preview": ({ body }) => ({
                    status: 200,
                    body: {
                        data: buildMonthlyPreview("2026-11", [], {
                            conflicts:
                                (body as { config: { seatsPerSlot: number } }).config
                                    .seatsPerSlot === 1
                                    ? [PREVIEW_CONFLICT]
                                    : []
                        })
                    }
                })
            }
        })
        await screen.findByRole("checkbox", { name: "Segunda-feira" })
        const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })

        await seats(user, "1")
        await vi.advanceTimersByTimeAsync(400)

        const list = await screen.findByRole("region", {
            name: "Esta alteração afeta 1 agendamento"
        })
        expect(within(list).getByText("Protocolo A1B2C3D4")).toBeInTheDocument()
        expect(within(list).getByText("Quarta-feira, 04/11 às 14:00")).toBeInTheDocument()
        expect(screen.getByRole("button", { name: "Salvar alterações" })).toBeDisabled()
        expect(
            screen.getByText("A alteração afeta agendamentos. Veja a lista abaixo.")
        ).toBeInTheDocument()
        expect(
            within(
                screen.getByRole("checkbox", { name: "Quarta-feira" }).closest("li") as HTMLElement
            ).getByText(
                "Afeta o agendamento A1B2C3D4 (04/11/2026 às 14:00): Faixa de horário removida ou alterada"
            )
        ).toBeInTheDocument()

        await seats(user, "2")
        await vi.advanceTimersByTimeAsync(400)

        await waitFor(() =>
            expect(
                screen.queryByRole("region", { name: /Esta alteração afeta/ })
            ).not.toBeInTheDocument()
        )
        expect(screen.getByRole("button", { name: "Salvar alterações" })).toBeDisabled()
        await seats(user, "3")
        await vi.advanceTimersByTimeAsync(400)
        await waitFor(() =>
            expect(screen.getByRole("button", { name: "Salvar alterações" })).toBeEnabled()
        )
    })

    it("mostra o 409 com nome e CPF mascarado, trava o salvar, relê os dias e libera ao editar", async () => {
        const { user, callsTo } = await renderSchedulePage({
            handlers: {
                "PUT /api/v1/schedule": () => ({
                    status: 409,
                    body: {
                        error: {
                            code: "SCHEDULE_CONFLICTS",
                            message: "x",
                            details: { conflicts: [SAVE_CONFLICT] }
                        }
                    }
                })
            }
        })
        await screen.findByRole("checkbox", { name: "Segunda-feira" })

        await seats(user, "1")
        await user.click(screen.getByRole("button", { name: "Salvar alterações" }))

        const list = await screen.findByRole("region", {
            name: "Esta alteração afeta 1 agendamento"
        })
        expect(within(list).getByText("Maria Souza")).toBeInTheDocument()
        expect(within(list).getByText("***.982.247-**")).toBeInTheDocument()
        expect(within(list).getByText("Protocolo E5F6A7B8")).toBeInTheDocument()
        expect(within(list).getByText("Quinta-feira, 05/11 às 09:00")).toBeInTheDocument()
        expect(within(list).getByText("Pendente")).toBeInTheDocument()
        expect(screen.getByRole("button", { name: "Salvar alterações" })).toBeDisabled()
        await waitFor(() => expect(callsTo("GET", "/api/v1/schedule/booked-days")).toHaveLength(2))

        await seats(user, "4")

        expect(
            screen.queryByRole("region", { name: /Esta alteração afeta/ })
        ).not.toBeInTheDocument()
        expect(screen.getByRole("button", { name: "Salvar alterações" })).toBeEnabled()
    })
})

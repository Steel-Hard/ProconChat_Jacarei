import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { createMemoryRouter, RouterProvider } from "react-router-dom"
import { describe, expect, it, vi } from "vitest"
import AppointmentCompactRow from "@/components/AppointmentCompactRow"
import APPOINTMENT_TABLE_TEXTS from "@/testUtils/appointmentTableTexts"
import buildAppointmentRowView from "@/testUtils/buildAppointmentRowView"
import type AppointmentRowView from "@/types/appointments/AppointmentRowView.types"

vi.setConfig({ testTimeout: 20000 })

const ORIGIN = { from: { pathname: "/agendamentos", search: "" } }

function renderRow(row: AppointmentRowView, onOpen = vi.fn(), onClaim = vi.fn()) {
    const router = createMemoryRouter(
        [
            {
                path: "/agendamentos",
                element: (
                    <table>
                        <tbody>
                            <AppointmentCompactRow
                                row={row}
                                texts={APPOINTMENT_TABLE_TEXTS.row}
                                linkState={ORIGIN}
                                onOpen={onOpen}
                                onClaim={onClaim}
                            />
                        </tbody>
                    </table>
                )
            },
            { path: "/agendamentos/:id", element: <h1>Detalhe</h1> }
        ],
        { initialEntries: ["/agendamentos"] }
    )
    render(<RouterProvider router={router} />)

    return { router, onOpen, onClaim }
}

describe("AppointmentCompactRow", () => {
    it("junta protocolo com status, titular com selos e data com responsável", () => {
        renderRow(buildAppointmentRowView({ representative: true, offGrid: true, canClaim: true }))

        const cells = within(screen.getByRole("row")).getAllByRole("cell")
        expect(within(cells[0]).getByRole("link", { name: "AG-0011" })).toBeInTheDocument()
        expect(within(cells[0]).getByText("Pendente")).toBeInTheDocument()
        expect(within(cells[1]).getByText("Maria Aparecida Santos")).toBeInTheDocument()
        expect(within(cells[1]).getByText("***.456.789-**")).toBeInTheDocument()
        expect(within(cells[1]).getByText("Fora da grade atual")).toBeInTheDocument()
        expect(within(cells[1]).getByText("Por representante")).toBeInTheDocument()
        expect(within(cells[2]).getByText("Bancos")).toBeInTheDocument()
        expect(within(cells[3]).getByText("Seg, 28/09")).toBeInTheDocument()
        expect(within(cells[3]).getByText("10:00")).toBeInTheDocument()
        expect(within(cells[3]).getByText("Sem responsável")).toBeInTheDocument()
        expect(within(cells[4]).getByRole("button", { name: "Assumir" })).toBeInTheDocument()
    })

    it("não mostra selos nem Assumir quando não se aplicam", () => {
        renderRow(buildAppointmentRowView({ responsibleLabel: "Ana", unassigned: false }))

        expect(screen.queryByText("Por representante")).not.toBeInTheDocument()
        expect(screen.queryByText("Fora da grade atual")).not.toBeInTheDocument()
        expect(screen.queryByRole("button", { name: "Assumir" })).not.toBeInTheDocument()
        expect(screen.getByText("Ana")).toBeInTheDocument()
    })

    it("abre a linha ao clicar e assume sem abrir", async () => {
        const user = userEvent.setup()
        const { onOpen, onClaim } = renderRow(buildAppointmentRowView({ canClaim: true }))

        await user.click(screen.getByRole("button", { name: "Assumir" }))
        await user.click(screen.getByText("Bancos"))

        expect(onClaim).toHaveBeenCalledTimes(1)
        expect(onOpen).toHaveBeenCalledTimes(1)
    })

    it("o protocolo leva ao detalhe sem disparar a linha", async () => {
        const user = userEvent.setup()
        const { router, onOpen } = renderRow(buildAppointmentRowView())

        await user.click(screen.getByRole("link", { name: "AG-0011" }))

        expect(router.state.location.pathname).toBe("/agendamentos/11")
        expect(onOpen).not.toHaveBeenCalled()
    })
})

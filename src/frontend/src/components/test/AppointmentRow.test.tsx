import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { createMemoryRouter, RouterProvider } from "react-router-dom"
import { describe, expect, it, vi } from "vitest"
import AppointmentRow from "@/components/AppointmentRow"
import APPOINTMENT_TABLE_TEXTS from "@/testUtils/appointmentTableTexts"
import buildAppointmentRowView from "@/testUtils/buildAppointmentRowView"
import type AppointmentRowView from "@/types/appointments/AppointmentRowView.types"

vi.setConfig({ testTimeout: 20000 })

const ORIGIN = { from: { pathname: "/agendamentos", search: "?status=PENDING" } }

function renderRow(row: AppointmentRowView, onOpen = vi.fn(), onClaim = vi.fn()) {
    const router = createMemoryRouter(
        [
            {
                path: "/agendamentos",
                element: (
                    <table>
                        <tbody>
                            <AppointmentRow
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

describe("AppointmentRow", () => {
    it("mostra os dados da linha com Sem responsável e Não", () => {
        renderRow(buildAppointmentRowView())

        const row = screen.getByRole("row")
        expect(within(row).getByRole("link", { name: "AG-0011" })).toHaveAttribute(
            "href",
            "/agendamentos/11"
        )
        expect(within(row).getByText("Maria Aparecida Santos")).toBeInTheDocument()
        expect(within(row).getByText("***.456.789-**")).toBeInTheDocument()
        expect(within(row).getByText("Bancos")).toBeInTheDocument()
        expect(within(row).getByText("Cobrança indevida no cartão")).toBeInTheDocument()
        expect(within(row).getByText("Seg, 28/09")).toBeInTheDocument()
        expect(within(row).getByText("10:00")).toBeInTheDocument()
        expect(within(row).getByText("Não")).toBeInTheDocument()
        expect(within(row).getByText("Sem responsável")).toBeInTheDocument()
        expect(within(row).getByText("Pendente")).toBeInTheDocument()
        expect(within(row).queryByText("Fora da grade atual")).not.toBeInTheDocument()
        expect(within(row).queryByRole("button", { name: "Assumir" })).not.toBeInTheDocument()
    })

    it("mostra Sim, o responsável e o selo Fora da grade atual", () => {
        renderRow(
            buildAppointmentRowView({
                representative: true,
                responsibleLabel: "Ana Paula Souza",
                unassigned: false,
                status: "CONFIRMED",
                offGrid: true
            })
        )

        expect(screen.getByText("Sim")).toBeInTheDocument()
        expect(screen.getByText("Ana Paula Souza")).toBeInTheDocument()
        expect(screen.getByText("Confirmado")).toBeInTheDocument()
        expect(screen.getByText("Fora da grade atual")).toBeInTheDocument()
    })

    it("abre o detalhe ao clicar na linha", async () => {
        const user = userEvent.setup()
        const { onOpen } = renderRow(buildAppointmentRowView())

        await user.click(screen.getByText("Maria Aparecida Santos"))

        expect(onOpen).toHaveBeenCalledWith(expect.objectContaining({ id: "11" }))
    })

    it("o protocolo é um link para o detalhe com a origem no state", async () => {
        const user = userEvent.setup()
        const { router, onOpen } = renderRow(buildAppointmentRowView())

        await user.click(screen.getByRole("link", { name: "AG-0011" }))

        expect(router.state.location.pathname).toBe("/agendamentos/11")
        expect(router.state.location.state).toEqual(ORIGIN)
        expect(onOpen).not.toHaveBeenCalled()
    })

    it("assume sem abrir a linha", async () => {
        const user = userEvent.setup()
        const { onOpen, onClaim } = renderRow(buildAppointmentRowView({ canClaim: true }))

        await user.click(screen.getByRole("button", { name: "Assumir" }))

        expect(onClaim).toHaveBeenCalledWith(expect.objectContaining({ id: "11" }))
        expect(onOpen).not.toHaveBeenCalled()
    })

    it("desabilita Assumir durante o envio", () => {
        renderRow(buildAppointmentRowView({ canClaim: true, claiming: true }))

        expect(screen.getByRole("button", { name: "Assumir" })).toBeDisabled()
    })
})

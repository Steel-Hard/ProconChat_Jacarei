import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter } from "react-router-dom"
import { describe, expect, it, vi } from "vitest"
import AppointmentTable from "@/components/AppointmentTable"
import APPOINTMENT_TABLE_TEXTS from "@/testUtils/appointmentTableTexts"
import buildAppointmentRowView from "@/testUtils/buildAppointmentRowView"
import type AppointmentSortBy from "@/types/appointments/AppointmentSortBy.types"
import type AppointmentSortOrder from "@/types/appointments/AppointmentSortOrder.types"

vi.setConfig({ testTimeout: 20000 })

const ROWS = [
    buildAppointmentRowView(),
    buildAppointmentRowView({ id: "12", protocol: "AG-0012", detailPath: "/agendamentos/12" })
]

type Options = {
    compact?: boolean
    sortBy?: AppointmentSortBy
    sortOrder?: AppointmentSortOrder
}

function renderTable({ compact = false, sortBy, sortOrder }: Options = {}) {
    const onSort = vi.fn()
    render(
        <MemoryRouter>
            <AppointmentTable
                rows={ROWS}
                compact={compact}
                texts={APPOINTMENT_TABLE_TEXTS}
                sortBy={sortBy}
                sortOrder={sortOrder}
                linkState={{ from: { pathname: "/agendamentos", search: "" } }}
                onSort={onSort}
                onOpen={vi.fn()}
                onClaim={vi.fn()}
            />
        </MemoryRouter>
    )

    return { onSort }
}

describe("AppointmentTable", () => {
    it("mostra os títulos da tabela larga e uma linha por agendamento", () => {
        renderTable()

        const table = screen.getByRole("table", { name: "Agendamentos" })
        expect(
            within(table)
                .getAllByRole("columnheader")
                .map((cell) => cell.textContent)
        ).toEqual([
            "Protocolo",
            "Titular",
            "Categoria / pergunta",
            "Data e hora",
            "Representante",
            "Responsável",
            "Status",
            "Ações"
        ])
        expect(within(table).getAllByRole("row")).toHaveLength(3)
    })

    it("ordena pelos títulos clicáveis", async () => {
        const user = userEvent.setup()
        const { onSort } = renderTable()

        await user.click(screen.getByRole("button", { name: "Titular" }))
        await user.click(screen.getByRole("button", { name: "Data e hora" }))
        await user.click(screen.getByRole("button", { name: "Responsável" }))
        await user.click(screen.getByRole("button", { name: "Status" }))

        expect(onSort.mock.calls).toEqual([
            ["name"],
            ["appointment_datetime"],
            ["responsible"],
            ["status"]
        ])
    })

    it("marca a coluna ordenada com a seta e o aria-sort", () => {
        renderTable({ sortBy: "name", sortOrder: "asc" })

        const holder = screen.getByRole("columnheader", { name: "Titular" })
        expect(holder).toHaveAttribute("aria-sort", "ascending")
        expect(holder).toHaveTextContent("Titular▲")
        expect(screen.getByRole("columnheader", { name: "Status" })).toHaveAttribute(
            "aria-sort",
            "none"
        )
    })

    it("mostra a seta para baixo na ordem decrescente", () => {
        renderTable({ sortBy: "status", sortOrder: "desc" })

        const status = screen.getByRole("columnheader", { name: "Status" })
        expect(status).toHaveAttribute("aria-sort", "descending")
        expect(status).toHaveTextContent("Status▼")
    })

    it("na tabela compacta os títulos não são clicáveis", () => {
        renderTable({ compact: true })

        expect(screen.getAllByRole("columnheader").map((cell) => cell.textContent)).toEqual([
            "Protocolo",
            "Titular",
            "Categoria / pergunta",
            "Data · responsável",
            "Ações"
        ])
        expect(screen.queryByRole("button", { name: "Titular" })).not.toBeInTheDocument()
        expect(screen.getAllByRole("row")).toHaveLength(3)
    })
})

import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import ScheduleConflictModalRow from "@/components/ScheduleConflictModalRow"
import type ScheduleConflict from "@/types/schedule/ScheduleConflict.types"

const CONFLICT: ScheduleConflict = {
    id: "41",
    protocol: "E5F6A7B8",
    name: "Maria Souza",
    cpfMasked: "***.982.247-**",
    date: "2026-11-05",
    time: "09:00",
    status: "PENDING",
    code: "SEATS_REDUCED",
    reason: "Vagas reduzidas para 1"
}

function renderRow(conflict: ScheduleConflict = CONFLICT) {
    render(
        <ul>
            <ScheduleConflictModalRow conflict={conflict} />
        </ul>
    )
}

describe("ScheduleConflictModalRow", () => {
    it("mostra o protocolo sem a palavra Protocolo", () => {
        renderRow()

        expect(screen.getByText("E5F6A7B8")).toBeInTheDocument()
        expect(screen.queryByText(/Protocolo/)).not.toBeInTheDocument()
    })

    it("não mostra o CPF", () => {
        renderRow()

        expect(screen.queryByText("***.982.247-**")).not.toBeInTheDocument()
    })

    it("mostra o nome, o status, a data com a hora e o motivo", () => {
        renderRow()

        expect(screen.getByText("Maria Souza")).toBeInTheDocument()
        expect(screen.getByText("Pendente")).toBeInTheDocument()
        expect(screen.getByText("Quinta-feira, 05/11 às 09:00")).toBeInTheDocument()
        expect(screen.getByText("Vagas reduzidas para 1")).toBeInTheDocument()
    })

    it("mostra o status Confirmado", () => {
        renderRow({ ...CONFLICT, status: "CONFIRMED" })

        expect(screen.getByText("Confirmado")).toBeInTheDocument()
    })
})

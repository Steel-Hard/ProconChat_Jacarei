import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"
import AppointmentStatusChips from "@/components/AppointmentStatusChips"
import type AppointmentChip from "@/types/appointments/AppointmentChip.types"

vi.setConfig({ testTimeout: 20000 })

const CHIPS: AppointmentChip[] = [
    { value: "all", label: "Todos", count: 57 },
    { value: "PENDING", label: "Pendentes", count: 4 },
    { value: "CONFIRMED", label: "Confirmados", count: 12 },
    { value: "ATTENDED", label: "Atendidos", count: 30 },
    { value: "NO_SHOW", label: "Não compareceu", count: 3 },
    { value: "CANCELED", label: "Cancelados", count: 8 },
    { value: "waiting_record", label: "Aguardando registro", count: 2 }
]

describe("AppointmentStatusChips", () => {
    it("mostra os 7 chips com a contagem e marca só o ativo", () => {
        render(
            <AppointmentStatusChips
                label="Status"
                chips={CHIPS}
                active="PENDING"
                onSelect={vi.fn()}
            />
        )

        expect(screen.getByRole("group", { name: "Status" })).toBeInTheDocument()
        expect(screen.getAllByRole("button")).toHaveLength(7)
        expect(screen.getByRole("button", { name: "Pendentes 4" })).toHaveAttribute(
            "aria-pressed",
            "true"
        )
        expect(screen.getByRole("button", { name: "Todos 57" })).toHaveAttribute(
            "aria-pressed",
            "false"
        )
        expect(screen.getByRole("button", { name: "Aguardando registro 2" })).toBeInTheDocument()
    })

    it("avisa o chip escolhido", async () => {
        const user = userEvent.setup()
        const onSelect = vi.fn()
        render(
            <AppointmentStatusChips label="Status" chips={CHIPS} active="all" onSelect={onSelect} />
        )

        await user.click(screen.getByRole("button", { name: "Aguardando registro 2" }))

        expect(onSelect).toHaveBeenCalledWith("waiting_record")
    })
})

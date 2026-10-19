import { render, screen, within } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import AppointmentHistory from "@/components/AppointmentHistory"

vi.setConfig({ testTimeout: 20000 })

const ENTRIES = [
    {
        id: "3",
        text: "Falha ao avisar o cidadão pelo WhatsApp",
        when: "19/10/2026 às 09:00",
        highlight: true
    },
    {
        id: "2",
        text: "Assumido por Admin · Confirmado",
        when: "18/10/2026 às 10:47",
        highlight: false
    },
    {
        id: "1",
        text: "Criado pelo chatbot como Pendente",
        when: "18/10/2026 às 10:46",
        highlight: false
    }
]

describe("AppointmentHistory", () => {
    it("mostra os eventos na ordem recebida, com data e hora", () => {
        render(<AppointmentHistory title="Histórico" entries={ENTRIES} />)

        expect(screen.getByRole("heading", { level: 2, name: "Histórico" })).toBeInTheDocument()
        const items = within(screen.getByRole("list")).getAllByRole("listitem")
        expect(items.map((item) => item.textContent)).toEqual([
            "Falha ao avisar o cidadão pelo WhatsApp19/10/2026 às 09:00",
            "Assumido por Admin · Confirmado18/10/2026 às 10:47",
            "Criado pelo chatbot como Pendente18/10/2026 às 10:46"
        ])
    })

    it("destaca o evento marcado, sem botão de tentar de novo", () => {
        render(<AppointmentHistory title="Histórico" entries={ENTRIES} />)

        const items = within(screen.getByRole("list")).getAllByRole("listitem")
        expect(items[0]).toHaveAttribute("data-highlight", "true")
        expect(items[1]).not.toHaveAttribute("data-highlight")
        expect(screen.queryByRole("button")).not.toBeInTheDocument()
    })
})

import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
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

    it("mostra o retry junto da falha e executa a ação", async () => {
        const user = userEvent.setup()
        const onRetry = vi.fn()
        render(
            <AppointmentHistory
                title="Histórico"
                entries={ENTRIES}
                retry={{
                    allowed: true,
                    busy: false,
                    label: "Tentar novamente",
                    error: null,
                    onRetry
                }}
            />
        )

        await user.click(screen.getByRole("button", { name: "Tentar novamente" }))

        expect(onRetry).toHaveBeenCalledOnce()
        expect(
            within(screen.getAllByRole("listitem")[0] as HTMLElement).getByRole("button", {
                name: "Tentar novamente"
            })
        ).toBeInTheDocument()
    })

    it("mantém o retry disponível sem evento de falha quando autorizado pelo backend", () => {
        render(
            <AppointmentHistory
                title="Histórico"
                entries={ENTRIES.slice(1)}
                retry={{
                    allowed: true,
                    busy: false,
                    label: "Tentar novamente",
                    error: "Não foi possível concluir a ação. Tente de novo.",
                    onRetry: vi.fn()
                }}
            />
        )

        expect(screen.getByRole("button", { name: "Tentar novamente" })).toBeInTheDocument()
        expect(screen.getByRole("alert")).toHaveTextContent(
            "Não foi possível concluir a ação. Tente de novo."
        )
    })
})

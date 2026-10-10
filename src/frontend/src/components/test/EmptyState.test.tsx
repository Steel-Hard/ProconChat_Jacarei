import { describe, expect, it, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import EmptyState from "@/components/EmptyState"

describe("EmptyState", () => {
    it("mostra o título em destaque e a descrição", () => {
        render(
            <EmptyState
                title="Nenhum agendamento pendente"
                description="Todos os agendamentos já têm responsável."
            />
        )

        expect(screen.getByText("Nenhum agendamento pendente")).toBeInTheDocument()
        expect(screen.getByText("Todos os agendamentos já têm responsável.")).toBeInTheDocument()
        expect(screen.queryByRole("heading")).not.toBeInTheDocument()
    })

    it("mostra a ação e chama onClick ao clicar", async () => {
        const user = userEvent.setup()
        const onClick = vi.fn()
        render(<EmptyState title="Nada por aqui" action={{ label: "Limpar filtros", onClick }} />)

        await user.click(screen.getByRole("button", { name: "Limpar filtros" }))

        expect(onClick).toHaveBeenCalledTimes(1)
    })

    it("não mostra botão sem ação", () => {
        render(<EmptyState title="Nada por aqui" />)

        expect(screen.queryByRole("button")).not.toBeInTheDocument()
    })
})

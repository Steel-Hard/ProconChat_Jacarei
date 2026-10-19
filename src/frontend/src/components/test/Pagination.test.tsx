import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"
import Pagination from "@/components/Pagination"

vi.setConfig({ testTimeout: 20000 })

type Options = { page?: number; totalPages?: number; onPrevious?: () => void; onNext?: () => void }

function renderPagination({
    page = 1,
    totalPages = 3,
    onPrevious = vi.fn(),
    onNext = vi.fn()
}: Options = {}) {
    render(
        <Pagination
            label="Paginação"
            summary="1–20 de 57 agendamentos"
            pageLabel={`Página ${page} de ${totalPages}`}
            previousLabel="‹ Anterior"
            nextLabel="Próxima ›"
            page={page}
            totalPages={totalPages}
            onPrevious={onPrevious}
            onNext={onNext}
        />
    )
}

describe("Pagination", () => {
    it("mostra a contagem, a página e desabilita Anterior na primeira página", () => {
        renderPagination()

        expect(screen.getByText("1–20 de 57 agendamentos")).toBeInTheDocument()
        expect(screen.getByText("Página 1 de 3")).toBeInTheDocument()
        expect(screen.getByRole("button", { name: "‹ Anterior" })).toBeDisabled()
        expect(screen.getByRole("button", { name: "Próxima ›" })).toBeEnabled()
    })

    it("desabilita Próxima na última página", () => {
        renderPagination({ page: 3 })

        expect(screen.getByRole("button", { name: "‹ Anterior" })).toBeEnabled()
        expect(screen.getByRole("button", { name: "Próxima ›" })).toBeDisabled()
    })

    it("avisa a página anterior e a próxima", async () => {
        const user = userEvent.setup()
        const onPrevious = vi.fn()
        const onNext = vi.fn()
        renderPagination({ page: 2, onPrevious, onNext })

        await user.click(screen.getByRole("button", { name: "‹ Anterior" }))
        await user.click(screen.getByRole("button", { name: "Próxima ›" }))

        expect(onPrevious).toHaveBeenCalledTimes(1)
        expect(onNext).toHaveBeenCalledTimes(1)
    })

    it("mostra só a contagem quando há uma página", () => {
        renderPagination({ totalPages: 1 })

        expect(screen.getByText("1–20 de 57 agendamentos")).toBeInTheDocument()
        expect(screen.queryByRole("button")).not.toBeInTheDocument()
        expect(screen.queryByText("Página 1 de 1")).not.toBeInTheDocument()
    })
})

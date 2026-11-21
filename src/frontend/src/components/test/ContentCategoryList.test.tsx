import { describe, expect, it, vi } from "vitest"
import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import ContentCategoryList from "@/components/ContentCategoryList"
import type ContentCategoryRowView from "@/types/content/ContentCategoryRowView.types"

function item(overrides: Partial<ContentCategoryRowView> = {}): ContentCategoryRowView {
    return {
        key: "1",
        position: 1,
        shortTitle: "Contratos",
        title: "Contratos e serviços",
        questionsCount: 3,
        activeQuestionsCount: 2,
        state: "active",
        unsaved: false,
        invalid: false,
        error: null,
        selected: false,
        pageBreak: null,
        canMoveUp: true,
        canMoveDown: true,
        ...overrides
    }
}

function renderList(items: ContentCategoryRowView[], overrides = {}) {
    const handlers = {
        onSelect: vi.fn(),
        onEdit: vi.fn(),
        onToggle: vi.fn(),
        onMove: vi.fn(),
        onNew: vi.fn()
    }

    render(<ContentCategoryList items={items} {...handlers} {...overrides} />)

    return handlers
}

describe("ContentCategoryList", () => {
    it("mostra posição, título curto, nome, contagens e estado", () => {
        renderList([item()])

        expect(screen.getByText("1")).toBeInTheDocument()
        expect(screen.getByText("Contratos")).toBeInTheDocument()
        expect(screen.getByText("Contratos e serviços")).toBeInTheDocument()
        expect(screen.getByText(/3 perguntas · 2 ativas/)).toBeInTheDocument()
        expect(screen.getByText("Ativa")).toBeInTheDocument()
    })

    it("mostra Ativa · oculta no chatbot quando a categoria está oculta", () => {
        renderList([item({ state: "hidden" })])

        expect(screen.getByText("Ativa · oculta no chatbot")).toBeInTheDocument()
    })

    it("mostra Inativa e o botão Ativar para categoria inativa", () => {
        renderList([item({ state: "inactive" })])

        expect(screen.getByText("Inativa")).toBeInTheDocument()
        expect(screen.getByRole("button", { name: /^Ativar / })).toBeInTheDocument()
    })

    it("a primeira categoria não tem ↑ e a última não tem ↓", () => {
        renderList([
            item({ key: "1", canMoveUp: false }),
            item({ key: "2", position: 2, shortTitle: "Compras", canMoveDown: false })
        ])

        const buttons = screen.getAllByRole("button", { name: /^Mover .+ para cima$/ })
        const down = screen.getAllByRole("button", { name: /^Mover .+ para baixo$/ })

        expect(buttons[0]).toBeDisabled()
        expect(buttons[1]).toBeEnabled()
        expect(down[0]).toBeEnabled()
        expect(down[1]).toBeDisabled()
    })

    it("mostra a mensagem do servidor na linha da categoria com erro", () => {
        renderList([item({ error: "Já existe uma categoria com este nome" })])

        expect(screen.getByRole("alert")).toHaveTextContent("Já existe uma categoria com este nome")
    })

    it("mostra o separador de página onde a prop manda", () => {
        renderList([item({ key: "1" }), item({ key: "2", position: 2, pageBreak: 2 })])

        expect(screen.getByText("Página 2 no WhatsApp")).toHaveTextContent("Página 2 no WhatsApp")
    })

    it("chama os callbacks das ações", async () => {
        const user = userEvent.setup()
        const handlers = renderList([item()])

        await user.click(screen.getByRole("button", { name: "Ver as perguntas de Contratos" }))
        await user.click(screen.getByRole("button", { name: /^Editar categoria / }))
        await user.click(screen.getByRole("button", { name: /^Desativar / }))
        await user.click(screen.getByRole("button", { name: /^Mover .+ para baixo$/ }))

        expect(handlers.onSelect).toHaveBeenCalledWith("1")
        expect(handlers.onEdit).toHaveBeenCalledWith("1")
        expect(handlers.onToggle).toHaveBeenCalledWith("1")
        expect(handlers.onMove).toHaveBeenCalledWith("1", "down")
    })

    it("marca a categoria selecionada com aria-current", () => {
        renderList([item({ selected: true })])

        expect(
            within(screen.getByRole("listitem")).getByRole("button", {
                name: "Ver as perguntas de Contratos"
            })
        ).toHaveAttribute("aria-current", "true")
    })

    it("mostra o estado vazio com Nova categoria", async () => {
        const user = userEvent.setup()
        const handlers = renderList([])

        await user.click(screen.getByRole("button", { name: "Nova categoria" }))

        expect(screen.getByText("Nenhuma categoria cadastrada.")).toBeInTheDocument()
        expect(handlers.onNew).toHaveBeenCalledTimes(1)
    })

    it("os botões de cada linha levam o título da categoria no nome", () => {
        renderList([item({ key: "1" }), item({ key: "2", position: 2, shortTitle: "Compras" })])

        expect(screen.getByRole("button", { name: "Editar categoria Compras" })).toBeVisible()
        expect(screen.getByRole("button", { name: "Desativar Contratos" })).toBeVisible()
        expect(screen.getByRole("button", { name: "Mover Compras para cima" })).toBeVisible()
        expect(screen.getByRole("button", { name: "Mover Contratos para baixo" })).toBeVisible()
    })
})

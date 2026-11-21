import { describe, expect, it, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import ContentQuestionList from "@/components/ContentQuestionList"
import type ContentQuestionRowView from "@/types/content/ContentQuestionRowView.types"

function item(overrides: Partial<ContentQuestionRowView> = {}): ContentQuestionRowView {
    return {
        key: "10",
        categoryKey: "1",
        position: 1,
        shortTitle: "Troca de produto",
        shortDescription: "Prazo e condições",
        question: "Posso trocar um produto?",
        active: true,
        unsaved: false,
        invalid: false,
        error: null,
        requiresInPerson: false,
        outOfScope: false,
        legalBasis: "CDC, art. 49",
        documentsCount: 2,
        lastChange: { kind: "author", name: "Ana", at: "2026-11-05T15:00:00.000Z" },
        categoryTitle: null,
        pageBreak: null,
        canMoveUp: true,
        canMoveDown: true,
        ...overrides
    }
}

function renderList(items: ContentQuestionRowView[], searching = false) {
    const handlers = {
        onEdit: vi.fn(),
        onToggle: vi.fn(),
        onMove: vi.fn(),
        onNew: vi.fn()
    }

    render(<ContentQuestionList items={items} searching={searching} {...handlers} />)

    return handlers
}

describe("ContentQuestionList", () => {
    it("mostra a linha completa com a última alteração", () => {
        renderList([item()])

        expect(screen.getByText("Troca de produto")).toBeInTheDocument()
        expect(screen.getByText("Prazo e condições")).toBeInTheDocument()
        expect(screen.getByText("Posso trocar um produto?")).toBeInTheDocument()
        expect(screen.getByText("Ativa")).toBeInTheDocument()
        expect(screen.getByText("Base legal: CDC, art. 49")).toBeInTheDocument()
        expect(screen.getByText("2 documentos úteis")).toBeInTheDocument()
        expect(screen.getByText("Última alteração por Ana em 05/11/2026")).toBeInTheDocument()
    })

    it("mostra Carga inicial do sistema para item sem autor", () => {
        renderList([item({ lastChange: { kind: "initial" } })])

        expect(screen.getByText("Carga inicial do sistema")).toBeInTheDocument()
    })

    it("não mostra linha de alteração em item novo", () => {
        renderList([item({ lastChange: null, unsaved: true })])

        expect(screen.queryByText(/Última alteração/)).not.toBeInTheDocument()
        expect(screen.queryByText("Carga inicial do sistema")).not.toBeInTheDocument()
        expect(screen.getByText("Não salva")).toBeInTheDocument()
    })

    it("mostra os selos de presencial e fora do escopo", () => {
        renderList([
            item({ requiresInPerson: true }),
            item({ key: "11", position: 2, outOfScope: true })
        ])

        expect(screen.getByText("Exige atendimento presencial")).toBeInTheDocument()
        expect(screen.getByText("Fora do escopo do PROCON")).toBeInTheDocument()
    })

    it("mostra Inativa e Ativar para pergunta inativa", () => {
        renderList([item({ active: false })])

        expect(screen.getByText("Inativa")).toBeInTheDocument()
        expect(screen.getByRole("button", { name: /^Ativar / })).toBeInTheDocument()
    })

    it("em modo busca não há setas e mostra a categoria do resultado", () => {
        renderList([item({ categoryTitle: "Compras" })], true)

        expect(
            screen.queryByRole("button", { name: /^Mover .+ para cima$/ })
        ).not.toBeInTheDocument()
        expect(
            screen.queryByRole("button", { name: /^Mover .+ para baixo$/ })
        ).not.toBeInTheDocument()
        expect(screen.getByText("Categoria: Compras")).toBeInTheDocument()
    })

    it("fora da busca mostra as setas e respeita as pontas", () => {
        renderList([item({ canMoveUp: false })])

        expect(screen.getByRole("button", { name: /^Mover .+ para cima$/ })).toBeDisabled()
        expect(screen.getByRole("button", { name: /^Mover .+ para baixo$/ })).toBeEnabled()
    })

    it("mostra o separador de página", () => {
        renderList([item(), item({ key: "11", position: 2, pageBreak: 2 })])

        expect(screen.getByText("Página 2 no WhatsApp")).toHaveTextContent("Página 2 no WhatsApp")
    })

    it("chama os callbacks", async () => {
        const user = userEvent.setup()
        const handlers = renderList([item()])

        await user.click(screen.getByRole("button", { name: /^Editar / }))
        await user.click(screen.getByRole("button", { name: /^Desativar / }))
        await user.click(screen.getByRole("button", { name: /^Mover .+ para baixo$/ }))

        expect(handlers.onEdit).toHaveBeenCalledWith("1", "10")
        expect(handlers.onToggle).toHaveBeenCalledWith("1", "10")
        expect(handlers.onMove).toHaveBeenCalledWith("1", "10", "down")
    })

    it("mostra o estado vazio com Nova pergunta", async () => {
        const user = userEvent.setup()
        const handlers = renderList([])

        await user.click(screen.getByRole("button", { name: "Nova pergunta" }))

        expect(handlers.onNew).toHaveBeenCalledTimes(1)
    })

    it("mostra mensagem de nenhum resultado na busca vazia", () => {
        renderList([], true)

        expect(screen.getByText("Nenhuma pergunta encontrada.")).toBeInTheDocument()
    })

    it("os botões da linha levam o título da pergunta no nome", () => {
        renderList([item()])

        expect(screen.getByRole("button", { name: "Editar Troca de produto" })).toBeVisible()
        expect(screen.getByRole("button", { name: "Desativar Troca de produto" })).toBeVisible()
        expect(
            screen.getByRole("button", { name: "Mover Troca de produto para cima" })
        ).toBeVisible()
        expect(
            screen.getByRole("button", { name: "Mover Troca de produto para baixo" })
        ).toBeVisible()
    })
})

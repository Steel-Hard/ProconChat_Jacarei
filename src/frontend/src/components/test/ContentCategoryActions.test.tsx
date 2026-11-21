import { describe, expect, it, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import ContentCategoryActions from "@/components/ContentCategoryActions"

function renderActions(overrides: Partial<Parameters<typeof ContentCategoryActions>[0]> = {}) {
    const handlers = { onEdit: vi.fn(), onToggle: vi.fn(), onNewQuestion: vi.fn() }

    render(
        <ContentCategoryActions
            category={{ key: "1", active: true }}
            newQuestionDisabled={false}
            newQuestionDescribedBy={undefined}
            {...handlers}
            {...overrides}
        />
    )

    return handlers
}

describe("ContentCategoryActions", () => {
    it("mostra Editar categoria, Desativar categoria e Nova pergunta", () => {
        renderActions()

        expect(screen.getByRole("button", { name: "Editar categoria" })).toBeInTheDocument()
        expect(screen.getByRole("button", { name: "Desativar categoria" })).toBeInTheDocument()
        expect(screen.getByRole("button", { name: "Nova pergunta" })).toBeEnabled()
    })

    it("mostra Ativar categoria quando a categoria está inativa", () => {
        renderActions({ category: { key: "1", active: false } })

        expect(screen.getByRole("button", { name: "Ativar categoria" })).toBeInTheDocument()
        expect(
            screen.queryByRole("button", { name: "Desativar categoria" })
        ).not.toBeInTheDocument()
    })

    it("chama os callbacks com a chave da categoria", async () => {
        const user = userEvent.setup()
        const handlers = renderActions()

        await user.click(screen.getByRole("button", { name: "Editar categoria" }))
        await user.click(screen.getByRole("button", { name: "Desativar categoria" }))
        await user.click(screen.getByRole("button", { name: "Nova pergunta" }))

        expect(handlers.onEdit).toHaveBeenCalledWith("1")
        expect(handlers.onToggle).toHaveBeenCalledWith("1")
        expect(handlers.onNewQuestion).toHaveBeenCalledTimes(1)
    })

    it("sem categoria selecionada só mostra Nova pergunta desabilitada", () => {
        renderActions({ category: null, newQuestionDisabled: true, newQuestionDescribedBy: "hint" })

        expect(screen.queryByRole("button", { name: "Editar categoria" })).not.toBeInTheDocument()
        expect(screen.getByRole("button", { name: "Nova pergunta" })).toBeDisabled()
        expect(screen.getByRole("button", { name: "Nova pergunta" })).toHaveAttribute(
            "aria-describedby",
            "hint"
        )
    })
})

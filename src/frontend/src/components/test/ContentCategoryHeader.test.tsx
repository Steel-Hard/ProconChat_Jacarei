import { describe, expect, it, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import ContentCategoryHeader from "@/components/ContentCategoryHeader"
import type ContentDraftCategory from "@/types/content/ContentDraftCategory.types"

function category(overrides: Partial<ContentDraftCategory> = {}): ContentDraftCategory {
    return {
        key: "1",
        id: 1,
        title: "Contratos e serviços",
        shortTitle: "Contratos",
        description: "Planos e assinaturas",
        active: true,
        updatedBy: { id: 1, name: "Ana" },
        updatedAt: "2026-11-05T15:00:00.000Z",
        ...overrides
    }
}

function renderHeader(
    overrides: Partial<Parameters<typeof ContentCategoryHeader>[0]> = {},
    value: ContentDraftCategory = category()
) {
    render(
        <ContentCategoryHeader
            category={value}
            state="active"
            newQuestionDisabled={false}
            newQuestionDescribedBy={undefined}
            onEdit={vi.fn()}
            onToggle={vi.fn()}
            onNewQuestion={vi.fn()}
            {...overrides}
        />
    )
}

describe("ContentCategoryHeader", () => {
    it("mostra o nome, o título curto, a descrição e quem alterou por último", () => {
        renderHeader()

        expect(
            screen.getByRole("heading", { name: "Contratos e serviços", level: 2 })
        ).toBeInTheDocument()
        expect(screen.getByText("Título curto: Contratos")).toBeInTheDocument()
        expect(screen.getByText("Planos e assinaturas")).toBeInTheDocument()
        expect(screen.getByText(/Última alteração por Ana em/)).toBeInTheDocument()
        expect(screen.getByText("Ativa")).toBeInTheDocument()
    })

    it("sem autor mostra Carga inicial do sistema e sem descrição não mostra o parágrafo", () => {
        renderHeader({}, category({ updatedBy: null, description: "" }))

        expect(screen.getByText("Carga inicial do sistema")).toBeInTheDocument()
        expect(screen.queryByText("Planos e assinaturas")).not.toBeInTheDocument()
    })

    it("categoria nova ainda não gravada não mostra linha de alteração", () => {
        renderHeader({}, category({ id: null, updatedBy: null, updatedAt: null }))

        expect(screen.queryByText("Carga inicial do sistema")).not.toBeInTheDocument()
        expect(screen.queryByText(/Última alteração/)).not.toBeInTheDocument()
    })

    it("mostra o estado oculta e as três ações", () => {
        renderHeader({ state: "hidden" })

        expect(screen.getByText("Ativa · oculta no chatbot")).toBeInTheDocument()
        expect(screen.getByRole("button", { name: "Editar categoria" })).toBeInTheDocument()
        expect(screen.getByRole("button", { name: "Desativar categoria" })).toBeInTheDocument()
        expect(screen.getByRole("button", { name: "Nova pergunta" })).toBeInTheDocument()
    })
})

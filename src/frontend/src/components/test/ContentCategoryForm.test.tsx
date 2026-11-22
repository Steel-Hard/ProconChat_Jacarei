import { describe, expect, it, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import ContentCategoryForm from "@/components/ContentCategoryForm"
import type ContentCategoryFormFields from "@/types/content/ContentCategoryFormFields.types"
import type ContentFieldError from "@/types/content/ContentFieldError.types"

const empty: ContentCategoryFormFields = { title: "", shortTitle: "", description: "" }

function renderForm(
    overrides: {
        initial?: ContentCategoryFormFields
        validate?: (fields: ContentCategoryFormFields) => ContentFieldError[]
    } = {}
) {
    const onConfirm = vi.fn()
    const onCancel = vi.fn()

    render(
        <ContentCategoryForm
            mode="new"
            initial={overrides.initial ?? empty}
            validate={overrides.validate ?? (() => [])}
            onConfirm={onConfirm}
            onCancel={onCancel}
        />
    )

    return { onConfirm, onCancel }
}

describe("ContentCategoryForm", () => {
    it("o contador mostra 24/24 com 24 caracteres no título curto", async () => {
        const user = userEvent.setup()
        renderForm()

        await user.type(screen.getByLabelText(/Título curto/), "a".repeat(24))

        expect(screen.getByText("24/24")).toBeInTheDocument()
    })

    it("mostra o erro junto do campo depois de tentar confirmar", async () => {
        const user = userEvent.setup()
        const { onConfirm } = renderForm({
            validate: () => [{ field: "shortTitle", key: "errors.shortTitleRequired" }]
        })

        expect(screen.queryByText("Informe o título curto.")).not.toBeInTheDocument()

        await user.click(screen.getByRole("button", { name: "Salvar categoria" }))

        expect(screen.getByText("Informe o título curto.")).toBeInTheDocument()
        expect(screen.getByLabelText(/Título curto/)).toHaveAttribute("aria-invalid", "true")
        expect(onConfirm).not.toHaveBeenCalled()
    })

    it("mostra Já existe uma categoria com este nome quando a validação manda", async () => {
        const user = userEvent.setup()
        renderForm({ validate: () => [{ field: "title", key: "duplicateCategoryName" }] })

        await user.click(screen.getByRole("button", { name: "Salvar categoria" }))

        expect(screen.getByText("Já existe uma categoria com este nome")).toBeInTheDocument()
    })

    it("confirmar chama o callback com os valores digitados", async () => {
        const user = userEvent.setup()
        const { onConfirm } = renderForm()

        await user.type(screen.getByLabelText(/Título curto/), "Contratos")
        await user.type(screen.getByLabelText(/Nome da categoria/), "Contratos e serviços")
        await user.type(screen.getByLabelText(/Descrição/), "Resumo")
        await user.click(screen.getByRole("button", { name: "Salvar categoria" }))

        expect(onConfirm).toHaveBeenCalledWith({
            shortTitle: "Contratos",
            title: "Contratos e serviços",
            description: "Resumo"
        })
    })

    it("cancelar e Esc chamam onCancel sem confirmar", async () => {
        const user = userEvent.setup()
        const { onCancel, onConfirm } = renderForm()

        await user.click(screen.getByRole("button", { name: "Cancelar" }))
        await user.keyboard("{Escape}")

        expect(onCancel).toHaveBeenCalledTimes(2)
        expect(onConfirm).not.toHaveBeenCalled()
    })

    it("começa com os valores iniciais na edição", () => {
        renderForm({ initial: { title: "A", shortTitle: "B", description: "C" } })

        expect(screen.getByLabelText(/Título curto/)).toHaveValue("B")
        expect(screen.getByLabelText(/Nome da categoria/)).toHaveValue("A")
    })
})

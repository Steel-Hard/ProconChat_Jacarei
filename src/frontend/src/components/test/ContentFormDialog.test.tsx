import { describe, expect, it, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import ContentFormDialog from "@/components/ContentFormDialog"

function renderDialog(
    overrides: { dirty?: boolean; summary?: string | null; onConfirm?: () => void } = {}
) {
    const onCancel = vi.fn()
    const onConfirm = overrides.onConfirm ?? vi.fn()

    render(
        <>
            <main data-testid="page">
                <button type="button">Fora</button>
            </main>
            <ContentFormDialog
                title="Nova pergunta"
                confirmLabel="Confirmar"
                cancelLabel="Cancelar"
                dirty={overrides.dirty ?? false}
                summary={overrides.summary ?? null}
                onConfirm={onConfirm}
                onCancel={onCancel}
            >
                <input aria-label="Campo" />
            </ContentFormDialog>
        </>
    )

    return { onCancel, onConfirm }
}

describe("ContentFormDialog", () => {
    it("clicar fora do diálogo não fecha nem descarta", async () => {
        const user = userEvent.setup()
        const { onCancel } = renderDialog({ dirty: true })

        await user.click(document.querySelector('[role="presentation"]') as HTMLElement)

        expect(onCancel).not.toHaveBeenCalled()
    })

    it("Esc sem alterações fecha direto", async () => {
        const user = userEvent.setup()
        const { onCancel } = renderDialog()

        await user.keyboard("{Escape}")

        expect(onCancel).toHaveBeenCalledTimes(1)
    })

    it("Esc com alterações pede confirmação antes de descartar", async () => {
        const user = userEvent.setup()
        const { onCancel } = renderDialog({ dirty: true })

        await user.keyboard("{Escape}")

        expect(onCancel).not.toHaveBeenCalled()
        expect(screen.getByText("Descartar as alterações?")).toBeInTheDocument()

        await user.click(screen.getByRole("button", { name: "Descartar alterações" }))

        expect(onCancel).toHaveBeenCalledTimes(1)
    })

    it("Cancelar com alterações pede confirmação antes de descartar", async () => {
        const user = userEvent.setup()
        const { onCancel } = renderDialog({ dirty: true })

        await user.click(screen.getByRole("button", { name: "Cancelar" }))

        expect(onCancel).not.toHaveBeenCalled()
        expect(screen.getByText("Descartar as alterações?")).toBeInTheDocument()

        await user.click(screen.getByRole("button", { name: "Descartar alterações" }))

        expect(onCancel).toHaveBeenCalledTimes(1)
    })

    it("Cancelar sem alterações fecha direto", async () => {
        const user = userEvent.setup()
        const { onCancel } = renderDialog()

        await user.click(screen.getByRole("button", { name: "Cancelar" }))

        expect(onCancel).toHaveBeenCalledTimes(1)
    })

    it("Continuar editando fecha o aviso e mantém o formulário", async () => {
        const user = userEvent.setup()
        const { onCancel } = renderDialog({ dirty: true })

        await user.keyboard("{Escape}")
        await user.click(screen.getByRole("button", { name: "Continuar editando" }))

        expect(onCancel).not.toHaveBeenCalled()
        expect(screen.queryByText("Descartar as alterações?")).not.toBeInTheDocument()
        expect(screen.getByLabelText("Campo")).toBeInTheDocument()
    })

    it("Esc dentro do aviso só fecha o aviso", async () => {
        const user = userEvent.setup()
        const { onCancel } = renderDialog({ dirty: true })

        await user.keyboard("{Escape}")
        await user.keyboard("{Escape}")

        expect(onCancel).not.toHaveBeenCalled()
        expect(screen.queryByText("Descartar as alterações?")).not.toBeInTheDocument()
    })

    it("deixa o resto da página inerte e trava a rolagem enquanto aberto", () => {
        const { unmount } = render(
            <ContentFormDialog
                title="Nova"
                confirmLabel="Confirmar"
                cancelLabel="Cancelar"
                onConfirm={vi.fn()}
                onCancel={vi.fn()}
            >
                <input aria-label="Campo" />
            </ContentFormDialog>
        )
        expect(document.body.style.overflow).toBe("hidden")
        unmount()
        expect(document.body.style.overflow).toBe("")
    })

    it("marca como inertes os elementos fora do diálogo", () => {
        const { unmount } = render(
            <>
                <main data-testid="page" />
                <ContentFormDialog
                    title="Nova"
                    confirmLabel="Confirmar"
                    cancelLabel="Cancelar"
                    onConfirm={vi.fn()}
                    onCancel={vi.fn()}
                >
                    <input aria-label="Campo" />
                </ContentFormDialog>
            </>
        )

        expect(screen.getByTestId("page")).toHaveAttribute("inert")
        expect(screen.getByLabelText("Campo").closest("dialog")).not.toHaveAttribute("inert")

        unmount()

        expect(screen.queryByTestId("page")).not.toBeInTheDocument()
    })

    it("ao confirmar com erro, leva o foco ao primeiro campo inválido", async () => {
        const user = userEvent.setup()
        render(
            <ContentFormDialog
                title="Nova"
                confirmLabel="Confirmar"
                cancelLabel="Cancelar"
                summary="Corrija os campos"
                onConfirm={vi.fn()}
                onCancel={vi.fn()}
            >
                <input aria-label="A" />
                <input aria-label="B" aria-invalid="true" />
            </ContentFormDialog>
        )

        await user.click(screen.getByRole("button", { name: "Confirmar" }))

        expect(screen.getByLabelText("B")).toHaveFocus()
    })

    it("sem campo marcado, leva o foco ao resumo de erros", async () => {
        const user = userEvent.setup()
        renderDialog({ summary: "Corrija os campos" })

        await user.click(screen.getByRole("button", { name: "Confirmar" }))

        expect(screen.getByRole("alert")).toHaveFocus()
    })

    it("com a camada da prévia aberta, Esc não fecha nem pede descarte do formulário", async () => {
        const user = userEvent.setup()
        const onCancel = vi.fn()
        render(
            <ContentFormDialog
                title="Nova"
                confirmLabel="Confirmar"
                cancelLabel="Cancelar"
                dirty
                layerOpen
                layer={<div data-testid="camada">prévia</div>}
                onConfirm={vi.fn()}
                onCancel={onCancel}
            >
                <input aria-label="Campo" />
            </ContentFormDialog>
        )

        await user.keyboard("{Escape}")

        expect(onCancel).not.toHaveBeenCalled()
        expect(screen.queryByText("Descartar as alterações?")).not.toBeInTheDocument()
        expect(screen.getByTestId("camada")).toBeInTheDocument()
        expect(screen.getByLabelText("Campo").closest("dialog")).toHaveAttribute("inert")
    })
})

import { useState } from "react"
import { describe, expect, it, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import ConfirmDialog from "@/components/ConfirmDialog"

type DialogOverrides = Partial<Parameters<typeof ConfirmDialog>[0]>

function renderDialog(overrides: DialogOverrides = {}) {
    const props = {
        open: true,
        title: "Cancelar o agendamento A3F9C21B?",
        description: "O horário volta a ficar disponível no chatbot.",
        confirmLabel: "Cancelar e avisar o cidadão",
        onConfirm: vi.fn(),
        onCancel: vi.fn(),
        ...overrides
    }

    render(<ConfirmDialog {...props} />)

    return props
}

function DialogHarness() {
    const [open, setOpen] = useState(false)

    return (
        <>
            <button type="button" onClick={() => setOpen(true)}>
                Abrir modal
            </button>
            <ConfirmDialog
                open={open}
                title="Confirmar ação"
                confirmLabel="Confirmar"
                onConfirm={() => setOpen(false)}
                onCancel={() => setOpen(false)}
            />
        </>
    )
}

describe("ConfirmDialog", () => {
    it("não renderiza nada quando fechado", () => {
        renderDialog({ open: false })

        expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
        expect(screen.queryByText("Cancelar e avisar o cidadão")).not.toBeInTheDocument()
    })

    it("mostra título, descrição, conteúdo extra e os dois botões quando aberto", () => {
        renderDialog({ children: <p>Motivo do cancelamento</p> })

        const dialog = screen.getByRole("dialog", { name: "Cancelar o agendamento A3F9C21B?" })
        expect(dialog).toHaveAttribute("aria-modal", "true")
        expect(dialog).toHaveAccessibleDescription("O horário volta a ficar disponível no chatbot.")
        expect(screen.getByText("Motivo do cancelamento")).toBeInTheDocument()
        expect(screen.getByRole("button", { name: "Voltar" })).toBeInTheDocument()
        expect(
            screen.getByRole("button", { name: "Cancelar e avisar o cidadão" })
        ).toBeInTheDocument()
    })

    it("chama onConfirm uma vez ao confirmar", () => {
        const props = renderDialog()

        userEvent.click(screen.getByRole("button", { name: "Cancelar e avisar o cidadão" }))

        expect(props.onConfirm).toHaveBeenCalledTimes(1)
        expect(props.onCancel).not.toHaveBeenCalled()
    })

    it("chama onCancel ao clicar em Voltar", () => {
        const props = renderDialog()

        userEvent.click(screen.getByRole("button", { name: "Voltar" }))

        expect(props.onCancel).toHaveBeenCalledTimes(1)
        expect(props.onConfirm).not.toHaveBeenCalled()
    })

    it("chama onCancel ao apertar Esc", () => {
        const props = renderDialog()

        userEvent.keyboard("{esc}")

        expect(props.onCancel).toHaveBeenCalledTimes(1)
        expect(props.onConfirm).not.toHaveBeenCalled()
    })

    it("chama onCancel ao clicar na sobreposição e não ao clicar dentro da caixa", () => {
        const props = renderDialog()

        userEvent.click(screen.getByText("O horário volta a ficar disponível no chatbot."))
        expect(props.onCancel).not.toHaveBeenCalled()

        userEvent.click(screen.getByRole("presentation"))
        expect(props.onCancel).toHaveBeenCalledTimes(1)
        expect(props.onConfirm).not.toHaveBeenCalled()
    })

    it.each<[string, DialogOverrides]>([
        ["confirmDisabled", { confirmDisabled: true }],
        ["busy", { busy: true }]
    ])("desabilita o botão de confirmar com %s", (_name, overrides) => {
        renderDialog(overrides)

        expect(screen.getByRole("button", { name: "Cancelar e avisar o cidadão" })).toBeDisabled()
    })

    it("leva o foco para Voltar ao abrir e devolve ao botão que abriu ao fechar", () => {
        render(<DialogHarness />)
        const opener = screen.getByRole("button", { name: "Abrir modal" })

        userEvent.click(opener)
        expect(screen.getByRole("button", { name: "Voltar" })).toHaveFocus()

        userEvent.click(screen.getByRole("button", { name: "Voltar" }))
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
        expect(opener).toHaveFocus()
    })

    it("mantém o foco dentro do modal com Tab e Shift+Tab", () => {
        render(<DialogHarness />)
        userEvent.click(screen.getByRole("button", { name: "Abrir modal" }))
        const back = screen.getByRole("button", { name: "Voltar" })
        const confirm = screen.getByRole("button", { name: "Confirmar" })
        expect(back).toHaveFocus()

        userEvent.tab()
        expect(confirm).toHaveFocus()

        userEvent.tab()
        expect(back).toHaveFocus()

        userEvent.tab({ shift: true })
        expect(confirm).toHaveFocus()
    })
})

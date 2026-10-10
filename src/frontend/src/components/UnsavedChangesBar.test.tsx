import { describe, expect, it, vi } from "vitest"
import { act, fireEvent, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import UnsavedChangesBar from "@/components/UnsavedChangesBar"

function renderBar(changes: string[], saving = false) {
    const onDiscard = vi.fn()
    const onSave = vi.fn()

    render(
        <UnsavedChangesBar
            changes={changes}
            onDiscard={onDiscard}
            onSave={onSave}
            saving={saving}
        />
    )

    return { onDiscard, onSave }
}

function tap(element: HTMLElement) {
    fireEvent.pointerDown(element, { pointerType: "touch" })
    act(() => element.focus())
    fireEvent.pointerUp(element, { pointerType: "touch" })
    fireEvent.click(element, { detail: 1 })
}

describe("UnsavedChangesBar", () => {
    it("sem alterações não mostra o aviso nem Descartar e desabilita Salvar", () => {
        renderBar([])

        expect(screen.queryByText(/não salvas?$/)).not.toBeInTheDocument()
        expect(screen.queryByRole("button", { name: "Descartar" })).not.toBeInTheDocument()
        expect(screen.getByRole("button", { name: "Salvar alterações" })).toBeDisabled()
    })

    it("mostra o singular com uma alteração", () => {
        renderBar(["Duração"])

        expect(screen.getByText("1 alteração não salva")).toBeInTheDocument()
        expect(screen.getByRole("button", { name: "Salvar alterações" })).toBeEnabled()
    })

    it("mostra o plural com três alterações", () => {
        renderBar(["Duração", "Vagas", "Janela"])

        expect(screen.getByText("3 alterações não salvas")).toBeInTheDocument()
    })

    it("mostra a lista de pendentes ao passar o mouse e ao focar o aviso", () => {
        renderBar(["Duração", "Vagas", "Janela"])
        const chip = screen.getByText("3 alterações não salvas")

        userEvent.hover(chip)
        expect(screen.getByRole("tooltip")).toHaveTextContent("Pendentes: Duração; Vagas; Janela")
        expect(chip).toHaveAccessibleDescription("Pendentes: Duração; Vagas; Janela")

        userEvent.unhover(chip)
        expect(screen.queryByRole("tooltip")).not.toBeInTheDocument()

        userEvent.tab()
        expect(chip).toHaveFocus()
        expect(screen.getByRole("tooltip")).toHaveTextContent("Pendentes: Duração; Vagas; Janela")
    })

    it("chama onDiscard em Descartar e onSave em Salvar alterações", () => {
        const { onDiscard, onSave } = renderBar(["Duração"])

        userEvent.click(screen.getByRole("button", { name: "Descartar" }))
        userEvent.click(screen.getByRole("button", { name: "Salvar alterações" }))

        expect(onDiscard).toHaveBeenCalledTimes(1)
        expect(onSave).toHaveBeenCalledTimes(1)
    })

    it("desabilita Descartar e Salvar enquanto salva", () => {
        renderBar(["Duração"], true)

        expect(screen.getByRole("button", { name: "Descartar" })).toBeDisabled()
        expect(screen.getByRole("button", { name: "Salvar alterações" })).toBeDisabled()
    })

    it("alterna a lista de pendentes ao tocar no aviso", () => {
        renderBar(["Duração", "Vagas"])
        const chip = screen.getByRole("button", { name: "2 alterações não salvas" })

        tap(chip)
        expect(screen.getByRole("tooltip")).toHaveTextContent("Pendentes: Duração; Vagas")

        tap(chip)
        expect(screen.queryByRole("tooltip")).not.toBeInTheDocument()
    })

    it("alterna a lista de pendentes com Enter pelo teclado", () => {
        renderBar(["Duração", "Vagas"])
        userEvent.tab()
        expect(screen.getByRole("tooltip")).toBeInTheDocument()

        userEvent.keyboard("{enter}")
        expect(screen.queryByRole("tooltip")).not.toBeInTheDocument()

        userEvent.keyboard("{enter}")
        expect(screen.getByRole("tooltip")).toBeInTheDocument()
    })
})

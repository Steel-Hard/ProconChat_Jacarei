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

    it("mostra a lista de pendentes ao passar o mouse e ao focar o aviso", async () => {
        const user = userEvent.setup()
        renderBar(["Duração", "Vagas", "Janela"])
        const chip = screen.getByText("3 alterações não salvas")

        await user.hover(chip)
        expect(screen.getByRole("tooltip")).toHaveTextContent("Pendentes: Duração; Vagas; Janela")
        expect(chip).toHaveAccessibleDescription("Pendentes: Duração; Vagas; Janela")

        await user.unhover(chip)
        expect(screen.queryByRole("tooltip")).not.toBeInTheDocument()

        await user.tab()
        expect(chip).toHaveFocus()
        expect(screen.getByRole("tooltip")).toHaveTextContent("Pendentes: Duração; Vagas; Janela")
    })

    it("chama onDiscard em Descartar e onSave em Salvar alterações", async () => {
        const user = userEvent.setup()
        const { onDiscard, onSave } = renderBar(["Duração"])

        await user.click(screen.getByRole("button", { name: "Descartar" }))
        await user.click(screen.getByRole("button", { name: "Salvar alterações" }))

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

    it("alterna a lista de pendentes com Enter pelo teclado", async () => {
        const user = userEvent.setup()
        renderBar(["Duração", "Vagas"])
        await user.tab()
        expect(screen.getByRole("tooltip")).toBeInTheDocument()

        await user.keyboard("{Enter}")
        expect(screen.queryByRole("tooltip")).not.toBeInTheDocument()

        await user.keyboard("{Enter}")
        expect(screen.getByRole("tooltip")).toBeInTheDocument()
    })

    it("com saveDisabled desabilita Salvar mesmo com alterações e não chama onSave", async () => {
        const user = userEvent.setup()
        const onSave = vi.fn()
        render(
            <UnsavedChangesBar
                changes={["Token de acesso"]}
                onDiscard={vi.fn()}
                onSave={onSave}
                saveDisabled
            />
        )
        const save = screen.getByRole("button", { name: "Salvar alterações" })

        await user.click(save)

        expect(save).toBeDisabled()
        expect(onSave).not.toHaveBeenCalled()
        expect(screen.getByRole("button", { name: "Descartar" })).toBeEnabled()
    })

    it("com saveHint mostra o texto e o liga como descrição acessível de Salvar", () => {
        render(
            <UnsavedChangesBar
                changes={["Token de acesso"]}
                onDiscard={vi.fn()}
                onSave={vi.fn()}
                saveDisabled
                saveHint="Teste a conexão com as credenciais novas antes de salvar."
            />
        )

        expect(
            screen.getByText("Teste a conexão com as credenciais novas antes de salvar.")
        ).toBeVisible()
        expect(
            screen.getByRole("button", { name: "Salvar alterações" })
        ).toHaveAccessibleDescription("Teste a conexão com as credenciais novas antes de salvar.")
    })

    it("sem alterações não mostra o saveHint", () => {
        render(
            <UnsavedChangesBar
                changes={[]}
                onDiscard={vi.fn()}
                onSave={vi.fn()}
                saveDisabled
                saveHint="Teste a conexão com as credenciais novas antes de salvar."
            />
        )

        expect(
            screen.queryByText("Teste a conexão com as credenciais novas antes de salvar.")
        ).not.toBeInTheDocument()
        expect(
            screen.getByRole("button", { name: "Salvar alterações" })
        ).not.toHaveAccessibleDescription()
    })
})

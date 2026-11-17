import { describe, expect, it, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import DocumentItem from "@/components/DocumentItem"

describe("DocumentItem", () => {
    it("renderiza o texto do documento e botões de ação", () => {
        render(
            <DocumentItem
                description="RG ou documento com foto"
                position={1}
                isTaken={() => false}
                isFirst={true}
                isLast={false}
                onEdit={vi.fn()}
                onRemove={vi.fn()}
                onMoveUp={vi.fn()}
                onMoveDown={vi.fn()}
            />
        )

        expect(screen.getByRole("button", { name: "RG ou documento com foto" })).toBeInTheDocument()
        expect(screen.getByTitle("Mover para cima")).toBeDisabled()
        expect(screen.getByTitle("Mover para baixo")).not.toBeDisabled()
        expect(screen.getByTitle("Editar")).toBeInTheDocument()
        expect(screen.getByTitle("Remover")).toBeInTheDocument()
    })

    it("entra em modo de edição ao clicar no texto e salva com Enter", async () => {
        const user = userEvent.setup()
        const onEdit = vi.fn()

        render(
            <DocumentItem
                description="CPF"
                position={1}
                isTaken={() => false}
                isFirst={false}
                isLast={false}
                onEdit={onEdit}
                onRemove={vi.fn()}
                onMoveUp={vi.fn()}
                onMoveDown={vi.fn()}
            />
        )

        await user.click(screen.getByRole("button", { name: "CPF" }))

        const input = screen.getByRole("textbox")
        expect(input).toHaveValue("CPF")

        await user.clear(input)
        await user.type(input, "CPF do titular{enter}")

        expect(onEdit).toHaveBeenCalledWith("CPF do titular")
    })

    it("cancela a edição ao pressionar Esc", async () => {
        const user = userEvent.setup()
        const onEdit = vi.fn()

        render(
            <DocumentItem
                description="Comprovante de endereço"
                position={1}
                isTaken={() => false}
                isFirst={false}
                isLast={false}
                onEdit={onEdit}
                onRemove={vi.fn()}
                onMoveUp={vi.fn()}
                onMoveDown={vi.fn()}
            />
        )

        await user.click(screen.getByTitle("Editar"))
        const input = screen.getByRole("textbox")
        await user.type(input, " modificado{escape}")

        expect(onEdit).not.toHaveBeenCalled()
        expect(screen.queryByRole("textbox")).not.toBeInTheDocument()
        expect(screen.getByRole("button", { name: "Comprovante de endereço" })).toBeInTheDocument()
    })

    it("chama onRemove ao clicar no botão remover", async () => {
        const user = userEvent.setup()
        const onRemove = vi.fn()

        render(
            <DocumentItem
                description="Comprovante"
                position={1}
                isTaken={() => false}
                isFirst={false}
                isLast={false}
                onEdit={vi.fn()}
                onRemove={onRemove}
                onMoveUp={vi.fn()}
                onMoveDown={vi.fn()}
            />
        )

        await user.click(screen.getByTitle("Remover"))
        expect(onRemove).toHaveBeenCalledTimes(1)
    })

    it("chama onMoveUp e onMoveDown ao clicar nas setas", async () => {
        const user = userEvent.setup()
        const onMoveUp = vi.fn()
        const onMoveDown = vi.fn()

        render(
            <DocumentItem
                description="Item do meio"
                position={1}
                isTaken={() => false}
                isFirst={false}
                isLast={false}
                onEdit={vi.fn()}
                onRemove={vi.fn()}
                onMoveUp={onMoveUp}
                onMoveDown={onMoveDown}
            />
        )

        await user.click(screen.getByTitle("Mover para cima"))
        expect(onMoveUp).toHaveBeenCalledTimes(1)

        await user.click(screen.getByTitle("Mover para baixo"))
        expect(onMoveDown).toHaveBeenCalledTimes(1)
    })

    it("limita o texto em edição a 255 caracteres", async () => {
        const user = userEvent.setup()
        render(
            <DocumentItem
                description="CPF"
                position={1}
                isTaken={() => false}
                isFirst={false}
                isLast={false}
                onEdit={vi.fn()}
                onRemove={vi.fn()}
                onMoveUp={vi.fn()}
                onMoveDown={vi.fn()}
            />
        )

        await user.click(screen.getByTitle("Editar"))

        expect(screen.getByRole("textbox")).toHaveAttribute("maxlength", "255")
    })

    it("avisa e impede salvar quando o texto editado repete outro item do grupo", async () => {
        const user = userEvent.setup()
        const onEdit = vi.fn()
        render(
            <DocumentItem
                description="CPF"
                position={1}
                isTaken={(text) => text.trim().toLowerCase() === "rg"}
                isFirst={false}
                isLast={false}
                onEdit={onEdit}
                onRemove={vi.fn()}
                onMoveUp={vi.fn()}
                onMoveDown={vi.fn()}
            />
        )

        await user.click(screen.getByTitle("Editar"))
        const input = screen.getByRole("textbox")
        await user.clear(input)
        await user.type(input, "RG{enter}")

        expect(screen.getByText("Esse documento já está na lista.")).toBeInTheDocument()
        expect(screen.getByRole("button", { name: "OK" })).toBeDisabled()
        expect(onEdit).not.toHaveBeenCalled()
        expect(screen.getByRole("textbox")).toBeInTheDocument()
    })

    it("mostra o número da posição e os botões na ordem Editar, subir, descer e remover", () => {
        render(
            <DocumentItem
                description="CPF"
                position={3}
                isTaken={() => false}
                isFirst={false}
                isLast={false}
                onEdit={vi.fn()}
                onRemove={vi.fn()}
                onMoveUp={vi.fn()}
                onMoveDown={vi.fn()}
            />
        )

        expect(screen.getByText("3")).toBeInTheDocument()
        const buttons = screen.getAllByRole("button").map((button) => button.textContent)
        expect(buttons).toEqual(["CPF", "Editar", "↑", "↓", "×"])
        expect(screen.getByRole("button", { name: "Remover CPF" })).toHaveTextContent("×")
    })

    it("mostra a dica de Enter e Esc e os botões OK e Cancelar durante a edição", async () => {
        const user = userEvent.setup()
        render(
            <DocumentItem
                description="CPF"
                position={1}
                isTaken={() => false}
                isFirst={false}
                isLast={false}
                onEdit={vi.fn()}
                onRemove={vi.fn()}
                onMoveUp={vi.fn()}
                onMoveDown={vi.fn()}
            />
        )

        await user.click(screen.getByTitle("Editar"))

        expect(screen.getByText("Enter confirma · Esc cancela")).toBeInTheDocument()
        expect(screen.getByRole("button", { name: "OK" })).toBeInTheDocument()
        expect(screen.getByRole("button", { name: "Cancelar" })).toBeInTheDocument()
        expect(screen.getByText("1")).toBeInTheDocument()
    })
})

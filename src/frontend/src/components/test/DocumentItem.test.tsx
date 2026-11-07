import { describe, expect, it, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import DocumentItem from "@/components/DocumentItem"

describe("DocumentItem", () => {
    it("renderiza o texto do documento e botões de ação", () => {
        render(
            <DocumentItem
                description="RG ou documento com foto"
                index={0}
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
                index={0}
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
                index={0}
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
                index={0}
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
                index={1}
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
})

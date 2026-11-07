import { describe, expect, it, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import DocumentGroup from "@/components/DocumentGroup"

describe("DocumentGroup", () => {
    it("renderiza o título, descrição e itens da lista", () => {
        render(
            <DocumentGroup
                title="Quando o próprio titular comparece"
                description="Documentos pedidos ao consumidor"
                items={["RG", "CPF"]}
                emptyAlert="Nenhum documento será pedido"
                onAddItem={vi.fn()}
                onEditItem={vi.fn()}
                onRemoveItem={vi.fn()}
                onMoveUp={vi.fn()}
                onMoveDown={vi.fn()}
            />
        )

        expect(
            screen.getByRole("heading", { name: "Quando o próprio titular comparece" })
        ).toBeInTheDocument()
        expect(screen.getByText("Documentos pedidos ao consumidor")).toBeInTheDocument()
        expect(screen.getByRole("button", { name: "RG" })).toBeInTheDocument()
        expect(screen.getByRole("button", { name: "CPF" })).toBeInTheDocument()
        expect(screen.queryByRole("alert")).not.toBeInTheDocument()
    })

    it("mostra o alerta de grupo vazio quando não há itens", () => {
        render(
            <DocumentGroup
                title="Quando um representante comparece em nome do titular"
                description="Documentos pedidos ao representante"
                items={[]}
                emptyAlert="Nenhum documento será pedido quando um representante comparecer."
                onAddItem={vi.fn()}
                onEditItem={vi.fn()}
                onRemoveItem={vi.fn()}
                onMoveUp={vi.fn()}
                onMoveDown={vi.fn()}
            />
        )

        const alert = screen.getByRole("alert")
        expect(alert).toHaveTextContent(
            "Nenhum documento será pedido quando um representante comparecer."
        )
    })

    it("permite adicionar um novo item pelo formulário", async () => {
        const user = userEvent.setup()
        const onAddItem = vi.fn()

        render(
            <DocumentGroup
                title="Grupo Teste"
                description="Descrição"
                items={["Item 1"]}
                emptyAlert="Vazio"
                onAddItem={onAddItem}
                onEditItem={vi.fn()}
                onRemoveItem={vi.fn()}
                onMoveUp={vi.fn()}
                onMoveDown={vi.fn()}
            />
        )

        const input = screen.getByRole("textbox", {
            name: "Digite um documento e pressione Enter... (Grupo Teste)"
        })
        await user.type(input, "Novo documento importante{enter}")

        expect(onAddItem).toHaveBeenCalledWith("Novo documento importante")
        expect(input).toHaveValue("")
    })
})

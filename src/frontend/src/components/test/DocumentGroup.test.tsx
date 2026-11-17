import { describe, expect, it, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import DocumentGroup from "@/components/DocumentGroup"

function asDraftItems(texts: string[]) {
    return texts.map((text, index) => ({ id: `item-${index}`, text }))
}

function renderGroup(items: string[], onAddItem = vi.fn()) {
    return render(
        <DocumentGroup
            title="Grupo Teste"
            items={asDraftItems(items)}
            emptyAlert="Vazio"
            onAddItem={onAddItem}
            onEditItem={vi.fn()}
            onRemoveItem={vi.fn()}
            onMoveUp={vi.fn()}
            onMoveDown={vi.fn()}
        />
    )
}

describe("DocumentGroup", () => {
    it("renderiza o título, descrição e itens da lista", () => {
        render(
            <DocumentGroup
                title="Quando o próprio titular comparece"
                items={asDraftItems(["RG", "CPF"])}
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
        expect(screen.getByRole("button", { name: "RG" })).toBeInTheDocument()
        expect(screen.getByRole("button", { name: "CPF" })).toBeInTheDocument()
        expect(screen.queryByRole("alert")).not.toBeInTheDocument()
    })

    it("mostra o alerta de grupo vazio quando não há itens", () => {
        render(
            <DocumentGroup
                title="Quando um representante comparece em nome do titular"
                items={asDraftItems([])}
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
                items={asDraftItems(["Item 1"])}
                emptyAlert="Vazio"
                onAddItem={onAddItem}
                onEditItem={vi.fn()}
                onRemoveItem={vi.fn()}
                onMoveUp={vi.fn()}
                onMoveDown={vi.fn()}
            />
        )

        const input = screen.getByRole("textbox", {
            name: "Novo documento (Grupo Teste)"
        })
        await user.type(input, "Novo documento importante{enter}")

        expect(onAddItem).toHaveBeenCalledWith("Novo documento importante")
        expect(input).toHaveValue("")
    })

    it("limita o texto do novo documento a 255 caracteres", () => {
        renderGroup(["Item 1"])

        expect(
            screen.getByRole("textbox", {
                name: "Novo documento (Grupo Teste)"
            })
        ).toHaveAttribute("maxlength", "255")
    })

    it("avisa e bloqueia o 11º item quando o grupo já tem 10", async () => {
        const user = userEvent.setup()
        const onAddItem = vi.fn()
        const items = Array.from({ length: 10 }, (_, index) => `Documento ${index + 1}`)
        renderGroup(items, onAddItem)

        expect(screen.getByText("Limite de 10 documentos por grupo atingido.")).toBeInTheDocument()
        const input = screen.getByRole("textbox", {
            name: "Novo documento (Grupo Teste)"
        })
        expect(input).toBeDisabled()
        expect(screen.getByRole("button", { name: "Adicionar" })).toBeDisabled()
        await user.type(input, "Outro{enter}")
        expect(onAddItem).not.toHaveBeenCalled()
    })

    it("não mostra o aviso de limite com 9 itens", () => {
        renderGroup(Array.from({ length: 9 }, (_, index) => `Documento ${index + 1}`))

        expect(screen.queryByText(/Limite de 10 documentos/)).not.toBeInTheDocument()
    })

    it.each([
        ["cpf", "CPF"],
        ["cedula de identidade", "Cédula de Identidade"],
        ["  RG  ", "RG"]
    ])("avisa e impede o duplicado %s quando %s já está no grupo", async (typed, existing) => {
        const user = userEvent.setup()
        const onAddItem = vi.fn()
        renderGroup([existing], onAddItem)

        const input = screen.getByRole("textbox", {
            name: "Novo documento (Grupo Teste)"
        })
        await user.type(input, `${typed}{enter}`)

        expect(screen.getByText("Esse documento já está na lista.")).toBeInTheDocument()
        expect(screen.getByRole("button", { name: "Adicionar" })).toBeDisabled()
        expect(onAddItem).not.toHaveBeenCalled()
    })

    it("mostra o alerta de grupo vazio depois da lista e antes do campo de novo documento", () => {
        render(
            <DocumentGroup
                title="Grupo Teste"
                items={asDraftItems([])}
                emptyAlert="Nenhum documento será pedido."
                onAddItem={vi.fn()}
                onEditItem={vi.fn()}
                onRemoveItem={vi.fn()}
                onMoveUp={vi.fn()}
                onMoveDown={vi.fn()}
            />
        )

        const list = screen.getByRole("list", { name: "Grupo Teste" })
        const alert = screen.getByRole("alert")
        const input = screen.getByRole("textbox", { name: "Novo documento (Grupo Teste)" })

        expect(list.compareDocumentPosition(alert) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
        expect(alert.compareDocumentPosition(input) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    })
})

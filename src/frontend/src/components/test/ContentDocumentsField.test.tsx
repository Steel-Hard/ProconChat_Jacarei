import { useState } from "react"
import { describe, expect, it } from "vitest"
import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import ContentDocumentsField from "@/components/ContentDocumentsField"

function Harness({ initial = [] as string[] }) {
    const [documents, setDocuments] = useState(initial)

    return <ContentDocumentsField documents={documents} errors={[]} onChange={setDocuments} />
}

function inputValues(): string[] {
    return screen
        .getAllByRole("textbox")
        .slice(0, -1)
        .map((input) => (input as HTMLInputElement).value)
}

async function add(user: ReturnType<typeof userEvent.setup>, text: string) {
    const input = screen.getByPlaceholderText("Novo documento")
    await user.clear(input)
    if (text !== "") {
        await user.click(input)
        await user.paste(text)
    }
    await user.click(screen.getByRole("button", { name: "Adicionar" }))
}

describe("ContentDocumentsField", () => {
    it("adiciona um documento à lista", async () => {
        const user = userEvent.setup()
        render(<Harness />)

        await add(user, "RG")

        expect(inputValues()).toEqual(["RG"])
    })

    it("remove um documento", async () => {
        const user = userEvent.setup()
        render(<Harness initial={["RG", "CPF"]} />)

        await user.click(screen.getAllByRole("button", { name: "Remover" })[0])

        expect(inputValues()).toEqual(["CPF"])
    })

    it("recusa item vazio", async () => {
        const user = userEvent.setup()
        render(<Harness />)

        await add(user, "   ")

        expect(screen.getByText("Informe o documento.")).toBeInTheDocument()
        expect(screen.getAllByRole("textbox")).toHaveLength(1)
    })

    it("recusa documento com 256 caracteres e aceita com 255", async () => {
        const user = userEvent.setup()
        render(<Harness />)

        await add(user, "a".repeat(256))
        expect(
            screen.getByText("O documento deve ter no máximo 255 caracteres.")
        ).toBeInTheDocument()
        expect(screen.getAllByRole("textbox")).toHaveLength(1)

        await add(user, "a".repeat(255))
        expect(screen.getAllByRole("textbox")).toHaveLength(2)
    })

    it("não aceita o 31º item", () => {
        const thirty = Array.from({ length: 30 }, (_, index) => `Doc ${index}`)
        render(<Harness initial={thirty} />)

        expect(screen.getByRole("button", { name: "Adicionar" })).toBeDisabled()
        expect(screen.getByText("Máximo de 30 documentos.")).toBeInTheDocument()
    })

    it("documento repetido entra na lista com o aviso", async () => {
        const user = userEvent.setup()
        render(<Harness initial={["Nota fiscal"]} />)

        await add(user, "nota físcal")

        expect(inputValues()).toEqual(["Nota fiscal", "nota físcal"])
        expect(screen.getAllByText("Este documento já está na lista.")).toHaveLength(1)
    })

    it("reordena com as setas", async () => {
        const user = userEvent.setup()
        render(<Harness initial={["RG", "CPF"]} />)

        await user.click(screen.getAllByRole("button", { name: "Mover para baixo" })[0])

        expect(inputValues()).toEqual(["CPF", "RG"])
    })

    it("edita o texto de um documento", async () => {
        const user = userEvent.setup()
        render(<Harness initial={["RG"]} />)

        const row = screen.getAllByRole("listitem")[0]
        await user.type(within(row).getByRole("textbox"), "2")

        expect(inputValues()).toEqual(["RG2"])
    })
})

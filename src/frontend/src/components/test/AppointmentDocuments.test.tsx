import { render, screen, within } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import AppointmentDocuments from "@/components/AppointmentDocuments"

vi.setConfig({ testTimeout: 20000 })

const NOTE = "Lista enviada ao cidadão em 18/10/2026 às 10:46, no momento do agendamento."

function groups(first: string[], second: string[]) {
    return [
        {
            title: "Quando o próprio titular comparece",
            items: first,
            emptyText: "Nenhum documento nesta lista"
        },
        {
            title: "Documentos úteis para esta dúvida",
            items: second,
            emptyText: "Nenhum documento adicional para esta dúvida"
        }
    ]
}

function renderDocuments(configNotice: string | null, first: string[], second: string[]) {
    render(
        <AppointmentDocuments
            title="Documentos solicitados pelo chatbot"
            note={NOTE}
            configNotice={configNotice}
            groups={groups(first, second)}
        />
    )
}

describe("AppointmentDocuments", () => {
    it("mostra título, nota e os itens de cada grupo na ordem recebida", () => {
        renderDocuments(null, ["RG", "CPF"], ["Fatura"])

        expect(
            screen.getByRole("heading", { level: 2, name: "Documentos solicitados pelo chatbot" })
        ).toBeInTheDocument()
        expect(screen.getByText(NOTE)).toBeInTheDocument()
        const first = screen.getByRole("list", { name: "Quando o próprio titular comparece" })
        expect(
            within(first)
                .getAllByRole("listitem")
                .map((item) => item.textContent)
        ).toEqual(["RG", "CPF"])
        const second = screen.getByRole("list", { name: "Documentos úteis para esta dúvida" })
        expect(within(second).getByText("Fatura")).toBeInTheDocument()
    })

    it("mostra itens repetidos sem aviso de chave duplicada", () => {
        const error = vi.spyOn(console, "error").mockImplementation(() => {})

        renderDocuments(null, ["CPF", "CPF"], [])

        const first = screen.getByRole("list", { name: "Quando o próprio titular comparece" })
        expect(within(first).getAllByRole("listitem")).toHaveLength(2)
        expect(error).not.toHaveBeenCalled()
        error.mockRestore()
    })

    it("mostra o texto de vazio em cada grupo sem itens", () => {
        renderDocuments(null, [], [])

        expect(screen.getByText("Nenhum documento nesta lista")).toBeInTheDocument()
        expect(screen.getByText("Nenhum documento adicional para esta dúvida")).toBeInTheDocument()
    })

    it("mostra o aviso de configuração diferente quando recebe um", () => {
        renderDocuments("A configuração atual de documentos é diferente desta lista.", ["RG"], [])

        expect(
            screen.getByText("A configuração atual de documentos é diferente desta lista.")
        ).toBeInTheDocument()
    })

    it("não mostra aviso sem texto", () => {
        renderDocuments(null, ["RG"], [])

        expect(screen.queryByText(/configuração atual/)).not.toBeInTheDocument()
    })
})

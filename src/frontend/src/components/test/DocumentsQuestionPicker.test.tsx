import { describe, expect, it, vi } from "vitest"
import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import DocumentsQuestionPicker from "@/components/DocumentsQuestionPicker"
import type SampleQuestion from "@/types/documents/SampleQuestion.types"

const questions: SampleQuestion[] = [
    { id: "1", title: "Cobrança indevida", categoryTitle: "Bancos", documents: [] },
    { id: "2", title: "Direito de arrependimento", categoryTitle: "Compras", documents: [] }
]

describe("DocumentsQuestionPicker", () => {
    it("não oferece campo de busca, só o seletor agrupado por categoria", () => {
        render(<DocumentsQuestionPicker questions={questions} selectedId="1" onChange={vi.fn()} />)

        expect(screen.queryByRole("searchbox")).not.toBeInTheDocument()
        expect(screen.queryByLabelText("Buscar pergunta")).not.toBeInTheDocument()
        const select = screen.getByLabelText("Pergunta de exemplo")
        expect(
            within(select)
                .getAllByRole("group")
                .map((group) => group.getAttribute("label"))
        ).toEqual(["Bancos", "Compras"])
        expect(
            within(select)
                .getAllByRole("option")
                .map((option) => option.textContent)
        ).toEqual(["Cobrança indevida", "Direito de arrependimento"])
    })

    it("liga o rótulo da pergunta ao seletor quando há resultados", () => {
        render(<DocumentsQuestionPicker questions={questions} selectedId="1" onChange={vi.fn()} />)

        expect(screen.getByLabelText("Pergunta de exemplo").tagName).toBe("SELECT")
    })

    it("avisa que não há perguntas ativas em vez de mostrar o seletor", () => {
        render(<DocumentsQuestionPicker questions={[]} selectedId="" onChange={vi.fn()} />)

        expect(screen.queryByLabelText("Pergunta de exemplo")).not.toBeInTheDocument()
        expect(
            screen.getByText("Nenhuma pergunta ativa cadastrada na tela Conteúdo")
        ).toBeInTheDocument()
    })

    it("chama onChange com o id da pergunta escolhida", async () => {
        const user = userEvent.setup()
        const onChange = vi.fn()
        render(<DocumentsQuestionPicker questions={questions} selectedId="1" onChange={onChange} />)

        await user.selectOptions(screen.getByLabelText("Pergunta de exemplo"), "2")

        expect(onChange).toHaveBeenCalledWith("2")
    })
})

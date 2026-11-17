import { describe, expect, it, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import DocumentsQuestionPicker from "@/components/DocumentsQuestionPicker"
import type SampleQuestion from "@/types/documents/SampleQuestion.types"

const questions: SampleQuestion[] = [
    { id: "1", title: "Cobrança indevida", categoryTitle: "Bancos", documents: [] },
    { id: "2", title: "Direito de arrependimento", categoryTitle: "Compras", documents: [] }
]

describe("DocumentsQuestionPicker", () => {
    it("liga cada rótulo a um elemento existente também quando a busca não acha nada", async () => {
        const user = userEvent.setup()
        render(<DocumentsQuestionPicker questions={questions} selectedId="1" onChange={vi.fn()} />)

        await user.type(screen.getByRole("searchbox", { name: "Buscar pergunta" }), "zzz")

        const labels = Array.from(document.querySelectorAll("label"))
        expect(labels.length).toBeGreaterThan(0)
        for (const label of labels) {
            expect(document.getElementById(label.htmlFor)).not.toBeNull()
        }
        expect(screen.getByLabelText("Pergunta de exemplo")).toHaveTextContent(
            "Nenhuma pergunta encontrada para essa busca"
        )
    })

    it("liga o rótulo da pergunta ao seletor quando há resultados", () => {
        render(<DocumentsQuestionPicker questions={questions} selectedId="1" onChange={vi.fn()} />)

        expect(screen.getByLabelText("Pergunta de exemplo").tagName).toBe("SELECT")
    })
})

import { describe, expect, it, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import DocumentsPreview from "@/components/DocumentsPreview"
import type SampleQuestion from "@/types/documents/SampleQuestion.types"

const sampleQuestions: SampleQuestion[] = [
    {
        id: "1",
        title: "Cobrança indevida no cartão",
        documents: ["Fatura do cartão", "CPF"]
    },
    {
        id: "2",
        title: "Direito de arrependimento",
        documents: []
    }
]

describe("DocumentsPreview", () => {
    it("renderiza os seletores de quem comparece e pergunta de exemplo", () => {
        render(
            <DocumentsPreview
                attendeeGroup="holder"
                onChangeAttendeeGroup={vi.fn()}
                sampleQuestions={sampleQuestions}
                selectedQuestionId="1"
                onChangeQuestionId={vi.fn()}
                confirmationText={"Agendamento realizado\nProtocolo: ABC12345"}
                hasPreviewError={false}
                duplicateDocs={new Set()}
                isUnsaved={false}
                isQuestionEmpty={false}
            />
        )

        expect(screen.getByLabelText("Quem comparece")).toBeInTheDocument()
        expect(screen.getByLabelText("Pergunta de exemplo")).toBeInTheDocument()
        expect(screen.getByTestId("preview-bubble")).toHaveTextContent("Agendamento realizado")
    })

    it("chama callbacks ao alterar seletores", async () => {
        const user = userEvent.setup()
        const onChangeGroup = vi.fn()
        const onChangeQuestion = vi.fn()

        render(
            <DocumentsPreview
                attendeeGroup="holder"
                onChangeAttendeeGroup={onChangeGroup}
                sampleQuestions={sampleQuestions}
                selectedQuestionId="1"
                onChangeQuestionId={onChangeQuestion}
                confirmationText={"Agendamento realizado"}
                hasPreviewError={false}
                duplicateDocs={new Set()}
                isUnsaved={false}
                isQuestionEmpty={false}
            />
        )

        await user.selectOptions(screen.getByLabelText("Quem comparece"), "representative")
        expect(onChangeGroup).toHaveBeenCalledWith("representative")

        await user.selectOptions(screen.getByLabelText("Pergunta de exemplo"), "2")
        expect(onChangeQuestion).toHaveBeenCalledWith("2")
    })

    it("exibe avisos de alterações não salvas e de pergunta sem documentos", () => {
        render(
            <DocumentsPreview
                attendeeGroup="holder"
                onChangeAttendeeGroup={vi.fn()}
                sampleQuestions={sampleQuestions}
                selectedQuestionId="2"
                onChangeQuestionId={vi.fn()}
                confirmationText={"Agendamento realizado"}
                hasPreviewError={false}
                duplicateDocs={new Set()}
                isUnsaved={true}
                isQuestionEmpty={true}
            />
        )

        expect(screen.getByText("Mostrando alterações ainda não salvas")).toBeInTheDocument()
        expect(
            screen.getByText("A pergunta escolhida não tem documentos úteis cadastrados")
        ).toBeInTheDocument()
    })

    it("destaca itens repetidos com tag e dica", () => {
        render(
            <DocumentsPreview
                attendeeGroup="holder"
                onChangeAttendeeGroup={vi.fn()}
                sampleQuestions={sampleQuestions}
                selectedQuestionId="1"
                onChangeQuestionId={vi.fn()}
                confirmationText={
                    "Agendamento realizado\nLeve ao atendimento:\n• CPF\n\nDocumentos úteis para esta dúvida:\n• CPF"
                }
                hasPreviewError={false}
                duplicateDocs={new Set(["CPF"])}
                isUnsaved={false}
                isQuestionEmpty={false}
            />
        )

        const markedItem = screen.getByTitle("Este item também está nos documentos da pergunta")
        expect(markedItem).toHaveTextContent("CPF")
        expect(markedItem.tagName).toBe("MARK")
        const previewText = screen.getByTestId("preview-bubble").textContent ?? ""
        expect(previewText.match(/CPF/g)).toHaveLength(2)
        expect(screen.getAllByText("Repetido na pergunta")).toHaveLength(1)
    })

    it("exibe erro quando o backend não consegue gerar a prévia", () => {
        render(
            <DocumentsPreview
                attendeeGroup="holder"
                onChangeAttendeeGroup={vi.fn()}
                sampleQuestions={sampleQuestions}
                selectedQuestionId="1"
                onChangeQuestionId={vi.fn()}
                confirmationText=""
                hasPreviewError={true}
                duplicateDocs={new Set()}
                isUnsaved={false}
                isQuestionEmpty={false}
            />
        )

        expect(screen.getByRole("alert")).toHaveTextContent(
            "Não foi possível gerar a prévia da mensagem. Tente novamente."
        )
    })
})

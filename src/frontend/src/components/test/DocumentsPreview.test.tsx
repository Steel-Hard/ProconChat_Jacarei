import { describe, expect, it, vi } from "vitest"
import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import DocumentsPreview from "@/components/DocumentsPreview"
import holderContract from "@/testUtils/documentsPreviewHolder.json"
import withoutQuestionContract from "@/testUtils/documentsPreviewWithoutQuestion.json"
import type DocumentsPreviewData from "@/types/documents/DocumentsPreviewData.types"
import type SampleQuestion from "@/types/documents/SampleQuestion.types"

const sampleQuestions: SampleQuestion[] = [
    {
        id: "1",
        title: "Cobrança indevida no cartão",
        categoryTitle: "Bancos e cartões",
        documents: ["Fatura do cartão", "CPF"]
    },
    {
        id: "2",
        title: "Direito de arrependimento",
        categoryTitle: "Compras",
        documents: []
    }
]

function renderPreview(overrides: Partial<Parameters<typeof DocumentsPreview>[0]> = {}) {
    return render(
        <DocumentsPreview
            attendeeGroup="holder"
            onChangeAttendeeGroup={vi.fn()}
            sampleQuestions={sampleQuestions}
            selectedQuestionId="1"
            onChangeQuestionId={vi.fn()}
            preview={holderContract as DocumentsPreviewData}
            hasPreviewError={false}
            isUnsaved={false}
            isQuestionEmpty={false}
            isUpdating={false}
            {...overrides}
        />
    )
}

describe("DocumentsPreview", () => {
    it("renderiza os seletores de quem comparece e pergunta de exemplo", () => {
        renderPreview()

        const attendee = screen.getByRole("group", { name: "Quem comparece" })
        expect(
            within(attendee).getByRole("button", { name: "Titular comparece", pressed: true })
        ).toBeInTheDocument()
        expect(
            within(attendee).getByRole("button", {
                name: "Representante comparece",
                pressed: false
            })
        ).toBeInTheDocument()
        expect(screen.getByLabelText("Pergunta de exemplo")).toBeInTheDocument()
    })

    it("chama callbacks ao alterar seletores", async () => {
        const user = userEvent.setup()
        const onChangeGroup = vi.fn()
        const onChangeQuestion = vi.fn()
        renderPreview({
            onChangeAttendeeGroup: onChangeGroup,
            onChangeQuestionId: onChangeQuestion
        })

        await user.click(screen.getByRole("button", { name: "Representante comparece" }))
        expect(onChangeGroup).toHaveBeenCalledWith("representative")

        await user.selectOptions(screen.getByLabelText("Pergunta de exemplo"), "2")
        expect(onChangeQuestion).toHaveBeenCalledWith("2")
    })

    it("mostra no balão o texto exato que o backend devolve, em linhas, com a hora", () => {
        renderPreview()

        const bubble = screen.getByTestId("preview-bubble")
        const text = bubble.querySelector("p > span")
        expect(text?.textContent).toBe(holderContract.text)
        expect(within(bubble).getByText("10:15")).toBeInTheDocument()
        expect(within(bubble).getByText("• CPF")).toBeInTheDocument()
        expect(within(bubble).getByText("Documentos úteis para esta dúvida:")).toBeInTheDocument()
    })

    it("não desenha divisórias, títulos separados nem selos dentro do balão", () => {
        renderPreview()

        const bubble = screen.getByTestId("preview-bubble")
        expect(bubble.querySelector("hr, dl, ul, h1, h2, h3, strong")).toBeNull()
        expect(within(bubble).queryByText("exemplo")).not.toBeInTheDocument()
        expect(
            within(bubble).queryByText("Este item também está nos documentos da pergunta")
        ).not.toBeInTheDocument()
    })

    it("omite os blocos que o backend devolve nulos", () => {
        renderPreview({ preview: withoutQuestionContract as DocumentsPreviewData })

        const bubble = screen.getByTestId("preview-bubble")
        expect(within(bubble).getByText("Leve ao atendimento:")).toBeInTheDocument()
        expect(
            within(bubble).queryByText("Documentos úteis para esta dúvida:")
        ).not.toBeInTheDocument()
    })

    it("destaca só as linhas repetidas, sem mudar o texto, e explica fora do balão", () => {
        renderPreview()

        const bubble = screen.getByTestId("preview-bubble")
        const marked = Array.from(bubble.querySelectorAll("mark")).map(
            (element) => element.textContent
        )
        expect(marked).toEqual(["• RG ou outro documento oficial com foto", "• RG"])
        expect(within(bubble).getByText("• CPF").tagName).not.toBe("MARK")
        const legend = screen.getByText(
            "1 item aparece nas duas listas. O cidadão recebe o pedido repetido."
        )
        expect(bubble).not.toContainElement(legend)
    })

    it("não mostra a legenda geral nem destaque quando nada se repete", () => {
        renderPreview({ preview: withoutQuestionContract as DocumentsPreviewData })

        expect(screen.queryByText(/aparece nas duas listas/)).not.toBeInTheDocument()
        expect(document.querySelector("mark")).toBeNull()
    })

    it("avisa fora do balão que protocolo, data e hora são exemplos", () => {
        renderPreview()

        const bubble = screen.getByTestId("preview-bubble")
        const note = screen.getByText("Protocolo, data e hora são exemplos.")
        expect(bubble).not.toContainElement(note)
    })

    it("exibe avisos de alterações não salvas e de pergunta sem documentos", () => {
        renderPreview({ selectedQuestionId: "2", isUnsaved: true, isQuestionEmpty: true })

        expect(screen.getByText("A prévia já inclui as alterações não salvas.")).toBeInTheDocument()
        expect(
            screen.getByText(
                "Esta pergunta não tem documentos úteis cadastrados. A mensagem mostra só a lista do grupo."
            )
        ).toBeInTheDocument()
    })

    it("mantém a prévia anterior e avisa que está atualizando", () => {
        renderPreview({ isUpdating: true })

        expect(screen.getByText("Atualizando a prévia…")).toBeInTheDocument()
        expect(screen.getByTestId("preview-bubble")).toHaveTextContent("Agendamento realizado")
    })

    it("não mostra o aviso de atualização quando a prévia está em dia", () => {
        renderPreview()

        expect(screen.queryByText("Atualizando a prévia…")).not.toBeInTheDocument()
    })

    it("exibe erro quando o backend não consegue gerar a prévia", () => {
        renderPreview({ preview: null, hasPreviewError: true })

        expect(screen.getByRole("alert")).toHaveTextContent(
            "Não foi possível gerar a prévia da mensagem. Tente novamente."
        )
    })

    it("dois cartões de prévia na tela não repetem o id do título", () => {
        renderPreview()
        renderPreview()

        const ids = screen
            .getAllByRole("heading", {
                level: 2,
                name: "Prévia da mensagem de confirmação do agendamento"
            })
            .map((heading) => heading.id)
        expect(new Set(ids).size).toBe(2)
    })

    it("alerta na prévia quando o grupo escolhido está vazio", () => {
        renderPreview({
            preview: { ...(holderContract as DocumentsPreviewData), groupBlock: null }
        })

        expect(screen.getByRole("status")).toHaveTextContent(
            "Nenhum documento será pedido quando o titular comparecer."
        )
    })

    it("mostra só o texto devolvido pela API, sem acrescentar a frase de avisos por conta própria", () => {
        const phrase = holderContract.notice
        const withPhrase = holderContract.text
        const withoutPhrase = holderContract.text.replace(phrase, "").trimEnd()
        const { rerender } = renderPreview({
            preview: { ...(holderContract as DocumentsPreviewData), text: withPhrase }
        })

        expect(screen.getByTestId("preview-bubble").textContent).toContain(phrase)

        rerender(
            <DocumentsPreview
                attendeeGroup="holder"
                onChangeAttendeeGroup={vi.fn()}
                sampleQuestions={sampleQuestions}
                selectedQuestionId="1"
                onChangeQuestionId={vi.fn()}
                preview={
                    { ...holderContract, text: withoutPhrase, notice: null } as DocumentsPreviewData
                }
                hasPreviewError={false}
                isUnsaved={false}
                isQuestionEmpty={false}
                isUpdating={false}
            />
        )

        expect(screen.getByTestId("preview-bubble").textContent).not.toContain(phrase)
    })
})

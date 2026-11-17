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

    it("monta título, detalhes, grupo, pergunta e aviso pela resposta do backend", () => {
        renderPreview()

        const bubble = screen.getByTestId("preview-bubble")
        expect(within(bubble).getByText("Agendamento realizado")).toBeInTheDocument()
        expect(within(bubble).getByText("Endereço")).toBeInTheDocument()
        expect(within(bubble).getByText("Avenida Central, 100 (Térreo)")).toBeInTheDocument()
        expect(within(bubble).getByText("Leve ao atendimento:")).toBeInTheDocument()
        expect(within(bubble).getByText("CPF")).toBeInTheDocument()
        expect(within(bubble).getByText("Documentos úteis para esta dúvida:")).toBeInTheDocument()
        expect(within(bubble).getByText("Fatura do cartão")).toBeInTheDocument()
        expect(within(bubble).getByText(/Você receberá neste número avisos/)).toBeInTheDocument()
    })

    it("omite os blocos que o backend devolve nulos", () => {
        renderPreview({ preview: withoutQuestionContract as DocumentsPreviewData })

        const bubble = screen.getByTestId("preview-bubble")
        expect(within(bubble).getByText("Leve ao atendimento:")).toBeInTheDocument()
        expect(
            within(bubble).queryByText("Documentos úteis para esta dúvida:")
        ).not.toBeInTheDocument()
    })

    it("destaca os itens repetidos com a legenda do item e a legenda geral", () => {
        renderPreview()

        const marked = screen.getAllByText(/^RG/).filter((element) => element.tagName === "MARK")
        expect(marked.map((element) => element.textContent)).toEqual([
            "RG ou outro documento oficial com foto",
            "RG"
        ])
        expect(
            screen.getAllByText("Este item também está nos documentos da pergunta")
        ).toHaveLength(2)
        expect(
            screen.getByText("1 item aparece nas duas listas. O cidadão recebe o pedido repetido.")
        ).toBeInTheDocument()
        expect(screen.getByText("CPF").tagName).not.toBe("MARK")
    })

    it("não mostra a legenda geral quando nada se repete", () => {
        renderPreview({ preview: withoutQuestionContract as DocumentsPreviewData })

        expect(screen.queryByText(/aparece nas duas listas/)).not.toBeInTheDocument()
        expect(document.querySelector("mark")).toBeNull()
    })

    it("rotula protocolo e data como exemplo e o endereço não", () => {
        renderPreview()

        const bubble = screen.getByTestId("preview-bubble")
        expect(within(bubble).getAllByText("exemplo")).toHaveLength(2)
        const protocol = within(bubble).getByText("A3F9C21B").closest("dd")
        expect(protocol).toHaveTextContent("A3F9C21Bexemplo")
        const address = within(bubble).getByText("Avenida Central, 100 (Térreo)").closest("dd")
        expect(address).not.toHaveTextContent("exemplo")
    })

    it("rotula como exemplo só protocolo e data, mesmo quando o endereço tem o mesmo valor", () => {
        const contract = holderContract as DocumentsPreviewData
        renderPreview({
            preview: {
                ...contract,
                details: contract.details.map((detail) =>
                    detail.label === "Endereço" ? { ...detail, value: "A3F9C21B" } : detail
                )
            }
        })

        const bubble = screen.getByTestId("preview-bubble")
        const rows = within(bubble)
            .getAllByText("A3F9C21B")
            .map((value) => value.closest("dd"))
        expect(rows).toHaveLength(2)
        expect(rows[0]).toHaveTextContent("exemplo")
        expect(rows[1]).not.toHaveTextContent("exemplo")
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

    it("diz que a prévia continua com a pergunta anterior quando a busca não encontra nada", async () => {
        const user = userEvent.setup()
        renderPreview()

        await user.type(screen.getByLabelText("Buscar pergunta"), "zzzz")

        expect(screen.getByRole("status")).toHaveTextContent(
            "Nenhuma pergunta encontrada para essa busca. A prévia continua com a pergunta anterior."
        )
        expect(screen.getByTestId("preview-bubble")).toHaveTextContent("Agendamento realizado")
    })
})

import { describe, expect, it, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import ContentQuestionForm from "@/components/ContentQuestionForm"
import type ContentQuestionFormFields from "@/types/content/ContentQuestionFormFields.types"
import type ContentValidation from "@/types/content/ContentValidation.types"

const empty: ContentQuestionFormFields = {
    shortTitle: "",
    shortDescription: "",
    question: "",
    answer: "",
    legalBasis: "",
    requiredDocuments: [],
    requiresInPerson: false,
    inPersonNote: "",
    outOfScope: false,
    llmAllowed: true,
    active: true
}

const valid: ContentValidation = { valid: true, errors: [], warnings: [] }

function renderForm(
    overrides: {
        mode?: "new" | "edit"
        initial?: ContentQuestionFormFields
        validate?: (fields: ContentQuestionFormFields) => ContentValidation
    } = {}
) {
    const onConfirm = vi.fn()
    const onCancel = vi.fn()
    const onPreview = vi.fn()

    render(
        <ContentQuestionForm
            mode={overrides.mode ?? "new"}
            initial={overrides.initial ?? empty}
            validate={overrides.validate ?? (() => valid)}
            onConfirm={onConfirm}
            onCancel={onCancel}
            onPreview={onPreview}
        />
    )

    return { onConfirm, onCancel, onPreview }
}

const inPerson = () => screen.getByRole("checkbox", { name: /Exige atendimento presencial/ })
const outOfScope = () => screen.getByRole("checkbox", { name: /Fora do escopo do PROCON/ })
const llm = () => screen.getByRole("checkbox", { name: /Permitir complemento por IA/ })

describe("ContentQuestionForm", () => {
    it("marcar Fora do escopo desliga e desabilita a IA", async () => {
        const user = userEvent.setup()
        renderForm()

        expect(llm()).toBeChecked()

        await user.click(outOfScope())

        expect(llm()).not.toBeChecked()
        expect(llm()).toBeDisabled()
    })

    it("desmarcar Fora do escopo religa a IA", async () => {
        const user = userEvent.setup()
        renderForm()

        await user.click(outOfScope())
        await user.click(outOfScope())

        expect(llm()).toBeChecked()
        expect(llm()).toBeEnabled()
    })

    it("marcar presencial desabilita Fora do escopo e vice-versa", async () => {
        const user = userEvent.setup()
        renderForm()

        await user.click(inPerson())
        expect(outOfScope()).toBeDisabled()

        await user.click(inPerson())
        expect(outOfScope()).toBeEnabled()

        await user.click(outOfScope())
        expect(inPerson()).toBeDisabled()
    })

    it("a observação presencial só existe com presencial marcado", async () => {
        const user = userEvent.setup()
        renderForm()

        expect(
            screen.queryByLabelText(/Observação sobre o atendimento presencial/)
        ).not.toBeInTheDocument()

        await user.click(inPerson())
        await user.type(
            screen.getByLabelText(/Observação sobre o atendimento presencial/),
            "Levar RG"
        )
        await user.click(inPerson())

        expect(
            screen.queryByLabelText(/Observação sobre o atendimento presencial/)
        ).not.toBeInTheDocument()
    })

    it("o contador do texto da pergunta está sempre visível e acompanha o que é digitado", async () => {
        const user = userEvent.setup()
        renderForm()

        expect(screen.getAllByText("0/500").length).toBeGreaterThan(0)

        await user.type(screen.getByLabelText(/Texto da pergunta/), "abcde")

        expect(screen.getByText("5/500")).toBeInTheDocument()
    })

    it("com 999 caracteres na resposta não há alerta e com 1000 há", async () => {
        const user = userEvent.setup()
        renderForm()
        const answer = screen.getByLabelText(/Resposta oficial/)

        await user.click(answer)
        await user.paste("a".repeat(999))
        expect(
            screen.queryByText("Respostas longas ficam difíceis de ler no celular")
        ).not.toBeInTheDocument()

        await user.paste("a")
        expect(
            screen.getByText("Respostas longas ficam difíceis de ler no celular")
        ).toBeInTheDocument()
        expect(screen.getByText("1000/3000")).toBeInTheDocument()
    })

    it("mostra a orientação só na edição e não oferece troca de categoria", () => {
        renderForm({ mode: "edit" })

        expect(
            screen.getByText(
                "Para mudar o assunto da pergunta, desative-a e crie uma nova, para não alterar o histórico dos relatórios."
            )
        ).toBeInTheDocument()
        expect(screen.queryByLabelText(/Categoria/)).not.toBeInTheDocument()
    })

    it("não mostra a orientação ao criar", () => {
        renderForm({ mode: "new" })

        expect(screen.queryByText(/Para mudar o assunto da pergunta/)).not.toBeInTheDocument()
    })

    it("fechar sem confirmar não devolve nada", async () => {
        const user = userEvent.setup()
        const { onConfirm, onCancel } = renderForm()

        await user.type(screen.getByLabelText(/Título curto/), "abc")
        await user.click(screen.getByRole("button", { name: "Cancelar" }))

        expect(onCancel).not.toHaveBeenCalled()

        await user.click(screen.getByRole("button", { name: "Descartar alterações" }))

        expect(onCancel).toHaveBeenCalledTimes(1)
        expect(onConfirm).not.toHaveBeenCalled()
    })

    it("o campo ativo só vale ao confirmar e começa ligado", async () => {
        const user = userEvent.setup()
        const { onConfirm } = renderForm({ validate: () => valid })
        const active = screen.getByRole("checkbox", { name: "Pergunta ativa no chatbot" })

        expect(active).toBeChecked()

        await user.click(active)
        expect(onConfirm).not.toHaveBeenCalled()
        await user.click(screen.getByRole("button", { name: "Salvar pergunta" }))

        expect(onConfirm).toHaveBeenCalledWith(expect.objectContaining({ active: false }))
    })

    it("mostra os erros e não confirma quando a validação falha", async () => {
        const user = userEvent.setup()
        const { onConfirm } = renderForm({
            validate: () => ({
                valid: false,
                errors: [{ field: "answer", key: "errors.answerRequired" }],
                warnings: []
            })
        })

        await user.click(screen.getByRole("button", { name: "Salvar pergunta" }))

        expect(screen.getByText("Informe a resposta.")).toBeInTheDocument()
        expect(onConfirm).not.toHaveBeenCalled()
    })

    it("o botão da prévia chama onPreview", async () => {
        const user = userEvent.setup()
        const { onPreview } = renderForm()

        await user.click(screen.getByRole("button", { name: "Ver como o cidadão recebe" }))

        expect(onPreview).toHaveBeenCalledTimes(1)
    })
})

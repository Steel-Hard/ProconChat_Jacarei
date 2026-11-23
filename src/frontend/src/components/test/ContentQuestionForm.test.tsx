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
    it("a caixa dos textos da lista tem só título curto e descrição curta, com a ajuda", () => {
        renderForm()

        const group = screen.getByText(/Textos exibidos na lista tocável do WhatsApp/)
            .parentElement as HTMLElement

        expect(group.className).toMatch(/fieldGroup/)
        expect(group).toContainElement(screen.getByLabelText(/Título curto/))
        expect(group).toContainElement(screen.getByLabelText(/Descrição curta/))
        expect(group).not.toContainElement(screen.getByLabelText(/Texto da pergunta/))
        expect(group).not.toContainElement(screen.getByLabelText(/Base legal/))
    })

    it("Documentos úteis não ficam em caixa e cada caixa de marcar é um cartão", () => {
        renderForm()

        const documents = screen.getByText("Documentos úteis para esta dúvida")

        expect(documents.parentElement?.className).not.toMatch(/fieldGroup/)

        screen.getAllByRole("checkbox").forEach((box) => {
            expect(box.closest("label")?.className).toMatch(/checkCard/)
        })
    })

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

    it("exibe a dica dos marcadores {endereco} e {horarios} abaixo do campo de resposta", () => {
        renderForm()

        expect(
            screen.getByText(
                (_, element) =>
                    element?.tagName === "P" &&
                    element.textContent ===
                        "Você pode usar {endereco} e {horarios} para inserir automaticamente o endereço e os horários atuais da unidade."
            )
        ).toBeInTheDocument()
    })

    it("destaca {endereco} e {horarios} na dica como código", () => {
        renderForm()

        const highlighted = Array.from(document.querySelectorAll("code")).map(
            (element) => element.textContent
        )

        expect(highlighted).toEqual(["{endereco}", "{horarios}"])
    })
})

const withAnswer = (answer: string) => ({ ...empty, answer })
const follows = (earlier: Element, later: Element) =>
    Boolean(earlier.compareDocumentPosition(later) & Node.DOCUMENT_POSITION_FOLLOWING)
const save = () => screen.getByRole("button", { name: "Salvar pergunta" })

describe("ContentQuestionForm marcador mal escrito", () => {
    it("no primeiro clique em Salvar não salva e avisa o trecho errado e a forma certa", async () => {
        const user = userEvent.setup()
        const { onConfirm } = renderForm({ initial: withAnswer("Fica em {Endereco}.") })

        await user.click(save())

        expect(onConfirm).not.toHaveBeenCalled()
        expect(
            screen.getByText(
                "Marcador não reconhecido: {Endereco}. Use {endereco}. Se for isso mesmo que você quer, clique em Salvar de novo."
            )
        ).toBeInTheDocument()
    })

    it("o aviso fica ligado ao campo de resposta e é anunciado", async () => {
        const user = userEvent.setup()
        renderForm({ initial: withAnswer("Fica em {Endereco}.") })

        await user.click(save())

        const warning = screen.getByRole("status")
        expect(warning).not.toBeNull()
        expect(
            screen.getByLabelText(/Resposta oficial/).getAttribute("aria-describedby")
        ).toContain(warning?.id)
    })

    it("o segundo clique em Salvar, sem mudar o problema, salva", async () => {
        const user = userEvent.setup()
        const { onConfirm } = renderForm({ initial: withAnswer("Fica em {Endereco}.") })

        await user.click(save())
        await user.click(save())

        expect(onConfirm).toHaveBeenCalledTimes(1)
    })

    it("corrigindo o texto, salva de uma vez e sem aviso", async () => {
        const user = userEvent.setup()
        const { onConfirm } = renderForm({ initial: withAnswer("Fica em {Endereco}.") })

        await user.click(save())
        await user.clear(screen.getByLabelText(/Resposta oficial/))
        await user.type(screen.getByLabelText(/Resposta oficial/), "Fica em endereco")
        expect(screen.queryByText(/Marcador não reconhecido/)).not.toBeInTheDocument()
        await user.click(save())

        expect(onConfirm).toHaveBeenCalledTimes(1)
    })

    it("marcador correto não gera aviso e salva no primeiro clique", async () => {
        const user = userEvent.setup()
        const { onConfirm } = renderForm({ initial: withAnswer("Fica em {endereco}.") })

        await user.click(save())

        expect(onConfirm).toHaveBeenCalledTimes(1)
        expect(screen.queryByText(/Marcador não reconhecido/)).not.toBeInTheDocument()
    })

    it("lista todos os trechos errados no aviso", async () => {
        const user = userEvent.setup()
        renderForm({ initial: withAnswer("{Endereco} e {horario}") })

        await user.click(save())

        expect(
            screen.getByText("Marcador não reconhecido: {Endereco}. Use {endereco}.")
        ).toBeInTheDocument()
        expect(
            screen.getByText(
                "Marcador não reconhecido: {horario}. Use {horarios}. Se for isso mesmo que você quer, clique em Salvar de novo."
            )
        ).toBeInTheDocument()
        expect(screen.getAllByText(/clique em Salvar de novo/)).toHaveLength(1)
    })

    it("mostra o aviso enquanto a pessoa digita, antes de qualquer clique", async () => {
        const user = userEvent.setup()
        renderForm()

        await user.type(screen.getByLabelText(/Resposta oficial/), "Fica em endereço")
        expect(screen.queryByText(/Marcador não reconhecido/)).not.toBeInTheDocument()

        await user.type(screen.getByLabelText(/Resposta oficial/), " {{Endereco}")

        expect(
            screen.getByText("Marcador não reconhecido: {Endereco}. Use {endereco}.")
        ).toBeInTheDocument()
        expect(screen.queryByText(/clique em Salvar de novo/)).not.toBeInTheDocument()
    })

    it("o primeiro clique em Salvar leva o foco para o aviso", async () => {
        const user = userEvent.setup()
        renderForm({ initial: withAnswer("Fica em {Endereco}.") })

        await user.click(save())

        expect(screen.getByRole("status")).toHaveFocus()
    })

    it("mudar o texto para outro erro volta ao aviso curto, sem a frase de confirmação", async () => {
        const user = userEvent.setup()
        renderForm({ initial: withAnswer("Fica em {Endereco}.") })

        await user.click(save())
        await user.clear(screen.getByLabelText(/Resposta oficial/))
        await user.type(screen.getByLabelText(/Resposta oficial/), "Atendemos de {{Horarios}")

        expect(
            screen.getByText("Marcador não reconhecido: {Horarios}. Use {horarios}.")
        ).toBeInTheDocument()
        expect(screen.queryByText(/clique em Salvar de novo/)).not.toBeInTheDocument()
    })

    it("corrigir e reescrever o mesmo erro volta ao início: sem frase e o próximo clique não salva", async () => {
        const user = userEvent.setup()
        const { onConfirm } = renderForm({ initial: withAnswer("Fica em {Endereco}.") })
        const answerField = screen.getByLabelText(/Resposta oficial/)

        await user.click(save())
        await user.clear(answerField)
        await user.type(answerField, "Fica em endereco")
        await user.clear(answerField)
        await user.type(answerField, "Fica em {{Endereco}")

        expect(screen.queryByText(/clique em Salvar de novo/)).not.toBeInTheDocument()

        await user.click(save())

        expect(onConfirm).not.toHaveBeenCalled()
        expect(screen.getByText(/clique em Salvar de novo/)).toBeInTheDocument()
    })

    it("abaixo do campo ficam, em ordem, a dica, o aviso de marcador e o alerta de resposta longa", () => {
        renderForm({ initial: withAnswer(`{Endereco} ${"a".repeat(1000)}`) })

        const field = screen.getByLabelText(/Resposta oficial/)
        const hint = screen.getByText(/Você pode usar/)
        const placeholderWarning = screen.getByText(/Marcador não reconhecido/)
        const longAnswerWarning = screen.getByText(
            "Respostas longas ficam difíceis de ler no celular"
        )

        expect(follows(field, hint)).toBe(true)
        expect(follows(hint, placeholderWarning)).toBe(true)
        expect(follows(placeholderWarning, longAnswerWarning)).toBe(true)
    })
})

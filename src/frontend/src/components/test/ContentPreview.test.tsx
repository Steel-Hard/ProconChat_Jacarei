import { describe, expect, it, vi } from "vitest"
import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import ContentPreview from "@/components/ContentPreview"
import type ContentPreviewModel from "@/types/content/ContentPreviewModel.types"
import type ContentPreviewProps from "@/types/content/ContentPreviewProps.types"

const OFFICIAL =
    "Categoria: Compras\nPergunta: Posso trocar?\nResposta: Pode.\n\nEsta é uma orientação automatizada de caráter informativo. Ela não é vinculante e não substitui o atendimento jurídico ou administrativo formal do PROCON Jacareí."

function model(overrides: Partial<ContentPreviewModel> = {}): ContentPreviewModel {
    return {
        list: {
            text: "Escolha uma das perguntas abaixo:",
            buttonText: "Ver perguntas",
            rows: [
                { key: "q_1", title: "Outra", description: null, isCurrent: false },
                { key: "q_2", title: "Troca de produto", description: "Prazo", isCurrent: true }
            ],
            hasMoreOptions: false
        },
        primaryBubbles: [
            { id: "official", text: OFFICIAL, footerLabel: null, buttons: [] },
            {
                id: "next",
                text: "A dúvida foi resolvida?",
                footerLabel: null,
                buttons: ["Sim", "Não"]
            }
        ],
        fallbackBubbles: [],
        lengthWarning: null,
        ...overrides
    }
}

function renderPreview(overrides: Partial<ContentPreviewProps> = {}) {
    const onClose = vi.fn()
    const onRetry = vi.fn()

    render(
        <ContentPreview
            status="ready"
            model={model()}
            onClose={onClose}
            onRetry={onRetry}
            {...overrides}
        />
    )

    return { onClose, onRetry }
}

describe("ContentPreview", () => {
    it("mostra a pergunta editada em negrito na lista", () => {
        renderPreview()

        const current = screen.getByText("Troca de produto")

        expect(current.tagName).toBe("STRONG")
        expect(screen.getByText("Outra").tagName).not.toBe("STRONG")
    })

    it("mostra o texto e o botão da lista exatamente como vêm do modelo", () => {
        renderPreview()

        expect(screen.getByText("Escolha uma das perguntas abaixo:")).toBeInTheDocument()
        expect(screen.getByText("Ver perguntas")).toBeInTheDocument()
    })

    it("só mostra a indicação de próxima página quando a flag manda", () => {
        const { unmount } = render(
            <ContentPreview status="ready" model={model()} onClose={vi.fn()} onRetry={vi.fn()} />
        )
        expect(screen.queryByText("Ver mais opções ›")).not.toBeInTheDocument()
        unmount()

        const base = model()
        render(
            <ContentPreview
                status="ready"
                model={model({ list: { ...base.list, hasMoreOptions: true } })}
                onClose={vi.fn()}
                onRetry={vi.fn()}
            />
        )
        expect(screen.getByText("Ver mais opções ›")).toBeInTheDocument()
    })

    it("mostra o balão oficial exatamente com o texto do modelo", () => {
        renderPreview()

        expect(
            screen.getByText(
                "Esta é uma orientação automatizada de caráter informativo. Ela não é vinculante e não substitui o atendimento jurídico ou administrativo formal do PROCON Jacareí."
            )
        ).toBeInTheDocument()
        expect(screen.getByText("Categoria: Compras")).toBeInTheDocument()
        expect(screen.getByText("Resposta: Pode.")).toBeInTheDocument()
    })

    it("mostra o balão do passo seguinte com os botões", () => {
        renderPreview()

        expect(screen.getByText("A dúvida foi resolvida?")).toBeInTheDocument()
        expect(screen.getByText("Sim")).toBeInTheDocument()
        expect(screen.getByText("Não")).toBeInTheDocument()
    })

    it("mostra o rótulo de IA no rodapé do balão", () => {
        renderPreview({
            model: model({
                primaryBubbles: [
                    {
                        id: "ai",
                        text: "Explicação de exemplo",
                        footerLabel: "Gerado com auxílio de IA",
                        buttons: ["Sim", "Não"]
                    }
                ]
            })
        })

        expect(screen.getByText("Gerado com auxílio de IA")).toBeInTheDocument()
    })

    it("com IA ligada aparece a alternativa Se a IA estiver indisponível", () => {
        renderPreview({
            model: model({
                fallbackBubbles: [
                    {
                        id: "fallback",
                        text: "Resposta oficial alternativa",
                        footerLabel: null,
                        buttons: []
                    }
                ]
            })
        })

        const title = screen.getByText("Se a IA estiver indisponível")

        expect(title).toBeInTheDocument()
        expect(
            within(title.parentElement as HTMLElement).getByText("Resposta oficial alternativa")
        ).toBeInTheDocument()
    })

    it("não mostra a alternativa quando não há balões alternativos", () => {
        renderPreview()

        expect(screen.queryByText("Se a IA estiver indisponível")).not.toBeInTheDocument()
    })

    it("categoria não salva mostra os dois avisos e a lista, sem balões", () => {
        renderPreview({
            status: "unsaved",
            model: model({ primaryBubbles: [], fallbackBubbles: [] })
        })

        expect(
            screen.getByText("Esta categoria ainda não foi salva. Salve para que o cidadão a veja.")
        ).toBeInTheDocument()
        expect(
            screen.getByText("A prévia completa fica disponível depois de salvar")
        ).toBeInTheDocument()
        expect(screen.getByText("Troca de produto")).toBeInTheDocument()
    })

    it("mostra carregando, erro com nova tentativa e campos inválidos", async () => {
        const user = userEvent.setup()
        const { unmount } = render(
            <ContentPreview status="loading" model={null} onClose={vi.fn()} onRetry={vi.fn()} />
        )
        expect(screen.getByText("Montando a prévia...")).toBeInTheDocument()
        unmount()

        const onRetry = vi.fn()
        const errorView = render(
            <ContentPreview status="error" model={null} onClose={vi.fn()} onRetry={onRetry} />
        )
        expect(screen.getByRole("alert")).toHaveTextContent("Não foi possível montar a prévia.")
        await user.click(screen.getByRole("button", { name: "Tentar de novo" }))
        expect(onRetry).toHaveBeenCalledTimes(1)
        errorView.unmount()

        render(<ContentPreview status="invalid" model={null} onClose={vi.fn()} onRetry={vi.fn()} />)
        expect(
            screen.getByText("Corrija os campos do formulário para ver a prévia.")
        ).toBeInTheDocument()
    })

    it("o botão fechar chama onClose", async () => {
        const user = userEvent.setup()
        const { onClose } = renderPreview()

        await user.click(screen.getByRole("button", { name: "Fechar prévia" }))

        expect(onClose).toHaveBeenCalledTimes(1)
    })

    it("avisa que a IA passaria do limite e que o bot manda a resposta oficial", () => {
        renderPreview({ model: model({ lengthWarning: { length: 1300, limit: 1024 } }) })

        expect(screen.getByRole("status")).toHaveTextContent(
            "A resposta com IA ficaria com 1300 caracteres e passaria do limite de 1024 do WhatsApp. Nesse caso, o bot envia a resposta oficial."
        )
    })

    it("não mostra o aviso de tamanho quando não passa do limite", () => {
        renderPreview()

        expect(screen.queryByText(/passaria do limite/)).not.toBeInTheDocument()
    })
})

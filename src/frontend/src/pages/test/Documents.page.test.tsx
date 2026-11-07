import { afterEach, describe, expect, it, vi } from "vitest"
import { screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import renderDocumentsPage from "@/testUtils/renderDocumentsPage"
import type DocumentsConfigView from "@/types/documents/DocumentsConfigView.types"

const initialDocuments: DocumentsConfigView = {
    holder: [
        "RG ou outro documento oficial com foto",
        "CPF",
        "Comprovante de endereço",
        "Comprovante da reclamação"
    ],
    representative: [
        "RG e CPF do titular (cópia)",
        "RG ou outro documento do representante",
        "Procuração assinada",
        "Comprovante da reclamação"
    ],
    updatedBy: { id: 1, name: "Mariana Couto" },
    updatedAt: "2026-10-15T14:30:00.000Z",
    unitAddress: "Avenida Central, 100",
    unitAddressComplement: "Térreo",
    reminderEnabled: true,
    reminderHours: 24,
    sampleQuestions: [
        {
            id: "1",
            title: "Cobrança indevida no cartão",
            documents: ["CPF", "Fatura do cartão"]
        },
        {
            id: "2",
            title: "Direito de arrependimento",
            documents: []
        }
    ]
}

function stubDocumentsFetch(
    response: { status?: number; data?: unknown; error?: unknown } = {
        status: 200,
        data: initialDocuments
    }
) {
    let capturedPutBody: unknown = null

    vi.stubGlobal(
        "fetch",
        vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
            const request = input instanceof Request ? input : null
            const url = request ? request.url : typeof input === "string" ? input : input.toString()
            const method = request?.method ?? init?.method ?? "GET"
            const rawBody = request ? await request.text() : init?.body
            const body =
                typeof rawBody === "string"
                    ? (JSON.parse(rawBody) as Record<string, unknown>)
                    : null

            if (url.endsWith("/api/v1/documents") && method === "GET") {
                if (response.status && response.status >= 400) {
                    return Promise.resolve(
                        new Response(JSON.stringify(response.error ?? { error: "Failed" }), {
                            status: response.status,
                            headers: { "Content-Type": "application/json" }
                        })
                    )
                }
                return Promise.resolve(
                    new Response(JSON.stringify({ data: response.data }), {
                        status: 200,
                        headers: { "Content-Type": "application/json" }
                    })
                )
            }

            if (url.endsWith("/api/v1/documents") && method === "PUT") {
                capturedPutBody = body
                const updatedData = {
                    ...initialDocuments,
                    ...(capturedPutBody as object),
                    updatedAt: new Date().toISOString()
                }
                return Promise.resolve(
                    new Response(JSON.stringify({ data: updatedData }), {
                        status: 200,
                        headers: { "Content-Type": "application/json" }
                    })
                )
            }

            if (url.endsWith("/api/v1/documents/preview") && method === "POST") {
                const byRepresentative = body?.byRepresentative === true
                const groupDocuments = body?.groupDocuments as string[]
                const question = initialDocuments.sampleQuestions.find(
                    (item) => item.id === body?.questionId
                )
                const lines = [
                    "Agendamento realizado",
                    "Protocolo: ABC12345",
                    "Data e hora: Seg, 09/11 às 10:00",
                    "Endereço: Avenida Central, 100 (Térreo)",
                    "",
                    byRepresentative
                        ? "A pessoa que comparecer em seu nome deve levar:"
                        : "Leve ao atendimento:",
                    ...groupDocuments.map((document) => `• ${document}`)
                ]
                if (question?.documents.length) {
                    lines.push("", "Documentos úteis para esta dúvida:")
                    lines.push(...question.documents.map((document) => `• ${document}`))
                }
                lines.push(
                    "",
                    "Você receberá neste número avisos sobre este agendamento, como um lembrete 24 horas antes do atendimento e o aviso em caso de cancelamento."
                )
                return new Response(JSON.stringify({ data: { text: lines.join("\n") } }), {
                    status: 200,
                    headers: { "Content-Type": "application/json" }
                })
            }

            return Promise.resolve(new Response(null, { status: 404 }))
        })
    )

    return {
        getCapturedPutBody: () => capturedPutBody
    }
}

afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
    vi.resetModules()
})

describe("DocumentsPage", () => {
    it("exibe mensagem de carregando inicialmente", async () => {
        vi.stubGlobal(
            "fetch",
            vi.fn(() => new Promise<Response>(() => {}))
        )
        await renderDocumentsPage()

        expect(screen.getByText("Carregando...")).toBeInTheDocument()
    })

    it("exibe alerta de erro se a requisição falhar", async () => {
        stubDocumentsFetch({ status: 500, error: { message: "Erro interno" } })
        await renderDocumentsPage()

        expect(
            await screen.findByText(
                "Não foi possível carregar os documentos para atendimento presencial."
            )
        ).toBeInTheDocument()
    })

    it("carrega e renderiza o cabeçalho, aviso de próximos agendamentos e última alteração", async () => {
        stubDocumentsFetch()
        await renderDocumentsPage()

        expect(
            await screen.findByRole("heading", { name: "Documentos para atendimento presencial" })
        ).toBeInTheDocument()
        expect(
            screen.getByText(
                "As alterações valem só para os próximos agendamentos. Os já criados mantêm a lista que foi enviada ao cidadão na época."
            )
        ).toBeInTheDocument()
        expect(
            screen.getByText("Última alteração por Mariana Couto em 15/10/2026")
        ).toBeInTheDocument()
    })

    it("renderiza os dois grupos e seus itens", async () => {
        stubDocumentsFetch()
        await renderDocumentsPage()

        expect(
            await screen.findByRole("heading", { name: "Quando o próprio titular comparece" })
        ).toBeInTheDocument()
        expect(
            screen.getByRole("heading", {
                name: "Quando um representante comparece em nome do titular"
            })
        ).toBeInTheDocument()

        expect(
            screen.getByRole("button", { name: "RG ou outro documento oficial com foto" })
        ).toBeInTheDocument()
        expect(screen.getByRole("button", { name: "Procuração assinada" })).toBeInTheDocument()
    })

    it("adiciona um documento e exibe alterações não salvas", async () => {
        const user = userEvent.setup()
        stubDocumentsFetch()
        await renderDocumentsPage()

        await screen.findByRole("heading", { name: "Quando o próprio titular comparece" })

        const input = screen.getByRole("textbox", {
            name: "Digite um documento e pressione Enter... (Quando o próprio titular comparece)"
        })
        await user.type(input, "Carteira de Trabalho (CTPS){enter}")

        expect(
            screen.getByRole("button", { name: "Carteira de Trabalho (CTPS)" })
        ).toBeInTheDocument()
        expect(screen.getByText("1 alteração não salva")).toBeInTheDocument()
    })

    it("edita um item inline", async () => {
        const user = userEvent.setup()
        stubDocumentsFetch()
        await renderDocumentsPage()

        const itemButton = await screen.findByRole("button", { name: "Comprovante da reclamação" })
        await user.click(itemButton)

        const input = screen.getByRole("textbox", { name: "Editar Comprovante da reclamação" })
        await user.clear(input)
        await user.type(input, "Nota fiscal ou contrato{enter}")

        expect(screen.getByRole("button", { name: "Nota fiscal ou contrato" })).toBeInTheDocument()
        expect(screen.getByText("1 alteração não salva")).toBeInTheDocument()
    })

    it("reordena itens com botões de seta", async () => {
        const user = userEvent.setup()
        stubDocumentsFetch()
        await renderDocumentsPage()

        await screen.findByRole("heading", { name: "Quando o próprio titular comparece" })

        const moveDownButtons = screen.getAllByTitle("Mover para baixo")
        await user.click(moveDownButtons[0]!)

        expect(screen.getByText("1 alteração não salva")).toBeInTheDocument()
    })

    it("exibe alerta de grupo vazio mas permite salvar", async () => {
        const user = userEvent.setup()
        const { getCapturedPutBody } = stubDocumentsFetch()
        await renderDocumentsPage()

        await screen.findByRole("heading", { name: "Quando o próprio titular comparece" })

        // Remove todos os 4 itens do titular
        for (let i = 0; i < 4; i++) {
            const removeButtons = screen.getAllByTitle("Remover")
            await user.click(removeButtons[0]!)
        }

        expect(
            screen.getByText(
                "Nenhum documento será pedido quando o titular comparecer. O cidadão pode chegar sem o necessário para o atendimento."
            )
        ).toBeInTheDocument()

        const saveButton = screen.getByRole("button", { name: "Salvar alterações" })
        expect(saveButton).not.toBeDisabled()

        await user.click(saveButton)

        await waitFor(() => expect(getCapturedPutBody()).not.toBeNull())
        expect((getCapturedPutBody() as { holder: string[] }).holder).toEqual([])
        expect(screen.getByText("Documentos atualizados com sucesso.")).toBeInTheDocument()
    })

    it("descartar desfaz todas as alterações pendentes", async () => {
        const user = userEvent.setup()
        stubDocumentsFetch()
        await renderDocumentsPage()

        await screen.findByRole("heading", { name: "Quando o próprio titular comparece" })

        const input = screen.getByRole("textbox", {
            name: "Digite um documento e pressione Enter... (Quando o próprio titular comparece)"
        })
        await user.type(input, "Documento extra{enter}")

        expect(screen.getByRole("button", { name: "Documento extra" })).toBeInTheDocument()
        expect(screen.getByText("1 alteração não salva")).toBeInTheDocument()

        await user.click(screen.getByRole("button", { name: "Descartar" }))

        expect(screen.queryByRole("button", { name: "Documento extra" })).not.toBeInTheDocument()
        expect(screen.queryByText("1 alteração não salva")).not.toBeInTheDocument()
    })

    it("prévia mostra a mensagem com destaque de itens repetidos e atualiza com os seletores", async () => {
        const user = userEvent.setup()
        stubDocumentsFetch()
        await renderDocumentsPage()

        await screen.findByRole("heading", { name: "Prévia da mensagem de confirmação" })
        await screen.findByText("Agendamento realizado")

        const bubble = screen.getByTestId("preview-bubble")
        expect(bubble).toHaveTextContent("Agendamento realizado")
        expect(bubble).toHaveTextContent("Leve ao atendimento:")
        expect(bubble).toHaveTextContent("Documentos úteis para esta dúvida:")

        // CPF está tanto no grupo do titular quanto na pergunta "Cobrança indevida no cartão"
        expect(screen.getByText("Repetido na pergunta")).toBeInTheDocument()

        // Troca para representante
        await user.selectOptions(screen.getByLabelText("Quem comparece"), "representative")
        await waitFor(() =>
            expect(bubble).toHaveTextContent("A pessoa que comparecer em seu nome deve levar:")
        )

        // Troca para pergunta sem documentos
        await user.selectOptions(screen.getByLabelText("Pergunta de exemplo"), "2")
        expect(
            screen.getByText("A pergunta escolhida não tem documentos úteis cadastrados")
        ).toBeInTheDocument()
    })
})

import { afterEach, describe, expect, it, vi } from "vitest"
import { screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import renderDocumentsPage from "@/testUtils/renderDocumentsPage"
import holderContract from "@/testUtils/documentsPreviewHolder.json"
import representativeContract from "@/testUtils/documentsPreviewRepresentative.json"
import withoutQuestionContract from "@/testUtils/documentsPreviewWithoutQuestion.json"
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
    sampleQuestions: [
        {
            id: "1",
            title: "Cobrança indevida no cartão",
            categoryTitle: "Bancos e cartões",
            documents: ["CPF", "Fatura do cartão"]
        },
        {
            id: "2",
            title: "Direito de arrependimento",
            categoryTitle: "Compras",
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
    const previewBodies: Array<Record<string, unknown> | null> = []

    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const request =
            typeof input === "object" &&
            input !== null &&
            "url" in input &&
            "method" in input &&
            "clone" in input
                ? (input as Request)
                : null
        const url = request ? request.url : typeof input === "string" ? input : input.toString()
        const method = request?.method ?? init?.method ?? "GET"
        const rawBody = request ? await request.clone().text() : init?.body
        const body =
            typeof rawBody === "string" && rawBody.length > 0
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
            previewBodies.push(body)
            const contract =
                body?.byRepresentative === true
                    ? representativeContract
                    : body?.questionId === undefined
                      ? withoutQuestionContract
                      : holderContract
            return new Response(JSON.stringify({ data: contract }), {
                status: 200,
                headers: { "Content-Type": "application/json" }
            })
        }

        return Promise.resolve(new Response(null, { status: 404 }))
    })

    return {
        fetchMock,
        getCapturedPutBody: () => capturedPutBody,
        previewBodies
    }
}

function buildTwelveQuestions() {
    return Array.from({ length: 12 }, (_, index) => ({
        id: String(index + 1),
        title: `Pergunta ${index + 1}`,
        categoryTitle: index < 7 ? "Bancos e cartões" : "Compras",
        documents: []
    }))
}

afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
    vi.resetModules()
})

describe("DocumentsPage", () => {
    it("exibe mensagem de carregando inicialmente", async () => {
        await renderDocumentsPage(vi.fn(() => new Promise<Response>(() => {})))

        expect(screen.getByText("Carregando...")).toBeInTheDocument()
    })

    it("exibe alerta de erro se a requisição falhar", async () => {
        const { fetchMock } = stubDocumentsFetch({
            status: 500,
            error: { message: "Erro interno" }
        })
        await renderDocumentsPage(fetchMock)

        expect(
            await screen.findByText(
                "Não foi possível carregar os documentos para atendimento presencial."
            )
        ).toBeInTheDocument()
    })

    it("carrega e renderiza o cabeçalho, aviso de próximos agendamentos e última alteração", async () => {
        const { fetchMock } = stubDocumentsFetch()
        await renderDocumentsPage(fetchMock)

        expect(
            await screen.findByRole("heading", { name: "Documentos para atendimento presencial" })
        ).toBeInTheDocument()
        expect(
            screen.getByText(
                "As alterações valem só para os próximos agendamentos. Os já criados mantêm a lista que foi enviada ao cidadão na época."
            )
        ).toBeInTheDocument()
        expect(
            await screen.findByText("Última alteração por Mariana Couto em 15/10/2026")
        ).toBeInTheDocument()
    })

    it("renderiza os dois grupos e seus itens", async () => {
        const { fetchMock } = stubDocumentsFetch()
        await renderDocumentsPage(fetchMock)

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
        const { fetchMock } = stubDocumentsFetch()
        await renderDocumentsPage(fetchMock)

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
        const { fetchMock } = stubDocumentsFetch()
        await renderDocumentsPage(fetchMock)

        const holderList = await screen.findByRole("list", {
            name: "Quando o próprio titular comparece"
        })
        const itemButton = within(holderList).getByRole("button", {
            name: "Comprovante da reclamação"
        })
        await user.click(itemButton)

        const input = screen.getByRole("textbox", { name: "Editar Comprovante da reclamação" })
        await user.clear(input)
        await user.type(input, "Nota fiscal ou contrato{enter}")

        expect(screen.getByRole("button", { name: "Nota fiscal ou contrato" })).toBeInTheDocument()
        expect(screen.getByText("1 alteração não salva")).toBeInTheDocument()
    })

    it("reordena itens e envia a ordem final no corpo do PUT", async () => {
        const user = userEvent.setup()
        const { fetchMock, getCapturedPutBody } = stubDocumentsFetch()
        await renderDocumentsPage(fetchMock)

        const holderList = await screen.findByRole("list", {
            name: "Quando o próprio titular comparece"
        })
        await user.click(within(holderList).getByRole("button", { name: "Mover CPF para cima" }))

        const titles = within(holderList)
            .getAllByRole("listitem")
            .map((item) => within(item).getAllByRole("button")[0]!.textContent)
        expect(titles).toEqual([
            "CPF",
            "RG ou outro documento oficial com foto",
            "Comprovante de endereço",
            "Comprovante da reclamação"
        ])
        expect(screen.getByText("1 alteração não salva")).toBeInTheDocument()

        await user.click(screen.getByRole("button", { name: "Salvar alterações" }))

        await waitFor(() => expect(getCapturedPutBody()).not.toBeNull())
        expect(getCapturedPutBody()).toEqual({
            holder: [
                "CPF",
                "RG ou outro documento oficial com foto",
                "Comprovante de endereço",
                "Comprovante da reclamação"
            ],
            representative: initialDocuments.representative
        })
    })

    it("conta uma alteração por ação e lista as pendentes ao passar o mouse", async () => {
        const user = userEvent.setup()
        const { fetchMock } = stubDocumentsFetch()
        await renderDocumentsPage(fetchMock)

        const holderList = await screen.findByRole("list", {
            name: "Quando o próprio titular comparece"
        })
        await user.type(
            screen.getByRole("textbox", {
                name: "Digite um documento e pressione Enter... (Quando o próprio titular comparece)"
            }),
            "Carteira de Trabalho{enter}"
        )
        await user.click(within(holderList).getByRole("button", { name: "Remover CPF" }))
        await user.click(
            within(holderList).getByRole("button", {
                name: "Mover Comprovante de endereço para cima"
            })
        )

        const chip = screen.getByText("3 alterações não salvas")
        await user.hover(chip)

        expect(screen.getByRole("tooltip")).toHaveTextContent(
            "Pendentes: Adicionou “Carteira de Trabalho” (titular); Removeu “CPF” (titular); Moveu “Comprovante de endereço” para cima (titular)"
        )
    })

    it("exibe alerta de grupo vazio mas permite salvar", async () => {
        const user = userEvent.setup()
        const { fetchMock, getCapturedPutBody } = stubDocumentsFetch()
        await renderDocumentsPage(fetchMock)

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
        const { fetchMock } = stubDocumentsFetch()
        await renderDocumentsPage(fetchMock)

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

    it("prévia monta título, detalhes, grupo e pergunta pela resposta do backend", async () => {
        const { fetchMock } = stubDocumentsFetch()
        await renderDocumentsPage(fetchMock)

        const bubble = await screen.findByTestId("preview-bubble")
        await within(bubble).findByText("Agendamento realizado")

        expect(within(bubble).getByText("Protocolo")).toBeInTheDocument()
        expect(within(bubble).getByText("Avenida Central, 100 (Térreo)")).toBeInTheDocument()
        expect(within(bubble).getByText("Leve ao atendimento:")).toBeInTheDocument()
        expect(within(bubble).getByText("CPF")).toBeInTheDocument()
        expect(within(bubble).getByText("Documentos úteis para esta dúvida:")).toBeInTheDocument()
        expect(within(bubble).getByText("Fatura do cartão")).toBeInTheDocument()
        expect(within(bubble).getByText(/Você receberá neste número avisos/)).toBeInTheDocument()
    })

    it("lista todas as perguntas ativas agrupadas por categoria, na ordem recebida", async () => {
        const { fetchMock } = stubDocumentsFetch({
            status: 200,
            data: { ...initialDocuments, sampleQuestions: buildTwelveQuestions() }
        })
        await renderDocumentsPage(fetchMock)

        const select = await screen.findByLabelText("Pergunta de exemplo")
        const groups = within(select).getAllByRole("group")

        expect(groups.map((group) => group.getAttribute("label"))).toEqual([
            "Bancos e cartões",
            "Compras"
        ])
        expect(
            within(select)
                .getAllByRole("option")
                .map((option) => option.textContent)
        ).toEqual(Array.from({ length: 12 }, (_, index) => `Pergunta ${index + 1}`))
    })

    it("filtra as perguntas pela busca no título e escolhe a primeira que sobra", async () => {
        const user = userEvent.setup()
        const { fetchMock } = stubDocumentsFetch({
            status: 200,
            data: { ...initialDocuments, sampleQuestions: buildTwelveQuestions() }
        })
        await renderDocumentsPage(fetchMock)

        await user.type(
            await screen.findByRole("searchbox", { name: "Buscar pergunta" }),
            "pergunta 1"
        )

        const select = screen.getByLabelText("Pergunta de exemplo")
        expect(
            within(select)
                .getAllByRole("option")
                .map((option) => option.textContent)
        ).toEqual(["Pergunta 1", "Pergunta 10", "Pergunta 11", "Pergunta 12"])

        await user.clear(screen.getByRole("searchbox", { name: "Buscar pergunta" }))
        await user.type(screen.getByRole("searchbox", { name: "Buscar pergunta" }), "PERGUNTA 5")

        expect(
            within(select)
                .getAllByRole("option")
                .map((option) => option.textContent)
        ).toEqual(["Pergunta 5"])
        expect(select).toHaveValue("5")
    })

    it("sem perguntas ativas mostra o estado vazio e nenhuma pergunta inventada", async () => {
        const { fetchMock } = stubDocumentsFetch({
            status: 200,
            data: { ...initialDocuments, sampleQuestions: [] }
        })
        await renderDocumentsPage(fetchMock)

        expect(
            await screen.findByText("Nenhuma pergunta ativa cadastrada na tela Conteúdo")
        ).toBeInTheDocument()
        expect(screen.queryByLabelText("Pergunta de exemplo")).not.toBeInTheDocument()
        expect(screen.queryByText("Cobrança indevida no cartão de crédito")).not.toBeInTheDocument()
    })
})

import { afterEach, describe, expect, it, vi } from "vitest"
import { fireEvent, screen, waitFor, within } from "@testing-library/react"
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
    response: {
        status?: number
        data?: unknown
        error?: unknown
        put?: { status: number; body: unknown }
    } = {
        status: 200,
        data: initialDocuments
    }
) {
    let capturedPutBody: unknown = null
    let currentData = response.data
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
                new Response(JSON.stringify({ data: currentData }), {
                    status: 200,
                    headers: { "Content-Type": "application/json" }
                })
            )
        }

        if (url.endsWith("/api/v1/documents") && method === "PUT") {
            capturedPutBody = body
            if (response.put) {
                return new Response(JSON.stringify(response.put.body), {
                    status: response.put.status,
                    headers: { "Content-Type": "application/json" }
                })
            }
            const updatedData = {
                ...initialDocuments,
                ...(capturedPutBody as object),
                updatedAt: new Date().toISOString()
            }
            currentData = updatedData
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

async function failSaving(put: { status: number; body: unknown }) {
    const user = userEvent.setup()
    const { fetchMock } = stubDocumentsFetch({ status: 200, data: initialDocuments, put })
    await renderDocumentsPage(fetchMock)
    await user.click(await screen.findByRole("button", { name: "Remover CPF" }))
    await user.click(screen.getByRole("button", { name: "Salvar alterações" }))
    return screen.findByRole("alert")
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
            name: "Novo documento (Quando o próprio titular comparece)"
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
                name: "Novo documento (Quando o próprio titular comparece)"
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
            name: "Novo documento (Quando o próprio titular comparece)"
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

    it("400 ao salvar mostra o item e o motivo vindos do backend", async () => {
        const alert = await failSaving({
            status: 400,
            body: {
                error: {
                    code: "BAD_REQUEST",
                    message:
                        'Dados inválidos: representative.1: O documento "CPF" já está na lista.',
                    details: {
                        issues: [
                            {
                                path: "representative.1",
                                message: 'O documento "CPF" já está na lista.'
                            },
                            { path: "holder", message: "Limite de 10 documentos por grupo." }
                        ]
                    }
                }
            }
        })

        expect(alert).toHaveTextContent("Confira os documentos informados antes de salvar.")
        expect(alert).toHaveTextContent(
            'Representante, item 2: O documento "CPF" já está na lista.'
        )
        expect(alert).toHaveTextContent("Titular: Limite de 10 documentos por grupo.")
    })

    it("401 ao salvar pede para entrar de novo", async () => {
        const alert = await failSaving({
            status: 401,
            body: { error: { code: "UNAUTHORIZED", message: "Unauthorized" } }
        })

        expect(alert).toHaveTextContent("Sua sessão expirou. Entre novamente para salvar.")
    })

    it("403 ao salvar informa a falta de permissão", async () => {
        const alert = await failSaving({
            status: 403,
            body: { error: { code: "FORBIDDEN", message: "Forbidden" } }
        })

        expect(alert).toHaveTextContent("Você não tem permissão para alterar os documentos.")
    })

    it("falha inesperada ao salvar mostra a mensagem genérica e mantém o rascunho", async () => {
        const alert = await failSaving({
            status: 500,
            body: { error: { code: "INTERNAL_SERVER_ERROR", message: "Internal Server Error" } }
        })

        expect(alert).toHaveTextContent("Não foi possível salvar os documentos. Tente novamente.")
        expect(screen.getByText("1 alteração não salva")).toBeInTheDocument()
        expect(screen.queryByRole("button", { name: "CPF" })).not.toBeInTheDocument()
    })

    it("a prévia envia o corpo do rascunho e junta várias mudanças rápidas em uma requisição", async () => {
        const { fetchMock, previewBodies } = stubDocumentsFetch()
        await renderDocumentsPage(fetchMock)

        await waitFor(() => expect(previewBodies).toHaveLength(1), { timeout: 5000 })
        expect(previewBodies[0]).toEqual({
            byRepresentative: false,
            groupDocuments: initialDocuments.holder,
            questionId: 1
        })

        const input = screen.getByRole("textbox", {
            name: "Novo documento (Quando o próprio titular comparece)"
        })
        for (const text of ["Doc A", "Doc B", "Doc C"]) {
            fireEvent.change(input, { target: { value: text } })
            fireEvent.submit(input.closest("form")!)
        }

        await waitFor(() => expect(previewBodies).toHaveLength(2), { timeout: 5000 })
        expect(previewBodies[1]).toEqual({
            byRepresentative: false,
            groupDocuments: [...initialDocuments.holder, "Doc A", "Doc B", "Doc C"],
            questionId: 1
        })
    })

    it("edita um item do grupo do representante, salva e mostra o item gravado", async () => {
        const user = userEvent.setup()
        const { fetchMock, getCapturedPutBody } = stubDocumentsFetch()
        await renderDocumentsPage(fetchMock)

        const representativeList = await screen.findByRole("list", {
            name: "Quando um representante comparece em nome do titular"
        })
        await user.click(
            within(representativeList).getByRole("button", { name: "Procuração assinada" })
        )
        const input = screen.getByRole("textbox", { name: "Editar Procuração assinada" })
        await user.clear(input)
        await user.type(input, "Procuração com firma reconhecida{enter}")

        await user.click(screen.getByRole("button", { name: "Salvar alterações" }))

        await waitFor(() => expect(getCapturedPutBody()).not.toBeNull())
        expect(getCapturedPutBody()).toEqual({
            holder: initialDocuments.holder,
            representative: [
                "RG e CPF do titular (cópia)",
                "RG ou outro documento do representante",
                "Procuração com firma reconhecida",
                "Comprovante da reclamação"
            ]
        })
        expect(await screen.findByText("Documentos atualizados com sucesso.")).toBeInTheDocument()
        expect(
            await screen.findByRole("button", { name: "Procuração com firma reconhecida" })
        ).toBeInTheDocument()
        expect(
            screen.queryByText(/alteração não salva|alterações não salvas/)
        ).not.toBeInTheDocument()
    })

    it("a prévia do representante envia a lista do representante", async () => {
        const user = userEvent.setup()
        const { fetchMock, previewBodies } = stubDocumentsFetch()
        await renderDocumentsPage(fetchMock)

        await user.selectOptions(await screen.findByLabelText("Quem comparece"), "representative")

        await waitFor(
            () =>
                expect(previewBodies.at(-1)).toEqual({
                    byRepresentative: true,
                    groupDocuments: initialDocuments.representative,
                    questionId: 1
                }),
            { timeout: 5000 }
        )
    })

    it("não perde o texto digitado em um item quando outro item é reordenado", async () => {
        const user = userEvent.setup()
        const { fetchMock } = stubDocumentsFetch()
        await renderDocumentsPage(fetchMock)

        const holderList = await screen.findByRole("list", {
            name: "Quando o próprio titular comparece"
        })
        await user.click(within(holderList).getByRole("button", { name: "CPF" }))
        const input = screen.getByRole("textbox", { name: "Editar CPF" })
        await user.type(input, " do titular")

        await user.click(
            within(holderList).getByRole("button", {
                name: "Mover Comprovante de endereço para cima"
            })
        )

        expect(screen.getByRole("textbox", { name: "Editar CPF" })).toHaveValue("CPF do titular")
    })
})

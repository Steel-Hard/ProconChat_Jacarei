import type { ReactNode } from "react"
import { Provider } from "react-redux"
import { act, renderHook, waitFor } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import type ContentQuestionFormFields from "@/types/content/ContentQuestionFormFields.types"

const BASE = "http://api.test/api/v1/content"

function json(body: unknown, status = 200) {
    return new Response(JSON.stringify(body), {
        status,
        headers: { "Content-Type": "application/json" }
    })
}

function category(id: number, overrides: Record<string, unknown> = {}) {
    return {
        id,
        title: `Categoria ${id}`,
        shortTitle: `C${id}`,
        description: null,
        active: true,
        position: id,
        updatedBy: null,
        updatedAt: "2026-11-01T10:00:00.000Z",
        ...overrides
    }
}

function question(id: number, categoryId: number, overrides: Record<string, unknown> = {}) {
    return {
        id,
        categoryId,
        shortTitle: `P${id}`,
        shortDescription: null,
        question: `Pergunta ${id}`,
        answer: `Resposta ${id}`,
        legalBasis: null,
        requiredDocuments: [],
        requiresInPerson: false,
        inPersonNote: null,
        outOfScope: false,
        llmAllowed: true,
        active: true,
        position: id,
        updatedBy: null,
        updatedAt: "2026-11-01T10:00:00.000Z",
        ...overrides
    }
}

const fields: ContentQuestionFormFields = {
    shortTitle: "Nova",
    shortDescription: "",
    question: "Texto",
    answer: "Resposta",
    legalBasis: "",
    requiredDocuments: [],
    requiresInPerson: false,
    inPersonNote: "",
    outOfScope: false,
    llmAllowed: true,
    active: true
}

type Handler = (request: Request) => Response | null

async function setup(extra: Handler = () => null) {
    vi.stubEnv("VITE_API_URL", "http://api.test")
    vi.resetModules()
    const fetchMock = vi.fn(async (request: Request) => {
        const custom = extra(request)

        if (custom) {
            return custom
        }

        if (request.method === "GET" && request.url === `${BASE}/categories`) {
            return json({ data: [category(1), category(2)] })
        }

        if (request.method === "GET" && request.url === `${BASE}/categories/1/questions`) {
            return json({ data: [question(10, 1), question(11, 1)] })
        }

        if (request.method === "GET" && request.url === `${BASE}/categories/2/questions`) {
            return json({ data: [question(20, 2, { shortTitle: "Devolução" })] })
        }

        return json({ data: {} })
    })
    vi.stubGlobal("fetch", fetchMock)
    const { default: createStore } = await import("@/store/createStore")
    const { default: ToastProvider } = await import("@/components/ToastProvider")
    const { default: useContent } = await import("@/pages/hooks/useContent")
    const store = createStore()

    function Wrapper({ children }: { children: ReactNode }) {
        return (
            <Provider store={store}>
                <ToastProvider>{children}</ToastProvider>
            </Provider>
        )
    }

    const hook = renderHook(() => useContent(), { wrapper: Wrapper })

    await waitFor(() => expect(hook.result.current.status).toBe("success"))

    return { ...hook, fetchMock }
}

function calls(fetchMock: ReturnType<typeof vi.fn>): string[] {
    return fetchMock.mock.calls.map(
        ([request]) => `${(request as Request).method} ${(request as Request).url}`
    )
}

afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
    vi.resetModules()
})

describe("useContent", () => {
    it("carrega com uma chamada de categorias e uma de perguntas por categoria", async () => {
        const { fetchMock, result } = await setup()

        expect(calls(fetchMock)).toEqual([
            `GET ${BASE}/categories`,
            `GET ${BASE}/categories/1/questions`,
            `GET ${BASE}/categories/2/questions`
        ])
        expect(result.current.categoryRows.map((row) => row.shortTitle)).toEqual(["C1", "C2"])
        expect(result.current.questionRows.map((row) => row.shortTitle)).toEqual(["P10", "P11"])
        expect(result.current.changes).toEqual([])
    })

    it("trocar de categoria mantém as alterações pendentes da anterior", async () => {
        const { result } = await setup()

        act(() => result.current.toggleQuestion("1", "10"))
        act(() => result.current.selectCategory("2"))

        expect(result.current.questionRows.map((row) => row.shortTitle)).toEqual(["Devolução"])
        expect(result.current.changes).toEqual(["Pergunta desativada: P10"])

        act(() => result.current.selectCategory("1"))

        expect(result.current.questionRows[0].active).toBe(false)
    })

    it("a busca procura em todas as categorias, sem acento, mostrando a categoria", async () => {
        const { result } = await setup()

        act(() => result.current.setSearchTerm("devolucao"))

        expect(result.current.searching).toBe(true)
        expect(result.current.questionRows).toHaveLength(1)
        expect(result.current.questionRows[0]).toMatchObject({
            shortTitle: "Devolução",
            categoryTitle: "C2"
        })
    })

    it("criar categoria e pergunta fica só no rascunho e entra no contador", async () => {
        const { result, fetchMock } = await setup()
        const before = fetchMock.mock.calls.length

        act(() => result.current.openNewCategory())
        act(() =>
            result.current.confirmCategory({ title: "Nova", shortTitle: "N", description: "" })
        )
        act(() => result.current.openNewQuestion())
        act(() => result.current.confirmQuestion(fields))

        expect(fetchMock.mock.calls.length).toBe(before)
        expect(result.current.changes).toEqual(["Categoria nova: N", "Pergunta nova: Nova"])
        expect(result.current.categoryRows.map((row) => row.shortTitle)).toEqual(["C1", "C2", "N"])
    })

    it("Descartar desfaz todas as pendências", async () => {
        const { result } = await setup()

        act(() => result.current.toggleCategory("1"))
        expect(result.current.changes).toHaveLength(1)

        act(() => result.current.discard())

        expect(result.current.changes).toEqual([])
        expect(result.current.categoryRows[0].state).toBe("active")
    })

    it("Salvar com item inválido não chama o servidor e aponta o item", async () => {
        const { result, fetchMock } = await setup()

        act(() => result.current.openNewQuestion())
        act(() => result.current.confirmQuestion({ ...fields, shortTitle: "a".repeat(25) }))
        const before = fetchMock.mock.calls.length

        await act(async () => {
            await result.current.save()
        })

        expect(fetchMock.mock.calls.length).toBe(before)
        expect(result.current.actionError?.message).toBe(
            "Corrija os campos destacados antes de salvar."
        )
        expect(result.current.questionRows.some((row) => row.invalid)).toBe(true)
    })

    it("a prévia não é pedida com formulário inválido nem em categoria não salva", async () => {
        const { result, fetchMock } = await setup()

        act(() => result.current.openNewQuestion())
        act(() => result.current.openPreview())
        act(() => result.current.changeFormFields({ ...fields, shortTitle: "" }))

        await waitFor(() => expect(result.current.preview?.status).toBe("invalid"))
        await new Promise((resolve) => setTimeout(resolve, 600))
        expect(calls(fetchMock).some((call) => call.includes("/preview"))).toBe(false)

        act(() => result.current.closeDialog())
        act(() => result.current.openNewCategory())
        act(() =>
            result.current.confirmCategory({ title: "Nova", shortTitle: "N", description: "" })
        )
        act(() => result.current.openNewQuestion())
        act(() => result.current.openPreview())
        act(() => result.current.changeFormFields(fields))

        await waitFor(() => expect(result.current.preview?.status).toBe("unsaved"))
        await new Promise((resolve) => setTimeout(resolve, 600))
        expect(calls(fetchMock).some((call) => call.includes("/preview"))).toBe(false)
        expect(result.current.changes).toEqual(["Categoria nova: N"])
    })

    it("pede a prévia com a lista do rascunho quando o formulário é válido", async () => {
        const { result, fetchMock } = await setup((request) =>
            request.url === `${BASE}/questions/preview`
                ? json({
                      data: {
                          botMessages: {
                              categoryList: {
                                  message: {
                                      type: "list",
                                      text: "Escolha",
                                      buttonText: "Ver",
                                      rows: [{ id: "q_10", title: "P10" }]
                                  },
                                  currentRowIndex: 0,
                                  page: 1,
                                  totalPages: 1
                              },
                              officialMessages: [{ type: "text", text: "Oficial" }],
                              aiMessage: null
                          }
                      }
                  })
                : null
        )

        act(() => result.current.openEditQuestion("1", "10"))
        act(() => result.current.openPreview())
        act(() =>
            result.current.changeFormFields({
                ...result.current.questionFormInitial,
                answer: "Nova"
            })
        )

        await waitFor(() => expect(result.current.preview?.status).toBe("ready"), {
            timeout: 3000
        })

        const previewCall = fetchMock.mock.calls
            .map(([request]) => request as Request)
            .find((request) => request.url === `${BASE}/questions/preview`)
        const body = await previewCall!.clone().json()

        expect(body.listRows.filter((row: { isCurrent: boolean }) => row.isCurrent)).toHaveLength(1)
        expect(body.categoryId).toBe(1)
        expect(body.questionId).toBe(10)
        expect(result.current.changes).toEqual([])
    })

    it("falha parcial mostra a mensagem com quantas foram salvas e quantas faltam", async () => {
        let failActive = true
        const { result } = await setup((request) => {
            if (request.method === "PATCH" && failActive) {
                return json({ error: { message: "x" } }, 500)
            }

            if (request.method === "PUT") {
                return json({ data: category(1) })
            }

            return null
        })

        act(() => result.current.openEditCategory("1"))
        act(() =>
            result.current.confirmCategory({ title: "Mudou", shortTitle: "C1", description: "" })
        )
        act(() => result.current.toggleCategory("2"))
        expect(result.current.changes).toHaveLength(2)

        await act(async () => {
            await result.current.save()
        })

        expect(result.current.actionError?.message).toBe(
            "Algumas alterações foram salvas e outras não. Revise o que ainda está pendente e salve de novo."
        )
        expect(result.current.actionError?.details.join(" ")).toContain("pendentes")
        failActive = false
    })

    it("falha na primeira gravação mostra que nada foi gravado e mantém as pendências", async () => {
        const { result } = await setup((request) =>
            request.method === "PATCH" ? json({ error: { message: "x" } }, 500) : null
        )

        act(() => result.current.toggleCategory("2"))

        await act(async () => {
            await result.current.save()
        })

        expect(result.current.actionError?.message).toBe(
            "Não foi possível salvar. Nenhuma alteração foi gravada. Tente de novo."
        )
        expect(result.current.changes).toHaveLength(1)
    })
})

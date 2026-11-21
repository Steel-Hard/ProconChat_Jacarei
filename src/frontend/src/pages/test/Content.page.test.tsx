import { screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vitest"
import { stubCategory, stubQuestion } from "@/testUtils/contentServerStub"
import renderContentPage from "@/testUtils/renderContentPage"

vi.setConfig({ testTimeout: 30000 })

const FIXED_NOTICE =
    "Esta é uma orientação automatizada de caráter informativo. Ela não é vinculante e não substitui o atendimento jurídico ou administrativo formal do PROCON Jacareí."

const baseOptions = () => ({
    categories: [stubCategory(1), stubCategory(2)],
    questions: [
        stubQuestion(10, 1),
        stubQuestion(11, 1),
        stubQuestion(20, 2, { shortTitle: "Devolução" })
    ]
})

afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
    vi.resetModules()
})

async function loaded(options = baseOptions()) {
    const page = await renderContentPage(options)
    await screen.findByText("Categorias")
    await screen.findByText("P10")

    return page
}

async function createCategory(user: ReturnType<typeof userEvent.setup>) {
    await user.click(screen.getAllByRole("button", { name: "Nova categoria" })[0])
    await user.type(screen.getByLabelText(/Título curto/), "Nova")
    await user.type(screen.getByLabelText(/Nome da categoria/), "Categoria nova")
    await user.click(screen.getByRole("button", { name: "Confirmar" }))
}

async function createQuestion(user: ReturnType<typeof userEvent.setup>) {
    await user.click(screen.getAllByRole("button", { name: "Nova pergunta" })[0])
    await user.type(screen.getByLabelText(/Título curto/), "Pergunta nova")
    await user.type(screen.getByLabelText(/Texto da pergunta/), "Posso trocar?")
    await user.type(screen.getByLabelText(/Resposta oficial/), "Pode.")
    await user.click(screen.getByRole("button", { name: "Confirmar" }))
}

describe("ContentPage", () => {
    it("mostra o título, o aviso fixo sem ação de edição e as listas", async () => {
        await loaded()

        expect(
            screen.getByRole("heading", { name: "Conteúdo do chatbot", level: 1 })
        ).toBeInTheDocument()
        expect(screen.getByText(FIXED_NOTICE)).toBeInTheDocument()
        expect(screen.getByText("C1")).toBeInTheDocument()
        expect(screen.getByText("P11")).toBeInTheDocument()
        expect(screen.queryByRole("button", { name: "Salvar alterações" })).toBeDisabled()
    })

    it("mostra Ainda não alterado pelo painel quando ninguém tem autor", async () => {
        await loaded()

        expect(screen.getByText("Ainda não alterado pelo painel")).toBeInTheDocument()
    })

    it("mostra a última alteração do item mais recente", async () => {
        await loaded({
            categories: [
                stubCategory(1, {
                    updatedBy: { id: 1, name: "Ana" },
                    updatedAt: "2026-11-05T15:00:00.000Z"
                })
            ],
            questions: [stubQuestion(10, 1)]
        })

        expect(
            screen.getAllByText("Última alteração por Ana em 05/11/2026").length
        ).toBeGreaterThan(0)
    })

    it("criar categoria, criar pergunta nela e salvar grava as duas na ordem", async () => {
        const user = userEvent.setup()
        const { server } = await loaded()

        await createCategory(user)
        await createQuestion(user)

        expect(screen.getByText("2 alterações não salvas")).toBeInTheDocument()
        expect(server.log.filter((entry) => entry.startsWith("POST"))).toEqual([])

        await user.click(screen.getByRole("button", { name: "Salvar alterações" }))

        await waitFor(() =>
            expect(screen.getByText("Conteúdo atualizado com sucesso.")).toBeInTheDocument()
        )
        const writes = server.log.filter((entry) => !entry.startsWith("GET"))
        expect(writes).toEqual(["POST /categories", "POST /questions"])
        expect(server.bodies[1].body).toMatchObject({
            categoryId: 100,
            shortTitle: "Pergunta nova"
        })
        expect(screen.queryByText(/não salva/)).not.toBeInTheDocument()
    })

    it("Descartar desfaz as alterações", async () => {
        const user = userEvent.setup()
        await loaded()

        await createCategory(user)
        expect(screen.getByText("1 alteração não salva")).toBeInTheDocument()

        await user.click(screen.getByRole("button", { name: "Descartar" }))

        expect(screen.queryByText("Categoria nova")).not.toBeInTheDocument()
        expect(screen.queryByText(/alteração não salva/)).not.toBeInTheDocument()
    })

    it("reordena e salva a ordem gravada", async () => {
        const user = userEvent.setup()
        const { server } = await loaded()

        await user.click(screen.getAllByRole("button", { name: "Mover para baixo" })[0])
        await user.click(screen.getByRole("button", { name: "Salvar alterações" }))

        await waitFor(() =>
            expect(screen.getByText("Conteúdo atualizado com sucesso.")).toBeInTheDocument()
        )
        expect(server.bodies.find((entry) => entry.url === "/categories/reorder")?.body).toEqual({
            categoryIds: [2, 1]
        })
    })

    it("falha na primeira gravação mostra que nada foi gravado e mantém a pendência", async () => {
        const user = userEvent.setup()
        const { server } = await loaded()
        server.failNext("PATCH", /active$/)

        await user.click(screen.getAllByRole("button", { name: "Desativar" })[0])
        await user.click(screen.getByRole("button", { name: "Salvar alterações" }))

        expect(
            await screen.findByText(
                "Não foi possível salvar. Nenhuma alteração foi gravada. Tente de novo."
            )
        ).toBeInTheDocument()
        expect(screen.getByText("1 alteração não salva")).toBeInTheDocument()
    })

    it("falha parcial mostra a mensagem com as quantidades e um novo Salvar não duplica", async () => {
        const user = userEvent.setup()
        const { server } = await loaded()
        server.failNext("PATCH", /\/categories\/2\/active$/)

        await createCategory(user)
        await user.click(screen.getAllByRole("button", { name: "Desativar" })[1])
        await user.click(screen.getByRole("button", { name: "Salvar alterações" }))

        expect(
            await screen.findByText(
                "Algumas alterações foram salvas e outras não. Revise o que ainda está pendente e salve de novo."
            )
        ).toBeInTheDocument()
        expect(screen.getByText("1 salvas e 1 pendentes.")).toBeInTheDocument()
        expect(screen.getByText("1 alteração não salva")).toBeInTheDocument()

        await user.click(screen.getByRole("button", { name: "Salvar alterações" }))

        await waitFor(() =>
            expect(screen.getByText("Conteúdo atualizado com sucesso.")).toBeInTheDocument()
        )
        expect(server.log.filter((entry) => entry === "POST /categories")).toHaveLength(1)
    })

    it("a busca procura em todas as categorias e esconde as setas", async () => {
        const user = userEvent.setup()
        await loaded()

        await user.type(
            screen.getByRole("searchbox", { name: "Buscar nas perguntas" }),
            "devolucao"
        )

        expect(await screen.findByText("Devolução")).toBeInTheDocument()
        expect(screen.getByText("Categoria: C2")).toBeInTheDocument()
        expect(screen.queryByText("P10")).not.toBeInTheDocument()
        const list = screen.getAllByRole("list").at(-1) as HTMLElement
        expect(
            within(list).queryByRole("button", { name: "Mover para cima" })
        ).not.toBeInTheDocument()
    })

    it("mostra a prévia com o aviso exato vindo da API", async () => {
        const user = userEvent.setup()
        await loaded({
            ...baseOptions(),
            preview: {
                botMessages: {
                    categoryList: {
                        message: {
                            type: "list",
                            text: "Escolha uma das perguntas abaixo:",
                            buttonText: "Ver perguntas",
                            rows: [{ id: "q_10", title: "P10" }]
                        },
                        currentRowIndex: 0,
                        page: 1,
                        totalPages: 1
                    },
                    officialMessages: [
                        { type: "text", text: `Resposta oficial\n\n${FIXED_NOTICE}` }
                    ],
                    aiMessage: null
                }
            }
        } as ReturnType<typeof baseOptions>)

        await user.click(screen.getAllByRole("button", { name: "Editar" })[0])
        await user.click(screen.getByRole("button", { name: "Ver como o cidadão recebe" }))

        expect(
            await screen.findByText("Escolha uma das perguntas abaixo:", undefined, {
                timeout: 5000
            })
        ).toBeInTheDocument()
        expect(screen.getAllByText(FIXED_NOTICE)).toHaveLength(2)
    })

    it("mostra mensagem de erro quando a carga falha, sem listas nem barra de salvar", async () => {
        await renderContentPage(baseOptions(), (server) =>
            server.failNext("GET", /categories$/, 500, 10)
        )

        expect(await screen.findByRole("alert")).toHaveTextContent(
            "Não foi possível carregar o conteúdo do chatbot."
        )
        expect(screen.queryByRole("button", { name: "Salvar alterações" })).not.toBeInTheDocument()
        expect(screen.queryByText("Categorias")).not.toBeInTheDocument()
    })

    it("mostra a indicação de carregamento enquanto carrega", async () => {
        await renderContentPage(baseOptions())

        expect(screen.getByText("Carregando o conteúdo do chatbot...")).toBeInTheDocument()
        expect(await screen.findByText("Categorias")).toBeInTheDocument()
    })
})

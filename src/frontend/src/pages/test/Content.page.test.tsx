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

        await user.click(screen.getAllByRole("button", { name: /^Mover .+ para baixo$/ })[0])
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

        await user.click(screen.getByRole("button", { name: "Desativar categoria" }))
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
        await user.click(screen.getByRole("button", { name: "Ver as perguntas de C2" }))
        await user.click(screen.getByRole("button", { name: "Desativar categoria" }))
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

    it("falha parcial com a recarga também falhando não duplica a categoria criada no próximo Salvar", async () => {
        const user = userEvent.setup()
        const { server } = await loaded()
        server.failNext("PATCH", /\/categories\/2\/active$/)
        server.failNext("GET", /^\/categories$/)

        await createCategory(user)
        await user.click(screen.getByRole("button", { name: "Ver as perguntas de C2" }))
        await user.click(screen.getByRole("button", { name: "Desativar categoria" }))
        await user.click(screen.getByRole("button", { name: "Salvar alterações" }))

        expect(
            await screen.findByText(
                "Algumas alterações foram salvas e outras não. Revise o que ainda está pendente e salve de novo."
            )
        ).toBeInTheDocument()
        expect(screen.getByText("Categoria nova")).toBeInTheDocument()

        await user.click(screen.getByRole("button", { name: "Salvar alterações" }))

        await waitFor(() =>
            expect(screen.getByText("Conteúdo atualizado com sucesso.")).toBeInTheDocument()
        )
        expect(server.log.filter((entry) => entry === "POST /categories")).toHaveLength(1)
        expect(screen.getByText("Categoria nova")).toBeInTheDocument()
    })

    it("salvar com sucesso e a recarga falhando mantém os itens criados na tela e não duplica", async () => {
        const user = userEvent.setup()
        const { server } = await loaded()
        server.failNext("GET", /^\/categories$/)

        await createCategory(user)
        await user.click(screen.getByRole("button", { name: "Salvar alterações" }))

        await waitFor(() => expect(server.log).toContain("POST /categories"))
        expect(await screen.findByText("Categoria nova")).toBeInTheDocument()

        await user.click(screen.getByRole("button", { name: "Salvar alterações" }))

        await waitFor(() =>
            expect(screen.getByText("Conteúdo atualizado com sucesso.")).toBeInTheDocument()
        )
        expect(server.log.filter((entry) => entry === "POST /categories")).toHaveLength(1)
        expect(screen.getByText("Categoria nova")).toBeInTheDocument()
    })

    it("com a recarga ainda falhando, o Salvar não grava nada e avisa", async () => {
        const user = userEvent.setup()
        const { server } = await loaded()
        server.failNext("GET", /^\/categories$/, 500, 2)

        await createCategory(user)
        await user.click(screen.getByRole("button", { name: "Salvar alterações" }))
        await waitFor(() => expect(server.log).toContain("POST /categories"))
        const writesBefore = server.log.filter((entry) => !entry.startsWith("GET")).length

        await user.click(screen.getByRole("button", { name: "Salvar alterações" }))

        expect(await screen.findByText(/não foi possível atualizar a tela/i)).toBeInTheDocument()
        expect(server.log.filter((entry) => !entry.startsWith("GET"))).toHaveLength(writesBefore)
    })

    it("falha ao criar categoria com nome repetido marca a linha da categoria", async () => {
        const user = userEvent.setup()
        const { server } = await loaded()
        server.failNext("POST", /^\/categories$/, 409)

        await createCategory(user)
        await user.click(screen.getByRole("button", { name: "Salvar alterações" }))

        const alerts = await screen.findAllByRole("alert")
        const row = screen.getByText("Categoria nova").closest("li") as HTMLElement

        expect(alerts.length).toBeGreaterThan(0)
        expect(within(row).getByRole("alert")).toBeInTheDocument()
    })

    it("carga recusada com 403 mostra a mensagem de falta de permissão", async () => {
        await renderContentPage(baseOptions(), (server) =>
            server.failNext("GET", /^\/categories$/, 403)
        )

        expect(
            await screen.findByText("Você não tem permissão para ver o conteúdo do chatbot.")
        ).toBeInTheDocument()
        expect(
            screen.queryByText("Não foi possível carregar o conteúdo do chatbot.")
        ).not.toBeInTheDocument()
    })

    it("explica por que Nova pergunta está desabilitada durante a busca", async () => {
        const user = userEvent.setup()
        await loaded()

        await user.type(screen.getByRole("searchbox", { name: "Buscar nas perguntas" }), "dev")

        const button = screen.getAllByRole("button", { name: "Nova pergunta" })[0]

        expect(button).toBeDisabled()
        expect(button).toHaveAccessibleDescription("Limpe a busca para criar uma pergunta.")
    })

    it("sem hint quando Nova pergunta está habilitada", async () => {
        await loaded()

        expect(screen.getAllByRole("button", { name: "Nova pergunta" })[0]).toBeEnabled()
        expect(screen.queryByText("Limpe a busca para criar uma pergunta.")).not.toBeInTheDocument()
    })

    it("reordenação recusada recarrega, mostra o erro e mantém pendente o que não foi gravado", async () => {
        const user = userEvent.setup()
        const { server } = await loaded()
        server.failNext("PUT", /^\/categories\/reorder$/, 400)

        await user.click(screen.getByRole("button", { name: "Ver as perguntas de C2" }))
        await user.click(screen.getByRole("button", { name: "Desativar categoria" }))
        await user.click(screen.getAllByRole("button", { name: /^Mover .+ para baixo$/ })[0])
        expect(screen.getByText("2 alterações não salvas")).toBeInTheDocument()
        const readsBefore = server.log.filter((entry) => entry === "GET /categories").length

        await user.click(screen.getByRole("button", { name: "Salvar alterações" }))

        expect(
            await screen.findByText(
                "Algumas alterações foram salvas e outras não. Revise o que ainda está pendente e salve de novo."
            )
        ).toBeInTheDocument()
        expect(
            screen.getByText(
                "A ordem mudou no servidor enquanto você editava. A tela foi recarregada."
            )
        ).toBeInTheDocument()
        expect(server.log.filter((entry) => entry === "GET /categories")).toHaveLength(
            readsBefore + 1
        )
        expect(screen.getByText("1 alteração não salva")).toBeInTheDocument()
        expect(screen.getByText("1 salvas e 1 pendentes.")).toBeInTheDocument()
    })

    it("o Salvar fica desabilitado durante a recarga que antecede a gravação e um segundo clique não grava nada", async () => {
        const user = userEvent.setup()
        const { server } = await loaded()
        server.failNext("GET", /^\/categories$/)

        await createCategory(user)
        await user.click(screen.getByRole("button", { name: "Salvar alterações" }))
        await waitFor(() => expect(server.log).toContain("POST /categories"))
        await screen.findByText("Categoria nova")
        const release = server.holdNext("GET", /^\/categories$/)
        const writesBefore = server.log.filter((entry) => !entry.startsWith("GET")).length

        await user.click(screen.getByRole("button", { name: "Salvar alterações" }))

        await waitFor(() =>
            expect(screen.getByRole("button", { name: "Salvar alterações" })).toBeDisabled()
        )
        await user.click(screen.getByRole("button", { name: "Salvar alterações" }))
        expect(server.log.filter((entry) => !entry.startsWith("GET"))).toHaveLength(writesBefore)

        release()

        await waitFor(() =>
            expect(screen.getByText("Conteúdo atualizado com sucesso.")).toBeInTheDocument()
        )
        expect(server.log.filter((entry) => entry === "POST /categories")).toHaveLength(1)
    })

    it("pergunta nova com Pergunta ativa no chatbot desmarcada é gravada inativa", async () => {
        const user = userEvent.setup()
        const { server } = await loaded()

        await user.click(screen.getAllByRole("button", { name: "Nova pergunta" })[0])
        await user.type(screen.getByLabelText(/Título curto/), "Inativa")
        await user.type(screen.getByLabelText(/Texto da pergunta/), "Posso?")
        await user.type(screen.getByLabelText(/Resposta oficial/), "Pode.")
        await user.click(screen.getByRole("checkbox", { name: /Pergunta ativa no chatbot/ }))
        await user.click(screen.getByRole("button", { name: "Confirmar" }))
        await user.click(screen.getByRole("button", { name: "Salvar alterações" }))

        await waitFor(() =>
            expect(screen.getByText("Conteúdo atualizado com sucesso.")).toBeInTheDocument()
        )
        expect(server.bodies.find((entry) => entry.url === "/questions")?.body).toMatchObject({
            shortTitle: "Inativa",
            active: false
        })
    })

    it("selos: item existente alterado ou reordenado mostra Alteração não salva e some ao desfazer", async () => {
        const user = userEvent.setup()
        await loaded()

        await user.click(screen.getAllByRole("button", { name: /^Mover .+ para baixo$/ })[0])
        expect(screen.getAllByText("Alteração não salva")).toHaveLength(2)
        expect(screen.queryByText("Não salva")).not.toBeInTheDocument()

        await user.click(screen.getAllByRole("button", { name: /^Mover .+ para cima$/ })[1])
        expect(screen.queryByText("Alteração não salva")).not.toBeInTheDocument()

        await createCategory(user)
        expect(screen.getByText("Não salva")).toBeInTheDocument()
        expect(screen.queryByText("Alteração não salva")).not.toBeInTheDocument()
    })

    it("Adicionar com o campo de documento vazio mostra o aviso no formulário de pergunta", async () => {
        const user = userEvent.setup()
        await loaded()

        await user.click(screen.getAllByRole("button", { name: "Nova pergunta" })[0])
        await user.click(screen.getByRole("button", { name: "Adicionar" }))

        expect(await screen.findByText("Informe o documento.")).toBeInTheDocument()
    })

    it("depois de um Salvar sem falha nenhuma linha fica com selo", async () => {
        const user = userEvent.setup()
        await loaded()

        await createCategory(user)
        await user.click(screen.getByRole("button", { name: "Ver as perguntas de C1" }))
        await user.click(screen.getByRole("button", { name: "Desativar categoria" }))
        expect(screen.getByText("Não salva")).toBeInTheDocument()
        expect(screen.getByText("Alteração não salva")).toBeInTheDocument()

        await user.click(screen.getByRole("button", { name: "Salvar alterações" }))

        await waitFor(() =>
            expect(screen.getByText("Conteúdo atualizado com sucesso.")).toBeInTheDocument()
        )
        expect(screen.queryByText("Não salva")).not.toBeInTheDocument()
        expect(screen.queryByText("Alteração não salva")).not.toBeInTheDocument()
    })

    it("depois de uma falha parcial só o item que continuou pendente mantém o selo", async () => {
        const user = userEvent.setup()
        const { server } = await loaded()
        server.failNext("PATCH", /\/categories\/2\/active$/)

        await createCategory(user)
        await user.click(screen.getByRole("button", { name: "Ver as perguntas de C2" }))
        await user.click(screen.getByRole("button", { name: "Desativar categoria" }))
        await user.click(screen.getByRole("button", { name: "Salvar alterações" }))

        await screen.findByText("1 salvas e 1 pendentes.")
        expect(screen.queryByText("Não salva")).not.toBeInTheDocument()
        expect(screen.getAllByText("Alteração não salva")).toHaveLength(1)
    })

    it("a prévia abre em janela própria por cima do formulário e Esc fecha só ela", async () => {
        const user = userEvent.setup()
        await loaded()

        await user.click(screen.getAllByRole("button", { name: /^Editar (?!categoria)/ })[0])
        await user.type(screen.getByLabelText(/Título curto/), " x")
        const previewButton = screen.getByRole("button", { name: "Ver como o cidadão recebe" })
        await user.click(previewButton)

        expect(
            await screen.findByRole("dialog", { name: "Como o cidadão recebe" })
        ).toBeInTheDocument()

        await user.keyboard("{Escape}")

        expect(
            screen.queryByRole("dialog", { name: "Como o cidadão recebe" })
        ).not.toBeInTheDocument()
        expect(screen.queryByText("Descartar as alterações?")).not.toBeInTheDocument()
        expect(screen.getByLabelText(/Título curto/)).toBeInTheDocument()
        expect(previewButton).toHaveFocus()
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
            within(list).queryByRole("button", { name: /^Mover .+ para cima$/ })
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
                    aiMessage: null,
                    aiLengthWarning: { exceedsLimit: false, length: 0, limit: 1024, message: null }
                }
            }
        } as ReturnType<typeof baseOptions>)

        await user.click(screen.getAllByRole("button", { name: /^Editar (?!categoria)/ })[0])
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

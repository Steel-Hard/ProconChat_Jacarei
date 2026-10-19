import { screen, waitFor } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import buildAppointmentList from "@/testUtils/buildAppointmentList"
import buildAppointmentListItem from "@/testUtils/buildAppointmentListItem"
import renderAppointmentsPage from "@/testUtils/renderAppointmentsPage"

vi.setConfig({ testTimeout: 20000 })

type Reply = { status: number; body?: unknown }

const FILTERS_TEXT =
    "Nenhum resultado para os filtros de status, período e responsável selecionados."

function emptyList() {
    return { status: 200, body: { data: buildAppointmentList([]) } }
}

function renderWith(reply: () => Reply | Promise<Reply>, initialEntry?: string) {
    return renderAppointmentsPage({
        initialEntry,
        handlers: { "GET /api/v1/appointments": reply }
    })
}

afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
    vi.resetModules()
})

describe("Appointments.page: estados", () => {
    it("mostra Carregando enquanto a primeira resposta não chega", async () => {
        await renderWith(() => new Promise<Reply>(() => {}))

        expect(await screen.findByText("Carregando...")).toBeInTheDocument()
        expect(screen.queryByRole("table")).not.toBeInTheDocument()
    })

    it("mostra o erro e tenta de novo", async () => {
        let attempts = 0
        const page = await renderWith(() => {
            attempts += 1

            return attempts === 1
                ? { status: 500, body: { error: { code: "INTERNAL_ERROR", message: "x" } } }
                : {
                      status: 200,
                      body: { data: buildAppointmentList([buildAppointmentListItem()]) }
                  }
        })

        expect(await screen.findByRole("alert")).toHaveTextContent(
            "Não foi possível carregar os agendamentos."
        )

        await page.user.click(screen.getByRole("button", { name: "Tentar novamente" }))

        expect(await screen.findByText("Maria Aparecida Santos")).toBeInTheDocument()
        expect(screen.queryByRole("alert")).not.toBeInTheDocument()
    })

    it("mostra o vazio da busca com o termo", async () => {
        const page = await renderWith(emptyList)
        await screen.findByText(FILTERS_TEXT)

        await page.user.type(screen.getByRole("searchbox", { name: "Buscar" }), "Zuleica")

        expect(
            await screen.findByText(
                "Nada corresponde a “Zuleica”. Confira a grafia do nome, o protocolo ou os 11 dígitos do CPF."
            )
        ).toBeInTheDocument()
        expect(screen.getByText("Nenhum agendamento encontrado")).toBeInTheDocument()
        expect(screen.queryByRole("button", { name: "Limpar filtros" })).not.toBeInTheDocument()
    })

    it("mostra Nenhum agendamento pendente com o chip Pendentes e limpa os filtros", async () => {
        const page = await renderWith(emptyList, "/agendamentos?status=PENDING&page=2&sortBy=name")

        expect(await screen.findByText("Nenhum agendamento pendente")).toBeInTheDocument()
        expect(screen.getByText(FILTERS_TEXT)).toBeInTheDocument()

        await page.user.click(screen.getByRole("button", { name: "Limpar filtros" }))

        await waitFor(() =>
            expect(page.lastListRequest()).toBe(
                "status=all&period=all&responsible=all&page=1&limit=20"
            )
        )
        expect(page.router.state.location.search).toBe("?period=all")
        expect(
            await screen.findByText("O chatbot ainda não criou agendamentos.")
        ).toBeInTheDocument()
    })

    it("mostra Nenhum agendamento encontrado com outros filtros", async () => {
        await renderWith(emptyList, "/agendamentos?responsible=me")

        expect(await screen.findByText(FILTERS_TEXT)).toBeInTheDocument()
        expect(screen.getByText("Nenhum agendamento encontrado")).toBeInTheDocument()
        expect(screen.getByRole("button", { name: "Limpar filtros" })).toBeInTheDocument()
    })

    it("o filtro padrão Próximos sem resultado também oferece Limpar filtros", async () => {
        await renderWith(emptyList)

        expect(await screen.findByText(FILTERS_TEXT)).toBeInTheDocument()
        expect(screen.getByRole("button", { name: "Limpar filtros" })).toBeInTheDocument()
    })

    it("sem nenhum agendamento avisa que o chatbot ainda não criou nenhum", async () => {
        await renderWith(emptyList, "/agendamentos?period=all")

        expect(
            await screen.findByText("O chatbot ainda não criou agendamentos.")
        ).toBeInTheDocument()
        expect(screen.getByText("Nenhum agendamento encontrado")).toBeInTheDocument()
        expect(screen.queryByRole("button", { name: "Limpar filtros" })).not.toBeInTheDocument()
    })

    it("mantém a tabela na tela enquanto a próxima página carrega", async () => {
        let requests = 0
        const page = await renderWith(() => {
            requests += 1

            if (requests > 1) {
                return new Promise<Reply>(() => {})
            }

            return {
                status: 200,
                body: {
                    data: buildAppointmentList([buildAppointmentListItem()], {
                        total: 30,
                        totalPages: 2
                    })
                }
            }
        })
        await screen.findByText("Maria Aparecida Santos")

        await page.user.click(screen.getByRole("button", { name: "Próxima ›" }))

        await waitFor(() => expect(page.lastListRequest()).toContain("page=2"))
        expect(screen.getByText("Maria Aparecida Santos")).toBeInTheDocument()
        expect(screen.queryByText("Carregando...")).not.toBeInTheDocument()
    })
    it("não mostra o vazio dos filtros enquanto a busca nova não responde", async () => {
        const searchReply = Promise.withResolvers<Reply>()
        const page = await renderAppointmentsPage({
            initialEntry: "/agendamentos?responsible=me",
            handlers: {
                "GET /api/v1/appointments": ({ url }) =>
                    url.searchParams.has("search") ? searchReply.promise : emptyList()
            }
        })
        expect(await screen.findByText(FILTERS_TEXT)).toBeInTheDocument()

        await page.user.type(screen.getByRole("searchbox", { name: "Buscar" }), "Maria")

        await waitFor(() => expect(page.listRequests().at(-1)?.get("search")).toBe("Maria"))
        expect(screen.queryByText(FILTERS_TEXT)).not.toBeInTheDocument()
        expect(screen.queryByText("Nenhum agendamento encontrado")).not.toBeInTheDocument()
        expect(screen.getAllByText("Carregando...").length).toBeGreaterThan(0)

        searchReply.resolve({
            status: 200,
            body: { data: buildAppointmentList([buildAppointmentListItem()]) }
        })

        expect(await screen.findByText("Maria Aparecida Santos")).toBeInTheDocument()
    })

    it("não diz que o chatbot não criou agendamentos enquanto a lista volta depois do Esc", async () => {
        const listReply = Promise.withResolvers<Reply>()
        const page = await renderAppointmentsPage({
            initialEntry: "/agendamentos?period=all",
            handlers: {
                "GET /api/v1/appointments": ({ url }) =>
                    url.searchParams.has("search") ? emptyList() : listReply.promise
            }
        })
        const box = screen.getByRole("searchbox", { name: "Buscar" })
        await page.user.type(box, "Zuleica")
        expect(await screen.findByText(/Nada corresponde a “Zuleica”/)).toBeInTheDocument()

        await page.user.type(box, "{Escape}")

        expect(screen.queryByText(/Nada corresponde/)).not.toBeInTheDocument()
        expect(
            screen.queryByText("O chatbot ainda não criou agendamentos.")
        ).not.toBeInTheDocument()
        expect(screen.queryByText("Nenhum agendamento encontrado")).not.toBeInTheDocument()

        listReply.resolve({
            status: 200,
            body: { data: buildAppointmentList([buildAppointmentListItem()]) }
        })

        expect(await screen.findByText("Maria Aparecida Santos")).toBeInTheDocument()
    })
})

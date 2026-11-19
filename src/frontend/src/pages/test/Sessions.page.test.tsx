import { screen, waitFor, within } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import buildSessionList, { buildSessionItem } from "@/testUtils/buildSessionList"
import renderSessionsPage from "@/testUtils/renderSessionsPage"

vi.setConfig({ testTimeout: 30000 })

afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
    vi.resetModules()
})

const ITEMS = [
    buildSessionItem({
        id: "1",
        code: "S-A1B2C3D4",
        outcome: "SCHEDULED",
        appointment: { id: "42", protocol: "AB12CD34", action: "CREATED" }
    }),
    buildSessionItem({
        id: "2",
        code: "S-ZZ99YY88",
        outcome: "MANAGED_APPOINTMENT",
        question_title: null,
        appointment: { id: "42", protocol: "AB12CD34", action: "RESCHEDULED" }
    }),
    buildSessionItem({
        id: "3",
        code: "S-IN0PROG1",
        outcome: "IN_PROGRESS",
        current_step: "AWAITING_CATEGORY",
        category_name: null,
        question_title: null
    }),
    buildSessionItem({ id: "4", code: "S-RES00001", outcome: "RESOLVED" })
]

describe("Sessões: lista e filtros", () => {
    it("mostra o título, o subtítulo e os seis períodos com 30 dias ativo", async () => {
        const page = await renderSessionsPage()
        await page.loaded()

        expect(screen.getByRole("heading", { level: 1, name: "Sessões" })).toBeInTheDocument()
        expect(
            screen.getByText(
                "Consulta somente leitura das conversas do chatbot. São registrados apenas os passos percorridos."
            )
        ).toBeInTheDocument()

        const chips = within(screen.getByRole("group", { name: "Período" })).getAllByRole("button")

        expect(chips.map((chip) => chip.textContent)).toEqual([
            "Últimos 7 dias",
            "Últimos 30 dias",
            "Últimos 90 dias",
            "Mês atual",
            "Mês anterior",
            "Personalizado"
        ])
        expect(chips.map((chip) => chip.getAttribute("aria-pressed"))).toEqual([
            "false",
            "true",
            "false",
            "false",
            "false",
            "false"
        ])
        expect(screen.queryByRole("button", { name: /^Todos no período/ })).toBeNull()
    })

    it("mostra os desfechos como chips com contagem, depois de período e categoria", async () => {
        const page = await renderSessionsPage({
            list: buildSessionList({
                items: ITEMS,
                chipCounts: {
                    all: 9,
                    resolved: 3,
                    scheduled: 2,
                    out_of_scope: 0,
                    no_slot: 0,
                    declined: 0,
                    managed_appointment: 1,
                    abandoned: 2,
                    in_progress: 1
                }
            })
        })
        await page.loaded()

        const group = screen.getByRole("group", { name: "Desfecho" })
        const chips = within(group).getAllByRole("button")

        expect(chips.map((chip) => chip.textContent)).toEqual([
            "Todos9",
            "Resolvida sem agendamento3",
            "Terminou em agendamento2",
            "Fora do escopo do PROCON0",
            "Sem horário disponível na janela0",
            "Não quis agendar0",
            "Remarcou ou cancelou agendamento existente1",
            "Abandonada2",
            "Em andamento1"
        ])
        expect(chips[0]).toHaveAttribute("aria-pressed", "true")
        expect(screen.getByLabelText("Categoria")).toBeInTheDocument()
    })

    it("mostra o código completo, o início, a etapa atual, a categoria e a pergunta", async () => {
        const page = await renderSessionsPage({ list: buildSessionList({ items: ITEMS }) })
        await page.loaded()

        const rows = screen.getAllByRole("row").slice(1)

        expect(within(rows[0]!).getByRole("button", { name: "S-A1B2C3D4" })).toBeInTheDocument()
        expect(within(rows[0]!).getByText("10/11/2026 · 14:05")).toBeInTheDocument()
        expect(within(rows[0]!).getByText("Terminou em agendamento")).toBeInTheDocument()
        expect(within(rows[0]!).getByText("Consumo")).toBeInTheDocument()
        expect(
            within(rows[0]!).getByText("Como trocar um produto com defeito?")
        ).toBeInTheDocument()
        expect(
            within(rows[2]!).getByText("Etapa atual: Na lista de categorias")
        ).toBeInTheDocument()
    })

    it("mostra o protocolo com Criado ou Remarcou e Não quando não há agendamento", async () => {
        const page = await renderSessionsPage({ list: buildSessionList({ items: ITEMS }) })
        await page.loaded()

        const rows = screen.getAllByRole("row").slice(1)

        expect(within(rows[0]!).getByText("AB12CD34")).toBeInTheDocument()
        expect(within(rows[0]!).getByText("Criado")).toBeInTheDocument()
        expect(within(rows[1]!).getByText("AB12CD34")).toBeInTheDocument()
        expect(within(rows[1]!).getByText("Remarcou")).toBeInTheDocument()
        expect(
            within(rows[1]!).getByText("Conversa de retorno sobre o agendamento AB12CD34")
        ).toBeInTheDocument()
        expect(within(rows[3]!).getByText("Não")).toBeInTheDocument()
    })

    it("mostra o rodapé com o intervalo exibido e o período aplicado", async () => {
        const page = await renderSessionsPage({
            list: buildSessionList({
                items: ITEMS,
                total: 45,
                totalPages: 3,
                page: 1
            })
        })
        await page.loaded()

        expect(
            screen.getByText("1–20 de 45 sessões · Período: 21/10/2026 a 19/11/2026")
        ).toBeInTheDocument()
    })

    it("usa o singular com uma só sessão", async () => {
        const page = await renderSessionsPage({
            list: buildSessionList({ items: [ITEMS[0]!] })
        })
        await page.loaded()

        expect(
            screen.getByText("1–1 de 1 sessão · Período: 21/10/2026 a 19/11/2026")
        ).toBeInTheDocument()
    })

    it("consulta de novo ao escolher período, desfecho e categoria e volta à página 1", async () => {
        const page = await renderSessionsPage({ list: buildSessionList({ items: ITEMS }) })
        await page.loaded()

        await page.user.click(screen.getByRole("button", { name: "Últimos 7 dias" }))
        await waitFor(() =>
            expect(page.listRequests().at(-1)?.url.searchParams.get("period")).toBe("7")
        )

        await page.user.click(screen.getByRole("button", { name: /^Abandonada/ }))
        await waitFor(() =>
            expect(page.listRequests().at(-1)?.url.searchParams.get("outcome")).toBe("ABANDONED")
        )

        await page.user.selectOptions(screen.getByLabelText("Categoria"), "2")
        await waitFor(() =>
            expect(page.listRequests().at(-1)?.url.searchParams.get("category")).toBe("2")
        )
        expect(page.listRequests().at(-1)?.url.searchParams.get("page")).toBe("1")
    })

    it("nunca pede o período Todos", async () => {
        const page = await renderSessionsPage()
        await page.loaded()

        expect(
            page.listRequests().every((call) => call.url.searchParams.get("period") !== "all")
        ).toBe(true)
    })

    it("mostra as datas do período personalizado já preenchidas e consulta ao mudar", async () => {
        const page = await renderSessionsPage()
        await page.loaded()

        await page.user.click(screen.getByRole("button", { name: "Personalizado" }))

        await waitFor(() =>
            expect(page.listRequests().at(-1)?.url.searchParams.get("period")).toBe("custom")
        )
        const last = page.listRequests().at(-1)!

        expect(last.url.searchParams.get("from")).toBe("2026-10-21")
        expect(last.url.searchParams.get("to")).toBe("2026-11-19")
        expect(screen.getByLabelText("De")).toHaveValue("2026-10-21")
        expect(screen.getByLabelText("até")).toHaveValue("2026-11-19")
    })

    it("pagina de 20 em 20 e pede a página seguinte", async () => {
        const page = await renderSessionsPage({
            list: buildSessionList({ items: ITEMS, total: 45, totalPages: 3, page: 1 })
        })
        await page.loaded()

        expect(screen.getByText("Página 1 de 3")).toBeInTheDocument()
        expect(screen.getByRole("button", { name: "‹ Anterior" })).toBeDisabled()

        await page.user.click(screen.getByRole("button", { name: "Próxima ›" }))

        await waitFor(() =>
            expect(page.listRequests().at(-1)?.url.searchParams.get("page")).toBe("2")
        )
    })

    it("mostra o estado vazio do período com o texto do protótipo", async () => {
        const page = await renderSessionsPage({
            list: buildSessionList({ items: [], total: 0, totalPages: 0 })
        })
        await screen.findByText("Nenhuma sessão no período")

        expect(
            screen.getByText(
                "Altere o desfecho, a categoria ou amplie o período para ver outras conversas."
            )
        ).toBeInTheDocument()
        expect(screen.getByText("0 sessões")).toBeInTheDocument()
        expect(page.listRequests()).toHaveLength(1)
    })

    it("mostra o erro e tenta de novo", async () => {
        let attempts = 0
        const page = await renderSessionsPage({
            handler: (url) => {
                if (url.pathname !== "/api/v1/sessions") return null
                attempts += 1

                return attempts === 1
                    ? { status: 500, body: { error: "falhou" } }
                    : { status: 200, body: { data: buildSessionList({ items: ITEMS }) } }
            }
        })

        await screen.findByRole("alert")
        expect(screen.getByText("Não foi possível carregar as sessões.")).toBeInTheDocument()

        await page.user.click(screen.getByRole("button", { name: "Tentar novamente" }))

        await page.loaded()
        expect(screen.queryByRole("alert")).toBeNull()
    })
})

describe("Sessões: busca ao vivo", () => {
    it("não busca com menos de 2 caracteres", async () => {
        const page = await renderSessionsPage()
        await page.loaded()

        await page.user.type(screen.getByRole("searchbox"), "S")
        await new Promise((resolve) => setTimeout(resolve, 500))

        expect(page.listRequests().every((call) => !call.url.searchParams.has("search"))).toBe(true)
        expect(
            screen.getByText("Busque pelo código da sessão (S-…) ou pelo protocolo do agendamento.")
        ).toBeInTheDocument()
    })

    it("busca a partir de 2 caracteres, esconde os filtros e informa os resultados", async () => {
        const page = await renderSessionsPage({
            handler: (url) =>
                url.searchParams.get("search")
                    ? {
                          status: 200,
                          body: {
                              data: buildSessionList({
                                  items: [ITEMS[0]!, ITEMS[1]!],
                                  chipCounts: {
                                      all: 2,
                                      resolved: 0,
                                      scheduled: 1,
                                      out_of_scope: 0,
                                      no_slot: 0,
                                      declined: 0,
                                      managed_appointment: 1,
                                      abandoned: 0,
                                      in_progress: 0
                                  }
                              })
                          }
                      }
                    : null
        })
        await page.loaded()

        await page.user.type(screen.getByRole("searchbox"), "ab12")

        await screen.findByText("2 resultados em todos os períodos, categorias e desfechos")
        expect(page.listRequests().at(-1)?.url.searchParams.get("search")).toBe("ab12")
        expect(screen.queryByRole("group", { name: "Período" })).toBeNull()
        expect(screen.queryByRole("group", { name: "Desfecho" })).toBeNull()
        expect(screen.queryByText(/Período: /)).toBeNull()
    })

    it("usa o singular com um resultado e mostra o vazio da busca", async () => {
        const page = await renderSessionsPage({
            handler: (url) => {
                const term = url.searchParams.get("search")

                if (term === "um") {
                    return {
                        status: 200,
                        body: { data: buildSessionList({ items: [ITEMS[0]!] }) }
                    }
                }

                return term
                    ? {
                          status: 200,
                          body: { data: buildSessionList({ items: [], total: 0, totalPages: 0 }) }
                      }
                    : null
            }
        })
        await page.loaded()

        await page.user.type(screen.getByRole("searchbox"), "um")
        await screen.findByText("1 resultado em todos os períodos, categorias e desfechos")

        await page.user.clear(screen.getByRole("searchbox"))
        await page.user.type(screen.getByRole("searchbox"), "zz")

        await screen.findByText("Nenhuma sessão encontrada")
        expect(
            screen.getByText("Confira o código da sessão ou o protocolo do agendamento.")
        ).toBeInTheDocument()
    })

    it("volta à lista com os filtros ao limpar a busca", async () => {
        const page = await renderSessionsPage()
        await page.loaded()

        await page.user.type(screen.getByRole("searchbox"), "ab")
        await screen.findByRole("button", { name: "Limpar" })

        await page.user.click(screen.getByRole("button", { name: "Limpar" }))

        await screen.findByRole("group", { name: "Período" })
        expect(screen.getByRole("searchbox")).toHaveValue("")
    })
})

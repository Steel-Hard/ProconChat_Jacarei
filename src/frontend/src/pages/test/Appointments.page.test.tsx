import { screen, waitFor, within } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import buildAppointmentList from "@/testUtils/buildAppointmentList"
import buildAppointmentListItem from "@/testUtils/buildAppointmentListItem"
import renderAppointmentsPage from "@/testUtils/renderAppointmentsPage"
import setViewportWidth from "@/testUtils/setViewportWidth"
import type AppointmentList from "@/types/appointments/AppointmentList.types"

vi.setConfig({ testTimeout: 20000 })

const DEFAULT_QUERY = "status=all&period=upcoming&responsible=all&page=1&limit=20"

const ITEMS = [
    buildAppointmentListItem(),
    buildAppointmentListItem({
        id: "12",
        protocol: "AG-0012",
        name: "João Pereira Lima",
        cpf_masked: "***.111.222-**",
        category_name: "Telefonia",
        question_title: "Plano cancelado sem aviso",
        appointment_datetime: "2026-09-29T17:30:00.000Z",
        by_representative: true,
        assigned_user_id: "2",
        assigned_user_name: "Bruno Lima",
        status: "CONFIRMED",
        off_grid: true
    })
]

function listReply(list: AppointmentList) {
    return () => ({ status: 200, body: { data: list } })
}

function renderList(list: AppointmentList = buildAppointmentList(ITEMS), initialEntry?: string) {
    return renderAppointmentsPage({
        initialEntry,
        handlers: { "GET /api/v1/appointments": listReply(list) }
    })
}

afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
    vi.resetModules()
    setViewportWidth(1440)
})

describe("Appointments.page: lista", () => {
    it("pede a lista padrão sem ordem e mostra Próximos no Período", async () => {
        const page = await renderList()

        expect(await screen.findByRole("heading", { name: "Agendamentos" })).toBeInTheDocument()
        await screen.findByText("Maria Aparecida Santos")
        expect(page.lastListRequest()).toBe(DEFAULT_QUERY)
        expect(screen.getByRole("combobox", { name: "Período" })).toHaveDisplayValue(
            "Próximos (a partir de hoje)"
        )
        expect(document.title).toBe("Agendamentos - ProconChat")
    })

    it("mostra cada linha com CPF mascarado, dia da semana, hora de Brasília e responsável", async () => {
        await renderList()

        const first = (await screen.findByText("Maria Aparecida Santos")).closest("tr")
        const second = screen.getByText("João Pereira Lima").closest("tr")

        expect(first).not.toBeNull()
        expect(second).not.toBeNull()
        const one = within(first as HTMLElement)
        const two = within(second as HTMLElement)
        expect(one.getByRole("link", { name: "AG-0011" })).toHaveAttribute(
            "href",
            "/agendamentos/11"
        )
        expect(one.getByText("***.456.789-**")).toBeInTheDocument()
        expect(one.getByText("Bancos")).toBeInTheDocument()
        expect(one.getByText("Cobrança indevida no cartão")).toBeInTheDocument()
        expect(one.getByText("Seg, 28/09")).toBeInTheDocument()
        expect(one.getByText("10:00")).toBeInTheDocument()
        expect(one.getByText("Não")).toBeInTheDocument()
        expect(one.getByText("Sem responsável")).toBeInTheDocument()
        expect(one.getByText("Pendente")).toBeInTheDocument()
        expect(one.queryByText("Fora da grade atual")).not.toBeInTheDocument()
        expect(two.getByText("Ter, 29/09")).toBeInTheDocument()
        expect(two.getByText("14:30")).toBeInTheDocument()
        expect(two.getByText("Sim")).toBeInTheDocument()
        expect(two.getByText("Bruno Lima")).toBeInTheDocument()
        expect(two.getByText("Confirmado")).toBeInTheDocument()
        expect(two.getByText("Fora da grade atual")).toBeInTheDocument()
    })

    it("mostra Fora da grade atual num agendamento pendente", async () => {
        await renderList(buildAppointmentList([buildAppointmentListItem({ off_grid: true })]))

        const row = (await screen.findByText("Maria Aparecida Santos")).closest("tr")

        expect(row).not.toBeNull()
        expect(within(row as HTMLElement).getByText("Pendente")).toBeInTheDocument()
        expect(within(row as HTMLElement).getByText("Fora da grade atual")).toBeInTheDocument()
    })

    it("não mostra Fora da grade atual num agendamento encerrado", async () => {
        await renderList(
            buildAppointmentList([buildAppointmentListItem({ status: "ATTENDED", off_grid: true })])
        )

        await screen.findByText("Maria Aparecida Santos")

        expect(screen.queryByText("Fora da grade atual")).not.toBeInTheDocument()
    })

    it("mostra os 7 chips com a contagem da API e o ativo marcado", async () => {
        await renderList(
            buildAppointmentList(ITEMS, {
                chipCounts: {
                    all: 57,
                    pending: 4,
                    confirmed: 12,
                    attended: 30,
                    no_show: 3,
                    canceled: 8,
                    waiting_record: 2
                }
            })
        )

        await screen.findByText("Maria Aparecida Santos")
        const chips = within(screen.getByRole("group", { name: "Status" }))

        expect(chips.getAllByRole("button").map((chip) => chip.textContent)).toEqual([
            "Todos 57",
            "Pendentes 4",
            "Confirmados 12",
            "Atendidos 30",
            "Não compareceu 3",
            "Cancelados 8",
            "Aguardando registro 2"
        ])
        expect(chips.getByRole("button", { name: "Todos 57" })).toHaveAttribute(
            "aria-pressed",
            "true"
        )
    })

    it("o chip escolhido refaz a busca na página 1 e sem a ordem escolhida", async () => {
        const page = await renderList(
            buildAppointmentList(ITEMS),
            "/agendamentos?sortBy=name&sortOrder=desc&page=2"
        )
        await screen.findByText("Maria Aparecida Santos")

        await page.user.click(screen.getByRole("button", { name: /^Aguardando registro/ }))

        await waitFor(() =>
            expect(page.lastListRequest()).toBe(
                "status=waiting_record&period=upcoming&responsible=all&page=1&limit=20"
            )
        )
        expect(page.router.state.location.search).toBe("?status=waiting_record")
        expect(screen.getByRole("button", { name: /^Aguardando registro/ })).toHaveAttribute(
            "aria-pressed",
            "true"
        )
    })

    it("o período e o responsável refazem a busca na página 1 e sem ordem", async () => {
        const page = await renderList(
            buildAppointmentList(ITEMS),
            "/agendamentos?page=3&sortBy=status"
        )
        await screen.findByText("Maria Aparecida Santos")

        await page.user.selectOptions(screen.getByRole("combobox", { name: "Período" }), "past")
        await waitFor(() => expect(page.router.state.location.search).toBe("?period=past"))
        await page.user.selectOptions(screen.getByRole("combobox", { name: "Responsável" }), "me")

        await waitFor(() =>
            expect(page.lastListRequest()).toBe(
                "status=all&period=past&responsible=me&page=1&limit=20"
            )
        )
        expect(page.router.state.location.search).toBe("?period=past&responsible=me")
    })

    it.each([
        ["", "Ordem padrão: mais próximo primeiro."],
        ["?status=CANCELED&period=all", "Ordem padrão: mais recente primeiro."],
        ["?period=past", "Ordem padrão: mais recente primeiro."],
        ["?status=waiting_record&period=all", "Ordem padrão: mais próximo primeiro."],
        [
            "?period=all",
            "Ordem padrão: próximos primeiro (mais próximo no topo), depois os passados (mais recente primeiro)."
        ]
    ])("com %s o rodapé mostra a nota da ordem padrão", async (search, note) => {
        await renderList(buildAppointmentList(ITEMS), `/agendamentos${search}`)

        expect(await screen.findByText(`1–2 de 2 agendamentos · ${note}`)).toBeInTheDocument()
    })

    it("sem nota de ordem padrão quando a ordem foi escolhida, e singular com 1 agendamento", async () => {
        await renderList(
            buildAppointmentList([buildAppointmentListItem()]),
            "/agendamentos?sortBy=name"
        )

        expect(await screen.findByText("1–1 de 1 agendamento")).toBeInTheDocument()
        expect(screen.queryByRole("navigation", { name: "Paginação" })).not.toBeInTheDocument()
    })
})

describe("Appointments.page: ordenação", () => {
    it("o primeiro clique ordena crescente com ▲ e o segundo decrescente com ▼", async () => {
        const page = await renderList(buildAppointmentList(ITEMS), "/agendamentos?page=2")
        await screen.findByText("Maria Aparecida Santos")

        await page.user.click(screen.getByRole("button", { name: "Titular" }))

        await waitFor(() =>
            expect(page.lastListRequest()).toBe(
                "status=all&period=upcoming&responsible=all&sortBy=name&sortOrder=asc&page=1&limit=20"
            )
        )
        expect(screen.getByRole("columnheader", { name: "Titular" })).toHaveTextContent("Titular▲")

        await page.user.click(screen.getByRole("button", { name: "Titular" }))

        await waitFor(() =>
            expect(page.router.state.location.search).toBe("?sortBy=name&sortOrder=desc")
        )
        expect(screen.getByRole("columnheader", { name: "Titular" })).toHaveTextContent("Titular▼")

        await page.user.click(screen.getByRole("button", { name: "Titular" }))

        await waitFor(() =>
            expect(page.router.state.location.search).toBe("?sortBy=name&sortOrder=asc")
        )
    })

    it.each([
        ["Data e hora", "appointment_datetime"],
        ["Responsável", "responsible"],
        ["Status", "status"]
    ])("ordena por %s", async (label, sortBy) => {
        const page = await renderList()
        await screen.findByText("Maria Aparecida Santos")

        await page.user.click(screen.getByRole("button", { name: label }))

        await waitFor(() => expect(page.listRequests().at(-1)?.get("sortBy")).toBe(sortBy))
        expect(page.listRequests().at(-1)?.get("sortOrder")).toBe("asc")
    })

    it("na tabela compacta usa o Ordenar por e mostra os selos na linha", async () => {
        setViewportWidth(1200)
        const page = await renderList()
        await screen.findByText("Maria Aparecida Santos")

        expect(screen.queryByRole("button", { name: "Titular" })).not.toBeInTheDocument()
        const select = screen.getByRole("combobox", { name: "Ordenar por" })
        expect(
            within(select)
                .getAllByRole("option")
                .map((option) => option.textContent)
        ).toEqual([
            "Padrão do filtro",
            "Data e hora ▲ (mais próximo)",
            "Data e hora ▼ (mais recente)",
            "Titular ▲ (A–Z)",
            "Titular ▼ (Z–A)",
            "Responsável ▲ (sem responsável primeiro)",
            "Responsável ▼",
            "Status ▲",
            "Status ▼"
        ])
        expect(screen.getByText("Por representante")).toBeInTheDocument()
        expect(screen.getByRole("columnheader", { name: "Data · responsável" })).toBeInTheDocument()

        await page.user.selectOptions(select, "responsible:desc")

        await waitFor(() =>
            expect(page.router.state.location.search).toBe("?sortBy=responsible&sortOrder=desc")
        )
        expect(screen.getByRole("combobox", { name: "Ordenar por" })).toHaveValue(
            "responsible:desc"
        )

        await page.user.selectOptions(
            screen.getByRole("combobox", { name: "Ordenar por" }),
            "default"
        )

        await waitFor(() => expect(page.router.state.location.search).toBe(""))
    })
})

describe("Appointments.page: paginação e URL", () => {
    it("mostra a contagem, a página e navega com Anterior e Próxima", async () => {
        const page = await renderAppointmentsPage({
            handlers: {
                "GET /api/v1/appointments": ({ url }) => {
                    const current = Number(url.searchParams.get("page"))

                    return {
                        status: 200,
                        body: {
                            data: buildAppointmentList(ITEMS, {
                                total: 57,
                                page: current,
                                totalPages: 3
                            })
                        }
                    }
                }
            }
        })

        expect(
            await screen.findByText(
                "1–20 de 57 agendamentos · Ordem padrão: mais próximo primeiro."
            )
        ).toBeInTheDocument()
        expect(screen.getByText("Página 1 de 3")).toBeInTheDocument()
        expect(screen.getByRole("button", { name: "‹ Anterior" })).toBeDisabled()

        await page.user.click(screen.getByRole("button", { name: "Próxima ›" }))

        expect(await screen.findByText("Página 2 de 3")).toBeInTheDocument()
        expect(page.router.state.location.search).toBe("?page=2")
        expect(screen.getByText(/^21–40 de 57 agendamentos/)).toBeInTheDocument()

        await page.user.click(screen.getByRole("button", { name: "Próxima ›" }))

        expect(await screen.findByText("Página 3 de 3")).toBeInTheDocument()
        expect(screen.getByRole("button", { name: "Próxima ›" })).toBeDisabled()

        await page.user.click(screen.getByRole("button", { name: "‹ Anterior" }))

        expect(await screen.findByText("Página 2 de 3")).toBeInTheDocument()
    })

    it("troca para a última página quando a página pedida passou do total", async () => {
        const page = await renderAppointmentsPage({
            initialEntry: "/agendamentos?page=9",
            handlers: {
                "GET /api/v1/appointments": ({ url }) => ({
                    status: 200,
                    body: {
                        data: buildAppointmentList(
                            url.searchParams.get("page") === "9" ? [] : ITEMS,
                            { total: 45, page: Number(url.searchParams.get("page")), totalPages: 3 }
                        )
                    }
                })
            }
        })

        await waitFor(() => expect(page.router.state.location.search).toBe("?page=3"))
        expect(await screen.findByText("Página 3 de 3")).toBeInTheDocument()
        expect(page.lastListRequest()).toBe(
            "status=all&period=upcoming&responsible=all&page=3&limit=20"
        )
    })

    it("usa o padrão para valores inválidos da URL sem mandá-los para a API", async () => {
        const page = await renderList(
            buildAppointmentList(ITEMS),
            "/agendamentos?status=foo&page=0&responsible=7&period=semana&sortBy=cpf"
        )

        await screen.findByText("Maria Aparecida Santos")

        expect(page.listRequests()).toHaveLength(1)
        expect(page.lastListRequest()).toBe(DEFAULT_QUERY)
    })

    it("busca de novo o contador de pendentes e a lista sempre que a lista é aberta", async () => {
        const page = await renderList()
        const countCalls = () =>
            page.calls.filter((call) => call.url.pathname === "/api/v1/appointments/pending-count")
        await screen.findByText("Maria Aparecida Santos")
        expect(countCalls()).toHaveLength(1)
        const listBefore = page.listRequests().length
        await page.user.click(screen.getByText("Maria Aparecida Santos"))
        await screen.findByRole("heading", { name: "Detalhe do agendamento" })

        await page.router.navigate(-1)

        await screen.findByText("Maria Aparecida Santos")
        await waitFor(() => expect(countCalls()).toHaveLength(2))
        await waitFor(() => expect(page.listRequests()).toHaveLength(listBefore + 1))
    })

    it("abre o detalhe pela linha levando só a origem no state", async () => {
        const page = await renderList(buildAppointmentList(ITEMS), "/agendamentos?status=PENDING")

        await page.user.click(await screen.findByText("Cobrança indevida no cartão"))

        expect(
            await screen.findByRole("heading", { name: "Detalhe do agendamento" })
        ).toBeInTheDocument()
        expect(page.router.state.location.pathname).toBe("/agendamentos/11")
        expect(page.router.state.location.state).toEqual({
            from: { pathname: "/agendamentos", search: "?status=PENDING" }
        })
    })

    it("volta do detalhe com os mesmos filtros, ordem e página", async () => {
        const page = await renderAppointmentsPage({
            initialEntry: "/agendamentos?status=CONFIRMED&sortBy=status&sortOrder=desc&page=2",
            handlers: {
                "GET /api/v1/appointments": () => ({
                    status: 200,
                    body: {
                        data: buildAppointmentList(ITEMS, { total: 30, page: 2, totalPages: 2 })
                    }
                })
            }
        })
        await page.user.click(await screen.findByRole("link", { name: "AG-0012" }))
        await screen.findByRole("heading", { name: "Detalhe do agendamento" })

        await page.router.navigate(-1)

        expect(await screen.findByText("Página 2 de 2")).toBeInTheDocument()
        expect(page.lastListRequest()).toBe(
            "status=CONFIRMED&period=upcoming&responsible=all&sortBy=status&sortOrder=desc&page=2&limit=20"
        )
        expect(screen.getByRole("button", { name: /^Confirmados/ })).toHaveAttribute(
            "aria-pressed",
            "true"
        )
    })
})

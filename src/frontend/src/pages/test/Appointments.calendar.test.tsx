import { screen, waitFor } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import renderAppointmentsPage from "@/testUtils/renderAppointmentsPage"

vi.setConfig({ testTimeout: 30000 })

const CALENDAR_PATH = "/api/v1/appointments/calendar"
const STAFF_PATH = "/api/v1/appointments/staff"

function weekOf(date: string | null) {
    const start = date ?? "2026-10-18"
    const end = new Date(`${start}T12:00:00Z`)
    end.setUTCDate(end.getUTCDate() + 6)
    const label = end.toISOString().slice(0, 10)

    return {
        weekStart: start,
        weekEnd: label,
        weekStartDay: 0,
        seatsPerSlot: 2,
        days: [
            {
                date: start,
                blocked: { fullDay: false, description: null, periods: [] },
                slots: [{ time: "09:00", freeSeats: 1 }]
            }
        ],
        appointments: [
            {
                id: "11",
                protocol: "AG-0011",
                shortName: "Maria",
                date: start,
                time: "09:00",
                status: "PENDING",
                assigned_user_id: null,
                off_grid: false
            }
        ]
    }
}

const CALENDAR_HANDLER = {
    [`GET ${CALENDAR_PATH}`]: ({ url }: { url: URL }) => ({
        status: 200,
        body: { data: weekOf(url.searchParams.get("date")) }
    })
}

function calendarRequests(page: Awaited<ReturnType<typeof renderAppointmentsPage>>) {
    return page.calls.filter((call) => call.url.pathname === CALENDAR_PATH)
}

afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
    vi.resetModules()
})

describe("Appointments.page: calendário", () => {
    it("abre o calendário direto pela URL, na semana pedida", async () => {
        const page = await renderAppointmentsPage({
            initialEntry: "/agendamentos?visao=calendario&semana=2026-10-11",
            handlers: CALENDAR_HANDLER
        })

        expect(
            await screen.findByRole("table", { name: "Semana de 11/10 a 17/10/2026" })
        ).toBeInTheDocument()
        expect(calendarRequests(page).at(-1)?.url.searchParams.get("date")).toBe("2026-10-11")
    })

    it.each(["2026-02-31", "2026-13-01", "abc"])(
        "trata a semana %s como inválida e mostra Esta semana",
        async (invalid) => {
            const page = await renderAppointmentsPage({
                initialEntry: `/agendamentos?visao=calendario&semana=${invalid}`,
                handlers: CALENDAR_HANDLER
            })

            expect(
                await screen.findByRole("table", { name: "Semana de 18/10 a 24/10/2026" })
            ).toBeInTheDocument()
            expect(calendarRequests(page).at(-1)?.url.searchParams.get("date")).toBeNull()
        }
    )

    it("guarda o modo e a semana na URL e volta ao padrão sem parâmetros", async () => {
        const page = await renderAppointmentsPage({ handlers: CALENDAR_HANDLER })
        expect(page.router.state.location.search).toBe("")

        await page.user.click(screen.getByRole("button", { name: "Calendário semanal" }))
        await screen.findByRole("table", { name: "Semana de 18/10 a 24/10/2026" })
        expect(page.router.state.location.search).toBe("?visao=calendario")

        await page.user.click(screen.getByRole("button", { name: "Próxima semana" }))
        await screen.findByRole("table", { name: "Semana de 25/10 a 31/10/2026" })
        expect(new URLSearchParams(page.router.state.location.search).get("semana")).toBe(
            "2026-10-25"
        )

        await page.user.click(screen.getByRole("button", { name: "Esta semana" }))
        await waitFor(() =>
            expect(new URLSearchParams(page.router.state.location.search).get("semana")).toBeNull()
        )

        await page.user.click(screen.getByRole("button", { name: "Lista" }))
        await waitFor(() => expect(page.router.state.location.search).toBe(""))
    })

    it("mantém modo e semana ao mudar o responsável e o status, e a consulta os usa", async () => {
        const page = await renderAppointmentsPage({
            initialEntry: "/agendamentos?visao=calendario&semana=2026-10-11",
            handlers: CALENDAR_HANDLER
        })
        await screen.findByRole("table", { name: "Semana de 11/10 a 17/10/2026" })

        await page.user.selectOptions(screen.getByRole("combobox", { name: "Responsável" }), "me")
        await page.user.click(screen.getByRole("button", { name: /^Pendentes/ }))

        await waitFor(() => {
            const last = calendarRequests(page).at(-1)?.url.searchParams
            expect(last?.get("responsible")).toBe("me")
            expect(last?.get("status")).toBe("PENDING")
            expect(last?.get("date")).toBe("2026-10-11")
        })
        const search = new URLSearchParams(page.router.state.location.search)
        expect(search.get("visao")).toBe("calendario")
        expect(search.get("semana")).toBe("2026-10-11")
    })

    it("esconde o Período no calendário e o mostra na lista", async () => {
        const page = await renderAppointmentsPage({ handlers: CALENDAR_HANDLER })
        expect(await screen.findByRole("combobox", { name: "Período" })).toBeInTheDocument()

        await page.user.click(screen.getByRole("button", { name: "Calendário semanal" }))
        await screen.findByRole("table")
        expect(screen.queryByRole("combobox", { name: "Período" })).toBeNull()

        await page.user.click(screen.getByRole("button", { name: "Lista" }))
        expect(await screen.findByRole("combobox", { name: "Período" })).toBeInTheDocument()
    })

    it("guarda a semana ao abrir um agendamento, para o Voltar do detalhe", async () => {
        const page = await renderAppointmentsPage({
            initialEntry: "/agendamentos?visao=calendario&semana=2026-10-11",
            handlers: CALENDAR_HANDLER
        })

        await page.user.click(
            await screen.findByRole("button", {
                name: "Abrir agendamento de Maria às 09:00 (Pendente)"
            })
        )

        expect(page.router.state.location.pathname).toBe("/agendamentos/11")
        expect(page.router.state.location.state).toEqual({
            from: {
                pathname: "/agendamentos",
                search: "?visao=calendario&semana=2026-10-11"
            }
        })
    })

    it("mostra o erro do calendário e carrega ao tentar de novo", async () => {
        let calls = 0
        const page = await renderAppointmentsPage({
            initialEntry: "/agendamentos?visao=calendario",
            handlers: {
                [`GET ${CALENDAR_PATH}`]: ({ url }) => {
                    calls += 1

                    return calls === 1
                        ? { status: 500, body: { error: { code: "X", message: "x" } } }
                        : { status: 200, body: { data: weekOf(url.searchParams.get("date")) } }
                }
            }
        })

        expect(await screen.findByRole("alert")).toBeInTheDocument()
        await page.user.click(screen.getByRole("button", { name: "Tentar novamente" }))

        expect(
            await screen.findByRole("table", { name: "Semana de 18/10 a 24/10/2026" })
        ).toBeInTheDocument()
    })

    it("mostra o erro da lista de funcionários no filtro e recarrega ao tentar de novo", async () => {
        let calls = 0
        const page = await renderAppointmentsPage({
            handlers: {
                [`GET ${STAFF_PATH}`]: () => {
                    calls += 1

                    return calls === 1
                        ? { status: 500, body: { error: { code: "X", message: "x" } } }
                        : {
                              status: 200,
                              body: { data: [{ id: "7", name: "Bruno Lima", active: true }] }
                          }
                }
            }
        })

        const retry = await screen.findByRole("button", { name: "Tentar novamente" })
        await page.user.click(retry)

        expect(await screen.findByRole("option", { name: "Bruno Lima" })).toBeInTheDocument()
    })
})

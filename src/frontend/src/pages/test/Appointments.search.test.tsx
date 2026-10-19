import { screen, waitFor } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import accountSlice from "@/store/slices/account.slice"
import buildAppointmentList from "@/testUtils/buildAppointmentList"
import buildAppointmentListItem from "@/testUtils/buildAppointmentListItem"
import renderAppointmentsPage from "@/testUtils/renderAppointmentsPage"

vi.setConfig({ testTimeout: 20000 })

const FICTITIOUS_CPF = "11122233344"
const DEFAULT_HINT =
    "Na recepção: busque pelo nome do titular, pelo protocolo recebido no WhatsApp ou pelo CPF completo (11 dígitos). Enter abre o resultado quando houver só um."
const CPF_HINT = "Para buscar por CPF, digite os 11 dígitos."

const MARIA = buildAppointmentListItem()
const MARIO = buildAppointmentListItem({ id: "15", protocol: "AG-0015", name: "Mário Souza" })

type Reply = { status: number; body?: unknown }

function searchReplies(bySearch: Record<string, () => Reply | Promise<Reply>>) {
    return {
        "GET /api/v1/appointments": ({ url }: { url: URL }) => {
            const search = url.searchParams.get("search")

            if (search !== null && bySearch[search]) {
                return bySearch[search]()
            }

            return { status: 200, body: { data: buildAppointmentList([MARIA, MARIO]) } }
        }
    }
}

function found(...items: (typeof MARIA)[]) {
    return () => ({ status: 200, body: { data: buildAppointmentList(items) } })
}

function searchBox() {
    return screen.getByRole("searchbox", { name: "Buscar" })
}

afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
    vi.resetModules()
    window.history.replaceState(null, "", "/")
})

describe("Appointments.page: busca", () => {
    it("busca depois da pausa na página 1, sem ordem, e esconde chips e filtros", async () => {
        const page = await renderAppointmentsPage({
            initialEntry: "/agendamentos?status=PENDING&sortBy=name&page=2",
            handlers: searchReplies({ Ma: found(MARIA, MARIO) })
        })
        await screen.findByText("Maria Aparecida Santos")
        expect(screen.getByText(DEFAULT_HINT)).toBeInTheDocument()

        await page.user.type(searchBox(), "Ma")

        await waitFor(() => expect(page.listRequests().at(-1)?.get("search")).toBe("Ma"))
        const searches = page.listRequests().filter((params) => params.has("search"))
        expect(searches.map((params) => params.toString())).toEqual([
            "search=Ma&status=PENDING&period=upcoming&responsible=all&page=1&limit=20"
        ])
        expect(
            await screen.findByText("2 resultados em todos os períodos, status e responsáveis")
        ).toBeInTheDocument()
        expect(screen.queryByRole("group", { name: "Status" })).not.toBeInTheDocument()
        expect(screen.queryByRole("combobox", { name: "Período" })).not.toBeInTheDocument()
        expect(page.router.state.location.search).toBe("?status=PENDING")
        expect(page.router.state.location.state).toBeNull()
        expect(page.store.getState().appointmentSearch.term).toBe("Ma")
    })

    it("espera a pausa na digitação e manda só o termo final", async () => {
        const page = await renderAppointmentsPage({
            handlers: searchReplies({ Mar: found(MARIA, MARIO) })
        })
        await screen.findByText("Maria Aparecida Santos")

        await page.user.type(searchBox(), "Mar")

        await screen.findByText(
            "2 resultados em todos os períodos, status e responsáveis",
            {},
            { timeout: 5000 }
        )
        expect(
            page
                .listRequests()
                .filter((params) => params.has("search"))
                .map((params) => params.get("search"))
        ).toEqual(["Mar"])
    })

    it("durante a busca o rodapé mostra a ordem mista, qualquer que seja o filtro", async () => {
        const page = await renderAppointmentsPage({
            initialEntry: "/agendamentos?status=PENDING",
            handlers: searchReplies({ Ma: found(MARIA, MARIO) })
        })
        expect(
            await screen.findByText("1–2 de 2 agendamentos · Ordem padrão: mais próximo primeiro.")
        ).toBeInTheDocument()

        await page.user.type(searchBox(), "Ma")

        expect(
            await screen.findByText(
                "1–2 de 2 agendamentos · Ordem padrão: próximos primeiro (mais próximo no topo), depois os passados (mais recente primeiro).",
                {},
                { timeout: 5000 }
            )
        ).toBeInTheDocument()
    })

    it("não manda busca com menos de 2 caracteres e os filtros continuam valendo", async () => {
        const page = await renderAppointmentsPage({ handlers: searchReplies({}) })
        await screen.findByText("Maria Aparecida Santos")

        await page.user.type(searchBox(), " M ")
        await new Promise((resolve) => setTimeout(resolve, 400))
        await page.user.click(screen.getByRole("button", { name: /^Pendentes/ }))

        await waitFor(() => expect(page.listRequests().at(-1)?.get("status")).toBe("PENDING"))
        expect(page.listRequests().every((params) => !params.has("search"))).toBe(true)
        expect(screen.getByRole("group", { name: "Status" })).toBeInTheDocument()
    })

    it("com um resultado, Enter abre o agendamento", async () => {
        const page = await renderAppointmentsPage({
            handlers: searchReplies({ "AG-0011": found(MARIA) })
        })
        await screen.findByText("Maria Aparecida Santos")
        await page.user.type(searchBox(), "AG-0011")
        expect(
            await screen.findByText(
                "1 resultado em todos os períodos, status e responsáveis · Enter para abrir"
            )
        ).toBeInTheDocument()

        await page.user.type(searchBox(), "{Enter}")

        expect(
            await screen.findByRole("heading", { name: "Detalhe do agendamento" })
        ).toBeInTheDocument()
        expect(page.router.state.location.pathname).toBe("/agendamentos/11")
    })

    it("Enter não abre nada antes da resposta do termo atual", async () => {
        const page = await renderAppointmentsPage({
            handlers: searchReplies({
                Maria: found(MARIA),
                Mariaz: () => new Promise<Reply>(() => {})
            })
        })
        await screen.findByText("Maria Aparecida Santos")
        await page.user.type(searchBox(), "Maria")
        await screen.findByText(/Enter para abrir/)

        await page.user.type(searchBox(), "z{Enter}")
        await waitFor(() => expect(page.listRequests().at(-1)?.get("search")).toBe("Mariaz"))
        await page.user.type(searchBox(), "{Enter}")

        expect(page.router.state.location.pathname).toBe("/agendamentos")
        expect(screen.queryByText(/Enter para abrir/)).not.toBeInTheDocument()
    })

    it("Enter não abre nada com mais de um resultado", async () => {
        const page = await renderAppointmentsPage({
            handlers: searchReplies({ Mar: found(MARIA, MARIO) })
        })
        await screen.findByText("Maria Aparecida Santos")
        await page.user.type(searchBox(), "Mar")
        await screen.findByText("2 resultados em todos os períodos, status e responsáveis")

        await page.user.type(searchBox(), "{Enter}")

        expect(page.router.state.location.pathname).toBe("/agendamentos")
    })

    it("Esc limpa a busca e volta aos filtros da URL", async () => {
        const page = await renderAppointmentsPage({
            initialEntry: "/agendamentos?status=CONFIRMED",
            handlers: searchReplies({ Maria: found(MARIA) })
        })
        await screen.findByText("Maria Aparecida Santos")
        await page.user.type(searchBox(), "Maria")
        await screen.findByText(/1 resultado/)

        await page.user.type(searchBox(), "{Escape}")

        expect(searchBox()).toHaveValue("")
        expect(await screen.findByRole("group", { name: "Status" })).toBeInTheDocument()
        expect(screen.getByRole("button", { name: /^Confirmados/ })).toHaveAttribute(
            "aria-pressed",
            "true"
        )
        expect(page.lastListRequest()).toBe(
            "status=CONFIRMED&period=upcoming&responsible=all&page=1&limit=20"
        )
        expect(page.store.getState().appointmentSearch.term).toBe("")
    })

    it("Limpar apaga a busca", async () => {
        const page = await renderAppointmentsPage({
            handlers: searchReplies({ Maria: found(MARIA) })
        })
        await screen.findByText("Maria Aparecida Santos")
        await page.user.type(searchBox(), "Maria")
        await screen.findByText(/1 resultado/)

        await page.user.click(screen.getByRole("button", { name: "Limpar" }))

        expect(searchBox()).toHaveValue("")
        expect(screen.queryByRole("button", { name: "Limpar" })).not.toBeInTheDocument()
        expect(await screen.findByText(DEFAULT_HINT)).toBeInTheDocument()
    })

    it.each(["1", "123.456", "1234567890"])(
        "avisa para digitar os 11 dígitos com %s",
        async (term) => {
            const page = await renderAppointmentsPage({ handlers: searchReplies({}) })
            await screen.findByText("Maria Aparecida Santos")

            await page.user.type(searchBox(), term)

            expect(await screen.findByText(new RegExp(`· ${CPF_HINT}$`))).toBeInTheDocument()
        }
    )

    it("não avisa sobre CPF com os 11 dígitos nem com letras", async () => {
        const page = await renderAppointmentsPage({
            handlers: searchReplies({ [FICTITIOUS_CPF]: found(MARIA), "Ana 12": found() })
        })
        await screen.findByText("Maria Aparecida Santos")

        await page.user.type(searchBox(), FICTITIOUS_CPF)
        await screen.findByText(/1 resultado/)
        expect(screen.queryByText(new RegExp(CPF_HINT))).not.toBeInTheDocument()
        await page.user.clear(searchBox())
        await page.user.type(searchBox(), "Ana 12")
        await screen.findByText(/0 resultados/)

        expect(screen.queryByText(new RegExp(CPF_HINT))).not.toBeInTheDocument()
    })

    it("restaura a busca ao voltar do detalhe", async () => {
        const page = await renderAppointmentsPage({
            initialEntry: "/agendamentos?period=past",
            handlers: searchReplies({ Maria: found(MARIA) })
        })
        await screen.findByText("Maria Aparecida Santos")
        await page.user.type(searchBox(), "Maria")
        await screen.findByText(/1 resultado/)
        await page.user.click(screen.getByText("Maria Aparecida Santos"))
        await screen.findByRole("heading", { name: "Detalhe do agendamento" })

        await page.router.navigate(-1)

        expect(await screen.findByRole("searchbox", { name: "Buscar" })).toHaveValue("Maria")
        expect(await screen.findByText(/1 resultado/)).toBeInTheDocument()
        expect(page.router.state.location.search).toBe("?period=past")
        expect(page.listRequests().at(-1)?.get("search")).toBe("Maria")
    })

    it("não põe o CPF buscado na URL nem no histórico enquanto a busca está ativa", async () => {
        const page = await renderAppointmentsPage({
            browser: true,
            initialEntry: "/agendamentos?status=PENDING",
            handlers: searchReplies({ [FICTITIOUS_CPF]: found(MARIA) })
        })
        await screen.findByText("Maria Aparecida Santos")

        await page.user.type(searchBox(), FICTITIOUS_CPF)

        expect(await screen.findByText(/1 resultado/, {}, { timeout: 5000 })).toBeInTheDocument()
        expect(window.location.pathname).toBe("/agendamentos")
        expect(window.location.search).toBe("?status=PENDING")
        expect(window.location.href).not.toContain(FICTITIOUS_CPF)
        expect(JSON.stringify(window.history.state)).not.toContain(FICTITIOUS_CPF)
    })

    it("não deixa o CPF buscado na URL, no histórico nem no armazenamento do navegador", async () => {
        const page = await renderAppointmentsPage({
            browser: true,
            initialEntry: "/agendamentos?status=PENDING",
            handlers: searchReplies({ [FICTITIOUS_CPF]: found(MARIA) })
        })
        await screen.findByText("Maria Aparecida Santos")
        await page.user.type(searchBox(), FICTITIOUS_CPF)
        await screen.findByText(/1 resultado/)

        await page.user.type(searchBox(), "{Enter}")
        await screen.findByRole("heading", { name: "Detalhe do agendamento" })

        expect(window.location.pathname).toBe("/agendamentos/11")
        expect(window.location.href).not.toContain(FICTITIOUS_CPF)
        expect(JSON.stringify(window.history.state)).not.toContain(FICTITIOUS_CPF)
        expect(JSON.stringify(window.history.state)).toContain("?status=PENDING")
        expect(JSON.stringify({ ...localStorage })).not.toContain(FICTITIOUS_CPF)
        expect(JSON.stringify({ ...sessionStorage })).not.toContain(FICTITIOUS_CPF)
        expect(document.cookie).not.toContain(FICTITIOUS_CPF)
        expect(page.store.getState().appointmentSearch.term).toBe(FICTITIOUS_CPF)

        page.store.dispatch(accountSlice.actions.accountCleared())

        expect(page.store.getState().appointmentSearch.term).toBe("")
    })
})

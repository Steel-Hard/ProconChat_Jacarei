import { act, screen, waitFor, within } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import buildAppointmentList from "@/testUtils/buildAppointmentList"
import buildAppointmentListItem from "@/testUtils/buildAppointmentListItem"
import renderAppointmentsPage from "@/testUtils/renderAppointmentsPage"
import type PanelAccount from "@/types/account/PanelAccount.types"
import type PermissionKey from "@/types/account/PermissionKey.types"

vi.setConfig({ testTimeout: 20000 })

type Reply = { status: number; body?: unknown }

const PENDING = buildAppointmentListItem()
const CONFIRMED = buildAppointmentListItem({
    id: "12",
    protocol: "AG-0012",
    name: "João Pereira Lima",
    status: "CONFIRMED",
    assigned_user_id: "2",
    assigned_user_name: "Bruno Lima"
})

function staff(permissions: PermissionKey[]): PanelAccount {
    return {
        id: 3,
        name: "Carla Dias",
        email: "carla@exemplo.gov.br",
        isAdmin: false,
        permissions
    }
}

function renderClaim(patch: () => Reply | Promise<Reply>, account?: PanelAccount) {
    return renderAppointmentsPage({
        account,
        handlers: {
            "GET /api/v1/appointments": () => ({
                status: 200,
                body: { data: buildAppointmentList([PENDING, CONFIRMED]) }
            }),
            "PATCH /api/v1/appointments/11/status": patch
        }
    })
}

function rowOf(name: string): HTMLElement {
    const row = screen.getByText(name).closest("tr")

    if (row === null) {
        throw new Error("linha não encontrada")
    }

    return row
}

function conflict(code: string): () => Reply {
    return () => ({ status: 409, body: { error: { code, message: "x" } } })
}

afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
    vi.resetModules()
})

describe("Appointments.page: Assumir", () => {
    it("mostra Assumir só na linha pendente para o Admin", async () => {
        await renderClaim(() => ({ status: 200, body: { data: {} } }))
        await screen.findByText("Maria Aparecida Santos")

        expect(
            within(rowOf("Maria Aparecida Santos")).getByRole("button", { name: "Assumir" })
        ).toBeInTheDocument()
        expect(
            within(rowOf("João Pereira Lima")).queryByRole("button", { name: "Assumir" })
        ).not.toBeInTheDocument()
    })

    it("mostra Assumir para quem tem Gerenciar agendamentos", async () => {
        await renderClaim(() => ({ status: 200 }), staff(["appointments.manage"]))

        await screen.findByText("Maria Aparecida Santos")

        expect(screen.getByRole("button", { name: "Assumir" })).toBeInTheDocument()
    })

    it("não mostra Assumir para quem só tem Ver agendamentos", async () => {
        await renderClaim(() => ({ status: 200 }), staff(["appointments.view"]))

        await screen.findByText("Maria Aparecida Santos")

        expect(screen.queryByRole("button", { name: "Assumir" })).not.toBeInTheDocument()
    })

    it("assume sem abrir o detalhe, desabilita durante o envio e avisa o sucesso", async () => {
        const reply = Promise.withResolvers<Reply>()
        const page = await renderClaim(() => reply.promise)
        await screen.findByText("Maria Aparecida Santos")
        const before = page.listRequests().length

        await page.user.click(screen.getByRole("button", { name: "Assumir" }))

        expect(screen.getByRole("button", { name: "Assumir" })).toBeDisabled()
        reply.resolve({
            status: 200,
            body: { data: { ...PENDING, status: "CONFIRMED", assigned_user_name: "Ana" } }
        })
        expect(
            await screen.findByText("Agendamento AG-0011 assumido por você.")
        ).toBeInTheDocument()
        expect(page.router.state.location.pathname).toBe("/agendamentos")
        const patch = page.calls.find((call) => call.method === "PATCH")
        expect(patch?.url.pathname).toBe("/api/v1/appointments/11/status")
        expect(patch?.body).toEqual({ action: "claim" })
        await waitFor(() => expect(page.listRequests().length).toBe(before + 1))
        await waitFor(() =>
            expect(
                page.calls.filter(
                    (call) => call.url.pathname === "/api/v1/appointments/pending-count"
                )
            ).toHaveLength(2)
        )
    })

    it.each([
        ["APPOINTMENT_ALREADY_CLAIMED", "Outra pessoa já assumiu este agendamento."],
        ["APPOINTMENT_CANCELED", "Este agendamento foi cancelado."]
    ])("com 409 %s avisa a mensagem do code e rebusca a lista e o contador", async (code, text) => {
        const page = await renderClaim(conflict(code))
        await screen.findByText("Maria Aparecida Santos")
        const before = page.listRequests().length

        await page.user.click(screen.getByRole("button", { name: "Assumir" }))

        expect(await screen.findByText(text)).toBeInTheDocument()
        await waitFor(() => expect(page.listRequests().length).toBe(before + 1))
        await waitFor(() =>
            expect(
                page.calls.filter(
                    (call) => call.url.pathname === "/api/v1/appointments/pending-count"
                )
            ).toHaveLength(2)
        )
        expect(screen.getByRole("button", { name: "Assumir" })).toBeEnabled()
    })

    it("avisa e rebusca a página atual quando o Assumir termina depois da troca de página", async () => {
        const reply = Promise.withResolvers<Reply>()
        const page = await renderAppointmentsPage({
            handlers: {
                "GET /api/v1/appointments": ({ url }) => ({
                    status: 200,
                    body: {
                        data: buildAppointmentList(
                            url.searchParams.get("page") === "2" ? [CONFIRMED] : [PENDING],
                            { total: 30, page: Number(url.searchParams.get("page")), totalPages: 2 }
                        )
                    }
                }),
                "PATCH /api/v1/appointments/11/status": () => reply.promise
            }
        })
        await screen.findByText("Maria Aparecida Santos")
        await page.user.click(screen.getByRole("button", { name: "Assumir" }))
        await page.user.click(screen.getByRole("button", { name: "Próxima ›" }))
        await screen.findByText("João Pereira Lima")
        const secondPage = () =>
            page.listRequests().filter((params) => params.get("page") === "2").length
        const before = secondPage()

        reply.resolve({ status: 200, body: { data: { ...PENDING, status: "CONFIRMED" } } })

        expect(
            await screen.findByText("Agendamento AG-0011 assumido por você.")
        ).toBeInTheDocument()
        await waitFor(() => expect(secondPage()).toBe(before + 1))
        expect(page.router.state.location.search).toBe("?page=2")
    })

    it("com 403 INVALID_ORIGIN avisa a origem não autorizada", async () => {
        const page = await renderClaim(() => ({
            status: 403,
            body: { error: { code: "INVALID_ORIGIN", message: "x" } }
        }))
        await screen.findByText("Maria Aparecida Santos")

        await page.user.click(screen.getByRole("button", { name: "Assumir" }))

        expect(
            await screen.findByText(
                "O painel foi aberto por um endereço não autorizado. Acesse pelo endereço oficial do painel."
            )
        ).toBeInTheDocument()
    })

    it("com outro erro avisa a mensagem genérica", async () => {
        const page = await renderClaim(() => ({
            status: 500,
            body: { error: { code: "INTERNAL_ERROR", message: "x" } }
        }))
        await screen.findByText("Maria Aparecida Santos")

        await page.user.click(screen.getByRole("button", { name: "Assumir" }))

        expect(
            await screen.findByText("Não foi possível concluir a ação. Tente de novo.")
        ).toBeInTheDocument()
    })
    it("manda um único PATCH num clique duplo em Assumir", async () => {
        const reply = Promise.withResolvers<Reply>()
        const page = await renderClaim(() => reply.promise)
        await screen.findByText("Maria Aparecida Santos")

        const button = screen.getByRole("button", { name: "Assumir" })
        act(() => {
            button.click()
            button.click()
        })
        reply.resolve({ status: 200, body: { data: { ...PENDING, status: "CONFIRMED" } } })

        expect(
            await screen.findByText("Agendamento AG-0011 assumido por você.")
        ).toBeInTheDocument()
        expect(page.calls.filter((call) => call.method === "PATCH")).toHaveLength(1)
    })
})

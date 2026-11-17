import { screen, waitFor, within } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import buildAppointmentDetail from "@/testUtils/buildAppointmentDetail"
import renderAppointmentDetailPage from "@/testUtils/renderAppointmentDetailPage"
import type AppointmentDetail from "@/types/appointments/AppointmentDetail.types"

vi.setConfig({ testTimeout: 20000 })

const DETAIL_PATH = "/api/v1/appointments/1"
const STATUS_PATH = `${DETAIL_PATH}/status`
const STAFF_PATH = "/api/v1/appointments/staff"

const STAFF = [
    { id: "2", name: "Bruno Lima", email: "bruno@procon.test", active: true },
    { id: "3", name: "Carla Dias", email: "carla@procon.test", active: false },
    { id: "4", name: "Ana Paula Souza", email: "ana@procon.test", active: true },
    { id: "5", name: "Diego Reis", email: null, active: true }
]

function assignable(overrides: Partial<AppointmentDetail> = {}): AppointmentDetail {
    const base = buildAppointmentDetail()

    return buildAppointmentDetail({
        ...overrides,
        available_actions: { ...base.available_actions, assign: { allowed: true, code: null } }
    })
}

async function renderAssign(
    patch: () => { status: number; body: unknown },
    detail: AppointmentDetail | (() => { status: number; body: unknown }) = assignable(),
    staff: () => { status: number; body: unknown } = () => ({
        status: 200,
        body: { data: STAFF }
    })
) {
    const page = await renderAppointmentDetailPage({
        handlers: {
            [`GET ${DETAIL_PATH}`]:
                typeof detail === "function"
                    ? detail
                    : () => ({ status: 200, body: { data: detail } }),
            [`GET ${STAFF_PATH}`]: staff,
            [`PATCH ${STATUS_PATH}`]: patch
        }
    })
    await page.user.click(
        await screen.findByRole("button", { name: "Atribuir a outro funcionário" })
    )

    return page
}

function actionsBox() {
    return within(
        screen.getByRole("heading", { level: 2, name: "Ações" }).closest("section") as HTMLElement
    )
}

afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
    vi.resetModules()
})

describe("AppointmentDetail.page: atribuir", () => {
    it("abre o modal com o protocolo e lista só funcionários ativos, com nome e e-mail", async () => {
        await renderAssign(() => ({ status: 200, body: { data: assignable() } }))

        const dialog = await screen.findByRole("dialog", { name: "Atribuir F10464F0" })
        expect(
            within(dialog).getByText(
                "Escolha o funcionário responsável. O status passa a Confirmado."
            )
        ).toBeInTheDocument()
        expect(await within(dialog).findByRole("button", { name: /Bruno Lima/ })).toHaveTextContent(
            "bruno@procon.test"
        )
        expect(within(dialog).queryByText(/Carla Dias/)).toBeNull()
        expect(within(dialog).getByRole("button", { name: /Diego Reis/ })).toHaveTextContent(
            /^Diego Reis$/
        )
        expect(within(dialog).getByRole("button", { name: "Voltar" })).toBeInTheDocument()
        expect(within(dialog).getByRole("button", { name: "Atribuir" })).toBeDisabled()
    })

    it("não lista a pessoa que já é a responsável", async () => {
        await renderAssign(
            () => ({ status: 200, body: { data: assignable() } }),
            assignable({ status: "CONFIRMED", assigned_user_id: "4" })
        )

        const dialog = await screen.findByRole("dialog")
        await within(dialog).findByRole("button", { name: /Bruno Lima/ })
        expect(within(dialog).queryByRole("button", { name: /Ana Paula Souza/ })).toBeNull()
    })

    it("atribui ao escolhido, fecha o modal e envia só a ação e o funcionário", async () => {
        const page = await renderAssign(() => ({
            status: 200,
            body: { data: assignable({ status: "CONFIRMED", assigned_user_id: "2" }) }
        }))
        const dialog = await screen.findByRole("dialog")

        await page.user.click(await within(dialog).findByRole("button", { name: /Bruno Lima/ }))
        await page.user.click(within(dialog).getByRole("button", { name: "Atribuir" }))

        await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull())
        expect(page.requests("PATCH", STATUS_PATH)[0]?.body).toEqual({
            action: "assign",
            assigneeUserId: "2"
        })
    })

    it("Voltar fecha o modal sem enviar nada", async () => {
        const page = await renderAssign(() => ({ status: 200, body: { data: assignable() } }))
        const dialog = await screen.findByRole("dialog")

        await page.user.click(within(dialog).getByRole("button", { name: "Voltar" }))

        expect(screen.queryByRole("dialog")).toBeNull()
        expect(page.requests("PATCH", STATUS_PATH)).toHaveLength(0)
    })

    it("com 409 ASSIGNEE_BUSY mostra o erro com o protocolo na caixa Ações, recarrega o detalhe e a lista e limpa a escolha", async () => {
        const page = await renderAssign(() => ({
            status: 409,
            body: {
                error: {
                    code: "ASSIGNEE_BUSY",
                    message: "x",
                    details: { conflictingProtocol: "AG-0099" }
                }
            }
        }))
        const dialog = await screen.findByRole("dialog")
        await page.user.click(await within(dialog).findByRole("button", { name: /Bruno Lima/ }))
        await page.user.click(within(dialog).getByRole("button", { name: "Atribuir" }))

        expect(
            await actionsBox().findByText(
                "O funcionário já tem outro agendamento neste horário (AG-0099)."
            )
        ).toBeInTheDocument()
        expect(screen.queryByRole("dialog")).toBeNull()
        await waitFor(() => expect(page.requests("GET", DETAIL_PATH)).toHaveLength(2))
        await waitFor(() => expect(page.requests("GET", STAFF_PATH).length).toBeGreaterThan(1))

        await page.user.click(screen.getByRole("button", { name: "Atribuir a outro funcionário" }))
        const reopened = await screen.findByRole("dialog")
        expect(within(reopened).getByRole("button", { name: "Atribuir" })).toBeDisabled()
    })

    it("com 409 INVALID_ASSIGNEE mostra o erro na caixa Ações", async () => {
        const page = await renderAssign(() => ({
            status: 409,
            body: { error: { code: "INVALID_ASSIGNEE", message: "x" } }
        }))
        const dialog = await screen.findByRole("dialog")
        await page.user.click(await within(dialog).findByRole("button", { name: /Bruno Lima/ }))
        await page.user.click(within(dialog).getByRole("button", { name: "Atribuir" }))

        expect(
            await actionsBox().findByText(
                "O funcionário selecionado não está mais disponível para receber agendamentos."
            )
        ).toBeInTheDocument()
    })

    it("mostra erro e Tentar novamente quando a lista de funcionários não carrega", async () => {
        let calls = 0
        const page = await renderAssign(
            () => ({ status: 200, body: { data: assignable() } }),
            assignable(),
            () => {
                calls += 1

                return calls === 1
                    ? { status: 500, body: { error: { code: "X", message: "x" } } }
                    : { status: 200, body: { data: STAFF } }
            }
        )
        const dialog = await screen.findByRole("dialog")

        expect(
            await within(dialog).findByText("Não foi possível carregar a lista de funcionários.")
        ).toBeInTheDocument()
        await page.user.click(within(dialog).getByRole("button", { name: "Tentar novamente" }))

        expect(
            await within(dialog).findByRole("button", { name: /Bruno Lima/ })
        ).toBeInTheDocument()
    })

    it("não oferece Atribuir quando a conta não pode atribuir", async () => {
        await renderAppointmentDetailPage({
            handlers: {
                [`GET ${DETAIL_PATH}`]: () => ({
                    status: 200,
                    body: { data: buildAppointmentDetail() }
                })
            }
        })

        await screen.findByRole("heading", { level: 1, name: "Maria Fictícia" })
        expect(screen.queryByRole("button", { name: "Atribuir a outro funcionário" })).toBeNull()
    })
})

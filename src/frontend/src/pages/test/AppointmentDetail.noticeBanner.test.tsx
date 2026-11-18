import { screen, waitFor, within } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import buildAppointmentDetail from "@/testUtils/buildAppointmentDetail"
import renderAppointmentDetailPage from "@/testUtils/renderAppointmentDetailPage"
import type AppointmentDetail from "@/types/appointments/AppointmentDetail.types"

vi.setConfig({ testTimeout: 30000 })

const DETAIL_PATH = "/api/v1/appointments/1"
const STATUS_PATH = "/api/v1/appointments/1/status"
const PREVIEW_PATH = "/api/v1/appointments/1/cancellation-preview"
const BANNER =
    "Agendamento F10464F0 cancelado. O cidadão não foi avisado pelo sistema: avise por outro meio."

const PENDING = buildAppointmentDetail()
const CANCELLABLE = buildAppointmentDetail({
    available_actions: { ...PENDING.available_actions, cancel: { allowed: true, code: null } }
})

function canceled(
    status: AppointmentDetail["cancellation_notice_status"],
    retry: { allowed: boolean; code: string | null } = {
        allowed: false,
        code: "NOTIFICATION_NOT_RETRYABLE"
    },
    extraEvents: AppointmentDetail["events"] = []
): AppointmentDetail {
    return buildAppointmentDetail({
        status: "CANCELED",
        cancellation_notice_status: status,
        events: [
            ...extraEvents,
            {
                id: "2",
                type: "CANCELED_BY_STAFF",
                actor_user_id: "1",
                actor_user_name: "Ana Paula Souza",
                data: { reason: "CITIZEN_REQUEST" },
                created_at: "2026-10-18T14:00:00.000Z"
            },
            ...PENDING.events
        ],
        available_actions: {
            ...PENDING.available_actions,
            claim: { allowed: false, code: "APPOINTMENT_CANCELED" },
            cancel: { allowed: false, code: null },
            retry_cancellation_notice:
                retry as AppointmentDetail["available_actions"]["retry_cancellation_notice"]
        }
    })
}

async function renderDetail(
    detail: AppointmentDetail,
    handlers: Record<string, () => { status: number; body?: unknown }> = {}
) {
    const page = await renderAppointmentDetailPage({
        handlers: {
            [`GET ${DETAIL_PATH}`]: () => ({ status: 200, body: { data: detail } }),
            ...handlers
        }
    })
    await screen.findByRole("heading", { level: 1, name: "Maria Fictícia" })

    return page
}

function actionsBox(): ReturnType<typeof within> {
    const heading = screen.getByRole("heading", { level: 2, name: "Ações" })

    return within(heading.closest("section") as HTMLElement)
}

afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
    vi.resetModules()
})

describe("AppointmentDetail: faixa de cancelado sem aviso", () => {
    it("mostra a faixa fixa ao abrir um agendamento cancelado sem aviso", async () => {
        await renderDetail(canceled("DISABLED"))

        const banner = actionsBox().getByText(BANNER)

        expect(banner).toHaveAttribute("data-tone", "warning")
        expect(banner).not.toHaveAttribute("role", "alert")
        expect(actionsBox().queryByRole("button", { name: "Tentar novamente" })).toBeNull()
    })

    it("não mostra a faixa quando o cidadão foi avisado ou não há marca", async () => {
        await renderDetail(canceled("NOTIFIED"))

        expect(actionsBox().queryByText(/O cidadão não foi avisado pelo sistema/)).toBeNull()
    })

    it("mostra a faixa depois de cancelar com o aviso desligado, sem dizer que o cidadão foi avisado", async () => {
        const page = await renderDetail(CANCELLABLE, {
            [`GET ${PREVIEW_PATH}`]: () => ({
                status: 200,
                body: { data: { noticeEnabled: false, problem: null, previews: [] } }
            }),
            [`PATCH ${STATUS_PATH}`]: () => ({ status: 200, body: { data: canceled("DISABLED") } })
        })
        await page.user.click(screen.getByRole("button", { name: "Cancelar agendamento" }))
        const dialog = screen.getByRole("dialog", { name: "Cancelar o agendamento F10464F0?" })
        await page.user.click(within(dialog).getByRole("radio", { name: "A pedido do cidadão" }))
        await page.user.click(within(dialog).getByRole("button", { name: "Cancelar agendamento" }))

        expect(await actionsBox().findByText(BANNER)).toBeInTheDocument()
        expect(screen.queryByText(/cancelado e cidadão avisado/)).not.toBeInTheDocument()
    })

    it("mantém a faixa de falha ao recarregar quando o aviso falhou e pode ser reenviado", async () => {
        await renderDetail(canceled("FAILED", { allowed: true, code: null }))

        expect(
            actionsBox().getByText(
                'Agendamento F10464F0 cancelado, mas o aviso ao cidadão falhou. Use "Tentar novamente" no histórico.'
            )
        ).toBeInTheDocument()
    })

    it("mantém a faixa de falta de telefone ao recarregar", async () => {
        await renderDetail(
            canceled("FAILED", { allowed: false, code: "CITIZEN_PHONE_UNAVAILABLE" })
        )

        expect(
            actionsBox().getByText(
                "Agendamento F10464F0 cancelado, mas o cidadão não pôde ser avisado: não há telefone disponível para o envio."
            )
        ).toBeInTheDocument()
    })
})

describe("AppointmentDetail: Tentar novamente escondido", () => {
    it("esconde o botão quando o aviso estava desativado, mesmo que a API libere a ação", async () => {
        const detail = canceled("DISABLED", { allowed: true, code: null })

        await renderDetail(detail)

        await waitFor(() =>
            expect(screen.queryByRole("button", { name: "Tentar novamente" })).toBeNull()
        )
    })

    it("esconde o botão quando o último aviso foi entregue", async () => {
        await renderDetail(canceled("NOTIFIED", { allowed: true, code: null }))

        expect(screen.queryByRole("button", { name: "Tentar novamente" })).toBeNull()
    })

    it("mantém o botão quando o aviso falhou e a API libera a ação", async () => {
        await renderDetail(canceled("FAILED", { allowed: true, code: null }))

        expect(screen.getByRole("button", { name: "Tentar novamente" })).toBeInTheDocument()
    })
})

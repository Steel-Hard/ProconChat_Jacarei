import { screen, waitFor, within } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import buildAppointmentDetail from "@/testUtils/buildAppointmentDetail"
import renderAppointmentDetailPage from "@/testUtils/renderAppointmentDetailPage"
import type AppointmentDetail from "@/types/appointments/AppointmentDetail.types"

vi.setConfig({ testTimeout: 20000 })

type Reply = { status: number; body?: unknown }
type Handler = () => Reply | Promise<Reply>

const DETAIL_PATH = "/api/v1/appointments/1"
const STATUS_PATH = "/api/v1/appointments/1/status"
const RETRY_PATH = "/api/v1/appointments/1/cancellation-notice/retry"
const PREVIEW_PATH = "/api/v1/appointments/1/cancellation-preview"

const PENDING = buildAppointmentDetail()

const CANCELLABLE = buildAppointmentDetail({
    available_actions: { ...PENDING.available_actions, cancel: { allowed: true, code: null } }
})

const CANCELED_NOTIFIED = buildAppointmentDetail({
    status: "CANCELED",
    events: [
        {
            id: "3",
            type: "CITIZEN_NOTIFIED",
            actor_user_id: null,
            actor_user_name: null,
            data: { kind: "CANCELLATION" },
            created_at: "2026-10-18T14:01:00.000Z"
        },
        ...PENDING.events
    ],
    available_actions: {
        ...PENDING.available_actions,
        claim: { allowed: false, code: "APPOINTMENT_CANCELED" },
        cancel: { allowed: false, code: null },
        retry_cancellation_notice: { allowed: false, code: "NOTIFICATION_NOT_RETRYABLE" }
    }
})

const CANCELED_FAILED = buildAppointmentDetail({
    ...CANCELED_NOTIFIED,
    events: [
        {
            id: "3",
            type: "CITIZEN_NOTIFICATION_FAILED",
            actor_user_id: null,
            actor_user_name: null,
            data: { kind: "CANCELLATION" },
            created_at: "2026-10-18T14:01:00.000Z"
        },
        ...PENDING.events
    ],
    available_actions: {
        ...CANCELED_NOTIFIED.available_actions,
        retry_cancellation_notice: { allowed: true, code: null }
    }
})

const CANCELED_NO_PHONE = buildAppointmentDetail({
    ...CANCELED_FAILED,
    available_actions: {
        ...CANCELED_FAILED.available_actions,
        retry_cancellation_notice: { allowed: false, code: "CITIZEN_PHONE_UNAVAILABLE" }
    }
})

const PREVIEWS = {
    status: 200,
    body: {
        data: {
            noticeEnabled: true,
            problem: null,
            previews: [
                { reason: "UNIT_CLOSED", message: "Mensagem para unidade fechada" },
                { reason: "CITIZEN_REQUEST", message: "Mensagem a pedido do cidadão" },
                { reason: "DUPLICATE", message: "Mensagem para duplicidade" },
                { reason: "OTHER", message: "Mensagem para outro motivo" }
            ]
        }
    }
}

function ok(detail: AppointmentDetail): Reply {
    return { status: 200, body: { data: detail } }
}

function failure(status: number, code: string): Reply {
    return { status, body: { error: { code, message: "x" } } }
}

async function renderCancellation(
    detail: AppointmentDetail,
    handlers: Record<string, Handler> = {}
) {
    const page = await renderAppointmentDetailPage({
        handlers: {
            [`GET ${DETAIL_PATH}`]: () => ok(detail),
            [`GET ${PREVIEW_PATH}`]: () => PREVIEWS,
            ...handlers
        }
    })
    await screen.findByRole("heading", { level: 1, name: "Maria Fictícia" })

    return page
}

async function openAndConfirm(page: Awaited<ReturnType<typeof renderCancellation>>, note = "") {
    await page.user.click(screen.getByRole("button", { name: "Cancelar agendamento" }))
    const dialog = screen.getByRole("dialog", { name: "Cancelar o agendamento F10464F0?" })
    await page.user.click(within(dialog).getByRole("radio", { name: "A pedido do cidadão" }))
    await within(dialog).findByText("Mensagem a pedido do cidadão")

    if (note !== "") {
        await page.user.type(within(dialog).getByRole("textbox"), note)
    }

    await page.user.click(
        within(dialog).getByRole("button", { name: "Cancelar e avisar o cidadão" })
    )

    return dialog
}

function actionsBox(): ReturnType<typeof within> {
    const heading = screen.getByRole("heading", { level: 2, name: "Ações" })

    return within(heading.closest("section") as HTMLElement)
}

function historyBox(): ReturnType<typeof within> {
    const heading = screen.getByRole("heading", { level: 2, name: "Histórico" })

    return within(heading.closest("section") as HTMLElement)
}

afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
    vi.resetModules()
})

describe("AppointmentDetail: cancelamento e reenvio do aviso", () => {
    it("confirma o cancelamento com o cidadão avisado e sem aviso persistente", async () => {
        const page = await renderCancellation(CANCELLABLE, {
            [`PATCH ${STATUS_PATH}`]: () => ok(CANCELED_NOTIFIED)
        })

        await openAndConfirm(page)

        expect(
            await screen.findByText("Agendamento F10464F0 cancelado e cidadão avisado.")
        ).toBeInTheDocument()
        expect(actionsBox().queryByText(/o aviso ao cidadão falhou/)).not.toBeInTheDocument()
    })

    it("mantém na caixa Ações o aviso persistente quando o aviso ao cidadão falhou", async () => {
        const page = await renderCancellation(CANCELLABLE, {
            [`PATCH ${STATUS_PATH}`]: () => ok(CANCELED_FAILED)
        })

        await openAndConfirm(page)

        const notice = await actionsBox().findByText(
            'Agendamento F10464F0 cancelado, mas o aviso ao cidadão falhou. Use "Tentar novamente" no histórico.'
        )
        expect(notice).toHaveAttribute("data-tone", "warning")
        expect(screen.queryByText(/cancelado e cidadão avisado/)).not.toBeInTheDocument()
        expect(historyBox().getByRole("button", { name: "Tentar novamente" })).toBeInTheDocument()
    })

    it("explica que não há telefone, sem Tentar novamente e sem dizer que o cidadão foi avisado", async () => {
        const page = await renderCancellation(CANCELLABLE, {
            [`PATCH ${STATUS_PATH}`]: () => ok(CANCELED_NO_PHONE)
        })

        await openAndConfirm(page)

        const notice = await actionsBox().findByText(
            "Agendamento F10464F0 cancelado, mas o cidadão não pôde ser avisado: não há telefone disponível para o envio."
        )
        expect(notice).toHaveAttribute("data-tone", "warning")
        expect(screen.queryByText(/cancelado e cidadão avisado/)).not.toBeInTheDocument()
        expect(
            historyBox().queryByRole("button", { name: "Tentar novamente" })
        ).not.toBeInTheDocument()
        expect(
            historyBox().getByText("Falha ao avisar o cidadão do cancelamento")
        ).toBeInTheDocument()
    })

    it("reenvia com sucesso, avisa o painel e remove o aviso persistente", async () => {
        const page = await renderCancellation(CANCELLABLE, {
            [`PATCH ${STATUS_PATH}`]: () => ok(CANCELED_FAILED),
            [`POST ${RETRY_PATH}`]: () => ok(CANCELED_NOTIFIED)
        })
        await openAndConfirm(page)
        await actionsBox().findByText(/o aviso ao cidadão falhou/)

        await page.user.click(historyBox().getByRole("button", { name: "Tentar novamente" }))

        expect(await screen.findByText("Aviso reenviado ao cidadão.")).toBeInTheDocument()
        await waitFor(() =>
            expect(actionsBox().queryByText(/o aviso ao cidadão falhou/)).not.toBeInTheDocument()
        )
        expect(
            historyBox().queryByRole("button", { name: "Tentar novamente" })
        ).not.toBeInTheDocument()
    })

    it("mostra erro e mantém o botão quando o reenvio falha de novo", async () => {
        const page = await renderCancellation(CANCELED_FAILED, {
            [`POST ${RETRY_PATH}`]: () => ok(CANCELED_FAILED)
        })

        await page.user.click(historyBox().getByRole("button", { name: "Tentar novamente" }))

        expect(await historyBox().findByRole("alert")).toHaveTextContent(
            "Não foi possível reenviar o aviso ao cidadão. Tente novamente em instantes."
        )
        expect(screen.queryByText("Aviso reenviado ao cidadão.")).not.toBeInTheDocument()
        expect(historyBox().getByRole("button", { name: "Tentar novamente" })).toBeInTheDocument()
    })

    it("relê o detalhe quando o cancelamento é recusado depois do horário", async () => {
        const afterStart = buildAppointmentDetail({
            available_actions: {
                ...PENDING.available_actions,
                cancel: { allowed: false, code: "CANCEL_AFTER_START" }
            }
        })
        let reads = 0
        const page = await renderCancellation(CANCELLABLE, {
            [`GET ${DETAIL_PATH}`]: () => {
                reads += 1

                return ok(reads === 1 ? CANCELLABLE : afterStart)
            },
            [`PATCH ${STATUS_PATH}`]: () => failure(409, "CANCEL_AFTER_START")
        })

        const dialog = await openAndConfirm(page)

        expect(await within(dialog).findByRole("alert")).toHaveTextContent(
            "Não é possível cancelar depois do horário do atendimento."
        )
        await waitFor(() => expect(page.requests("GET", DETAIL_PATH)).toHaveLength(2))
        await waitFor(() =>
            expect(
                actionsBox().queryByRole("button", { name: "Cancelar agendamento" })
            ).not.toBeInTheDocument()
        )
    })

    it("não relê o detalhe quando o cancelamento é recusado por permissão", async () => {
        const page = await renderCancellation(CANCELLABLE, {
            [`PATCH ${STATUS_PATH}`]: () => failure(403, "PERMISSION_REQUIRED")
        })

        const dialog = await openAndConfirm(page)

        await within(dialog).findByRole("alert")
        expect(page.requests("GET", DETAIL_PATH)).toHaveLength(1)
    })

    it("relê o detalhe quando o reenvio é recusado e some o botão", async () => {
        let reads = 0
        const page = await renderCancellation(CANCELED_FAILED, {
            [`GET ${DETAIL_PATH}`]: () => {
                reads += 1

                return ok(reads === 1 ? CANCELED_FAILED : CANCELED_NOTIFIED)
            },
            [`POST ${RETRY_PATH}`]: () => failure(409, "NOTIFICATION_NOT_RETRYABLE")
        })

        await page.user.click(historyBox().getByRole("button", { name: "Tentar novamente" }))

        await waitFor(() => expect(page.requests("GET", DETAIL_PATH)).toHaveLength(2))
        await waitFor(() =>
            expect(
                historyBox().queryByRole("button", { name: "Tentar novamente" })
            ).not.toBeInTheDocument()
        )
    })

    it("mantém a explicação quando o reenvio é recusado por o horário já ter passado", async () => {
        const afterStart = buildAppointmentDetail({
            ...CANCELED_FAILED,
            available_actions: {
                ...CANCELED_FAILED.available_actions,
                retry_cancellation_notice: { allowed: false, code: "NOTIFICATION_AFTER_START" }
            }
        })
        let reads = 0
        const page = await renderCancellation(CANCELED_FAILED, {
            [`GET ${DETAIL_PATH}`]: () => {
                reads += 1

                return ok(reads === 1 ? CANCELED_FAILED : afterStart)
            },
            [`POST ${RETRY_PATH}`]: () => failure(409, "NOTIFICATION_AFTER_START")
        })

        await page.user.click(historyBox().getByRole("button", { name: "Tentar novamente" }))

        await waitFor(() => expect(page.requests("GET", DETAIL_PATH)).toHaveLength(2))
        expect(await historyBox().findByRole("alert")).toHaveTextContent(
            "O horário do atendimento já passou e o aviso não pode mais ser enviado."
        )
        expect(
            historyBox().queryByRole("button", { name: "Tentar novamente" })
        ).not.toBeInTheDocument()
    })

    it("tira o aviso persistente quando o reenvio é recusado e a releitura mostra o aviso resolvido", async () => {
        let reads = 0
        const page = await renderCancellation(CANCELLABLE, {
            [`GET ${DETAIL_PATH}`]: () => {
                reads += 1

                return ok(reads === 1 ? CANCELLABLE : CANCELED_NOTIFIED)
            },
            [`PATCH ${STATUS_PATH}`]: () => ok(CANCELED_FAILED),
            [`POST ${RETRY_PATH}`]: () => failure(409, "NOTIFICATION_NOT_RETRYABLE")
        })
        await openAndConfirm(page)
        await actionsBox().findByText(/o aviso ao cidadão falhou/)

        await page.user.click(historyBox().getByRole("button", { name: "Tentar novamente" }))

        await waitFor(() =>
            expect(actionsBox().queryByText(/o aviso ao cidadão falhou/)).not.toBeInTheDocument()
        )
        expect(
            historyBox().queryByRole("button", { name: "Tentar novamente" })
        ).not.toBeInTheDocument()
    })

    it("explica quando já há um envio do aviso em andamento", async () => {
        const page = await renderCancellation(CANCELED_FAILED, {
            [`POST ${RETRY_PATH}`]: () => failure(409, "NOTIFICATION_IN_PROGRESS")
        })

        await page.user.click(historyBox().getByRole("button", { name: "Tentar novamente" }))

        expect(await historyBox().findByRole("alert")).toHaveTextContent(
            "Já há um envio deste aviso em andamento. Aguarde um instante."
        )
    })

    it("não cancela sem a prévia carregada e deixa tentar carregá-la de novo", async () => {
        const page = await renderCancellation(CANCELLABLE, {
            [`GET ${PREVIEW_PATH}`]: () => failure(500, "INTERNAL")
        })
        await page.user.click(screen.getByRole("button", { name: "Cancelar agendamento" }))
        const dialog = screen.getByRole("dialog", { name: "Cancelar o agendamento F10464F0?" })

        await within(dialog).findByRole("button", { name: "Tentar de novo" })
        await page.user.click(within(dialog).getByRole("radio", { name: "A pedido do cidadão" }))
        await page.user.click(
            within(dialog).getByRole("button", { name: "Cancelar e avisar o cidadão" })
        )

        expect(
            within(dialog).getByRole("button", { name: "Cancelar e avisar o cidadão" })
        ).toBeDisabled()
        expect(page.requests("PATCH", STATUS_PATH)).toHaveLength(0)
        await page.user.click(within(dialog).getByRole("button", { name: "Tentar de novo" }))
        await waitFor(() => expect(page.requests("GET", PREVIEW_PATH).length).toBeGreaterThan(1))
    })

    it("envia a observação sem espaços nas pontas e omite a observação vazia", async () => {
        const first = await renderCancellation(CANCELLABLE, {
            [`PATCH ${STATUS_PATH}`]: () => ok(CANCELED_NOTIFIED)
        })
        await openAndConfirm(first, "  pedido confirmado  ")
        await waitFor(() => expect(first.requests("PATCH", STATUS_PATH)).toHaveLength(1))
        expect(first.requests("PATCH", STATUS_PATH)[0]?.body).toEqual({
            action: "cancel",
            reason: "CITIZEN_REQUEST",
            note: "pedido confirmado"
        })
    })

    it("omite a observação quando só há espaços", async () => {
        const page = await renderCancellation(CANCELLABLE, {
            [`PATCH ${STATUS_PATH}`]: () => ok(CANCELED_NOTIFIED)
        })
        await openAndConfirm(page, "   ")
        await waitFor(() => expect(page.requests("PATCH", STATUS_PATH)).toHaveLength(1))

        expect(page.requests("PATCH", STATUS_PATH)[0]?.body).toEqual({
            action: "cancel",
            reason: "CITIZEN_REQUEST"
        })
    })

    it("não abre o modal quando o backend não libera o cancelamento", async () => {
        await renderCancellation(PENDING)

        expect(
            screen.queryByRole("button", { name: "Cancelar agendamento" })
        ).not.toBeInTheDocument()
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    })

    it("mostra a dica dos modelos fixos, o asterisco do motivo e a observação opcional separada", async () => {
        const page = await renderCancellation(CANCELLABLE)
        await page.user.click(screen.getByRole("button", { name: "Cancelar agendamento" }))
        const dialog = screen.getByRole("dialog", { name: "Cancelar o agendamento F10464F0?" })

        expect(
            await within(dialog).findByText(
                "As mensagens enviadas pelo chatbot seguem modelos fixos e não podem ser editadas livremente. Por isso o aviso pode ser enviado a qualquer momento antes do horário do atendimento."
            )
        ).toBeInTheDocument()
        expect(within(dialog).getByText("*")).toBeInTheDocument()
        const optional = within(dialog).getByText("(opcional, não é enviada ao cidadão)")
        expect(optional.tagName).toBe("SPAN")
        expect(optional).toHaveAttribute("data-optional", "true")
        expect(within(dialog).getByText("Observação interna")).toBeInTheDocument()
    })
})

import { screen, waitFor, within } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import buildAppointmentDetail from "@/testUtils/buildAppointmentDetail"
import renderAppointmentDetailPage from "@/testUtils/renderAppointmentDetailPage"

vi.setConfig({ testTimeout: 30000 })

type Reply = { status: number; body?: unknown }

const DETAIL_PATH = "/api/v1/appointments/1"
const STATUS_PATH = "/api/v1/appointments/1/status"
const PREVIEW_PATH = "/api/v1/appointments/1/cancellation-preview"
const CANCEL_BUTTON = "Cancelar agendamento"

const PENDING = buildAppointmentDetail()
const CANCELLABLE = buildAppointmentDetail({
    available_actions: { ...PENDING.available_actions, cancel: { allowed: true, code: null } }
})

const MESSAGES = [
    { reason: "UNIT_CLOSED", message: "Mensagem para unidade fechada" },
    { reason: "CITIZEN_REQUEST", message: "Mensagem a pedido do cidadão" },
    { reason: "DUPLICATE", message: "Mensagem para duplicidade" },
    { reason: "OTHER", message: "Mensagem para outro motivo" }
]

function previewReply(noticeEnabled: boolean, problem: unknown = null): Reply {
    return {
        status: 200,
        body: { data: { noticeEnabled, problem, previews: noticeEnabled ? MESSAGES : [] } }
    }
}

async function openModal(preview: () => Reply | Promise<Reply>) {
    const page = await renderAppointmentDetailPage({
        handlers: {
            [`GET ${DETAIL_PATH}`]: () => ({ status: 200, body: { data: CANCELLABLE } }),
            [`GET ${PREVIEW_PATH}`]: preview,
            [`PATCH ${STATUS_PATH}`]: () => ({ status: 200, body: { data: CANCELLABLE } })
        }
    })
    await screen.findByRole("heading", { level: 1, name: "Maria Fictícia" })
    await page.user.click(screen.getByRole("button", { name: CANCEL_BUTTON }))
    const dialog = screen.getByRole("dialog", { name: "Cancelar o agendamento F10464F0?" })

    return { page, dialog }
}

afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
    vi.resetModules()
})

describe("AppointmentDetail: modal Cancelar com o aviso desligado", () => {
    it("mostra o quadro âmbar no lugar da prévia e o botão Cancelar agendamento", async () => {
        const { dialog } = await openModal(() => previewReply(false))

        expect(
            await within(dialog).findByText(
                "O aviso por WhatsApp está desligado. O cidadão não será avisado pelo sistema. Avise por outro meio."
            )
        ).toBeInTheDocument()
        expect(
            within(dialog).queryByText("Mensagem que o cidadão receberá")
        ).not.toBeInTheDocument()
        expect(within(dialog).queryByText("Modelo fixo")).not.toBeInTheDocument()
        expect(within(dialog).queryByText(/modelos fixos/)).not.toBeInTheDocument()
        expect(
            within(dialog).queryByText(/Escolha um motivo para ver a prévia/)
        ).not.toBeInTheDocument()
        expect(within(dialog).getByRole("button", { name: CANCEL_BUTTON })).toBeInTheDocument()
        expect(
            within(dialog).queryByRole("button", { name: "Cancelar e avisar o cidadão" })
        ).not.toBeInTheDocument()
    })

    it("usa o subtítulo sem prometer o aviso", async () => {
        const { dialog } = await openModal(() => previewReply(false))

        expect(
            await within(dialog).findByText(
                "Maria Fictícia · 19/10/2026 às 08:00. O horário volta a ficar disponível no chatbot. O cidadão não será avisado pelo sistema. Esta ação não pode ser desfeita."
            )
        ).toBeInTheDocument()
    })

    it("cancela sem prévia, com o motivo obrigatório", async () => {
        const { page, dialog } = await openModal(() => previewReply(false))
        const confirm = await within(dialog).findByRole("button", { name: CANCEL_BUTTON })

        await page.user.click(confirm)
        expect(await within(dialog).findByRole("alert")).toHaveTextContent("Escolha um motivo")
        expect(page.requests("PATCH", STATUS_PATH)).toHaveLength(0)

        await page.user.click(within(dialog).getByRole("radio", { name: "A pedido do cidadão" }))
        expect(confirm).toBeEnabled()
        await page.user.click(confirm)

        await waitFor(() => expect(page.requests("PATCH", STATUS_PATH)).toHaveLength(1))
        expect(page.requests("PATCH", STATUS_PATH)[0]?.body).toEqual({
            action: "cancel",
            reason: "CITIZEN_REQUEST"
        })
    })
})

describe("AppointmentDetail: modal Cancelar com problema na conta da Meta", () => {
    it.each([
        ["PAYMENT_METHOD", "a conta da Meta está sem forma de pagamento"],
        [
            "TEMPLATE_NOT_FOUND",
            "o modelo de aviso não existe no idioma usado ou não está aprovado na Meta"
        ],
        [
            "TEMPLATE_PARAMETER_COUNT",
            "o número de parâmetros enviado é diferente do modelo cadastrado na Meta"
        ],
        [
            "TEMPLATE_PARAMETER_FORMAT",
            "os parâmetros do modelo foram enviados com formato incorreto"
        ],
        ["TEMPLATE_TRANSLATION_TOO_LONG", "a tradução do texto do modelo ficou longa demais"],
        ["TEMPLATE_POLICY_VIOLATION", "o conteúdo do modelo viola a política do WhatsApp"],
        ["TEMPLATE_PAUSED", "o modelo de aviso foi pausado pela Meta por baixa qualidade"],
        ["TEMPLATE_DISABLED", "o modelo de aviso foi desativado de vez pela Meta"],
        ["INVALID_TOKEN", "o token da Meta está inválido ou expirado"],
        ["SEND_LIMIT_REACHED", "o limite de envios do número foi atingido"]
    ])("mostra a faixa para %s e deixa cancelar", async (code, phrase) => {
        const { page, dialog } = await openModal(() =>
            previewReply(true, { code, metaErrorCode: null, message: "x" })
        )

        const band = await within(dialog).findByText(`O aviso pode não chegar: ${phrase}.`)

        expect(band).not.toHaveAttribute("role", "alert")
        expect(within(dialog).getByText("Mensagem que o cidadão receberá")).toBeInTheDocument()
        await page.user.click(within(dialog).getByRole("radio", { name: "A pedido do cidadão" }))
        await within(dialog).findByText("Mensagem a pedido do cidadão")
        expect(
            within(dialog).getByRole("button", { name: "Cancelar e avisar o cidadão" })
        ).toBeEnabled()
        expect(
            band.compareDocumentPosition(
                within(dialog).getByText("Mensagem que o cidadão receberá")
            ) & Node.DOCUMENT_POSITION_FOLLOWING
        ).toBeTruthy()
    })

    it("não mostra a faixa quando não há problema", async () => {
        const { dialog } = await openModal(() => previewReply(true))

        await within(dialog).findByText("Mensagem que o cidadão receberá")

        expect(within(dialog).queryByText(/O aviso pode não chegar/)).not.toBeInTheDocument()
    })
})

describe("AppointmentDetail: modal Cancelar sem conseguir ler a configuração do aviso", () => {
    it("bloqueia o confirmar e deixa tentar de novo", async () => {
        const { page, dialog } = await openModal(() => ({
            status: 500,
            body: { error: { code: "INTERNAL_SERVER_ERROR", message: "x" } }
        }))

        expect(await within(dialog).findByRole("alert")).toHaveTextContent(
            "Não foi possível verificar o aviso ao cidadão. Tente de novo."
        )
        await page.user.click(within(dialog).getByRole("radio", { name: "A pedido do cidadão" }))
        expect(
            within(dialog).getByRole("button", { name: "Cancelar e avisar o cidadão" })
        ).toBeDisabled()
        expect(page.requests("PATCH", STATUS_PATH)).toHaveLength(0)
        expect(within(dialog).queryByText("Mensagem que o cidadão receberá")).toBeNull()
        expect(within(dialog).queryByText("Modelo fixo")).toBeNull()
        expect(within(dialog).queryByText(/modelos fixos/)).toBeNull()
        await page.user.click(within(dialog).getByRole("button", { name: "Tentar de novo" }))
        await waitFor(() => expect(page.requests("GET", PREVIEW_PATH).length).toBeGreaterThan(1))
    })

    it("mantém o confirmar bloqueado enquanto carrega a configuração", async () => {
        const { page, dialog } = await openModal(() => new Promise<Reply>(() => {}))

        await page.user.click(within(dialog).getByRole("radio", { name: "A pedido do cidadão" }))

        expect(within(dialog).getByText("Verificando o aviso ao cidadão…")).toBeInTheDocument()
        expect(within(dialog).queryByText("Mensagem que o cidadão receberá")).toBeNull()
        expect(within(dialog).queryByText("Modelo fixo")).toBeNull()
        expect(within(dialog).queryByText(/modelos fixos/)).toBeNull()
        expect(
            within(dialog).getByRole("button", { name: "Cancelar e avisar o cidadão" })
        ).toBeDisabled()
    })
})

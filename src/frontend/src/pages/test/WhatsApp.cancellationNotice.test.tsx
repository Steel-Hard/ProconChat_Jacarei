import { screen, waitFor, within } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import buildWhatsAppSettings from "@/testUtils/buildWhatsAppSettings"
import renderWhatsAppPage from "@/testUtils/renderWhatsAppPage"

vi.setConfig({ testTimeout: 30000 })

const NOTICE_PATH = "/api/v1/whatsapp/settings/cancellation-notice"
const SWITCH_NAME = "Avisar o cidadão por WhatsApp quando a equipe cancelar um agendamento"

function noticeCard(): HTMLElement {
    const heading = screen.getByRole("heading", { level: 2, name: "Avisos ao cidadão" })

    return heading.closest("section") as HTMLElement
}

afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
    vi.resetModules()
})

describe("WhatsApp: card Avisos ao cidadão", () => {
    it("mostra o interruptor desligado por padrão, com o texto de custo da Meta", async () => {
        await renderWhatsAppPage()

        const card = within(noticeCard())
        const toggle = card.getByRole("switch", { name: SWITCH_NAME })

        expect(toggle).toHaveAttribute("aria-checked", "false")
        expect(card.getByText("Desligado")).toBeInTheDocument()
        const support = card.getByText(/tem custo por mensagem cobrado pela Meta/)
        expect(toggle.getAttribute("aria-describedby")).toBe(support.id)
        expect(card.getByText(/os avisos contam no limite diário/i)).toBeInTheDocument()
    })

    it("fica logo antes de Modelos de mensagem e depois de Testar conexão", async () => {
        await renderWhatsAppPage()

        const notice = screen.getByRole("heading", { name: "Avisos ao cidadão" })
        const templates = screen.getByRole("heading", { name: "Modelos de mensagem" })
        const test = screen.getByRole("button", { name: "Testar conexão" })

        expect(test.compareDocumentPosition(notice) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
        expect(
            notice.compareDocumentPosition(templates) & Node.DOCUMENT_POSITION_FOLLOWING
        ).toBeTruthy()
    })

    it("pede confirmação ao ligar e só chama a API depois de confirmar", async () => {
        const enabled = buildWhatsAppSettings({ cancellationNoticeEnabled: true })
        const page = await renderWhatsAppPage({
            [`PUT ${NOTICE_PATH}`]: () => ({ status: 200, body: { data: enabled } })
        })

        await page.user.click(within(noticeCard()).getByRole("switch", { name: SWITCH_NAME }))
        const dialog = screen.getByRole("dialog", { name: "Ligar o aviso de cancelamento?" })

        expect(page.requests("PUT", NOTICE_PATH)).toHaveLength(0)
        expect(
            within(dialog).getByText(
                "Quando a equipe cancelar um agendamento, o cidadão receberá uma mensagem pelo WhatsApp. Cada aviso é uma mensagem de modelo e tem custo por mensagem cobrado pela Meta."
            )
        ).toBeInTheDocument()
        await page.user.click(within(dialog).getByRole("button", { name: "Ligar aviso" }))

        await waitFor(() => expect(page.requests("PUT", NOTICE_PATH)).toHaveLength(1))
        expect(page.requests("PUT", NOTICE_PATH)[0]?.body).toEqual({ enabled: true })
        expect(await screen.findByText("Aviso ao cidadão ligado.")).toBeInTheDocument()
        await waitFor(() =>
            expect(within(noticeCard()).getByRole("switch", { name: SWITCH_NAME })).toHaveAttribute(
                "aria-checked",
                "true"
            )
        )
        expect(within(noticeCard()).getByText("Ligado")).toBeInTheDocument()
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    })

    it("cancelar o diálogo de ligar não muda nada", async () => {
        const page = await renderWhatsAppPage()

        await page.user.click(within(noticeCard()).getByRole("switch", { name: SWITCH_NAME }))
        await page.user.click(
            within(screen.getByRole("dialog")).getByRole("button", { name: "Voltar" })
        )

        expect(page.requests("PUT", NOTICE_PATH)).toHaveLength(0)
        expect(within(noticeCard()).getByRole("switch", { name: SWITCH_NAME })).toHaveAttribute(
            "aria-checked",
            "false"
        )
    })

    it("pede confirmação ao desligar com o aviso do que muda", async () => {
        const disabled = buildWhatsAppSettings({ cancellationNoticeEnabled: false })
        const page = await renderWhatsAppPage(
            {
                [`PUT ${NOTICE_PATH}`]: () => ({ status: 200, body: { data: disabled } })
            },
            buildWhatsAppSettings({ cancellationNoticeEnabled: true })
        )

        await page.user.click(within(noticeCard()).getByRole("switch", { name: SWITCH_NAME }))
        const dialog = screen.getByRole("dialog", { name: "Desligar o aviso de cancelamento?" })

        expect(
            within(dialog).getByText(
                "Quando a equipe cancelar um agendamento, o cidadão NÃO será avisado pelo sistema. A equipe precisa avisar por outro meio."
            )
        ).toBeInTheDocument()
        await page.user.click(within(dialog).getByRole("button", { name: "Desligar aviso" }))

        await waitFor(() => expect(page.requests("PUT", NOTICE_PATH)).toHaveLength(1))
        expect(page.requests("PUT", NOTICE_PATH)[0]?.body).toEqual({ enabled: false })
        expect(await screen.findByText("Aviso ao cidadão desligado.")).toBeInTheDocument()
    })

    it("volta ao valor anterior e mostra o erro quando salvar falha", async () => {
        const page = await renderWhatsAppPage({
            [`PUT ${NOTICE_PATH}`]: () => ({
                status: 500,
                body: { error: { code: "INTERNAL_SERVER_ERROR", message: "x" } }
            })
        })

        await page.user.click(within(noticeCard()).getByRole("switch", { name: SWITCH_NAME }))
        await page.user.click(
            within(screen.getByRole("dialog")).getByRole("button", { name: "Ligar aviso" })
        )

        expect(await within(noticeCard()).findByRole("alert")).toHaveTextContent(
            "Não foi possível salvar o aviso ao cidadão. Tente de novo."
        )
        expect(within(noticeCard()).getByRole("switch", { name: SWITCH_NAME })).toHaveAttribute(
            "aria-checked",
            "false"
        )
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    })

    it("avisa que o modelo não está aprovado só quando o aviso está ligado", async () => {
        const unapproved = {
            "GET /api/v1/whatsapp/settings/templates": () => ({
                status: 200,
                body: {
                    data: {
                        checkedAt: "2026-11-04T14:00:00.000Z",
                        templates: [
                            {
                                kind: "CANCELLATION",
                                name: "aviso_cancelamento",
                                languageCode: "pt_BR",
                                status: "PENDING",
                                metaStatus: "PENDING"
                            }
                        ]
                    }
                }
            })
        }
        await renderWhatsAppPage(
            unapproved,
            buildWhatsAppSettings({ cancellationNoticeEnabled: true })
        )

        expect(
            await within(noticeCard()).findByText(
                "Enquanto o modelo Aviso de cancelamento não for aprovado, os avisos não serão enviados."
            )
        ).toBeInTheDocument()
    })

    it("não mostra o alerta do modelo com o aviso desligado", async () => {
        await renderWhatsAppPage({
            "GET /api/v1/whatsapp/settings/templates": () => ({
                status: 200,
                body: {
                    data: {
                        checkedAt: "2026-11-04T14:00:00.000Z",
                        templates: [
                            {
                                kind: "CANCELLATION",
                                name: "aviso_cancelamento",
                                languageCode: "pt_BR",
                                status: "REJECTED",
                                metaStatus: "REJECTED"
                            }
                        ]
                    }
                }
            })
        })
        await screen.findByText("aviso_cancelamento")

        expect(
            within(noticeCard()).queryByText(/Enquanto o modelo Aviso de cancelamento/)
        ).not.toBeInTheDocument()
    })

    it("mostra quem alterou por último dentro do card", async () => {
        await renderWhatsAppPage()

        expect(within(noticeCard()).getByText(/Última alteração por Ana Paula/)).toBeInTheDocument()
    })
})

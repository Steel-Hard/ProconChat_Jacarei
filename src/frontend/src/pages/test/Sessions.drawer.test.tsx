import { screen, waitFor, within } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import buildSessionDetail, { buildTimelineItem } from "@/testUtils/buildSessionDetail"
import buildSessionList, { buildSessionItem } from "@/testUtils/buildSessionList"
import renderSessionsPage, { APPOINTMENT_HEADING } from "@/testUtils/renderSessionsPage"
import type PanelAccount from "@/types/account/PanelAccount.types"

vi.setConfig({ testTimeout: 30000 })

afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
    vi.resetModules()
})

const LIST = buildSessionList({
    items: [
        buildSessionItem({
            code: "S-A1B2C3D4",
            outcome: "SCHEDULED",
            appointment: { id: "42", protocol: "AB12CD34", action: "CREATED" }
        })
    ]
})

const SESSIONS_ONLY: PanelAccount = {
    id: 2,
    name: "Bruno Lima",
    email: "bruno@exemplo.gov.br",
    isAdmin: false,
    permissions: ["sessions.view"]
}

async function openDrawer(page: Awaited<ReturnType<typeof renderSessionsPage>>) {
    await page.loaded()
    await page.user.click(screen.getByRole("button", { name: "S-A1B2C3D4" }))

    return screen.findByRole("complementary", { name: "Detalhe da sessão" })
}

describe("Sessões: gaveta de detalhe", () => {
    it("abre numa gaveta com o código, o selo do desfecho e o início", async () => {
        const page = await renderSessionsPage({ list: LIST })
        const drawer = await openDrawer(page)

        await within(drawer).findByText("Iniciada em 10/11/2026 às 14:05")
        expect(within(drawer).getByText("S-A1B2C3D4")).toBeInTheDocument()
        expect(within(drawer).getByText("Terminou em agendamento")).toBeInTheDocument()
        expect(
            within(drawer).getByText(
                "Somente leitura. São registrados os passos percorridos, não o texto digitado pelo cidadão."
            )
        ).toBeInTheDocument()
        expect(screen.queryByRole("dialog")).toBeNull()
    })

    it("mostra a linha do tempo com os textos do protótipo e o selo de IA", async () => {
        const page = await renderSessionsPage({ list: LIST })
        const drawer = await openDrawer(page)

        const timeline = await within(drawer).findByRole("list", {
            name: "Linha do tempo da sessão"
        })
        const steps = within(timeline).getAllByRole("listitem")

        expect(steps.map((step) => within(step).getAllByText(/./)[0]?.textContent)).toEqual([
            "Início da conversa",
            "Categoria escolhida",
            "Pergunta escolhida",
            "Resposta entregue",
            "Agendamento oferecido",
            "Agendamento criado"
        ])
        expect(within(steps[1]!).getByText("Consumo")).toBeInTheDocument()
        expect(within(steps[3]!).getByText("Gerado com auxílio de IA")).toBeInTheDocument()
        expect(
            within(steps[3]!).getByText(
                "Resposta do FAQ oficial · Texto complementar gerado para contextualizar a resposta."
            )
        ).toBeInTheDocument()
        expect(
            within(steps[4]!).getByText(
                "Motivo: o cidadão respondeu que a dúvida não foi resolvida."
            )
        ).toBeInTheDocument()
        expect(within(steps[5]!).getByText("Protocolo AB12CD34")).toBeInTheDocument()
        expect(within(steps[0]!).getByText("14:05")).toBeInTheDocument()
    })

    it("mostra as outras conversas do número e abre a escolhida", async () => {
        const page = await renderSessionsPage({
            list: LIST,
            details: {
                "S-A1B2C3D4": buildSessionDetail(),
                "S-ZZ99YY88": buildSessionDetail({
                    code: "S-ZZ99YY88",
                    outcome: "MANAGED_APPOINTMENT",
                    appointment: { id: "42", protocol: "AB12CD34", action: "RESCHEDULED" },
                    timeline: [
                        buildTimelineItem("APPOINTMENT_CONSULTED", {
                            appointment: { id: "42", protocol: "AB12CD34" }
                        }),
                        buildTimelineItem("APPOINTMENT_RESCHEDULED", {
                            created_at: "2026-11-12T13:35:00.000Z",
                            data: {
                                from: "2026-11-20T13:00:00.000Z",
                                to: "2026-11-25T17:30:00.000Z"
                            }
                        })
                    ],
                    other_sessions: []
                })
            }
        })
        const drawer = await openDrawer(page)

        expect(await within(drawer).findByText("Outras conversas deste número")).toBeInTheDocument()
        expect(
            within(drawer).getByText(
                "Identificadas pelo mesmo número de WhatsApp, que não é exibido nem armazenado de forma legível."
            )
        ).toBeInTheDocument()
        expect(within(drawer).getByText("12/11/2026 às 10:30")).toBeInTheDocument()
        expect(
            within(drawer).getByText("Remarcou ou cancelou agendamento existente")
        ).toBeInTheDocument()

        await page.user.click(within(drawer).getByRole("button", { name: /S-ZZ99YY88/ }))

        await within(drawer).findByText("Remarcou de 20/11/2026 às 10:00 para 25/11/2026 às 14:30")
        expect(
            within(drawer).getByText(
                "Mesmo protocolo. Se estava Confirmado, voltou a Pendente sem responsável."
            )
        ).toBeInTheDocument()
        expect(within(drawer).getByText("Consultou o agendamento AB12CD34")).toBeInTheDocument()
        expect(within(drawer).getByText("Nenhuma outra conversa deste número.")).toBeInTheDocument()
        expect(
            within(drawer).getAllByRole("button", { name: "Abrir agendamento AB12CD34" })
        ).toHaveLength(1)
    })

    it("mostra o estado vazio das outras conversas numa sessão anonimizada", async () => {
        const page = await renderSessionsPage({
            list: LIST,
            details: {
                "S-A1B2C3D4": buildSessionDetail({ anonymized: true, other_sessions: [] })
            }
        })
        const drawer = await openDrawer(page)

        expect(
            await within(drawer).findByText("Nenhuma outra conversa deste número.")
        ).toBeInTheDocument()
    })

    it("abre o agendamento pelo botão do rodapé para quem tem Ver agendamentos", async () => {
        const page = await renderSessionsPage({ list: LIST })
        const drawer = await openDrawer(page)

        await within(drawer).findByText("Agendamento criado")
        const buttons = within(drawer).getAllByRole("button", {
            name: "Abrir agendamento AB12CD34"
        })

        expect(buttons).toHaveLength(2)
        await page.user.click(buttons[1]!)

        await screen.findByRole("heading", { name: APPOINTMENT_HEADING })
        expect(page.router.state.location.pathname).toBe("/agendamentos/42")
    })

    it("não oferece abrir o agendamento sem a permissão Ver agendamentos", async () => {
        const page = await renderSessionsPage({ list: LIST, account: SESSIONS_ONLY })
        const drawer = await openDrawer(page)

        await within(drawer).findByText("Agendamento criado")
        expect(within(drawer).queryByRole("button", { name: /Abrir agendamento/ })).toBeNull()
    })

    it("fecha pelo botão, pelo Esc e clicando fora", async () => {
        const page = await renderSessionsPage({ list: LIST })
        const drawer = await openDrawer(page)
        await within(drawer).findByText("Início da conversa")

        await page.user.click(within(drawer).getByRole("button", { name: "Fechar" }))
        expect(screen.queryByRole("complementary")).toBeNull()

        await openDrawer(page)
        await page.user.keyboard("{Escape}")
        await waitFor(() => expect(screen.queryByRole("complementary")).toBeNull())
    })

    it("avisa quando a sessão não carrega", async () => {
        const page = await renderSessionsPage({ list: LIST, details: {} })
        const drawer = await openDrawer(page)

        expect(await within(drawer).findByRole("alert")).toHaveTextContent(
            "Não foi possível carregar a sessão."
        )
    })

    it("mostra a etapa de parada e a espera do cidadão nas conversas sem desfecho final", async () => {
        const page = await renderSessionsPage({
            list: LIST,
            details: {
                "S-A1B2C3D4": buildSessionDetail({
                    outcome: "IN_PROGRESS",
                    current_step: "AWAITING_SLOT",
                    appointment: null,
                    timeline: [buildTimelineItem("STARTED")]
                })
            }
        })
        const drawer = await openDrawer(page)

        await within(drawer).findByText("Aguardando o cidadão")
        expect(within(drawer).getByText("Etapa atual: Na escolha do horário.")).toBeInTheDocument()
        expect(within(drawer).queryByRole("button", { name: /Abrir agendamento/ })).toBeNull()
    })
})

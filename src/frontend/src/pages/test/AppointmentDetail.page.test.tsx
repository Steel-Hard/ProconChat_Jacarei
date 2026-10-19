import { screen, waitFor, within } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import buildAppointmentDetail from "@/testUtils/buildAppointmentDetail"
import renderAppointmentDetailPage from "@/testUtils/renderAppointmentDetailPage"
import type AppointmentDetail from "@/types/appointments/AppointmentDetail.types"

vi.setConfig({ testTimeout: 20000 })

type Reply = { status: number; body?: unknown }

const DETAIL_PATH = "/api/v1/appointments/1"

function withDetail(detail: AppointmentDetail) {
    return renderAppointmentDetailPage({
        handlers: { [`GET ${DETAIL_PATH}`]: () => ({ status: 200, body: { data: detail } }) }
    })
}

function withReply(reply: () => Reply | Promise<Reply>, initialEntry = "/agendamentos/1") {
    return renderAppointmentDetailPage({
        initialEntry,
        handlers: { [`GET ${DETAIL_PATH}`]: reply }
    })
}

function section(name: string): HTMLElement {
    const heading = screen.getByRole("heading", { level: 2, name })
    const element = heading.closest("section")

    if (element === null) {
        throw new Error("seção não encontrada")
    }

    return element
}

function factValue(label: string): string | null {
    const term = screen.getAllByRole("term").find((item) => item.textContent === label)

    return term?.nextElementSibling?.textContent ?? null
}

afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
    vi.resetModules()
})

describe("AppointmentDetail.page: carregar e voltar", () => {
    it("pede o detalhe pelo id e mostra Carregando até a resposta", async () => {
        const reply = Promise.withResolvers<Reply>()
        const page = await withReply(() => reply.promise)

        expect(await screen.findByText("Carregando...")).toBeInTheDocument()
        await waitFor(() => expect(page.requests("GET", DETAIL_PATH)).toHaveLength(1))
        expect(document.title).toBe("Detalhe do agendamento - ProconChat")
        reply.resolve({ status: 200, body: { data: buildAppointmentDetail() } })
        expect(
            await screen.findByRole("heading", { level: 1, name: "Maria Fictícia" })
        ).toBeInTheDocument()
        expect(screen.queryByText("Carregando...")).not.toBeInTheDocument()
    })

    it("mostra o título da aba com o protocolo", async () => {
        await withDetail(buildAppointmentDetail())

        await screen.findByRole("heading", { level: 1, name: "Maria Fictícia" })

        await waitFor(() => expect(document.title).toBe("Agendamento F10464F0 - ProconChat"))
    })

    it("não chama a API com id que não é só de dígitos e mostra não encontrado", async () => {
        const page = await withReply(() => ({ status: 200 }), "/agendamentos/abc")

        expect(await screen.findByText("Agendamento não encontrado.")).toBeInTheDocument()
        expect(page.calls).toHaveLength(0)
        expect(screen.getByRole("button", { name: "Voltar para Agendamentos" })).toBeInTheDocument()
    })

    it.each([404, 400])("mostra não encontrado quando a API responde %i", async (status) => {
        await withReply(() => ({ status, body: { error: { code: "NOT_FOUND", message: "x" } } }))

        expect(await screen.findByText("Agendamento não encontrado.")).toBeInTheDocument()
        expect(screen.queryByRole("button", { name: "Tentar novamente" })).not.toBeInTheDocument()
    })

    it("mostra o erro de carregamento e Tentar novamente refaz o pedido", async () => {
        let attempt = 0
        const page = await withReply(() => {
            attempt += 1

            return attempt === 1
                ? { status: 500, body: { error: { code: "INTERNAL_ERROR", message: "x" } } }
                : { status: 200, body: { data: buildAppointmentDetail() } }
        })
        expect(
            await screen.findByText("Não foi possível carregar o agendamento.")
        ).toBeInTheDocument()

        await page.user.click(screen.getByRole("button", { name: "Tentar novamente" }))

        expect(
            await screen.findByRole("heading", { level: 1, name: "Maria Fictícia" })
        ).toBeInTheDocument()
        expect(page.requests("GET", DETAIL_PATH)).toHaveLength(2)
    })

    it("volta para a lista com os mesmos filtros quando veio dela", async () => {
        const page = await renderAppointmentDetailPage({
            initialEntry: {
                pathname: "/agendamentos/1",
                state: { from: { pathname: "/agendamentos", search: "?status=PENDING&page=2" } }
            }
        })
        await screen.findByRole("heading", { level: 1, name: "Maria Fictícia" })

        await page.user.click(screen.getByRole("button", { name: "Voltar para Agendamentos" }))

        expect(page.router.state.location.pathname).toBe("/agendamentos")
        expect(page.router.state.location.search).toBe("?status=PENDING&page=2")
    })

    it.each([
        ["sem origem", undefined],
        ["com origem fora da lista", { from: { pathname: "/sessoes", search: "?x=1" } }],
        ["com origem inválida", { from: { pathname: "/agendamentos", search: 3 } }]
    ])("volta para /agendamentos %s", async (_name, state) => {
        const page = await renderAppointmentDetailPage({
            initialEntry: { pathname: "/agendamentos/1", state }
        })
        await screen.findByRole("heading", { level: 1, name: "Maria Fictícia" })

        await page.user.click(screen.getByRole("button", { name: "Voltar para Agendamentos" }))

        expect(page.router.state.location.pathname).toBe("/agendamentos")
        expect(page.router.state.location.search).toBe("")
    })
})

describe("AppointmentDetail.page: cabeçalho e dados", () => {
    it("mostra protocolo, status, nome e a linha de datas no fuso de Brasília", async () => {
        await withDetail(buildAppointmentDetail())

        const name = await screen.findByRole("heading", { level: 1, name: "Maria Fictícia" })

        const header = name.closest("header")
        expect(header).not.toBeNull()
        const scope = within(header as HTMLElement)
        expect(scope.getByText("Protocolo F10464F0")).toBeInTheDocument()
        expect(scope.getByText("Pendente")).toBeInTheDocument()
        expect(
            scope.getByText(
                "Segunda-feira, 19/10/2026 às 08:00 · Criado pelo chatbot em 18/10/2026 às 10:46"
            )
        ).toBeInTheDocument()
        expect(scope.queryByText("Comparece por representante")).not.toBeInTheDocument()
        expect(scope.queryByText("Remarcado pelo cidadão")).not.toBeInTheDocument()
        expect(scope.queryByText("Fora da grade atual")).not.toBeInTheDocument()
    })

    it("mostra os selos de representante, remarcação e fora da grade", async () => {
        await withDetail(
            buildAppointmentDetail({
                by_representative: true,
                rescheduled_from: "2026-10-15T17:30:00.000Z",
                off_grid: true,
                status: "CONFIRMED"
            })
        )

        const name = await screen.findByRole("heading", { level: 1, name: "Maria Fictícia" })

        const scope = within(name.closest("header") as HTMLElement)
        expect(scope.getByText("Comparece por representante")).toBeInTheDocument()
        expect(scope.getByText("Remarcado pelo cidadão")).toBeInTheDocument()
        expect(scope.getByText("Fora da grade atual")).toBeInTheDocument()
        expect(factValue("Data original")).toBe("15/10/2026 às 14:30")
    })

    it.each(["ATTENDED", "NO_SHOW", "CANCELED"] as const)(
        "não mostra Fora da grade atual quando o status é %s",
        async (status) => {
            await withDetail(buildAppointmentDetail({ off_grid: true, status }))

            await screen.findByRole("heading", { level: 1, name: "Maria Fictícia" })

            expect(screen.queryByText("Fora da grade atual")).not.toBeInTheDocument()
        }
    )

    it("mostra os dados do agendamento de um pendente sem responsável", async () => {
        await withDetail(buildAppointmentDetail())

        await screen.findByRole("heading", { level: 1, name: "Maria Fictícia" })

        expect(section("Dados do agendamento")).toBeInTheDocument()
        expect(factValue("Titular")).toBe("Maria Fictícia")
        expect(factValue("CPF do titular")).toBe("***.982.247-**")
        expect(factValue("Data e hora")).toBe("19/10/2026 · 08:00")
        expect(factValue("Status")).toBe("Pendente")
        expect(factValue("Responsável")).toBe("Sem responsável")
        expect(factValue("Comparecimento")).toBe("Titular comparece")
        expect(factValue("Motivo do agendamento")).toBe(
            "O cidadão respondeu que a dúvida não foi resolvida"
        )
        expect(factValue("Origem no chatbot")).toBe(
            "Cobrança/Desconto Indevido → Prescrição de dívida"
        )
        expect(factValue("Data original")).toBeNull()
        expect(screen.queryByText(/outra pessoa comparecerá em seu nome/)).not.toBeInTheDocument()
    })

    it("mostra responsável, representante, motivo presencial e o aviso do titular", async () => {
        await withDetail(
            buildAppointmentDetail({
                status: "CONFIRMED",
                assigned_user_id: "2",
                assigned_user_name: "Bruno Lima",
                by_representative: true,
                reason: "REQUIRES_IN_PERSON"
            })
        )

        await screen.findByRole("heading", { level: 1, name: "Maria Fictícia" })

        expect(factValue("Responsável")).toBe("Bruno Lima")
        expect(factValue("Comparecimento")).toBe("Comparece por representante")
        expect(factValue("Motivo do agendamento")).toBe("A pergunta exige atendimento presencial")
        expect(
            screen.getByText(
                "O titular indicou no chatbot que outra pessoa comparecerá em seu nome. Nome e CPF acima são sempre do titular; confira os documentos exigidos para representante."
            )
        ).toBeInTheDocument()
    })

    it("não mostra nenhuma sequência de 11 dígitos na página", async () => {
        await withDetail(buildAppointmentDetail({ by_representative: true }))

        await screen.findByRole("heading", { level: 1, name: "Maria Fictícia" })

        expect(document.body.textContent).not.toMatch(/\d{11}/)
        expect(screen.queryByText(/f10464f0-81f5/)).not.toBeInTheDocument()
    })
})

describe("AppointmentDetail.page: documentos", () => {
    it("mostra a nota, o grupo do titular e o vazio da dúvida", async () => {
        await withDetail(buildAppointmentDetail())

        await screen.findByRole("heading", { level: 1, name: "Maria Fictícia" })

        const scope = within(section("Documentos solicitados pelo chatbot"))
        expect(
            scope.getByText(
                "Lista enviada ao cidadão em 18/10/2026 às 10:46, no momento do agendamento. Alterações posteriores na configuração não mudam esta lista."
            )
        ).toBeInTheDocument()
        const group = scope.getByRole("list", { name: "Quando o próprio titular comparece" })
        expect(
            within(group)
                .getAllByRole("listitem")
                .map((item) => item.textContent)
        ).toEqual(["RG ou outro documento oficial com foto", "CPF", "Comprovante de endereço"])
        expect(scope.getByText("Documentos úteis para esta dúvida")).toBeInTheDocument()
        expect(scope.getByText("Nenhum documento adicional para esta dúvida")).toBeInTheDocument()
        expect(scope.queryByText(/configuração atual de documentos/)).not.toBeInTheDocument()
    })

    it("mostra o grupo do representante, os da dúvida e o aviso de configuração diferente", async () => {
        await withDetail(
            buildAppointmentDetail({
                by_representative: true,
                documents_sent: { group: [], question: ["Fatura do cartão"] },
                is_documents_config_different: true
            })
        )

        await screen.findByRole("heading", { level: 1, name: "Maria Fictícia" })

        const scope = within(section("Documentos solicitados pelo chatbot"))
        expect(scope.getByText("Quando um representante comparece")).toBeInTheDocument()
        expect(scope.getByText("Nenhum documento nesta lista")).toBeInTheDocument()
        const question = scope.getByRole("list", { name: "Documentos úteis para esta dúvida" })
        expect(within(question).getByText("Fatura do cartão")).toBeInTheDocument()
        expect(
            scope.getByText(
                "A configuração atual de documentos é diferente desta lista. O cidadão foi orientado a trazer os itens abaixo."
            )
        ).toBeInTheDocument()
    })
})

describe("AppointmentDetail.page: linha do tempo e histórico", () => {
    it("mostra os passos na ordem, com hora e o rótulo de IA só no passo gerado", async () => {
        await withDetail(buildAppointmentDetail())

        await screen.findByRole("heading", { level: 1, name: "Maria Fictícia" })

        const scope = within(section("Linha do tempo da conversa de origem"))
        expect(
            scope.getByText(
                "O sistema registra apenas os passos percorridos, não o texto digitado pelo cidadão."
            )
        ).toBeInTheDocument()
        const steps = scope.getAllByRole("listitem")
        expect(steps).toHaveLength(3)
        expect(within(steps[0]).getByText("Início da conversa")).toBeInTheDocument()
        expect(within(steps[0]).getByText("10:46")).toBeInTheDocument()
        expect(within(steps[0]).queryByText("Gerado com auxílio de IA")).not.toBeInTheDocument()
        expect(within(steps[1]).getByText("Resposta entregue")).toBeInTheDocument()
        expect(
            within(steps[1]).getByText("Texto complementar gerado para contextualizar a resposta.")
        ).toBeInTheDocument()
        expect(within(steps[1]).getByText("Gerado com auxílio de IA")).toBeInTheDocument()
        expect(within(steps[2]).getByText("Protocolo F10464F0")).toBeInTheDocument()
    })

    it("mostra Passo registrado para um tipo desconhecido", async () => {
        await withDetail(
            buildAppointmentDetail({
                timeline: [
                    {
                        id: "1",
                        type: "NEW_STEP",
                        created_at: "2026-10-18T13:46:04.464Z",
                        generated_by_ai: false,
                        data: { category_title: "x" }
                    }
                ]
            })
        )

        await screen.findByRole("heading", { level: 1, name: "Maria Fictícia" })

        const step = within(section("Linha do tempo da conversa de origem")).getByRole("listitem")
        expect(step).toHaveTextContent("Passo registrado10:46")
    })

    it("mostra o aviso de passos indisponíveis com a linha do tempo vazia", async () => {
        await withDetail(buildAppointmentDetail({ timeline: [] }))

        await screen.findByRole("heading", { level: 1, name: "Maria Fictícia" })

        expect(
            screen.getByText("Os passos desta conversa não estão disponíveis.")
        ).toBeInTheDocument()
    })

    it("mostra o histórico na ordem recebida, com data e hora e o destaque da falha", async () => {
        await withDetail(
            buildAppointmentDetail({
                status: "CONFIRMED",
                events: [
                    {
                        id: "4",
                        type: "CITIZEN_NOTIFICATION_FAILED",
                        actor_user_id: null,
                        actor_user_name: null,
                        data: {},
                        created_at: "2026-10-19T12:00:00.000Z"
                    },
                    {
                        id: "3",
                        type: "BRAND_NEW",
                        actor_user_id: null,
                        actor_user_name: null,
                        data: {},
                        created_at: "2026-10-19T11:30:00.000Z"
                    },
                    {
                        id: "2",
                        type: "CLAIMED",
                        actor_user_id: "1",
                        actor_user_name: "Admin",
                        data: { auto_claimed: true },
                        created_at: "2026-10-18T13:47:00.000Z"
                    },
                    {
                        id: "1",
                        type: "CREATED",
                        actor_user_id: null,
                        actor_user_name: null,
                        data: {},
                        created_at: "2026-10-18T13:46:05.141Z"
                    }
                ] as AppointmentDetail["events"]
            })
        )

        await screen.findByRole("heading", { level: 1, name: "Maria Fictícia" })

        const items = within(section("Histórico")).getAllByRole("listitem")
        expect(items.map((item) => item.textContent)).toEqual([
            "Falha ao avisar o cidadão pelo WhatsApp19/10/2026 às 09:00",
            "Evento registrado19/10/2026 às 08:30",
            "Assumido automaticamente por Admin · Confirmado18/10/2026 às 10:47",
            "Criado pelo chatbot como Pendente18/10/2026 às 10:46"
        ])
        expect(items[0]).toHaveAttribute("data-highlight", "true")
        expect(within(section("Histórico")).queryByRole("button")).not.toBeInTheDocument()
    })
})

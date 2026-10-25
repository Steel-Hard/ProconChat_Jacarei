import { fireEvent, screen, waitFor, within } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import buildScheduleConfig from "@/testUtils/buildScheduleConfig"
import NAV_ITEMS_ALL_READY from "@/testUtils/navItemsAllReady"
import renderSchedulePage from "@/testUtils/renderSchedulePage"

vi.setConfig({ testTimeout: 20000 })

const SLOW = { timeout: 10000 }

const SAVED = buildScheduleConfig({
    ranges: [
        { weekday: 1, slotIndex: 1, startTime: "08:30", endTime: "12:00" },
        { weekday: 1, slotIndex: 2, startTime: "13:30", endTime: "16:30" },
        ...buildScheduleConfig().ranges.filter((range) => range.weekday !== 1)
    ],
    blockedDates: [
        ...buildScheduleConfig().blockedDates,
        { date: "2026-11-20", startTime: null, endTime: null, description: "Consciência Negra" }
    ],
    updatedBy: { id: 2, name: "Bruno Lima" },
    updatedAt: "2026-10-24T15:00:00.000Z"
})

afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
})

async function loaded(options: Parameters<typeof renderSchedulePage>[0] = {}) {
    const page = await renderSchedulePage(options)
    await screen.findByRole("checkbox", { name: "Segunda-feira" }, SLOW)

    return page
}

describe("SchedulePage", () => {
    it("mostra o carregamento e depois as seções com a última alteração", async () => {
        await renderSchedulePage()

        expect(screen.getByText("Carregando...")).toBeInTheDocument()
        expect(
            await screen.findByRole("heading", { name: "Grade semanal" }, SLOW)
        ).toBeInTheDocument()
        expect(
            screen.getByText("Última alteração por Ana Paula Souza em 20/10/2026")
        ).toBeInTheDocument()
        ;[
            "Janela de agendamento",
            "Dados da unidade",
            "Datas bloqueadas",
            "Prévia da grade"
        ].forEach((name) => expect(screen.getByRole("heading", { name })).toBeInTheDocument())
        expect(screen.getByLabelText("Duração de cada atendimento")).toHaveValue("30")
        expect(screen.getByLabelText("Endereço da unidade")).toHaveValue(
            "Av. Nove de Julho, 215 - Centro, Jacareí - SP"
        )
    })

    it("mostra o erro do GET sem formulário", async () => {
        await renderSchedulePage({
            handlers: {
                "GET /api/v1/schedule": () => ({
                    status: 500,
                    body: { error: { code: "SCHEDULE_NOT_CONFIGURED", message: "x" } }
                })
            }
        })

        expect(await screen.findByRole("alert", {}, SLOW)).toHaveTextContent(
            "Não foi possível carregar os horários de atendimento."
        )
        expect(screen.queryByRole("heading", { name: "Grade semanal" })).not.toBeInTheDocument()
    })

    it("edita a faixa, adiciona um bloqueio, salva o corpo completo e mostra o toast", async () => {
        const { user, callsTo } = await loaded({
            handlers: { "PUT /api/v1/schedule": () => ({ status: 200, body: { data: SAVED } }) }
        })

        fireEvent.change(screen.getByLabelText("Fim da faixa 1 de Segunda-feira"), {
            target: { value: "12:00" }
        })
        fireEvent.change(screen.getByLabelText("Data"), { target: { value: "2026-11-20" } })
        fireEvent.change(screen.getByLabelText("Descrição"), {
            target: { value: "Consciência Negra" }
        })
        await user.click(screen.getByRole("button", { name: "Adicionar" }))
        expect(screen.getByRole("button", { name: "2 alterações não salvas" })).toBeInTheDocument()
        await user.click(screen.getByRole("button", { name: "Salvar alterações" }))

        expect(
            await screen.findByText(
                "Horários salvos. O chatbot passa a oferecer a nova grade.",
                {},
                SLOW
            )
        ).toBeInTheDocument()
        const [put] = callsTo("PUT", "/api/v1/schedule")
        expect(put.body).toMatchObject({
            ranges: expect.arrayContaining([{ weekday: 1, startTime: "08:30", endTime: "12:00" }]),
            blockedDates: [
                SAVED.blockedDates[0],
                {
                    date: "2026-11-20",
                    startTime: null,
                    endTime: null,
                    description: "Consciência Negra"
                }
            ]
        })
        expect(
            screen.getByText("Última alteração por Bruno Lima em 24/10/2026")
        ).toBeInTheDocument()
        expect(
            screen.queryByRole("button", { name: /alteraç(ão|ões) não salvas?/ })
        ).not.toBeInTheDocument()
    })

    it("lista as alterações pendentes e descarta sem chamar a API", async () => {
        const { user, calls, callsTo } = await loaded()

        await user.selectOptions(screen.getByLabelText("Duração de cada atendimento"), "60")
        await user.type(screen.getByLabelText("Complemento ou referência (opcional)"), "A")
        await user.hover(screen.getByRole("button", { name: "2 alterações não salvas" }))
        expect(screen.getByRole("tooltip")).toHaveTextContent("Pendentes: duração; complemento")
        await waitFor(
            () =>
                expect(
                    callsTo("POST", "/api/v1/schedule/preview").some(
                        (call) =>
                            (call.body as { config: { unitAddressComplement: string } }).config
                                .unitAddressComplement === "Sala 2A"
                    )
                ).toBe(true),
            SLOW
        )
        const before = calls.length
        await user.click(screen.getByRole("button", { name: "Descartar" }))

        expect(screen.getByLabelText("Duração de cada atendimento")).toHaveValue("30")
        expect(screen.queryByRole("button", { name: "Descartar" })).not.toBeInTheDocument()
        expect(calls.slice(before).filter((call) => call.method !== "GET")).toEqual([])
    })

    it("mostra o erro na faixa e não deixa salvar", async () => {
        const { user, callsTo } = await loaded()

        fireEvent.change(screen.getByLabelText("Fim da faixa 1 de Segunda-feira"), {
            target: { value: "08:00" }
        })
        await user.click(screen.getByRole("button", { name: "Salvar alterações" }))

        expect(screen.getByText("O fim deve ser depois do início")).toBeInTheDocument()
        expect(screen.getByRole("button", { name: "Salvar alterações" })).toBeDisabled()
        expect(screen.getByText("1 campo com erro. Corrija para salvar.")).toBeInTheDocument()
        expect(callsTo("PUT", "/api/v1/schedule")).toEqual([])
    })

    it("esconde + Faixa no dia com 3 faixas", async () => {
        const { user } = await loaded()

        await user.click(screen.getByRole("button", { name: "Adicionar faixa em Segunda-feira" }))

        expect(screen.getByLabelText("Início da faixa 3 de Segunda-feira")).toHaveValue("13:30")
        expect(
            screen.queryByRole("button", { name: "Adicionar faixa em Segunda-feira" })
        ).not.toBeInTheDocument()
    })

    it("mostra a mensagem comum no 403 INVALID_ORIGIN", async () => {
        const { user } = await loaded({
            handlers: {
                "PUT /api/v1/schedule": () => ({
                    status: 403,
                    body: { error: { code: "INVALID_ORIGIN", message: "x" } }
                })
            }
        })

        await user.clear(screen.getByLabelText("Vagas simultâneas por horário"))
        await user.type(screen.getByLabelText("Vagas simultâneas por horário"), "3")
        await user.click(screen.getByRole("button", { name: "Salvar alterações" }))

        expect(await screen.findByRole("alert", {}, SLOW)).toHaveTextContent(
            "O painel foi aberto por um endereço não autorizado."
        )
    })

    it("mostra o link de Conteúdo nas duas seções só quando a conta pode e a tela está pronta", async () => {
        await loaded()

        expect(screen.getAllByRole("link", { name: "Revisar Conteúdo →" })).toHaveLength(2)
    })

    it("esconde o link de Conteúdo enquanto a tela de Conteúdo não está pronta", async () => {
        await loaded({ ready: { ...NAV_ITEMS_ALL_READY, content: false } })

        expect(screen.queryByRole("link", { name: "Revisar Conteúdo →" })).not.toBeInTheDocument()
        expect(
            screen.getAllByText(
                "Se você mudar horários ou endereço, revise as perguntas do Conteúdo que citam essas informações."
            )
        ).toHaveLength(2)
    })

    it("não mostra a seção do lembrete até o envio existir", async () => {
        await loaded()

        expect(
            screen.queryByRole("heading", { name: "Lembrete ao cidadão" })
        ).not.toBeInTheDocument()
        expect(
            screen.queryByRole("checkbox", { name: "Enviar lembrete ao cidadão" })
        ).not.toBeInTheDocument()
        expect(screen.queryByText("Prévia da mensagem")).not.toBeInTheDocument()
        expect(
            screen.queryByText(
                "Cada lembrete é uma mensagem de modelo e tem custo por mensagem cobrado pela Meta."
            )
        ).not.toBeInTheDocument()
    })

    it.each([
        [true, 48],
        [false, 2]
    ] as const)(
        "preserva no PUT o lembrete ligado=%s com %i horas como veio do GET, sem contar alteração",
        async (reminderEnabled, reminderHours) => {
            const config = buildScheduleConfig({ reminderEnabled, reminderHours })
            const { user, callsTo } = await loaded({
                handlers: {
                    "GET /api/v1/schedule": () => ({ status: 200, body: { data: config } }),
                    "PUT /api/v1/schedule": () => ({ status: 200, body: { data: config } })
                }
            })

            await user.clear(screen.getByLabelText("Vagas simultâneas por horário"))
            await user.type(screen.getByLabelText("Vagas simultâneas por horário"), "3")
            await user.hover(screen.getByRole("button", { name: "1 alteração não salva" }))
            expect(screen.getByRole("tooltip")).toHaveTextContent("Pendentes: vagas")
            await user.click(screen.getByRole("button", { name: "Salvar alterações" }))

            await waitFor(() => expect(callsTo("PUT", "/api/v1/schedule")).toHaveLength(1), SLOW)
            expect(callsTo("PUT", "/api/v1/schedule")[0].body).toMatchObject({
                seatsPerSlot: 3,
                reminderEnabled,
                reminderHours
            })
        }
    )

    it("não grava nada da tela no navegador", async () => {
        const { user } = await loaded()

        await user.selectOptions(screen.getByLabelText("Duração de cada atendimento"), "60")

        expect(localStorage.length).toBe(0)
        expect(sessionStorage.length).toBe(0)
        expect(document.cookie).toBe("")
    })

    it("mostra a lista de bloqueios com dia da semana de São Paulo", async () => {
        await loaded()

        const list = screen.getByRole("heading", { name: "Datas bloqueadas" })
            .parentElement as HTMLElement
        expect(within(list).getByText("02/11/2026")).toBeInTheDocument()
        expect(within(list).getByText("Segunda-feira")).toBeInTheDocument()
        expect(within(list).getByText("Dia inteiro")).toBeInTheDocument()
    })
})

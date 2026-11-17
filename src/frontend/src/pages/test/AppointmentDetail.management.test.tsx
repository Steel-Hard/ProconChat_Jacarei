import { screen, within } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import buildAppointmentDetail from "@/testUtils/buildAppointmentDetail"
import renderAppointmentDetailPage from "@/testUtils/renderAppointmentDetailPage"
import type AppointmentDetail from "@/types/appointments/AppointmentDetail.types"

vi.setConfig({ testTimeout: 20000 })

const DETAIL_PATH = "/api/v1/appointments/1"
const STATUS_PATH = `${DETAIL_PATH}/status`

function detailWithActions(
    overrides: Partial<AppointmentDetail>,
    actions: Partial<AppointmentDetail["available_actions"]>
): AppointmentDetail {
    const base = buildAppointmentDetail()
    return buildAppointmentDetail({
        ...overrides,
        available_actions: { ...base.available_actions, ...actions }
    })
}

afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
    vi.resetModules()
})

describe("AppointmentDetail.page: atribuição, correção e observações", () => {
    it.each([
        [
            "RESPONSIBLE_BUSY",
            { conflictingProtocol: "AG-0099", freeStaffCount: 0 },
            "Registro corrigido. O agendamento voltou a Pendente sem responsável, porque o responsável anterior já tem outro agendamento neste horário (protocolo AG-0099). Ninguém está livre neste horário no momento."
        ],
        [
            "RESPONSIBLE_BUSY",
            { conflictingProtocol: "AG-0099", freeStaffCount: 1 },
            "Registro corrigido. O agendamento voltou a Pendente sem responsável, porque o responsável anterior já tem outro agendamento neste horário (protocolo AG-0099). Há 1 funcionário livre neste horário."
        ],
        [
            "RESPONSIBLE_BUSY",
            { conflictingProtocol: "AG-0099", freeStaffCount: 3 },
            "Registro corrigido. O agendamento voltou a Pendente sem responsável, porque o responsável anterior já tem outro agendamento neste horário (protocolo AG-0099). Há 3 funcionários livres neste horário."
        ],
        [
            "RESPONSIBLE_UNAVAILABLE",
            { freeStaffCount: 0 },
            "Registro corrigido. O agendamento voltou a Pendente sem responsável, porque o responsável anterior não pode mais assumir (conta desativada ou sem Gerenciar agendamentos). Ninguém está livre neste horário no momento."
        ],
        [
            "RESPONSIBLE_UNAVAILABLE",
            { freeStaffCount: 2 },
            "Registro corrigido. O agendamento voltou a Pendente sem responsável, porque o responsável anterior não pode mais assumir (conta desativada ou sem Gerenciar agendamentos). Funcionários livres neste horário: 2."
        ]
    ])(
        "corrige o registro com aviso %s e deixa o aviso na caixa Ações",
        async (code, details, text) => {
            const detail = detailWithActions(
                { status: "ATTENDED" },
                { correct_record: { allowed: true, code: null } }
            )
            const page = await renderAppointmentDetailPage({
                handlers: {
                    [`GET ${DETAIL_PATH}`]: () => ({ status: 200, body: { data: detail } }),
                    [`PATCH ${STATUS_PATH}`]: () => ({
                        status: 200,
                        body: { data: detail, warning: { code, details } }
                    })
                }
            })

            await page.user.click(await screen.findByRole("button", { name: "Corrigir registro" }))
            const dialog = screen.getByRole("dialog", { name: "Corrigir registro do agendamento?" })
            await page.user.click(within(dialog).getByRole("button", { name: "Corrigir registro" }))

            const box = within(
                screen.getByRole("heading", { level: 2, name: "Ações" }).closest("section")!
            )
            expect(await box.findByRole("status")).toHaveTextContent(text)
            expect(screen.getAllByText(/Registro corrigido/)).toHaveLength(1)
            expect(page.requests("PATCH", STATUS_PATH)[0]?.body).toEqual({
                action: "correct_record"
            })
        }
    )

    it.each([
        [
            "com responsável",
            { assigned_user_name: "Ana Paula Souza", status: "CONFIRMED" as const },
            "Registro corrigido. O agendamento voltou a Confirmado com Ana Paula Souza."
        ],
        [
            "sem responsável",
            { assigned_user_name: null, status: "PENDING" as const },
            "Registro corrigido. O agendamento voltou a Pendente."
        ]
    ])("corrige o registro sem aviso %s", async (_case, after, text) => {
        const before = detailWithActions(
            { status: "ATTENDED" },
            { correct_record: { allowed: true, code: null } }
        )
        const page = await renderAppointmentDetailPage({
            handlers: {
                [`GET ${DETAIL_PATH}`]: () => ({ status: 200, body: { data: before } }),
                [`PATCH ${STATUS_PATH}`]: () => ({
                    status: 200,
                    body: { data: { ...before, ...after } }
                })
            }
        })

        await page.user.click(await screen.findByRole("button", { name: "Corrigir registro" }))
        const dialog = screen.getByRole("dialog", { name: "Corrigir registro do agendamento?" })
        await page.user.click(within(dialog).getByRole("button", { name: "Corrigir registro" }))

        const box = within(
            screen.getByRole("heading", { level: 2, name: "Ações" }).closest("section")!
        )
        expect(await box.findByRole("status")).toHaveTextContent(text)
    })

    it("mostra cada observação com autor e data, sem editar nem excluir, e salva uma nova", async () => {
        const detail = detailWithActions(
            {
                notes: [
                    {
                        id: "9",
                        author_user_id: "1",
                        author_user_name: "Ana Paula Souza",
                        text: "Cidadão trouxe os documentos.",
                        created_at: "2026-10-19T13:00:00.000Z"
                    }
                ]
            },
            { add_note: { allowed: true, code: null } }
        )
        const page = await renderAppointmentDetailPage({
            handlers: {
                [`GET ${DETAIL_PATH}`]: () => ({ status: 200, body: { data: detail } }),
                [`POST ${DETAIL_PATH}/notes`]: () => ({
                    status: 201,
                    body: { data: detail }
                })
            }
        })

        await screen.findByText("Cidadão trouxe os documentos.")
        expect(screen.getByText("Ana Paula Souza")).toBeInTheDocument()
        expect(screen.getByText("19/10/2026 10:00")).toBeInTheDocument()
        expect(screen.queryByText(/Autor:/)).toBeNull()
        expect(screen.queryByRole("button", { name: /editar observação/i })).not.toBeInTheDocument()
        expect(
            screen.queryByRole("button", { name: /excluir observação/i })
        ).not.toBeInTheDocument()

        const field = screen.getByPlaceholderText("Visível apenas para a equipe do PROCON")
        await page.user.type(field, "Novo registro")
        await page.user.click(screen.getByRole("button", { name: "Salvar observação" }))

        expect(await screen.findByText("Observação adicionada.")).toBeInTheDocument()
        expect(page.requests("POST", `${DETAIL_PATH}/notes`)[0]?.body).toEqual({
            text: "Novo registro"
        })
    })

    it("mostra Conta removida quando a observação não tem autor", async () => {
        const detail = detailWithActions(
            {
                notes: [
                    {
                        id: "9",
                        author_user_id: "1",
                        author_user_name: null,
                        text: "Nota antiga.",
                        created_at: "2026-10-19T13:00:00.000Z"
                    }
                ]
            },
            {}
        )
        await renderAppointmentDetailPage({
            handlers: { [`GET ${DETAIL_PATH}`]: () => ({ status: 200, body: { data: detail } }) }
        })

        await screen.findByText("Nota antiga.")
        expect(screen.getByText("Conta removida")).toBeInTheDocument()
        expect(screen.queryByText("Autor")).toBeNull()
    })

    it("avisa quando não há observações e esconde o campo para conta só de leitura", async () => {
        await renderAppointmentDetailPage({
            handlers: {
                [`GET ${DETAIL_PATH}`]: () => ({
                    status: 200,
                    body: { data: buildAppointmentDetail() }
                })
            }
        })

        expect(await screen.findByText("Nenhuma observação registrada.")).toBeInTheDocument()
        expect(screen.queryByPlaceholderText("Visível apenas para a equipe do PROCON")).toBeNull()
        expect(screen.queryByRole("button", { name: "Salvar observação" })).toBeNull()
    })
})

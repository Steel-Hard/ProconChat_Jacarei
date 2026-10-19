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

const PENDING = buildAppointmentDetail()

const CLAIMED: AppointmentDetail = buildAppointmentDetail({
    status: "CONFIRMED",
    assigned_user_id: "1",
    assigned_user_name: "Ana Paula Souza",
    events: [
        {
            id: "2",
            type: "CLAIMED",
            actor_user_id: "1",
            actor_user_name: "Ana Paula Souza",
            data: {},
            created_at: "2026-10-18T14:00:00.000Z"
        },
        ...PENDING.events
    ],
    available_actions: {
        claim: { allowed: false, code: "APPOINTMENT_ALREADY_CLAIMED" },
        attended: { allowed: false, code: "ATTENDANCE_NOT_YET_AVAILABLE" },
        no_show: { allowed: false, code: "NO_SHOW_NOT_YET_AVAILABLE" }
    }
})

const DUE = buildAppointmentDetail({
    available_actions: {
        claim: { allowed: true, code: null },
        attended: { allowed: true, code: null },
        no_show: { allowed: true, code: null }
    }
})

function ok(detail: AppointmentDetail): Reply {
    return { status: 200, body: { data: detail } }
}

function failure(status: number, code: string): Reply {
    return { status, body: { error: { code, message: "x" } } }
}

async function renderActions(detail: Handler | AppointmentDetail, patch: Handler) {
    const page = await renderAppointmentDetailPage({
        handlers: {
            [`GET ${DETAIL_PATH}`]: typeof detail === "function" ? detail : () => ok(detail),
            [`PATCH ${STATUS_PATH}`]: patch
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

describe("AppointmentDetail.page: botões e mensagens", () => {
    it("mostra Assumir e as mensagens de ainda não disponível de um pendente futuro", async () => {
        await renderActions(PENDING, () => ok(CLAIMED))

        const box = actionsBox()
        expect(box.getByRole("button", { name: "Assumir para mim" })).toBeInTheDocument()
        expect(box.queryByRole("button", { name: "Marcar como atendido" })).not.toBeInTheDocument()
        expect(
            box.getByText("Marcar como atendido: disponível a partir do dia do atendimento.")
        ).toBeInTheDocument()
        expect(
            box.getByText(
                "Marcar como não compareceu: disponível depois do horário do atendimento."
            )
        ).toBeInTheDocument()
        expect(
            box.getByText(
                "A data não pode ser alterada pelo painel. Remarcações são feitas pelo cidadão no chatbot."
            )
        ).toBeInTheDocument()
    })

    it("mostra os três botões quando todas as ações estão liberadas", async () => {
        await renderActions(DUE, () => ok(CLAIMED))

        const box = actionsBox()
        expect(box.getAllByRole("button").map((button: HTMLElement) => button.textContent)).toEqual(
            ["Assumir para mim", "Marcar como atendido", "Marcar como não compareceu"]
        )
        expect(box.queryByText(/disponível/)).not.toBeInTheDocument()
    })

    it("esconde sem mensagem as ações recusadas por status", async () => {
        await renderActions(CLAIMED, () => ok(CLAIMED))

        const box = actionsBox()
        expect(box.queryByRole("button", { name: "Assumir para mim" })).not.toBeInTheDocument()
        expect(box.queryByText(/outra pessoa já assumiu/i)).not.toBeInTheDocument()
    })

    it.each([
        ["ATTENDED", "ALREADY_ATTENDED", "Atendimento concluído."],
        ["NO_SHOW", "ALREADY_NO_SHOW", "O cidadão não compareceu ao atendimento."],
        [
            "CANCELED",
            "APPOINTMENT_CANCELED",
            "Agendamento cancelado. O horário foi liberado no chatbot."
        ]
    ] as const)("mostra o texto final do status %s sem botões", async (status, code, text) => {
        await renderActions(
            buildAppointmentDetail({
                status,
                available_actions: {
                    claim: { allowed: false, code },
                    attended: { allowed: false, code },
                    no_show: { allowed: false, code }
                }
            }),
            () => ok(CLAIMED)
        )

        const box = actionsBox()
        expect(box.getByText(text)).toBeInTheDocument()
        expect(box.queryAllByRole("button")).toHaveLength(0)
        expect(box.queryByText(/disponível/)).not.toBeInTheDocument()
    })
})

describe("AppointmentDetail.page: confirmação", () => {
    it("abre a confirmação de Assumir e cancelar não envia nada", async () => {
        const page = await renderActions(PENDING, () => ok(CLAIMED))

        await page.user.click(screen.getByRole("button", { name: "Assumir para mim" }))

        const dialog = screen.getByRole("dialog", { name: "Assumir este agendamento?" })
        expect(
            within(dialog).getByText(
                "O agendamento F10464F0 passa a Confirmado, com você como responsável."
            )
        ).toBeInTheDocument()
        await page.user.click(within(dialog).getByRole("button", { name: "Voltar" }))
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
        expect(page.requests("PATCH", STATUS_PATH)).toHaveLength(0)
    })

    it.each([
        [
            "Marcar como atendido",
            "Marcar como atendido?",
            "O agendamento F10464F0 passa a Atendido."
        ],
        [
            "Marcar como não compareceu",
            "Marcar como não compareceu?",
            "O agendamento F10464F0 passa a Não compareceu."
        ]
    ])("num pendente, %s avisa que também assume", async (button, title, description) => {
        const page = await renderActions(DUE, () => ok(CLAIMED))

        await page.user.click(screen.getByRole("button", { name: button }))

        const dialog = screen.getByRole("dialog", { name: title })
        expect(
            within(dialog).getByText(`${description} Ele também será assumido por você.`)
        ).toBeInTheDocument()
        expect(within(dialog).getByRole("button", { name: button })).toBeInTheDocument()
    })

    it("num confirmado, Marcar como atendido não fala em assumir", async () => {
        const confirmed = buildAppointmentDetail({
            ...CLAIMED,
            available_actions: { ...DUE.available_actions, claim: CLAIMED.available_actions.claim }
        })
        const page = await renderActions(confirmed, () => ok(confirmed))

        await page.user.click(screen.getByRole("button", { name: "Marcar como atendido" }))

        const dialog = screen.getByRole("dialog", { name: "Marcar como atendido?" })
        expect(
            within(dialog).getByText("O agendamento F10464F0 passa a Atendido.")
        ).toBeInTheDocument()
    })
})

describe("AppointmentDetail.page: envio", () => {
    it("assume, atualiza a tela pela resposta e não pede o detalhe de novo", async () => {
        const reply = Promise.withResolvers<Reply>()
        const page = await renderActions(PENDING, () => reply.promise)
        await page.user.click(screen.getByRole("button", { name: "Assumir para mim" }))
        const dialog = screen.getByRole("dialog")

        await page.user.click(within(dialog).getByRole("button", { name: "Assumir para mim" }))

        expect(within(dialog).getByRole("button", { name: "Assumir para mim" })).toBeDisabled()
        reply.resolve(ok(CLAIMED))
        expect(
            await screen.findByText("Assumido por Ana Paula Souza · Confirmado")
        ).toBeInTheDocument()
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
        expect(screen.getByText("Agendamento F10464F0 assumido por você.")).toBeInTheDocument()
        expect(screen.getAllByText("Confirmado").length).toBeGreaterThan(0)
        expect(screen.getAllByText("Ana Paula Souza").length).toBeGreaterThan(0)
        expect(screen.queryByRole("button", { name: "Assumir para mim" })).not.toBeInTheDocument()
        expect(page.requests("GET", DETAIL_PATH)).toHaveLength(1)
        expect(page.requests("PATCH", STATUS_PATH)).toHaveLength(1)
        expect(page.requests("PATCH", STATUS_PATH)[0].body).toEqual({ action: "claim" })
    })

    it.each([
        ["Marcar como atendido", "attended", "F10464F0 marcado como atendido."],
        ["Marcar como não compareceu", "no_show", "F10464F0 marcado como não compareceu."]
    ])("%s envia a ação e avisa o sucesso", async (button, action, toast) => {
        const page = await renderActions(DUE, () =>
            ok(buildAppointmentDetail({ status: "ATTENDED" }))
        )
        await page.user.click(screen.getByRole("button", { name: button }))

        await page.user.click(
            within(screen.getByRole("dialog")).getByRole("button", { name: button })
        )

        expect(await screen.findByText(toast)).toBeInTheDocument()
        expect(page.requests("PATCH", STATUS_PATH)[0].body).toEqual({ action })
    })

    it("envia um PATCH só com dois cliques em confirmar", async () => {
        const reply = Promise.withResolvers<Reply>()
        const page = await renderActions(PENDING, () => reply.promise)
        await page.user.click(screen.getByRole("button", { name: "Assumir para mim" }))
        const confirm = within(screen.getByRole("dialog")).getByRole("button", {
            name: "Assumir para mim"
        })

        await page.user.dblClick(confirm)

        reply.resolve(ok(CLAIMED))
        await screen.findByText("Agendamento F10464F0 assumido por você.")
        expect(page.requests("PATCH", STATUS_PATH)).toHaveLength(1)
    })

    it("não fecha a confirmação com Esc enquanto envia", async () => {
        const reply = Promise.withResolvers<Reply>()
        const page = await renderActions(PENDING, () => reply.promise)
        await page.user.click(screen.getByRole("button", { name: "Assumir para mim" }))
        await page.user.click(
            within(screen.getByRole("dialog")).getByRole("button", { name: "Assumir para mim" })
        )

        await page.user.keyboard("{Escape}")

        expect(screen.getByRole("dialog")).toBeInTheDocument()
        reply.resolve(ok(CLAIMED))
        await screen.findByText("Agendamento F10464F0 assumido por você.")
    })
})

describe("AppointmentDetail.page: erros da ação", () => {
    it("com 409 relê o detalhe, fecha a confirmação e mostra quem assumiu e o motivo", async () => {
        const taken = buildAppointmentDetail({
            ...CLAIMED,
            assigned_user_name: "Bruno Lima",
            events: [{ ...CLAIMED.events[0], actor_user_name: "Bruno Lima" }, ...PENDING.events]
        })
        let reads = 0
        const page = await renderActions(
            () => {
                reads += 1

                return ok(reads === 1 ? PENDING : taken)
            },
            () => failure(409, "APPOINTMENT_ALREADY_CLAIMED")
        )
        await page.user.click(screen.getByRole("button", { name: "Assumir para mim" }))

        await page.user.click(
            within(screen.getByRole("dialog")).getByRole("button", { name: "Assumir para mim" })
        )

        expect(await screen.findByRole("alert")).toHaveTextContent(
            "Outra pessoa já assumiu este agendamento."
        )
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
        expect(page.requests("GET", DETAIL_PATH)).toHaveLength(2)
        expect(screen.getByText("Assumido por Bruno Lima · Confirmado")).toBeInTheDocument()
    })

    it("com 500 espera reler o detalhe antes de mostrar o erro", async () => {
        const second = Promise.withResolvers<Reply>()
        let reads = 0
        const page = await renderActions(
            () => {
                reads += 1

                return reads === 1 ? ok(PENDING) : second.promise
            },
            () => failure(500, "INTERNAL_ERROR")
        )
        await page.user.click(screen.getByRole("button", { name: "Assumir para mim" }))

        await page.user.click(
            within(screen.getByRole("dialog")).getByRole("button", { name: "Assumir para mim" })
        )

        await waitFor(() => expect(page.requests("GET", DETAIL_PATH)).toHaveLength(2))
        expect(screen.queryByRole("alert")).not.toBeInTheDocument()
        second.resolve(ok(CLAIMED))
        expect(await screen.findByRole("alert")).toHaveTextContent(
            "Não foi possível concluir a ação. Tente de novo."
        )
        expect(screen.getByText("Assumido por Ana Paula Souza · Confirmado")).toBeInTheDocument()
    })

    it.each([
        [
            403,
            "INVALID_ORIGIN",
            "O painel foi aberto por um endereço não autorizado. Acesse pelo endereço oficial do painel."
        ],
        [403, "FORBIDDEN", "Sua conta não tem permissão para esta ação."],
        [404, "NOT_FOUND", "Agendamento não encontrado."]
    ])("com %i %s mostra a mensagem certa sem reler o detalhe", async (status, code, text) => {
        const page = await renderActions(PENDING, () => failure(status, code))
        await page.user.click(screen.getByRole("button", { name: "Assumir para mim" }))

        await page.user.click(
            within(screen.getByRole("dialog")).getByRole("button", { name: "Assumir para mim" })
        )

        expect(await screen.findByRole("alert")).toHaveTextContent(text)
        expect(page.requests("GET", DETAIL_PATH)).toHaveLength(1)
    })

    it("limpa o alerta ao confirmar a próxima ação", async () => {
        const replies = [failure(500, "INTERNAL_ERROR"), Promise.withResolvers<Reply>()] as const
        let patches = 0
        const page = await renderActions(PENDING, () => {
            patches += 1

            return patches === 1 ? replies[0] : replies[1].promise
        })
        await page.user.click(screen.getByRole("button", { name: "Assumir para mim" }))
        await page.user.click(
            within(screen.getByRole("dialog")).getByRole("button", { name: "Assumir para mim" })
        )
        await screen.findByRole("alert")
        await page.user.click(screen.getByRole("button", { name: "Assumir para mim" }))

        await page.user.click(
            within(screen.getByRole("dialog")).getByRole("button", { name: "Assumir para mim" })
        )

        expect(screen.queryByRole("alert")).not.toBeInTheDocument()
        replies[1].resolve(ok(CLAIMED))
        await screen.findByText("Agendamento F10464F0 assumido por você.")
    })
})

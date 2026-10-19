import { cleanup, screen, within } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import buildAppointmentDetail from "@/testUtils/buildAppointmentDetail"
import renderAppointmentDetailPage from "@/testUtils/renderAppointmentDetailPage"
import type PanelAccount from "@/types/account/PanelAccount.types"
import type PermissionKey from "@/types/account/PermissionKey.types"
import type AppointmentDetail from "@/types/appointments/AppointmentDetail.types"

vi.setConfig({ testTimeout: 20000 })

const READ_ONLY_NOTICE = "Sua conta pode apenas visualizar agendamentos."

const DUE = buildAppointmentDetail({
    available_actions: {
        claim: { allowed: true, code: null },
        attended: { allowed: true, code: null },
        no_show: { allowed: true, code: null }
    }
})

function staff(permissions: PermissionKey[]): PanelAccount {
    return {
        id: 3,
        name: "Carla Dias",
        email: "carla@exemplo.gov.br",
        isAdmin: false,
        permissions
    }
}

async function renderAs(permissions: PermissionKey[], detail: AppointmentDetail) {
    const page = await renderAppointmentDetailPage({
        account: staff(permissions),
        handlers: {
            "GET /api/v1/appointments/1": () => ({ status: 200, body: { data: detail } })
        }
    })
    await screen.findByRole("heading", { level: 1, name: "Maria Fictícia" })

    return page
}

function actionsBox(): ReturnType<typeof within> {
    const heading = screen.getByRole("heading", { level: 2, name: "Ações" })

    return within(heading.closest("section") as HTMLElement)
}

function mainText(): string {
    const main = screen
        .getAllByRole("heading", { level: 2 })
        .filter((heading) => heading.textContent !== "Ações")

    return main.map((heading) => heading.closest("section")?.textContent ?? "").join("|")
}

afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
    vi.resetModules()
})

describe("AppointmentDetail.page: só leitura", () => {
    it("não mostra botões nem mensagens de espera a quem só vê agendamentos", async () => {
        await renderAs(["appointments.view"], buildAppointmentDetail())

        const box = actionsBox()
        expect(box.queryAllByRole("button")).toHaveLength(0)
        expect(box.queryByText(/disponível/)).not.toBeInTheDocument()
        expect(box.getByText(READ_ONLY_NOTICE)).toBeInTheDocument()
    })

    it("não mostra botões mesmo com todas as ações liberadas pela API", async () => {
        await renderAs(["appointments.view"], DUE)

        expect(actionsBox().queryAllByRole("button")).toHaveLength(0)
    })

    it("mostra o aviso de só leitura também num confirmado", async () => {
        await renderAs(["appointments.view"], buildAppointmentDetail({ status: "CONFIRMED" }))

        expect(actionsBox().getByText(READ_ONLY_NOTICE)).toBeInTheDocument()
    })

    it("não mostra o aviso de só leitura num atendido, só o texto final", async () => {
        await renderAs(["appointments.view"], buildAppointmentDetail({ status: "ATTENDED" }))

        const box = actionsBox()
        expect(box.queryByText(READ_ONLY_NOTICE)).not.toBeInTheDocument()
        expect(box.getByText("Atendimento concluído.")).toBeInTheDocument()
    })

    it("mostra os botões para quem gerencia agendamentos", async () => {
        await renderAs(["appointments.manage"], DUE)

        const box = actionsBox()
        expect(box.getAllByRole("button")).toHaveLength(3)
        expect(box.queryByText(READ_ONLY_NOTICE)).not.toBeInTheDocument()
    })

    it("mostra dados, documentos, linha do tempo e histórico iguais aos de quem gerencia", async () => {
        await renderAs(["appointments.manage"], DUE)
        const managed = mainText()
        cleanup()

        await renderAs(["appointments.view"], DUE)

        expect(mainText()).toBe(managed)
        expect(managed).toContain("Dados do agendamento")
        expect(managed).toContain("Documentos solicitados pelo chatbot")
        expect(managed).toContain("Linha do tempo da conversa de origem")
        expect(managed).toContain("Histórico")
    })
})

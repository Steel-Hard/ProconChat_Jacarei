import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"
import AppointmentActions from "@/components/AppointmentActions"
import type AppointmentActionsView from "@/types/appointments/AppointmentActionsView.types"

vi.setConfig({ testTimeout: 20000 })

const DATE_NOTE =
    "A data não pode ser alterada pelo painel. Remarcações são feitas pelo cidadão no chatbot."

function view(overrides: Partial<AppointmentActionsView> = {}): AppointmentActionsView {
    return { items: [], finalText: null, readOnlyText: null, error: null, ...overrides }
}

function renderActions(value: AppointmentActionsView, onAction = vi.fn()) {
    render(
        <AppointmentActions title="Ações" view={value} dateNote={DATE_NOTE} onAction={onAction} />
    )

    return onAction
}

describe("AppointmentActions", () => {
    it("mostra os botões e as mensagens de espera na ordem recebida", () => {
        renderActions(
            view({
                items: [
                    { kind: "button", action: "claim", label: "Assumir para mim" },
                    {
                        kind: "waiting",
                        action: "attended",
                        text: "Marcar como atendido: disponível a partir do dia do atendimento."
                    }
                ]
            })
        )

        expect(screen.getByRole("heading", { level: 2, name: "Ações" })).toBeInTheDocument()
        expect(screen.getByRole("button", { name: "Assumir para mim" })).toBeInTheDocument()
        expect(
            screen.getByText("Marcar como atendido: disponível a partir do dia do atendimento.")
        ).toBeInTheDocument()
        expect(screen.getAllByRole("button")).toHaveLength(1)
    })

    it("chama a ação do botão clicado", async () => {
        const user = userEvent.setup()
        const onAction = renderActions(
            view({
                items: [
                    { kind: "button", action: "attended", label: "Marcar como atendido" },
                    { kind: "button", action: "no_show", label: "Marcar como não compareceu" }
                ]
            })
        )

        await user.click(screen.getByRole("button", { name: "Marcar como não compareceu" }))

        expect(onAction).toHaveBeenCalledWith("no_show")
    })

    it("mostra o texto final, o aviso de só leitura e sempre a nota da data", () => {
        renderActions(
            view({
                finalText: "Atendimento concluído.",
                readOnlyText: "Sua conta pode apenas visualizar agendamentos."
            })
        )

        expect(screen.getByText("Atendimento concluído.")).toBeInTheDocument()
        expect(
            screen.getByText("Sua conta pode apenas visualizar agendamentos.")
        ).toBeInTheDocument()
        expect(screen.getByText(DATE_NOTE)).toBeInTheDocument()
        expect(screen.queryByRole("button")).not.toBeInTheDocument()
    })

    it("mostra o erro num alerta", () => {
        renderActions(view({ error: "Outra pessoa já assumiu este agendamento." }))

        expect(screen.getByRole("alert")).toHaveTextContent(
            "Outra pessoa já assumiu este agendamento."
        )
    })

    it("não mostra alerta sem erro", () => {
        renderActions(view())

        expect(screen.queryByRole("alert")).not.toBeInTheDocument()
    })
})

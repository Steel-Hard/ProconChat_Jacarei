import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"
import ScheduleReminderFields from "@/components/ScheduleReminderFields"

const COST = "Cada lembrete é uma mensagem de modelo e tem custo por mensagem cobrado pela Meta."

function renderReminder(overrides: Partial<Parameters<typeof ScheduleReminderFields>[0]> = {}) {
    const props = {
        enabled: true,
        hours: 24 as const,
        address: "Rua do Procon, 100",
        complement: "Sala 2",
        onToggle: vi.fn(),
        onChangeHours: vi.fn(),
        ...overrides
    }
    render(<ScheduleReminderFields {...props} />)

    return { ...props, user: userEvent.setup() }
}

describe("ScheduleReminderFields", () => {
    it("mostra a prévia do modelo fixo com os marcadores e só o endereço preenchido", () => {
        renderReminder()

        expect(
            screen.getByText(
                "Olá, [primeiro nome]. Lembrete do seu atendimento no PROCON Jacareí: [dia da semana], [dd/mm], às [hh:mm] (protocolo [protocolo]). Endereço: Rua do Procon, 100 (Sala 2). Traga: [documentos]. Se não puder comparecer, remarque ou cancele respondendo a esta mensagem."
            )
        ).toBeInTheDocument()
        expect(
            screen.getByText(/os que foram enviados ao cidadão na confirmação/)
        ).toBeInTheDocument()
        expect(screen.getByText(COST)).toBeInTheDocument()
        expect(screen.getByText("Ativado")).toBeInTheDocument()
    })

    it("mostra o endereço sem complemento e o aviso de endereço vazio", () => {
        renderReminder({ complement: "  " })
        expect(screen.getByText(/Endereço: Rua do Procon, 100\. Traga/)).toBeInTheDocument()
    })

    it("avisa quando o endereço não foi informado", () => {
        renderReminder({ address: " " })

        expect(
            screen.getByText(/Endereço: \[endereço não informado em Dados da unidade\]\./)
        ).toBeInTheDocument()
    })

    it("esconde as horas e a prévia com o lembrete desligado e mantém o aviso de custo", () => {
        renderReminder({ enabled: false })

        expect(
            screen.queryByLabelText("Enviar lembrete ao cidadão", { selector: "select" })
        ).not.toBeInTheDocument()
        expect(screen.queryByText("Prévia da mensagem")).not.toBeInTheDocument()
        expect(screen.getByText("Desativado")).toBeInTheDocument()
        expect(screen.getByText(COST)).toBeInTheDocument()
    })

    it("liga e desliga o lembrete e troca as horas", async () => {
        const { onToggle, onChangeHours, user } = renderReminder()

        await user.click(screen.getByRole("checkbox", { name: "Enviar lembrete ao cidadão" }))
        await user.selectOptions(
            screen.getByRole("combobox", { name: "Enviar lembrete ao cidadão" }),
            "48"
        )

        expect(onToggle).toHaveBeenCalled()
        expect(onChangeHours).toHaveBeenCalledWith(48)
    })
})

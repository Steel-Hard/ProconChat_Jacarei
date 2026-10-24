import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"
import ReassignmentDialog from "@/components/ReassignmentDialog"
import type ReassignmentTargetView from "@/types/users/ReassignmentTargetView.types"

const TEXTS = {
    title: "Esta conta é responsável por 2 agendamentos futuros",
    description:
        "Bruno Lima será desativada. Escolha o que acontece com estes agendamentos. A mudança só vale ao salvar.",
    listLabel: "Agendamentos futuros",
    optionsLabel: "O que acontece com os agendamentos",
    pending: "Voltar para Pendente sem responsável",
    assign: "Atribuir a outro funcionário",
    assignTo: "Funcionário que recebe os agendamentos",
    noTargets: "Nenhuma outra conta ativa tem Gerenciar agendamentos.",
    historyNote: "A mudança fica registrada no histórico de cada agendamento ao salvar.",
    back: "Voltar",
    confirm: "Continuar"
}

const APPOINTMENTS = [
    { id: "11", protocol: "AB12CD34", name: "Maria Souza", when: "30/10 às 10:00" },
    { id: "12", protocol: "EF56GH78", name: "João Pereira", when: "31/10 às 14:30" }
]

const TARGETS: ReassignmentTargetView[] = [
    { id: 1, name: "Ana Paula Souza" },
    { id: 3, name: "Carla Dias" }
]

function renderDialog(targets = TARGETS) {
    const onConfirm = vi.fn()
    const onCancel = vi.fn()
    render(
        <ReassignmentDialog
            open
            texts={TEXTS}
            appointments={APPOINTMENTS}
            targets={targets}
            onConfirm={onConfirm}
            onCancel={onCancel}
        />
    )

    return { onConfirm, onCancel }
}

describe("ReassignmentDialog", () => {
    it("mostra o título, o texto, a lista, as opções e a nota do histórico", () => {
        renderDialog()

        const dialog = screen.getByRole("dialog", { name: TEXTS.title })
        expect(dialog).toHaveAccessibleDescription(TEXTS.description)
        const items = within(
            screen.getByRole("list", { name: "Agendamentos futuros" })
        ).getAllByRole("listitem")
        expect(items[0]).toHaveTextContent("AB12CD34")
        expect(items[0]).toHaveTextContent("Maria Souza")
        expect(items[0]).toHaveTextContent("30/10 às 10:00")
        expect(items).toHaveLength(2)
        expect(
            screen.getByRole("radio", { name: "Voltar para Pendente sem responsável" })
        ).toBeChecked()
        expect(
            screen.getByRole("radio", { name: "Atribuir a outro funcionário" })
        ).not.toBeChecked()
        expect(screen.getByText(TEXTS.historyNote)).toBeInTheDocument()
        expect(dialog).not.toHaveTextContent(/CPF|telefone/i)
    })

    it("lista os destinos pelo nome", () => {
        renderDialog()

        const select = screen.getByRole("combobox", {
            name: "Funcionário que recebe os agendamentos"
        })
        expect(
            within(select)
                .getAllByRole("option")
                .map((option) => option.textContent)
        ).toEqual(["Ana Paula Souza", "Carla Dias"])
    })

    it("continua com Voltar para Pendente por padrão", async () => {
        const user = userEvent.setup()
        const { onConfirm } = renderDialog()

        await user.click(screen.getByRole("button", { name: "Continuar" }))

        expect(onConfirm).toHaveBeenCalledWith({ mode: "pending" })
    })

    it("continua atribuindo ao funcionário escolhido", async () => {
        const user = userEvent.setup()
        const { onConfirm } = renderDialog()

        await user.selectOptions(
            screen.getByRole("combobox", { name: "Funcionário que recebe os agendamentos" }),
            "Carla Dias"
        )
        await user.click(screen.getByRole("button", { name: "Continuar" }))

        expect(screen.getByRole("radio", { name: "Atribuir a outro funcionário" })).toBeChecked()
        expect(onConfirm).toHaveBeenCalledWith({ mode: "assign", toUserId: 3 })
    })

    it("atribui ao primeiro destino ao marcar só a opção", async () => {
        const user = userEvent.setup()
        const { onConfirm } = renderDialog()

        await user.click(screen.getByRole("radio", { name: "Atribuir a outro funcionário" }))
        await user.click(screen.getByRole("button", { name: "Continuar" }))

        expect(onConfirm).toHaveBeenCalledWith({ mode: "assign", toUserId: 1 })
    })

    it("deixa Atribuir indisponível sem nenhum destino", () => {
        renderDialog([])

        expect(screen.getByRole("radio", { name: "Atribuir a outro funcionário" })).toBeDisabled()
        expect(screen.getByText(TEXTS.noTargets)).toBeInTheDocument()
        expect(screen.queryByRole("combobox")).not.toBeInTheDocument()
        expect(screen.getByRole("button", { name: "Continuar" })).toBeEnabled()
    })

    it("volta sem confirmar", async () => {
        const user = userEvent.setup()
        const { onConfirm, onCancel } = renderDialog()

        await user.click(screen.getByRole("button", { name: "Voltar" }))

        expect(onCancel).toHaveBeenCalledTimes(1)
        expect(onConfirm).not.toHaveBeenCalled()
    })
})

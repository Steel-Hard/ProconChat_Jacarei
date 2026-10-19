import { render, screen, within } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import AppointmentTimeline from "@/components/AppointmentTimeline"
import type AppointmentTimelineStepView from "@/types/appointments/AppointmentTimelineStepView.types"

vi.setConfig({ testTimeout: 20000 })

const NOTE = "O sistema registra apenas os passos percorridos, não o texto digitado pelo cidadão."
const AI = "Gerado com auxílio de IA"

const STEPS: AppointmentTimelineStepView[] = [
    { id: "1", title: "Início da conversa", detail: "Cidadão iniciou.", time: "10:46", ai: false },
    {
        id: "2",
        title: "Resposta entregue",
        detail: "Texto complementar gerado para contextualizar a resposta.",
        time: "10:47",
        ai: true
    },
    { id: "3", title: "Passo registrado", detail: null, time: "10:48", ai: false }
]

function renderTimeline(steps: AppointmentTimelineStepView[]) {
    render(
        <AppointmentTimeline
            title="Linha do tempo da conversa de origem"
            note={NOTE}
            emptyText="Os passos desta conversa não estão disponíveis."
            aiLabel={AI}
            steps={steps}
        />
    )
}

describe("AppointmentTimeline", () => {
    it("mostra título, nota e os passos na ordem, com hora e detalhe", () => {
        renderTimeline(STEPS)

        expect(
            screen.getByRole("heading", { level: 2, name: "Linha do tempo da conversa de origem" })
        ).toBeInTheDocument()
        expect(screen.getByText(NOTE)).toBeInTheDocument()
        const items = within(screen.getByRole("list")).getAllByRole("listitem")
        expect(items).toHaveLength(3)
        expect(within(items[0]).getByText("Início da conversa")).toBeInTheDocument()
        expect(within(items[0]).getByText("10:46")).toBeInTheDocument()
        expect(within(items[0]).getByText("Cidadão iniciou.")).toBeInTheDocument()
        expect(within(items[2]).getByText("Passo registrado")).toBeInTheDocument()
    })

    it("mostra o rótulo de IA só no passo gerado com IA", () => {
        renderTimeline(STEPS)

        const items = within(screen.getByRole("list")).getAllByRole("listitem")
        expect(within(items[1]).getByText(AI)).toBeInTheDocument()
        expect(within(items[0]).queryByText(AI)).not.toBeInTheDocument()
        expect(screen.getAllByText(AI)).toHaveLength(1)
    })

    it("mostra o texto de vazio sem passos", () => {
        renderTimeline([])

        expect(
            screen.getByText("Os passos desta conversa não estão disponíveis.")
        ).toBeInTheDocument()
        expect(screen.queryByRole("list")).not.toBeInTheDocument()
        expect(screen.getByText(NOTE)).toBeInTheDocument()
    })
})

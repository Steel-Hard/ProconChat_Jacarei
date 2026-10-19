import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import AppointmentFacts from "@/components/AppointmentFacts"

vi.setConfig({ testTimeout: 20000 })

const FACTS = [
    { label: "Titular", value: "Maria Fictícia" },
    { label: "CPF do titular", value: "***.982.247-**", mono: true },
    { label: "Status", value: "", status: "CONFIRMED" as const },
    { label: "Responsável", value: "Sem responsável", emphasis: true },
    { label: "Origem no chatbot", value: "Bancos → Cobrança indevida", wide: true }
]

describe("AppointmentFacts", () => {
    it("mostra a seção com cada rótulo e valor", () => {
        render(<AppointmentFacts title="Dados do agendamento" facts={FACTS} notice={null} />)

        expect(
            screen.getByRole("heading", { level: 2, name: "Dados do agendamento" })
        ).toBeInTheDocument()
        expect(screen.getAllByRole("term").map((term) => term.textContent)).toEqual([
            "Titular",
            "CPF do titular",
            "Status",
            "Responsável",
            "Origem no chatbot"
        ])
        expect(screen.getAllByRole("definition").map((value) => value.textContent)).toEqual([
            "Maria Fictícia",
            "***.982.247-**",
            "Confirmado",
            "Sem responsável",
            "Bancos → Cobrança indevida"
        ])
    })

    it("mostra o status como selo de status", () => {
        render(<AppointmentFacts title="Dados do agendamento" facts={FACTS} notice={null} />)

        expect(screen.getByText("Confirmado")).toBeInTheDocument()
    })

    it("mostra o aviso quando recebe um", () => {
        render(
            <AppointmentFacts
                title="Dados do agendamento"
                facts={FACTS}
                notice="Nome e CPF acima são sempre do titular."
            />
        )

        expect(screen.getByText("Nome e CPF acima são sempre do titular.")).toBeInTheDocument()
    })

    it("não mostra aviso sem texto", () => {
        render(<AppointmentFacts title="Dados do agendamento" facts={FACTS} notice={null} />)

        expect(
            screen.queryByText("Nome e CPF acima são sempre do titular.")
        ).not.toBeInTheDocument()
    })
})

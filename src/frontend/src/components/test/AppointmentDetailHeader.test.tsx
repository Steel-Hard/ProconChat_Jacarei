import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import AppointmentDetailHeader from "@/components/AppointmentDetailHeader"

vi.setConfig({ testTimeout: 20000 })

const BASE = {
    protocolLabel: "Protocolo F10464F0",
    status: "PENDING" as const,
    name: "Maria Fictícia",
    subtitle: "Segunda-feira, 19/10/2026 às 08:00 · Criado pelo chatbot em 18/10/2026 às 10:46"
}

describe("AppointmentDetailHeader", () => {
    it("mostra protocolo, status, nome como título e a linha de datas", () => {
        render(<AppointmentDetailHeader {...BASE} seals={[]} />)

        expect(screen.getByText("Protocolo F10464F0")).toBeInTheDocument()
        expect(screen.getByText("Pendente")).toBeInTheDocument()
        expect(
            screen.getByRole("heading", { level: 1, name: "Maria Fictícia" })
        ).toBeInTheDocument()
        expect(screen.getByText(BASE.subtitle)).toBeInTheDocument()
    })

    it("mostra os selos recebidos", () => {
        render(
            <AppointmentDetailHeader
                {...BASE}
                seals={[
                    { label: "Comparece por representante", tone: "neutral" },
                    { label: "Remarcado pelo cidadão", tone: "neutral" },
                    { label: "Fora da grade atual", tone: "warning" }
                ]}
            />
        )

        expect(screen.getByText("Comparece por representante")).toBeInTheDocument()
        expect(screen.getByText("Remarcado pelo cidadão")).toBeInTheDocument()
        expect(screen.getByText("Fora da grade atual")).toBeInTheDocument()
    })

    it("não mostra selo quando não há nenhum", () => {
        render(<AppointmentDetailHeader {...BASE} seals={[]} />)

        expect(screen.queryByText("Comparece por representante")).not.toBeInTheDocument()
        expect(screen.queryByText("Fora da grade atual")).not.toBeInTheDocument()
    })
})

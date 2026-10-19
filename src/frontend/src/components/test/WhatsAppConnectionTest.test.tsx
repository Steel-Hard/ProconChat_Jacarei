import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import WhatsAppConnectionTest from "@/components/WhatsAppConnectionTest"

describe("WhatsAppConnectionTest", () => {
    it("mostra o andamento e desabilita o botão enquanto testa", () => {
        render(
            <WhatsAppConnectionTest
                buttonLabel="Testar conexão"
                testingText="Testando conexão com a Meta…"
                testing
                disabled={false}
                message={{ tone: "error", title: "Falha no teste.", detail: "x" }}
                onTest={vi.fn()}
            />
        )

        expect(screen.getByRole("button", { name: "Testar conexão" })).toBeDisabled()
        expect(screen.getByText("Testando conexão com a Meta…")).toBeInTheDocument()
        expect(screen.queryByText("Falha no teste.")).not.toBeInTheDocument()
    })

    it("mostra o resultado com título e detalhe", () => {
        render(
            <WhatsAppConnectionTest
                buttonLabel="Testar conexão"
                testingText="Testando conexão com a Meta…"
                testing={false}
                disabled={false}
                message={{
                    tone: "success",
                    title: "Conexão testada com sucesso.",
                    detail: "Número verificado: +55 · Nome: X"
                }}
                onTest={vi.fn()}
            />
        )

        expect(screen.getByRole("status")).toHaveTextContent(
            "Conexão testada com sucesso. Número verificado: +55 · Nome: X"
        )
        expect(screen.getByRole("button", { name: "Testar conexão" })).toBeEnabled()
    })
})

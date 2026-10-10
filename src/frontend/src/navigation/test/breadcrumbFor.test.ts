import { describe, expect, it } from "vitest"
import breadcrumbFor from "@/navigation/breadcrumbFor"

describe("breadcrumbFor", () => {
    it("monta a trilha do detalhe do agendamento com o link para a lista", () => {
        expect(breadcrumbFor("/agendamentos/42")).toEqual({
            group: "Operação",
            parent: { label: "Agendamentos", path: "/agendamentos" },
            title: "Detalhe do agendamento"
        })
    })

    it("monta a trilha de uma tela do menu com grupo e título", () => {
        expect(breadcrumbFor("/horarios")).toEqual({
            group: "Configurações",
            title: "Horários de atendimento"
        })
    })

    it("devolve trilha vazia para rota desconhecida", () => {
        expect(breadcrumbFor("/rota-desconhecida")).toBeNull()
    })
})

import { describe, expect, it } from "vitest"
import breadcrumbFor from "@/navigation/breadcrumbFor"

describe("breadcrumbFor", () => {
    it("monta a trilha do detalhe do agendamento com o link para a lista", () => {
        expect(breadcrumbFor("/agendamentos/42")).toEqual({
            group: "operation",
            parent: { key: "appointments", path: "/agendamentos" },
            page: "appointmentDetail"
        })
    })

    it("monta a trilha de uma tela do menu com grupo e título", () => {
        expect(breadcrumbFor("/horarios")).toEqual({
            group: "settings",
            page: "schedule"
        })
    })

    it("devolve trilha vazia para rota desconhecida", () => {
        expect(breadcrumbFor("/rota-desconhecida")).toBeNull()
    })
})

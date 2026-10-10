import { describe, expect, it } from "vitest"
import activeNavKey from "@/navigation/activeNavKey"

describe("activeNavKey", () => {
    it("marca Agendamentos como ativo no detalhe do agendamento", () => {
        expect(activeNavKey("/agendamentos/1")).toBe("appointments")
    })
})

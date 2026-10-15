import { describe, expect, it } from "vitest"
import toPanelAccount from "@/services/auth/toPanelAccount"

describe("toPanelAccount", () => {
    it("copia id, nome, e-mail, isAdmin e as permissões conhecidas", () => {
        const account = toPanelAccount({
            id: 3,
            name: "Ana Paula Souza",
            email: "ana@exemplo.gov.br",
            isAdmin: false,
            permissions: ["sessions.view", "reports.view"]
        })

        expect(account).toEqual({
            id: 3,
            name: "Ana Paula Souza",
            email: "ana@exemplo.gov.br",
            isAdmin: false,
            permissions: ["sessions.view", "reports.view"]
        })
    })

    it("descarta as chaves de permissão desconhecidas", () => {
        const account = toPanelAccount({
            id: 3,
            name: "Ana Paula Souza",
            email: "ana@exemplo.gov.br",
            isAdmin: false,
            permissions: ["sessions.view", "admin.only", "whatever"]
        })

        expect(account.permissions).toEqual(["sessions.view"])
    })
})

import { describe, expect, it } from "vitest"
import BadRequestError from "../errors/BadRequestError"
import { validateSchema } from "../middleware/validateRequest.middleware"
import { privacySettingsBodySchema } from "./privacySettings.schema"

function body(overrides: Record<string, unknown> = {}) {
    return {
        controllerName: "Prefeitura de Jacareí",
        dpoName: "Maria Encarregada",
        contactEmail: "privacidade@exemplo.test",
        inPersonContact: "Rua Exemplo, 100",
        retentionText: "Sessões por 12 meses.",
        ...overrides,
    }
}

function issuesOf(data: unknown): { path: string; message: string }[] {
    try {
        validateSchema(privacySettingsBodySchema, data, { withIssues: true })
    } catch (error) {
        if (error instanceof BadRequestError) {
            return (error.details as { issues: { path: string; message: string }[] }).issues
        }
        throw error
    }
    return []
}

describe("privacySettingsBodySchema", () => {
    it("recusa o e-mail de contato sem @", () => {
        expect(issuesOf(body({ contactEmail: "sem-arroba.exemplo.test" })).map((issue) => issue.path)).toEqual(["contactEmail"])
    })

    it("recusa o nome do controlador com 151 caracteres e os prazos com 2001", () => {
        expect(issuesOf(body({ controllerName: "c".repeat(151), retentionText: "r".repeat(2001) }))).toEqual([
            { path: "controllerName", message: "Use no máximo 150 caracteres" },
            { path: "retentionText", message: "Use no máximo 2000 caracteres" },
        ])
    })

    it("aceita os textos no limite de cada campo", () => {
        const limits = body({
            controllerName: "c".repeat(150),
            dpoName: "d".repeat(150),
            contactEmail: `${"e".repeat(64)}@${"d".repeat(182)}.com.br`,
            inPersonContact: "p".repeat(300),
            retentionText: "r".repeat(2000),
        })

        expect(validateSchema(privacySettingsBodySchema, limits)).toEqual(limits)
    })

    it("recusa o corpo sem uma das chaves", () => {
        const { dpoName: _dpoName, ...withoutDpo } = body()

        expect(issuesOf(withoutDpo).map((issue) => issue.path)).toEqual(["dpoName"])
    })

    it("recusa um numero no lugar do texto", () => {
        expect(issuesOf(body({ inPersonContact: 12 })).map((issue) => issue.path)).toEqual(["inPersonContact"])
    })

    it("transforma texto so com espacos em null", () => {
        expect(validateSchema(privacySettingsBodySchema, body({ dpoName: "   ", inPersonContact: "" }))).toEqual(
            body({ dpoName: null, inPersonContact: null }),
        )
    })

    it("apara os espacos das pontas antes de validar", () => {
        expect(validateSchema(privacySettingsBodySchema, body({ controllerName: "  Prefeitura  ", contactEmail: " a@b.co " }))).toEqual(
            body({ controllerName: "Prefeitura", contactEmail: "a@b.co" }),
        )
    })
})

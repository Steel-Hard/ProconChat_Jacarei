import { describe, expect, it } from "vitest"
import BadRequestError from "../errors/BadRequestError"
import { validateSchema } from "../middleware/validateRequest.middleware"
import { retentionPreviewQuerySchema } from "./retentionPreview.schema"

function issuesOf(data: unknown): string[] {
    try {
        validateSchema(retentionPreviewQuerySchema, data, { withIssues: true })
    } catch (error) {
        if (error instanceof BadRequestError) {
            return (error.details as { issues: { path: string }[] }).issues.map((issue) => issue.path)
        }
        throw error
    }
    return []
}

describe("retentionPreviewQuerySchema", () => {
    it.each([
        { label: "sem sessionDays", query: { appointmentDays: "365" }, path: "sessionDays" },
        { label: "com appointmentDays=89", query: { sessionDays: "90", appointmentDays: "89" }, path: "appointmentDays" },
        { label: "com sessionDays=abc", query: { sessionDays: "abc", appointmentDays: "365" }, path: "sessionDays" },
    ])("recusa a consulta $label", ({ query, path }) => {
        expect(issuesOf(query)).toEqual([path])
    })

    it("aceita os prazos em texto e os converte para numero", () => {
        expect(validateSchema(retentionPreviewQuerySchema, { sessionDays: "90", appointmentDays: "365" })).toEqual({
            sessionDays: 90,
            appointmentDays: 365,
        })
    })
})

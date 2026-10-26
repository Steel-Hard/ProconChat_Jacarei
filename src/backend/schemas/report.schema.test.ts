import { describe, expect, it } from "vitest"
import BadRequestError from "../errors/BadRequestError"
import { validateSchema } from "../utils/validateSchema"
import {
    createReportQuerySchema,
    REPORT_PERIOD_PRESETS,
} from "./report.schema"

const FIXED_NOW = new Date("2026-10-15T15:00:00.000Z")
const schema = createReportQuerySchema(() => FIXED_NOW)

function expectFieldIssue(
    input: unknown,
    expectedPath: string,
    expectedMessage: string,
): void {
    try {
        validateSchema(schema, input, { withIssues: true })
        expect.fail("Deveria ter lançado BadRequestError")
    } catch (error) {
        expect(error).toBeInstanceOf(BadRequestError)
        const badRequest = error as BadRequestError
        expect(badRequest.message).toBe(
            `Dados inválidos: ${expectedPath}: ${expectedMessage}`,
        )
        expect(badRequest.details).toEqual({
            issues: expect.arrayContaining([
                { path: expectedPath, message: expectedMessage },
            ]),
        })
    }
}

describe("report.schema", () => {
    it("aceita consulta vazia para assumir o período padrão", () => {
        expect(validateSchema(schema, {}, { withIssues: true })).toEqual({})
    })

    it.each(REPORT_PERIOD_PRESETS.filter((p) => p !== "custom"))(
        "aceita o preset %s sem datas personalizadas",
        (period) => {
            expect(
                validateSchema(schema, { period }, { withIssues: true }),
            ).toEqual({ period })
        },
    )

    it("aceita o período custom com startDate e endDate válidos até hoje", () => {
        const result = validateSchema(
            schema,
            {
                period: "custom",
                startDate: "2026-10-01",
                endDate: "2026-10-15",
            },
            { withIssues: true },
        )
        expect(result).toEqual({
            period: "custom",
            startDate: "2026-10-01",
            endDate: "2026-10-15",
        })
    })

    it("aceita startDate e endDate válidos mesmo quando period é omitido", () => {
        const result = validateSchema(
            schema,
            {
                startDate: "2026-09-10",
                endDate: "2026-09-20",
            },
            { withIssues: true },
        )
        expect(result).toEqual({
            startDate: "2026-09-10",
            endDate: "2026-09-20",
        })
    })

    it("rejeita period fora da lista permitida", () => {
        expectFieldIssue(
            { period: "15d" },
            "period",
            "Período inválido (use 7d, 30d, 90d, current_month, previous_month ou custom)",
        )
    })

    it("rejeita startDate sem endDate no período custom", () => {
        expectFieldIssue(
            { period: "custom", startDate: "2026-10-01" },
            "endDate",
            "Data final obrigatória no período personalizado",
        )
    })

    it("rejeita endDate sem startDate no período custom", () => {
        expectFieldIssue(
            { period: "custom", endDate: "2026-10-10" },
            "startDate",
            "Data inicial obrigatória no período personalizado",
        )
    })

    it("rejeita startDate informado junto com preset fixo", () => {
        expectFieldIssue(
            { period: "7d", startDate: "2026-10-01" },
            "startDate",
            "Data inicial só pode ser informada no período personalizado",
        )
    })

    it("rejeita endDate informado junto com preset fixo", () => {
        expectFieldIssue(
            { period: "30d", endDate: "2026-10-10" },
            "endDate",
            "Data final só pode ser informada no período personalizado",
        )
    })

    it("rejeita data inexistente no calendário (2026-02-30)", () => {
        expectFieldIssue(
            {
                period: "custom",
                startDate: "2026-02-30",
                endDate: "2026-03-05",
            },
            "startDate",
            "Data inválida (use YYYY-MM-DD)",
        )
    })

    it("rejeita startDate posterior a endDate", () => {
        expectFieldIssue(
            {
                period: "custom",
                startDate: "2026-10-12",
                endDate: "2026-10-05",
            },
            "startDate",
            "A data inicial não pode ser posterior à data final",
        )
    })

    it("rejeita endDate futura em relação a hoje no fuso de São Paulo", () => {
        expectFieldIssue(
            {
                period: "custom",
                startDate: "2026-10-01",
                endDate: "2026-10-16",
            },
            "endDate",
            "A data final não pode ser futura",
        )
    })
})

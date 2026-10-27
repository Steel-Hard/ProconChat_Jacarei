import { describe, expect, it } from "vitest"
import type { AbandonedStep } from "../types/conversationEvent.types"
import {
    ABANDONMENT_STAGES,
    buildAbandonmentFunnel,
    buildAppointmentsResultSummary,
    buildConversationSeries,
    buildDailySeries,
    buildOutcomesSummary,
    calculateNoShowRate,
    countCalendarDaysInclusive,
    mapStepToAbandonmentStage,
    OUTCOME_DEFINITIONS,
    resolveReportPeriod,
    STEP_TO_ABANDONMENT_STAGE,
} from "./reportRules"

const FIXED_NOW = new Date("2026-10-15T15:00:00.000Z")

describe("reportRules", () => {
    describe("resolveReportPeriod", () => {
        it("assume 30d por padrão quando nenhum filtro é informado", () => {
            const period = resolveReportPeriod({}, FIXED_NOW)
            expect(period.preset).toBe("30d")
            expect(period.today).toBe("2026-10-15")
            expect(period.startDate).toBe("2026-09-15")
            expect(period.endDate).toBe("2026-10-14")
            expect(period.daysCount).toBe(30)
        })

        it("resolve o período 7d com os 7 dias fechados anteriores a hoje", () => {
            const period = resolveReportPeriod({ period: "7d" }, FIXED_NOW)
            expect(period.preset).toBe("7d")
            expect(period.startDate).toBe("2026-10-08")
            expect(period.endDate).toBe("2026-10-14")
            expect(period.daysCount).toBe(7)
        })

        it("resolve o período 90d com os 90 dias fechados anteriores a hoje", () => {
            const period = resolveReportPeriod({ period: "90d" }, FIXED_NOW)
            expect(period.preset).toBe("90d")
            expect(period.startDate).toBe("2026-07-17")
            expect(period.endDate).toBe("2026-10-14")
            expect(period.daysCount).toBe(90)
        })

        it("resolve current_month do dia 01 do mês atual até hoje", () => {
            const period = resolveReportPeriod(
                { period: "current_month" },
                FIXED_NOW,
            )
            expect(period.preset).toBe("current_month")
            expect(period.startDate).toBe("2026-10-01")
            expect(period.endDate).toBe("2026-10-15")
            expect(period.daysCount).toBe(15)
        })

        it("resolve previous_month com o mês anterior completo", () => {
            const period = resolveReportPeriod(
                { period: "previous_month" },
                FIXED_NOW,
            )
            expect(period.preset).toBe("previous_month")
            expect(period.startDate).toBe("2026-09-01")
            expect(period.endDate).toBe("2026-09-30")
            expect(period.daysCount).toBe(30)
        })

        it("resolve custom com um único dia quando startDate === endDate", () => {
            const period = resolveReportPeriod(
                {
                    period: "custom",
                    startDate: "2026-10-15",
                    endDate: "2026-10-15",
                },
                FIXED_NOW,
            )
            expect(period.preset).toBe("custom")
            expect(period.startDate).toBe("2026-10-15")
            expect(period.endDate).toBe("2026-10-15")
            expect(period.daysCount).toBe(1)
            expect(period.start.toISOString()).toBe("2026-10-15T03:00:00.000Z")
            expect(period.endExclusive.toISOString()).toBe(
                "2026-10-16T03:00:00.000Z",
            )
        })

        it("calcula corretamente a quantidade inclusiva de dias entre duas datas", () => {
            expect(countCalendarDaysInclusive("2026-10-01", "2026-10-01")).toBe(1)
            expect(countCalendarDaysInclusive("2026-10-01", "2026-10-10")).toBe(10)
        })
    })

    describe("buildOutcomesSummary", () => {
        it("omite IN_PROGRESS quando sua contagem é zero e mantém os outros 7 desfechos", () => {
            const summary = buildOutcomesSummary(
                [
                    { outcome: "RESOLVED", count: 50 },
                    { outcome: "SCHEDULED", count: 25 },
                    { outcome: "ABANDONED", count: 25 },
                ],
                100,
            )

            expect(summary).toHaveLength(7)
            expect(summary.map((s) => s.outcome)).not.toContain("IN_PROGRESS")
            expect(summary.find((s) => s.outcome === "RESOLVED")).toEqual({
                outcome: "RESOLVED",
                label: "Resolvida sem agendamento",
                count: 50,
                percentage: 50,
            })
            expect(summary.find((s) => s.outcome === "SCHEDULED")?.percentage).toBe(
                25,
            )
            expect(summary.find((s) => s.outcome === "OUT_OF_SCOPE")?.count).toBe(
                0,
            )
        })

        it("inclui IN_PROGRESS quando há conversas em andamento no período", () => {
            const summary = buildOutcomesSummary(
                [
                    { outcome: "RESOLVED", count: 7 },
                    { outcome: "IN_PROGRESS", count: 3 },
                ],
                10,
            )

            expect(summary).toHaveLength(OUTCOME_DEFINITIONS.length)
            expect(summary.find((s) => s.outcome === "IN_PROGRESS")).toEqual({
                outcome: "IN_PROGRESS",
                label: "Em andamento",
                count: 3,
                percentage: 30,
            })
        })

        it("retorna percentuais zerados quando não há conversas no período", () => {
            const summary = buildOutcomesSummary([], 0)
            expect(summary.every((s) => s.count === 0 && s.percentage === 0)).toBe(
                true,
            )
        })
    })

    describe("buildDailySeries e buildConversationSeries", () => {
        it("preenche com zero os dias sem conversas no intervalo", () => {
            const series = buildDailySeries("2026-10-01", "2026-10-03", [
                {
                    date: "2026-10-01",
                    conversations: 10,
                    appointmentsCreated: 2,
                },
                {
                    date: "2026-10-03",
                    conversations: 6,
                    appointmentsCreated: 1,
                },
            ])

            expect(series).toEqual([
                {
                    date: "2026-10-01",
                    conversations: 10,
                    appointmentsCreated: 2,
                },
                {
                    date: "2026-10-02",
                    conversations: 0,
                    appointmentsCreated: 0,
                },
                {
                    date: "2026-10-03",
                    conversations: 6,
                    appointmentsCreated: 1,
                },
            ])
        })

        it("mantém granularidade diária até 45 dias", () => {
            const daily = buildDailySeries("2026-09-01", "2026-10-15", [
                {
                    date: "2026-09-01",
                    conversations: 4,
                    appointmentsCreated: 1,
                },
            ])
            expect(daily).toHaveLength(45)

            const result = buildConversationSeries(daily)
            expect(result.granularity).toBe("day")
            expect(result.buckets).toHaveLength(45)
        })

        it("agrupa em blocos semanais de até 7 dias quando o período tem mais de 45 dias", () => {
            const daily = buildDailySeries("2026-08-31", "2026-10-15", [
                {
                    date: "2026-08-31",
                    conversations: 5,
                    appointmentsCreated: 2,
                },
                {
                    date: "2026-09-02",
                    conversations: 3,
                    appointmentsCreated: 1,
                },
            ])
            expect(daily).toHaveLength(46)

            const result = buildConversationSeries(daily)
            expect(result.granularity).toBe("week")
            expect(result.buckets).toHaveLength(7)
            expect(result.buckets[0]).toEqual({
                startDate: "2026-08-31",
                endDate: "2026-09-06",
                conversations: 8,
                appointmentsCreated: 3,
            })
            expect(result.buckets[6]).toEqual({
                startDate: "2026-10-12",
                endDate: "2026-10-15",
                conversations: 0,
                appointmentsCreated: 0,
            })
        })
    })

    describe("calculateNoShowRate e buildAppointmentsResultSummary", () => {
        it("calcula a taxa de não comparecimento apenas sobre Atendido + Não compareceu", () => {
            expect(calculateNoShowRate(14, 6)).toBe(30)
        })

        it("retorna 0 quando não há agendamentos registrados como Atendido ou Não compareceu", () => {
            expect(calculateNoShowRate(0, 0)).toBe(0)
        })

        it("ignora cancelados, aguardando registro e futuros no denominador da taxa de não comparecimento", () => {
            const summary = buildAppointmentsResultSummary({
                attended: 8,
                noShow: 2,
                canceled: 15,
                waitingRecord: 10,
                upcoming: 20,
            })

            expect(summary).toEqual({
                attended: 8,
                noShow: 2,
                canceled: 15,
                waitingRecord: 10,
                upcoming: 20,
                total: 55,
                recordedTotal: 10,
                noShowRate: 20,
            })
        })
    })

    describe("mapStepToAbandonmentStage e buildAbandonmentFunnel", () => {
        const expectedMappings: [AbandonedStep, string][] = [
            ["AWAITING_CATEGORY", "CATEGORIES"],
            ["AWAITING_RETURN_CHOICE", "CATEGORIES"],
            ["AWAITING_CANCEL_CONFIRMATION", "CATEGORIES"],
            ["AWAITING_QUESTION", "QUESTIONS"],
            ["AWAITING_ANSWER", "ANSWER"],
            ["AWAITING_RESOLVED", "RESOLVED"],
            ["AWAITING_SCHEDULE_OFFER", "RESOLVED"],
            ["AWAITING_ATTENDEE", "ATTENDEE"],
            ["AWAITING_HOLDER_NAME", "ATTENDEE"],
            ["AWAITING_HOLDER_CPF", "ATTENDEE"],
            ["AWAITING_SLOT", "SLOT"],
        ]

        it.each(expectedMappings)(
            "mapeia a etapa %s para o estágio %s do funil de abandono",
            (step, expectedStage) => {
                expect(mapStepToAbandonmentStage(step)).toBe(expectedStage)
                expect(STEP_TO_ABANDONMENT_STAGE[step]).toBe(expectedStage)
            },
        )

        it("soma contagens de etapas que pertencem ao mesmo estágio entre os 6 estágios dos Relatórios", () => {
            const funnel = buildAbandonmentFunnel(
                [
                    { step: "AWAITING_CATEGORY", count: 5 },
                    { step: "AWAITING_RETURN_CHOICE", count: 3 },
                    { step: "AWAITING_CANCEL_CONFIRMATION", count: 2 },
                    { step: "AWAITING_ATTENDEE", count: 4 },
                    { step: "AWAITING_HOLDER_NAME", count: 3 },
                    { step: "AWAITING_HOLDER_CPF", count: 3 },
                ],
                100,
            )

            expect(funnel).toHaveLength(ABANDONMENT_STAGES.length)
            expect(funnel.find((item) => item.stage === "CATEGORIES")).toEqual({
                stage: "CATEGORIES",
                label: "Na lista de categorias",
                count: 10,
                percentageOfTotal: 10,
                percentageOfAbandoned: 50,
            })
            expect(funnel.find((item) => item.stage === "ATTENDEE")).toEqual({
                stage: "ATTENDEE",
                label: "Em quem vai comparecer",
                count: 10,
                percentageOfTotal: 10,
                percentageOfAbandoned: 50,
            })
        })
    })
})

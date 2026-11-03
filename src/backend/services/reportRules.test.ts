import { describe, expect, it } from "vitest"
import {
    buildAppointmentsResultSummary,
    buildOutcomesSummary,
    calculateNoShowRate,
    countCalendarDaysInclusive,
    OUTCOME_DEFINITIONS,
    resolveReportPeriod,
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

        it("resolve current_month no dia 1 do mês com daysCount igual a 1", () => {
            const firstDayOfMonth = new Date("2026-10-01T15:00:00.000Z")
            const period = resolveReportPeriod(
                { period: "current_month" },
                firstDayOfMonth,
            )
            expect(period.preset).toBe("current_month")
            expect(period.startDate).toBe("2026-10-01")
            expect(period.endDate).toBe("2026-10-01")
            expect(period.daysCount).toBe(1)
        })

        it("usa o fuso America/Sao_Paulo quando em UTC já virou o mês seguinte", () => {
            const lateNightSaoPaulo = new Date("2026-11-01T01:00:00.000Z")
            const period = resolveReportPeriod(
                { period: "current_month" },
                lateNightSaoPaulo,
            )
            expect(period.today).toBe("2026-10-31")
            expect(period.startDate).toBe("2026-10-01")
            expect(period.endDate).toBe("2026-10-31")
            expect(period.daysCount).toBe(31)
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

        it("resolve previous_month na virada de ano (janeiro retorna dezembro do ano anterior)", () => {
            const januaryNow = new Date("2027-01-10T15:00:00.000Z")
            const period = resolveReportPeriod(
                { period: "previous_month" },
                januaryNow,
            )
            expect(period.preset).toBe("previous_month")
            expect(period.startDate).toBe("2026-12-01")
            expect(period.endDate).toBe("2026-12-31")
            expect(period.daysCount).toBe(31)
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
            expect(summary).toEqual([
                {
                    outcome: "RESOLVED",
                    label: "Resolvida sem agendamento",
                    count: 50,
                    percentage: 50,
                },
                {
                    outcome: "SCHEDULED",
                    label: "Terminou em agendamento",
                    count: 25,
                    percentage: 25,
                },
                {
                    outcome: "OUT_OF_SCOPE",
                    label: "Fora do escopo do PROCON",
                    count: 0,
                    percentage: 0,
                },
                {
                    outcome: "NO_SLOT",
                    label: "Sem horário disponível na janela",
                    count: 0,
                    percentage: 0,
                },
                {
                    outcome: "DECLINED",
                    label: "Não quis agendar",
                    count: 0,
                    percentage: 0,
                },
                {
                    outcome: "MANAGED_APPOINTMENT",
                    label: "Remarcou ou cancelou agendamento existente",
                    count: 0,
                    percentage: 0,
                },
                {
                    outcome: "ABANDONED",
                    label: "Abandonada",
                    count: 25,
                    percentage: 25,
                },
            ])
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
})

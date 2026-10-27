import { describe, expect, it } from "vitest"
import BadRequestError from "../errors/BadRequestError"
import { createReportStubRepository } from "../repositories/mock/reportStub.repository"
import { createReportService } from "./report.service"

const FIXED_NOW = new Date("2026-10-15T15:00:00.000Z")

describe("report.service", () => {
    it("consolida todos os indicadores dos relatórios mínimos no período selecionado", async () => {
        const repository = createReportStubRepository({
            outcomes: [
                { outcome: "RESOLVED", count: 12 },
                { outcome: "SCHEDULED", count: 4 },
                { outcome: "ABANDONED", count: 4 },
            ],
            dailyConversations: [
                {
                    date: "2026-10-08",
                    conversations: 10,
                    appointmentsCreated: 2,
                },
                {
                    date: "2026-10-14",
                    conversations: 10,
                    appointmentsCreated: 2,
                },
            ],
            topCategories: [
                {
                    categoryId: "1",
                    title: "Compras e Garantia",
                    conversationsCount: 15,
                },
            ],
            topQuestions: [
                {
                    questionId: "10",
                    question: "Produto com defeito tem troca?",
                    shortTitle: "Defeito no produto",
                    categoryId: "1",
                    categoryTitle: "Compras e Garantia",
                    conversationsCount: 9,
                },
            ],
            appointmentsResult: {
                attended: 6,
                noShow: 2,
                canceled: 1,
                waitingRecord: 1,
                upcoming: 2,
            },
            abandonedByStep: [
                { step: "AWAITING_CATEGORY", count: 2 },
                { step: "AWAITING_SLOT", count: 2 },
            ],
        })
        const service = createReportService(repository)

        const summary = await service.getSummary({ period: "7d" }, FIXED_NOW)

        expect(summary.period).toEqual({
            preset: "7d",
            startDate: "2026-10-08",
            endDate: "2026-10-14",
            daysCount: 7,
            today: "2026-10-15",
        })
        expect(summary.conversations).toEqual({
            total: 20,
            dailyAverage: 2.9,
            appointmentsCreated: 4,
        })
        expect(summary.dailySeries).toHaveLength(7)
        expect(summary.seriesGranularity).toBe("day")
        expect(summary.topCategories).toEqual([
            {
                categoryId: "1",
                title: "Compras e Garantia",
                conversationsCount: 15,
            },
        ])
        expect(summary.topQuestions).toEqual([
            {
                questionId: "10",
                question: "Produto com defeito tem troca?",
                shortTitle: "Defeito no produto",
                categoryId: "1",
                categoryTitle: "Compras e Garantia",
                conversationsCount: 9,
            },
        ])
        expect(summary.appointmentsResult).toEqual({
            attended: 6,
            noShow: 2,
            canceled: 1,
            waitingRecord: 1,
            upcoming: 2,
            total: 12,
            recordedTotal: 8,
            noShowRate: 25,
        })
        expect(
            summary.abandonmentFunnel.find((s) => s.stage === "CATEGORIES")
                ?.count,
        ).toBe(2)
        expect(
            summary.abandonmentFunnel.find((s) => s.stage === "SLOT")?.count,
        ).toBe(2)
    })

    it("rejeita período personalizado inválido pelo mesmo schema", async () => {
        const service = createReportService(createReportStubRepository())

        await expect(
            service.getSummary(
                {
                    period: "custom",
                    startDate: "2026-10-15",
                    endDate: "2026-10-10",
                },
                FIXED_NOW,
            ),
        ).rejects.toThrow(BadRequestError)
    })
})

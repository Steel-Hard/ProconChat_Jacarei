import { describe, expect, it } from "vitest"
import { createReportStubRepository } from "./reportStub.repository"

describe("reportStub.repository", () => {
    it("retorna valores vazios por padrão quando nenhuma opção é configurada", async () => {
        const repo = createReportStubRepository()
        const start = new Date("2026-10-01T03:00:00.000Z")
        const end = new Date("2026-10-08T03:00:00.000Z")

        expect(await repo.getOutcomesCount(start, end)).toEqual([])
        expect(await repo.getDailyConversations(start, end)).toEqual([])
        expect(await repo.getTopCategories(start, end)).toEqual([])
        expect(await repo.getTopQuestions(start, end)).toEqual([])
        expect(await repo.getAppointmentsResultCounts(start, end)).toEqual({
            attended: 0,
            noShow: 0,
            canceled: 0,
            waitingRecord: 0,
            upcoming: 0,
        })
        expect(await repo.getAbandonedByStep(start, end)).toEqual([])
    })

    it("permite atualizar dados simulados por setOptions e respeita o limite em getTopQuestions", async () => {
        const repo = createReportStubRepository()
        const start = new Date("2026-10-01T03:00:00.000Z")
        const end = new Date("2026-10-08T03:00:00.000Z")

        repo.setOptions({
            outcomes: [{ outcome: "RESOLVED", count: 12 }],
            topQuestions: [
                {
                    questionId: "1",
                    question: "Pergunta 1",
                    shortTitle: "P1",
                    categoryId: "1",
                    categoryTitle: "Compras",
                    conversationsCount: 10,
                },
                {
                    questionId: "2",
                    question: "Pergunta 2",
                    shortTitle: "P2",
                    categoryId: "1",
                    categoryTitle: "Compras",
                    conversationsCount: 5,
                },
            ],
            appointmentsResult: {
                attended: 4,
                noShow: 1,
                canceled: 2,
                waitingRecord: 0,
                upcoming: 3,
            },
        })

        expect(await repo.getOutcomesCount(start, end)).toEqual([
            { outcome: "RESOLVED", count: 12 },
        ])
        expect(await repo.getTopQuestions(start, end, 1)).toHaveLength(1)
        expect(await repo.getAppointmentsResultCounts(start, end)).toEqual({
            attended: 4,
            noShow: 1,
            canceled: 2,
            waitingRecord: 0,
            upcoming: 3,
        })
    })
})

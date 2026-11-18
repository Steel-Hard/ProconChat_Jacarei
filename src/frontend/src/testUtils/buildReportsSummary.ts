import type ReportsSummary from "@/types/reports/ReportsSummary.types"

function buildReportsSummary(overrides: Partial<ReportsSummary> = {}): ReportsSummary {
    return {
        period: {
            preset: "30d",
            startDate: "2026-10-08",
            endDate: "2026-11-06",
            daysCount: 30,
            today: "2026-11-07"
        },
        conversations: { total: 1234, dailyAverage: 11.3, appointmentsCreated: 8 },
        outcomes: [
            { outcome: "RESOLVED", label: "x", count: 10, percentage: 25 },
            { outcome: "SCHEDULED", label: "x", count: 8, percentage: 20 },
            { outcome: "OUT_OF_SCOPE", label: "x", count: 2, percentage: 5 },
            { outcome: "NO_SLOT", label: "x", count: 4, percentage: 10 },
            { outcome: "DECLINED", label: "x", count: 2, percentage: 5 },
            { outcome: "MANAGED_APPOINTMENT", label: "x", count: 2, percentage: 5 },
            { outcome: "ABANDONED", label: "x", count: 12, percentage: 30 }
        ],
        topCategories: [
            { categoryId: "2", title: "Consumidor", conversationsCount: 1200 },
            { categoryId: "1", title: "Serviços", conversationsCount: 600 }
        ],
        topQuestions: [
            {
                questionId: "3",
                question: "Como contestar uma cobrança indevida?",
                shortTitle: "Cobrança indevida",
                categoryId: "2",
                categoryTitle: "Consumidor",
                conversationsCount: 9
            }
        ],
        appointmentsResult: {
            attended: 5,
            noShow: 2,
            canceled: 1,
            waitingRecord: 1,
            upcoming: 2,
            total: 11,
            recordedTotal: 7,
            noShowRate: 28.571
        },
        ...overrides
    }
}

export default buildReportsSummary

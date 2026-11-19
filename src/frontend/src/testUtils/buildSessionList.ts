import type { SessionList, SessionListItem } from "@/types/sessions/Session.types"

function buildSessionItem(overrides: Partial<SessionListItem> = {}): SessionListItem {
    return {
        id: "1",
        code: "S-A1B2C3D4",
        started_at: "2026-11-10T17:05:00.000Z",
        outcome: "RESOLVED",
        current_step: null,
        category_name: "Consumo",
        question_title: "Como trocar um produto com defeito?",
        appointment: null,
        ...overrides
    }
}

function buildSessionList(overrides: Partial<SessionList> = {}): SessionList {
    const items = overrides.items ?? [buildSessionItem()]

    return {
        items,
        total: items.length,
        page: 1,
        limit: 20,
        totalPages: 1,
        chipCounts: {
            all: items.length,
            resolved: 1,
            scheduled: 0,
            out_of_scope: 0,
            no_slot: 0,
            declined: 0,
            managed_appointment: 0,
            abandoned: 0,
            in_progress: 0
        },
        range: { from: "2026-10-21", to: "2026-11-19" },
        categories: [
            { id: 1, name: "Consumo" },
            { id: 2, name: "Serviços" }
        ],
        ...overrides
    }
}

export { buildSessionItem }
export default buildSessionList

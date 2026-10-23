import NotFoundError from "../../errors/NotFoundError"
import { decideTransition } from "../../services/appointmentTransitions"
import type {
    AppointmentActionType,
    AppointmentChipCounts,
    AppointmentDetailRecord,
    AppointmentListFilters,
    AppointmentListItem,
    CorrectionResult,
    CorrectionWarning,
    StaffMember,
} from "../../types/appointment.types"
import type { AppointmentRepository } from "../appointment.repository.interface"
import { buildChipCounts } from "./appointment.builders"

export interface AppointmentStubList {
    items: AppointmentListItem[]
    total: number
    chipCounts: AppointmentChipCounts
}

export interface AppointmentStubTitles {
    categories: Record<number, string>
    questions: Record<number, string>
}

export interface AppointmentActionCall {
    action: AppointmentActionType
    id: string
    actorUserId: number
    assigneeUserId?: number
    now: Date | undefined
}

export interface AppointmentNoteCall {
    id: string
    authorUserId: number
    text: string
    now: Date | undefined
}

export type AppointmentCorrectionWarning = (call: AppointmentActionCall) => CorrectionWarning | null

export type AppointmentFailAction = (call: AppointmentActionCall) => Error | null

export type AppointmentAfterAction = (
    call: AppointmentActionCall,
    current: AppointmentDetailRecord,
) => AppointmentDetailRecord

export interface AppointmentStubScenario {
    details?: AppointmentDetailRecord[]
    list?: AppointmentStubList
    pendingCount?: number
    staff?: StaffMember[]
    titles?: AppointmentStubTitles
    afterAction?: AppointmentAfterAction
    failAction?: AppointmentFailAction
    correctionWarning?: AppointmentCorrectionWarning
}

export class AppointmentRepositoryStub implements AppointmentRepository {
    public readonly findListCalls: { filters: AppointmentListFilters; now: Date | undefined }[] = []
    public readonly actionCalls: AppointmentActionCall[] = []
    public readonly noteCalls: AppointmentNoteCall[] = []
    private details: AppointmentDetailRecord[]
    private readonly list: AppointmentStubList
    private readonly pendingCount: number
    private readonly staff: StaffMember[]
    private readonly titles: AppointmentStubTitles
    private readonly afterAction: AppointmentAfterAction | undefined
    private readonly failAction: AppointmentFailAction | undefined
    private readonly correctionWarning: AppointmentCorrectionWarning | undefined

    constructor(scenario: AppointmentStubScenario = {}) {
        this.details = (scenario.details ?? []).map((detail) => structuredClone(detail))
        this.list = scenario.list ?? { items: [], total: 0, chipCounts: buildChipCounts() }
        this.pendingCount = scenario.pendingCount ?? 0
        this.staff = scenario.staff ?? []
        this.titles = scenario.titles ?? { categories: {}, questions: {} }
        this.afterAction = scenario.afterAction
        this.failAction = scenario.failAction
        this.correctionWarning = scenario.correctionWarning
    }

    async findList(filters: AppointmentListFilters, now?: Date): Promise<AppointmentStubList> {
        this.findListCalls.push({ filters: structuredClone(filters), now })
        return structuredClone(this.list)
    }

    async countPending(): Promise<number> {
        return this.pendingCount
    }

    async findStaff(): Promise<StaffMember[]> {
        return structuredClone(this.staff)
    }

    async findById(idOrCode: number | string): Promise<AppointmentDetailRecord | null> {
        const key = String(idOrCode)
        const detail = this.details.find((record) => record.id === key || record.appointment_code === key)
        if (!detail) {
            return null
        }
        return { ...structuredClone(detail), timeline: [] }
    }

    async claim(id: string, actorUserId: number, now?: Date): Promise<void> {
        this.applyAction({ action: "claim", id, actorUserId, now })
    }

    async markAttended(id: string, actorUserId: number, now?: Date): Promise<void> {
        this.applyAction({ action: "attended", id, actorUserId, now })
    }

    async markNoShow(id: string, actorUserId: number, now?: Date): Promise<void> {
        this.applyAction({ action: "no_show", id, actorUserId, now })
    }

    async assign(id: string, assigneeUserId: number, actorUserId: number, now?: Date): Promise<void> {
        this.applyAction({ action: "assign", id, actorUserId, assigneeUserId, now })
    }

    async correctRecord(id: string, actorUserId: number, now?: Date): Promise<CorrectionResult> {
        const call: AppointmentActionCall = { action: "correct_record", id, actorUserId, now }
        this.applyAction(call)
        return { warning: this.correctionWarning?.(call) ?? null }
    }

    async addNote(id: string, authorUserId: number, text: string, now?: Date): Promise<void> {
        this.noteCalls.push({ id, authorUserId, text, now })
        const current = this.details.find((record) => record.id === id)
        if (!current) {
            throw new NotFoundError("Agendamento não encontrado")
        }
        current.notes.push({
            id: String(this.noteCalls.length),
            author_user_id: String(authorUserId),
            author_user_name: null,
            text,
            created_at: (now ?? new Date()).toISOString(),
        })
    }

    async getCurrentDocumentsConfig(): Promise<{ group: string[]; question: string[] }> {
        return { group: [], question: [] }
    }

    async resolveTitles(categoryIds: number[], questionIds: number[]): Promise<AppointmentStubTitles> {
        const categories: Record<number, string> = {}
        const questions: Record<number, string> = {}
        for (const id of categoryIds) {
            const title = this.titles.categories[id]
            if (title !== undefined) {
                categories[id] = title
            }
        }
        for (const id of questionIds) {
            const title = this.titles.questions[id]
            if (title !== undefined) {
                questions[id] = title
            }
        }
        return { categories, questions }
    }

    private applyAction(call: AppointmentActionCall): void {
        this.actionCalls.push(call)
        const index = this.details.findIndex((record) => record.id === call.id)
        const current = this.details[index]
        if (!current) {
            throw new NotFoundError("Agendamento não encontrado")
        }

        const decision = decideTransition(
            call.action,
            { status: current.status, appointmentDatetime: new Date(current.appointment_datetime) },
            call.now ?? new Date(),
        )
        if (!decision.allowed) {
            throw decision.error
        }
        const failure = this.failAction?.(call) ?? null
        if (failure) {
            throw failure
        }
        if (!this.afterAction) {
            throw new Error(`Cenário incompleto: falta afterAction para a ação ${call.action}`)
        }
        this.details[index] = this.afterAction(call, structuredClone(current))
    }
}

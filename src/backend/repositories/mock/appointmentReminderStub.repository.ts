import {
    AppointmentReminderOutcome,
    AppointmentReminderRepository,
    AppointmentReminderTarget,
} from "../appointmentReminder.repository"

export interface RecordedReminderCall {
    id: string
    outcome: AppointmentReminderOutcome
    now: Date
    providerMessageId: string | null
}

export class AppointmentReminderStubRepository implements AppointmentReminderRepository {
    public targets: AppointmentReminderTarget[]
    public readonly findDueCalls: Date[] = []
    public readonly recordCalls: RecordedReminderCall[] = []
    private readonly recordedIds = new Set<string>()

    constructor(targets: AppointmentReminderTarget[] = []) {
        this.targets = targets.map((target) => structuredClone(target))
    }

    async findDueTargets(now: Date): Promise<AppointmentReminderTarget[]> {
        this.findDueCalls.push(now)
        return this.targets
            .filter((target) => !this.recordedIds.has(target.id))
            .map((target) => structuredClone(target))
    }

    async recordReminderOutcome(
        id: string,
        outcome: AppointmentReminderOutcome,
        now: Date,
        providerMessageId: string | null = null,
    ): Promise<boolean> {
        this.recordCalls.push({ id, outcome, now, providerMessageId })
        if (this.recordedIds.has(id)) {
            return false
        }
        this.recordedIds.add(id)
        return true
    }
}

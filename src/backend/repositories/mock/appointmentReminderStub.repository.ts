import {
    AppointmentReminderOutcome,
    AppointmentReminderRepository,
    AppointmentReminderTarget,
} from "../appointmentReminder.repository"

export interface RecordedReminderCall {
    id: string
    outcome: AppointmentReminderOutcome
    now: Date
    appointmentDatetime: Date
    providerMessageId: string | null
    errorCode: string | null
}

export class AppointmentReminderStubRepository implements AppointmentReminderRepository {
    public targets: AppointmentReminderTarget[]
    public readonly findDueCalls: Date[] = []
    public readonly recordCalls: RecordedReminderCall[] = []
    public readonly stillDueCalls: string[] = []
    public stillDue: (id: string) => boolean = () => true
    public failRecordFor: Set<string> = new Set()
    private readonly recordedKeys = new Set<string>()

    constructor(targets: AppointmentReminderTarget[] = []) {
        this.targets = targets.map((target) => structuredClone(target))
    }

    private keyOf(id: string, appointmentDatetime: Date): string {
        return `${id}@${appointmentDatetime.toISOString()}`
    }

    async findDueTargets(now: Date): Promise<AppointmentReminderTarget[]> {
        this.findDueCalls.push(now)
        return this.targets
            .filter((target) => !this.recordedKeys.has(this.keyOf(target.id, target.appointmentDatetime)))
            .map((target) => structuredClone(target))
    }

    async isStillDue(id: string): Promise<boolean> {
        this.stillDueCalls.push(id)
        return this.stillDue(id)
    }

    async recordReminderOutcome(
        id: string,
        outcome: AppointmentReminderOutcome,
        now: Date,
        appointmentDatetime: Date,
        providerMessageId: string | null = null,
        errorCode: string | null = null,
    ): Promise<void> {
        this.recordCalls.push({ id, outcome, now, appointmentDatetime, providerMessageId, errorCode })
        if (this.failRecordFor.has(id)) {
            throw new Error("Falha ao gravar")
        }
        this.recordedKeys.add(this.keyOf(id, appointmentDatetime))
    }
}

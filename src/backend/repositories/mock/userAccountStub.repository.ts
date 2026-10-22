import ConflictError from "../../errors/ConflictError"
import type {
    AccountBatchResult,
    AccountPlan,
    AccountBatchState,
    BusyAppointment,
    DecideAccountBatch,
    DecidePasswordReset,
    FutureAppointment,
    LockedAccount,
    PasswordResetState,
    UserAccount,
    UserAccountLastChange,
    UserAccountList,
} from "../../types/userAccount.types"
import type {
    AccountBatchInput,
    NewAccount,
    PasswordResetInput,
    UserAccountRepository,
} from "../userAccount.repository.interface"

export interface UserAccountStubScenario {
    accounts?: UserAccount[]
    futureAppointments?: Record<number, FutureAppointment[]>
    busy?: BusyAppointment[]
    slotMinutes?: number | null
    lastChange?: UserAccountLastChange | null
    takenEmails?: string[]
    batchResult?: AccountBatchResult
}

export class UserAccountRepositoryStub implements UserAccountRepository {
    public readonly createCalls: NewAccount[] = []
    public readonly batchCalls: AccountBatchInput[] = []
    public readonly batchStates: AccountBatchState[] = []
    public readonly plans: AccountPlan[][] = []
    public readonly resetCalls: PasswordResetInput[] = []
    public readonly resetStates: PasswordResetState[] = []
    public readonly futureCalls: { userId: number; now: Date }[] = []
    private accounts: UserAccount[]
    private readonly future: Record<number, FutureAppointment[]>
    private readonly busy: BusyAppointment[]
    private readonly slotMinutes: number | null
    private readonly lastChange: UserAccountLastChange | null
    private readonly takenEmails: Set<string>
    private readonly batchResult: AccountBatchResult | null

    constructor(scenario: UserAccountStubScenario = {}) {
        this.accounts = (scenario.accounts ?? []).map((account) => structuredClone(account))
        this.future = structuredClone(scenario.futureAppointments ?? {})
        this.busy = scenario.busy ?? []
        this.slotMinutes = scenario.slotMinutes ?? null
        this.lastChange = scenario.lastChange ?? null
        this.takenEmails = new Set(scenario.takenEmails ?? [])
        this.batchResult = scenario.batchResult ?? null
    }

    async listAccounts(): Promise<UserAccountList> {
        return this.snapshot()
    }

    async createAccount(input: NewAccount): Promise<UserAccount> {
        this.createCalls.push(input)
        if (this.takenEmails.has(input.email)) {
            throw new ConflictError("Este e-mail já está em uso", "EMAIL_ALREADY_IN_USE")
        }
        const account: UserAccount = {
            id: Math.max(0, ...this.accounts.map((existing) => existing.id)) + 1,
            name: input.name,
            email: input.email,
            isAdmin: false,
            active: true,
            permissions: [],
            lastLoginAt: null,
            permissionsUpdatedAt: null,
            permissionsUpdatedBy: null,
        }
        this.accounts.push(account)
        return structuredClone(account)
    }

    async findFutureAppointments(userId: number, now: Date): Promise<FutureAppointment[] | null> {
        this.futureCalls.push({ userId, now })
        if (!this.accounts.some((account) => account.id === userId)) {
            return null
        }
        return structuredClone(this.future[userId] ?? [])
    }

    async applyAccountBatch(input: AccountBatchInput, decide: DecideAccountBatch): Promise<AccountBatchResult> {
        this.batchCalls.push(input)
        const batchIds = input.changes.map((change) => change.userId)
        const targetIds = input.changes.flatMap((change) =>
            change.reassignment?.mode === "assign" && !batchIds.includes(change.reassignment.toUserId)
                ? [change.reassignment.toUserId]
                : [],
        )
        const state: AccountBatchState = {
            requester: input.requester,
            changes: input.changes,
            accounts: this.accounts.filter((account) => batchIds.includes(account.id)).map((account) => this.locked(account)),
            targets: this.accounts.filter((account) => targetIds.includes(account.id)).map((account) => this.rule(account)),
            slotMinutes: this.slotMinutes,
            busy: this.busy,
        }
        this.batchStates.push(state)

        const decision = decide(state)
        if (!decision.allowed) {
            throw decision.error
        }
        this.plans.push(decision.plans)
        return structuredClone(this.batchResult ?? { ...this.snapshot(), redistributed: 0 })
    }

    async resetPassword(input: PasswordResetInput, decide: DecidePasswordReset): Promise<void> {
        this.resetCalls.push(input)
        const account = this.accounts.find((candidate) => candidate.id === input.userId)
        const state: PasswordResetState = {
            requester: input.requester,
            userId: input.userId,
            account: account ? this.rule(account) : null,
        }
        this.resetStates.push(state)
        const decision = decide(state)
        if (!decision.allowed) {
            throw decision.error
        }
    }

    private rule(account: UserAccount) {
        return { id: account.id, isAdmin: account.isAdmin, active: account.active, permissions: [...account.permissions] }
    }

    private locked(account: UserAccount): LockedAccount {
        return {
            ...this.rule(account),
            futureAppointments: (this.future[account.id] ?? []).map((appointment) => ({
                appointmentId: appointment.id,
                protocol: appointment.protocol,
                appointmentDatetime: new Date(appointment.appointmentDatetime),
            })),
        }
    }

    private snapshot(): UserAccountList {
        return { items: structuredClone(this.accounts), lastChange: this.lastChange ? { ...this.lastChange } : null }
    }
}

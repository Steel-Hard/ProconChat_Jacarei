import type {
    AccountBatchResult,
    AccountChange,
    AccountRequester,
    DecideAccountBatch,
    DecidePasswordReset,
    FutureAppointment,
    UserAccount,
    UserAccountList,
} from "../types/userAccount.types"

export interface NewAccount {
    name: string
    email: string
    passwordHash: string
}

export interface AccountBatchInput {
    requester: AccountRequester
    changes: AccountChange[]
    now: Date
}

export interface PasswordResetInput {
    requester: AccountRequester
    userId: number
    passwordHash: string
}

export interface UserAccountRepository {
    listAccounts(): Promise<UserAccountList>
    createAccount(input: NewAccount): Promise<UserAccount>
    findFutureAppointments(userId: number, now: Date): Promise<FutureAppointment[] | null>
    applyAccountBatch(input: AccountBatchInput, decide: DecideAccountBatch): Promise<AccountBatchResult>
    resetPassword(input: PasswordResetInput, decide: DecidePasswordReset): Promise<void>
}

import BadRequestError from "../errors/BadRequestError"
import NotFoundError from "../errors/NotFoundError"
import { userAccountRepository } from "../repositories/userAccount.repository"
import { UserAccountRepository } from "../repositories/userAccount.repository.interface"
import type {
    AccountBatchResult,
    AccountChange,
    AccountRequester,
    CreateAccountInput,
    FutureAppointment,
    UserAccount,
    UserAccountList,
} from "../types/userAccount.types"
import { bcryptPasswordHasher, PasswordHasher } from "../utils/passwordHasher"
import validatePassword from "../utils/passwordPolicy"
import { decideAccountBatch, decidePasswordReset } from "./userAccountRules"

export interface UserAccountService {
    listAccounts(): Promise<UserAccountList>
    createAccount(input: CreateAccountInput): Promise<UserAccount>
    listFutureAppointments(userId: number): Promise<FutureAppointment[]>
    saveBatch(requester: AccountRequester, changes: AccountChange[]): Promise<AccountBatchResult>
    resetPassword(requester: AccountRequester, userId: number, password: string): Promise<void>
}

interface UserAccountServiceDependencies {
    repository: UserAccountRepository
    hasher: PasswordHasher
    now: () => Date
}

function assertValidPassword(password: string): void {
    const violation = validatePassword(password)
    if (violation) {
        throw new BadRequestError(violation)
    }
}

export function createUserAccountService({ repository, hasher, now }: UserAccountServiceDependencies): UserAccountService {
    return {
        listAccounts: () => repository.listAccounts(),

        async createAccount({ name, email, password }) {
            assertValidPassword(password)
            return repository.createAccount({
                name: name.trim(),
                email: email.trim().toLowerCase(),
                passwordHash: await hasher.hash(password),
            })
        },

        async listFutureAppointments(userId) {
            const appointments = await repository.findFutureAppointments(userId, now())
            if (!appointments) {
                throw new NotFoundError("Conta não encontrada")
            }
            return appointments
        },

        saveBatch(requester, changes) {
            const ordered = [...changes].sort((a, b) => a.userId - b.userId)
            return repository.applyAccountBatch({ requester, changes: ordered, now: now() }, decideAccountBatch)
        },

        async resetPassword(requester, userId, password) {
            assertValidPassword(password)
            const passwordHash = await hasher.hash(password)
            await repository.resetPassword({ requester, userId, passwordHash }, decidePasswordReset)
        },
    }
}

export const userAccountService = createUserAccountService({
    repository: userAccountRepository,
    hasher: bcryptPasswordHasher,
    now: () => new Date(),
})

import { AuthenticatedUser, PERMISSIONS, Permission, UserCredentials } from "../../types/auth.types"
import { AuthRepository } from "../auth.repository.interface"

export interface MockUserInput {
    id: number
    email: string
    passwordHash: string
    name?: string
    active?: boolean
    isAdmin?: boolean
    permissions?: Permission[]
    sessionVersion?: number
}

function toAuthenticatedUser({ passwordHash: _passwordHash, active: _active, ...user }: UserCredentials): AuthenticatedUser {
    return { ...user, permissions: [...user.permissions] }
}

export class MockAuthRepository implements AuthRepository {
    public readonly loginsRecorded: number[] = []

    private readonly users = new Map<number, UserCredentials>()

    constructor(users: MockUserInput[] = []) {
        users.forEach((user) => this.add(user))
    }

    add(input: MockUserInput): void {
        const isAdmin = input.isAdmin ?? false
        this.users.set(input.id, {
            id: input.id,
            name: input.name ?? "Pessoa de Teste",
            email: input.email,
            passwordHash: input.passwordHash,
            active: input.active ?? true,
            isAdmin,
            permissions: input.permissions ?? (isAdmin ? [...PERMISSIONS] : []),
            sessionVersion: input.sessionVersion ?? 0,
        })
    }

    get(id: number): UserCredentials | undefined {
        const user = this.users.get(id)
        return user ? { ...user } : undefined
    }

    async findByEmail(email: string): Promise<UserCredentials | null> {
        const user = [...this.users.values()].find((candidate) => candidate.email.toLowerCase() === email)
        return user ? { ...user } : null
    }

    async findActiveById(id: number): Promise<AuthenticatedUser | null> {
        const user = this.users.get(id)
        return user?.active ? toAuthenticatedUser(user) : null
    }

    async findActiveWithPassword(id: number): Promise<UserCredentials | null> {
        const user = this.users.get(id)
        return user?.active ? { ...user } : null
    }

    async recordLogin(id: number): Promise<void> {
        this.loginsRecorded.push(id)
    }

    async updatePassword(id: number, passwordHash: string): Promise<number | null> {
        const user = this.users.get(id)
        if (!user?.active) {
            return null
        }
        user.passwordHash = passwordHash
        user.sessionVersion += 1
        return user.sessionVersion
    }
}

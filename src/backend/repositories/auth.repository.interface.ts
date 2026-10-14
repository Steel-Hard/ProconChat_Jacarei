import { AuthenticatedUser, UserCredentials } from "../types/auth.types"

export interface AuthRepository {
    findByEmail(email: string): Promise<UserCredentials | null>
    findActiveById(id: number): Promise<AuthenticatedUser | null>
    findActiveWithPassword(id: number): Promise<UserCredentials | null>
    findAdmin(): Promise<AuthenticatedUser | null>
    recordLogin(id: number): Promise<void>
    updatePassword(id: number, passwordHash: string): Promise<number | null>
}

import bcrypt from "bcryptjs"

export const PASSWORD_HASH_COST = 12

export interface PasswordHasher {
    hash(password: string): Promise<string>
    compare(password: string, passwordHash: string): Promise<boolean>
}

export const bcryptPasswordHasher: PasswordHasher = {
    hash: (password) => bcrypt.hash(password, PASSWORD_HASH_COST),
    compare: (password, passwordHash) => bcrypt.compare(password, passwordHash),
}

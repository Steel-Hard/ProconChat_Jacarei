import { PoolClient } from "pg"
import validatePassword from "../../utils/passwordPolicy"
import { bcryptPasswordHasher, PasswordHasher } from "../../utils/passwordHasher"

export type AdminSeedOutcome = "created" | "kept"

type AdminSeedEnv = Partial<Record<"ROOT_EMAIL" | "ROOT_PASSWORD", string>>

function readRootCredentials(env: AdminSeedEnv): { email: string; password: string } {
    const email = env.ROOT_EMAIL?.trim().toLowerCase()
    if (!email) {
        throw new Error("ROOT_EMAIL must be set to create the Admin account")
    }
    const password = env.ROOT_PASSWORD
    if (!password) {
        throw new Error("ROOT_PASSWORD must be set to create the Admin account")
    }
    const violation = validatePassword(password)
    if (violation) {
        throw new Error(`ROOT_PASSWORD is invalid: ${violation}`)
    }
    return { email, password }
}

export async function seedAdminAccount(
    client: PoolClient,
    env: AdminSeedEnv,
    hasher: PasswordHasher = bcryptPasswordHasher,
): Promise<AdminSeedOutcome> {
    const existing = await client.query("SELECT id FROM Users WHERE is_admin LIMIT 1")
    if ((existing.rowCount ?? 0) > 0) {
        return "kept"
    }

    const { email, password } = readRootCredentials(env)
    const passwordHash = await hasher.hash(password)
    await client.query(
        `INSERT INTO Users (name, email, password_hash, active, is_admin, session_version)
         VALUES ('Admin', $1, $2, TRUE, TRUE, 0)`,
        [email, passwordHash],
    )
    return "created"
}

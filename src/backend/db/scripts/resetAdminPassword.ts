import { PoolClient } from "pg"
import getPool from "../connection"
import validatePassword from "../../utils/passwordPolicy"
import { bcryptPasswordHasher, PasswordHasher } from "../../utils/passwordHasher"

type ResetAdminPasswordEnv = Partial<Record<"ROOT_PASSWORD", string>>

export async function resetAdminPassword(
    client: PoolClient,
    env: ResetAdminPasswordEnv,
    hasher: PasswordHasher = bcryptPasswordHasher,
): Promise<void> {
    const password = env.ROOT_PASSWORD
    if (!password) {
        throw new Error("ROOT_PASSWORD must be set to reset the Admin password")
    }
    const violation = validatePassword(password)
    if (violation) {
        throw new Error(`ROOT_PASSWORD is invalid: ${violation}`)
    }

    const admin = await client.query<{ id: string }>("SELECT id FROM Users WHERE is_admin LIMIT 1 FOR UPDATE")
    const adminId = admin.rows[0]?.id
    if (!adminId) {
        throw new Error("No Admin account found. Run the seed first (npm run db:seed or the seed service)")
    }

    await client.query(
        "UPDATE Users SET password_hash = $2, session_version = session_version + 1 WHERE id = $1",
        [adminId, await hasher.hash(password)],
    )
}

async function main(): Promise<void> {
    const pool = getPool()
    const client = await pool.connect()
    try {
        await client.query("BEGIN")
        await resetAdminPassword(client, process.env)
        await client.query("COMMIT")
        console.log("Senha do Admin redefinida")
    } catch (error) {
        await client.query("ROLLBACK")
        throw error
    } finally {
        client.release()
        await pool.end()
    }
}

if (require.main === module) {
    main().catch((error: unknown) => {
        console.error("Falha ao redefinir a senha do Admin:", error instanceof Error ? error.message : error)
        process.exit(1)
    })
}

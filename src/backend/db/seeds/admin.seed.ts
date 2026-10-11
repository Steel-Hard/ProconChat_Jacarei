import bcrypt from "bcrypt"
import { PoolClient } from "pg"

export type AdminSeedOutcome = "created" | "kept"

export async function insertInitialUserAdmin(client: PoolClient): Promise<AdminSeedOutcome> {
    const email = process.env.ADMIN_EMAIL?.trim().toLowerCase()
    const password = process.env.ADMIN_PASSWORD

    if (!email || !password) {
        throw new Error("ADMIN_EMAIL and ADMIN_PASSWORD must be set to seed the administrator")
    }
    if (password.length < 8) {
        throw new Error("ADMIN_PASSWORD must contain at least 8 characters")
    }

    const existing = await client.query("SELECT 1 FROM Users WHERE lower(email) = $1 LIMIT 1", [email])
    if ((existing.rowCount ?? 0) > 0) {
        return "kept"
    }

    const passwordHash = await bcrypt.hash(password, 12)
    await client.query(
        `INSERT INTO Users (name, email, password_hash, active, is_admin, session_version)
         VALUES ('Admin', $1, $2, TRUE, TRUE, 0)`,
        [email, passwordHash],
    )

    return "created"
}

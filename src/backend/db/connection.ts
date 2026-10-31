import { Pool } from "pg"
import dotenv from "dotenv"

if (process.env.SKIP_DOTENV !== "true") {
    dotenv.config({ quiet: true })
}

let pool: Pool | undefined

export default function getPool(): Pool {
    if (!pool) {
        pool = new Pool({ connectionString: process.env.DB_URL })
    }
    return pool
}

import { Pool } from "pg"
import dotenv from "dotenv"

dotenv.config({ quiet: true })

let pool: Pool | undefined

export default function getPool(): Pool {
    if (!pool) {
        pool = new Pool({ connectionString: process.env.DB_URL })
    }
    return pool
}

import { Pool } from "pg"
import dotenv from "dotenv"

dotenv.config({ quiet: true })

const pool = new Pool({ connectionString: process.env.DB_URL })

export default pool

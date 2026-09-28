import getPool from "../connection"
import { seedInitialConfig } from "./config.seed"
import { seedContent, SeedRowCounts } from "./content.seed"

const SEED_LOCK_KEY = 61061

const describeCounts = (label: string, counts: SeedRowCounts): string =>
    `${label}: ${counts.inserted} inseridas, ${counts.updated} atualizadas, ${counts.kept} mantidas`

async function run(): Promise<void> {
    const pool = getPool()
    const client = await pool.connect()

    try {
        await client.query("BEGIN")
        await client.query("SELECT pg_advisory_xact_lock($1)", [SEED_LOCK_KEY])

        const content = await seedContent(client)
        const config = await seedInitialConfig(client)

        await client.query("COMMIT")

        const configMessage =
            config === "created" ? "configuração inicial criada" : "configuração inicial já existe, mantida"
        console.log(
            `Seed concluído. ${describeCounts("Categorias", content.categories)}. ${describeCounts("Perguntas", content.questions)}. Agenda e documentos: ${configMessage}.`
        )
    } catch (error) {
        await client.query("ROLLBACK")
        throw error
    } finally {
        client.release()
        await pool.end()
    }
}

run().catch((error) => {
    console.error("Falha ao rodar o seed:", error)
    process.exit(1)
})

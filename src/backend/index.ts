import { Server } from "http"
import app from "./app"

const port = process.env.PORT ? Number(process.env.PORT) : 3000

if (!Number.isInteger(port) || port <= 0 || port > 65535) {
    console.error(`PORT invalido: ${process.env.PORT}`)
    process.exit(1)
}

process.on("uncaughtException", (error: Error) => {
    console.error("Uncaught Exception:", error)
    process.exit(1)
})

process.on("unhandledRejection", (reason: unknown) => {
    console.error("Unhandled Rejection:", reason)
    process.exit(1)
})

const server: Server = app.listen(port, "0.0.0.0", () => {
    console.log(`Servidor rodando na porta http://0.0.0.0:${port}`)
})

const SHUTDOWN_TIMEOUT_MS = 10_000
let shuttingDown = false

function shutdown(signal: NodeJS.Signals): void {
    if (shuttingDown) {
        return
    }
    shuttingDown = true

    console.log(`Recebido ${signal}, encerrando servidor...`)

    const forceExitTimer = setTimeout(() => {
        console.error(`Servidor nao encerrou em ${SHUTDOWN_TIMEOUT_MS}ms, forcando saida`)
        process.exit(1)
    }, SHUTDOWN_TIMEOUT_MS)

    server.close((error?: Error) => {
        clearTimeout(forceExitTimer)
        if (error) {
            console.error("Erro ao encerrar o servidor:", error)
            process.exit(1)
        }
        console.log("Servidor encerrado com sucesso")
        process.exit(0)
    })

    server.closeIdleConnections()
}

process.on("SIGTERM", () => shutdown("SIGTERM"))
process.on("SIGINT", () => shutdown("SIGINT"))

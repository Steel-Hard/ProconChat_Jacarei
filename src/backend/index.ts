import { Server } from "http"
import app from "./app"

const port = process.env.PORT ? Number(process.env.PORT) : 3000

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

function shutdown(signal: NodeJS.Signals): void {
    console.log(`Recebido ${signal}, encerrando servidor...`)
    server.close((error?: Error) => {
        if (error) {
            console.error("Erro ao encerrar o servidor:", error)
            process.exit(1)
        }
        console.log("Servidor encerrado com sucesso")
        process.exit(0)
    })
}

process.on("SIGTERM", () => shutdown("SIGTERM"))
process.on("SIGINT", () => shutdown("SIGINT"))

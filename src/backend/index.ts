import { Server } from "http"
import app from "./app"
import {
    DEFAULT_SWEEP_INTERVAL_MS,
    startAbandonedSessionsSweep,
} from "./services/abandonedSessionsSweep.service"
import { sweepPastAppointmentPhones } from "./services/appointmentRetention.service"
import { sweepAbandonedSessions } from "./services/conversationFlow.service"
import { startPeriodicSweep } from "./services/periodicSweep.service"
import { RETENTION_SWEEP_INTERVAL_MS, sweepRetention } from "./services/retentionSweep.service"

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

const stopAbandonedSessionsSweep = startAbandonedSessionsSweep({
    sweep: sweepAbandonedSessions,
    intervalMs: DEFAULT_SWEEP_INTERVAL_MS,
    logger: console,
})

const stopPastAppointmentPhonesSweep = startPeriodicSweep({
    sweep: sweepPastAppointmentPhones,
    intervalMs: DEFAULT_SWEEP_INTERVAL_MS,
    logger: console,
    failureMessage: "Failed to erase phones of past appointments",
})

const stopRetentionSweep = startPeriodicSweep({
    sweep: sweepRetention,
    intervalMs: RETENTION_SWEEP_INTERVAL_MS,
    logger: console,
    failureMessage: "Failed to anonymize records by retention",
})

const SHUTDOWN_TIMEOUT_MS = 10_000
let shuttingDown = false

function shutdown(signal: NodeJS.Signals): void {
    if (shuttingDown) {
        return
    }
    shuttingDown = true
    stopAbandonedSessionsSweep()
    stopPastAppointmentPhonesSweep()
    stopRetentionSweep()

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

import type { Server } from "node:http"
import type { AddressInfo } from "node:net"
import type { Express } from "express"
import backendApp from "../../../app"
import getPool from "../../../db/connection"
import gatewayApp from "../../../../gateway/app"
import {
    cleanupScheduleTestData,
    createTestQuestion,
    restoreScheduleConfig,
    ScheduleConfigSnapshot,
    snapshotScheduleConfig,
    useScheduleConfig,
} from "../../integration/helpers/scheduleDb"
import { createTestUser, deleteTestUsers } from "../../integration/helpers/usersDb"
import { hashPhone } from "../../integration/helpers/phone"
import { installMetaFake, MetaFake } from "./metaFake"
import { ALL_E2E_PHONES } from "./phones"
import {
    restoreWhatsAppSettings,
    snapshotWhatsAppSettings,
    useE2eWhatsAppSettings,
    WhatsAppSettingsSnapshot,
} from "./whatsappSettingsDb"

export interface E2eStaff {
    id: number
    email: string
    password: string
}

export interface E2eEnvironment {
    backendApp: Express
    gatewayUrl: string
    meta: MetaFake
    categoryId: number
    questionId: number
    staff: E2eStaff
}

interface Restorable {
    backendServer?: Server
    gatewayServer?: Server
    meta?: MetaFake
    schedule?: ScheduleConfigSnapshot
    whatsapp?: { snapshot: WhatsAppSettingsSnapshot }
    staffId?: number
}

const STAFF_PASSWORD = "e2e-senha-da-equipe"
const LOCAL_HOST = "127.0.0.1"
const ALL_WEEKDAYS = [0, 1, 2, 3, 4, 5, 6]
const restorables = new WeakMap<E2eEnvironment, Restorable>()
let activeRestorable: Restorable | undefined

function listen(app: Express): Promise<Server> {
    return new Promise((resolve) => {
        const server = app.listen(0, LOCAL_HOST, () => resolve(server))
    })
}

function close(server: Server | undefined): Promise<void> {
    return new Promise((resolve) => {
        if (!server) {
            resolve()
            return
        }
        server.close(() => resolve())
        server.closeAllConnections()
    })
}

function urlOf(server: Server): string {
    return `http://${LOCAL_HOST}:${(server.address() as AddressInfo).port}`
}

async function useE2eSchedule(): Promise<void> {
    await useScheduleConfig({
        settings: {
            slot_minutes: 30,
            seats_per_slot: 1,
            window_days: 30,
            min_notice_days: 1,
            wait_alert_days: 7,
            unit_address: "Rua do Procon, 100",
            unit_address_complement: null,
            reminder_enabled: false,
            reminder_hours: 24,
        },
        ranges: ALL_WEEKDAYS.map((weekday) => ({ weekday, slot_index: 1, start_time: "08:00", end_time: "18:00" })),
    })
}

async function createE2eQuestion(): Promise<{ categoryId: number; questionId: number }> {
    const created = await createTestQuestion()
    await getPool().query(
        "UPDATE Questions SET requires_in_person = false, out_of_scope = false, llm_allowed = false WHERE id = $1",
        [created.questionId],
    )
    return created
}

export async function startE2eEnvironment(): Promise<E2eEnvironment> {
    const restorable: Restorable = {}
    activeRestorable = restorable
    try {
        restorable.backendServer = await listen(backendApp)
        restorable.gatewayServer = await listen(gatewayApp)
        process.env.BACKEND_INTERNAL_URL = urlOf(restorable.backendServer)
        process.env.GATEWAY_INTERNAL_URL = urlOf(restorable.gatewayServer)
        restorable.meta = installMetaFake()

        await cleanupScheduleTestData({ phoneHashes: ALL_E2E_PHONES.map(hashPhone), appointmentIds: [] })
        restorable.schedule = await snapshotScheduleConfig()
        restorable.whatsapp = { snapshot: await snapshotWhatsAppSettings() }
        await useE2eWhatsAppSettings()
        await useE2eSchedule()
        const { categoryId, questionId } = await createE2eQuestion()

        const staff = await createTestUser({ permissions: ["appointments.view", "appointments.manage"], password: STAFF_PASSWORD })
        restorable.staffId = staff.id

        const environment: E2eEnvironment = {
            backendApp,
            gatewayUrl: urlOf(restorable.gatewayServer),
            meta: restorable.meta,
            categoryId,
            questionId,
            staff: { id: staff.id, email: staff.email, password: STAFF_PASSWORD },
        }
        restorables.set(environment, restorable)
        return environment
    } catch (error) {
        await stopE2eEnvironment(undefined)
        throw error
    }
}

export async function stopE2eEnvironment(environment: E2eEnvironment | undefined): Promise<void> {
    const restorable = (environment ? restorables.get(environment) : undefined) ?? activeRestorable
    activeRestorable = undefined
    if (!restorable) {
        return
    }
    try {
        restorable.meta?.restore()
        await cleanupScheduleTestData({ phoneHashes: ALL_E2E_PHONES.map(hashPhone), appointmentIds: [] })
        if (restorable.schedule) {
            await restoreScheduleConfig(restorable.schedule)
        }
        if (restorable.whatsapp) {
            await restoreWhatsAppSettings(restorable.whatsapp.snapshot)
        }
        await deleteTestUsers([restorable.staffId ?? null])
    } finally {
        await close(restorable.gatewayServer)
        await close(restorable.backendServer)
        await getPool().end()
    }
}

import { afterEach, describe, expect, it, vi } from "vitest"
import PERMISSION_KEYS from "@/navigation/permissionKeys"
import type NavKey from "@/types/navigation/NavKey.types"

const TODAY: Record<NavKey, boolean> = {
    dashboard: false,
    appointments: true,
    reports: false,
    content: false,
    sessions: false,
    schedule: false,
    documents: false,
    users: true,
    whatsapp: true
}

async function readyWith(ready: Record<NavKey, boolean>) {
    vi.doMock("@/navigation/navItemsReady", () => ({ default: ready }))
    vi.resetModules()
    const { default: readyPermissionKeys } = await import("@/navigation/readyPermissionKeys")

    return readyPermissionKeys()
}

function allFlags(value: boolean): Record<NavKey, boolean> {
    return {
        dashboard: value,
        appointments: value,
        reports: value,
        content: value,
        sessions: value,
        schedule: value,
        documents: value,
        users: value,
        whatsapp: value
    }
}

afterEach(() => {
    vi.doUnmock("@/navigation/navItemsReady")
})

describe("readyPermissionKeys", () => {
    it("devolve só as permissões de Agendamentos e Usuários com as telas prontas de hoje", async () => {
        const keys = await readyWith(TODAY)

        expect(keys).toEqual(["appointments.view", "appointments.manage", "users.manage"])
    })

    it("inclui Ver relatórios na ordem quando a tela de Relatórios fica pronta", async () => {
        const keys = await readyWith({ ...TODAY, reports: true })

        expect(keys).toEqual([
            "appointments.view",
            "appointments.manage",
            "reports.view",
            "users.manage"
        ])
    })

    it("devolve as 8 permissões na ordem quando todas as telas estão prontas", async () => {
        const keys = await readyWith(allFlags(true))

        expect(keys).toEqual([...PERMISSION_KEYS])
    })

    it("devolve uma lista vazia quando nenhuma tela está pronta", async () => {
        const keys = await readyWith(allFlags(false))

        expect(keys).toEqual([])
    })
})

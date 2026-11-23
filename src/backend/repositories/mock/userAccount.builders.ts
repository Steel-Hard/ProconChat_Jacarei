import type { FutureAppointment, UserAccount } from "../../types/userAccount.types"

export function buildUserAccount(id: number, overrides: Partial<UserAccount> = {}): UserAccount {
    return {
        id,
        name: `Conta ${id}`,
        email: `conta${id}@exemplo.test`,
        isAdmin: false,
        active: true,
        permissions: [],
        lastLoginAt: null,
        permissionsUpdatedAt: null,
        permissionsUpdatedBy: null,
        ...overrides,
    }
}

export function buildFutureAppointment(id: string, appointmentDatetime: string): FutureAppointment {
    return {
        id,
        protocol: `P${id.padStart(7, "0")}`,
        name: `Titular ${id}`,
        appointmentDatetime,
        status: "CONFIRMED",
    }
}

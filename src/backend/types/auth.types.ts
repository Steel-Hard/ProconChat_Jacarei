export const PERMISSIONS = [
    "appointments.view",
    "appointments.manage",
    "content.manage",
    "schedule.configure",
    "documents.configure",
    "sessions.view",
    "reports.view",
    "users.manage",
] as const

export type Permission = (typeof PERMISSIONS)[number]

export const ADMIN_ONLY = "admin.only" as const

export type RouteAccess = Permission | typeof ADMIN_ONLY

export interface PublicUser {
    id: number
    name: string
    email: string
    isAdmin: boolean
    permissions: Permission[]
}

export interface AuthenticatedUser extends PublicUser {
    sessionVersion: number
}

export interface UserCredentials extends AuthenticatedUser {
    passwordHash: string
    active: boolean
}

declare global {
    namespace Express {
        interface Request {
            authUser?: AuthenticatedUser
        }
    }
}

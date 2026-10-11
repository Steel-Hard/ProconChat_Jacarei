export const PERMISSIONS = [
    "appointments:read",
    "appointments:manage",
    "chatbot-content:manage",
    "in-person-service:configure",
    "attendance-documents:configure",
    "sessions:read",
    "reports:read",
    "users:manage",
] as const

export type Permission = (typeof PERMISSIONS)[number]

export interface AuthenticatedUser {
    id: number
    name: string
    email: string
    isAdmin: boolean
    permissions: Permission[]
    sessionVersion: number
}

declare global {
    namespace Express {
        interface Request {
            authUser?: AuthenticatedUser
        }
    }
}

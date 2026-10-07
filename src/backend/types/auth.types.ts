export type PermissionKey =
  | "appointments.view"
  | "appointments.manage"
  | "content.manage"
  | "schedule.configure"
  | "documents.configure"
  | "sessions.view"
  | "reports.view"
  | "users.manage"

export interface AuthUser {
  id: number
  name: string
  email: string
  is_admin: boolean
  permissions: PermissionKey[]
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser
    }
  }
}
